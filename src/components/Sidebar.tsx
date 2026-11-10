import type { CSSProperties, DragEvent } from 'react'
import { DEVICE_GROUPS, DEVICE_META, DND_MIME } from '../devices'
import type { DeviceKind } from '../types'
import { DeviceIcon } from './DeviceIcon'
import { Icon } from './Icons'

interface SidebarProps {
  onQuickAdd: (kind: DeviceKind) => void
  onHide: () => void
}

export function Sidebar({ onQuickAdd, onHide }: SidebarProps) {
  const handleDragStart = (event: DragEvent<HTMLButtonElement>, kind: DeviceKind) => {
    event.dataTransfer.setData(DND_MIME, kind)
    event.dataTransfer.setData('text/plain', DEVICE_META[kind].label)
    event.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-header-row">
          <div>
            <div className="sidebar-eyebrow">Библиотека</div>
            <h2>Устройства</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onHide}
            aria-label="Скрыть панель устройств"
            title="Скрыть панель устройств"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
        <p>Перетащите на холст или нажмите, чтобы добавить в центр.</p>
      </div>

      <div className="shelf">
        {DEVICE_GROUPS.map((group) => (
          <div className="shelf-group" key={group.label}>
            <div className="shelf-group-title">{group.label}</div>
            {group.kinds.map((kind) => {
              const meta = DEVICE_META[kind]
              return (
                <button
                  type="button"
                  key={kind}
                  className="shelf-item"
                  draggable
                  onDragStart={(event) => handleDragStart(event, kind)}
                  onClick={() => onQuickAdd(kind)}
                  title={`Добавить: ${meta.label}`}
                  style={{ '--device-color': meta.color } as CSSProperties}
                >
                  <span className="shelf-icon">
                    <DeviceIcon kind={kind} size={19} />
                  </span>
                  <span className="shelf-label">{meta.label}</span>
                  <span className="shelf-drag">
                    <Icon name="grip" size={14} />
                  </span>
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <div className="sidebar-foot">
        <span className="sidebar-foot-icon">
          <Icon name="link" size={15} />
        </span>
        <p>
          Потяните за точку на карточке, чтобы соединить устройства.
        </p>
      </div>
    </aside>
  )
}
