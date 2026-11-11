import { useState } from 'react'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DEVICE_META,
  DEVICE_ORDER,
  DISK_TYPES,
  DISK_TYPE_META,
  GROUP_COLORS,
  HARDWARE_KINDS,
  ISP_CONNECTION_TYPES,
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
import { MOBILE_OS_PRESETS, OS_PRESETS, OsIcon, getOsPreset } from '../os'
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
  DhcpSubnet,
  DiskEntry,
  DiskType,
  IspConnectionType,
  LinkKind,
  MobileOs,
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
  selectedGroupsList?: DeviceGroup[]
  groups: DeviceGroup[]
  nodes: DeviceNode[]
  connections: Connection[]
  nodeCount: number
  linkCount: number
  groupCount: number
  onUpdateNode: (id: string, patch: Partial<DeviceNode>) => void
  onDeleteNode: (id: string) => void
  onDuplicateNode: (id: string) => void
  onAddConnection: (from: string, to: string, kind?: LinkKind) => void
  onUpdateLink: (id: string, patch: Partial<Connection>) => void
  onDeleteLink: (id: string) => void
  onUpdateGroup: (id: string, patch: Partial<DeviceGroup>) => void
  onAssignGroup: (nodeId: string, groupId: string | null) => void
  onCreateGroup: (nodeIds: string[], groupIds?: string[]) => void
  onSelectNodes: (ids: string[]) => void
  onDeleteNodes: (ids: string[]) => void
  onUngroup: (id: string) => void
  onSelect: (selection: import('../types').Selection) => void
  onClose: () => void
  onHidePanel: () => void
  readOnly?: boolean
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
  selectedGroupsList = [],
  groups,
  nodes,
  connections,
  nodeCount,
  linkCount,
  groupCount,
  onUpdateNode,
  onDeleteNode,
  onDuplicateNode,
  onAddConnection,
  onUpdateLink,
  onDeleteLink,
  onUpdateGroup,
  onAssignGroup,
  onCreateGroup,
  onSelectNodes,
  onDeleteNodes,
  onUngroup,
  onSelect,
  onClose,
  onHidePanel,
  readOnly = false,
}: InspectorProps) {
  const { t } = useTranslation()
  const multiCount = selectedNodes.length + selectedGroupsList.length
  const hasSelection =
    Boolean(node || link || group) || multiCount > 0
  const title = node
    ? t('inspector.titleDevice')
    : link
      ? t('inspector.titleLink')
      : group
        ? t('inspector.titleGroup')
        : multiCount > 0
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
            nodes={nodes}
            connections={connections}
            onUpdateNode={onUpdateNode}
            onDeleteNode={onDeleteNode}
            onDuplicateNode={onDuplicateNode}
            onAssignGroup={onAssignGroup}
            onAddConnection={onAddConnection}
            onUpdateLink={onUpdateLink}
            onDeleteLink={onDeleteLink}
            onSelect={onSelect}
            readOnly={readOnly}
          />
        )}

        {!node && link && (
          <LinkForm
            link={link}
            linkFrom={linkFrom}
            linkTo={linkTo}
            onUpdateLink={onUpdateLink}
            onDeleteLink={onDeleteLink}
            readOnly={readOnly}
          />
        )}

        {!node && !link && group && (
          <GroupForm
            group={group}
            groupNodes={groupNodes}
            groups={groups}
            onUpdateGroup={onUpdateGroup}
            onSelectNodes={onSelectNodes}
            onUngroup={onUngroup}
            readOnly={readOnly}
          />
        )}

        {!node && !link && !group && multiCount > 0 && (
          <MultiSelectionForm
            selectedNodes={selectedNodes}
            selectedGroupsList={selectedGroupsList}
            onCreateGroup={onCreateGroup}
            onSelectNodes={onSelectNodes}
            onDeleteNodes={onDeleteNodes}
            onUngroup={onUngroup}
            readOnly={readOnly}
          />
        )}

        {!node && !link && !group && multiCount === 0 && (
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
  nodes: DeviceNode[]
  connections: Connection[]
  onUpdateNode: (id: string, patch: Partial<DeviceNode>) => void
  onDeleteNode: (id: string) => void
  onDuplicateNode: (id: string) => void
  onAssignGroup: (nodeId: string, groupId: string | null) => void
  onAddConnection: (from: string, to: string, kind?: LinkKind) => void
  onUpdateLink: (id: string, patch: Partial<Connection>) => void
  onDeleteLink: (id: string) => void
  onSelect: (selection: import('../types').Selection) => void
  readOnly?: boolean
}

function NodeForm({
  node,
  nodeGroup,
  groups,
  nodes,
  connections,
  onUpdateNode,
  onDeleteNode,
  onDuplicateNode,
  onAssignGroup,
  onAddConnection,
  onUpdateLink,
  onDeleteLink,
  onSelect,
  readOnly = false,
}: NodeFormProps) {
  const { t } = useTranslation()
  const meta = DEVICE_META[node.kind]
  const deviceLabel = (kind: DeviceKind) => t(`devices.${kind}.label`, { defaultValue: DEVICE_META[kind].label })
  const deviceHint = (kind: DeviceKind) => t(`devices.${kind}.hint`, { defaultValue: DEVICE_META[kind].hint })
  const label = deviceLabel(node.kind)
  const [open, setOpen] = useState({
    config: false,
    ports: false,
    group: false,
    connections: false,
    ap: false,
    router: false,
  })
  const toggle = (key: keyof typeof open) => setOpen((s) => ({ ...s, [key]: !s[key] }))

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
         disabled={readOnly} />
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
         disabled={readOnly}>
          {DEVICE_ORDER.map((kind) => (
            <option key={kind} value={kind}>
              {deviceLabel(kind)}
            </option>
          ))}
        </select>
      </div>

      {node.kind !== 'container' && (
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
           disabled={readOnly} />
        </div>
      )}

      {node.kind === 'recorder' && (
        <div className="field">
          <label className="field-label" htmlFor="node-recorder-type">
            {t('inspector.recorderType')}
          </label>
          <select
            id="node-recorder-type"
            value={node.recorderType ?? 'dvr'}
            onChange={(event) =>
              onUpdateNode(node.id, {
                recorderType: event.target.value as 'dvr' | 'nvr',
              })
            }
           disabled={readOnly}>
            <option value="dvr">{t('inspector.recorder.dvr')}</option>
            <option value="nvr">{t('inspector.recorder.nvr')}</option>
          </select>
        </div>
      )}

      {node.kind === 'isp' && (
        <div className="field">
          <label className="field-label" htmlFor="node-isp-connection">
            {t('inspector.ispConnectionType')}
          </label>
          <select
            id="node-isp-connection"
            value={node.ispConnectionType ?? 'pppoe'}
            onChange={(event) =>
              onUpdateNode(node.id, {
                ispConnectionType: event.target.value as IspConnectionType,
              })
            }
           disabled={readOnly}>
            {ISP_CONNECTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`inspector.isp.${type}`)}
              </option>
            ))}
          </select>
        </div>
      )}

      {node.kind === 'container' && (
        <div className="field">
          <label className="field-label" htmlFor="node-service">
            {t('inspector.containerService')}
          </label>
          <input
            id="node-service"
            value={node.containerService ?? ''}
            placeholder={t('inspector.containerServicePlaceholder')}
            onChange={(event) =>
              onUpdateNode(node.id, { containerService: event.target.value })
            }
           disabled={readOnly} />
          <span className="field-hint">
            {t('inspector.containerServiceHint')}
          </span>
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
           disabled={readOnly}>
            <option value="usb">{t('inspector.printerUsb')}</option>
            <option value="ethernet">{t('inspector.printerEthernet')}</option>
            <option value="wifi">{t('inspector.printerWifi')}</option>
          </select>
        </div>
      )}

      {node.kind === 'isp' && (
        <div className="field">
          <label className="field-label" htmlFor="node-ip">
            {t('inspector.nodeIp')}
          </label>
          <input
            id="node-ip"
            className="mono-input"
            value={node.ip ?? ''}
            placeholder="203.0.113.10"
            spellCheck={false}
            onChange={(event) =>
              onUpdateNode(node.id, { ip: event.target.value })
            }
           disabled={readOnly} />
        </div>
      )}

      {node.kind !== 'usb' &&
        node.kind !== 'isp' &&
        node.kind !== 'ups' &&
        node.kind !== 'analogCamera' &&
        !(node.kind === 'recorder' && (node.recorderType ?? 'dvr') === 'dvr') &&
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
               disabled={readOnly} />
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
               disabled={readOnly} />
            </div>
          </>
        )}

      {(HARDWARE_KINDS.includes(node.kind) || node.kind === 'mobile') && (
        <HardwareSection
          node={node}
          onUpdateNode={onUpdateNode}
          readOnly={readOnly}
          collapsed={!open.config}
          onToggle={() => toggle('config')}
        />
      )}

      {PORT_KINDS.includes(node.kind) && (
        <PortsSection
          node={node}
          onUpdateNode={onUpdateNode}
          readOnly={readOnly}
          collapsed={!open.ports}
          onToggle={() => toggle('ports')}
        />
      )}

      {node.kind === 'ap' && (
        <AccessPointSection
          node={node}
          onUpdateNode={onUpdateNode}
          readOnly={readOnly}
          collapsed={!open.ap}
          onToggle={() => toggle('ap')}
        />
      )}

      {node.kind === 'router' && (
        <RouterSection
          node={node}
          onUpdateNode={onUpdateNode}
          readOnly={readOnly}
          collapsed={!open.router}
          onToggle={() => toggle('router')}
        />
      )}

      <section className={`hw-section ${open.group ? '' : 'is-collapsed'}`}>
        <button type="button" className="hw-section-head is-toggle" onClick={() => toggle('group')}>
          <span className="hw-section-title">{t('inspector.assignGroup')}</span>
          <span className="hw-section-chevron" aria-hidden="true">{open.group ? '▾' : '▸'}</span>
        </button>
        {open.group && (
          <div className="field">
            <select
              id="node-group"
              value={nodeGroup?.id ?? ''}
              onChange={(event) =>
                onAssignGroup(node.id, event.target.value || null)
              }
             disabled={readOnly}>
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
        )}
      </section>

      <NodeConnectionsSection
        node={node}
        nodes={nodes}
        connections={connections}
        onAddConnection={onAddConnection}
        onUpdateLink={onUpdateLink}
        onDeleteLink={onDeleteLink}
        onSelect={onSelect}
        readOnly={readOnly}
        collapsed={!open.connections}
        onToggle={() => toggle('connections')}
      />

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
         disabled={readOnly} />
      </div>

      <div className="inspector-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={() => onDuplicateNode(node.id)}
         disabled={readOnly}>
          <Icon name="copy" size={15} />
          {t('inspector.duplicateDevice')}
        </button>
        <button
          type="button"
          className="danger-button"
          onClick={() => onDeleteNode(node.id)}
         disabled={readOnly}>
          <Icon name="trash" size={15} />
          {t('common.delete')}
        </button>
      </div>
    </>
  )
}


