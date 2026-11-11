import { useMemo, useState } from 'react'

import { useTranslation } from 'react-i18next'
import { DEVICE_META, LINK_META, VPN_PROTOCOL_META } from '../devices'
import {
  diskTotalLabel,
  portsTotal,
  portsByType,
} from '../hardware'
import type {
  Connection,
  DeviceGroup,
  DeviceNode,
  Selection,
} from '../types'
import { DeviceIcon } from './DeviceIcon'
import { Icon } from './Icons'

type Tab = 'nodes' | 'connections' | 'groups'

interface TableViewProps {
  nodes: DeviceNode[]
  connections: Connection[]
  groups: DeviceGroup[]
  selection: Selection
  searchQuery: string
  readOnly: boolean
  onSelect: (selection: Selection) => void
  onDeleteNode: (id: string) => void
  onDeleteLink: (id: string) => void
  onUngroup: (id: string) => void
  onShowOnDiagram: (selection: Selection) => void
}

type SortDir = 'asc' | 'desc'

interface SortState {
  key: string
  dir: SortDir
}

function compare(a: string | number, b: string | number, dir: SortDir) {
  if (a < b) return dir === 'asc' ? -1 : 1
  if (a > b) return dir === 'asc' ? 1 : -1
  return 0
}

function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string
  sortKey: string
  sort: SortState
  onSort: (key: string) => void
}) {
  const active = sort.key === sortKey
  return (
    <button type="button" className={`table-sort ${active ? 'is-active' : ''}`} onClick={() => onSort(sortKey)}>
      <span>{label}</span>
      <span className="table-sort-indicator">{active ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}</span>
    </button>
  )
}

