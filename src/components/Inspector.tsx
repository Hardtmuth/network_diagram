import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DEVICE_META,
  DEVICE_ORDER,
  DISK_TYPES,
  DISK_TYPE_META,
  GROUP_COLORS,
  HARDWARE_KINDS,
  LINK_KINDS,
  LINK_META,
  OS_KINDS,
  PORT_KINDS,
  PORT_TYPES,
  PORT_TYPE_META,
  RAID_LEVELS,
  RAID_LEVEL_META,
  VPN_PROTOCOLS,
  VPN_PROTOCOL_META,
} from '../devices'
import {
  createRowId,
  diskTotalLabel,
  formatCapacity,
  portCount,
  portRangeLabel,
  portsByType,
  portsTotal,
  raidMembers,
  raidUsableGb,
} from '../hardware'
import type {
  Connection,
  DeviceGroup,
  DeviceKind,
  DeviceNode,
  DiskEntry,
  DiskType,
  LinkKind,
  PortGroup,
  PortType,
  PrinterInterface,
  RaidGroup,
  RaidLevel,
  VpnProtocol,
  WifiNetwork,
} from '../types'
import { DeviceIcon } from './DeviceIcon'
import { Icon } from './Icons'

interface InspectorProps {
  node?: DeviceNode
  nodeGroup?: DeviceGroup
  link?: Connection
  linkFrom?: DeviceNode
  linkTo?: DeviceNode
  group?: DeviceGroup
  groupNodes: DeviceNode[]
  selectedNodes: DeviceNode[]
  groups: DeviceGroup[]
  nodeCount: number
  linkCount: number
  groupCount: number
  onUpdateNode: (id: string, patch: Partial<DeviceNode>) => void
  onDeleteNode: (id: string) => void
  onDuplicateNode: (id: string) => void
  onUpdateLink: (id: string, patch: Partial<Connection>) => void
  onDeleteLink: (id: string) => void
  onUpdateGroup: (id: string, patch: Partial<DeviceGroup>) => void
  onAssignGroup: (nodeId: string, groupId: string | null) => void
  onCreateGroup: (ids: string[]) => void
  onSelectNodes: (ids: string[]) => void
  onDeleteNodes: (ids: string[]) => void
  onUngroup: (id: string) => void
  onClose: () => void
  onHidePanel: () => void
}

export function Inspector({
  node,
  nodeGroup,
  link,
  linkFrom,
  linkTo,
  group,
  groupNodes,
  selectedNodes,
  groups,
  nodeCount,
  linkCount,
  groupCount,
  onUpdateNode,
  onDeleteNode,
  onDuplicateNode,
  onUpdateLink,
  onDeleteLink,
  onUpdateGroup,
  onAssignGroup,
  onCreateGroup,
  onSelectNodes,
  onDeleteNodes,
  onUngroup,
  onClose,
  onHidePanel,
}: InspectorProps) {
  const { t } = useTranslation()
  const hasSelection =
    Boolean(node || link || group) || selectedNodes.length > 0
  const title = node
    ? t('inspector.titleDevice')
    : link
      ? t('inspector.titleLink')
      : group
        ? t('inspector.titleGroup')
        : selectedNodes.length > 0
          ? t('inspector.titleSelection')
          : t('inspector.titleParams')

  return (
    <aside className={`inspector ${hasSelection ? 'is-open' : ''}`}>
      <div className="inspector-inner">
        <header className="inspector-head">
          <div>
            <div className="inspector-eyebrow">{t('inspector.eyebrow')}</div>
            <h2>{title}</h2>
          </div>
          <div className="inspector-head-actions">
            {hasSelection && (
              <button
                type="button"
                className="icon-button"
                onClick={onClose}
                aria-label={t('inspector.clearSelection')}
                title={t('inspector.clearSelection')}
              >
                <Icon name="close" size={16} />
              </button>
            )}
            <button
              type="button"
              className="icon-button"
              onClick={onHidePanel}
              aria-label={t('inspector.hidePanel')}
              title={t('inspector.hidePanel')}
            >
              <Icon name="panel-right" size={16} />
            </button>
          </div>
        </header>

        {node && (
          <NodeForm
            node={node}
            nodeGroup={nodeGroup}
            groups={groups}
            onUpdateNode={onUpdateNode}
            onDeleteNode={onDeleteNode}
            onDuplicateNode={onDuplicateNode}
            onAssignGroup={onAssignGroup}
          />
        )}

        {!node && link && (
          <LinkForm
            link={link}
            linkFrom={linkFrom}
            linkTo={linkTo}
            onUpdateLink={onUpdateLink}
            onDeleteLink={onDeleteLink}
          />
        )}

        {!node && !link && group && (
          <GroupForm
            group={group}
            groupNodes={groupNodes}
            onUpdateGroup={onUpdateGroup}
            onSelectNodes={onSelectNodes}
            onUngroup={onUngroup}
          />
        )}

        {!node && !link && !group && selectedNodes.length > 0 && (
          <MultiSelectionForm
            selectedNodes={selectedNodes}
            onCreateGroup={onCreateGroup}
            onSelectNodes={onSelectNodes}
            onDeleteNodes={onDeleteNodes}
          />
        )}

        {!node && !link && !group && selectedNodes.length === 0 && (
          <EmptyInspector
            nodeCount={nodeCount}
            linkCount={linkCount}
            groupCount={groupCount}
          />
        )}
      </div>
    </aside>
  )
}

