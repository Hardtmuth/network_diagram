import { useTranslation } from 'react-i18next'
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
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage === 'en' ? 'en-US' : 'ru-RU'

  const formatDate = (iso: string) => {
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

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
            <h1>{t('dashboard.title')}</h1>
            <p>{t('dashboard.subtitle')}</p>
          </div>
        </div>
        <div className="dashboard-actions">
          <button type="button" className="action-button" onClick={onImport}>
            <Icon name="upload" size={15} />
            <span className="action-label">{t('dashboard.importJson')}</span>
          </button>
          <button type="button" className="action-button" onClick={onCreateDemo}>
            <Icon name="sparkles" size={15} />
            <span className="action-label">{t('dashboard.demoDiagram')}</span>
          </button>
          <button type="button" className="action-button is-primary" onClick={onCreate}>
            <Icon name="plus" size={15} />
            <span className="action-label">{t('dashboard.newDiagram')}</span>
          </button>
        </div>
      </header>

      {sorted.length === 0 ? (
        <div className="dashboard-empty">
          <span className="empty-orb">
            <Icon name="topology" size={26} />
          </span>
          <h2>{t('dashboard.emptyTitle')}</h2>
          <p>{t('dashboard.emptyText')}</p>
          <div className="dashboard-empty-actions">
            <button type="button" className="action-button is-primary" onClick={onCreate}>
              <Icon name="plus" size={15} />
              <span className="action-label">{t('dashboard.createDiagram')}</span>
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
                    aria-label={t('topbar.diagramName')}
                  />
                </div>
                <div className="diagram-card-meta">
                  <span>{t('dashboard.devicesCount', { count: nodesCount })}</span>
                  <span>·</span>
                  <span>{t('dashboard.linksCount', { count: linksCount })}</span>
                </div>
                <div className="diagram-card-date">
                  {t('dashboard.modified', { date: formatDate(diagram.updatedAt) })}
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
                    {t('common.open')}
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    title={t('common.duplicate')}
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
                    title={t('common.delete')}
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