interface NodeConnectionsSectionProps {
  node: DeviceNode
  nodes: DeviceNode[]
  connections: Connection[]
  onAddConnection: (from: string, to: string, kind?: LinkKind) => void
  onUpdateLink: (id: string, patch: Partial<Connection>) => void
  onDeleteLink: (id: string) => void
  onSelect: (selection: import('../types').Selection) => void
  readOnly?: boolean
  collapsed?: boolean
  onToggle?: () => void
}

function NodeConnectionsSection({
  node,
  nodes,
  connections,
  onAddConnection,
  onUpdateLink,
  onDeleteLink,
  onSelect,
  readOnly = false,
  collapsed = false,
  onToggle,
}: NodeConnectionsSectionProps) {
  const { t } = useTranslation()
  const nodeLabel = (n?: DeviceNode) => n ? (n.name || t(`devices.${n.kind}.label`, { defaultValue: DEVICE_META[n.kind].label })) : '—'
  const related = connections.filter((c) => c.from === node.id || c.to === node.id)
  const connectedIds = new Set(related.map((c) => (c.from === node.id ? c.to : c.from)))
  const targets = nodes.filter((n) => n.id !== node.id && !connectedIds.has(n.id))
  const [targetId, setTargetId] = useState('')
  const [kind, setKind] = useState<LinkKind>('ethernet')

  const add = () => {
    if (!targetId) return
    onAddConnection(node.id, targetId, kind)
    setTargetId('')
  }

  const head = onToggle ? (
    <button type="button" className="hw-section-head is-toggle" onClick={onToggle}>
      <span className="hw-section-title">{t('inspector.connectionsOfNode')}</span>
      <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8 }}>
        <span className="hw-section-hint">{related.length}</span>
        <span className="hw-section-chevron" aria-hidden="true">{collapsed ? '▸' : '▾'}</span>
      </span>
    </button>
  ) : (
    <header className="hw-section-head">
      <span className="hw-section-title">{t('inspector.connectionsOfNode')}</span>
      <span className="hw-section-hint">{related.length}</span>
    </header>
  )

  return (
    <section className={`hw-section ${collapsed ? 'is-collapsed' : ''}`}>
      {head}
      {!collapsed && (<>
      {related.length === 0 && <p className="hw-empty">{t('inspector.noConnections')}</p>}

      <div className="hw-list">
        {related.map((c) => {
          const otherId = c.from === node.id ? c.to : c.from
          const other = nodes.find((n) => n.id === otherId)
          const protocol = c.vpnProtocol ?? 'wireguard'
          return (
            <div className="hw-item" key={c.id}>
              <div className="hw-row">
                <button type="button" className="member-row" onClick={() => onSelect({ type: 'link', id: c.id })} style={{ flex: 1, textAlign: 'left' }}>
                  <span className="member-icon" style={{ '--device-color': LINK_META[c.kind].color } as CSSProperties}>
                    <span style={{ width: 10, height: 10, borderRadius: 999, background: LINK_META[c.kind].color, display: 'inline-block' }} />
                  </span>
                  <span className="member-text">
                    <strong>{nodeLabel(other)}</strong>
                    <span>{t(`links.${c.kind}`, { defaultValue: LINK_META[c.kind].label })}{c.label ? ` · ${c.label}` : ''}</span>
                  </span>
                </button>
                <button type="button" className="hw-remove" onClick={() => onDeleteLink(c.id)} disabled={readOnly} title={t('common.delete')} aria-label={t('common.delete')}>
                  <Icon name="trash" size={13} />
                </button>
              </div>
              <div className="hw-row is-sub">
                <select aria-label={t('inspector.linkType')} value={c.kind} onChange={(e) => {
                  const nextKind = e.target.value as LinkKind
                  if (nextKind === 'vpn') onUpdateLink(c.id, { kind: nextKind, vpnProtocol: c.vpnProtocol ?? 'wireguard' })
                  else onUpdateLink(c.id, { kind: nextKind })
                }} disabled={readOnly}>
                  {LINK_KINDS.map((k) => <option key={k} value={k}>{t(`links.${k}`, { defaultValue: LINK_META[k].label })}</option>)}
                </select>
                {c.kind === 'vpn' && (
                  <select aria-label={t('inspector.vpnProtocol')} value={protocol} onChange={(e) => onUpdateLink(c.id, { kind: 'vpn', vpnProtocol: e.target.value as VpnProtocol })} disabled={readOnly}>
                    {VPN_PROTOCOLS.map((p) => <option key={p} value={p}>{t(`vpn.${p}.label`, { defaultValue: VPN_PROTOCOL_META[p].label })}</option>)}
                  </select>
                )}
              </div>
              <div className="hw-row is-sub">
                <input value={c.label} placeholder={t('inspector.linkLabel')} aria-label={t('inspector.linkLabel')} onChange={(e) => onUpdateLink(c.id, { label: e.target.value })} disabled={readOnly} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="hw-subsection">
        <div className="hw-subhead"><span>{t('inspector.createConnection')}</span></div>
        <div className="field">
          <label className="field-label" htmlFor={`conn-target-${node.id}`}>
            {t('common.devices')}
          </label>
          <select
            id={`conn-target-${node.id}`}
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            disabled={readOnly || targets.length === 0}
          >
            <option value="">{t('inspector.selectDevice')}</option>
            {targets.map((n) => (
              <option key={n.id} value={n.id}>{nodeLabel(n)}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor={`conn-kind-${node.id}`}>
            {t('inspector.linkType')}
          </label>
          <select
            id={`conn-kind-${node.id}`}
            value={kind}
            onChange={(e) => setKind(e.target.value as LinkKind)}
            disabled={readOnly}
          >
            {LINK_KINDS.map((k) => (
              <option key={k} value={k}>{t(`links.${k}`, { defaultValue: LINK_META[k].label })}</option>
            ))}
          </select>
        </div>
        <button type="button" className="hw-add is-wide" onClick={add} disabled={readOnly || !targetId}>
          <Icon name="plus" size={13} />
          {t('inspector.addConnection')}
        </button>
      </div>
      </>)}
    </section>
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
  readOnly?: boolean
  collapsed?: boolean
  onToggle?: () => void
}

function HardwareSection({ node, onUpdateNode, readOnly = false, collapsed = false, onToggle }: HardwareSectionProps) {
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
  const showHardware = HARDWARE_KINDS.includes(node.kind)
  const summary =
    showHardware && disks.length > 0
      ? `${disks.length} ${pluralWord(disks.length, 'inspector.diskWord_one', 'inspector.diskWord_few', 'inspector.diskWord_many')} · ${diskTotalLabel(disks)}`
      : showHardware
        ? t('inspector.notFilled')
        : (node.os || t('inspector.notFilled'))

  const head = onToggle ? (
    <button type="button" className="hw-section-head is-toggle" onClick={onToggle}>
      <span className="hw-section-title">{t('inspector.hardwareConfig')}</span>
      <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8 }}>
        <span className="hw-section-hint">{summary}</span>
        <span className="hw-section-chevron" aria-hidden="true">{collapsed ? '▸' : '▾'}</span>
      </span>
    </button>
  ) : (
    <header className="hw-section-head">
      <span className="hw-section-title">{t('inspector.hardwareConfig')}</span>
      <span className="hw-section-hint">{summary}</span>
    </header>
  )

  return (
    <section className={`hw-section ${collapsed ? 'is-collapsed' : ''}`}>
      {head}
      {!collapsed && (<>
      {OS_KINDS.includes(node.kind) && (
        <div className="field">
          <label className="field-label" htmlFor="node-os">
            {t('inspector.nodeOs')}
          </label>
          <div className="os-picker" role="group" aria-label={t('inspector.nodeOs')}>
            {OS_PRESETS.map((preset) => {
              const active = getOsPreset(node.os)?.id === preset.id
              return (
                <button
                  key={preset.id}
                  type="button"
                  className={`os-preset ${active ? 'is-active' : ''}`}
                  title={preset.label}
                  aria-label={preset.label}
                  aria-pressed={active}
                  onClick={() => onUpdateNode(node.id, { os: preset.label })}
                 disabled={readOnly}>
                  <OsIcon os={preset.label} size={15} />
                </button>
              )
            })}
          </div>
          <input
            id="node-os"
            value={node.os ?? ''}
            placeholder={t('inspector.nodeOsPlaceholder')}
            onChange={(event) =>
              onUpdateNode(node.id, { os: event.target.value })
            }
           disabled={readOnly} />
        </div>
      )}
      {node.kind === 'mobile' && (
        <div className="field">
          <label className="field-label">{t('inspector.mobilePlatform')}</label>
          <div className="os-picker" role="group" aria-label={t('inspector.mobilePlatform')}>
            {MOBILE_OS_PRESETS.map((preset) => {
              const active =
                node.mobileOs === preset.id || getOsPreset(node.os)?.id === preset.id
              return (
                <button
                  key={preset.id}
                  type="button"
                  className={`os-preset ${active ? 'is-active' : ''}`}
                  title={preset.label}
                  aria-label={preset.label}
                  aria-pressed={active}
                  onClick={() =>
                    onUpdateNode(node.id, {
                      mobileOs: preset.id as MobileOs,
                      os: preset.label,
                    })
                  }
                 disabled={readOnly}>
                  <OsIcon os={preset.label} size={15} />
                </button>
              )
            })}
          </div>
          <select
            id="node-mobile-os"
            value={node.mobileOs ?? (getOsPreset(node.os)?.id === 'ios' ? 'ios' : 'android')}
            onChange={(event) => {
              const mobileOs = event.target.value as MobileOs
              onUpdateNode(node.id, {
                mobileOs,
                os: mobileOs === 'ios' ? 'iOS' : 'Android',
              })
            }}
           disabled={readOnly}>
            <option value="android">Android</option>
            <option value="ios">iOS</option>
          </select>
        </div>
      )}
      {showHardware && (<>
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
           disabled={readOnly} />
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
           disabled={readOnly} />
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
           disabled={readOnly} />
        </div>
      </div>

      <div className="hw-subsection">
        <div className="hw-subhead">
          <span>{t('inspector.storage')}</span>
          <button type="button" className="hw-add" onClick={addDisk} disabled={readOnly}>
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
                 disabled={readOnly}>
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
                   disabled={readOnly} />
                  <span>GB</span>
                </span>
                <button
                  type="button"
                  className="hw-remove"
                  onClick={() => removeDisk(disk.id)}
                  title={t('inspector.removeDisk')}
                  aria-label={t('inspector.removeDisk')}
                 disabled={readOnly}>
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
                 disabled={readOnly}>
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
          <button type="button" className="hw-add" onClick={addRaid} disabled={readOnly}>
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
                     disabled={readOnly} />
                    <button
                      type="button"
                      className="hw-remove"
                      onClick={() => removeRaid(raid.id)}
                      title={t('inspector.removeRaid')}
                      aria-label={t('inspector.removeRaid')}
                     disabled={readOnly}>
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
                     disabled={readOnly}>
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
      </>)}
      </>)}
    </section>
  )
}


function AccessPointSection({
  node,
  onUpdateNode,
  readOnly = false,
  collapsed = false,
  onToggle,
}: {
  node: DeviceNode
  onUpdateNode: (id: string, patch: Partial<DeviceNode>) => void
  readOnly?: boolean
  collapsed?: boolean
  onToggle?: () => void
}) {
  const { t, i18n } = useTranslation()
  const wifiNetworks = node.wifiNetworks ?? []
  const dhcpSubnets = node.apDhcpSubnets ?? []
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

  const updateSubnet = (id: string, value: Partial<DhcpSubnet>) => {
    patch({
      apDhcpSubnets: dhcpSubnets.map((item) =>
        item.id === id ? { ...item, ...value } : item,
      ),
    })
  }
  const addSubnet = () => {
    patch({
      apDhcpSubnets: [
        ...dhcpSubnets,
        { id: createRowId(), vlan: '', subnet: '', description: '' },
      ],
    })
  }
  const removeSubnet = (id: string) => {
    patch({ apDhcpSubnets: dhcpSubnets.filter((item) => item.id !== id) })
  }

  const copyPassword = async (password: string) => {
    try {
      await navigator.clipboard?.writeText(password ?? '')
    } catch {
      /* ignore */
    }
  }

  const summary = `${wifiNetworks.length} ${(() => { const n=wifiNetworks.length; if (i18n.resolvedLanguage==='en') return n===1?t('inspector.netWord_one'):t('inspector.netWord_many'); const m10=n%10,m100=n%100; return m10===1&&m100!==11?t('inspector.netWord_one'):m10>=2&&m10<=4&&(m100<12||m100>14)?t('inspector.netWord_few'):t('inspector.netWord_many') })()}`
  const head = onToggle ? (
    <button type="button" className="hw-section-head is-toggle" onClick={onToggle}>
      <span className="hw-section-title">{t('inspector.apSettings')}</span>
      <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8 }}>
        <span className="hw-section-hint">{summary}</span>
        <span className="hw-section-chevron" aria-hidden="true">{collapsed ? '▸' : '▾'}</span>
      </span>
    </button>
  ) : (
    <header className="hw-section-head">
      <span className="hw-section-title">{t('inspector.apSettings')}</span>
      <span className="hw-section-hint">{summary}</span>
    </header>
  )

  return (
    <section className={`hw-section ${collapsed ? 'is-collapsed' : ''}`}>
      {head}
      {!collapsed && (<>
      <div className="hw-subsection">
        <div className="hw-subhead">
          <span>{t('inspector.wifiNetworks')}</span>
        </div>
        <div className="hw-list">
          {wifiNetworks.map((network, index) => {
            const bound = dhcpSubnets.find((s) => s.id === network.dhcpSubnetId)
            return (
            <div className="hw-item" key={network.id}>
              <div className="hw-row hw-row-labeled">
                <label className="hw-inline-label">{t('inspector.ssid')}</label>
                <input
                  value={network.ssid}
                  placeholder={`SSID ${index + 1}`}
                  aria-label={t('inspector.ssid')}
                  onChange={(event) =>
                    updateNetwork(network.id, { ssid: event.target.value })
                  }
                 disabled={readOnly} />
                {wifiNetworks.length > 1 && (
                  <button
                    type="button"
                    className="hw-remove"
                    onClick={() => removeNetwork(network.id)}
                    title={t('inspector.removeNetwork')}
                    aria-label={t('inspector.removeNetwork')}
                   disabled={readOnly}>
                    <Icon name="trash" size={13} />
                  </button>
                )}
              </div>
              <div className="hw-row hw-row-labeled">
                <label className="hw-inline-label">{t('inspector.wifiPassword')}</label>
                <input
                  value={network.password}
                  placeholder={t('inspector.wifiPassword')}
                  aria-label={t('inspector.wifiPasswordAria')}
                  onChange={(event) =>
                    updateNetwork(network.id, { password: event.target.value })
                  }
                 disabled={readOnly} />
                <button
                  type="button"
                  className="hw-copy-btn"
                  onClick={() => void copyPassword(network.password)}
                  title={t('inspector.copyPassword')}
                  aria-label={t('inspector.copyPassword')}
                  disabled={readOnly || !network.password}
                >
                  <Icon name="copy" size={13} />
                </button>
              </div>
              <div className="hw-row hw-row-labeled">
                <label className="hw-inline-label">{t('inspector.wifiDhcpSubnet')}</label>
                <select
                  aria-label={t('inspector.wifiDhcpSubnet')}
                  value={network.dhcpSubnetId ?? ''}
                  onChange={(event) =>
                    updateNetwork(network.id, { dhcpSubnetId: event.target.value || undefined })
                  }
                  disabled={readOnly}
                >
                  <option value="">{t('inspector.noSubnetBinding')}</option>
                  {dhcpSubnets.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.vlan !== '' ? `VLAN ${s.vlan} · ` : ''}{s.subnet || s.description || s.id}
                    </option>
                  ))}
                </select>
              </div>
              {bound && (
                <p className="hw-raid-hint">
                  {t('inspector.wifiBoundToSubnet')}: {bound.vlan !== '' ? `VLAN ${bound.vlan} · ` : ''}{bound.subnet || bound.description || '—'}
                </p>
              )}
            </div>
          )})}
        </div>
        <button type="button" className="hw-add is-wide" onClick={addNetwork} disabled={readOnly}>
          <Icon name="plus" size={13} />
          {t('inspector.addWifiNetwork')}
        </button>
      </div>

      <div className="hw-subsection">
        <div className="hw-subhead">
          <span>{t('inspector.dhcpSubnets')}</span>
          <button type="button" className="hw-add" onClick={addSubnet} disabled={readOnly}>
            <Icon name="plus" size={13} />
            {t('inspector.addSubnet')}
          </button>
        </div>
        <p className="hw-empty">{t('inspector.dhcpBinding')}: {t('inspector.wifiDhcpSubnet')}</p>
        {dhcpSubnets.length === 0 && (
          <p className="hw-empty">{t('inspector.addSubnetHint')}</p>
        )}
        <div className="hw-list">
          {dhcpSubnets.map((subnet) => (
            <div className="hw-item" key={subnet.id}>
              <div className="hw-row">
                <input
                  type="number"
                  min={1}
                  max={4094}
                  value={subnet.vlan}
                  placeholder={t('inspector.vlanNumber')}
                  aria-label={t('inspector.vlanNumber')}
                  onChange={(event) =>
                    updateSubnet(subnet.id, {
                      vlan:
                        event.target.value === ''
                          ? ''
                          : Math.max(1, Number(event.target.value)),
                    })
                  }
                 disabled={readOnly} />
                <input
                  className="mono-input"
                  value={subnet.subnet}
                  placeholder="192.168.10.0/24"
                  aria-label={t('inspector.dhcpNetwork')}
                  onChange={(event) =>
                    updateSubnet(subnet.id, { subnet: event.target.value })
                  }
                 disabled={readOnly} />
                <button
                  type="button"
                  className="hw-remove"
                  onClick={() => removeSubnet(subnet.id)}
                  title={t('inspector.removeSubnet')}
                  aria-label={t('inspector.removeSubnet')}
                 disabled={readOnly}>
                  <Icon name="trash" size={13} />
                </button>
              </div>
              <div className="hw-row is-sub">
                <input
                  value={subnet.description}
                  placeholder={t('inspector.subnetDescription')}
                  aria-label={t('inspector.subnetDescription')}
                  onChange={(event) =>
                    updateSubnet(subnet.id, { description: event.target.value })
                  }
                 disabled={readOnly} />
              </div>
            </div>
          ))}
        </div>
      </div>
      </>)}
    </section>
  )
}

