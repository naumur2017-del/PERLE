// Tableau de bord de direction affiché sous la section « Modules » de l'accueil.
// Destiné au directeur, administrateur d'une entreprise cliente de PERLE.

import { useCallback, useEffect, useMemo, useState } from 'react'
import './HomeDashboard.css'
import { ChartTable, KpiCard, Panel, type PanelState } from '../components/dashboard/DashboardUI'
import {
  BudgetDonut, CashChart, DeliverablesChart, EhsChart, FinanceChart, PortfolioChart, TeamLoadChart,
} from '../components/dashboard/DirectorCharts'
import { downloadCsv } from '../components/dashboard/chartTools'
import {
  DIR_PERIOD_LABELS, cashSeries, deliverableSeries, dirAlerts, dirKpi, financeSeries,
  formatFcfa, marginPercent, projects, type DirPeriod,
} from '../components/dashboard/directorData'

const FILTER_KEY = 'perle-direction-filters'

const clock = () => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

const ALERT_META = {
  high: { label: 'Élevé', icon: '▲', tone: 'danger' },
  medium: { label: 'Moyen', icon: '◆', tone: 'warn' },
  info: { label: 'Information', icon: 'ⓘ', tone: 'info' },
} as const

export default function HomeDashboard({ navigateTo }: { navigateTo: (page: string) => void }) {
  const stored = useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem(FILTER_KEY) ?? '{}') } catch { return {} }
  }, [])

  const [period, setPeriod] = useState<DirPeriod>(stored.period ?? 'year')
  const [loading, setLoading] = useState(false)
  const [refreshedAt, setRefreshedAt] = useState(clock())

  // Le filtre de période est conservé pendant la session.
  useEffect(() => { sessionStorage.setItem(FILTER_KEY, JSON.stringify({ period })) }, [period])

  const refresh = useCallback(() => {
    setLoading(true)
    const timer = setTimeout(() => { setLoading(false); setRefreshedAt(clock()) }, 600)
    return () => clearTimeout(timer)
  }, [])

  const changePeriod = (next: DirPeriod) => { setPeriod(next); refresh() }

  const data = useMemo(() => ({
    finance: financeSeries(period),
    cash: cashSeries(period),
    deliverables: deliverableSeries(period),
  }), [period])

  const state: PanelState = loading ? 'loading' : 'ready'
  const periodLabel = DIR_PERIOD_LABELS[period]

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
      </div>
    </div>

    {/* ---------------------------------------------------------------- */}
    {/* Indicateurs de tête                                               */}
    {/* ---------------------------------------------------------------- */}
    <div className="dsh-kpi-grid">
      <KpiCard loading={loading} icon="₣" tone="primary" label="Chiffre d’affaires"
        value={formatFcfa(dirKpi.revenue)}
        trend={{ direction: 'up', text: `+${dirKpi.revenueDelta} % vs période précédente`, good: true }}
        details={`${periodLabel} · 6 projets facturés`}
        onOpen={() => navigateTo('pilotage')} />
      <KpiCard loading={loading} icon="◈" tone="ok" label="Marge nette"
        value={`${dirKpi.margin} %`}
        trend={{ direction: 'up', text: `+${dirKpi.marginDelta} pt`, good: true }}
        details="Objectif annuel : 20 %"
        onOpen={() => navigateTo('pilotage')} />
      <KpiCard loading={loading} icon="▤" tone="primary" label="Projets actifs"
        value={String(dirKpi.activeProjects)}
        trend={{ direction: 'flat', text: `${dirKpi.watchProjects} à surveiller` }}
        details="2 livraisons prévues ce mois"
        onOpen={() => navigateTo('pilotage')} />
      <KpiCard loading={loading} icon="☰" tone="warn" label="Taux d’occupation"
        value={`${dirKpi.occupancy} %`}
        trend={{ direction: 'flat', text: `${dirKpi.headcount} collaborateurs` }}
        details="10 collaborateurs disponibles"
        onOpen={() => navigateTo('staffing')} />
      <KpiCard loading={loading} icon="◉" tone="ok" label="Trésorerie disponible"
        value={formatFcfa(dirKpi.cash)}
        trend={{ direction: 'down', text: `${dirKpi.cashDelta} % vs période précédente`, good: false }}
        details="Seuil de confort : 80 M FCFA"
        onOpen={() => navigateTo('tresorerie')} />
      <KpiCard loading={loading} icon="⛔" tone="danger" label="Tâches en retard"
        value={String(dirKpi.lateTasks)}
        trend={{ direction: 'down', text: `${dirKpi.lateTasksDelta} vs période précédente`, good: true }}
        details="Réparties sur 2 projets"
        onOpen={() => navigateTo('staffing')} />
    </div>

    {/* ---------------------------------------------------------------- */}
    {/* Graphiques                                                        */}
    {/* ---------------------------------------------------------------- */}
    <div className="dsh-grid">
      <Panel className="dsh-col-8" title="Performance financière" subtitle={`Recettes, dépenses et taux de marge · ${periodLabel}`}
        state={state} onRetry={refresh}
        actions={<button type="button" className="dsh-link" onClick={() => downloadCsv(
          'perle-performance-financiere.csv',
          ['Période', 'Recettes', 'Dépenses', 'Résultat', 'Taux de marge'],
          data.finance.map((point) => [point.label, point.revenue, point.costs, point.revenue - point.costs, `${marginPercent(point).toFixed(1)} %`]),
        )}>Export CSV</button>}>
        <FinanceChart data={data.finance} onPointClick={() => navigateTo('pilotage')} />
      </Panel>

      <Panel className="dsh-col-4" title="Répartition du budget" subtitle="Par nature de charge ou par département"
        state={state} onRetry={refresh}>
        <BudgetDonut onSliceClick={() => navigateTo('architecture')} />
      </Panel>

      <Panel className="dsh-col-5" title="Portefeuille de projets" subtitle="Avancement comparé à la consommation budgétaire"
        state={state} onRetry={refresh}
        footer={<button type="button" className="dsh-btn dsh-btn-block" onClick={() => navigateTo('pilotage')}>Voir tous les projets</button>}>
        <PortfolioChart onProjectClick={() => navigateTo('pilotage')} />
      </Panel>

      <Panel className="dsh-col-7" title="Trésorerie" subtitle={`Solde et flux nets · ${periodLabel}`}
        state={state} onRetry={refresh}
        actions={<button type="button" className="dsh-link" onClick={() => downloadCsv(
          'perle-tresorerie.csv',
          ['Période', 'Encaissements', 'Décaissements', 'Solde'],
          data.cash.map((point) => [point.label, point.inflow, point.outflow, point.balance]),
        )}>Export CSV</button>}
        footer={<button type="button" className="dsh-btn dsh-btn-block" onClick={() => navigateTo('tresorerie')}>Ouvrir la trésorerie</button>}>
        <CashChart data={data.cash} onPointClick={() => navigateTo('tresorerie')} />
      </Panel>

      <Panel className="dsh-col-7" title="Consommation EHS" subtitle="Volume de ressources consommé face au volume planifié"
        state={state} onRetry={refresh}>
        <EhsChart onDepartmentClick={() => navigateTo('gestion')} />
      </Panel>

      <Panel className="dsh-col-5" title="Charge des équipes" subtitle="Collaborateurs staffés, disponibles et indisponibles"
        state={state} onRetry={refresh}
        footer={<button type="button" className="dsh-btn dsh-btn-block" onClick={() => navigateTo('staffing')}>Ouvrir le staffing</button>}>
        <TeamLoadChart onTeamClick={() => navigateTo('staffing')} />
      </Panel>

      <Panel className="dsh-col-8" title="Livrables et échéances" subtitle={`Livrés, en cours et en retard · ${periodLabel}`}
        state={state} onRetry={refresh}>
        <DeliverablesChart data={data.deliverables} onBucketClick={() => navigateTo('pilotage')} />
      </Panel>

      {/* ------------------------------------------------------------ */}
      {/* Alertes de direction                                          */}
      {/* ------------------------------------------------------------ */}
      <Panel className="dsh-col-4" title="Alertes de direction" subtitle={`${dirAlerts.filter((alert) => alert.level === 'high').length} points de vigilance élevés`}
        state={state} onRetry={refresh}>
        <ul className="dsh-alerts">
          {dirAlerts.map((alert) => {
            const meta = ALERT_META[alert.level]
            return <li key={alert.id} className={`dsh-alert dsh-alert-${meta.tone}`}>
              <span className={`dsh-tag dsh-tag-${meta.tone}`}><i aria-hidden="true">{meta.icon}</i>{meta.label}</span>
              <b>{alert.title}</b>
              <p>{alert.detail}</p>
              <button type="button" className="dsh-link" onClick={() => navigateTo(alert.target)}>Ouvrir le module concerné →</button>
            </li>
          })}
        </ul>
      </Panel>
    </div>

    {/* ---------------------------------------------------------------- */}
    {/* Projets prioritaires                                              */}
    {/* ---------------------------------------------------------------- */}
    <Panel title="Projets prioritaires" subtitle="Les six projets les plus engagés de l’exercice"
      state={state} onRetry={refresh}
      actions={<button type="button" className="dsh-link" onClick={() => downloadCsv(
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
      <ChartTable
        caption="Synthèse chiffrée du portefeuille"
        columns={['Indicateur', 'Valeur']}
        rows={[
          ['Budget total engagé', formatFcfa(projects.reduce((sum, project) => sum + project.budget, 0))],
          ['Budget consommé', formatFcfa(projects.reduce((sum, project) => sum + project.budgetUsed, 0))],
          ['Avancement moyen', `${Math.round(projects.reduce((sum, project) => sum + project.progress, 0) / projects.length)} %`],
          ['Projets en difficulté', String(projects.filter((project) => project.status !== 'En cours').length)],
        ]}
      />
    </Panel>
  </section>
}