export function TableView({
  nodes,
  connections,
  groups,
  selection,
  searchQuery,
  readOnly,
  onSelect,
  onDeleteNode,
  onDeleteLink,
  onUngroup,
  onShowOnDiagram,
}: TableViewProps) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('nodes')
  const [nodeSort, setNodeSort] = useState<SortState>({ key: 'name', dir: 'asc' })
  const [linkSort, setLinkSort] = useState<SortState>({ key: 'from', dir: 'asc' })
  const [groupSort, setGroupSort] = useState<SortState>({ key: 'name', dir: 'asc' })

  const q = searchQuery.trim().toLowerCase()
  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])
  const groupByNodeId = useMemo(() => {
    const map = new Map<string, DeviceGroup>()
    for (const g of groups) for (const id of g.nodeIds) map.set(id, g)
    return map
  }, [groups])

  const deviceLabel = (kind: DeviceNode['kind']) =>
    t(`devices.${kind}.label`, { defaultValue: DEVICE_META[kind].label })

  const nodeDisplayName = (node?: DeviceNode) =>
    node ? node.name || deviceLabel(node.kind) : '—'

  const nodeDetails = (node: DeviceNode) => {
    if (node.kind === 'isp') return t(`inspector.isp.${node.ispConnectionType ?? 'pppoe'}`)
    if (node.kind === 'recorder') return t(`inspector.recorder.${node.recorderType ?? 'dvr'}`)
    if (node.kind === 'container') return node.containerService || '—'
    return node.model || '—'
  }

  const nodeConfigSummary = (node: DeviceNode) => {
    const parts: string[] = []
    if (node.cpu || node.cpuCores) {
      const cpu = [node.cpu, node.cpuCores ? `${node.cpuCores} cores` : ''].filter(Boolean).join(' · ')
      if (cpu) parts.push(`CPU: ${cpu}`)
    }
    if (node.ramGb) parts.push(`RAM: ${node.ramGb} GB`)
    if (node.disks && node.disks.length > 0) {
      parts.push(`${node.disks.length} disk(s) · ${diskTotalLabel(node.disks)}`)
      if (node.raids && node.raids.length > 0) parts.push(`RAID: ${node.raids.length}`)
    }
    if (node.ports && node.ports.length > 0) {
      const counts = portsByType(node.ports)
      const bits = [`${portsTotal(node.ports)} ports`]
      if (counts.ethernet) bits.push(`ETH ${counts.ethernet}`)
      if (counts.sfp) bits.push(`SFP ${counts.sfp}`)
      parts.push(bits.join(' · '))
    }
    if (node.kind === 'router') {
      if (node.routerWifiEnabled) parts.push(`Wi-Fi: ${node.wifiNetworks?.length ?? 0} SSID`)
      if (node.routerDhcpSubnets && node.routerDhcpSubnets.length > 0) {
        parts.push(`DHCP: ${node.routerDhcpSubnets.length}`)
      }
    }
    if (node.kind === 'recorder') {
      parts.push(t(`inspector.recorder.${node.recorderType ?? 'dvr'}`))
    }
    if (node.kind === 'ap') {
      parts.push(`Wi-Fi: ${node.wifiNetworks?.length ?? 0} SSID`)
      const apSubnets = node.apDhcpSubnets ?? (node.apDhcpEnabled && node.apDhcpNetwork ? [1] : [])
      if (apSubnets.length > 0) parts.push(`DHCP: ${apSubnets.length}`)
    }
    return parts.join(' | ') || '—'
  }

  const isNodeSelected = (id: string) => {
    if (selection?.type === 'node') return selection.id === id
    if (selection?.type === 'nodes') return selection.ids.includes(id)
    return false
  }

  const toggleSort = (current: SortState, key: string, set: (s: SortState) => void) => {
    if (current.key === key) set({ key, dir: current.dir === 'asc' ? 'desc' : 'asc' })
    else set({ key, dir: 'asc' })
  }

  const filteredNodes = useMemo(() => {
    let list = nodes
    if (q) {
      list = list.filter((n) => {
        const group = groupByNodeId.get(n.id)?.name || ''
        const hay = [n.name, deviceLabel(n.kind), n.model, n.containerService, n.ip, n.mac, n.os, group, n.notes]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return hay.includes(q)
      })
    }
    const sorted = [...list].sort((a, b) => {
      const ga = groupByNodeId.get(a.id)?.name || ''
      const gb = groupByNodeId.get(b.id)?.name || ''
      switch (nodeSort.key) {
        case 'kind': return compare(deviceLabel(a.kind), deviceLabel(b.kind), nodeSort.dir)
        case 'name': return compare(nodeDisplayName(a).toLowerCase(), nodeDisplayName(b).toLowerCase(), nodeSort.dir)
        case 'details': return compare(nodeDetails(a).toLowerCase(), nodeDetails(b).toLowerCase(), nodeSort.dir)
        case 'ip': return compare(a.ip || '', b.ip || '', nodeSort.dir)
        case 'mac': return compare(a.mac || '', b.mac || '', nodeSort.dir)
        case 'os': return compare(a.os || '', b.os || '', nodeSort.dir)
        case 'group': return compare(ga.toLowerCase(), gb.toLowerCase(), nodeSort.dir)
        default: return 0
      }
    })
    return sorted
  }, [nodes, q, nodeSort, groupByNodeId])

  const filteredConnections = useMemo(() => {
    let list = connections
    if (q) {
      list = list.filter((c) => {
        const from = nodeDisplayName(nodeById.get(c.from))
        const to = nodeDisplayName(nodeById.get(c.to))
        const hay = [from, to, LINK_META[c.kind].label, c.vpnProtocol || '', c.label].join(' ').toLowerCase()
        return hay.includes(q)
      })
    }
    const sorted = [...list].sort((a, b) => {
      const fromA = nodeDisplayName(nodeById.get(a.from)).toLowerCase()
      const fromB = nodeDisplayName(nodeById.get(b.from)).toLowerCase()
      const toA = nodeDisplayName(nodeById.get(a.to)).toLowerCase()
      const toB = nodeDisplayName(nodeById.get(b.to)).toLowerCase()
      switch (linkSort.key) {
        case 'from': return compare(fromA, fromB, linkSort.dir)
        case 'to': return compare(toA, toB, linkSort.dir)
        case 'kind': return compare(LINK_META[a.kind].label, LINK_META[b.kind].label, linkSort.dir)
        case 'label': return compare(a.label || '', b.label || '', linkSort.dir)
        default: return 0
      }
    })
    return sorted
  }, [connections, q, linkSort, nodeById])

  const filteredGroups = useMemo(() => {
    let list = groups
    if (q) {
      list = list.filter((g) => {
        const members = g.nodeIds.map((id) => nodeDisplayName(nodeById.get(id))).join(' ')
        return `${g.name} ${members}`.toLowerCase().includes(q)
      })
    }
    const sorted = [...list].sort((a, b) => {
      switch (groupSort.key) {
        case 'name': return compare((a.name || '').toLowerCase(), (b.name || '').toLowerCase(), groupSort.dir)
        case 'count': return compare(a.nodeIds.length, b.nodeIds.length, groupSort.dir)
        default: return 0
      }
    })
    return sorted
  }, [groups, q, groupSort, nodeById])

  return (
    <div className="table-view">
      <div className="table-view-tabs">
        <button type="button" className={`table-tab ${tab === 'nodes' ? 'is-active' : ''}`} onClick={() => setTab('nodes')}>
          {t('common.devices')} <span className="table-tab-count">{filteredNodes.length}</span>
        </button>
        <button type="button" className={`table-tab ${tab === 'connections' ? 'is-active' : ''}`} onClick={() => setTab('connections')}>
          {t('common.connections')} <span className="table-tab-count">{filteredConnections.length}</span>
        </button>
        <button type="button" className={`table-tab ${tab === 'groups' ? 'is-active' : ''}`} onClick={() => setTab('groups')}>
          {t('common.groups')} <span className="table-tab-count">{filteredGroups.length}</span>
        </button>
        {q && <span className="table-view-filter">{t('table.filteredBy', { query: searchQuery.trim() })}</span>}
      </div>

      <div className="table-view-body">
        {tab === 'nodes' && (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th><SortHeader label={t('inspector.nodeType')} sortKey="kind" sort={nodeSort} onSort={(k) => toggleSort(nodeSort, k, setNodeSort)} /></th>
                  <th><SortHeader label={t('inspector.nodeName')} sortKey="name" sort={nodeSort} onSort={(k) => toggleSort(nodeSort, k, setNodeSort)} /></th>
                  <th><SortHeader label={t('table.details')} sortKey="details" sort={nodeSort} onSort={(k) => toggleSort(nodeSort, k, setNodeSort)} /></th>
                  <th><SortHeader label={t('inspector.nodeIp')} sortKey="ip" sort={nodeSort} onSort={(k) => toggleSort(nodeSort, k, setNodeSort)} /></th>
                  <th><SortHeader label={t('inspector.nodeMac')} sortKey="mac" sort={nodeSort} onSort={(k) => toggleSort(nodeSort, k, setNodeSort)} /></th>
                  <th><SortHeader label={t('inspector.nodeOs')} sortKey="os" sort={nodeSort} onSort={(k) => toggleSort(nodeSort, k, setNodeSort)} /></th>
                  <th><SortHeader label={t('inspector.assignGroup')} sortKey="group" sort={nodeSort} onSort={(k) => toggleSort(nodeSort, k, setNodeSort)} /></th>
                  <th>{t('table.config')}</th>
                  <th>{t('inspector.nodeNotes')}</th>
                  <th>{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredNodes.length === 0 ? (
                  <tr><td colSpan={10} className="table-empty">{t('table.empty')}</td></tr>
                ) : filteredNodes.map((node) => {
                  const group = groupByNodeId.get(node.id)
                  return (
                    <tr
                      key={node.id}
                      className={isNodeSelected(node.id) ? 'is-selected' : ''}
                      onClick={() => onSelect({ type: 'node', id: node.id })}
                    >
                      <td>
                        <span className="table-device-kind">
                          <span className="table-kind-icon"><DeviceIcon kind={node.kind} size={16} /></span>
                          {deviceLabel(node.kind)}
                        </span>
                      </td>
                      <td className="is-strong">{nodeDisplayName(node)}</td>
                      <td>{nodeDetails(node)}</td>
                      <td className="mono">{node.ip || '—'}</td>
                      <td className="mono">{node.mac || '—'}</td>
                      <td>{node.os || '—'}</td>
                      <td>{group?.name || '—'}</td>
                      <td className="table-cell-wrap">{nodeConfigSummary(node)}</td>
                      <td className="table-cell-wrap">{node.notes || '—'}</td>
                      <td className="table-actions-cell" onClick={(e) => e.stopPropagation()}>
                        <button type="button" className="table-action" title={t('table.showOnDiagram')} onClick={() => onShowOnDiagram({ type: 'node', id: node.id })}>
                          <Icon name="topology" size={14} />
                        </button>
                        <button type="button" className="table-action is-danger" title={t('common.delete')} disabled={readOnly} onClick={() => onDeleteNode(node.id)}>
                          <Icon name="trash" size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'connections' && (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th><SortHeader label={t('table.from')} sortKey="from" sort={linkSort} onSort={(k) => toggleSort(linkSort, k, setLinkSort)} /></th>
                  <th><SortHeader label={t('table.to')} sortKey="to" sort={linkSort} onSort={(k) => toggleSort(linkSort, k, setLinkSort)} /></th>
                  <th><SortHeader label={t('inspector.linkType')} sortKey="kind" sort={linkSort} onSort={(k) => toggleSort(linkSort, k, setLinkSort)} /></th>
                  <th>{t('inspector.vpnProtocol')}</th>
                  <th><SortHeader label={t('inspector.linkLabel')} sortKey="label" sort={linkSort} onSort={(k) => toggleSort(linkSort, k, setLinkSort)} /></th>
                  <th>{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredConnections.length === 0 ? (
                  <tr><td colSpan={6} className="table-empty">{t('table.empty')}</td></tr>
                ) : filteredConnections.map((link) => (
                  <tr
                    key={link.id}
                    className={selection?.type === 'link' && selection.id === link.id ? 'is-selected' : ''}
                    onClick={() => onSelect({ type: 'link', id: link.id })}
                  >
                    <td className="is-strong">{nodeDisplayName(nodeById.get(link.from))}</td>
                    <td className="is-strong">{nodeDisplayName(nodeById.get(link.to))}</td>
                    <td>{t(`links.${link.kind}`, { defaultValue: LINK_META[link.kind].label })}</td>
                    <td>{link.kind === 'vpn' && link.vpnProtocol ? t(`vpn.${link.vpnProtocol}.label`, { defaultValue: VPN_PROTOCOL_META[link.vpnProtocol].label }) : '—'}</td>
                    <td>{link.label || '—'}</td>
                    <td className="table-actions-cell" onClick={(e) => e.stopPropagation()}>
                      <button type="button" className="table-action" title={t('table.showOnDiagram')} onClick={() => onShowOnDiagram({ type: 'link', id: link.id })}>
                        <Icon name="topology" size={14} />
                      </button>
                      <button type="button" className="table-action is-danger" title={t('common.delete')} disabled={readOnly} onClick={() => onDeleteLink(link.id)}>
                        <Icon name="trash" size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'groups' && (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th><SortHeader label={t('inspector.groupName')} sortKey="name" sort={groupSort} onSort={(k) => toggleSort(groupSort, k, setGroupSort)} /></th>
                  <th><SortHeader label={t('table.membersCount')} sortKey="count" sort={groupSort} onSort={(k) => toggleSort(groupSort, k, setGroupSort)} /></th>
                  <th>{t('table.members')}</th>
                  <th>{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredGroups.length === 0 ? (
                  <tr><td colSpan={4} className="table-empty">{t('table.empty')}</td></tr>
                ) : filteredGroups.map((group) => (
                  <tr
                    key={group.id}
                    className={(selection?.type === 'group' && selection.id === group.id) || (selection?.type === 'items' && selection.groupIds.includes(group.id)) ? 'is-selected' : ''}
                    onClick={() => onSelect({ type: 'group', id: group.id })}
                  >
                    <td className="is-strong">
                      <span className="table-group-name"><span className="table-group-dot" style={{ background: group.color }} />{group.name || t('canvas.groupDefault')}</span>
                    </td>
                    <td>{group.nodeIds.length + (group.groupIds ?? []).length}</td>
                    <td className="table-cell-wrap">{[...(group.groupIds ?? []).map((id) => groups.find((g)=>g.id===id)?.name || t('canvas.groupDefault')), ...group.nodeIds.map((id) => nodeDisplayName(nodeById.get(id)))].join(', ') || '—'}</td>
                    <td className="table-actions-cell" onClick={(e) => e.stopPropagation()}>
                      <button type="button" className="table-action" title={t('table.showOnDiagram')} onClick={() => onShowOnDiagram({ type: 'group', id: group.id })}>
                        <Icon name="topology" size={14} />
                      </button>
                      <button type="button" className="table-action is-danger" title={t('inspector.ungroup')} disabled={readOnly} onClick={() => onUngroup(group.id)}>
                        <Icon name="ungroup" size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
