import { useEffect, useRef } from 'react'
import type { CSSProperties, PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
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
  portRangeShort,
  portsByType,
  portsTotal,
  raidMembers,
  raidUsableGb,
} from '../hardware'
import type { DeviceNode as DeviceNodeType, DiskType } from '../types'
import { DeviceIcon } from './DeviceIcon'
import { Icon } from './Icons'
import { OsIcon } from '../os'

interface DeviceNodeProps {
  node: DeviceNodeType
  selected: boolean
  dragging: boolean
  isConnectSource: boolean
  isConnectTarget: boolean
  pingStatus?: 'up' | 'down' | 'unknown'
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
  pingStatus,
  onPointerDown,
  onConnectStart,
  onMeasure,
}: DeviceNodeProps) {
  const { t, i18n } = useTranslation()
  const cardRef = useRef<HTMLElement>(null)
  const meta = DEVICE_META[node.kind]
  const label = t(`devices.${node.kind}.label`, { defaultValue: meta.label })

  useEffect(() => {
    const element = cardRef.current
    if (!element) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const borderBox = entry.borderBoxSize?.[0]
      const width = borderBox ? borderBox.inlineSize : element.offsetWidth
      const height = borderBox ? borderBox.blockSize : element.offsetHeight
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

  const coresLabel = (count: number) => {
    if (i18n?.resolvedLanguage === 'en') return count === 1 ? t('node.core_one') : t('node.core_many')
    const mod10 = count % 10
    const mod100 = count % 100
    if (mod10 === 1 && mod100 !== 11) return t('node.core_one')
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return t('node.core_few')
    return t('node.core_many')
  }
  const disksLabel = (count: number) => {
    if (i18n?.resolvedLanguage === 'en') return count === 1 ? t('node.disk_one') : t('node.disk_many')
    const mod10 = count % 10
    const mod100 = count % 100
    if (mod10 === 1 && mod100 !== 11) return t('node.disk_one')
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return t('node.disk_few')
    return t('node.disk_many')
  }

  const specChips: string[] = []
  if (showHardware) {
    const cpuParts: string[] = []
    if (node.cpu) cpuParts.push(node.cpu)
    if (node.cpuCores) {
      cpuParts.push(`${node.cpuCores} ${coresLabel(node.cpuCores)}`)
    }
    if (cpuParts.length > 0) specChips.push(`CPU · ${cpuParts.join(' · ')}`)
    if (node.ramGb) {
      specChips.push(`RAM · ${node.ramGb} GB`)
    }
    if (disks.length > 0) {
      specChips.push(
        `${disks.length} ${disksLabel(disks.length)} · ${diskTotalLabel(disks)}`,
      )
    }
    for (const raid of raids) {
      const members = raidMembers(disks, raid.id)
      if (members.length === 0) continue
      const usable = raidUsableGb(members, raid.level)
      const raidLabel = t(`raid.${raid.level}.label`, {
        defaultValue: RAID_LEVEL_META[raid.level].label,
      })
      specChips.push(
        `${raidLabel} · ${members.length} ${disksLabel(members.length)}${usable > 0 ? ` · ${formatCapacity(usable)}` : ''}`,
      )
    }
  }

  const diskTypeCounts = new Map<DiskType, number>()
  for (const disk of disks) {
    diskTypeCounts.set(disk.type, (diskTypeCounts.get(disk.type) ?? 0) + 1)
  }
  const diskTypeLine = [...diskTypeCounts]
    .map(([type, count]) =>
      `${count}× ${t(`diskTypes.${type}.short`, { defaultValue: DISK_TYPE_META[type].short })}`,
    )
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
          <span className="node-kind">{label}</span>
          <span className="node-name">{node.name || label}</span>
        </span>
        {node.pingEnabled && (
          <span
            className={`node-ping-indicator is-${pingStatus ?? 'unknown'}`}
            title={t(`node.ping.${pingStatus ?? 'unknown'}`, { defaultValue: pingStatus ?? 'unknown' })}
            aria-label={t(`node.ping.${pingStatus ?? 'unknown'}`, { defaultValue: pingStatus ?? 'unknown' })}
          />
        )}
        <span className="node-grip">
          <Icon name="grip" size={14} />
        </span>
      </header>

      {node.kind !== 'container' && node.model?.trim() && (
        <p className="node-model">{node.model}</p>
      )}

      {node.kind === 'isp' && (
        <p className="node-model">
          {t(`inspector.isp.${node.ispConnectionType ?? 'pppoe'}`)}
        </p>
      )}

      {node.kind === 'recorder' && (
        <p className="node-model">
          {t(`inspector.recorder.${node.recorderType ?? 'dvr'}`)}
        </p>
      )}

      {node.kind === 'container' && node.containerService?.trim() && (
        <p className="node-model">{node.containerService}</p>
      )}

      {node.os?.trim() && (
        <p className="node-model node-os">
          <OsIcon os={node.os} size={13} />
          <span>{node.os}</span>
        </p>
      )}

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
            <span>{t('node.portsSummary', { count: totalPorts })}</span>
            {portCounts.ethernet > 0 && (
              <span className="node-port-type is-ethernet">
                {portCounts.ethernet} × {t('node.ethernet')}
              </span>
            )}
            {portCounts.sfp > 0 && (
              <span className="node-port-type is-sfp">
                {portCounts.sfp} × {t('node.sfp')}
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
            <span className="node-port-more">{t('node.portGroupsMore', { count: ports.length - 3 })}</span>
          )}
        </div>
      )}

      {(() => {
        const canShowNetwork =
          node.kind !== 'usb' &&
          node.kind !== 'ups' &&
          node.kind !== 'analogCamera' &&
          !(node.kind === 'recorder' && (node.recorderType ?? 'dvr') === 'dvr') &&
          !(node.kind === 'printer' && (node.printerInterface ?? 'ethernet') === 'usb')
        const showIp = canShowNetwork && Boolean(node.ip?.trim())
        const showMac =
          canShowNetwork && node.kind !== 'isp' && Boolean(node.mac?.trim())
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
        title={t('node.connectHint')}
        onPointerDown={(event) => onConnectStart(event, node)}
      />
      <span
        className="port port--right"
        title={t('node.connectHint')}
        onPointerDown={(event) => onConnectStart(event, node)}
      />
    </article>
  )
}
