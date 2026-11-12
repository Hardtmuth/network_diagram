import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
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
import { useTranslation } from 'react-i18next'
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
  onUpdateLink: (id: string, patch: Partial<Connection>) => void
  pingStatuses?: Record<string, 'up' | 'down' | 'unknown'>
  readOnly?: boolean
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

interface WaypointDrag {
  linkId: string
  index: number
  pointerId: number
}

interface GroupDrag {
  id: string
  pointerId: number
  startX: number
  startY: number
  nodes: { id: string; x: number; y: number }[]
}

interface Point {
  x: number
  y: number
}

interface AlignGuides {
  v: number[]
  h: number[]
}

const GROUP_PADDING_X = 26
const GROUP_PADDING_TOP = 26
const GROUP_PADDING_BOTTOM = 26
const NESTED_GROUP_HEADER_OFFSET = 28
const NESTED_GROUP_SIDE_OFFSET = 14
const SNAP_THRESHOLD = 6

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

function centerOf(node: DeviceNode, size: NodeSize) {
  return { x: node.x + size.w / 2, y: node.y + size.h / 2 }
}

function anchorToward(node: DeviceNode, size: NodeSize, target: Point): Point {
  const c = centerOf(node, size)
  const dx = target.x - c.x
  const dy = target.y - c.y
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { x: node.x + size.w, y: c.y }
      : { x: node.x, y: c.y }
  }
  return dy >= 0
    ? { x: c.x, y: node.y + size.h }
    : { x: c.x, y: node.y }
}

