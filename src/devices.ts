import type {
  DeviceKind,
  DiskType,
  LinkKind,
  PortType,
  RaidLevel,
  VpnProtocol,
} from './types'

export type DeviceCategory = 'Сеть' | 'Серверы и NAS' | 'Клиенты'

export interface DeviceMeta {
  kind: DeviceKind
  label: string
  category: DeviceCategory
  color: string
  hint: string
}

export const DEVICE_META: Record<DeviceKind, DeviceMeta> = {
  router: {
    kind: 'router',
    label: 'Роутер',
    category: 'Сеть',
    color: '#38bdf8',
    hint: 'Маршрутизация и NAT',
  },
  switch: {
    kind: 'switch',
    label: 'Коммутатор',
    category: 'Сеть',
    color: '#a78bfa',
    hint: 'Локальная сеть',
  },
  ap: {
    kind: 'ap',
    label: 'Точка доступа',
    category: 'Сеть',
    color: '#34d399',
    hint: 'Беспроводная сеть',
  },
  server: {
    kind: 'server',
    label: 'Сервер',
    category: 'Серверы и NAS',
    color: '#2dd4bf',
    hint: 'Сервисы и виртуализация',
  },
  nas: {
    kind: 'nas',
    label: 'NAS',
    category: 'Серверы и NAS',
    color: '#fbbf24',
    hint: 'Сетевое хранилище',
  },
  vm: {
    kind: 'vm',
    label: 'Виртуальная машина',
    category: 'Серверы и NAS',
    color: '#818cf8',
    hint: 'Виртуальный сервер',
  },
  container: {
    kind: 'container',
    label: 'Контейнер',
    category: 'Серверы и NAS',
    color: '#22d3ee',
    hint: 'Docker / LXC',
  },
  usb: {
    kind: 'usb',
    label: 'USB накопитель',
    category: 'Серверы и NAS',
    color: '#eab308',
    hint: 'Съёмное хранилище',
  },
  isp: {
    kind: 'isp',
    label: 'Интернет-провайдер',
    category: 'Сеть',
    color: '#fb923c',
    hint: 'Внешний канал',
  },
  pc: {
    kind: 'pc',
    label: 'ПК',
    category: 'Клиенты',
    color: '#f472b6',
    hint: 'Стационарный клиент',
  },
  laptop: {
    kind: 'laptop',
    label: 'Ноутбук',
    category: 'Клиенты',
    color: '#fb7185',
    hint: 'Мобильный клиент',
  },
  phone: {
    kind: 'phone',
    label: 'IP-телефон',
    category: 'Клиенты',
    color: '#60a5fa',
    hint: 'VoIP-телефония',
  },
  mobile: {
    kind: 'mobile',
    label: 'Смартфон',
    category: 'Клиенты',
    color: '#e879f9',
    hint: 'Мобильное устройство',
  },
  printer: {
    kind: 'printer',
    label: 'Принтер',
    category: 'Клиенты',
    color: '#94a3b8',
    hint: 'Периферия',
  },
  nettop: {
    kind: 'nettop',
    label: 'Неттоп',
    category: 'Клиенты',
    color: '#f9a8d4',
    hint: 'Мини ПК',
  },
  sbc: {
    kind: 'sbc',
    label: 'Одноплатник',
    category: 'Клиенты',
    color: '#4ade80',
    hint: 'Raspberry Pi / Banana Pi',
  },
  ups: {
    kind: 'ups',
    label: 'ИБП',
    category: 'Сеть',
    color: '#f59e0b',
    hint: 'Источник бесперебойного питания',
  },
  printer3d: {
    kind: 'printer3d',
    label: '3D-принтер',
    category: 'Клиенты',
    color: '#c084fc',
    hint: 'Аддитивная печать',
  },
  other: {
    kind: 'other',
    label: 'Другое',
    category: 'Клиенты',
    color: '#a3a3a3',
    hint: 'Прочее устройство',
  },
}

