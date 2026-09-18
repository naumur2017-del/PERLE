// Tableau de bord personnel affiché sur l'accueil pour tout salarié sans équipe gérée : ses
// propres tâches, EHS, congés et rémunération — jamais les données d'un collègue. Un manager a
// en plus son propre ManagerDashboard (onglets séparés, voir HomePage.tsx).
// Données fournies par backend/accounts/dashboard.py (EmployeeDashboardView).

import { useEffect, useState } from 'react'
import './EmployeeDashboard.css'
import { KpiCard, Panel, type PanelState } from '../components/dashboard/DashboardUI'
import { EhsTrendChart, TaskSplitChart, TasksTrendChart } from '../components/dashboard/ManagerCharts'
import { DIR_PERIOD_LABELS, type DirPeriod } from '../components/dashboard/directorData'
import { fetchEmployeeDashboard, type EmployeeDashboard as EmployeeData } from '../api/dashboard'
import { formatMontant } from '../utils/currency'
import type { Session } from '../auth/session'

const clock = () => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

const ALERT_META = {
  high: { label: 'Élevé', icon: '▲', tone: 'danger' },
  medium: { label: 'Moyen', icon: '◆', tone: 'warn' },
  info: { label: 'Information', icon: 'ⓘ', tone: 'info' },
} as const