interface NodeFormProps {
  node: DeviceNode
  nodeGroup?: DeviceGroup
  groups: DeviceGroup[]
  onUpdateNode: (id: string, patch: Partial<DeviceNode>) => void
  onDeleteNode: (id: string) => void
  onDuplicateNode: (id: string) => void
  onAssignGroup: (nodeId: string, groupId: string | null) => void
}

function NodeForm({
  node,
  nodeGroup,
  groups,
  onUpdateNode,
  onDeleteNode,
  onDuplicateNode,
  onAssignGroup,
}: NodeFormProps) {
  const { t } = useTranslation()
  const meta = DEVICE_META[node.kind]
  const deviceLabel = (kind: DeviceKind) => t(`devices.${kind}.label`, { defaultValue: DEVICE_META[kind].label })
  const deviceHint = (kind: DeviceKind) => t(`devices.${kind}.hint`, { defaultValue: DEVICE_META[kind].hint })
  const label = deviceLabel(node.kind)

  return (
    <>
      <div
        className="device-preview"
        style={{ '--device-color': meta.color } as CSSProperties}
      >
        <span className="device-preview-icon">
          <DeviceIcon kind={node.kind} size={25} />
        </span>
        <span className="device-preview-text">
          <strong>{node.name || label}</strong>
          <span>{deviceHint(node.kind)}</span>
        </span>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="node-name">
          {t('inspector.nodeName')}
        </label>
        <input
          id="node-name"
          value={node.name}
          placeholder={label}
          onChange={(event) =>
            onUpdateNode(node.id, { name: event.target.value })
          }
        />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="node-kind">
          {t('inspector.nodeType')}
        </label>
        <select
          id="node-kind"
          value={node.kind}
          onChange={(event) =>
            onUpdateNode(node.id, { kind: event.target.value as DeviceKind })
          }
        >
          {DEVICE_ORDER.map((kind) => (
            <option key={kind} value={kind}>
              {deviceLabel(kind)}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="node-model">
          {t('inspector.nodeModel')}
        </label>
        <input
          id="node-model"
          value={node.model}
          placeholder={t('inspector.nodeNamePlaceholder')}
          onChange={(event) =>
            onUpdateNode(node.id, { model: event.target.value })
          }
        />
      </div>

      {OS_KINDS.includes(node.kind) && (
        <div className="field">
          <label className="field-label" htmlFor="node-os">
            {t('inspector.nodeOs')}
          </label>
          <input
            id="node-os"
            value={node.os ?? ''}
            placeholder={t('inspector.nodeOsPlaceholder')}
            onChange={(event) =>
              onUpdateNode(node.id, { os: event.target.value })
            }
          />
        </div>
      )}

      {node.kind === 'printer' && (
        <div className="field">
          <label className="field-label" htmlFor="node-printer-interface">
            {t('inspector.printerInterface')}
          </label>
          <select
            id="node-printer-interface"
            value={node.printerInterface ?? 'ethernet'}
            onChange={(event) =>
              onUpdateNode(node.id, {
                printerInterface: event.target.value as PrinterInterface,
              })
            }
          >
            <option value="usb">{t('inspector.printerUsb')}</option>
            <option value="ethernet">{t('inspector.printerEthernet')}</option>
            <option value="wifi">{t('inspector.printerWifi')}</option>
          </select>
        </div>
      )}

      {node.kind !== 'usb' &&
        !(node.kind === 'printer' && (node.printerInterface ?? 'ethernet') === 'usb') && (
          <>
            <div className="field">
              <label className="field-label" htmlFor="node-ip">
                {t('inspector.nodeIp')}
              </label>
              <input
                id="node-ip"
                className="mono-input"
                value={node.ip ?? ''}
                placeholder="192.168.1.10"
                spellCheck={false}
                onChange={(event) =>
                  onUpdateNode(node.id, { ip: event.target.value })
                }
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="node-mac">
                {t('inspector.nodeMac')}
              </label>
              <input
                id="node-mac"
                className="mono-input"
                value={node.mac ?? ''}
                placeholder="AA:BB:CC:DD:EE:FF"
                spellCheck={false}
                onChange={(event) =>
                  onUpdateNode(node.id, { mac: event.target.value.toUpperCase() })
                }
              />
            </div>
          </>
        )}

      {HARDWARE_KINDS.includes(node.kind) && (
        <HardwareSection node={node} onUpdateNode={onUpdateNode} />
      )}

      {PORT_KINDS.includes(node.kind) && (
        <PortsSection node={node} onUpdateNode={onUpdateNode} />
      )}

      {node.kind === 'ap' && (
        <AccessPointSection node={node} onUpdateNode={onUpdateNode} />
      )}

      <div className="field">
        <label className="field-label" htmlFor="node-notes">
          {t('inspector.nodeNotes')}
        </label>
        <textarea
          id="node-notes"
          value={node.notes}
          rows={3}
          placeholder={t('inspector.nodeNotesPlaceholder')}
          onChange={(event) =>
            onUpdateNode(node.id, { notes: event.target.value })
          }
        />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="node-group">
          {t('inspector.assignGroup')}
        </label>
        <select
          id="node-group"
          value={nodeGroup?.id ?? ''}
          onChange={(event) =>
            onAssignGroup(node.id, event.target.value || null)
          }
        >
          <option value="">{t('inspector.noGroup')}</option>
          {groups.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name || t('canvas.groupDefault')}
            </option>
          ))}
        </select>
        <span className="field-hint">
          {t('inspector.nodeGroupHint')}
        </span>
      </div>

      <div className="inspector-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={() => onDuplicateNode(node.id)}
        >
          <Icon name="copy" size={15} />
          {t('inspector.duplicateDevice')}
        </button>
        <button
          type="button"
          className="danger-button"
          onClick={() => onDeleteNode(node.id)}
        >
          <Icon name="trash" size={15} />
          {t('common.delete')}
        </button>
      </div>
    </>
  )
}

