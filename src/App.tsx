import { toJpeg } from 'html-to-image'
import { jsPDF } from 'jspdf'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ChangeEvent } from 'react'
import './App.css'
import { Canvas } from './components/Canvas'
import type { CanvasHandle } from './components/Canvas'
import { Dashboard } from './components/Dashboard'
import { Icon } from './components/Icons'
import { Inspector } from './components/Inspector'
import { Sidebar } from './components/Sidebar'
import { TableView } from './components/TableView'
import { createDemoDiagram } from './demo'
import {
  DEVICE_META,
  DISK_TYPES,
  GROUP_COLORS,
  PORT_TYPES,
  RAID_LEVELS,
} from './devices'
import {
  createDemoEntry,
  createNewDiagram,
  loadDiagramsStore,
  saveDiagramsStore,
  touchEntry,
  type DiagramEntry,
  type DiagramsStore,
} from './storage'
import type {
  Connection,
  DeviceGroup,
  DeviceKind,
  DeviceNode,
  DiagramSnapshot,
  DiskEntry,
  LinkKind,
  PortGroup,
  RaidGroup,
  Selection,
  VpnProtocol,
} from './types'

const THEME_KEY = 'homelab-theme'

type Theme = 'dark' | 'light'
type SaveState = 'saved' | 'saving'
type View = 'dashboard' | 'editor'

const LINK_KINDS: LinkKind[] = ['ethernet', 'fiber', 'wifi', 'usb', 'vpn']
const VPN_PROTOCOLS: VpnProtocol[] = ['l2tp', 'openvpn', 'wireguard']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isDeviceNode(value: unknown): value is DeviceNode {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.kind === 'string' &&
    value.kind in DEVICE_META &&
    typeof value.x === 'number' &&
    Number.isFinite(value.x) &&
    typeof value.y === 'number' &&
    Number.isFinite(value.y) &&
    typeof value.name === 'string' &&
    typeof value.model === 'string' &&
    (value.ip === undefined || typeof value.ip === 'string') &&
    (value.mac === undefined || typeof value.mac === 'string') &&
    (value.printerInterface === undefined ||
      value.printerInterface === 'usb' ||
      value.printerInterface === 'ethernet' ||
      value.printerInterface === 'wifi') &&
    typeof value.notes === 'string'
  )
}

function isConnection(value: unknown): value is Connection {
  if (!isRecord(value)) return false
  const vpnProtocol = value.vpnProtocol
  return (
    typeof value.id === 'string' &&
    typeof value.from === 'string' &&
    typeof value.to === 'string' &&
    typeof value.kind === 'string' &&
    LINK_KINDS.includes(value.kind as LinkKind) &&
    typeof value.label === 'string' &&
    (vpnProtocol === undefined ||
      (typeof vpnProtocol === 'string' &&
        VPN_PROTOCOLS.includes(vpnProtocol as VpnProtocol)))
  )
}

function isDeviceGroup(value: unknown): value is DeviceGroup {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.color === 'string' &&
    Array.isArray(value.nodeIds) &&
    value.nodeIds.every((id) => typeof id === 'string')
  )
}

function isDiskEntry(value: unknown): value is DiskEntry {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.type === 'string' &&
    DISK_TYPES.includes(value.type as DiskEntry['type']) &&
    typeof value.sizeGb === 'number' &&
    Number.isFinite(value.sizeGb) &&
    value.sizeGb >= 0 &&
    typeof value.raidId === 'string'
  )
}

function isRaidGroup(value: unknown): value is RaidGroup {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.level === 'string' &&
    RAID_LEVELS.includes(value.level as RaidGroup['level'])
  )
}

function parsePortGroup(value: unknown): PortGroup | null {
  if (!isRecord(value)) return null
  if (
    typeof value.id !== 'string' ||
    typeof value.type !== 'string' ||
    !PORT_TYPES.includes(value.type as PortGroup['type']) ||
    typeof value.from !== 'number' ||
    !Number.isFinite(value.from) ||
    typeof value.to !== 'number' ||
    !Number.isFinite(value.to)
  ) {
    return null
  }

  const first = Math.max(1, Math.round(Math.min(value.from, value.to)))
  const last = Math.min(4096, Math.round(Math.max(value.from, value.to)))
  if (last < first) return null

  return {
    id: value.id,
    type: value.type as PortGroup['type'],
    from: first,
    to: last,
    note: typeof value.note === 'string' ? value.note : '',
  }
}