export default function EmployeeDashboard({ session, navigateTo }: { session: Session; navigateTo: (page: string) => void }) {
  const [period, setPeriod] = useState<DirPeriod>('quarter')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [data, setData] = useState<EmployeeData | null>(null)
  const [refreshedAt, setRefreshedAt] = useState(clock())
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchEmployeeDashboard(period)
      .then((payload) => { if (!cancelled) { setData(payload); setRefreshedAt(clock()); setError(false) } })
      .catch(() => { if (!cancelled) setError(true) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [period, reloadKey])

  const changePeriod = (next: DirPeriod) => {
    if (next === period) return
    setLoading(true); setError(false); setPeriod(next)
  }
  const refresh = () => { setLoading(true); setError(false); setReloadKey((key) => key + 1) }
  const state: PanelState = error ? 'error' : loading || !data ? 'loading' : 'ready'
  const periodLabel = DIR_PERIOD_LABELS[period]
  const kpi = data?.kpi

  return <section className="dsh-root emp-root" aria-labelledby="emp-title">
    <div className="dsh-head">
      <div>
        <span className="dsh-eyebrow">Mon espace</span>
        <h2 id="emp-title">Bonjour {session.firstName}</h2>
        <p>Votre activité personnelle : tâches, EHS, congés et rémunération.</p>
        <small className="dsh-refreshed"><i aria-hidden="true">⟳</i>Données actualisées à {refreshedAt} · {periodLabel}</small>
      </div>

      <div className="dsh-head-tools">
        <div className="dsh-segmented" role="group" aria-label="Période d’analyse">
          {(['month', 'quarter', 'year'] as DirPeriod[]).map((key) => <button
            key={key}
            type="button"
            className={period === key ? 'is-active' : ''}
            aria-pressed={period === key}
            onClick={() => changePeriod(key)}
          >{DIR_PERIOD_LABELS[key]}</button>)}
        </div>
        <button type="button" className="dsh-btn dsh-btn-primary" onClick={refresh} disabled={loading}>
          {loading ? '⟳ Actualisation…' : '⟳ Actualiser'}
        </button>
      </div>
    </div>

    {error && <div className="dsh-load-error" role="alert">
      Impossible de charger votre tableau de bord.
      <button type="button" className="dsh-btn" onClick={refresh}>Réessayer</button>
    </div>}

    <div className="dsh-kpi-grid">
      <KpiCard loading={loading} icon="🔔" tone={(kpi?.new_tasks ?? 0) > 0 ? 'warn' : 'ok'} label="Nouvelles tâches attribuées"
        value={String(kpi?.new_tasks ?? 0)}
        trend={{
          direction: (kpi?.new_tasks ?? 0) > 0 ? 'down' : 'flat',
          text: 'À démarrer',
          good: (kpi?.new_tasks ?? 0) === 0,
        }}
        details="Tâches qui vous ont été attribuées, pas encore démarrées"
        onOpen={() => navigateTo('staffing-execute')} />
      <KpiCard loading={loading} icon="▤" tone="primary" label="Mes tâches actives"
        value={String(kpi?.active_tasks ?? 0)}
        trend={{ direction: 'flat', text: `${kpi?.hours_in_progress ?? 0} h en cours` }}
        details="Tâches non terminées qui vous sont attribuées"
        onOpen={() => navigateTo('staffing-execute')} />
      <KpiCard loading={loading} icon="⛔" tone="danger" label="Tâches en retard"
        value={String(kpi?.late_tasks ?? 0)}
        trend={{ direction: (kpi?.late_tasks ?? 0) > 0 ? 'down' : 'flat', text: 'Échéance dépassée', good: (kpi?.late_tasks ?? 0) === 0 }}
        details="À traiter en priorité"
        onOpen={() => navigateTo('staffing-execute')} />
      <KpiCard loading={loading} icon="◈" tone="ok" label="Tâches livrées (30 j)"
        value={String(kpi?.tasks_done_30d ?? 0)}
        trend={{ direction: 'up', text: 'Sur les 30 derniers jours', good: true }}
        details="Attributions terminées"
        onOpen={() => navigateTo('staffing-execute')} />
      <KpiCard loading={loading} icon="★" tone="warn" label="Ma note moyenne"
        value={kpi?.avg_note != null ? `${kpi.avg_note} / 5` : '—'}
        trend={{ direction: 'flat', text: 'Évaluations de vos tâches terminées' }}
        details="Notée par votre manager"
        onOpen={() => navigateTo('staffing-execute')} />
      <KpiCard loading={loading} icon="⚙" tone="primary" label="EHS consommés"
        value={String(kpi?.ehs_consumed ?? 0)}
        trend={{ direction: 'flat', text: `${kpi?.projects_active ?? 0} projet(s) actif(s)` }}
        details="Sur les tâches terminées de la période"
        onOpen={() => navigateTo('staffing-execute')} />
      <KpiCard loading={loading} icon="◉" tone="ok" label="Solde de congés"
        value={`${kpi?.conge_solde ?? 0} j`}
        trend={{ direction: 'flat', text: `${kpi?.conge_acquis ?? 0} j acquis` }}
        details="Voir mes demandes de congé"
        onOpen={() => navigateTo('salarie')} />
    </div>

    <div className="dsh-grid">
      <Panel className="dsh-col-7" title="Exécution de mes tâches" subtitle="Répartition de mes attributions"
        state={state} onRetry={refresh}>
        {data && <TaskSplitChart data={data.task_status} caption="Exécution de mes tâches" />}
      </Panel>

      <Panel className="dsh-col-5" title="Congés" subtitle="Acquis, consommé, reste — sur l’année en cours"
        state={state} onRetry={refresh}
        footer={<button type="button" className="dsh-btn dsh-btn-block" onClick={() => navigateTo('salarie')}>Ouvrir mes demandes de congé</button>}>
        {data && <dl className="dsh-facts emp-facts">
          <div><dt>Acquis</dt><dd>{data.kpi.conge_acquis} j</dd></div>
          <div><dt>Consommé</dt><dd>{data.kpi.conge_pris} j</dd></div>
          <div><dt>Reste</dt><dd>{data.kpi.conge_solde} j</dd></div>
        </dl>}
      </Panel>

      <Panel className="dsh-col-7" title="Tendance de mes tâches" subtitle="Tâches attribuées et livrées, par mois"
        state={state} onRetry={refresh}>
        {data && <TasksTrendChart data={data.tasks_trend} />}
      </Panel>

      <Panel className="dsh-col-5" title="Ma rémunération" subtitle="Estimation du mois en cours"
        state={state} onRetry={refresh}
        footer={<button type="button" className="dsh-btn dsh-btn-block" onClick={() => navigateTo('salarie')}>Ouvrir Salarié › Rémunération</button>}>
        {data && <dl className="dsh-facts emp-facts emp-facts-two">
          <div><dt>Salaire de base</dt><dd>{formatMontant(data.kpi.salaire_de_base)}</dd></div>
          <div><dt>Prime de performance</dt><dd>{formatMontant(data.kpi.prime_performance)}</dd></div>
        </dl>}
      </Panel>

      <Panel className="dsh-col-7" title="Consommation EHS" subtitle="EHS consommés, par mois"
        state={state} onRetry={refresh}>
        {data && <EhsTrendChart data={data.ehs_by_month} />}
      </Panel>

      <Panel className="dsh-col-5" title="Mes alertes" subtitle={`${(data?.alerts ?? []).filter((a) => a.level === 'high').length} point(s) de vigilance élevés`}
        state={state} onRetry={refresh} emptyLabel="Aucune alerte sur la période.">
        <ul className="dsh-alerts">
          {(data?.alerts ?? []).map((alert) => {
            const meta = ALERT_META[alert.level]
            return <li key={alert.id} className={`dsh-alert dsh-alert-${meta.tone}`}>
              <span className={`dsh-tag dsh-tag-${meta.tone}`}><i aria-hidden="true">{meta.icon}</i>{meta.label}</span>
              <b>{alert.title}</b>
              <p>{alert.detail}</p>
              <button type="button" className="dsh-link" onClick={() => navigateTo(alert.target)}>Ouvrir →</button>
            </li>
          })}
          {data && data.alerts.length === 0 && <li className="dsh-alert dsh-alert-info"><p>Aucune alerte sur la période.</p></li>}
        </ul>
      </Panel>
    </div>
  </section>
}