function numberFromInput(value: string) {
  const trimmed = value.trim()
  if (trimmed === '') return undefined
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed)) return undefined
  return Math.max(0, parsed)
}

function clampPort(value: number) {
  if (!Number.isFinite(value)) return 1
  return Math.min(4096, Math.max(1, Math.round(value)))
}

interface HardwareSectionProps {
  node: DeviceNode
  onUpdateNode: (id: string, patch: Partial<DeviceNode>) => void
}

function HardwareSection({ node, onUpdateNode }: HardwareSectionProps) {
  const { t, i18n } = useTranslation()
  const disks = node.disks ?? []
  const raids = node.raids ?? []
  const patch = (value: Partial<DeviceNode>) => onUpdateNode(node.id, value)
  const saveDisks = (
    nextDisks: DiskEntry[],
    nextRaids: RaidGroup[] = raids,
  ) => patch({ disks: nextDisks, raids: nextRaids })

  const addDisk = () =>
    saveDisks([
      ...disks,
      { id: createRowId(), type: 'sata-ssd', sizeGb: 1000, raidId: '' },
    ])

  const updateDisk = (id: string, value: Partial<DiskEntry>) =>
    saveDisks(
      disks.map((disk) => (disk.id === id ? { ...disk, ...value } : disk)),
    )

  const removeDisk = (id: string) => {
    const nextDisks = disks.filter((disk) => disk.id !== id)
    const usedRaids = new Set(nextDisks.map((disk) => disk.raidId))
    saveDisks(
      nextDisks,
      raids.filter((raid) => usedRaids.has(raid.id)),
    )
  }

  const addRaid = () =>
    patch({
      disks,
      raids: [
        ...raids,
        {
          id: createRowId(),
          name: `RAID ${raids.length + 1}`,
          level: 'raid1',
        },
      ],
    })

  const updateRaid = (id: string, value: Partial<RaidGroup>) =>
    patch({
      disks,
      raids: raids.map((raid) =>
        raid.id === id ? { ...raid, ...value } : raid,
      ),
    })

  const removeRaid = (id: string) =>
    patch({
      disks: disks.map((disk) =>
        disk.raidId === id ? { ...disk, raidId: '' } : disk,
      ),
      raids: raids.filter((raid) => raid.id !== id),
    })

  const pluralWord = (n: number, one: string, few: string, many: string) => {
    if (i18n.resolvedLanguage === 'en') return n === 1 ? t(one) : t(many)
    const m10 = n % 10, m100 = n % 100
    if (m10 === 1 && m100 !== 11) return t(one)
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return t(few)
    return t(many)
  }
  const summary =
    disks.length > 0
      ? `${disks.length} ${pluralWord(disks.length, 'inspector.diskWord_one', 'inspector.diskWord_few', 'inspector.diskWord_many')} · ${diskTotalLabel(disks)}`
      : t('inspector.notFilled')

  return (
    <section className="hw-section">
      <header className="hw-section-head">
        <span className="hw-section-title">{t('inspector.hardwareConfig')}</span>
        <span className="hw-section-hint">{summary}</span>
      </header>

      <div className="hw-grid">
        <div className="field hw-grid-wide">
          <label className="field-label" htmlFor="node-cpu">
            {t('inspector.cpu')}
          </label>
          <input
            id="node-cpu"
            value={node.cpu ?? ''}
            placeholder={t('inspector.cpuPlaceholder')}
            onChange={(event) => patch({ cpu: event.target.value })}
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="node-cores">
            {t('inspector.cpuCores')}
          </label>
          <input
            id="node-cores"
            type="number"
            min={1}
            inputMode="numeric"
            value={node.cpuCores ?? ''}
            placeholder="8"
            onChange={(event) =>
              patch({ cpuCores: numberFromInput(event.target.value) })
            }
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="node-ram">
            {t('inspector.ramGb')}
          </label>
          <input
            id="node-ram"
            type="number"
            min={0}
            inputMode="numeric"
            value={node.ramGb ?? ''}
            placeholder="32"
            onChange={(event) =>
              patch({ ramGb: numberFromInput(event.target.value) })
            }
          />
        </div>
      </div>

      <div className="hw-subsection">
        <div className="hw-subhead">
          <span>{t('inspector.storage')}</span>
          <button type="button" className="hw-add" onClick={addDisk}>
            <Icon name="plus" size={13} />
            {t('inspector.disk')}
          </button>
        </div>

        {disks.length === 0 && (
          <p className="hw-empty">
            {t('inspector.addDiskHint')}
          </p>
        )}

        <div className="hw-list">
          {disks.map((disk) => (
            <div className="hw-item" key={disk.id}>
              <div className="hw-row">
                <select
                  aria-label={t('inspector.diskType')}
                  value={disk.type}
                  onChange={(event) =>
                    updateDisk(disk.id, {
                      type: event.target.value as DiskType,
                    })
                  }
                >
                  {DISK_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {t(`diskTypes.${type}.label`, { defaultValue: DISK_TYPE_META[type].label })}
                    </option>
                  ))}
                </select>
                <span className="hw-size">
                  <input
                    type="number"
                    min={0}
                    step={100}
                    inputMode="numeric"
                    aria-label={t('inspector.diskSizeGb')}
                    value={disk.sizeGb || ''}
                    placeholder="GB"
                    onChange={(event) =>
                      updateDisk(disk.id, {
                        sizeGb: numberFromInput(event.target.value) ?? 0,
                      })
                    }
                  />
                  <span>GB</span>
                </span>
                <button
                  type="button"
                  className="hw-remove"
                  onClick={() => removeDisk(disk.id)}
                  title={t('inspector.removeDisk')}
                  aria-label={t('inspector.removeDisk')}
                >
                  <Icon name="trash" size={13} />
                </button>
              </div>
              <div className="hw-row is-sub">
                <span className="hw-sublabel">RAID</span>
                <select
                  aria-label={t('inspector.raidArray')}
                  value={disk.raidId}
                  onChange={(event) =>
                    updateDisk(disk.id, { raidId: event.target.value })
                  }
                >
                  <option value="">{t('inspector.noRaid')}</option>
                  {raids.map((raid) => (
                    <option key={raid.id} value={raid.id}>
                      {raid.name || 'RAID'} ·{' '}
                      {t(`raid.${raid.level}.label`, { defaultValue: RAID_LEVEL_META[raid.level].label })}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="hw-subsection">
        <div className="hw-subhead">
          <span>{t('inspector.raidArrays')}</span>
          <button type="button" className="hw-add" onClick={addRaid}>
            <Icon name="plus" size={13} />
            RAID
          </button>
        </div>

        {raids.length > 0 && (
          <div className="hw-list">
            {raids.map((raid) => {
              const members = raidMembers(disks, raid.id)
              const usable = raidUsableGb(members, raid.level)
              return (
                <div className="hw-item is-raid" key={raid.id}>
                  <div className="hw-row">
                    <input
                      className="hw-name"
                      value={raid.name}
                      placeholder={t('inspector.raidNamePlaceholder')}
                      aria-label={t('inspector.raidNameAria')}
                      onChange={(event) =>
                        updateRaid(raid.id, { name: event.target.value })
                      }
                    />
                    <button
                      type="button"
                      className="hw-remove"
                      onClick={() => removeRaid(raid.id)}
                      title={t('inspector.removeRaid')}
                      aria-label={t('inspector.removeRaid')}
                    >
                      <Icon name="trash" size={13} />
                    </button>
                  </div>
                  <div className="hw-row is-sub">
                    <select
                      aria-label={t('inspector.raidLevel')}
                      value={raid.level}
                      onChange={(event) =>
                        updateRaid(raid.id, {
                          level: event.target.value as RaidLevel,
                        })
                      }
                    >
                      {RAID_LEVELS.map((level) => (
                        <option key={level} value={level}>
                          {t(`raid.${level}.label`, { defaultValue: RAID_LEVEL_META[level].label })}
                        </option>
                      ))}
                    </select>
                    <span className="hw-capacity">
                      {members.length > 0
                        ? `${members.length} ${pluralWord(members.length, 'inspector.diskWord_one', 'inspector.diskWord_few', 'inspector.diskWord_many')} · ≈ ${formatCapacity(usable)}`
                        : t('inspector.noDisks')}
                    </span>
                  </div>
                  <p className="hw-raid-hint">
                    {t(`raid.${raid.level}.hint`, { defaultValue: RAID_LEVEL_META[raid.level].hint })}
                  </p>
                </div>
              )
            })}
          </div>
        )}

        <span className="hw-section-note">
          {t('inspector.raidAssignHint')}
        </span>
      </div>
    </section>
  )
}

interface PortsSectionProps {
  node: DeviceNode
  onUpdateNode: (id: string, patch: Partial<DeviceNode>) => void
}

function AccessPointSection({
  node,
  onUpdateNode,
}: {
  node: DeviceNode
  onUpdateNode: (id: string, patch: Partial<DeviceNode>) => void
}) {
  const { t, i18n } = useTranslation()
  const wifiNetworks = node.wifiNetworks ?? []
  const patch = (value: Partial<DeviceNode>) => onUpdateNode(node.id, value)

  const updateNetwork = (id: string, value: Partial<WifiNetwork>) => {
    patch({
      wifiNetworks: wifiNetworks.map((item) =>
        item.id === id ? { ...item, ...value } : item,
      ),
    })
  }

  const addNetwork = () => {
    patch({
      wifiNetworks: [
        ...wifiNetworks,
        { id: createRowId(), ssid: '', password: '' },
      ],
    })
  }

  const removeNetwork = (id: string) => {
    const next = wifiNetworks.filter((item) => item.id !== id)
    patch({
      wifiNetworks:
        next.length > 0 ? next : [{ id: createRowId(), ssid: '', password: '' }],
    })
  }

  return (
    <section className="hw-section">
      <header className="hw-section-head">
        <span className="hw-section-title">{t('inspector.wifiNetworks')}</span>
        <span className="hw-section-hint">
          {wifiNetworks.length}{' '}
          {(() => { const n=wifiNetworks.length; if (i18n.resolvedLanguage==='en') return n===1?t('inspector.netWord_one'):t('inspector.netWord_many'); const m10=n%10,m100=n%100; return m10===1&&m100!==11?t('inspector.netWord_one'):m10>=2&&m10<=4&&(m100<12||m100>14)?t('inspector.netWord_few'):t('inspector.netWord_many') })()}
        </span>
      </header>

      <div className="hw-list">
        {wifiNetworks.map((network, index) => (
          <div className="hw-item" key={network.id}>
            <div className="hw-row">
              <input
                value={network.ssid}
                placeholder={`SSID ${index + 1}`}
                aria-label={t('inspector.ssid')}
                onChange={(event) =>
                  updateNetwork(network.id, { ssid: event.target.value })
                }
              />
              {wifiNetworks.length > 1 && (
                <button
                  type="button"
                  className="hw-remove"
                  onClick={() => removeNetwork(network.id)}
                  title={t('inspector.removeNetwork')}
                  aria-label={t('inspector.removeNetwork')}
                >
                  <Icon name="trash" size={13} />
                </button>
              )}
            </div>
            <div className="hw-row is-sub">
              <input
                value={network.password}
                placeholder={t('inspector.wifiPassword')}
                aria-label={t('inspector.wifiPasswordAria')}
                onChange={(event) =>
                  updateNetwork(network.id, { password: event.target.value })
                }
              />
            </div>
          </div>
        ))}
      </div>

      <button type="button" className="hw-add is-wide" onClick={addNetwork}>
        <Icon name="plus" size={13} />
        {t('inspector.addWifiNetwork')}
      </button>

      <div className="hw-subsection">
        <div className="field">
          <label className="field-label" htmlFor="ap-dhcp-enabled">
            {t('inspector.ownDhcp')}
          </label>
          <select
            id="ap-dhcp-enabled"
            value={node.apDhcpEnabled ? 'yes' : 'no'}
            onChange={(event) =>
              patch({ apDhcpEnabled: event.target.value === 'yes' })
            }
          >
            <option value="no">{t('common.no')}</option>
            <option value="yes">{t('common.yes')}</option>
          </select>
        </div>
        {node.apDhcpEnabled && (
          <div className="field">
            <label className="field-label" htmlFor="ap-dhcp-network">
              {t('inspector.dhcpNetwork')}
            </label>
            <input
              id="ap-dhcp-network"
              className="mono-input"
              value={node.apDhcpNetwork ?? ''}
              placeholder="192.168.10.0/24"
              spellCheck={false}
              onChange={(event) =>
                patch({ apDhcpNetwork: event.target.value })
              }
            />
          </div>
        )}
      </div>
    </section>
  )
}

function PortsSection({ node, onUpdateNode }: PortsSectionProps) {
  const { t, i18n } = useTranslation()
  const ports = node.ports ?? []
  const patch = (next: PortGroup[]) => onUpdateNode(node.id, { ports: next })
  const counts = portsByType(ports)
  const total = portsTotal(ports)

  const isNetworkDevice = node.kind === 'server' || node.kind === 'vm' || node.kind === 'nas'
  const title = isNetworkDevice ? t('inspector.networkPorts') : t('inspector.ports')
  const summary =
    ports.length > 0
      ? `${total} ${(() => { const n=total; if (i18n.resolvedLanguage==='en') return n===1?t('inspector.portWord_one'):t('inspector.portWord_many'); const m10=n%10,m100=n%100; return m10===1&&m100!==11?t('inspector.portWord_one'):m10>=2&&m10<=4&&(m100<12||m100>14)?t('inspector.portWord_few'):t('inspector.portWord_many') })()}${
          counts.ethernet > 0 ? ` · ${counts.ethernet} Ethernet` : ''
        }${counts.sfp > 0 ? ` · ${counts.sfp} SFP` : ''}`
      : t('inspector.notFilled')

  const addPort = () => {
    const last = ports.reduce((max, port) => Math.max(max, port.to), 0)
    patch([
      ...ports,
      {
        id: createRowId(),
        type: 'ethernet',
        from: last + 1,
        to: last + 1,
        note: '',
      },
    ])
  }

  const updatePort = (id: string, value: Partial<PortGroup>) =>
    patch(
      ports.map((port) => (port.id === id ? { ...port, ...value } : port)),
    )

  const setRange = (port: PortGroup, edge: 'from' | 'to', raw: string) => {
    const value = clampPort(Number(raw))
    const from = edge === 'from' ? value : port.from
    const to = edge === 'to' ? value : port.to
    updatePort(port.id, {
      from: Math.min(from, to),
      to: Math.max(from, to),
    })
  }

  return (
    <section className="hw-section">
      <header className="hw-section-head">
        <span className="hw-section-title">{title}</span>
        <span className="hw-section-hint">{summary}</span>
      </header>

      <p className="hw-empty">
        {t('inspector.portsHint')}
      </p>

      <div className="hw-list">
        {ports.map((port) => (
          <div
            className="hw-item"
            key={port.id}
            title={portRangeLabel(port)}
          >
            <div className="hw-row">
              <select
                aria-label={t('inspector.portType')}
                value={port.type}
                onChange={(event) =>
                  updatePort(port.id, {
                    type: event.target.value as PortType,
                  })
                }
              >
                {PORT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`ports.${type}.label`, { defaultValue: PORT_TYPE_META[type].label })}
                  </option>
                ))}
              </select>
              <span className="hw-range">
                <input
                  type="number"
                  min={1}
                  max={4096}
                  inputMode="numeric"
                  aria-label={t('inspector.portFirst')}
                  value={port.from}
                  onChange={(event) =>
                    setRange(port, 'from', event.target.value)
                  }
                />
                <span>–</span>
                <input
                  type="number"
                  min={1}
                  max={4096}
                  inputMode="numeric"
                  aria-label={t('inspector.portLast')}
                  value={port.to}
                  onChange={(event) => setRange(port, 'to', event.target.value)}
                />
              </span>
              <button
                type="button"
                className="hw-remove"
                onClick={() =>
                  patch(ports.filter((item) => item.id !== port.id))
                }
                title={t('inspector.removePorts')}
                aria-label={t('inspector.removePorts')}
              >
                <Icon name="trash" size={13} />
              </button>
            </div>
            <div className="hw-row is-sub">
              <span className="hw-count">
                {portCount(port)}{' '}
                {(() => { const n=portCount(port); if (i18n.resolvedLanguage==='en') return n===1?t('inspector.portWord_one'):t('inspector.portWord_many'); const m10=n%10,m100=n%100; return m10===1&&m100!==11?t('inspector.portWord_one'):m10>=2&&m10<=4&&(m100<12||m100>14)?t('inspector.portWord_few'):t('inspector.portWord_many') })()}
              </span>
              <input
                className="hw-note"
                value={port.note}
                placeholder={t('inspector.portPurposePlaceholder')}
                aria-label={t('inspector.portPurpose')}
                onChange={(event) =>
                  updatePort(port.id, { note: event.target.value })
                }
              />
            </div>
          </div>
        ))}
      </div>

      <button type="button" className="hw-add is-wide" onClick={addPort}>
        <Icon name="plus" size={13} />
        {t('inspector.addPorts')}
      </button>
    </section>
  )
}

