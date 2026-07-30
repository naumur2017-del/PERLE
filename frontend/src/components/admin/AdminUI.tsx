// Primitives partagées du tableau de bord administrateur :
// enveloppe de widget (4 états), fenêtre de confirmation, notifications,
// pastilles de gravité et infobulle de graphique.

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import type { Severity, WidgetState } from './adminData'
import { SEVERITY_META } from './adminUtils'

export function SeverityBadge({ severity }: { severity: Severity }) {
  const meta = SEVERITY_META[severity]
  // L'icône et le libellé doublent la couleur : jamais d'information portée par la seule teinte.
  return <span className={`adm-sev adm-sev-${severity}`}><i aria-hidden="true">{meta.icon}</i>{meta.label}</span>
}

export function StatusDot({ tone, label }: { tone: 'ok' | 'warn' | 'danger' | 'neutral'; label: string }) {
  const icon = { ok: '●', warn: '▲', danger: '⛔', neutral: '○' }[tone]
  return <span className={`adm-dot adm-dot-${tone}`}><i aria-hidden="true">{icon}</i>{label}</span>
}

interface WidgetProps {
  title: string
  subtitle?: string
  state: WidgetState
  actions?: ReactNode
  footer?: ReactNode
  onRetry?: () => void
  emptyLabel?: string
  className?: string
  skeleton?: 'chart' | 'table' | 'list'
  children: ReactNode
}

/** Carte de widget gérant les quatre états : chargement, données, vide, erreur. */
export function Widget({
  title, subtitle, state, actions, footer, onRetry,
  emptyLabel = 'Aucune donnée sur la période sélectionnée.',
  className = '', skeleton = 'chart', children,
}: WidgetProps) {
  const headingId = useId()
  return (
    <section className={`adm-widget ${className}`} aria-labelledby={headingId} aria-busy={state === 'loading'}>
      <header className="adm-widget-head">
        <div>
          <h3 id={headingId}>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {state === 'ready' && actions && <div className="adm-widget-actions">{actions}</div>}
      </header>

      {state === 'loading' && <div className={`adm-skeleton adm-skeleton-${skeleton}`} role="status">
        <span className="adm-visually-hidden">Chargement des données…</span>
        {Array.from({ length: skeleton === 'chart' ? 1 : 5 }, (_, i) => <i key={i} />)}
      </div>}

      {state === 'empty' && <div className="adm-widget-fallback">
        <i aria-hidden="true">◍</i>
        <p>{emptyLabel}</p>
        <small>Modifiez la période ou les filtres pour élargir la recherche.</small>
      </div>}

      {state === 'error' && <div className="adm-widget-fallback adm-widget-error" role="alert">
        <i aria-hidden="true">⛔</i>
        <p>Erreur de chargement des données.</p>
        <small>Le service n’a pas répondu dans le délai imparti (code HTTP 504).</small>
        {onRetry && <button type="button" className="adm-btn adm-btn-ghost" onClick={onRetry}>Réessayer</button>}
      </div>}

      {state === 'ready' && <div className="adm-widget-body">{children}</div>}
      {state === 'ready' && footer && <footer className="adm-widget-foot">{footer}</footer>}
    </section>
  )
}

/** Tableau de données accessible associé à un graphique (alternative textuelle). */
export function ChartDataTable({ caption, columns, rows }: { caption: string; columns: string[]; rows: (string | number)[][] }) {
  const [open, setOpen] = useState(false)
  return <div className="adm-chart-data">
    <button type="button" className="adm-btn adm-btn-link" aria-expanded={open} onClick={() => setOpen(!open)}>
      {open ? 'Masquer' : 'Afficher'} le tableau de données
    </button>
    {open && <div className="adm-table-scroll">
      <table className="adm-table adm-table-compact">
        <caption className="adm-visually-hidden">{caption}</caption>
        <thead><tr>{columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => cellIndex === 0
          ? <th key={cellIndex} scope="row">{cell}</th>
          : <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>}
  </div>
}

export interface ConfirmRequest {
  title: string
  action: string
  consequences: string[]
  needsReason?: boolean
  reasonLabel?: string
  confirmLabel: string
  tone?: 'default' | 'danger'
  onConfirm: (reason: string) => void
}

/** Fenêtre de confirmation des actions sensibles (action, conséquences, exécutant, motif). */
export function ConfirmDialog({ request, operator, onClose }: { request: ConfirmRequest; operator: string; onClose: () => void }) {
  const [reason, setReason] = useState('')
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    dialogRef.current?.querySelector<HTMLElement>('button, input, textarea')?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab') return
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button, input, textarea, [href]')
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown); previous?.focus() }
  }, [onClose])

  const blocked = request.needsReason && reason.trim().length < 3

  return <div className="adm-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <div className="adm-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={dialogRef}>
      <header>
        <h2 id={titleId}>{request.title}</h2>
        <button type="button" className="adm-icon-btn" aria-label="Fermer la fenêtre" onClick={onClose}>✕</button>
      </header>
      <div className="adm-modal-body">
        <dl className="adm-modal-summary">
          <dt>Action demandée</dt><dd>{request.action}</dd>
          <dt>Exécutée par</dt><dd>{operator}</dd>
        </dl>
        <p className="adm-modal-label">Conséquences</p>
        <ul className="adm-modal-consequences">{request.consequences.map((item) => <li key={item}><i aria-hidden="true">▸</i>{item}</li>)}</ul>
        {request.needsReason && <label className="adm-field">
          <span>{request.reasonLabel ?? 'Motif'} <em>(obligatoire)</em></span>
          <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} placeholder="Précisez le motif de cette opération…" />
        </label>}
      </div>
      <footer>
        <button type="button" className="adm-btn adm-btn-ghost" onClick={onClose}>Annuler</button>
        <button
          type="button"
          className={`adm-btn ${request.tone === 'danger' ? 'adm-btn-danger' : 'adm-btn-primary'}`}
          disabled={blocked}
          onClick={() => { request.onConfirm(reason.trim()); onClose() }}
        >{request.confirmLabel}</button>
      </footer>
    </div>
  </div>
}

/** Panneau latéral de détail (session, alerte, événement d'audit). */
export function DetailDrawer({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const titleId = useId()
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])
  return <div className="adm-modal-backdrop adm-drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <aside className="adm-drawer" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <header>
        <h2 id={titleId}>{title}</h2>
        <button type="button" className="adm-icon-btn" aria-label="Fermer le panneau" onClick={onClose} autoFocus>✕</button>
      </header>
      <div className="adm-drawer-body">{children}</div>
    </aside>
  </div>
}

export interface Toast { id: number; tone: 'success' | 'warning' | 'error' | 'info'; message: string }

export function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return <div className="adm-toasts" role="status" aria-live="polite">
    {toasts.map((toast) => <div key={toast.id} className={`adm-toast adm-toast-${toast.tone}`}>
      <i aria-hidden="true">{{ success: '✓', warning: '▲', error: '⛔', info: 'ⓘ' }[toast.tone]}</i>
      <p>{toast.message}</p>
      <button type="button" className="adm-icon-btn" aria-label="Masquer la notification" onClick={() => onDismiss(toast.id)}>✕</button>
    </div>)}
  </div>
}
