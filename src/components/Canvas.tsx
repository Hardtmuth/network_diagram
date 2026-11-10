import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import type {
  CSSProperties,
  DragEvent,
  PointerEvent,
  WheelEvent as ReactWheelEvent,
} from 'react'
import {
  DEVICE_META,
  DND_MIME,
  LINK_META,
  NODE_HEIGHT_FALLBACK,
  NODE_WIDTH,
  VPN_PROTOCOL_META,
} from '../devices'
import type {
  Connection,
  DeviceGroup,
  DeviceKind,
  DeviceNode,
  Selection,
} from '../types'
import { DeviceIcon } from './DeviceIcon'
import { DeviceNode as DeviceNodeCard } from './DeviceNode'
import { Icon } from './Icons'

interface NodeSize {
  w: number
  h: number
}

interface Viewport {
  x: number
  y: number
  scale: number
}

interface CanvasProps {
  nodes: DeviceNode[]
  connections: Connection[]
  groups: DeviceGroup[]
  selection: Selection
  onSelect: (selection: Selection) => void
  onAddNode: (kind: DeviceKind, x: number, y: number) => void
  onMoveNode: (id: string, x: number, y: number) => void
  onMoveNodes: (moves: { id: string; x: number; y: number }[]) => void
  onConnect: (from: string, to: string) => void
}

export interface CanvasHandle {
  addAtCenter: (kind: DeviceKind) => void
  fitView: () => void
  getElement: () => HTMLDivElement | null
  centerOnNode: (id: string) => void
}

interface NodeDrag {
  id: string
  pointerId: number
  offsetX: number
  offsetY: number
  anchorX: number
  anchorY: number
  nodes: { id: string; x: number; y: number }[]
}

interface PanDrag {
  pointerId: number
  startX: number
  startY: number
  originX: number
  originY: number
}

interface ConnectDrag {
  from: string
  x: number
  y: number
  targetId: string | null
}

interface GroupDrag {
  id: string
  pointerId: number
  startX: number
  startY: number
  nodes: { id: string; x: number; y: number }[]
}

const GROUP_PADDING_X = 26
const GROUP_PADDING_TOP = 26
const GROUP_PADDING_BOTTOM = 26

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

function edgeGeometry(
  from: DeviceNode,
  to: DeviceNode,
  fromSize: NodeSize,
  toSize: NodeSize,
) {
  const fromCenterX = from.x + fromSize.w / 2
  const fromCenterY = from.y + fromSize.h / 2
  const toCenterX = to.x + toSize.w / 2
  const toCenterY = to.y + toSize.h / 2

  const horizontal = Math.abs(toCenterX - fromCenterX) >= Math.abs(toCenterY - fromCenterY)

  if (horizontal) {
    const forward = toCenterX >= fromCenterX
    const startX = forward ? from.x + fromSize.w : from.x
    const startY = fromCenterY
    const endX = forward ? to.x : to.x + toSize.w
    const endY = toCenterY
    const direction = forward ? 1 : -1
    const curve = Math.max(55, Math.abs(endX - startX) * 0.45)
    return {
      d: `M ${startX} ${startY} C ${startX + curve * direction} ${startY}, ${endX - curve * direction} ${endY}, ${endX} ${endY}`,
      midX: (startX + endX) / 2,
      midY: (startY + endY) / 2,
      startX,
      startY,
      endX,
      endY,
    }
  }

  const forward = toCenterY >= fromCenterY
  const startX = fromCenterX
  const startY = forward ? from.y + fromSize.h : from.y
  const endX = toCenterX
  const endY = forward ? to.y : to.y + toSize.h
  const direction = forward ? 1 : -1
  const curve = Math.max(45, Math.abs(endY - startY) * 0.45)
  return {
    d: `M ${startX} ${startY} C ${startX} ${startY + curve * direction}, ${endX} ${endY - curve * direction}, ${endX} ${endY}`,
    midX: (startX + endX) / 2,
    midY: (startY + endY) / 2,
    startX,
    startY,
    endX,
    endY,
  }
}