interface LinkFormProps {
  link: Connection
  linkFrom?: DeviceNode
  linkTo?: DeviceNode
  onUpdateLink: (id: string, patch: Partial<Connection>) => void
  onDeleteLink: (id: string) => void
}

function nodeLabel(node: DeviceNode | undefined, t: any) {
  if (!node) return '—'
  return node.name || t(`devices.${node.kind}.label`, { defaultValue: DEVICE_META[node.kind].label })
}

function LinkForm({
  link,
  linkFrom,
  linkTo,
  onUpdateLink,
  onDeleteLink,
}: LinkFormProps) {
  const { t } = useTranslation()
  const meta = LINK_META[link.kind]
  const protocol = link.vpnProtocol ?? 'wireguard'

  return (
    <>
      <div
        className="link-preview"
        style={{ '--link-color': meta.color } as CSSProperties}
      >
        <span className="link-preview-name">{nodeLabel(linkFrom, t)}</span>
        <span className="link-preview-wire">
          <span className="link-preview-dot" />
          <span className="link-preview-line" />
          <span className="link-preview-dot" />
        </span>
        <span className="link-preview-name is-right">{nodeLabel(linkTo, t)}</span>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="link-kind">
          {t('inspector.linkType')}
        </label>
        <select
          id="link-kind"
          value={link.kind}
          onChange={(event) => {
            const kind = event.target.value as LinkKind
            onUpdateLink(
              link.id,
              kind === 'vpn'
                ? { kind, vpnProtocol: link.vpnProtocol ?? 'wireguard' }
                : { kind },
            )
          }}
        >
          {LINK_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {t(`links.${kind}`, { defaultValue: LINK_META[kind].label })}
            </option>
          ))}
        </select>
        <span className="field-hint">{t(`links.${link.kind}`, { defaultValue: meta.label })}</span>
      </div>

      {link.kind === 'vpn' && (
        <div className="field">
          <label className="field-label" htmlFor="link-vpn">
            {t('inspector.vpnProtocol')}
          </label>
          <select
            id="link-vpn"
            value={protocol}
            onChange={(event) =>
              onUpdateLink(link.id, {
                kind: 'vpn',
                vpnProtocol: event.target.value as VpnProtocol,
              })
            }
          >
            {VPN_PROTOCOLS.map((item) => (
              <option key={item} value={item}>
                {t(`vpn.${item}.label`, { defaultValue: VPN_PROTOCOL_META[item].label })}
              </option>
            ))}
          </select>
          <span className="field-hint">
            {t(`vpn.${protocol}.description`, { defaultValue: VPN_PROTOCOL_META[protocol].description })}
          </span>
        </div>
      )}

      <div className="field">
        <label className="field-label" htmlFor="link-label">
          {t('inspector.linkLabel')}
        </label>
        <input
          id="link-label"
          value={link.label}
          placeholder={
            link.kind === 'vpn'
              ? t(`vpn.${protocol}.label`, { defaultValue: VPN_PROTOCOL_META[protocol].label })
              : t('inspector.linkLabelPlaceholderEth')
          }
          onChange={(event) =>
            onUpdateLink(link.id, { label: event.target.value })
          }
        />
        <span className="field-hint">
          {t('inspector.linkLabelHint')}
          {link.kind === 'vpn' && t('inspector.linkLabelHintVpn')}
        </span>
      </div>

      <div className="link-meta">
        <span
          className="link-kind-swatch"
          style={{ background: meta.color }}
        />
        <span>{t(`links.${link.kind}`, { defaultValue: meta.label })}</span>
        {link.kind === 'vpn' && (
          <span className="link-meta-badge">
            {t(`vpn.${protocol}.label`, { defaultValue: VPN_PROTOCOL_META[protocol].label })}
          </span>
        )}
      </div>

      <div className="inspector-actions">
        <button
          type="button"
          className="danger-button is-wide"
          onClick={() => onDeleteLink(link.id)}
        >
          <Icon name="trash" size={15} />
          {t('inspector.deleteLink')}
        </button>
      </div>
    </>
  )
}

