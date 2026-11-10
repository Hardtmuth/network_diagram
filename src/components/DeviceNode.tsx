import { useEffect, useRef } from 'react'
import type { CSSProperties, PointerEvent } from 'react'
import {
  DEVICE_META,
  DISK_TYPE_META,
  HARDWARE_KINDS,
  PORT_KINDS,
  RAID_LEVEL_META,
} from '../devices'
import {
  diskTotalLabel,
  formatCapacity,
  pluralRu,
  portRangeShort,
  portsByType,
  portsTotal,
  raidMembers,
  raidUsableGb,
} from '../hardware'
import type { DeviceNode as DeviceNodeType, DiskType } from '../types'
import { DeviceIcon } from './DeviceIcon'
import { Icon } from './Icons'

interface DeviceNodeProps {
  node: DeviceNodeType
  selected: boolean
  dragging: boolean
  isConnectSource: boolean
  isConnectTarget: boolean
  onPointerDown: (event: PointerEvent<HTMLElement>, node: DeviceNodeType) => void
  onConnectStart: (event: PointerEvent<HTMLElement>, node: DeviceNodeType) => void
  onMeasure: (id: string, width: number, height: number) => void
}

export function DeviceNode({
  node,
  selected,
  dragging,
  isConnectSource,
  isConnectTarget,
  onPointerDown,
  onConnectStart,
  onMeasure,
}: DeviceNodeProps) {
  const cardRef = useRef<HTMLElement>(null)
  const meta = DEVICE_META[node.kind]

  useEffect(() => {
    const element = cardRef.current
    if (!element) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      onMeasure(node.id, Math.round(width), Math.round(height))
    })

    observer.observe(element)
    return () => observer.disconnect()
  }, [node.id, onMeasure])

  const classes = [
    'node-card',
    selected ? 'is-selected' : '',
    dragging ? 'is-dragging' : '',
    isConnectSource ? 'is-connect-source' : '',
    isConnectTarget ? 'is-connect-target' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const disks = node.disks ?? []
  const raids = node.raids ?? []
  const ports = node.ports ?? []
  const showHardware = HARDWARE_KINDS.includes(node.kind)
  const showPorts = PORT_KINDS.includes(node.kind) && ports.length > 0

  const specChips: string[] = []
  if (showHardware) {
    const cpuParts: string[] = []
    if (node.cpu) cpuParts.push(node.cpu)
    if (node.cpuCores) {
      cpuParts.push(
        `${node.cpuCores} ${pluralRu(node.cpuCores, 'ядро', 'ядра', 'ядер')}`,
      )
    }
    if (cpuParts.length > 0) specChips.push(`CPU · ${cpuParts.join(' · ')}`)
    if (node.ramGb) {
      specChips.push(`RAM · ${node.ramGb} GB`)
    }
    if (disks.length > 0) {
      specChips.push(
        `${disks.length} ${pluralRu(disks.length, 'диск', 'диска', 'дисков')} · ${diskTotalLabel(disks)}`,
      )
    }
    for (const raid of raids) {
      const members = raidMembers(disks, raid.id)
      if (members.length === 0) continue
      const usable = raidUsableGb(members, raid.level)
      specChips.push(
        `${RAID_LEVEL_META[raid.level].label} · ${members.length} ${pluralRu(
          members.length,
          'диск',
          'диска',
          'дисков',
        )}${usable > 0 ? ` · ${formatCapacity(usable)}` : ''}`,
      )
    }
  }

  const diskTypeCounts = new Map<DiskType, number>()
  for (const disk of disks) {
    diskTypeCounts.set(disk.type, (diskTypeCounts.get(disk.type) ?? 0) + 1)
  }
  const diskTypeLine = [...diskTypeCounts]
    .map(([type, count]) => `${count}× ${DISK_TYPE_META[type].short}`)
    .join(' · ')

  const portCounts = portsByType(ports)
  const totalPorts = portsTotal(ports)

  return (
    <article
      ref={cardRef}
      className={classes}
      data-node-id={node.id}
      style={
        {
          left: node.x,
          top: node.y,
          '--device-color': meta.color,
        } as CSSProperties
      }
      onPointerDown={(event) => onPointerDown(event, node)}
    >
      <header className="node-head">
        <span className="node-icon">
          <DeviceIcon kind={node.kind} size={21} />
        </span>
        <span className="node-heading">
          <span className="node-kind">{meta.label}</span>
          <span className="node-name">{node.name || meta.label}</span>
        </span>
        <span className="node-grip">
          <Icon name="grip" size={14} />
        </span>
      </header>

      <p className={`node-model ${node.model ? '' : 'is-empty'}`}>
        {node.model || 'Модель не указана'}
      </p>

      {node.os && <p className="node-model node-os">{node.os}</p>}

      {specChips.length > 0 && (
        <div className="node-specs">
          {specChips.map((chip) => (
            <span className="node-spec" key={chip}>
              {chip}
            </span>
          ))}
          {diskTypeLine && (
            <span className="node-spec is-disk-types">{diskTypeLine}</span>
          )}
        </div>
      )}

      {showPorts && (
        <div className="node-port-groups">
          <div className="node-port-summary">
            <span>{totalPorts} портов</span>
            {portCounts.ethernet > 0 && (
              <span className="node-port-type is-ethernet">
                {portCounts.ethernet} × Ethernet
              </span>
            )}
            {portCounts.sfp > 0 && (
              <span className="node-port-type is-sfp">
                {portCounts.sfp} × SFP
              </span>
            )}
          </div>
          {ports.slice(0, 3).map((port) => (
            <div className="node-port-line" key={port.id}>
              <span className="node-port-range">
                {portRangeShort(port)}
              </span>
              <span className={`node-port-kind is-${port.type}`}>
                {port.type === 'sfp' ? 'SFP' : 'ETH'}
              </span>
              <span className="node-port-note">{port.note || '—'}</span>
            </div>
          ))}
          {ports.length > 3 && (
            <span className="node-port-more">+{ports.length - 3} групп</span>
          )}
        </div>
      )}

      {(() => {
        const canShowNetwork =
          node.kind !== 'usb' &&
          !(node.kind === 'printer' && (node.printerInterface ?? 'ethernet') === 'usb')
        const showIp = canShowNetwork && Boolean(node.ip?.trim())
        const showMac = canShowNetwork && Boolean(node.mac?.trim())
        if (!showIp && !showMac) return null
        return (
          <div className="node-fields">
            {showIp && (
              <div className="node-row">
                <span className="node-row-label">IP</span>
                <code>{node.ip}</code>
              </div>
            )}
            {showMac && (
              <div className="node-row">
                <span className="node-row-label">MAC</span>
                <code>{node.mac}</code>
              </div>
            )}
          </div>
        )
      })()}

      {node.notes && <p className="node-note">{node.notes}</p>}

      <span
        className="port port--left"
        title="Потяните, чтобы соединить"
        onPointerDown={(event) => onConnectStart(event, node)}
      />
      <span
        className="port port--right"
        title="Потяните, чтобы соединить"
        onPointerDown={(event) => onConnectStart(event, node)}
      />
    </article>
  )
}