function roundedPath(points: Point[], radius = 14) {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`
  }

  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const next = points[i + 1]
    const v1x = curr.x - prev.x
    const v1y = curr.y - prev.y
    const v2x = next.x - curr.x
    const v2y = next.y - curr.y
    const len1 = Math.hypot(v1x, v1y)
    const len2 = Math.hypot(v2x, v2y)
    if (len1 === 0 || len2 === 0) {
      d += ` L ${curr.x} ${curr.y}`
      continue
    }
    const r = Math.min(radius, len1 / 2, len2 / 2)
    const p1x = curr.x - (v1x / len1) * r
    const p1y = curr.y - (v1y / len1) * r
    const p2x = curr.x + (v2x / len2) * r
    const p2y = curr.y + (v2y / len2) * r
    d += ` L ${p1x} ${p1y} Q ${curr.x} ${curr.y} ${p2x} ${p2y}`
  }
  const last = points[points.length - 1]
  d += ` L ${last.x} ${last.y}`
  return d
}

function pathMidpoint(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 }
  if (points.length === 1) return points[0]
  let total = 0
  const segs: { len: number; a: Point; b: Point }[] = []
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    const len = Math.hypot(b.x - a.x, b.y - a.y)
    segs.push({ len, a, b })
    total += len
  }
  if (total === 0) return points[0]
  let dist = total / 2
  for (const seg of segs) {
    if (dist <= seg.len || seg === segs[segs.length - 1]) {
      const t = seg.len === 0 ? 0 : dist / seg.len
      return {
        x: seg.a.x + (seg.b.x - seg.a.x) * t,
        y: seg.a.y + (seg.b.y - seg.a.y) * t,
      }
    }
    dist -= seg.len
  }
  return points[points.length - 1]
}

function distToSegment(p: Point, a: Point, b: Point) {
  const abx = b.x - a.x
  const aby = b.y - a.y
  const apx = p.x - a.x
  const apy = p.y - a.y
  const ab2 = abx * abx + aby * aby
  const t = ab2 === 0 ? 0 : clamp((apx * abx + apy * aby) / ab2, 0, 1)
  const qx = a.x + abx * t
  const qy = a.y + aby * t
  return Math.hypot(p.x - qx, p.y - qy)
}

function edgeGeometry(
  from: DeviceNode,
  to: DeviceNode,
  fromSize: NodeSize,
  toSize: NodeSize,
  waypoints: Point[] = [],
) {
  if (waypoints.length > 0) {
    const start = anchorToward(from, fromSize, waypoints[0])
    const end = anchorToward(to, toSize, waypoints[waypoints.length - 1])
    const points = [start, ...waypoints, end]
    const mid = pathMidpoint(points)
    return {
      d: roundedPath(points, 14),
      midX: mid.x,
      midY: mid.y,
      startX: start.x,
      startY: start.y,
      endX: end.x,
      endY: end.y,
      points,
    }
  }

  const fromCenter = centerOf(from, fromSize)
  const toCenter = centerOf(to, toSize)
  const horizontal = Math.abs(toCenter.x - fromCenter.x) >= Math.abs(toCenter.y - fromCenter.y)

  if (horizontal) {
    const forward = toCenter.x >= fromCenter.x
    const startX = forward ? from.x + fromSize.w : from.x
    const startY = fromCenter.y
    const endX = forward ? to.x : to.x + toSize.w
    const endY = toCenter.y
    const direction = forward ? 1 : -1
    const curve = Math.max(55, Math.abs(endX - startX) * 0.45)
    const points = [
      { x: startX, y: startY },
      { x: endX, y: endY },
    ]
    return {
      d: `M ${startX} ${startY} C ${startX + curve * direction} ${startY}, ${endX - curve * direction} ${endY}, ${endX} ${endY}`,
      midX: (startX + endX) / 2,
      midY: (startY + endY) / 2,
      startX,
      startY,
      endX,
      endY,
      points,
    }
  }

  const forward = toCenter.y >= fromCenter.y
  const startX = fromCenter.x
  const startY = forward ? from.y + fromSize.h : from.y
  const endX = toCenter.x
  const endY = forward ? to.y : to.y + toSize.h
  const direction = forward ? 1 : -1
  const curve = Math.max(45, Math.abs(endY - startY) * 0.45)
  const points = [
    { x: startX, y: startY },
    { x: endX, y: endY },
  ]
  return {
    d: `M ${startX} ${startY} C ${startX} ${startY + curve * direction}, ${endX} ${endY - curve * direction}, ${endX} ${endY}`,
    midX: (startX + endX) / 2,
    midY: (startY + endY) / 2,
    startX,
    startY,
    endX,
    endY,
    points,
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
    onUpdateLink,
    pingStatuses,
    readOnly = false,
  },
  ref,
) {
  const { t } = useTranslation()
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
  const [alignGuides, setAlignGuides] = useState<AlignGuides>({ v: [], h: [] })
  const nodeDrag = useRef<NodeDrag | null>(null)
  const groupDrag = useRef<GroupDrag | null>(null)
  const panDrag = useRef<PanDrag | null>(null)
  const waypointDrag = useRef<WaypointDrag | null>(null)
  const fitViewRef = useRef<(() => void) | null>(null)
  const defaultSize: NodeSize = { w: NODE_WIDTH, h: NODE_HEIGHT_FALLBACK }

  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes])

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

  const getSnap = useCallback(
    (
      moved: { id: string; x: number; y: number }[],
      deltaX: number,
      deltaY: number,
    ) => {
      if (moved.length === 0) {
        return { deltaX, deltaY, guides: { v: [] as number[], h: [] as number[] } }
      }
      const movingIds = new Set(moved.map((m) => m.id))
      const defaultSize: NodeSize = { w: NODE_WIDTH, h: NODE_HEIGHT_FALLBACK }

      let minX = Number.POSITIVE_INFINITY
      let minY = Number.POSITIVE_INFINITY
      let maxX = Number.NEGATIVE_INFINITY
      let maxY = Number.NEGATIVE_INFINITY
      for (const m of moved) {
        const size = sizesRef.current[m.id] ?? defaultSize
        const x = m.x + deltaX
        const y = m.y + deltaY
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x + size.w)
        maxY = Math.max(maxY, y + size.h)
      }
      const centerX = (minX + maxX) / 2
      const centerY = (minY + maxY) / 2

      let snapDX = 0
      let snapDY = 0
      let bestX = SNAP_THRESHOLD + 1
      let bestY = SNAP_THRESHOLD + 1
      const guidesV = new Set<number>()
      const guidesH = new Set<number>()

      const xCandidates = [
        { value: minX, apply: (t: number) => t - minX },
        { value: centerX, apply: (t: number) => t - centerX },
        { value: maxX, apply: (t: number) => t - maxX },
      ]
      const yCandidates = [
        { value: minY, apply: (t: number) => t - minY },
        { value: centerY, apply: (t: number) => t - centerY },
        { value: maxY, apply: (t: number) => t - maxY },
      ]

      for (const node of nodes) {
        if (movingIds.has(node.id)) continue
        const size = sizesRef.current[node.id] ?? defaultSize
        const tx = [node.x, node.x + size.w / 2, node.x + size.w]
        const ty = [node.y, node.y + size.h / 2, node.y + size.h]

        for (const c of xCandidates) {
          for (const t of tx) {
            const d = Math.abs(c.value - t)
            if (d < bestX - 1e-6) {
              bestX = d
              snapDX = c.apply(t)
              guidesV.clear()
              guidesV.add(t)
            } else if (Math.abs(d - bestX) < 1e-6 && d <= SNAP_THRESHOLD) {
              guidesV.add(t)
            }
          }
        }

        for (const c of yCandidates) {
          for (const t of ty) {
            const d = Math.abs(c.value - t)
            if (d < bestY - 1e-6) {
              bestY = d
              snapDY = c.apply(t)
              guidesH.clear()
              guidesH.add(t)
            } else if (Math.abs(d - bestY) < 1e-6 && d <= SNAP_THRESHOLD) {
              guidesH.add(t)
            }
          }
        }
      }

      if (bestX > SNAP_THRESHOLD) {
        snapDX = 0
        guidesV.clear()
      }
      if (bestY > SNAP_THRESHOLD) {
        snapDY = 0
        guidesH.clear()
      }

      return {
        deltaX: deltaX + snapDX,
        deltaY: deltaY + snapDY,
        guides: { v: [...guidesV], h: [...guidesH] },
      }
    },
    [nodes],
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
      if (readOnly) return
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
    [nodes.length, onAddNode, readOnly, viewport],
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
      let nodeIds: string[] = []
      let groupIds: string[] = []
      if (selection?.type === 'items') { nodeIds = selection.nodeIds; groupIds = selection.groupIds }
      else if (selection?.type === 'nodes') nodeIds = selection.ids
      else if (selection?.type === 'node') nodeIds = [selection.id]
      else if (selection?.type === 'group') groupIds = [selection.id]
      const nextNodeIds = nodeIds.includes(node.id)
        ? nodeIds.filter((id) => id !== node.id)
        : [...nodeIds, node.id]
      const total = nextNodeIds.length + groupIds.length
      if (total === 0) onSelect(null)
      else if (nextNodeIds.length === 1 && groupIds.length === 0) onSelect({ type: 'node', id: nextNodeIds[0] })
      else if (nextNodeIds.length === 0 && groupIds.length === 1) onSelect({ type: 'group', id: groupIds[0] })
      else if (groupIds.length === 0) onSelect({ type: 'nodes', ids: nextNodeIds })
      else onSelect({ type: 'items', nodeIds: nextNodeIds, groupIds })
      return
    }

    const multiSelected =
      (selection?.type === 'nodes' && selection.ids.includes(node.id)) ||
      (selection?.type === 'items' && selection.nodeIds.includes(node.id))
    const moveIds: string[] = multiSelected
      ? selection?.type === 'items'
        ? selection.nodeIds
        : selection?.type === 'nodes'
          ? selection.ids
          : [node.id]
      : [node.id]
    if (!multiSelected) onSelect({ type: 'node', id: node.id })
    if (readOnly) return

    capturePointer(event.pointerId)
    const point = toWorld(event.clientX, event.clientY)
    const members = moveIds
      .map((id: string) => nodes.find((candidate) => candidate.id === id))
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

    const additive = event.shiftKey || event.ctrlKey || event.metaKey
    if (additive) {
      let nodeIds: string[] = []
      let groupIds: string[] = []
      if (selection?.type === 'items') {
        nodeIds = selection.nodeIds
        groupIds = selection.groupIds
      } else if (selection?.type === 'nodes') {
        nodeIds = selection.ids
      } else if (selection?.type === 'node') {
        nodeIds = [selection.id]
      } else if (selection?.type === 'group') {
        groupIds = [selection.id]
      }
      const nextGroupIds = groupIds.includes(group.id)
        ? groupIds.filter((id) => id !== group.id)
        : [...groupIds, group.id]
      const total = nodeIds.length + nextGroupIds.length
      if (total === 0) onSelect(null)
      else if (nodeIds.length === 1 && nextGroupIds.length === 0) onSelect({ type: 'node', id: nodeIds[0] })
      else if (nodeIds.length === 0 && nextGroupIds.length === 1) onSelect({ type: 'group', id: nextGroupIds[0] })
      else onSelect({ type: 'items', nodeIds, groupIds: nextGroupIds })
      return
    }

    onSelect({ type: 'group', id: group.id })
    if (readOnly) return

    const memberIds = collectGroupNodeIds(group.id)
    const members = memberIds
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
    if (event.button !== 0 || readOnly) return
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

  const insertWaypoint = useCallback(
    (connectionId: string, clientX: number, clientY: number) => {
      if (readOnly) return
      const connection = connections.find((item) => item.id === connectionId)
      if (!connection) return
      const from = nodeById.get(connection.from)
      const to = nodeById.get(connection.to)
      if (!from || !to) return
      const geometry = edgeGeometry(
        from,
        to,
        sizesRef.current[from.id] ?? defaultSize,
        sizesRef.current[to.id] ?? defaultSize,
        connection.waypoints ?? [],
      )
      const point = toWorld(clientX, clientY)
      let bestIndex = 1
      let bestDist = Number.POSITIVE_INFINITY
      for (let i = 1; i < geometry.points.length; i++) {
        const d = distToSegment(point, geometry.points[i - 1], geometry.points[i])
        if (d < bestDist) {
          bestDist = d
          bestIndex = i
        }
      }
      const next = [...(connection.waypoints ?? [])]
      next.splice(Math.max(0, bestIndex - 1), 0, {
        x: Math.round(point.x),
        y: Math.round(point.y),
      })
      onUpdateLink(connectionId, { waypoints: next })
    },
    [connections, nodeById, onUpdateLink, readOnly, toWorld],
  )

  const removeWaypoint = useCallback(
    (connectionId: string, index: number) => {
      if (readOnly) return
      const connection = connections.find((item) => item.id === connectionId)
      if (!connection) return
      const next = [...(connection.waypoints ?? [])]
      next.splice(index, 1)
      onUpdateLink(connectionId, { waypoints: next.length ? next : [] })
    },
    [connections, onUpdateLink, readOnly],
  )

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (waypointDrag.current) {
      const drag = waypointDrag.current
      const connection = connections.find((item) => item.id === drag.linkId)
      if (!connection) return
      const from = nodeById.get(connection.from)
      const to = nodeById.get(connection.to)
      if (!from || !to) return
      const point = toWorld(event.clientX, event.clientY)
      const next = [...(connection.waypoints ?? [])]
      if (!next[drag.index]) return
      let x = Math.round(point.x)
      let y = Math.round(point.y)
      const geometry = edgeGeometry(
        from,
        to,
        sizesRef.current[from.id] ?? defaultSize,
        sizesRef.current[to.id] ?? defaultSize,
        next,
      )
      const prevPoint = geometry.points[drag.index]
      const nextPoint = geometry.points[drag.index + 2]
      const alignThreshold = 8
      if (prevPoint && Math.abs(x - prevPoint.x) <= alignThreshold) x = Math.round(prevPoint.x)
      if (nextPoint && Math.abs(x - nextPoint.x) <= alignThreshold) x = Math.round(nextPoint.x)
      if (prevPoint && Math.abs(y - prevPoint.y) <= alignThreshold) y = Math.round(prevPoint.y)
      if (nextPoint && Math.abs(y - nextPoint.y) <= alignThreshold) y = Math.round(nextPoint.y)
      next[drag.index] = { x, y }
      onUpdateLink(drag.linkId, { waypoints: next })
      return
    }

    if (nodeDrag.current) {
      const drag = nodeDrag.current
      const point = toWorld(event.clientX, event.clientY)
      const rawX = Math.round(point.x - drag.offsetX)
      const rawY = Math.round(point.y - drag.offsetY)
      const rawDeltaX = rawX - drag.anchorX
      const rawDeltaY = rawY - drag.anchorY
      const snap = getSnap(drag.nodes, rawDeltaX, rawDeltaY)
      setAlignGuides(snap.guides)
      if (drag.nodes.length > 1) {
        onMoveNodes(
          drag.nodes.map((node) => ({
            id: node.id,
            x: node.x + snap.deltaX,
            y: node.y + snap.deltaY,
          })),
        )
      } else {
        onMoveNode(drag.id, drag.anchorX + snap.deltaX, drag.anchorY + snap.deltaY)
      }
      return
    }

    if (groupDrag.current) {
      const drag = groupDrag.current
      const point = toWorld(event.clientX, event.clientY)
      const rawDeltaX = Math.round(point.x - drag.startX)
      const rawDeltaY = Math.round(point.y - drag.startY)
      const snap = getSnap(drag.nodes, rawDeltaX, rawDeltaY)
      setAlignGuides(snap.guides)
      onMoveNodes(
        drag.nodes.map((node) => ({
          id: node.id,
          x: node.x + snap.deltaX,
          y: node.y + snap.deltaY,
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
    if (waypointDrag.current) {
      waypointDrag.current = null
      releasePointer(event.pointerId)
      return
    }

    if (nodeDrag.current) {
      nodeDrag.current = null
      setDraggingIds([])
      setAlignGuides({ v: [], h: [] })
      releasePointer(event.pointerId)
      return
    }

    if (groupDrag.current) {
      groupDrag.current = null
      setDraggingGroupId(null)
      setAlignGuides({ v: [], h: [] })
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
    waypointDrag.current = null
    setDraggingIds([])
    setDraggingGroupId(null)
    setPanning(false)
    setConnecting(null)
    setAlignGuides({ v: [], h: [] })
    releasePointer(event.pointerId)
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (readOnly) return
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
    if (readOnly) return
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

  // nodeById and defaultSize are defined above

  const isNodeSelected = (id: string) => {
    if (selection?.type === 'node') return selection.id === id
    if (selection?.type === 'nodes') return selection.ids.includes(id)
    if (selection?.type === 'items') return selection.nodeIds.includes(id)
    return false
  }

  const groupById = new Map(groups.map((g) => [g.id, g]))
  const collectGroupNodeIds = (groupId: string, seen = new Set<string>()): string[] => {
    if (seen.has(groupId)) return []
    seen.add(groupId)
    const g = groupById.get(groupId)
    if (!g) return []
    const ids = [...g.nodeIds]
    for (const childId of g.groupIds ?? []) {
      ids.push(...collectGroupNodeIds(childId, seen))
    }
    return [...new Set(ids)]
  }
  const directMemberCount = (group: DeviceGroup) =>
    group.nodeIds.length + (group.groupIds ?? []).length

  const nestedGroupDepthById = new Map<string, number>()
  const getNestedGroupDepth = (groupId: string, seen = new Set<string>()): number => {
    const cached = nestedGroupDepthById.get(groupId)
    if (cached !== undefined) return cached
    if (seen.has(groupId)) return 0
    seen.add(groupId)
    const g = groupById.get(groupId)
    if (!g || (g.groupIds ?? []).length === 0) {
      nestedGroupDepthById.set(groupId, 0)
      return 0
    }
    let depth = 0
    for (const childId of g.groupIds ?? []) {
      depth = Math.max(depth, 1 + getNestedGroupDepth(childId, new Set(seen)))
    }
    nestedGroupDepthById.set(groupId, depth)
    return depth
  }

  const groupBoxes = groups
    .map((group) => {
      const memberIds = collectGroupNodeIds(group.id)
      const members = memberIds
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

      const nestedDepth = getNestedGroupDepth(group.id)
      const extraTop = nestedDepth * NESTED_GROUP_HEADER_OFFSET
      const extraSides = nestedDepth * NESTED_GROUP_SIDE_OFFSET
      const paddingTop = GROUP_PADDING_TOP + extraTop
      const paddingX = GROUP_PADDING_X + extraSides
      const paddingBottom = GROUP_PADDING_BOTTOM + extraSides

      return {
        group,
        memberCount: directMemberCount(group),
        x: minX - paddingX,
        y: minY - paddingTop,
        width: maxX - minX + paddingX * 2,
        height: maxY - minY + paddingTop + paddingBottom,
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
        {groupBoxes.map(({ group, memberCount, x, y, width, height }) => {
          const selected =
            (selection?.type === 'group' && selection.id === group.id) ||
            (selection?.type === 'items' && selection.groupIds.includes(group.id))
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
                <span className="group-box-name">{group.name || t('canvas.groupDefault')}</span>
                <span className="group-box-count">{memberCount}</span>
              </div>
            </div>
          )
        })}

        <svg className="edge-layer" width="1" height="1" aria-hidden="true">
          {connections.map((connection) => {
            const from = nodeById.get(connection.from)
            const to = nodeById.get(connection.to)
            if (!from || !to) return null
            const waypoints = connection.waypoints ?? []
            const geometry = edgeGeometry(
              from,
              to,
              sizes[from.id] ?? defaultSize,
              sizes[to.id] ?? defaultSize,
              waypoints,
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
                  onDoubleClick={(event) => {
                    event.stopPropagation()
                    if (readOnly) return
                    onSelect({ type: 'link', id: connection.id })
                    insertWaypoint(connection.id, event.clientX, event.clientY)
                  }}
                />
                <path
                  className="edge-halo"
                  d={geometry.d}
                  fill="none"
                  strokeWidth={selected ? 6 : 5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  className="edge-line"
                  d={geometry.d}
                  fill="none"
                  stroke={meta.color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
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
                {selected &&
                  !readOnly &&
                  waypoints.map((point, index) => (
                    <g key={`${connection.id}-wp-${index}`} className="edge-waypoint">
                      <circle
                        className="edge-waypoint-hit"
                        cx={point.x}
                        cy={point.y}
                        r="10"
                        fill="transparent"
                        onPointerDown={(event) => {
                          event.stopPropagation()
                          event.preventDefault()
                          const drag: WaypointDrag = {
                            linkId: connection.id,
                            index,
                            pointerId: event.pointerId,
                          }
                          waypointDrag.current = drag
                          capturePointer(event.pointerId)
                        }}
                        onDoubleClick={(event) => {
                          event.stopPropagation()
                          event.preventDefault()
                          removeWaypoint(connection.id, index)
                        }}
                      />
                      <circle
                        className="edge-waypoint-dot"
                        cx={point.x}
                        cy={point.y}
                        r="4.5"
                        fill={meta.color}
                        stroke={
                          typeof document !== 'undefined' &&
                          document.documentElement.dataset.theme === 'light'
                            ? '#ffffff'
                            : '#0b1220'
                        }
                        strokeWidth="1.5"
                      />
                    </g>
                  ))}
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

          {alignGuides.v.map((x) => (
            <line
              key={`v-${x}`}
              x1={x}
              y1={-100000}
              x2={x}
              y2={100000}
              stroke="#38bdf8"
              strokeWidth={1}
              strokeDasharray="4 4"
              opacity={0.9}
              pointerEvents="none"
            />
          ))}
          {alignGuides.h.map((y) => (
            <line
              key={`h-${y}`}
              x1={-100000}
              y1={y}
              x2={100000}
              y2={y}
              stroke="#38bdf8"
              strokeWidth={1}
              strokeDasharray="4 4"
              opacity={0.9}
              pointerEvents="none"
            />
          ))}
        </svg>

        {nodes.map((node) => (
          <DeviceNodeCard
            key={node.id}
            node={node}
            selected={isNodeSelected(node.id)}
            dragging={draggingIds.includes(node.id)}
            isConnectSource={connecting?.from === node.id}
            isConnectTarget={connecting?.targetId === node.id}
            pingStatus={pingStatuses?.[node.id]}
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
            {t('canvas.dropHint')}
          </span>
        </div>
      )}

      {nodes.length === 0 && !dragOver && (
        <div className="canvas-empty">
          <span className="canvas-empty-icon">
            <Icon name="topology" size={26} />
          </span>
          <strong>{t('canvas.emptyTitle')}</strong>
          <p>{t('canvas.emptyText')}</p>
        </div>
      )}

      <div className="canvas-hint">
        <Icon name="cursor" size={14} />
        <span>{t('canvas.hint')}</span>
      </div>

      <div
        className="canvas-toolbar"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="zoom-button"
          onClick={() => zoomBy(1 / 1.15)}
          title={t('canvas.zoomOut')}
          aria-label={t('canvas.zoomOutAria')}
        >
          <Icon name="minus" size={15} />
        </button>
        <button
          type="button"
          className="zoom-value"
          onClick={() => zoomBy(1 / viewport.scale)}
          title={t('canvas.resetZoom')}
        >
          {Math.round(viewport.scale * 100)}%
        </button>
        <button
          type="button"
          className="zoom-button"
          onClick={() => zoomBy(1.15)}
          title={t('canvas.zoomIn')}
          aria-label={t('canvas.zoomInAria')}
        >
          <Icon name="plus" size={15} />
        </button>
        <span className="toolbar-divider" />
        <button
          type="button"
          className="zoom-button"
          onClick={fitView}
          title={t('canvas.fitView')}
          aria-label={t('canvas.fitViewAria')}
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
              ? t('canvas.gridDots')
              : gridMode === 'lines'
                ? t('canvas.gridLines')
                : t('canvas.gridNone')
          }
          aria-label={t('canvas.gridAria')}
        >
          <Icon name={gridMode === 'dots' ? 'grip' : gridMode === 'lines' ? 'group' : 'close'} size={15} />
        </button>
      </div>

      <div className="canvas-scale-hint">
        <span>{t('canvas.scaleHintCtrl')}</span>{t('canvas.scaleHint')}
      </div>
    </div>
  )
})