export const Canvas = forwardRef<CanvasHandle, CanvasProps>(function Canvas(
  {
    nodes,
    connections,
    groups,
    selection,
    onSelect,
    onAddNode,
    onMoveNode,
    onMoveNodes,
    onConnect,
  },
  ref,
) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [viewport, setViewport] = useState<Viewport>({ x: 60, y: 40, scale: 0.9 })
  const [sizes, setSizes] = useState<Record<string, NodeSize>>({})
  const sizesRef = useRef<Record<string, NodeSize>>({})
  const [draggingIds, setDraggingIds] = useState<string[]>([])
  const [draggingGroupId, setDraggingGroupId] = useState<string | null>(null)
  const [panning, setPanning] = useState(false)
  const [connecting, setConnecting] = useState<ConnectDrag | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [gridMode, setGridMode] = useState<'dots' | 'lines' | 'none'>('dots')
  const nodeDrag = useRef<NodeDrag | null>(null)
  const groupDrag = useRef<GroupDrag | null>(null)
  const panDrag = useRef<PanDrag | null>(null)
  const fitViewRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    sizesRef.current = sizes
  }, [sizes])

  const onMeasure = useCallback((id: string, width: number, height: number) => {
    setSizes((previous) => {
      const current = previous[id]
      if (current && current.w === width && current.h === height) return previous
      return { ...previous, [id]: { w: width, h: height } }
    })
  }, [])

  const toWorld = useCallback(
    (clientX: number, clientY: number) => {
      const element = canvasRef.current
      if (!element) return { x: 0, y: 0 }
      const rect = element.getBoundingClientRect()
      return {
        x: (clientX - rect.left - viewport.x) / viewport.scale,
        y: (clientY - rect.top - viewport.y) / viewport.scale,
      }
    },
    [viewport],
  )

  const fitView = useCallback(() => {
    const element = canvasRef.current
    if (!element) return
    const rect = element.getBoundingClientRect()

    if (nodes.length === 0) {
      setViewport({
        x: rect.width / 2 - NODE_WIDTH / 2,
        y: rect.height / 2 - 120,
        scale: 1,
      })
      return
    }

    let minX = Number.POSITIVE_INFINITY
    let minY = Number.POSITIVE_INFINITY
    let maxX = Number.NEGATIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY

    for (const node of nodes) {
      const size = sizesRef.current[node.id] ?? {
        w: NODE_WIDTH,
        h: NODE_HEIGHT_FALLBACK,
      }
      minX = Math.min(minX, node.x)
      minY = Math.min(minY, node.y)
      maxX = Math.max(maxX, node.x + size.w)
      maxY = Math.max(maxY, node.y + size.h)
    }

    const boundsWidth = Math.max(maxX - minX, 1)
    const boundsHeight = Math.max(maxY - minY, 1)
    const padding = 62
    const scale = clamp(
      Math.min(
        (rect.width - padding * 2) / boundsWidth,
        (rect.height - padding * 2) / boundsHeight,
        1.1,
      ),
      0.28,
      1.3,
    )

    setViewport({
      scale,
      x: (rect.width - boundsWidth * scale) / 2 - minX * scale,
      y: (rect.height - boundsHeight * scale) / 2 - minY * scale,
    })
  }, [nodes])

  const centerOnNode = useCallback(
    (id: string) => {
      const element = canvasRef.current
      const node = nodes.find((item) => item.id === id)
      if (!element || !node) return
      const rect = element.getBoundingClientRect()
      const size = sizesRef.current[id] ?? {
        w: NODE_WIDTH,
        h: NODE_HEIGHT_FALLBACK,
      }
      setViewport((current) => {
        const scale = current.scale
        return {
          ...current,
          x: rect.width / 2 - (node.x + size.w / 2) * scale,
          y: rect.height / 2 - (node.y + size.h / 2) * scale,
        }
      })
    },
    [nodes],
  )

  useEffect(() => {
    fitViewRef.current = fitView
  }, [fitView])

  useEffect(() => {
    const element = canvasRef.current
    if (!element) return
    let lastWidth = -1
    let lastHeight = -1

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      if (width === 0 || height === 0) return
      if (
        Math.abs(width - lastWidth) < 0.5 &&
        Math.abs(height - lastHeight) < 0.5
      ) {
        return
      }
      lastWidth = width
      lastHeight = height
      requestAnimationFrame(() => fitViewRef.current?.())
    })

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const addAtCenter = useCallback(
    (kind: DeviceKind) => {
      const element = canvasRef.current
      if (!element) return
      const rect = element.getBoundingClientRect()
      const cascade = (nodes.length % 5) * 24
      const x = Math.round(
        (rect.width / 2 - viewport.x) / viewport.scale - NODE_WIDTH / 2 + cascade,
      )
      const y = Math.round(
        (rect.height / 2 - viewport.y) / viewport.scale - 80 + cascade,
      )
      onAddNode(kind, x, y)
    },
    [nodes.length, onAddNode, viewport],
  )

  useImperativeHandle(
    ref,
    () => ({
      addAtCenter,
      fitView,
      getElement: () => canvasRef.current,
      centerOnNode,
    }),
    [addAtCenter, fitView, centerOnNode],
  )

  useEffect(() => {
    const element = canvasRef.current
    if (!element) return

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      if (event.ctrlKey || event.metaKey) {
        const rect = element.getBoundingClientRect()
        const pointerX = event.clientX - rect.left
        const pointerY = event.clientY - rect.top
        setViewport((current) => {
          const scale = clamp(current.scale * Math.exp(-event.deltaY * 0.0022), 0.28, 2)
          const ratio = scale / current.scale
          return {
            scale,
            x: pointerX - (pointerX - current.x) * ratio,
            y: pointerY - (pointerY - current.y) * ratio,
          }
        })
      } else {
        setViewport((current) => ({
          ...current,
          x: current.x - event.deltaX,
          y: current.y - event.deltaY,
        }))
      }
    }

    element.addEventListener('wheel', handleWheel, { passive: false })
    return () => element.removeEventListener('wheel', handleWheel)
  }, [])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setConnecting(null)
      setDragOver(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const zoomBy = (factor: number) => {
    const element = canvasRef.current
    if (!element) return
    const rect = element.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    setViewport((current) => {
      const scale = clamp(current.scale * factor, 0.28, 2)
      const ratio = scale / current.scale
      return {
        scale,
        x: centerX - (centerX - current.x) * ratio,
        y: centerY - (centerY - current.y) * ratio,
      }
    })
  }

  const releasePointer = (pointerId: number) => {
    const element = canvasRef.current
    if (!element) return
    if (element.hasPointerCapture(pointerId)) {
      element.releasePointerCapture(pointerId)
    }
  }

  const capturePointer = (pointerId: number) => {
    const element = canvasRef.current
    if (!element) return
    try {
      element.setPointerCapture(pointerId)
    } catch {
      // Synthetic pointer events and some browser gestures have no active
      // pointer to capture. Dragging still works inside the canvas.
    }
  }

  const handleNodePointerDown = (
    event: PointerEvent<HTMLElement>,
    node: DeviceNode,
  ) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()

    const additive = event.shiftKey || event.ctrlKey || event.metaKey

    if (additive) {
      let current: string[] = []
      if (selection?.type === 'nodes') current = selection.ids
      else if (selection?.type === 'node') current = [selection.id]
      const next = current.includes(node.id)
        ? current.filter((id) => id !== node.id)
        : [...current, node.id]
      if (next.length === 0) {
        onSelect(null)
      } else if (next.length === 1) {
        onSelect({ type: 'node', id: next[0] })
      } else {
        onSelect({ type: 'nodes', ids: next })
      }
      return
    }

    const multiSelected =
      selection?.type === 'nodes' && selection.ids.includes(node.id)
    const moveIds = multiSelected ? selection.ids : [node.id]
    if (!multiSelected) onSelect({ type: 'node', id: node.id })

    capturePointer(event.pointerId)
    const point = toWorld(event.clientX, event.clientY)
    const members = moveIds
      .map((id) => nodes.find((candidate) => candidate.id === id))
      .filter((candidate): candidate is DeviceNode => Boolean(candidate))
      .map((member) => ({ id: member.id, x: member.x, y: member.y }))

    nodeDrag.current = {
      id: node.id,
      pointerId: event.pointerId,
      offsetX: point.x - node.x,
      offsetY: point.y - node.y,
      anchorX: node.x,
      anchorY: node.y,
      nodes: members,
    }
    setDraggingIds(moveIds)
  }

  const handleGroupPointerDown = (
    event: PointerEvent<HTMLElement>,
    group: DeviceGroup,
  ) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    onSelect({ type: 'group', id: group.id })

    const members = group.nodeIds
      .map((id) => nodes.find((candidate) => candidate.id === id))
      .filter((candidate): candidate is DeviceNode => Boolean(candidate))
      .map((member) => ({ id: member.id, x: member.x, y: member.y }))
    if (members.length === 0) return

    capturePointer(event.pointerId)
    const point = toWorld(event.clientX, event.clientY)
    groupDrag.current = {
      id: group.id,
      pointerId: event.pointerId,
      startX: point.x,
      startY: point.y,
      nodes: members,
    }
    setDraggingGroupId(group.id)
  }

  const handleConnectStart = (
    event: PointerEvent<HTMLElement>,
    node: DeviceNode,
  ) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    onSelect({ type: 'node', id: node.id })
    capturePointer(event.pointerId)
    const point = toWorld(event.clientX, event.clientY)
    setConnecting({
      from: node.id,
      x: point.x,
      y: point.y,
      targetId: null,
    })
  }

  const beginPan = (event: PointerEvent<HTMLDivElement>) => {
    capturePointer(event.pointerId)
    panDrag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: viewport.x,
      originY: viewport.y,
    }
    setPanning(true)
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.button !== 1) return
    if (event.button === 1) event.preventDefault()
    if (event.button === 0 && !event.altKey) onSelect(null)
    beginPan(event)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (nodeDrag.current) {
      const drag = nodeDrag.current
      const point = toWorld(event.clientX, event.clientY)
      const nextX = Math.round(point.x - drag.offsetX)
      const nextY = Math.round(point.y - drag.offsetY)
      if (drag.nodes.length > 1) {
        const deltaX = nextX - drag.anchorX
        const deltaY = nextY - drag.anchorY
        onMoveNodes(
          drag.nodes.map((node) => ({
            id: node.id,
            x: node.x + deltaX,
            y: node.y + deltaY,
          })),
        )
      } else {
        onMoveNode(drag.id, nextX, nextY)
      }
      return
    }

    if (groupDrag.current) {
      const drag = groupDrag.current
      const point = toWorld(event.clientX, event.clientY)
      const deltaX = Math.round(point.x - drag.startX)
      const deltaY = Math.round(point.y - drag.startY)
      onMoveNodes(
        drag.nodes.map((node) => ({
          id: node.id,
          x: node.x + deltaX,
          y: node.y + deltaY,
        })),
      )
      return
    }

    if (panDrag.current) {
      const drag = panDrag.current
      const deltaX = event.clientX - drag.startX
      const deltaY = event.clientY - drag.startY
      setViewport((current) => ({
        ...current,
        x: drag.originX + deltaX,
        y: drag.originY + deltaY,
      }))
      return
    }

    if (connecting) {
      const point = toWorld(event.clientX, event.clientY)
      const hovered = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLElement>('[data-node-id]')
      const targetId = hovered?.dataset.nodeId ?? null
      setConnecting({
        ...connecting,
        x: point.x,
        y: point.y,
        targetId: targetId === connecting.from ? null : targetId,
      })
    }
  }

  const finishPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (nodeDrag.current) {
      nodeDrag.current = null
      setDraggingIds([])
      releasePointer(event.pointerId)
      return
    }

    if (groupDrag.current) {
      groupDrag.current = null
      setDraggingGroupId(null)
      releasePointer(event.pointerId)
      return
    }

    if (panDrag.current) {
      panDrag.current = null
      setPanning(false)
      releasePointer(event.pointerId)
      return
    }

    if (connecting) {
      const hovered = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLElement>('[data-node-id]')
      const targetId = hovered?.dataset.nodeId ?? null
      if (targetId && targetId !== connecting.from) {
        onConnect(connecting.from, targetId)
      }
      setConnecting(null)
      releasePointer(event.pointerId)
    }
  }

  const cancelPointer = (event: PointerEvent<HTMLDivElement>) => {
    nodeDrag.current = null
    groupDrag.current = null
    panDrag.current = null
    setDraggingIds([])
    setDraggingGroupId(null)
    setPanning(false)
    setConnecting(null)
    releasePointer(event.pointerId)
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    if (!dragOver) setDragOver(true)
  }

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    const next = event.relatedTarget
    if (next instanceof Node && event.currentTarget.contains(next)) return
    setDragOver(false)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragOver(false)
    const kind = event.dataTransfer.getData(DND_MIME) as DeviceKind
    if (!kind || !(kind in DEVICE_META)) return
    const point = toWorld(event.clientX, event.clientY)
    onAddNode(
      kind,
      Math.round(point.x - NODE_WIDTH / 2),
      Math.round(point.y - 70),
    )
  }

  const stopCanvasWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.stopPropagation()
  }

  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const defaultSize: NodeSize = { w: NODE_WIDTH, h: NODE_HEIGHT_FALLBACK }

  const isNodeSelected = (id: string) => {
    if (selection?.type === 'node') return selection.id === id
    if (selection?.type === 'nodes') return selection.ids.includes(id)
    return false
  }

  const groupBoxes = groups
    .map((group) => {
      const members = group.nodeIds
        .map((id) => nodeById.get(id))
        .filter((node): node is DeviceNode => Boolean(node))
      if (members.length === 0) return null

      let minX = Number.POSITIVE_INFINITY
      let minY = Number.POSITIVE_INFINITY
      let maxX = Number.NEGATIVE_INFINITY
      let maxY = Number.NEGATIVE_INFINITY

      for (const node of members) {
        const size = sizes[node.id] ?? defaultSize
        minX = Math.min(minX, node.x)
        minY = Math.min(minY, node.y)
        maxX = Math.max(maxX, node.x + size.w)
        maxY = Math.max(maxY, node.y + size.h)
      }

      return {
        group,
        x: minX - GROUP_PADDING_X,
        y: minY - GROUP_PADDING_TOP,
        width: maxX - minX + GROUP_PADDING_X * 2,
        height: maxY - minY + GROUP_PADDING_TOP + GROUP_PADDING_BOTTOM,
      }
    })
    .filter((box): box is NonNullable<typeof box> => Boolean(box))

  const gridStyle =
    gridMode === 'none'
      ? ({
          backgroundImage: 'none',
        } as CSSProperties)
      : gridMode === 'lines'
        ? ({
            backgroundSize: `${24 * viewport.scale}px ${24 * viewport.scale}px, ${24 * viewport.scale}px ${24 * viewport.scale}px, ${120 * viewport.scale}px ${120 * viewport.scale}px, ${120 * viewport.scale}px ${120 * viewport.scale}px`,
            backgroundPosition: `${viewport.x}px ${viewport.y}px, ${viewport.x}px ${viewport.y}px, ${viewport.x}px ${viewport.y}px, ${viewport.x}px ${viewport.y}px`,
          } as CSSProperties)
        : ({
            backgroundSize: `${24 * viewport.scale}px ${24 * viewport.scale}px, ${120 * viewport.scale}px ${120 * viewport.scale}px`,
            backgroundPosition: `${viewport.x}px ${viewport.y}px, ${viewport.x}px ${viewport.y}px`,
          } as CSSProperties)

  return (
    <div
      ref={canvasRef}
      className={[
        'canvas-shell',
        `grid-${gridMode}`,
        panning ? 'is-panning' : '',
        dragOver ? 'is-dragover' : '',
        connecting ? 'is-connecting' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={gridStyle}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointer}
      onPointerCancel={cancelPointer}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onWheel={stopCanvasWheel}
    >
      <div className="canvas-vignette" />

      <div
        className="world"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
        }}
      >
        {groupBoxes.map(({ group, x, y, width, height }) => {
          const selected =
            selection?.type === 'group' && selection.id === group.id
          return (
            <div
              key={group.id}
              className={[
                'group-box',
                selected ? 'is-selected' : '',
                draggingGroupId === group.id ? 'is-dragging' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={
                {
                  left: x,
                  top: y,
                  width,
                  height,
                  '--group-color': group.color,
                } as CSSProperties
              }
            >
              <div
                className="group-box-head"
                onPointerDown={(event) => handleGroupPointerDown(event, group)}
              >
                <span className="group-box-dot" />
                <span className="group-box-name">{group.name || 'Группа'}</span>
                <span className="group-box-count">{group.nodeIds.length}</span>
              </div>
            </div>
          )
        })}

        <svg className="edge-layer" width="1" height="1" aria-hidden="true">
          {connections.map((connection) => {
            const from = nodeById.get(connection.from)
            const to = nodeById.get(connection.to)
            if (!from || !to) return null
            const geometry = edgeGeometry(
              from,
              to,
              sizes[from.id] ?? defaultSize,
              sizes[to.id] ?? defaultSize,
            )
            const meta = LINK_META[connection.kind]
            const selected = selection?.type === 'link' && selection.id === connection.id
            const label =
              connection.label ||
              (connection.kind === 'vpn' && connection.vpnProtocol
                ? VPN_PROTOCOL_META[connection.vpnProtocol].label
                : '')
            const labelWidth = Math.max(32, label.length * 6.4 + 16)
            return (
              <g
                key={connection.id}
                className={`edge-group ${selected ? 'is-selected' : ''}`}
                style={{ '--edge-color': meta.color } as CSSProperties}
              >
                <path
                  className="edge-hit"
                  d={geometry.d}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={18}
                  onPointerDown={(event) => {
                    event.stopPropagation()
                    onSelect({ type: 'link', id: connection.id })
                  }}
                />
                <path
                  className="edge-line"
                  d={geometry.d}
                  fill="none"
                  stroke={meta.color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  opacity={0.66}
                  style={{ strokeDasharray: meta.dash }}
                />
                <circle
                  className="edge-dot"
                  cx={geometry.startX}
                  cy={geometry.startY}
                  r="2.5"
                  fill={meta.color}
                  opacity={0.75}
                />
                <circle
                  className="edge-dot"
                  cx={geometry.endX}
                  cy={geometry.endY}
                  r="2.5"
                  fill={meta.color}
                  opacity={0.75}
                />
                {label && (
                  <g
                    className="edge-label"
                    transform={`translate(${geometry.midX} ${geometry.midY})`}
                  >
                    {(() => {
                      const isLightTheme =
                        typeof document !== 'undefined' &&
                        document.documentElement.dataset.theme === 'light'
                      return (
                        <>
                          <rect
                            x={-labelWidth / 2}
                            y="-9"
                            width={labelWidth}
                            height="18"
                            rx="6"
                            fill={
                              isLightTheme
                                ? 'rgba(255, 255, 255, 0.96)'
                                : 'rgba(8, 13, 23, 0.94)'
                            }
                            stroke={meta.color}
                            strokeOpacity={0.35}
                            strokeWidth={1}
                          />
                          <text
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill={isLightTheme ? '#475569' : '#b8c6d9'}
                            fontSize="9.5"
                            fontWeight={600}
                            fontFamily="var(--sans, sans-serif)"
                          >
                            {label}
                          </text>
                        </>
                      )
                    })()}
                  </g>
                )}
              </g>
            )
          })}

          {connecting &&
            (() => {
              const source = nodeById.get(connecting.from)
              if (!source) return null
              const size = sizes[source.id] ?? defaultSize
              const startX = source.x + size.w / 2
              const startY = source.y + size.h / 2
              return (
                <g className="edge-ghost">
                  <path
                    d={`M ${startX} ${startY} Q ${(startX + connecting.x) / 2} ${
                      (startY + connecting.y) / 2
                    } ${connecting.x} ${connecting.y}`}
                  />
                  <circle cx={connecting.x} cy={connecting.y} r="4" />
                </g>
              )
            })()}
        </svg>

        {nodes.map((node) => (
          <DeviceNodeCard
            key={node.id}
            node={node}
            selected={isNodeSelected(node.id)}
            dragging={draggingIds.includes(node.id)}
            isConnectSource={connecting?.from === node.id}
            isConnectTarget={connecting?.targetId === node.id}
            onPointerDown={handleNodePointerDown}
            onConnectStart={handleConnectStart}
            onMeasure={onMeasure}
          />
        ))}
      </div>

      {dragOver && (
        <div className="drop-overlay">
          <span className="drop-overlay-inner">
            <DeviceIcon kind="router" size={22} />
            Отпустите, чтобы добавить устройство
          </span>
        </div>
      )}

      {nodes.length === 0 && !dragOver && (
        <div className="canvas-empty">
          <span className="canvas-empty-icon">
            <Icon name="topology" size={26} />
          </span>
          <strong>Соберите свою схему</strong>
          <p>
            Перетащите устройство из библиотеки слева или нажмите на него,
            чтобы добавить в центр холста.
          </p>
        </div>
      )}

      <div className="canvas-hint">
        <Icon name="cursor" size={14} />
        <span>Перетащите устройство · потяните за точку, чтобы соединить</span>
      </div>

      <div
        className="canvas-toolbar"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="zoom-button"
          onClick={() => zoomBy(1 / 1.15)}
          title="Уменьшить"
          aria-label="Уменьшить масштаб"
        >
          <Icon name="minus" size={15} />
        </button>
        <button
          type="button"
          className="zoom-value"
          onClick={() => zoomBy(1 / viewport.scale)}
          title="Сбросить масштаб"
        >
          {Math.round(viewport.scale * 100)}%
        </button>
        <button
          type="button"
          className="zoom-button"
          onClick={() => zoomBy(1.15)}
          title="Увеличить"
          aria-label="Увеличить масштаб"
        >
          <Icon name="plus" size={15} />
        </button>
        <span className="toolbar-divider" />
        <button
          type="button"
          className="zoom-button"
          onClick={fitView}
          title="Показать всю схему"
          aria-label="Показать всю схему"
        >
          <Icon name="fit" size={15} />
        </button>
        <button
          type="button"
          className="zoom-button"
          onClick={() =>
            setGridMode((mode) =>
              mode === 'dots' ? 'lines' : mode === 'lines' ? 'none' : 'dots',
            )
          }
          title={
            gridMode === 'dots'
              ? 'Сетка: точки (нажмите для линий)'
              : gridMode === 'lines'
                ? 'Сетка: линии (нажмите чтобы скрыть)'
                : 'Сетка: скрыта (нажмите для точек)'
          }
          aria-label="Изменить сетку"
        >
          <Icon name={gridMode === 'dots' ? 'grip' : gridMode === 'lines' ? 'group' : 'close'} size={15} />
        </button>
      </div>

      <div className="canvas-scale-hint">
        <span>Ctrl</span> + колесо — масштаб · фон — панорама
      </div>
    </div>
  )
})
