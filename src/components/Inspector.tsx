import type { CSSProperties } from 'react'
import {
  DEVICE_META,
  DEVICE_ORDER,
  DISK_TYPES,
  DISK_TYPE_META,
  GROUP_COLORS,
  HARDWARE_KINDS,
  LINK_KINDS,
  LINK_META,
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
  pluralRu,
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
  const hasSelection =
    Boolean(node || link || group) || selectedNodes.length > 0
  const title = node
    ? 'Устройство'
    : link
      ? 'Связь'
      : group
        ? 'Группа'
        : selectedNodes.length > 0
          ? 'Выделение'
          : 'Параметры'

  return (
    <aside className={`inspector ${hasSelection ? 'is-open' : ''}`}>
      <div className="inspector-inner">
        <header className="inspector-head">
          <div>
            <div className="inspector-eyebrow">Инспектор</div>
            <h2>{title}</h2>
          </div>
          <div className="inspector-head-actions">
            {hasSelection && (
              <button
                type="button"
                className="icon-button"
                onClick={onClose}
                aria-label="Снять выделение"
                title="Снять выделение"
              >
                <Icon name="close" size={16} />
              </button>
            )}
            <button
              type="button"
              className="icon-button"
              onClick={onHidePanel}
              aria-label="Скрыть инспектор"
              title="Скрыть инспектор"
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
  const meta = DEVICE_META[node.kind]

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
          <strong>{node.name || meta.label}</strong>
          <span>{meta.hint}</span>
        </span>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="node-name">
          Название
        </label>
        <input
          id="node-name"
          value={node.name}
          placeholder={meta.label}
          onChange={(event) =>
            onUpdateNode(node.id, { name: event.target.value })
          }
        />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="node-kind">
          Тип устройства
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
              {DEVICE_META[kind].label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="node-model">
          Модель
        </label>
        <input
          id="node-model"
          value={node.model}
          placeholder="Например, MikroTik hEX S"
          onChange={(event) =>
            onUpdateNode(node.id, { model: event.target.value })
          }
        />
      </div>

      {node.kind === 'printer' && (
        <div className="field">
          <label className="field-label" htmlFor="node-printer-interface">
            Тип подключения
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
            <option value="usb">USB</option>
            <option value="ethernet">Ethernet</option>
            <option value="wifi">Wi-Fi</option>
          </select>
        </div>
      )}

      {node.kind !== 'usb' &&
        !(node.kind === 'printer' && (node.printerInterface ?? 'ethernet') === 'usb') && (
          <>
            <div className="field">
              <label className="field-label" htmlFor="node-ip">
                IP-адрес
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
                MAC-адрес
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
          Заметки
        </label>
        <textarea
          id="node-notes"
          value={node.notes}
          rows={3}
          placeholder="Роль, VLAN, ОС, что ещё важно…"
          onChange={(event) =>
            onUpdateNode(node.id, { notes: event.target.value })
          }
        />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="node-group">
          Группа
        </label>
        <select
          id="node-group"
          value={nodeGroup?.id ?? ''}
          onChange={(event) =>
            onAssignGroup(node.id, event.target.value || null)
          }
        >
          <option value="">Без группы</option>
          {groups.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name || 'Группа'}
            </option>
          ))}
        </select>
        <span className="field-hint">
          Устройство можно перенести в другую группу или убрать из неё.
        </span>
      </div>

      <div className="inspector-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={() => onDuplicateNode(node.id)}
        >
          <Icon name="copy" size={15} />
          Дублировать
        </button>
        <button
          type="button"
          className="danger-button"
          onClick={() => onDeleteNode(node.id)}
        >
          <Icon name="trash" size={15} />
          Удалить
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

  const summary =
    disks.length > 0
      ? `${disks.length} ${pluralRu(
          disks.length,
          'диск',
          'диска',
          'дисков',
        )} · ${diskTotalLabel(disks)}`
      : 'Не заполнено'

  return (
    <section className="hw-section">
      <header className="hw-section-head">
        <span className="hw-section-title">Конфигурация</span>
        <span className="hw-section-hint">{summary}</span>
      </header>

      <div className="hw-grid">
        <div className="field hw-grid-wide">
          <label className="field-label" htmlFor="node-cpu">
            CPU
          </label>
          <input
            id="node-cpu"
            value={node.cpu ?? ''}
            placeholder="Intel Xeon E-2288G"
            onChange={(event) => patch({ cpu: event.target.value })}
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="node-cores">
            Ядер / потоков
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
            ОЗУ, GB
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
          <span>Накопители</span>
          <button type="button" className="hw-add" onClick={addDisk}>
            <Icon name="plus" size={13} />
            Диск
          </button>
        </div>

        {disks.length === 0 && (
          <p className="hw-empty">
            Добавьте диски, чтобы указать тип, объём и RAID.
          </p>
        )}

        <div className="hw-list">
          {disks.map((disk) => (
            <div className="hw-item" key={disk.id}>
              <div className="hw-row">
                <select
                  aria-label="Тип диска"
                  value={disk.type}
                  onChange={(event) =>
                    updateDisk(disk.id, {
                      type: event.target.value as DiskType,
                    })
                  }
                >
                  {DISK_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {DISK_TYPE_META[type].label}
                    </option>
                  ))}
                </select>
                <span className="hw-size">
                  <input
                    type="number"
                    min={0}
                    step={100}
                    inputMode="numeric"
                    aria-label="Объём диска, GB"
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
                  title="Удалить диск"
                  aria-label="Удалить диск"
                >
                  <Icon name="trash" size={13} />
                </button>
              </div>
              <div className="hw-row is-sub">
                <span className="hw-sublabel">RAID</span>
                <select
                  aria-label="RAID-массив диска"
                  value={disk.raidId}
                  onChange={(event) =>
                    updateDisk(disk.id, { raidId: event.target.value })
                  }
                >
                  <option value="">Без RAID</option>
                  {raids.map((raid) => (
                    <option key={raid.id} value={raid.id}>
                      {raid.name || 'RAID'} ·{' '}
                      {RAID_LEVEL_META[raid.level].label}
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
          <span>RAID-массивы</span>
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
                      placeholder="Имя массива"
                      aria-label="Имя RAID-массива"
                      onChange={(event) =>
                        updateRaid(raid.id, { name: event.target.value })
                      }
                    />
                    <button
                      type="button"
                      className="hw-remove"
                      onClick={() => removeRaid(raid.id)}
                      title="Удалить RAID"
                      aria-label="Удалить RAID"
                    >
                      <Icon name="trash" size={13} />
                    </button>
                  </div>
                  <div className="hw-row is-sub">
                    <select
                      aria-label="Уровень RAID"
                      value={raid.level}
                      onChange={(event) =>
                        updateRaid(raid.id, {
                          level: event.target.value as RaidLevel,
                        })
                      }
                    >
                      {RAID_LEVELS.map((level) => (
                        <option key={level} value={level}>
                          {RAID_LEVEL_META[level].label}
                        </option>
                      ))}
                    </select>
                    <span className="hw-capacity">
                      {members.length > 0
                        ? `${members.length} ${pluralRu(
                            members.length,
                            'диск',
                            'диска',
                            'дисков',
                          )} · ≈ ${formatCapacity(usable)}`
                        : 'нет дисков'}
                    </span>
                  </div>
                  <p className="hw-raid-hint">
                    {RAID_LEVEL_META[raid.level].hint}
                  </p>
                </div>
              )
            })}
          </div>
        )}

        <span className="hw-section-note">
          Выберите RAID-массив в списке у каждого диска, чтобы объединить их.
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
        <span className="hw-section-title">Wi-Fi сети</span>
        <span className="hw-section-hint">
          {wifiNetworks.length}{' '}
          {pluralRu(wifiNetworks.length, 'сеть', 'сети', 'сетей')}
        </span>
      </header>

      <div className="hw-list">
        {wifiNetworks.map((network, index) => (
          <div className="hw-item" key={network.id}>
            <div className="hw-row">
              <input
                value={network.ssid}
                placeholder={`SSID ${index + 1}`}
                aria-label="SSID"
                onChange={(event) =>
                  updateNetwork(network.id, { ssid: event.target.value })
                }
              />
              {wifiNetworks.length > 1 && (
                <button
                  type="button"
                  className="hw-remove"
                  onClick={() => removeNetwork(network.id)}
                  title="Удалить сеть"
                  aria-label="Удалить сеть"
                >
                  <Icon name="trash" size={13} />
                </button>
              )}
            </div>
            <div className="hw-row is-sub">
              <input
                value={network.password}
                placeholder="Пароль"
                aria-label="Пароль Wi-Fi"
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
        Добавить Wi-Fi сеть
      </button>

      <div className="hw-subsection">
        <div className="field">
          <label className="field-label" htmlFor="ap-dhcp-enabled">
            Собственный DHCP
          </label>
          <select
            id="ap-dhcp-enabled"
            value={node.apDhcpEnabled ? 'yes' : 'no'}
            onChange={(event) =>
              patch({ apDhcpEnabled: event.target.value === 'yes' })
            }
          >
            <option value="no">Нет</option>
            <option value="yes">Да</option>
          </select>
        </div>
        {node.apDhcpEnabled && (
          <div className="field">
            <label className="field-label" htmlFor="ap-dhcp-network">
              Сеть (DHCP)
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
  const ports = node.ports ?? []
  const patch = (next: PortGroup[]) => onUpdateNode(node.id, { ports: next })
  const counts = portsByType(ports)
  const total = portsTotal(ports)

  const isNetworkDevice = node.kind === 'server' || node.kind === 'vm' || node.kind === 'nas'
  const title = isNetworkDevice ? 'Сетевые порты' : 'Порты'
  const summary =
    ports.length > 0
      ? `${total} ${pluralRu(total, 'порт', 'порта', 'портов')}${
          counts.ethernet > 0 ? ` · ${counts.ethernet} Ethernet` : ''
        }${counts.sfp > 0 ? ` · ${counts.sfp} SFP` : ''}`
      : 'Не заполнено'

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
        Например: порты 1–20 — VLAN 10, отдел продаж; 23 — ISP1; 24 — ISP2.
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
                aria-label="Тип портов"
                value={port.type}
                onChange={(event) =>
                  updatePort(port.id, {
                    type: event.target.value as PortType,
                  })
                }
              >
                {PORT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {PORT_TYPE_META[type].label}
                  </option>
                ))}
              </select>
              <span className="hw-range">
                <input
                  type="number"
                  min={1}
                  max={4096}
                  inputMode="numeric"
                  aria-label="Первый порт"
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
                  aria-label="Последний порт"
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
                title="Удалить порты"
                aria-label="Удалить порты"
              >
                <Icon name="trash" size={13} />
              </button>
            </div>
            <div className="hw-row is-sub">
              <span className="hw-count">
                {portCount(port)}{' '}
                {pluralRu(portCount(port), 'порт', 'порта', 'портов')}
              </span>
              <input
                className="hw-note"
                value={port.note}
                placeholder="VLAN 10 · отдел продаж"
                aria-label="Назначение портов"
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
        Добавить порты
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

function nodeLabel(node?: DeviceNode) {
  if (!node) return '—'
  return node.name || DEVICE_META[node.kind].label
}

function LinkForm({
  link,
  linkFrom,
  linkTo,
  onUpdateLink,
  onDeleteLink,
}: LinkFormProps) {
  const meta = LINK_META[link.kind]
  const protocol = link.vpnProtocol ?? 'wireguard'

  return (
    <>
      <div
        className="link-preview"
        style={{ '--link-color': meta.color } as CSSProperties}
      >
        <span className="link-preview-name">{nodeLabel(linkFrom)}</span>
        <span className="link-preview-wire">
          <span className="link-preview-dot" />
          <span className="link-preview-line" />
          <span className="link-preview-dot" />
        </span>
        <span className="link-preview-name is-right">{nodeLabel(linkTo)}</span>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="link-kind">
          Тип связи
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
              {LINK_META[kind].label}
            </option>
          ))}
        </select>
        <span className="field-hint">{meta.label}</span>
      </div>

      {link.kind === 'vpn' && (
        <div className="field">
          <label className="field-label" htmlFor="link-vpn">
            Протокол VPN
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
                {VPN_PROTOCOL_META[item].label}
              </option>
            ))}
          </select>
          <span className="field-hint">
            {VPN_PROTOCOL_META[protocol].description}
          </span>
        </div>
      )}

      <div className="field">
        <label className="field-label" htmlFor="link-label">
          Подпись
        </label>
        <input
          id="link-label"
          value={link.label}
          placeholder={
            link.kind === 'vpn'
              ? VPN_PROTOCOL_META[protocol].label
              : 'Например, 10G DAC или PoE'
          }
          onChange={(event) =>
            onUpdateLink(link.id, { label: event.target.value })
          }
        />
        <span className="field-hint">
          Подпись отображается прямо на линии связи.
          {link.kind === 'vpn' &&
            ' Если оставить пустой — будет показан протокол.'}
        </span>
      </div>

      <div className="link-meta">
        <span
          className="link-kind-swatch"
          style={{ background: meta.color }}
        />
        <span>{meta.label}</span>
        {link.kind === 'vpn' && (
          <span className="link-meta-badge">
            {VPN_PROTOCOL_META[protocol].label}
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
          Удалить связь
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
          <strong>{group.name || 'Группа'}</strong>
          <span>
            {group.nodeIds.length}{' '}
            {group.nodeIds.length === 1 ? 'устройство' : 'устройств'}
          </span>
        </span>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="group-name">
          Название группы
        </label>
        <input
          id="group-name"
          value={group.name}
          placeholder="Например, Серверная"
          onChange={(event) =>
            onUpdateGroup(group.id, { name: event.target.value })
          }
        />
      </div>

      <div className="field">
        <span className="field-label">Цвет группы</span>
        <div className="swatch-row">
          {GROUP_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={`swatch ${group.color === color ? 'is-active' : ''}`}
              style={{ '--swatch-color': color } as CSSProperties}
              onClick={() => onUpdateGroup(group.id, { color })}
              aria-label={`Цвет ${color}`}
              title={color}
            />
          ))}
        </div>
      </div>

      <div className="field">
        <span className="field-label">Устройства в группе</span>
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
                  <strong>{nodeLabel(member)}</strong>
                  <span>{DEVICE_META[member.kind].label}</span>
                </span>
                <code className={member.ip ? '' : 'is-empty'}>
                  {member.ip || '—'}
                </code>
              </button>
            </li>
          ))}
        </ul>
        <span className="field-hint">
          Потяните за заголовок группы на холсте, чтобы переместить все
          устройства сразу.
        </span>
      </div>

      <div className="inspector-actions">
        <button
          type="button"
          className="secondary-button is-wide"
          onClick={() => onUngroup(group.id)}
        >
          <Icon name="ungroup" size={15} />
          Расформировать группу
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
  return (
    <>
      <div className="multi-summary">
        <span className="multi-badge">{selectedNodes.length}</span>
        <span className="multi-summary-text">
          <strong>Выбрано устройств</strong>
          <span>
            Shift, Ctrl или Cmd + клик добавляет и убирает устройства из
            выделения.
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
                <strong>{nodeLabel(member)}</strong>
                <span>{DEVICE_META[member.kind].label}</span>
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
          Объединить в группу
        </button>
        <button
          type="button"
          className="danger-button is-wide"
          onClick={() => onDeleteNodes(selectedNodes.map((member) => member.id))}
        >
          <Icon name="trash" size={15} />
          Удалить выбранные
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
  return (
    <>
      <div className="empty-state">
        <span className="empty-orb">
          <Icon name="cursor" size={22} />
        </span>
        <strong>Выберите элемент</strong>
        <p>
          Кликните по устройству, связи или группе, чтобы изменить их
          параметры.
        </p>
      </div>

      <div className="inspector-stats">
        <div className="stat-card">
          <span className="stat-value">{nodeCount}</span>
          <span className="stat-label">Устройств</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{linkCount}</span>
          <span className="stat-label">Связей</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{groupCount}</span>
          <span className="stat-label">Групп</span>
        </div>
      </div>

      <div className="shortcuts">
        <div className="shortcut-row">
          <span>Выбрать несколько</span>
          <kbd>Shift + клик</kbd>
        </div>
        <div className="shortcut-row">
          <span>Удалить выбранное</span>
          <kbd>Del</kbd>
        </div>
        <div className="shortcut-row">
          <span>Дублировать</span>
          <kbd>Ctrl D</kbd>
        </div>
        <div className="shortcut-row">
          <span>Снять выделение</span>
          <kbd>Esc</kbd>
        </div>
        <div className="shortcut-row">
          <span>Масштаб</span>
          <kbd>Ctrl + колесо</kbd>
        </div>
      </div>

      <div className="inspector-tip">
        <span className="tip-dot" />
        Изменения автоматически сохраняются в этом браузере.
      </div>
    </>
  )
}
