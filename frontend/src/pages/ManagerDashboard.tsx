// Tableau de bord manager affiché sur l'accueil : synthèse de l'équipe dont
// l'utilisateur connecté est le manager (membres, charge, tâches, projets traités).
// Données fournies par backend/accounts/dashboard.py.

import { useEffect, useState } from 'react'
import './ManagerDashboard.css'
import { ChartTable, KpiCard, Panel, type PanelState } from '../components/dashboard/DashboardUI'
import { downloadCsv } from '../components/dashboard/chartTools'
import {
  EhsTrendChart, TaskSplitChart, TasksTrendChart, WorkloadChart,
} from '../components/dashboard/ManagerCharts'
import { DIR_PERIOD_LABELS, type DirPeriod } from '../components/dashboard/directorData'
import { fetchManagerDashboard, type ManagerDashboard as ManagerData } from '../api/dashboard'
import type { Session } from '../auth/session'

const clock = () => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

const ALERT_META = {
  high: { label: 'Élevé', icon: '▲', tone: 'danger' },
  medium: { label: 'Moyen', icon: '◆', tone: 'warn' },
  info: { label: 'Information', icon: 'ⓘ', tone: 'info' },
} as const

const STATUS_TONE = (status: string) =>
  status === 'En retard' ? 'danger' : status === 'Terminé' ? 'ok' : 'warn'

