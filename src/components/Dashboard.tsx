import type { DiagramEntry } from '../storage'
import { Icon } from './Icons'

interface DashboardProps {
  diagrams: DiagramEntry[]
  onOpen: (id: string) => void
  onCreate: () => void
  onCreateDemo: () => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onRename: (id: string, title: string) => void
  onImport: () => void
}

function formatDate(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function Dashboard({
  diagrams,
  onOpen,
  onCreate,
  onCreateDemo,
  onDelete,
  onDuplicate,
  onRename,
  onImport,
}: DashboardProps) {
  const sorted = [...diagrams].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  )

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="dashboard-brand">
          <span className="brand-mark">
            <Icon name="topology" size={22} />
          </span>
          <div>
            <h1>Личный кабинет</h1>
            <p>Ваши схемы сохраняются локально в этом браузере.</p>
          </div>
        </div>
        <div className="dashboard-actions">
          <button type="button" className="action-button" onClick={onImport}>
            <Icon name="upload" size={15} />
            <span className="action-label">Импорт JSON</span>
          </button>
          <button type="button" className="action-button" onClick={onCreateDemo}>
            <Icon name="sparkles" size={15} />
            <span className="action-label">Демо-схема</span>
          </button>
          <button type="button" className="action-button is-primary" onClick={onCreate}>
            <Icon name="plus" size={15} />
            <span className="action-label">Новая схема</span>
          </button>
        </div>
      </header>

      {sorted.length === 0 ? (
        <div className="dashboard-empty">
          <span className="empty-orb">
            <Icon name="topology" size={26} />
          </span>
          <h2>Схем пока нет</h2>
          <p>Создайте новую схему, загрузите демо или импортируйте JSON-файл.</p>
          <div className="dashboard-empty-actions">
            <button type="button" className="action-button is-primary" onClick={onCreate}>
              <Icon name="plus" size={15} />
              <span className="action-label">Создать схему</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="diagrams-grid">
          {sorted.map((diagram) => {
            const nodesCount = diagram.snapshot.nodes?.length ?? 0
            const linksCount = diagram.snapshot.connections?.length ?? 0
            return (
              <article
                key={diagram.id}
                className="diagram-card"
                onClick={() => onOpen(diagram.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onOpen(diagram.id)
                  }
                }}
              >
                <div className="diagram-card-head">
                  <input
                    className="diagram-card-title"
                    value={diagram.title}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => onRename(diagram.id, event.target.value)}
                    aria-label="Название схемы"
                  />
                </div>
                <div className="diagram-card-meta">
                  <span>{nodesCount} устр.</span>
                  <span>·</span>
                  <span>{linksCount} связей</span>
                </div>
                <div className="diagram-card-date">
                  Изменено: {formatDate(diagram.updatedAt)}
                </div>
                <div className="diagram-card-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={(event) => {
                      event.stopPropagation()
                      onOpen(diagram.id)
                    }}
                  >
                    Открыть
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    title="Дублировать"
                    onClick={(event) => {
                      event.stopPropagation()
                      onDuplicate(diagram.id)
                    }}
                  >
                    <Icon name="copy" size={15} />
                  </button>
                  <button
                    type="button"
                    className="icon-button is-danger"
                    title="Удалить"
                    onClick={(event) => {
                      event.stopPropagation()
                      onDelete(diagram.id)
                    }}
                  >
                    <Icon name="trash" size={15} />
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