export const DEVICE_GROUPS: { label: DeviceCategory; kinds: DeviceKind[] }[] = [
  { label: 'Сеть', kinds: ['router', 'switch', 'ap', 'isp', 'ups'] },
  {
    label: 'Серверы и NAS',
    kinds: ['server', 'nas', 'vm', 'container', 'usb'],
  },
  {
    label: 'Клиенты',
    kinds: ['pc', 'laptop', 'nettop', 'sbc', 'phone', 'mobile', 'printer', 'printer3d', 'other'],
  },
]

export const DEVICE_ORDER: DeviceKind[] = DEVICE_GROUPS.flatMap(
  (group) => group.kinds,
)

export interface LinkMeta {
  label: string
  color: string
  dash?: string
}

export const LINK_META: Record<LinkKind, LinkMeta> = {
  ethernet: { label: 'Ethernet', color: '#38bdf8' },
  fiber: { label: 'Оптика / DAC', color: '#c084fc' },
  wifi: { label: 'Wi-Fi', color: '#34d399', dash: '7 6' },
  usb: { label: 'USB / прочее', color: '#fbbf24', dash: '2 5' },
  vpn: { label: 'VPN-туннель', color: '#f472b6', dash: '4 6' },
}

export const LINK_KINDS: LinkKind[] = [
  'ethernet',
  'fiber',
  'wifi',
  'usb',
  'vpn',
]

export const VPN_PROTOCOL_META: Record<
  VpnProtocol,
  { label: string; description: string }
> = {
  l2tp: { label: 'L2TP/IPsec', description: 'Классический VPN-туннель' },
  openvpn: { label: 'OpenVPN', description: 'Гибкий туннель на TLS' },
  wireguard: { label: 'WireGuard', description: 'Быстрый современный VPN' },
}

export const VPN_PROTOCOLS: VpnProtocol[] = ['l2tp', 'openvpn', 'wireguard']

export const GROUP_COLORS = [
  '#38bdf8',
  '#a78bfa',
  '#34d399',
  '#fbbf24',
  '#fb7185',
  '#f472b6',
]

export const HARDWARE_KINDS: DeviceKind[] = [
  'server',
  'vm',
  'nas',
  'pc',
  'laptop',
  'nettop',
  'sbc',
]

export const OS_KINDS: DeviceKind[] = [
  'pc',
  'laptop',
  'nettop',
  'sbc',
  'vm',
  'server',
]

export const PORT_KINDS: DeviceKind[] = [
  'router',
  'switch',
  'server',
  'vm',
  'nas',
]

export const DISK_TYPE_META: Record<
  DiskType,
  { label: string; short: string }
> = {
  'sata-ssd': { label: 'SATA SSD', short: 'SATA SSD' },
  hdd: { label: 'HDD', short: 'HDD' },
  nvme: { label: 'M.2 NVMe', short: 'NVMe' },
  'm2-sata': { label: 'M.2 SATA SSD', short: 'M.2 SSD' },
}

export const DISK_TYPES: DiskType[] = ['sata-ssd', 'hdd', 'nvme', 'm2-sata']

export const RAID_LEVEL_META: Record<
  RaidLevel,
  { label: string; hint: string }
> = {
  raid0: { label: 'RAID 0', hint: 'Скорость без защиты' },
  raid1: { label: 'RAID 1', hint: 'Зеркало' },
  raid5: { label: 'RAID 5', hint: 'Чётность, минус 1 диск' },
  raid6: { label: 'RAID 6', hint: 'Двойная чётность, минус 2 диска' },
  raid10: { label: 'RAID 10', hint: 'Зеркало и скорость' },
  jbod: { label: 'JBOD', hint: 'Объединение без RAID' },
}

export const RAID_LEVELS: RaidLevel[] = [
  'raid0',
  'raid1',
  'raid5',
  'raid6',
  'raid10',
  'jbod',
]

export const PORT_TYPE_META: Record<
  PortType,
  { label: string; short: string }
> = {
  ethernet: { label: 'Ethernet (RJ45)', short: 'Ethernet' },
  sfp: { label: 'SFP / SFP+', short: 'SFP' },
}

export const PORT_TYPES: PortType[] = ['ethernet', 'sfp']

export const ISP_CONNECTION_TYPES = ['pppoe', 'static', 'dhcp'] as const

export const DND_MIME = 'application/x-homelab-device'
export const NODE_WIDTH = 236
export const NODE_HEIGHT_FALLBACK = 142