export default function ManagerDashboard({ session, navigateTo }: { session: Session; navigateTo: (page: string) => void }) {
  const managed = session.managedTeams ?? []
  const [teamId, setTeamId] = useState<number | undefined>(managed[0]?.id)
  const [period, setPeriod] = useState<DirPeriod>('quarter')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [data, setData] = useState<ManagerData | null>(null)
  const [refreshedAt, setRefreshedAt] = useState(clock())
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchManagerDashboard(period, teamId)
      .then((payload) => { if (!cancelled) { setData(payload); setRefreshedAt(clock()); setError(false) } })
      .catch(() => { if (!cancelled) setError(true) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [period, teamId, reloadKey])

  const changePeriod = (next: DirPeriod) => {
    if (next === period) return
    setLoading(true); setError(false); setPeriod(next)
  }
  const changeTeam = (next: number) => {
    if (next === teamId) return
    setLoading(true); setError(false); setTeamId(next)
  }
  const refresh = () => { setLoading(true); setError(false); setReloadKey((key) => key + 1) }
  const state: PanelState = error ? 'error' : loading || !data ? 'loading' : 'ready'
  const periodLabel = DIR_PERIOD_LABELS[period]
  const kpi = data?.kpi

  return <section className="dsh-root mgr-root" aria-labelledby="mgr-title">
    <div className="dsh-head">
      <div>
        <span className="dsh-eyebrow">Manager</span>
        <h2 id="mgr-title">Tableau de bord manager{data ? ` · ${data.team.name}` : ''}</h2>
        <p>Vue d’ensemble de votre équipe : effectif, charge, tâches et projets traités.</p>
        <small className="dsh-refreshed"><i aria-hidden="true">⟳</i>Données actualisées à {refreshedAt} · {periodLabel}</small>
      </div>

      <div className="dsh-head-tools">
        {managed.length > 1 && <select
          className="mgr-team-select"
          aria-label="Équipe"
          value={teamId}
          onChange={(event) => changeTeam(Number(event.target.value))}
        >
          {managed.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
        </select>}
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

    {error && <div className="dsh-load-error" role="alert">
      Impossible de charger le tableau de bord de l’équipe.
      <button type="button" className="dsh-btn" onClick={refresh}>Réessayer</button>
    </div>}

    <div className="dsh-kpi-grid">
      <KpiCard loading={loading} icon="☰" tone="primary" label="Effectif de l’équipe"
        value={String(kpi?.members ?? 0)}
        trend={{ direction: 'flat', text: `${kpi?.members_available ?? 0} disponibles` }}
        details="Membres rattachés à l’équipe"
        onOpen={() => navigateTo('gestion-equipes')} />
      <KpiCard loading={loading} icon="▤" tone="primary" label="Tâches actives"
        value={String(kpi?.active_tasks ?? 0)}
        trend={{ direction: 'flat', text: `${kpi?.hours_in_progress ?? 0} h staffées` }}
        details="Tâches acceptées non terminées"
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
        onOpen={() => navigateTo('staffing-suivi')} />
      <KpiCard loading={loading} icon="★" tone="warn" label="Note moyenne équipe"
        value={kpi?.avg_note != null ? `${kpi.avg_note} / 5` : '—'}
        trend={{ direction: 'flat', text: 'Évaluations des tâches terminées' }}
        details="Onglet Notes & Performance"
        onOpen={() => navigateTo('staffing-suivi')} />
      <KpiCard loading={loading} icon="▦" tone="primary" label="Projets en cours"
        value={String(kpi?.projects_active ?? 0)}
        trend={{ direction: 'flat', text: 'Projets confiés à l’équipe' }}
        details="Voir le détail plus bas"
        onOpen={() => navigateTo('pilotage')} />
    </div>

    <div className="dsh-grid">
      <Panel className="dsh-col-6" title="Exécution des tâches" subtitle="Répartition des attributions de l’équipe"
        state={state} onRetry={refresh}>
        {data && <TaskSplitChart data={data.task_status} caption="Exécution des tâches de l’équipe" />}
      </Panel>

      <Panel className="dsh-col-6" title="Validation des tâches" subtitle="Circuit d’acceptation par le manager"
        state={state} onRetry={refresh}>
        {data && <TaskSplitChart data={data.task_validation} caption="Validation des tâches de l’équipe" />}
      </Panel>

      <Panel className="dsh-col-7" title="Tendance des tâches" subtitle="Tâches créées et livrées par mois"
        state={state} onRetry={refresh}
        actions={data && <button type="button" className="dsh-link" onClick={() => downloadCsv(
          'perle-equipe-tendance-taches.csv', ['Mois', 'Créées', 'Livrées'],
          data.tasks_trend.map((point) => [point.label, point.created, point.done]),
        )}>Export CSV</button>}>
        {data && <TasksTrendChart data={data.tasks_trend} />}
      </Panel>

      <Panel className="dsh-col-5" title="Charge par collaborateur" subtitle="Heures staffées face à la capacité mensuelle"
        state={state} onRetry={refresh}
        footer={<button type="button" className="dsh-btn dsh-btn-block" onClick={() => navigateTo('staffing')}>Ouvrir le staffing</button>}>
        {data && <WorkloadChart data={data.workload} />}
      </Panel>

      <Panel className="dsh-col-7" title="Consommation EHS" subtitle="EHS consommés par l’équipe, par mois"
        state={state} onRetry={refresh}>
        {data && <EhsTrendChart data={data.ehs.by_month} />}
      </Panel>

      <Panel className="dsh-col-5" title="Alertes de l’équipe" subtitle={`${(data?.alerts ?? []).filter((a) => a.level === 'high').length} point(s) de vigilance élevés`}
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

    <Panel title="Membres de l’équipe" subtitle="Charge et performance de chaque collaborateur"
      state={state} onRetry={refresh}
      actions={data && <button type="button" className="dsh-link" onClick={() => downloadCsv(
        'perle-equipe-membres.csv',
        ['Nom', 'Fonction', 'Grade', 'Statut', 'Tâches actives', 'Heures', 'Note moyenne'],
        data.members.map((m) => [m.name, m.fonction, m.grade, m.statut, m.active_tasks, m.hours, m.avg_note ?? '—']),
      )}>Export CSV</button>}
      footer={<button type="button" className="dsh-btn dsh-btn-block" onClick={() => navigateTo('gestion-equipes')}>Ouvrir la gestion des équipes</button>}>
      <div className="dsh-table-scroll dsh-cards-on-mobile">
        <table className="dsh-table dsh-table-wide">
          <caption className="dsh-visually-hidden">Membres de l’équipe</caption>
          <thead><tr>
            <th scope="col">Collaborateur</th><th scope="col">Fonction</th><th scope="col">Grade</th>
            <th scope="col">Statut</th><th scope="col">Tâches actives</th><th scope="col">Heures</th><th scope="col">Note</th>
          </tr></thead>
          <tbody>{(data?.members ?? []).map((member) => <tr key={member.id}>
            <td data-label="Collaborateur"><b>{member.name}</b></td>
            <td data-label="Fonction">{member.fonction}</td>
            <td data-label="Grade">{member.grade}</td>
            <td data-label="Statut">{member.statut}</td>
            <td data-label="Tâches actives">{member.active_tasks}</td>
            <td data-label="Heures">{member.hours} h</td>
            <td data-label="Note">{member.avg_note != null ? `${member.avg_note} / 5` : '—'}</td>
          </tr>)}</tbody>
        </table>
      </div>
      {data && data.members.length === 0 && <p className="dsh-subhead">Aucun membre rattaché à cette équipe.</p>}
    </Panel>

    <Panel title="Projets traités par l’équipe" subtitle="Projets sur lesquels l’équipe a des tâches"
      state={state} onRetry={refresh}
      actions={data && <button type="button" className="dsh-link" onClick={() => downloadCsv(
        'perle-equipe-projets.csv',
        ['Code', 'Projet', 'Tâches', 'Tâches terminées', 'Avancement', 'Statut', 'Dernière activité'],
        data.projects.map((p) => [p.code, p.name, p.tasks_total, p.tasks_done, `${p.progress} %`, p.status, p.last_activity]),
      )}>Export CSV</button>}
      footer={<button type="button" className="dsh-btn dsh-btn-block" onClick={() => navigateTo('pilotage')}>Ouvrir le pilotage des projets</button>}>
      <div className="dsh-table-scroll dsh-cards-on-mobile">
        <table className="dsh-table dsh-table-wide">
          <caption className="dsh-visually-hidden">Projets traités par l’équipe</caption>
          <thead><tr>
            <th scope="col">Projet</th><th scope="col">Tâches</th><th scope="col">Avancement</th>
            <th scope="col">Statut</th><th scope="col">Dernière activité</th><th scope="col">Action</th>
          </tr></thead>
          <tbody>{(data?.projects ?? []).map((project) => {
            const tone = STATUS_TONE(project.status)
            return <tr key={project.code}>
              <td data-label="Projet"><b>{project.name}</b><small>{project.code}</small></td>
              <td data-label="Tâches">{project.tasks_done} / {project.tasks_total}</td>
              <td data-label="Avancement">
                <span className="dsh-track dsh-track-sm"><i style={{ width: `${project.progress}%` }} /></span>
                <small>{project.progress} %</small>
              </td>
              <td data-label="Statut">
                <span className={`dsh-tag dsh-tag-${tone}`}><i aria-hidden="true">{tone === 'ok' ? '●' : tone === 'warn' ? '▲' : '⛔'}</i>{project.status}</span>
              </td>
              <td data-label="Dernière activité">{project.last_activity}</td>
              <td data-label="Action">
                <button type="button" className="dsh-link" onClick={() => navigateTo('pilotage')} aria-label={`Ouvrir le projet ${project.name}`}>Ouvrir</button>
              </td>
            </tr>
          })}</tbody>
        </table>
      </div>
      {data && data.projects.length === 0 && <p className="dsh-subhead">L’équipe n’a encore traité aucun projet.</p>}
      {data && <ChartTable
        caption="Synthèse des projets de l’équipe"
        columns={['Indicateur', 'Valeur']}
        rows={[
          ['Projets traités', String(data.projects.length)],
          ['Projets terminés', String(data.projects.filter((p) => p.status === 'Terminé').length)],
          ['Projets en retard', String(data.projects.filter((p) => p.status === 'En retard').length)],
          ['Avancement moyen', `${data.projects.length ? Math.round(data.projects.reduce((sum, p) => sum + p.progress, 0) / data.projects.length) : 0} %`],
        ]}
      />}
    </Panel>
  </section>
}
