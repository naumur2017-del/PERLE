// Tableau de bord de direction affiché sur l'accueil du directeur (administrateur d'une
// entreprise cliente de PERLE). Toutes les données proviennent de l'API d'agrégation
// (voir backend/accounts/dashboard.py).

import { useEffect, useMemo, useState } from 'react'
import './HomeDashboard.css'
import { ChartTable, KpiCard, Panel, type PanelState } from '../components/dashboard/DashboardUI'
import {
  BudgetDonut, CashChart, DeliverablesChart, EhsChart, FinanceChart, PortfolioChart, TeamLoadChart,
} from '../components/dashboard/DirectorCharts'
import { downloadCsv } from '../components/dashboard/chartTools'
import {
  DIR_PERIOD_LABELS, formatFcfa, type DirPeriod, type Project,
} from '../components/dashboard/directorData'
import { currencySuffix } from '../utils/currency'
import { fetchDirectionDashboard, type DirectionDashboard } from '../api/dashboard'

const FILTER_KEY = 'perle-direction-filters'

const clock = () => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

const ALERT_META = {
  high: { label: 'Élevé', icon: '▲', tone: 'danger' },
  medium: { label: 'Moyen', icon: '◆', tone: 'warn' },
  info: { label: 'Information', icon: 'ⓘ', tone: 'info' },
} as const

const toProject = (row: DirectionDashboard['projects'][number]): Project => ({
  code: row.code, name: row.name, manager: row.manager, progress: row.progress,
  budgetUsed: row.budget_used, budget: row.budget || 1, margin: row.margin,
  status: (['En cours', 'À surveiller', 'En retard', 'Terminé'].includes(row.status)
    ? row.status : 'En cours') as Project['status'],
  deadline: row.deadline,
})