interface GroupFormProps {
  group: DeviceGroup
  groupNodes: DeviceNode[]
  onUpdateGroup: (id: string, patch: Partial<DeviceGroup>) => void
  onSelectNodes: (ids: string[]) => void
  onUngroup: (id: string) => void
}

function GroupForm({
  group,
  groupNodes,
  onUpdateGroup,
  onSelectNodes,
  onUngroup,
}: GroupFormProps) {
  const { t, i18n } = useTranslation()
  const deviceLabel = (kind: DeviceKind) => t(`devices.${kind}.label`, { defaultValue: DEVICE_META[kind].label })
  return (
    <>
      <div
        className="group-preview"
        style={{ '--group-color': group.color } as CSSProperties}
      >
        <span className="group-preview-icon">
          <Icon name="group" size={20} />
        </span>
        <span className="group-preview-text">
          <strong>{group.name || t('canvas.groupDefault')}</strong>
          <span>
            {group.nodeIds.length}{' '}
            {i18n.resolvedLanguage === 'en'
              ? (group.nodeIds.length === 1 ? t('inspector.deviceWord_one') : t('inspector.deviceWord_many'))
              : (() => { const n=group.nodeIds.length,m10=n%10,m100=n%100; return m10===1&&m100!==11?t('inspector.deviceWord_one'):m10>=2&&m10<=4&&(m100<12||m100>14)?t('inspector.deviceWord_few'):t('inspector.deviceWord_many') })()}
          </span>
        </span>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="group-name">
          {t('inspector.groupName')}
        </label>
        <input
          id="group-name"
          value={group.name}
          placeholder={t('inspector.groupNamePlaceholder')}
          onChange={(event) =>
            onUpdateGroup(group.id, { name: event.target.value })
          }
        />
      </div>

      <div className="field">
        <span className="field-label">{t('inspector.groupColor')}</span>
        <div className="swatch-row">
          {GROUP_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={`swatch ${group.color === color ? 'is-active' : ''}`}
              style={{ '--swatch-color': color } as CSSProperties}
              onClick={() => onUpdateGroup(group.id, { color })}
              aria-label={color}
              title={color}
            />
          ))}
        </div>
      </div>

      <div className="field">
        <span className="field-label">{t('inspector.groupDevices')}</span>
        <ul className="member-list">
          {groupNodes.map((member) => (
            <li key={member.id}>
              <button
                type="button"
                className="member-row"
                onClick={() => onSelectNodes([member.id])}
              >
                <span
                  className="member-icon"
                  style={
                    {
                      '--device-color': DEVICE_META[member.kind].color,
                    } as CSSProperties
                  }
                >
                  <DeviceIcon kind={member.kind} size={15} />
                </span>
                <span className="member-text">
                  <strong>{nodeLabel(member, t)}</strong>
                  <span>{deviceLabel(member.kind)}</span>
                </span>
                <code className={member.ip ? '' : 'is-empty'}>
                  {member.ip || '—'}
                </code>
              </button>
            </li>
          ))}
        </ul>
        <span className="field-hint">
          {t('inspector.groupDragHint')}
        </span>
      </div>

      <div className="inspector-actions">
        <button
          type="button"
          className="secondary-button is-wide"
          onClick={() => onUngroup(group.id)}
        >
          <Icon name="ungroup" size={15} />
          {t('inspector.ungroupWide')}
        </button>
      </div>
    </>
  )
}

