// Briques d'affichage du tableau de bord de direction : carte d'indicateur et
// enveloppe de widget gérant les quatre états (chargement, données, vide, erreur).

import { useId, useState, type ReactNode } from 'react'

export type PanelState = 'ready' | 'loading' | 'empty' | 'error'

interface PanelProps {
  title: string
  subtitle?: string
  state: PanelState
  actions?: ReactNode
  footer?: ReactNode
  onRetry?: () => void
  emptyLabel?: string
  className?: string
  children: ReactNode
}

export function Panel({
  title, subtitle, state, actions, footer, onRetry,
  emptyLabel = 'Aucune donnée sur la période sélectionnée.',
  className = '', children,
}: PanelProps) {
  const headingId = useId()
  return (
    <section className={`dsh-panel ${className}`} aria-labelledby={headingId} aria-busy={state === 'loading'}>
      <header className="dsh-panel-head">
        <div>
          <h3 id={headingId}>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {state === 'ready' && actions && <div className="dsh-panel-actions">{actions}</div>}
      </header>

      {state === 'loading' && <div className="dsh-skeleton" role="status">
        <span className="dsh-visually-hidden">Chargement des données…</span><i />
      </div>}

      {state === 'empty' && <div className="dsh-fallback">
        <i aria-hidden="true">◍</i>
        <p>{emptyLabel}</p>
        <small>Élargissez la période ou changez de filtre.</small>
      </div>}

      {state === 'error' && <div className="dsh-fallback dsh-fallback-error" role="alert">
        <i aria-hidden="true">⛔</i>
        <p>Erreur de chargement des données.</p>
        <small>Le service n’a pas répondu dans le délai imparti.</small>
        {onRetry && <button type="button" className="dsh-btn" onClick={onRetry}>Réessayer</button>}
      </div>}

      {state === 'ready' && <div className="dsh-panel-body">{children}</div>}
      {state === 'ready' && footer && <footer className="dsh-panel-foot">{footer}</footer>}
    </section>
  )
}

/** Tableau de données accessible associé à un graphique (alternative textuelle). */
export function ChartTable({ caption, columns, rows }: { caption: string; columns: string[]; rows: (string | number)[][] }) {
  const [open, setOpen] = useState(false)
  return <div className="dsh-chart-data">
    <button type="button" className="dsh-link" aria-expanded={open} onClick={() => setOpen(!open)}>
      {open ? 'Masquer' : 'Afficher'} le tableau de données
    </button>
    {open && <div className="dsh-table-scroll">
      <table className="dsh-table">
        <caption className="dsh-visually-hidden">{caption}</caption>
        <thead><tr>{columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => cellIndex === 0
          ? <th key={cellIndex} scope="row">{cell}</th>
          : <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>}
  </div>
}

export function KpiCard({ icon, tone, label, value, trend, details, onOpen, loading }: {
  icon: string
  tone: 'primary' | 'ok' | 'warn' | 'danger'
  label: string
  value: string
  trend: { direction: 'up' | 'down' | 'flat'; text: string; good?: boolean }
  details: string
  onOpen: () => void
  loading: boolean
}) {
  if (loading) return <div className="dsh-kpi dsh-kpi-skeleton" role="status">
    <span className="dsh-visually-hidden">Chargement de l’indicateur {label}</span><i /><i /><i />
  </div>

  const arrow = { up: '↑', down: '↓', flat: '→' }[trend.direction]
  const trendTone = trend.direction === 'flat' ? 'flat' : trend.good === false ? 'bad' : 'good'
  return <button type="button" className={`dsh-kpi dsh-kpi-${tone}`} onClick={onOpen}>
    <span className="dsh-kpi-head">
      <i aria-hidden="true">{icon}</i>
      <span>{label}</span>
    </span>
    <strong>{value}</strong>
    <span className={`dsh-kpi-trend dsh-trend-${trendTone}`}><i aria-hidden="true">{arrow}</i>{trend.text}</span>
    <small>{details}</small>
  </button>
}