function RouterSection({
  node,
  onUpdateNode,
  readOnly = false,
  collapsed = false,
  onToggle,
}: {
  node: DeviceNode
  onUpdateNode: (id: string, patch: Partial<DeviceNode>) => void
  readOnly?: boolean
  collapsed?: boolean
  onToggle?: () => void
}) {
  const { t } = useTranslation()
  const patch = (value: Partial<DeviceNode>) => onUpdateNode(node.id, value)
  const wifiEnabled = node.routerWifiEnabled ?? false
  const wifiNetworks = node.wifiNetworks ?? []
  const dhcpSubnets = node.routerDhcpSubnets ?? []

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
    patch({ wifiNetworks: next })
  }

  const updateSubnet = (id: string, value: Partial<DhcpSubnet>) => {
    patch({
      routerDhcpSubnets: dhcpSubnets.map((item) =>
        item.id === id ? { ...item, ...value } : item,
      ),
    })
  }
  const addSubnet = () => {
    patch({
      routerDhcpSubnets: [
        ...dhcpSubnets,
        { id: createRowId(), vlan: '', subnet: '', description: '' },
      ],
    })
  }
  const removeSubnet = (id: string) => {
    patch({ routerDhcpSubnets: dhcpSubnets.filter((item) => item.id !== id) })
  }

  const head = onToggle ? (
    <button type="button" className="hw-section-head is-toggle" onClick={onToggle}>
      <span className="hw-section-title">{t('inspector.routerSettings')}</span>
      <span className="hw-section-chevron" aria-hidden="true">{collapsed ? '▸' : '▾'}</span>
    </button>
  ) : (
    <header className="hw-section-head">
      <span className="hw-section-title">{t('inspector.routerSettings')}</span>
    </header>
  )

  return (
    <section className={`hw-section ${collapsed ? 'is-collapsed' : ''}`}>
      {head}
      {!collapsed && (<>

      <div className="hw-subsection">
        <div className="field">
          <label className="field-label" htmlFor="router-wifi-enabled">
            {t('inspector.wifi')}
          </label>
          <select
            id="router-wifi-enabled"
            value={wifiEnabled ? 'yes' : 'no'}
            onChange={(event) => {
              const enabled = event.target.value === 'yes'
              patch({
                routerWifiEnabled: enabled,
                wifiNetworks:
                  enabled && wifiNetworks.length === 0
                    ? [{ id: createRowId(), ssid: '', password: '' }]
                    : wifiNetworks,
              })
            }}
           disabled={readOnly}>
            <option value="no">{t('common.no')}</option>
            <option value="yes">{t('common.yes')}</option>
          </select>
        </div>

        {wifiEnabled && (
          <>
            <div className="hw-subhead">
              <span>{t('inspector.wifiNetworks')}</span>
            </div>
            <div className="hw-list">
              {wifiNetworks.map((network, index) => {
                const bound = dhcpSubnets.find((s) => s.id === network.dhcpSubnetId)
                const copyPassword = async (password: string) => {
                  try { await navigator.clipboard?.writeText(password ?? '') } catch { /* ignore */ }
                }
                return (
                <div className="hw-item" key={network.id}>
                  <div className="hw-row hw-row-labeled">
                    <label className="hw-inline-label">{t('inspector.ssid')}</label>
                    <input
                      value={network.ssid}
                      placeholder={`SSID ${index + 1}`}
                      aria-label={t('inspector.ssid')}
                      onChange={(event) =>
                        updateNetwork(network.id, { ssid: event.target.value })
                      }
                     disabled={readOnly} />
                    <button
                      type="button"
                      className="hw-remove"
                      onClick={() => removeNetwork(network.id)}
                      title={t('inspector.removeNetwork')}
                      aria-label={t('inspector.removeNetwork')}
                     disabled={readOnly}>
                      <Icon name="trash" size={13} />
                    </button>
                  </div>
                  <div className="hw-row hw-row-labeled">
                    <label className="hw-inline-label">{t('inspector.wifiPassword')}</label>
                    <input
                      value={network.password}
                      placeholder={t('inspector.wifiPassword')}
                      aria-label={t('inspector.wifiPasswordAria')}
                      onChange={(event) =>
                        updateNetwork(network.id, { password: event.target.value })
                      }
                     disabled={readOnly} />
                    <button
                      type="button"
                      className="hw-copy-btn"
                      onClick={() => void copyPassword(network.password)}
                      title={t('inspector.copyPassword')}
                      aria-label={t('inspector.copyPassword')}
                      disabled={readOnly || !network.password}
                    >
                      <Icon name="copy" size={13} />
                    </button>
                  </div>
                  <div className="hw-row hw-row-labeled">
                    <label className="hw-inline-label">{t('inspector.wifiDhcpSubnet')}</label>
                    <select
                      aria-label={t('inspector.wifiDhcpSubnet')}
                      value={network.dhcpSubnetId ?? ''}
                      onChange={(event) =>
                        updateNetwork(network.id, { dhcpSubnetId: event.target.value || undefined })
                      }
                      disabled={readOnly}
                    >
                      <option value="">{t('inspector.noSubnetBinding')}</option>
                      {dhcpSubnets.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.vlan !== '' ? `VLAN ${s.vlan} · ` : ''}{s.subnet || s.description || s.id}
                        </option>
                      ))}
                    </select>
                  </div>
                  {bound && (
                    <p className="hw-raid-hint">
                      {t('inspector.wifiBoundToSubnet')}: {bound.vlan !== '' ? `VLAN ${bound.vlan} · ` : ''}{bound.subnet || bound.description || '—'}
                    </p>
                  )}
                </div>
              )})}
            </div>
            <button type="button" className="hw-add is-wide" onClick={addNetwork} disabled={readOnly}>
              <Icon name="plus" size={13} />
              {t('inspector.addWifiNetwork')}
            </button>
          </>
        )}
      </div>

      <div className="hw-subsection">
        <div className="hw-subhead">
          <span>{t('inspector.dhcpSubnets')}</span>
          <button type="button" className="hw-add" onClick={addSubnet} disabled={readOnly}>
            <Icon name="plus" size={13} />
            {t('inspector.addSubnet')}
          </button>
        </div>
        <p className="hw-empty">{t('inspector.dhcpBinding')}: {t('inspector.wifiDhcpSubnet')}</p>
        {dhcpSubnets.length === 0 && (
          <p className="hw-empty">{t('inspector.addSubnetHint')}</p>
        )}
        <div className="hw-list">
          {dhcpSubnets.map((subnet) => (
            <div className="hw-item" key={subnet.id}>
              <div className="hw-row">
                <input
                  type="number"
                  min={1}
                  max={4094}
                  value={subnet.vlan}
                  placeholder={t('inspector.vlanNumber')}
                  aria-label={t('inspector.vlanNumber')}
                  onChange={(event) =>
                    updateSubnet(subnet.id, {
                      vlan:
                        event.target.value === ''
                          ? ''
                          : Math.max(1, Number(event.target.value)),
                    })
                  }
                 disabled={readOnly} />
                <input
                  className="mono-input"
                  value={subnet.subnet}
                  placeholder="192.168.10.0/24"
                  aria-label={t('inspector.dhcpNetwork')}
                  onChange={(event) =>
                    updateSubnet(subnet.id, { subnet: event.target.value })
                  }
                 disabled={readOnly} />
                <button
                  type="button"
                  className="hw-remove"
                  onClick={() => removeSubnet(subnet.id)}
                  title={t('inspector.removeSubnet')}
                  aria-label={t('inspector.removeSubnet')}
                 disabled={readOnly}>
                  <Icon name="trash" size={13} />
                </button>
              </div>
              <div className="hw-row is-sub">
                <input
                  value={subnet.description}
                  placeholder={t('inspector.subnetDescription')}
                  aria-label={t('inspector.subnetDescription')}
                  onChange={(event) =>
                    updateSubnet(subnet.id, { description: event.target.value })
                  }
                 disabled={readOnly} />
              </div>
            </div>
          ))}
        </div>
      </div>
      </>)}
    </section>
  )
}

