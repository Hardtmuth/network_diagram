import type {
  DiskEntry,
  DiskType,
  PortGroup,
  PortType,
  RaidGroup,
  RaidLevel,
} from './types'

export function pluralRu(
  count: number,
  one: string,
  few: string,
  many: string,
) {
  const mod10 = Math.abs(count) % 10
  const mod100 = Math.abs(count) % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

export function formatCapacity(sizeGb: number) {
  if (!Number.isFinite(sizeGb) || sizeGb <= 0) return '—'
  if (sizeGb >= 1000) {
    const tb = sizeGb / 1000
    return `${Number.isInteger(tb) ? tb : tb.toFixed(1)} TB`
  }
  return `${Math.round(sizeGb)} GB`
}

export function diskTotalGb(disks: DiskEntry[] = []) {
  return disks.reduce((sum, disk) => sum + (disk.sizeGb || 0), 0)
}

export function diskTotalLabel(disks: DiskEntry[] = []) {
  if (disks.length === 0) return ''
  return `${formatCapacity(diskTotalGb(disks))}`
}

export function raidMembers(disks: DiskEntry[] = [], raidId: string) {
  return disks.filter((disk) => disk.raidId === raidId)
}

export function raidUsableGb(disks: DiskEntry[], level: RaidLevel) {
  if (disks.length === 0) return 0
  const total = diskTotalGb(disks)
  const min = Math.min(...disks.map((disk) => disk.sizeGb || 0))

  switch (level) {
    case 'raid0':
    case 'jbod':
      return total
    case 'raid1':
      return min * Math.floor(disks.length / 2)
    case 'raid5':
      return disks.length >= 3 ? min * (disks.length - 1) : 0
    case 'raid6':
      return disks.length >= 4 ? min * (disks.length - 2) : 0
    case 'raid10':
      return min * Math.floor(disks.length / 2)
    default:
      return total
  }
}

export function raidLabel(raids: RaidGroup[] = [], raidId: string) {
  const raid = raids.find((item) => item.id === raidId)
  return raid ? raid.name || raid.level.toUpperCase() : ''
}

export function portCount(port: PortGroup) {
  if (!Number.isFinite(port.from) || !Number.isFinite(port.to)) return 0
  return Math.max(0, port.to - port.from + 1)
}

export function portsTotal(ports: PortGroup[] = []) {
  return ports.reduce((sum, port) => sum + portCount(port), 0)
}

export function portsByType(ports: PortGroup[] = []) {
  const counts: Record<PortType, number> = { ethernet: 0, sfp: 0 }
  for (const port of ports) {
    counts[port.type] += portCount(port)
  }
  return counts
}

export function portRangeLabel(port: PortGroup) {
  return port.from === port.to
    ? `Порт ${port.from}`
    : `Порты ${port.from}–${port.to}`
}

export function portRangeShort(port: PortGroup) {
  return port.from === port.to ? `${port.from}` : `${port.from}–${port.to}`
}

export function diskTypeShort(type: DiskType) {
  return type === 'sata-ssd'
    ? 'SATA SSD'
    : type === 'hdd'
      ? 'HDD'
      : type === 'nvme'
        ? 'NVMe'
        : 'M.2 SSD'
}

export function createRowId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `row-${Date.now()}-${Math.random().toString(16).slice(2)}`
}