function parseNode(value: unknown): DeviceNode | null {
  if (!isDeviceNode(value)) return null
  const record = value as unknown as Record<string, unknown>
  const node: DeviceNode = {
    id: value.id,
    kind: value.kind,
    x: value.x,
    y: value.y,
    name: value.name,
    model: value.model,
    notes: value.notes,
  }

  if (typeof record.os === 'string') node.os = record.os
  if (typeof value.ip === 'string') node.ip = value.ip
  if (typeof value.mac === 'string') node.mac = value.mac
  if (
    value.printerInterface === 'usb' ||
    value.printerInterface === 'ethernet' ||
    value.printerInterface === 'wifi'
  ) {
    node.printerInterface = value.printerInterface
  } else if (node.kind === 'printer') {
    node.printerInterface = 'ethernet'
  }

  if (Array.isArray(record.wifiNetworks)) {
    const wifiNetworks = record.wifiNetworks
      .filter(isRecord)
      .map((item) => ({
        id: typeof item.id === 'string' ? item.id : createId(),
        ssid: typeof item.ssid === 'string' ? item.ssid : '',
        password: typeof item.password === 'string' ? item.password : '',
      }))
      .filter((item) => item.ssid || item.password || item.id)
    if (wifiNetworks.length > 0) node.wifiNetworks = wifiNetworks
  }
  if (node.kind === 'ap' && !node.wifiNetworks) {
    node.wifiNetworks = [{ id: createId(), ssid: '', password: '' }]
  }
  if (typeof record.apDhcpEnabled === 'boolean') {
    node.apDhcpEnabled = record.apDhcpEnabled
  }
  if (typeof record.apDhcpNetwork === 'string') {
    node.apDhcpNetwork = record.apDhcpNetwork
  }
  if (typeof record.routerWifiEnabled === 'boolean') {
    node.routerWifiEnabled = record.routerWifiEnabled
  }
  if (Array.isArray(record.routerDhcpSubnets)) {
    const routerDhcpSubnets = record.routerDhcpSubnets
      .filter(isRecord)
      .map((item) => {
        const vlan =
          typeof item.vlan === 'number' && Number.isFinite(item.vlan)
            ? Math.round(item.vlan)
            : ('' as const)
        return {
          id: typeof item.id === 'string' ? item.id : createId(),
          vlan,
          subnet: typeof item.subnet === 'string' ? item.subnet : '',
          description:
            typeof item.description === 'string' ? item.description : '',
        }
      })
    if (routerDhcpSubnets.length > 0) node.routerDhcpSubnets = routerDhcpSubnets
  }
  if (
    record.ispConnectionType === 'pppoe' ||
    record.ispConnectionType === 'static' ||
    record.ispConnectionType === 'dhcp'
  ) {
    node.ispConnectionType = record.ispConnectionType
  }
  if (typeof record.containerService === 'string') {
    node.containerService = record.containerService
  }
  if (record.mobileOs === 'android' || record.mobileOs === 'ios') {
    node.mobileOs = record.mobileOs
  }

  if (typeof record.cpu === 'string' && record.cpu.trim()) {
    node.cpu = record.cpu
  }
  if (
    typeof record.cpuCores === 'number' &&
    Number.isFinite(record.cpuCores) &&
    record.cpuCores > 0
  ) {
    node.cpuCores = Math.round(record.cpuCores)
  }
  if (
    typeof record.ramGb === 'number' &&
    Number.isFinite(record.ramGb) &&
    record.ramGb > 0
  ) {
    node.ramGb = record.ramGb
  }

  const disks = Array.isArray(record.disks)
    ? record.disks.filter(isDiskEntry)
    : []
  const raids = Array.isArray(record.raids)
    ? record.raids.filter(isRaidGroup)
    : []
  const raidIds = new Set(raids.map((raid) => raid.id))
  const cleanedDisks = disks.map((disk) =>
    disk.raidId && !raidIds.has(disk.raidId)
      ? { ...disk, raidId: '' }
      : disk,
  )
  const usedRaidIds = new Set(cleanedDisks.map((disk) => disk.raidId))
  const cleanedRaids = raids.filter((raid) => usedRaidIds.has(raid.id))

  if (cleanedDisks.length > 0) node.disks = cleanedDisks
  if (cleanedRaids.length > 0) node.raids = cleanedRaids

  const ports = Array.isArray(record.ports)
    ? record.ports
        .map(parsePortGroup)
        .filter((port): port is PortGroup => Boolean(port))
    : []
  if (ports.length > 0) node.ports = ports

  return node
}

function parseDiagram(value: unknown): DiagramSnapshot | null {
  if (!isRecord(value)) return null
  if (!Array.isArray(value.nodes) || !Array.isArray(value.connections)) {
    return null
  }
  const nodes = value.nodes
    .map(parseNode)
    .filter((node): node is DeviceNode => Boolean(node))
  const nodeIds = new Set(nodes.map((node) => node.id))
  const connections = value.connections
    .filter(isConnection)
    .filter(
      (connection) =>
        nodeIds.has(connection.from) &&
        nodeIds.has(connection.to) &&
        connection.from !== connection.to,
    )

  const usedGroupMembers = new Set<string>()
  const rawGroups = Array.isArray(value.groups)
    ? value.groups.filter(isDeviceGroup)
    : []
  const groups = rawGroups
    .map((group) => {
      const memberIds = [...new Set(group.nodeIds)].filter(
        (id) => nodeIds.has(id) && !usedGroupMembers.has(id),
      )
      memberIds.forEach((id) => usedGroupMembers.add(id))
      return { ...group, nodeIds: memberIds }
    })
    .filter((group) => group.nodeIds.length > 0)

  return {
    version: 1,
    title:
      typeof value.title === 'string' && value.title.trim()
        ? value.title
        : 'My network',
    nodes,
    connections,
    groups,
  }
}

function loadTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(THEME_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // Fall through to the dark theme.
  }
  return 'dark'
}

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `node-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function safeFileName(title: string) {
  const cleaned = title
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, '-')
  return cleaned || 'homelab-diagram'
}

function App() {
  const { t, i18n } = useTranslation()
  const [store, setStore] = useState<DiagramsStore>(loadDiagramsStore)
  const [view, setView] = useState<View>('dashboard')
  const [activeId, setActiveId] = useState<string | null>(store.currentId)
  const [diagram, setDiagram] = useState<DiagramSnapshot | null>(null)
  const [selection, setSelection] = useState<Selection>(null)
  const [theme, setTheme] = useState<Theme>(loadTheme)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [toast, setToast] = useState<string | null>(null)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  const [showInspector, setShowInspector] = useState(true)
  const [readOnly, setReadOnly] = useState(false)
  const [editorView, setEditorView] = useState<'diagram' | 'table'>('diagram')
  const canvasRef = useRef<CanvasHandle>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const importTargetRef = useRef<'dashboard' | 'editor'>('dashboard')
  const exportMenuRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'light' ? '#eef2f8' : '#070b13')
    try {
      window.localStorage.setItem(THEME_KEY, theme)
    } catch {
      // Theme still applies for the current session if storage is disabled.
    }
  }, [theme])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!exportMenuOpen) return
    const handlePointerDown = (event: PointerEvent) => {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(event.target as Node)
      ) {
        setExportMenuOpen(false)
      }
    }
    window.addEventListener('pointerdown', handlePointerDown)
    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [exportMenuOpen])

  useEffect(() => {
    if (!searchOpen) return
    const handlePointerDown = (event: PointerEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false)
      }
    }
    window.addEventListener('pointerdown', handlePointerDown)
    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [searchOpen])

  const persistStore = useCallback((next: DiagramsStore) => {
    setStore(next)
    try {
      saveDiagramsStore(next)
    } catch {
      // ignore
    }
  }, [])

  const openDiagram = useCallback(
    (id: string) => {
      const entry = store.diagrams.find((item) => item.id === id)
      if (!entry) return
      setActiveId(id)
      setDiagram(entry.snapshot)
      setSelection(null)
      setSearchQuery('')
      setSearchOpen(false)
      setView('editor')
      persistStore({ ...store, currentId: id })
      requestAnimationFrame(() => canvasRef.current?.fitView())
    },
    [persistStore, store],
  )

  const closeToDashboard = useCallback(() => {
    setView('dashboard')
    setDiagram(null)
    setSelection(null)
    setSearchQuery('')
    setSearchOpen(false)
  }, [])

  const createAndOpen = useCallback(
    (entry: DiagramEntry) => {
      const next: DiagramsStore = {
        ...store,
        currentId: entry.id,
        diagrams: [entry, ...store.diagrams],
      }
      persistStore(next)
      setActiveId(entry.id)
      setDiagram(entry.snapshot)
      setSelection(null)
      setView('editor')
    },
    [persistStore, store],
  )

  const handleCreate = () => createAndOpen(createNewDiagram())
  const handleCreateDemo = () => createAndOpen(createDemoEntry())

  const handleDeleteDiagram = (id: string) => {
    const target = store.diagrams.find((d) => d.id === id)
    if (!target) return
    if (!window.confirm(t('confirm.deleteDiagram', { title: target.title }))) return
    const diagrams = store.diagrams.filter((d) => d.id !== id)
    const currentId = store.currentId === id ? null : store.currentId
    const next = { ...store, diagrams, currentId }
    persistStore(next)
    if (activeId === id) {
      setActiveId(null)
      setDiagram(null)
      setView('dashboard')
    }
    setToast(t('toast.diagramDeleted'))
  }

  const handleDuplicateDiagram = (id: string) => {
    const source = store.diagrams.find((d) => d.id === id)
    if (!source) return
    const suffix = t('dashboard.copySuffix')
    const copyTitle = `${source.title} ${suffix}`
    const copy: DiagramEntry = {
      id: createId(),
      title: copyTitle,
      updatedAt: new Date().toISOString(),
      snapshot: {
        ...JSON.parse(JSON.stringify(source.snapshot)) as DiagramSnapshot,
        title: copyTitle,
      },
    }
    persistStore({ ...store, diagrams: [copy, ...store.diagrams] })
    setToast(t('toast.diagramDuplicated'))
  }

  const handleRenameDiagram = (id: string, title: string) => {
    const diagrams = store.diagrams.map((d) =>
      d.id === id
        ? { ...d, title, snapshot: { ...d.snapshot, title } }
        : d,
    )
    persistStore({ ...store, diagrams })
    if (activeId === id && diagram) {
      setDiagram({ ...diagram, title })
    }
  }

  // Autosave current diagram into store
  useEffect(() => {
    if (view !== 'editor' || !diagram || !activeId) return
    const savingTimer = window.setTimeout(() => setSaveState('saving'), 0)
    const timer = window.setTimeout(() => {
      setStore((current) => {
        const diagrams = current.diagrams.map((entry) =>
          entry.id === activeId ? touchEntry(entry, diagram) : entry,
        )
        const next = { ...current, currentId: activeId, diagrams }
        try {
          saveDiagramsStore(next)
        } catch {
          // ignore
        }
        return next
      })
      setSaveState('saved')
    }, 450)
    return () => {
      window.clearTimeout(savingTimer)
      window.clearTimeout(timer)
    }
  }, [activeId, diagram, view])

  const addNode = useCallback((kind: DeviceKind, x: number, y: number) => {
    if (readOnly) return
    const id = createId()
    setDiagram((current) => {
      if (!current) return current
      const sameKind = current.nodes.filter((node) => node.kind === kind).length
      const meta = DEVICE_META[kind]
      const label = t(`devices.${kind}.label`, { defaultValue: meta.label })
      const node: DeviceNode = {
        id,
        kind,
        x,
        y,
        name: sameKind === 0 ? label : `${label} ${sameKind + 1}`,
        model: '',
        ...(kind === 'usb' || kind === 'ups' ? {} : { ip: '', mac: '' }),
        ...(kind === 'printer' ? { printerInterface: 'ethernet' as const } : {}),
        ...(kind === 'ap'
          ? {
              wifiNetworks: [{ id: createId(), ssid: '', password: '' }],
              apDhcpEnabled: false,
              apDhcpNetwork: '',
            }
          : {}),
        ...(kind === 'router'
          ? { routerWifiEnabled: false, routerDhcpSubnets: [], wifiNetworks: [] }
          : {}),
        ...(kind === 'isp' ? { ispConnectionType: 'pppoe' as const, ip: '' } : {}),
        ...(kind === 'container' ? { containerService: '' } : {}),
        ...(kind === 'mobile' ? { mobileOs: 'android' as const, os: 'Android' } : {}),
        notes: '',
      }
      return { ...current, nodes: [...current.nodes, node] }
    })
    setSelection({ type: 'node', id })
  }, [])

  const moveNode = useCallback((id: string, x: number, y: number) => {
    if (readOnly) return
    setDiagram((current) => {
      if (!current) return current
      const index = current.nodes.findIndex((node) => node.id === id)
      if (index === -1) return current
      const node = current.nodes[index]
      if (node.x === x && node.y === y) return current
      const nextNodes = current.nodes.slice()
      nextNodes[index] = { ...node, x, y }
      return { ...current, nodes: nextNodes }
    })
  }, [])

  const moveNodes = useCallback(
    (moves: { id: string; x: number; y: number }[]) => {
      if (readOnly) return
      setDiagram((current) => {
        if (!current) return current
        const movesById = new Map(moves.map((move) => [move.id, move]))
        let changed = false
        const nextNodes = current.nodes.map((node) => {
          const move = movesById.get(node.id)
          if (!move) return node
          if (node.x === move.x && node.y === move.y) return node
          changed = true
          return { ...node, x: move.x, y: move.y }
        })
        return changed ? { ...current, nodes: nextNodes } : current
      })
    },
    [],
  )

  const updateNode = useCallback(
    (id: string, patch: Partial<DeviceNode>) => {
      if (readOnly) return
      setDiagram((current) => {
        if (!current) return current
        return {
          ...current,
          nodes: current.nodes.map((node) =>
            node.id === id ? { ...node, ...patch, id: node.id } : node,
          ),
        }
      })
    },
    [],
  )

  const deleteNodes = useCallback((ids: string[]) => {
    if (readOnly) return
    const idSet = new Set(ids)
    setDiagram((current) => {
      if (!current) return current
      return {
        ...current,
        nodes: current.nodes.filter((node) => !idSet.has(node.id)),
        connections: current.connections.filter(
          (link) => !idSet.has(link.from) && !idSet.has(link.to),
        ),
        groups: current.groups
          .map((group) => ({
            ...group,
            nodeIds: group.nodeIds.filter((id) => !idSet.has(id)),
          }))
          .filter((group) => group.nodeIds.length > 0),
      }
    })
    setSelection(null)
  }, [])

  const deleteNode = useCallback(
    (id: string) => deleteNodes([id]),
    [deleteNodes],
  )

  const duplicateNode = useCallback(
    (id: string) => {
      if (readOnly || !diagram) return
      const source = diagram.nodes.find((node) => node.id === id)
      if (!source) return
      const newId = createId()
      const sourceGroup = diagram.groups.find((group) => group.nodeIds.includes(id))
      const copy: DeviceNode = {
        ...source,
        id: newId,
        x: source.x + 32,
        y: source.y + 32,
        name: `${source.name} ${t('dashboard.copySuffix')}`,
        disks: source.disks?.map((disk) => ({ ...disk })),
        raids: source.raids?.map((raid) => ({ ...raid })),
        ports: source.ports?.map((port) => ({ ...port })),
        wifiNetworks: source.wifiNetworks?.map((w) => ({ ...w, id: createId() })),
        routerDhcpSubnets: source.routerDhcpSubnets?.map((s) => ({ ...s, id: createId() })),
      }
      setDiagram((current) => {
        if (!current) return current
        return {
          ...current,
          nodes: [...current.nodes, copy],
          groups: sourceGroup
            ? current.groups.map((group) =>
                group.id === sourceGroup.id
                  ? { ...group, nodeIds: [...group.nodeIds, newId] }
                  : group,
              )
            : current.groups,
        }
      })
      setSelection({ type: 'node', id: newId })
    },
    [diagram],
  )

  const addConnection = useCallback(
    (from: string, to: string) => {
      if (readOnly || from === to || !diagram) return
      const exists = diagram.connections.some(
        (link) =>
          (link.from === from && link.to === to) ||
          (link.from === to && link.to === from),
      )
      if (exists) return
      const id = createId()
      setDiagram((current) => {
        if (!current) return current
        return {
          ...current,
          connections: [
            ...current.connections,
            { id, from, to, kind: 'ethernet', label: '' },
          ],
        }
      })
      setSelection({ type: 'link', id })
    },
    [diagram],
  )

  const updateLink = useCallback(
    (id: string, patch: Partial<Connection>) => {
      if (readOnly) return
      setDiagram((current) => {
        if (!current) return current
        return {
          ...current,
          connections: current.connections.map((link) =>
            link.id === id ? { ...link, ...patch, id: link.id } : link,
          ),
        }
      })
    },
    [],
  )

  const deleteLink = useCallback((id: string) => {
    if (readOnly) return
    setDiagram((current) => {
      if (!current) return current
      return {
        ...current,
        connections: current.connections.filter((link) => link.id !== id),
      }
    })
    setSelection(null)
  }, [])

  const createGroup = useCallback((ids: string[]) => {
    if (readOnly) return
    const uniqueIds = [...new Set(ids)]
    if (uniqueIds.length < 2) return
    const id = createId()
    setDiagram((current) => {
      if (!current) return current
      const membership = new Set(uniqueIds)
      const cleanedGroups = current.groups
        .map((group) => ({
          ...group,
          nodeIds: group.nodeIds.filter((nodeId) => !membership.has(nodeId)),
        }))
        .filter((group) => group.nodeIds.length > 0)
      const group: DeviceGroup = {
        id,
        name: t('defaults.groupName', { index: current.groups.length + 1 }),
        color: GROUP_COLORS[current.groups.length % GROUP_COLORS.length],
        nodeIds: uniqueIds,
      }
      return { ...current, groups: [...cleanedGroups, group] }
    })
    setSelection({ type: 'group', id })
    setToast(t('toast.grouped'))
  }, [])

  const updateGroup = useCallback(
    (id: string, patch: Partial<DeviceGroup>) => {
      if (readOnly) return
      setDiagram((current) => {
        if (!current) return current
        return {
          ...current,
          groups: current.groups.map((group) =>
            group.id === id ? { ...group, ...patch, id: group.id } : group,
          ),
        }
      })
    },
    [],
  )

  const ungroup = useCallback((id: string) => {
    if (readOnly) return
    setDiagram((current) => {
      if (!current) return current
      return {
        ...current,
        groups: current.groups.filter((group) => group.id !== id),
      }
    })
    setSelection(null)
    setToast(t('toast.ungrouped'))
  }, [])

  const assignNodeToGroup = useCallback(
    (nodeId: string, groupId: string | null) => {
      if (readOnly) return
      setDiagram((current) => {
        if (!current) return current
        return {
          ...current,
          groups: current.groups
            .map((group) => ({
              ...group,
              nodeIds: group.nodeIds.filter((id) => id !== nodeId),
            }))
            .map((group) =>
              group.id === groupId
                ? { ...group, nodeIds: [...group.nodeIds, nodeId] }
                : group,
            )
            .filter((group) => group.nodeIds.length > 0),
        }
      })
    },
    [],
  )

  const selectNodes = useCallback(
    (ids: string[]) => {
      if (!diagram) return
      const existing = ids.filter((id) => diagram.nodes.some((node) => node.id === id))
      if (existing.length === 0) {
        setSelection(null)
      } else if (existing.length === 1) {
        setSelection({ type: 'node', id: existing[0] })
      } else {
        setSelection({ type: 'nodes', ids: existing })
      }
    },
    [diagram],
  )

  const deleteSelection = useCallback(() => {
    if (readOnly || !selection) return
    if (selection.type === 'node') {
      deleteNodes([selection.id])
      return
    }
    if (selection.type === 'link') {
      deleteLink(selection.id)
      return
    }
    if (selection.type === 'group') {
      ungroup(selection.id)
      return
    }
    deleteNodes(selection.ids)
  }, [deleteLink, deleteNodes, selection, ungroup])

  const clearCanvas = () => {
    if (readOnly) return
    if (!window.confirm(t('confirm.clearCanvas'))) {
      return
    }
    setDiagram((current) => {
      if (!current) return current
      return { ...current, nodes: [], connections: [], groups: [] }
    })
    setSelection(null)
    setToast(t('toast.canvasCleared'))
  }

  const loadExample = () => {
    if (readOnly || !diagram) return
    const hasContent =
      diagram.nodes.length > 0 || diagram.connections.length > 0 || diagram.groups.length > 0
    if (
      hasContent &&
      !window.confirm(t('confirm.replaceWithExample'))
    ) {
      return
    }
    setDiagram(createDemoDiagram())
    setSelection(null)
    setToast(t('toast.exampleLoaded'))
    requestAnimationFrame(() => canvasRef.current?.fitView())
  }

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const exportJson = () => {
    if (!diagram) return
    const payload = JSON.stringify(
      { ...diagram, exportedAt: new Date().toISOString() },
      null,
      2,
    )
    const blob = new Blob([payload], { type: 'application/json' })
    downloadBlob(blob, `${safeFileName(diagram.title)}.json`)
    setToast(t('toast.jsonSaved'))
  }

  const captureDiagramImage = async () => {
    const element = canvasRef.current?.getElement()
    if (!element) throw new Error('Canvas not available')
    setSelection(null)
    canvasRef.current?.fitView()
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
    await new Promise((resolve) => setTimeout(resolve, 120))
    const dataUrl = await toJpeg(element, {
      quality: 0.95,
      pixelRatio: 2,
      cacheBust: true,
      filter: (node) => {
        if (!(node instanceof HTMLElement)) return true
        return !(
          node.classList.contains('canvas-toolbar') ||
          node.classList.contains('canvas-hint') ||
          node.classList.contains('canvas-scale-hint') ||
          node.classList.contains('drop-overlay') ||
          node.classList.contains('canvas-empty')
        )
      },
    })
    return dataUrl
  }

  const exportImage = async (format: 'jpeg' | 'pdf') => {
    if (!diagram) return
    try {
      setToast(t('toast.exportPreparing'))
      const dataUrl = await captureDiagramImage()
      const baseName = safeFileName(diagram.title)
      if (format === 'jpeg') {
        const response = await fetch(dataUrl)
        const blob = await response.blob()
        downloadBlob(blob, `${baseName}.jpg`)
        setToast(t('toast.jpegSaved'))
      } else {
        const image = new Image()
        image.src = dataUrl
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve()
          image.onerror = () => reject(new Error('Image load failed'))
        })
        const orientation = image.width >= image.height ? 'landscape' : 'portrait'
        const pdf = new jsPDF({
          orientation,
          unit: 'px',
          format: [image.width, image.height],
        })
        pdf.addImage(dataUrl, 'JPEG', 0, 0, image.width, image.height)
        pdf.save(`${baseName}.pdf`)
        setToast(t('toast.pdfSaved'))
      }
    } catch {
      setToast(t('toast.exportFailed'))
    }
  }

  const handleExport = (format: 'json' | 'jpeg' | 'pdf') => {
    setExportMenuOpen(false)
    if (format === 'json') {
      exportJson()
      return
    }
    void exportImage(format)
  }

  const openImport = (target: 'dashboard' | 'editor') => {
    if (readOnly && target === 'editor') return
    importTargetRef.current = target
    fileInputRef.current?.click()
  }

  const importDiagram = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const parsed = parseDiagram(JSON.parse(text) as unknown)
      if (!parsed) throw new Error('Invalid diagram')
      if (view === 'editor' && activeId && importTargetRef.current === 'editor') {
        if (readOnly) {
          setToast(t('toast.importFailed'))
          return
        }
        setDiagram(parsed)
        setSelection(null)
        setToast(t('toast.importLoaded'))
        requestAnimationFrame(() => canvasRef.current?.fitView())
      } else {
        const entry: DiagramEntry = {
          id: createId(),
          title: parsed.title || t('defaults.importedDiagram'),
          updatedAt: new Date().toISOString(),
          snapshot: parsed,
        }
        createAndOpen(entry)
        setToast(t('toast.imported'))
      }
    } catch {
      setToast(t('toast.importFailed'))
    } finally {
      event.target.value = ''
    }
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      if (
        target instanceof HTMLElement &&
        target.closest('input, textarea, select, [contenteditable="true"]')
      ) {
        if (event.key === 'Escape') target.blur()
        return
      }

      if (view !== 'editor') return

      if (
        (event.key === 'Delete' || event.key === 'Backspace') &&
        selection
      ) {
        event.preventDefault()
        deleteSelection()
        return
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
        if (selection?.type === 'node') {
          event.preventDefault()
          duplicateNode(selection.id)
        }
        return
      }

      if (event.key === 'Escape') {
        setSelection(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [deleteSelection, duplicateNode, readOnly, selection, view])

  const nodes = diagram?.nodes ?? []
  const connections = diagram?.connections ?? []
  const groups = diagram?.groups ?? []
  const title = diagram?.title ?? ''

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const searchResults = normalizedQuery
    ? nodes.filter((node) => {
        const name = (node.name || '').toLowerCase()
        const ip = (node.ip || '').toLowerCase()
        const mac = (node.mac || '').toLowerCase()
        return (
          name.includes(normalizedQuery) ||
          ip.includes(normalizedQuery) ||
          mac.includes(normalizedQuery)
        )
      })
    : []

  const focusNode = (id: string) => {
    selectNodes([id])
    setSearchOpen(false)
    setSearchQuery('')
    requestAnimationFrame(() => canvasRef.current?.centerOnNode(id))
  }

  const selectedNode =
    selection?.type === 'node'
      ? nodes.find((node) => node.id === selection.id)
      : undefined
  const selectedLink =
    selection?.type === 'link'
      ? connections.find((link) => link.id === selection.id)
      : undefined
  const selectedGroup =
    selection?.type === 'group'
      ? groups.find((group) => group.id === selection.id)
      : undefined
  const selectedGroupNodes = selectedGroup
    ? nodes.filter((node) => selectedGroup.nodeIds.includes(node.id))
    : []
  const selectedNodes =
    selection?.type === 'nodes'
      ? nodes.filter((node) => selection.ids.includes(node.id))
      : []
  const nodeGroup = selectedNode
    ? groups.find((group) => group.nodeIds.includes(selectedNode.id))
    : undefined
  const linkFrom = selectedLink
    ? nodes.find((node) => node.id === selectedLink.from)
    : undefined
  const linkTo = selectedLink
    ? nodes.find((node) => node.id === selectedLink.to)
    : undefined

  return (
    <div className="app">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={importDiagram}
      />

      {view === 'dashboard' ? (
        <Dashboard
          diagrams={store.diagrams}
          onOpen={openDiagram}
          onCreate={handleCreate}
          onCreateDemo={handleCreateDemo}
          onDelete={handleDeleteDiagram}
          onDuplicate={handleDuplicateDiagram}
          onRename={handleRenameDiagram}
          onImport={() => openImport('dashboard')}
        />
      ) : (
        <>
          <header className="topbar">
            <div className="brand">
              <button
                type="button"
                className="brand-mark as-button"
                onClick={closeToDashboard}
                title={t('topbar.toDiagrams')}
                aria-label={t('topbar.toDiagrams')}
              >
                <Icon name="topology" size={20} />
              </button>
              <span className="brand-text">
                <span className="brand-name">Homelab Map</span>
                <button
                  type="button"
                  className="brand-sub-link"
                  onClick={closeToDashboard}
                >
                  {t('brand.cabinet')}
                </button>
              </span>
            </div>

            <div className="title-wrap">
              <input
                className="diagram-title"
                value={title}
                aria-label={t('topbar.diagramName')}
                spellCheck={false}
                onChange={(event) =>
                  setDiagram((current) =>
                    current ? { ...current, title: event.target.value } : current,
                  )
                }
              />
            </div>

            <div className="diagram-search" ref={searchRef}>
              <input
                className="diagram-search-input"
                value={searchQuery}
                placeholder={t('topbar.searchPlaceholder')}
                aria-label={t('topbar.searchAria')}
                spellCheck={false}
                onChange={(event) => {
                  setSearchQuery(event.target.value)
                  setSearchOpen(true)
                }}
                onFocus={() => setSearchOpen(true)}
              />
              {searchOpen && normalizedQuery && (
                <div className="diagram-search-results" role="listbox">
                  {searchResults.length === 0 ? (
                    <div className="diagram-search-empty">{t('topbar.nothingFound')}</div>
                  ) : (
                    searchResults.map((node) => (
                      <button
                        key={node.id}
                        type="button"
                        className="diagram-search-item"
                        onClick={() => focusNode(node.id)}
                      >
                        <span className="diagram-search-name">
                          {node.name || DEVICE_META[node.kind].label}
                        </span>
                        <span className="diagram-search-meta">
                          {node.ip || node.mac
                            ? [node.ip, node.mac].filter(Boolean).join(' · ')
                            : DEVICE_META[node.kind].label}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="topbar-actions">
              <button
                type="button"
                className={`action-button ${showSidebar ? 'is-active' : ''}`}
                onClick={() => setShowSidebar((value) => !value)}
                title={showSidebar ? t('topbar.hideSidebar') : t('topbar.showSidebar')}
                aria-label={showSidebar ? t('topbar.hideSidebar') : t('topbar.showSidebar')}
              >
                <Icon name="panel-left" size={15} />
                <span className="action-label">{t('common.devices')}</span>
              </button>

              <button
                type="button"
                className={`action-button ${showInspector ? 'is-active' : ''}`}
                onClick={() => setShowInspector((value) => !value)}
                title={showInspector ? t('topbar.hideInspector') : t('topbar.showInspector')}
                aria-label={showInspector ? t('topbar.hideInspector') : t('topbar.showInspector')}
              >
                <Icon name="panel-right" size={15} />
                <span className="action-label">{t('common.inspector')}</span>
              </button>

              <button
                type="button"
                className={`action-button ${editorView === 'table' ? 'is-active' : ''}`}
                onClick={() =>
                  setEditorView((value) => (value === 'diagram' ? 'table' : 'diagram'))
                }
                title={editorView === 'diagram' ? t('topbar.tableView') : t('topbar.diagramView')}
                aria-label={editorView === 'diagram' ? t('topbar.tableView') : t('topbar.diagramView')}
              >
                <Icon name={editorView === 'diagram' ? 'group' : 'topology'} size={15} />
                <span className="action-label">
                  {editorView === 'diagram' ? t('topbar.tableView') : t('topbar.diagramView')}
                </span>
              </button>

              <button
                type="button"
                className={`action-button ${readOnly ? 'is-active' : ''}`}
                onClick={() => setReadOnly((value) => !value)}
                title={readOnly ? t('topbar.editMode') : t('topbar.viewMode')}
                aria-label={readOnly ? t('topbar.editMode') : t('topbar.viewMode')}
              >
                <span className="action-label">
                  {readOnly ? t('topbar.editMode') : t('topbar.viewMode')}
                </span>
              </button>

              <button
                type="button"
                className="action-button"
                onClick={() => i18n.changeLanguage(i18n.resolvedLanguage === 'ru' ? 'en' : 'ru')}
                title={t('topbar.language')}
                aria-label={t('topbar.language')}
              >
                <span className="action-label">{i18n.resolvedLanguage === 'ru' ? 'EN' : 'RU'}</span>
              </button>

              <button
                type="button"
                className="action-button is-theme"
                onClick={() =>
                  setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
                }
                title={theme === 'dark' ? t('topbar.enableLight') : t('topbar.enableDark')}
                aria-label={theme === 'dark' ? t('topbar.enableLight') : t('topbar.enableDark')}
              >
                <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={15} />
                <span className="action-label">
                  {theme === 'dark' ? t('topbar.lightTheme') : t('topbar.darkTheme')}
                </span>
              </button>

              <span className={`save-status is-${saveState}`}>
                <span className="save-dot" />
                <span className="save-text">
                  {saveState === 'saving' ? t('topbar.saving') : t('topbar.saved')}
                </span>
              </span>

              <button
                type="button"
                className="action-button"
                onClick={loadExample}
                title={t('topbar.loadExample')}
                disabled={readOnly}
              >
                <Icon name="sparkles" size={15} />
                <span className="action-label">{t('common.example')}</span>
              </button>

              <button
                type="button"
                className="action-button"
                onClick={() => openImport('editor')}
                title={t('topbar.importJson')}
                disabled={readOnly}
              >
                <Icon name="upload" size={15} />
                <span className="action-label">{t('common.import')}</span>
              </button>

              <div className="export-menu-wrap" ref={exportMenuRef}>
                <button
                  type="button"
                  className="action-button"
                  onClick={() => setExportMenuOpen((open) => !open)}
                  title={t('topbar.exportDiagram')}
                  aria-expanded={exportMenuOpen}
                  aria-haspopup="menu"
                >
                  <Icon name="download" size={15} />
                  <span className="action-label">{t('common.export')}</span>
                </button>
                {exportMenuOpen && (
                  <div className="export-menu" role="menu">
                    <button
                      type="button"
                      className="export-menu-item"
                      role="menuitem"
                      onClick={() => handleExport('json')}
                    >
                      JSON
                    </button>
                    <button
                      type="button"
                      className="export-menu-item"
                      role="menuitem"
                      onClick={() => handleExport('jpeg')}
                    >
                      JPEG
                    </button>
                    <button
                      type="button"
                      className="export-menu-item"
                      role="menuitem"
                      onClick={() => handleExport('pdf')}
                    >
                      PDF
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                className="action-button is-danger"
                onClick={clearCanvas}
                title={t('topbar.clearCanvas')}
                disabled={readOnly}
              >
                <Icon name="trash" size={15} />
                <span className="action-label">{t('common.clear')}</span>
              </button>
            </div>
          </header>

          <main className="workspace">
            {showSidebar && editorView === 'diagram' && (
              <Sidebar
                onQuickAdd={(kind) => canvasRef.current?.addAtCenter(kind)}
                onHide={() => setShowSidebar(false)}
                readOnly={readOnly}
              />
            )}
            {editorView === 'diagram' ? (
              <Canvas
                ref={canvasRef}
                nodes={nodes}
                connections={connections}
                groups={groups}
                selection={selection}
                onSelect={setSelection}
                onAddNode={addNode}
                onMoveNode={moveNode}
                onMoveNodes={moveNodes}
                onConnect={addConnection}
                readOnly={readOnly}
              />
            ) : (
              <TableView
                nodes={nodes}
                connections={connections}
                groups={groups}
                selection={selection}
                searchQuery={searchQuery}
                readOnly={readOnly}
                onSelect={setSelection}
                onDeleteNode={deleteNode}
                onDeleteLink={deleteLink}
                onUngroup={ungroup}
                onShowOnDiagram={(sel) => {
                  if (!sel) return
                  setSelection(sel)
                  setEditorView('diagram')
                  requestAnimationFrame(() => {
                    if (sel.type === 'node') {
                      canvasRef.current?.centerOnNode(sel.id)
                    } else if (sel.type === 'nodes') {
                      const id = sel.ids[0]
                      if (id) canvasRef.current?.centerOnNode(id)
                    } else {
                      canvasRef.current?.fitView()
                    }
                  })
                }}
              />
            )}
            {showInspector && (
              <Inspector
                node={selectedNode}
                nodeGroup={nodeGroup}
                link={selectedLink}
                linkFrom={linkFrom}
                linkTo={linkTo}
                group={selectedGroup}
                groupNodes={selectedGroupNodes}
                selectedNodes={selectedNodes}
                groups={groups}
                nodeCount={nodes.length}
                linkCount={connections.length}
                groupCount={groups.length}
                onUpdateNode={updateNode}
                onDeleteNode={deleteNode}
                onDuplicateNode={duplicateNode}
                onUpdateLink={updateLink}
                onDeleteLink={deleteLink}
                onUpdateGroup={updateGroup}
                onAssignGroup={assignNodeToGroup}
                onCreateGroup={createGroup}
                onSelectNodes={selectNodes}
                onDeleteNodes={deleteNodes}
                onUngroup={ungroup}
                onClose={() => setSelection(null)}
                onHidePanel={() => setShowInspector(false)}
                readOnly={readOnly}
              />
            )}
          </main>
        </>
      )}

      {toast && (
        <div className="toast" role="status">
          <span className="toast-dot" />
          {toast}
        </div>
      )}
    </div>
  )
}

export default App