interface PortsSectionProps {
  node: DeviceNode
  onUpdateNode: (id: string, patch: Partial<DeviceNode>) => void
  readOnly?: boolean
  collapsed?: boolean
  onToggle?: () => void
}

function PortsSection({ node, onUpdateNode, readOnly = false, collapsed = false, onToggle }: PortsSectionProps) {
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

  const head = onToggle ? (
    <button type="button" className="hw-section-head is-toggle" onClick={onToggle}>
      <span className="hw-section-title">{title}</span>
      <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8 }}>
        <span className="hw-section-hint">{summary}</span>
        <span className="hw-section-chevron" aria-hidden="true">{collapsed ? '▸' : '▾'}</span>
      </span>
    </button>
  ) : (
    <header className="hw-section-head">
      <span className="hw-section-title">{title}</span>
      <span className="hw-section-hint">{summary}</span>
    </header>
  )

  return (
    <section className={`hw-section ${collapsed ? 'is-collapsed' : ''}`}>
      {head}
      {!collapsed && (<>
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
               disabled={readOnly}>
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
                 disabled={readOnly} />
                <span>–</span>
                <input
                  type="number"
                  min={1}
                  max={4096}
                  inputMode="numeric"
                  aria-label={t('inspector.portLast')}
                  value={port.to}
                  onChange={(event) => setRange(port, 'to', event.target.value)}
                 disabled={readOnly} />
              </span>
              <button
                type="button"
                className="hw-remove"
                onClick={() =>
                  patch(ports.filter((item) => item.id !== port.id))
                }
                title={t('inspector.removePorts')}
                aria-label={t('inspector.removePorts')}
               disabled={readOnly}>
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
               disabled={readOnly} />
            </div>
          </div>
        ))}
      </div>

      <button type="button" className="hw-add is-wide" onClick={addPort} disabled={readOnly}>
        <Icon name="plus" size={13} />
        {t('inspector.addPorts')}
      </button>
      </>)}
    </section>
  )
}