interface MultiSelectionFormProps {
  selectedNodes: DeviceNode[]
  onCreateGroup: (ids: string[]) => void
  onSelectNodes: (ids: string[]) => void
  onDeleteNodes: (ids: string[]) => void
}

function MultiSelectionForm({
  selectedNodes,
  onCreateGroup,
  onSelectNodes,
  onDeleteNodes,
}: MultiSelectionFormProps) {
  const { t } = useTranslation()
  const deviceLabel = (kind: DeviceKind) => t(`devices.${kind}.label`, { defaultValue: DEVICE_META[kind].label })
  return (
    <>
      <div className="multi-summary">
        <span className="multi-badge">{selectedNodes.length}</span>
        <span className="multi-summary-text">
          <strong>{t('inspector.multiSelected')}</strong>
          <span>
            {t('inspector.multiHint')}
          </span>
        </span>
      </div>

      <ul className="member-list is-multi">
        {selectedNodes.map((member) => (
          <li key={member.id}>
            <button
              type="button"
              className="member-row"
              onClick={() => onSelectNodes([member.id])}
            >
              <span
                className="member-icon"
                style={
                  {
                    '--device-color': DEVICE_META[member.kind].color,
                  } as CSSProperties
                }
              >
                <DeviceIcon kind={member.kind} size={15} />
              </span>
              <span className="member-text">
                <strong>{nodeLabel(member, t)}</strong>
                <span>{deviceLabel(member.kind)}</span>
              </span>
              <code className={member.ip ? '' : 'is-empty'}>
                {member.ip || '—'}
              </code>
            </button>
          </li>
        ))}
      </ul>

      <div className="inspector-actions is-stacked">
        <button
          type="button"
          className="primary-button is-wide"
          onClick={() => onCreateGroup(selectedNodes.map((member) => member.id))}
          disabled={selectedNodes.length < 2}
        >
          <Icon name="group" size={15} />
          {t('inspector.mergeGroup')}
        </button>
        <button
          type="button"
          className="danger-button is-wide"
          onClick={() => onDeleteNodes(selectedNodes.map((member) => member.id))}
        >
          <Icon name="trash" size={15} />
          {t('inspector.deleteSelected')}
        </button>
      </div>
    </>
  )
}

