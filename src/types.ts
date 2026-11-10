export type DeviceKind =
  | 'router'
  | 'switch'
  | 'server'
  | 'pc'
  | 'laptop'
  | 'phone'
  | 'mobile'
  | 'nas'
  | 'ap'
  | 'printer'
  | 'vm'
  | 'container'
  | 'isp'
  | 'usb'
  | 'nettop'
  | 'printer3d'
  | 'other'

export type LinkKind = 'ethernet' | 'fiber' | 'wifi' | 'usb' | 'vpn'

export type VpnProtocol = 'l2tp' | 'openvpn' | 'wireguard'

export type DiskType = 'sata-ssd' | 'hdd' | 'nvme' | 'm2-sata'

export type RaidLevel =
  | 'raid0'
  | 'raid1'
  | 'raid5'
  | 'raid6'
  | 'raid10'
  | 'jbod'

export type PortType = 'ethernet' | 'sfp'

export type PrinterInterface = 'usb' | 'ethernet' | 'wifi'

export interface DiskEntry {
  id: string
  type: DiskType
  sizeGb: number
  raidId: string
}

export interface RaidGroup {
  id: string
  name: string
  level: RaidLevel
}

export interface PortGroup {
  id: string
  type: PortType
  from: number
  to: number
  note: string
}

export interface WifiNetwork {
  id: string
  ssid: string
  password: string
}

export interface DeviceNode {
  id: string
  kind: DeviceKind
  x: number
  y: number
  name: string
  model: string
  ip?: string
  mac?: string
  notes: string
  os?: string
  printerInterface?: PrinterInterface
  wifiNetworks?: WifiNetwork[]
  apDhcpEnabled?: boolean
  apDhcpNetwork?: string
  cpu?: string
  cpuCores?: number
  ramGb?: number
  disks?: DiskEntry[]
  raids?: RaidGroup[]
  ports?: PortGroup[]
}

export interface Connection {
  id: string
  from: string
  to: string
  kind: LinkKind
  label: string
  vpnProtocol?: VpnProtocol
}

export interface DeviceGroup {
  id: string
  name: string
  color: string
  nodeIds: string[]
}

export type Selection =
  | { type: 'node'; id: string }
  | { type: 'link'; id: string }
  | { type: 'group'; id: string }
  | { type: 'nodes'; ids: string[] }
  | null

export interface DiagramSnapshot {
  version: 1
  title: string
  nodes: DeviceNode[]
  connections: Connection[]
  groups: DeviceGroup[]
}