interface LinkFormProps {
  link: Connection
  linkFrom?: DeviceNode
  linkTo?: DeviceNode
  onUpdateLink: (id: string, patch: Partial<Connection>) => void
  onDeleteLink: (id: string) => void
  readOnly?: boolean
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
  readOnly = false,
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
         disabled={readOnly}>
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
           disabled={readOnly}>
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
         disabled={readOnly} />
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
         disabled={readOnly}>
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
  groups: DeviceGroup[]
  onUpdateGroup: (id: string, patch: Partial<DeviceGroup>) => void
  onSelectNodes: (ids: string[]) => void
  onUngroup: (id: string) => void
  readOnly?: boolean
}

function GroupForm({
  group,
  groupNodes,
  groups,
  onUpdateGroup,
  onSelectNodes,
  onUngroup,
  readOnly = false,
}: GroupFormProps) {
  const childGroups = groups.filter((g) => (group.groupIds ?? []).includes(g.id))
  const { t } = useTranslation()
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
            {group.nodeIds.length + (group.groupIds ?? []).length}{' '}
            {t('inspector.groupMembers').toLowerCase()}
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
         disabled={readOnly} />
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
             disabled={readOnly} />
          ))}
        </div>
      </div>

      <div className="field">
        <span className="field-label">{t('inspector.groupMembers')}</span>
        <ul className="member-list">
          {childGroups.map((cg) => (
            <li key={cg.id}>
              <div className="member-row">
                <span className="member-icon" style={{ '--device-color': cg.color } as CSSProperties}>
                  <Icon name="group" size={15} />
                </span>
                <span className="member-text">
                  <strong>{cg.name || t('canvas.groupDefault')}</strong>
                  <span>{t('inspector.titleGroup')}</span>
                </span>
                <code>{cg.nodeIds.length + (cg.groupIds ?? []).length}</code>
              </div>
            </li>
          ))}
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
         disabled={readOnly}>
          <Icon name="ungroup" size={15} />
          {t('inspector.ungroupWide')}
        </button>
      </div>
    </>
  )
}

