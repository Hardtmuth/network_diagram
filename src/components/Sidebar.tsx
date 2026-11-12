import { useState } from 'react'
import type { CSSProperties, DragEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { DEVICE_GROUPS, DEVICE_META, DND_MIME } from '../devices'
import type { DeviceKind } from '../types'
import { DeviceIcon } from './DeviceIcon'
import { Icon } from './Icons'

interface SidebarProps {
  onQuickAdd: (kind: DeviceKind) => void
  onHide: () => void
  readOnly?: boolean
}

export function Sidebar({ onQuickAdd, onHide, readOnly = false }: SidebarProps) {
  const { t } = useTranslation()
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    'Видеонаблюдение': true,
    'Другое': true,
  })

  const deviceLabel = (kind: DeviceKind) =>
    t(`devices.${kind}.label`, { defaultValue: DEVICE_META[kind].label })

  const groupLabel = (label: string) => {
    if (label === 'Сеть') return t('categories.network')
    if (label === 'Серверы и NAS') return t('categories.servers')
    if (label === 'Клиенты') return t('categories.clients')
    if (label === 'Видеонаблюдение') return t('categories.surveillance')
    if (label === 'Другое') return t('categories.other')
    return label
  }

  const toggleGroup = (label: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  const handleDragStart = (event: DragEvent<HTMLButtonElement>, kind: DeviceKind) => {
    if (readOnly) {
      event.preventDefault()
      return
    }
    const label = deviceLabel(kind)
    event.dataTransfer.setData(DND_MIME, kind)
    event.dataTransfer.setData('text/plain', label)
    event.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-header-row">
          <div>
            <div className="sidebar-eyebrow">{t('sidebar.library')}</div>
            <h2>{t('sidebar.title')}</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onHide}
            aria-label={t('sidebar.hide')}
            title={t('sidebar.hide')}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
        <p>{t('sidebar.help')}</p>
      </div>

      <div className="shelf">
        {DEVICE_GROUPS.map((group) => {
          const collapsed = Boolean(collapsedGroups[group.label])
          return (
            <div className={`shelf-group ${collapsed ? 'is-collapsed' : ''}`} key={group.label}>
              <button
                type="button"
                className="shelf-group-title is-toggle"
                onClick={() => toggleGroup(group.label)}
                aria-expanded={!collapsed}
              >
                <span>{groupLabel(group.label)}</span>
                <span className="shelf-group-chevron" aria-hidden="true">{collapsed ? '▸' : '▾'}</span>
              </button>
              {!collapsed && group.kinds.map((kind) => {
                const meta = DEVICE_META[kind]
                const label = deviceLabel(kind)
                return (
                  <button
                    type="button"
                    key={kind}
                    className="shelf-item"
                    draggable={!readOnly}
                    disabled={readOnly}
                    onDragStart={(event) => handleDragStart(event, kind)}
                    onClick={() => {
                      if (!readOnly) onQuickAdd(kind)
                    }}
                    title={t('sidebar.addTitle', { label })}
                    style={{ '--device-color': meta.color } as CSSProperties}
                  >
                    <span className="shelf-icon">
                      <DeviceIcon kind={kind} size={19} />
                    </span>
                    <span className="shelf-label">{label}</span>
                    <span className="shelf-drag">
                      <Icon name="grip" size={14} />
                    </span>
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>

      <div className="sidebar-foot">
        <span className="sidebar-foot-icon">
          <Icon name="link" size={15} />
        </span>
        <p>{t('sidebar.foot')}</p>
      </div>
    </aside>
  )
}