interface EmptyInspectorProps {
  nodeCount: number
  linkCount: number
  groupCount: number
}

function EmptyInspector({
  nodeCount,
  linkCount,
  groupCount,
}: EmptyInspectorProps) {
  const { t } = useTranslation()
  return (
    <>
      <div className="empty-state">
        <span className="empty-orb">
          <Icon name="cursor" size={22} />
        </span>
        <strong>{t('inspector.emptySelect')}</strong>
        <p>
          {t('inspector.emptySelectHint')}
        </p>
      </div>

      <div className="inspector-stats">
        <div className="stat-card">
          <span className="stat-value">{nodeCount}</span>
          <span className="stat-label">{t('inspector.statsDevices')}</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{linkCount}</span>
          <span className="stat-label">{t('inspector.statsLinks')}</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{groupCount}</span>
          <span className="stat-label">{t('inspector.statsGroups')}</span>
        </div>
      </div>

      <div className="shortcuts">
        <div className="shortcut-row">
          <span>{t('inspector.shortcutSelectMultiple')}</span>
          <kbd>Shift + Click</kbd>
        </div>
        <div className="shortcut-row">
          <span>{t('inspector.shortcutDelete')}</span>
          <kbd>Del</kbd>
        </div>
        <div className="shortcut-row">
          <span>{t('inspector.shortcutDuplicate')}</span>
          <kbd>Ctrl D</kbd>
        </div>
        <div className="shortcut-row">
          <span>{t('inspector.clearSelection')}</span>
          <kbd>Esc</kbd>
        </div>
        <div className="shortcut-row">
          <span>{t('inspector.shortcutScale')}</span>
          <kbd>Ctrl + Wheel</kbd>
        </div>
      </div>

      <div className="inspector-tip">
        <span className="tip-dot" />
        {t('inspector.autoSaveTip')}
      </div>
    </>
  )
}