interface MultiSelectionFormProps {
  selectedNodes: DeviceNode[]
  selectedGroupsList: DeviceGroup[]
  onCreateGroup: (nodeIds: string[], groupIds?: string[]) => void
  onSelectNodes: (ids: string[]) => void
  onDeleteNodes: (ids: string[]) => void
  onUngroup: (id: string) => void
  readOnly?: boolean
}

function MultiSelectionForm({
  selectedNodes,
  selectedGroupsList,
  onCreateGroup,
  onSelectNodes,
  onDeleteNodes,
  onUngroup,
  readOnly = false,
}: MultiSelectionFormProps) {
  const { t } = useTranslation()
  const deviceLabel = (kind: DeviceKind) => t(`devices.${kind}.label`, { defaultValue: DEVICE_META[kind].label })
  const total = selectedNodes.length + selectedGroupsList.length
  return (
    <>
      <div className="multi-summary">
        <span className="multi-badge">{total}</span>
        <span className="multi-summary-text">
          <strong>{t('inspector.multiSelected')}</strong>
          <span>
            {t('inspector.multiHint')}
          </span>
        </span>
      </div>

      <ul className="member-list is-multi">
        {selectedGroupsList.map((g) => (
          <li key={g.id}>
            <button
              type="button"
              className="member-row"
              onClick={() => onUngroup(g.id)}
              title={t('inspector.ungroup')}
            >
              <span
                className="member-icon"
                style={{ '--device-color': g.color } as CSSProperties}
              >
                <Icon name="group" size={15} />
              </span>
              <span className="member-text">
                <strong>{g.name || t('canvas.groupDefault')}</strong>
                <span>{t('inspector.titleGroup')}</span>
              </span>
              <code>{g.nodeIds.length + (g.groupIds ?? []).length}</code>
            </button>
          </li>
        ))}
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
          onClick={() => onCreateGroup(selectedNodes.map((m) => m.id), selectedGroupsList.map((g) => g.id))}
          disabled={total < 2 || readOnly}
        >
          <Icon name="group" size={15} />
          {t('inspector.mergeGroup')}
        </button>
        <button
          type="button"
          className="danger-button is-wide"
          onClick={() => {
            if (selectedNodes.length > 0) onDeleteNodes(selectedNodes.map((m) => m.id))
            selectedGroupsList.forEach((g) => onUngroup(g.id))
          }}
         disabled={readOnly}>
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

      <div className="field link-legend-field">
        <span className="field-label">{t('inspector.linkLegend')}</span>
        <ul className="member-list link-legend">
          {LINK_KINDS.map((kind) => (
            <li key={kind}>
              <div className="member-row is-legend">
                <span className="link-legend-swatch" aria-hidden="true">
                  <span
                    className="link-legend-line"
                    style={{
                      background: LINK_META[kind].color,
                      borderTop: LINK_META[kind].dash ? `2px dashed ${LINK_META[kind].color}` : undefined,
                      height: LINK_META[kind].dash ? 0 : 2,
                    }}
                  />
                </span>
                <span className="member-text">
                  <strong>{t(`links.${kind}`, { defaultValue: LINK_META[kind].label })}</strong>
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="inspector-tip">
        <span className="tip-dot" />
        {t('inspector.autoSaveTip')}
      </div>
    </>
  )
}