export default function HomeDashboard({ navigateTo }: { navigateTo: (page: string) => void }) {
  const stored = useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem(FILTER_KEY) ?? '{}') } catch { return {} }
  }, [])

  const [period, setPeriod] = useState<DirPeriod>(stored.period ?? 'year')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [data, setData] = useState<DirectionDashboard | null>(null)
  const [refreshedAt, setRefreshedAt] = useState(clock())
  const [collapsed, setCollapsed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  // Le filtre de période est conservé pendant la session.
  useEffect(() => { sessionStorage.setItem(FILTER_KEY, JSON.stringify({ period })) }, [period])

  useEffect(() => {
    let cancelled = false
    fetchDirectionDashboard(period)
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
  const projects = useMemo(() => (data?.projects ?? []).map(toProject), [data])

  return <section className="dsh-root" aria-labelledby="dsh-title">
    <div className="dsh-head">
      <div>
        <span className="dsh-eyebrow">Direction</span>
        <h2 id="dsh-title">Tableau de bord de direction</h2>
        <p>Pilotage financier, portefeuille de projets, ressources et trésorerie de l’entreprise.</p>
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
        <button type="button" className="dsh-btn" onClick={() => window.print()}>⎙ Exporter en PDF</button>
        <button type="button" className="dsh-btn dsh-btn-primary" onClick={refresh} disabled={loading}>
          {loading ? '⟳ Actualisation…' : '⟳ Actualiser'}
        </button>
        <button
          type="button"
          className="dsh-btn"
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((current) => !current)}
        >
          {collapsed ? '⌄ Afficher la section Direction' : '⌃ Masquer la section Direction'}
        </button>
      </div>
    </div>

    {error && <div className="dsh-load-error" role="alert">
      Impossible de charger le tableau de bord.
      <button type="button" className="dsh-btn" onClick={refresh}>Réessayer</button>
    </div>}

    {!collapsed && <>
    {/* ---------------------------------------------------------------- */}
    {/* Indicateurs de tête                                               */}
    {/* ---------------------------------------------------------------- */}
    <div className="dsh-kpi-grid">
      <KpiCard loading={loading} icon="₣" tone="primary" label="Chiffre d’affaires"
        value={formatFcfa(kpi?.revenue ?? 0)}
        trend={{ direction: (kpi?.revenue_delta ?? 0) >= 0 ? 'up' : 'down', text: `${(kpi?.revenue_delta ?? 0) >= 0 ? '+' : ''}${kpi?.revenue_delta ?? 0} % vs période précédente`, good: (kpi?.revenue_delta ?? 0) >= 0 }}
        details={`${periodLabel} · ${data?.projects.length ?? 0} projets suivis`}
        onOpen={() => navigateTo('pilotage')} />
      <KpiCard loading={loading} icon="◈" tone="ok" label="Marge nette"
        value={`${kpi?.margin ?? 0} %`}
        trend={{ direction: (kpi?.margin_delta ?? 0) >= 0 ? 'up' : 'down', text: `${(kpi?.margin_delta ?? 0) >= 0 ? '+' : ''}${kpi?.margin_delta ?? 0} pt`, good: (kpi?.margin_delta ?? 0) >= 0 }}
        details="Recettes projets moins dépenses engagées"
        onOpen={() => navigateTo('pilotage')} />
      <KpiCard loading={loading} icon="▤" tone="primary" label="Projets actifs"
        value={String(kpi?.active_projects ?? 0)}
        trend={{ direction: 'flat', text: `${kpi?.watch_projects ?? 0} à surveiller` }}
        details="Projets définitifs non terminés"
        onOpen={() => navigateTo('pilotage')} />
      <KpiCard loading={loading} icon="☰" tone="warn" label="Taux d’occupation"
        value={`${kpi?.occupancy ?? 0} %`}
        trend={{ direction: 'flat', text: `${kpi?.headcount ?? 0} collaborateurs` }}
        details="Collaborateurs staffés sur l’effectif"
        onOpen={() => navigateTo('staffing')} />
      <KpiCard loading={loading} icon="◉" tone="ok" label="Trésorerie estimée"
        value={formatFcfa(kpi?.cash ?? 0)}
        trend={{ direction: (kpi?.cash_delta ?? 0) >= 0 ? 'up' : 'down', text: `${kpi?.cash_delta ?? 0} % vs période précédente`, good: (kpi?.cash_delta ?? 0) >= 0 }}
        details={`Solde projeté · ${currencySuffix()}`}
        onOpen={() => navigateTo('tresorerie')} />
      <KpiCard loading={loading} icon="⛔" tone="danger" label="Tâches en retard"
        value={String(kpi?.late_tasks ?? 0)}
        trend={{ direction: 'flat', text: 'Échéance dépassée, non terminées' }}
        details="Sur l’ensemble des projets"
        onOpen={() => navigateTo('staffing')} />
    </div>

    {/* ---------------------------------------------------------------- */}
    {/* Graphiques                                                        */}
    {/* ---------------------------------------------------------------- */}
    <div className="dsh-grid">
      <Panel className="dsh-col-8" title="Performance financière" subtitle={`Recettes, dépenses et taux de marge · ${periodLabel}`}
        state={state} onRetry={refresh}
        actions={data && <button type="button" className="dsh-link" onClick={() => downloadCsv(
          'perle-performance-financiere.csv',
          ['Période', 'Recettes', 'Dépenses', 'Résultat'],
          data.finance.map((point) => [point.label, point.revenue, point.costs, point.revenue - point.costs]),
        )}>Export CSV</button>}>
        {data && <FinanceChart data={data.finance} onPointClick={() => navigateTo('pilotage')} />}
      </Panel>

      <Panel className="dsh-col-4" title="Répartition du budget" subtitle="Par nature de charge ou par département"
        state={state} onRetry={refresh}>
        {data && <BudgetDonut nature={data.budget_by_nature} department={data.budget_by_department} onSliceClick={() => navigateTo('architecture')} />}
      </Panel>

      <Panel className="dsh-col-5" title="Portefeuille de projets" subtitle="Avancement comparé à la consommation budgétaire"
        state={state} onRetry={refresh}
        footer={<button type="button" className="dsh-btn dsh-btn-block" onClick={() => navigateTo('pilotage')}>Voir tous les projets</button>}>
        {data && <PortfolioChart items={projects} onProjectClick={() => navigateTo('pilotage')} />}
      </Panel>

      <Panel className="dsh-col-7" title="Trésorerie" subtitle={`Solde et flux nets estimés · ${periodLabel}`}
        state={state} onRetry={refresh}
        actions={data && <button type="button" className="dsh-link" onClick={() => downloadCsv(
          'perle-tresorerie.csv',
          ['Période', 'Encaissements', 'Décaissements', 'Solde'],
          data.cash.map((point) => [point.label, point.inflow, point.outflow, point.balance]),
        )}>Export CSV</button>}
        footer={<button type="button" className="dsh-btn dsh-btn-block" onClick={() => navigateTo('tresorerie')}>Ouvrir la trésorerie</button>}>
        {data && <CashChart data={data.cash} onPointClick={() => navigateTo('tresorerie')} />}
      </Panel>

      <Panel className="dsh-col-7" title="Consommation EHS" subtitle="Volume de ressources consommé face au volume planifié"
        state={state} onRetry={refresh}>
        {data && <EhsChart data={{ consumed: data.ehs.consumed, planned: data.ehs.planned, byDepartment: data.ehs.by_department }} onDepartmentClick={() => navigateTo('gestion')} />}
      </Panel>

      <Panel className="dsh-col-5" title="Charge des équipes" subtitle="Collaborateurs staffés, disponibles et indisponibles"
        state={state} onRetry={refresh}
        footer={<button type="button" className="dsh-btn dsh-btn-block" onClick={() => navigateTo('staffing')}>Ouvrir le staffing</button>}>
        {data && <TeamLoadChart rows={data.team_load} onTeamClick={() => navigateTo('staffing')} />}
      </Panel>

      <Panel className="dsh-col-8" title="Livrables et échéances" subtitle={`Livrés, en cours et en retard · ${periodLabel}`}
        state={state} onRetry={refresh}>
        {data && <DeliverablesChart
          data={data.deliverables.map((point) => ({ label: point.label, delivered: point.delivered, inProgress: point.in_progress, late: point.late }))}
          onBucketClick={() => navigateTo('pilotage')} />}
      </Panel>

      {/* ------------------------------------------------------------ */}
      {/* Alertes de direction                                          */}
      {/* ------------------------------------------------------------ */}
      <Panel className="dsh-col-4" title="Alertes de direction" subtitle={`${(data?.alerts ?? []).filter((alert) => alert.level === 'high').length} points de vigilance élevés`}
        state={state} onRetry={refresh}
        emptyLabel="Aucune alerte sur la période.">
        <ul className="dsh-alerts">
          {(data?.alerts ?? []).map((alert) => {
            const meta = ALERT_META[alert.level]
            return <li key={alert.id} className={`dsh-alert dsh-alert-${meta.tone}`}>
              <span className={`dsh-tag dsh-tag-${meta.tone}`}><i aria-hidden="true">{meta.icon}</i>{meta.label}</span>
              <b>{alert.title}</b>
              <p>{alert.detail}</p>
              <button type="button" className="dsh-link" onClick={() => navigateTo(alert.target)}>Ouvrir le module concerné →</button>
            </li>
          })}
          {data && data.alerts.length === 0 && <li className="dsh-alert dsh-alert-info"><p>Aucune alerte sur la période.</p></li>}
        </ul>
      </Panel>
    </div>

    {/* ---------------------------------------------------------------- */}
    {/* Projets prioritaires                                              */}
    {/* ---------------------------------------------------------------- */}
    <Panel title="Projets prioritaires" subtitle="Les projets les plus engagés de l’exercice"
      state={state} onRetry={refresh}
      actions={data && <button type="button" className="dsh-link" onClick={() => downloadCsv(
        'perle-projets-prioritaires.csv',
        ['Code', 'Projet', 'Responsable', 'Avancement', 'Budget consommé', 'Budget', 'Marge', 'Statut', 'Échéance'],
        projects.map((project) => [project.code, project.name, project.manager, `${project.progress} %`, project.budgetUsed, project.budget, `${project.margin} %`, project.status, project.deadline]),
      )}>Export CSV</button>}
      footer={<button type="button" className="dsh-btn dsh-btn-block" onClick={() => navigateTo('pilotage')}>Ouvrir le pilotage des projets</button>}>
      <div className="dsh-table-scroll dsh-cards-on-mobile">
        <table className="dsh-table dsh-table-wide">
          <caption className="dsh-visually-hidden">Projets prioritaires de l’exercice</caption>
          <thead><tr>
            <th scope="col">Projet</th><th scope="col">Responsable</th><th scope="col">Avancement</th>
            <th scope="col">Budget consommé</th><th scope="col">Marge</th><th scope="col">Statut</th>
            <th scope="col">Échéance</th><th scope="col">Action</th>
          </tr></thead>
          <tbody>{projects.map((project) => {
            const used = Math.round((project.budgetUsed / project.budget) * 100)
            const tone = project.status === 'En retard' ? 'danger' : project.status === 'À surveiller' ? 'warn' : 'ok'
            return <tr key={project.code}>
              <td data-label="Projet"><b>{project.name}</b><small>{project.code}</small></td>
              <td data-label="Responsable">{project.manager}</td>
              <td data-label="Avancement">
                <span className="dsh-track dsh-track-sm"><i style={{ width: `${project.progress}%` }} /></span>
                <small>{project.progress} %</small>
              </td>
              <td data-label="Budget consommé">{formatFcfa(project.budgetUsed)}<small>{used} % du budget</small></td>
              <td data-label="Marge"><b className={project.margin < 0 ? 'dsh-bad' : project.margin < 10 ? 'dsh-warn' : 'dsh-good'}>{project.margin} %</b></td>
              <td data-label="Statut">
                <span className={`dsh-tag dsh-tag-${tone}`}><i aria-hidden="true">{tone === 'ok' ? '●' : tone === 'warn' ? '▲' : '⛔'}</i>{project.status}</span>
              </td>
              <td data-label="Échéance">{project.deadline}</td>
              <td data-label="Action">
                <button type="button" className="dsh-link" onClick={() => navigateTo('pilotage')} aria-label={`Ouvrir le projet ${project.name}`}>Ouvrir</button>
              </td>
            </tr>
          })}</tbody>
        </table>
      </div>
      {data && <ChartTable
        caption="Synthèse chiffrée du portefeuille"
        columns={['Indicateur', 'Valeur']}
        rows={[
          ['Budget total engagé', formatFcfa(projects.reduce((sum, project) => sum + project.budget, 0))],
          ['Budget consommé', formatFcfa(projects.reduce((sum, project) => sum + project.budgetUsed, 0))],
          ['Avancement moyen', `${projects.length ? Math.round(projects.reduce((sum, project) => sum + project.progress, 0) / projects.length) : 0} %`],
          ['Projets en difficulté', String(projects.filter((project) => project.status !== 'En cours' && project.status !== 'Terminé').length)],
        ]}
      />}
    </Panel>
    </>}
  </section>
}
