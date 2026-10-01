import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  Activity, CheckCircle2, ChevronDown, ChevronRight, Clock3, Flag, Hourglass, Info, MessageCircle, Pause,
  RotateCcw, Search, Star, UserCheck,
} from 'lucide-react'
import { fetchTaskAssignments, rateTaskAssignment, type TaskAssignment, type TaskExecutionStatut } from '../api/taskAssignments'
import { setTaskRevueOverride, taskRevueStatut, type TaskRevueStatut } from '../api/tasks'
import { fetchMe, type MeProfile } from '../api/employees'
import { ApiError } from '../api/client'
import RatingModal from '../components/RatingModal'
import TaskDetailByIdModal from '../components/TaskDetailByIdModal'
import { useUnreadMessages } from '../hooks/useUnreadMessages'
import './SuiviStaffingPage.css'

const errorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    const payload = error.payload as Record<string, unknown> | null
    if (payload && typeof payload === 'object') {
      const firstValue = Object.values(payload)[0]
      if (typeof firstValue === 'string') return firstValue
      if (Array.isArray(firstValue) && typeof firstValue[0] === 'string') return firstValue[0]
    }
    return 'La requête a échoué.'
  }
  return 'Impossible de contacter le serveur.'
}

const STATUT_CLASS: Record<TaskExecutionStatut, string> = {
  a_demarrer: 'orange', en_cours: 'blue', en_pause: 'orange', terminee: 'green',
}

const REVUE_TONE: Record<TaskRevueStatut, string> = { en_cours: 'blue', en_revue: 'orange', termine: 'green' }
const REVUE_LABEL: Record<TaskRevueStatut, string> = { en_cours: 'En cours', en_revue: 'En revue', termine: 'Terminée' }

const initiales = (nom: string) => nom.split(' ').filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase()
const fmtHeures = (value: number) => value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDate = (value: string | null) => value ? new Date(value).toLocaleDateString('fr-FR') : '—'

function formatDDHHMMSS(totalSeconds: number) {
  const neg = totalSeconds < 0
  const abs = Math.abs(totalSeconds)
  const jours = Math.floor(abs / 86400)
  const heures = Math.floor((abs % 86400) / 3600)
  const minutes = Math.floor((abs % 3600) / 60)
  const secondes = Math.floor(abs % 60)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${neg ? '-' : ''}${pad(jours)}:${pad(heures)}:${pad(minutes)}:${pad(secondes)}`
}

/** Temps réellement travaillé par cette personne sur cette tâche, dérivé en direct de ce qui est
 * confirmé côté serveur (TaskAssignment.temps_travaille_secondes) plus le segment actif en cours
 * le cas échéant — jamais un compteur local. */
function tempsTravailleLive(a: TaskAssignment, nowMs: number): number {
  const base = a.temps_travaille_secondes
  if (a.execution_statut === 'en_cours' && a.demarree_le) {
    return base + Math.max(0, (nowMs - new Date(a.demarree_le).getTime()) / 1000)
  }
  return base
}

/** « Temps restant » = le temps qu'il reste à CETTE personne pour terminer SA tâche — les heures
 * qui lui ont été attribuées, moins ce qu'elle a déjà réellement travaillé. Pas un compte à
 * rebours jusqu'à l'échéance de la tâche (ça, c'est ce qu'affiche déjà Exécuté staffing). */
function tempsRestantInfo(a: TaskAssignment, nowMs: number) {
  if (a.execution_statut === 'terminee') return { label: 'Terminée', tone: 'done' } as const
  const alloueesSecondes = a.heures * 3600
  const restantSecondes = alloueesSecondes - tempsTravailleLive(a, nowMs)
  const label = formatDDHHMMSS(Math.floor(restantSecondes))
  if (restantSecondes < 0) return { label, tone: 'retard' } as const
  if (alloueesSecondes > 0 && restantSecondes <= alloueesSecondes * 0.2) return { label, tone: 'urgent' } as const
  return { label, tone: 'ok' } as const
}

interface TaskGroup {
  taskId: number
  task_code: string
  template_nom: string
  project_nom: string | null
  equipe_code: string
  equipe_nom: string
  task_equipe: number
  assignments: TaskAssignment[]
}

export default function SuiviStaffingPage({ navigateTo }: { navigateTo: (page: string) => void }) {
  const [assignments, setAssignments] = useState<TaskAssignment[]>([])
  const [me, setMe] = useState<MeProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const [filterProjet, setFilterProjet] = useState('Tous')
  const [filterCollaborateur, setFilterCollaborateur] = useState('Tous')
  const [filterStatut, setFilterStatut] = useState<'Tous' | TaskExecutionStatut>('Tous')
  const [search, setSearch] = useState('')
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [ratingId, setRatingId] = useState<number | null>(null)
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<number>>(new Set())
  // La discussion est un espace partagé par TÂCHE : toutes les personnes staffées dessus, plus le
  // manager qui l'a attribuée, y échangent au même endroit — même fiche que Staffing des
  // équipes, voir TaskDetailByIdModal.
  const [discussionTaskId, setDiscussionTaskId] = useState<number | null>(null)
  const { unreadTaskIds, markTaskReadLocally } = useUnreadMessages()

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchTaskAssignments(), fetchMe()])
      .then(([data, meData]) => { if (!cancelled) { setAssignments(data); setMe(meData) } })
      .catch((err) => { if (!cancelled) setLoadError(errorMessage(err)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  // Fait vivre le compte à rebours « Temps restant » de chaque ligne, seconde par seconde.
  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const managedTeamIds = useMemo(() => new Set((me?.managed_teams ?? []).map((t) => t.id)), [me])
  const canOverrideAnyTeam = me?.permissions.includes('config:view') ?? false

  const projets = useMemo(
    () => Array.from(new Set(assignments.map((a) => a.project_nom).filter((p): p is string => !!p))),
    [assignments],
  )
  const collaborateurs = useMemo(() => Array.from(new Set(assignments.map((a) => a.user_nom))), [assignments])

  const filtered = assignments.filter((a) => (
    (filterProjet === 'Tous' || a.project_nom === filterProjet)
    && (filterCollaborateur === 'Tous' || a.user_nom === filterCollaborateur)
    && (filterStatut === 'Tous' || a.execution_statut === filterStatut)
    && (search.trim() === '' || `${a.task_code} ${a.template_nom} ${a.user_nom}`.toLowerCase().includes(search.trim().toLowerCase()))
  ))

  // Une même tâche distribuée à plusieurs personnes — de la même équipe ou d'équipes
  // différentes depuis le staffing inter-équipes — ne doit apparaître qu'une seule fois ici.
  const groups = useMemo(() => {
    const map = new Map<number, TaskGroup>()
    for (const a of filtered) {
      let group = map.get(a.task)
      if (!group) {
        group = {
          taskId: a.task, task_code: a.task_code, template_nom: a.template_nom, project_nom: a.project_nom,
          equipe_code: a.equipe_code, equipe_nom: a.equipe_nom, task_equipe: a.task_equipe, assignments: [],
        }
        map.set(a.task, group)
      }
      group.assignments.push(a)
    }
    return Array.from(map.values())
  }, [filtered])

  const resetFiltres = () => {
    setFilterProjet('Tous'); setFilterCollaborateur('Tous'); setFilterStatut('Tous'); setSearch('')
  }

  const countByStatut = (statut: TaskExecutionStatut) => assignments.filter((a) => a.execution_statut === statut).length

  const toggleExpand = (taskId: number) => setExpandedTaskIds((prev) => {
    const next = new Set(prev)
    if (next.has(taskId)) next.delete(taskId); else next.add(taskId)
    return next
  })

  const ratingAssignment = assignments.find((a) => a.id === ratingId) ?? null

  const handleRate = async (note: number, commentaire: string) => {
    if (ratingId === null) return
    const updated = await rateTaskAssignment(ratingId, note, commentaire)
    setAssignments((list) => list.map((a) => a.id === updated.id ? updated : a))
    setRatingId(null)
  }

  const handleMarkEnRevue = async (taskId: number) => {
    setActionError(null)
    try {
      const updated = await setTaskRevueOverride(taskId, 'en_revue')
      setAssignments((list) => list.map((a) => a.task === taskId ? { ...a, task_revue_override: updated.revue_override } : a))
    } catch (err) {
      setActionError(errorMessage(err))
    }
  }

  const KPIS = [
    { icon: Activity, tone: 'indigo', label: 'Staffings réalisés', value: String(assignments.length), sub: 'Toutes attributions confondues' },
    { icon: Hourglass, tone: 'orange', label: 'À démarrer', value: String(countByStatut('a_demarrer')), sub: 'Pas encore démarrés' },
    { icon: Clock3, tone: 'blue', label: 'En cours', value: String(countByStatut('en_cours')), sub: "Staffings en cours d'exécution" },
    { icon: Pause, tone: 'orange', label: 'En pause', value: String(countByStatut('en_pause')), sub: 'Staffings temporairement suspendus' },
    { icon: CheckCircle2, tone: 'green', label: 'Terminés', value: String(countByStatut('terminee')), sub: 'Staffings clôturés' },
  ]

  return (
    <section className="su-page">
      <nav className="su-subtabs">
        <button onClick={() => navigateTo('staffing')}><UserCheck size={14} />Nouveau staffing</button>
        <button className="active" onClick={() => navigateTo('staffing-suivi')}><Activity size={14} />Suivi des staffings</button>
      </nav>

      <div className="su-title-row">
        <div>
          <h1>Suivi des staffings <Info size={15} className="su-title-info" /></h1>
          <p>Suivez l'évolution de chaque staffing réalisé dans l'organisation.</p>
        </div>
      </div>

      {loading && <p className="ge-detail-empty">Chargement…</p>}
      {loadError && <p className="ge-detail-empty">{loadError}</p>}

      {!loading && !loadError && (
        <>
          <div className="su-kpis">
            {KPIS.map((kpi) => (
              <article key={kpi.label} className={`su-kpi su-kpi-${kpi.tone}`}>
                <span className="su-kpi-icon"><kpi.icon size={17} /></span>
                <div>
                  <span className="su-kpi-label">{kpi.label}</span>
                  <strong>{kpi.value}</strong>
                  <small>{kpi.sub}</small>
                </div>
              </article>
            ))}
          </div>

          <div className="su-filters">
            <label>Projet
              <select value={filterProjet} onChange={(e) => setFilterProjet(e.target.value)}>
                <option>Tous</option>
                {projets.map((p) => <option key={p}>{p}</option>)}
              </select>
            </label>
            <label>Collaborateur
              <select value={filterCollaborateur} onChange={(e) => setFilterCollaborateur(e.target.value)}>
                <option>Tous</option>
                {collaborateurs.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label>Statut
              <select value={filterStatut} onChange={(e) => setFilterStatut(e.target.value as 'Tous' | TaskExecutionStatut)}>
                <option value="Tous">Tous</option>
                <option value="a_demarrer">À démarrer</option>
                <option value="en_cours">En cours</option>
                <option value="en_pause">En pause</option>
                <option value="terminee">Terminé</option>
              </select>
            </label>
            <label className="su-search">
              <Search size={14} />
              <input placeholder="Rechercher une tâche, un collaborateur..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </label>
            <button type="button" className="su-reset" onClick={resetFiltres}><RotateCcw size={14} />Réinitialiser</button>
          </div>

          <div className="su-info-banner">
            <Info size={14} />
            <span>Chaque personne fait évoluer son propre statut depuis « Exécuté staffing » — retrouvez ici la progression de toute l'équipe, tâche par tâche.</span>
          </div>

          {actionError && <p className="ge-detail-empty su-action-error">{actionError}</p>}

          <section className="su-table-panel">
            <div className="su-table-head">
              <h3>Tâches staffées <span className="su-count-badge">{groups.length}</span></h3>
            </div>
            <div className="su-table-wrap">
              <table className="su-table">
                <thead>
                  <tr>
                    <th></th><th>Tâche</th><th>Projet</th><th>Équipe</th><th>Collaborateur(s)</th>
                    <th>Heures</th><th>Exécution</th><th>Revue</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {groups.length === 0 && (
                    <tr><td colSpan={9} className="su-empty">Aucun staffing ne correspond à ces filtres.</td></tr>
                  )}
                  {groups.map((g) => {
                    const revue = taskRevueStatut({
                      revue_override: g.assignments[0].task_revue_override,
                      assignments: g.assignments,
                    })
                    const doneCount = g.assignments.filter((a) => a.execution_statut === 'terminee').length
                    const total = g.assignments.length
                    const execTone = doneCount === total ? 'green' : g.assignments.some((a) => a.execution_statut === 'en_cours') ? 'blue' : 'orange'
                    const totalHeures = g.assignments.reduce((sum, a) => sum + a.heures, 0)
                    const expanded = expandedTaskIds.has(g.taskId)
                    const canMarkEnRevue = revue === 'en_cours' && (managedTeamIds.has(g.task_equipe) || canOverrideAnyTeam)
                    return (
                      <Fragment key={g.taskId}>
                        <tr className="su-group-row">
                          <td>
                            <button type="button" className="su-expand-btn" onClick={() => toggleExpand(g.taskId)} aria-label={expanded ? 'Réduire' : 'Détailler'} aria-expanded={expanded}>
                              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                          </td>
                          <td className="su-name">{g.task_code} — {g.template_nom}</td>
                          <td>{g.project_nom ?? 'Transversale'}</td>
                          <td>{g.equipe_code} — {g.equipe_nom}</td>
                          <td>
                            {total === 1 ? (
                              <span className="su-employee">
                                <span className="su-employee-dot">{initiales(g.assignments[0].user_nom)}</span>
                                <span><strong>{g.assignments[0].user_nom}</strong></span>
                              </span>
                            ) : (
                              <span className="su-employee-stack" title={g.assignments.map((a) => a.user_nom).join(', ')}>
                                {g.assignments.slice(0, 3).map((a) => <span key={a.id} className="su-employee-dot">{initiales(a.user_nom)}</span>)}
                                <span className="su-employee-count">{total} collaborateurs</span>
                              </span>
                            )}
                          </td>
                          <td>{fmtHeures(totalHeures)} h</td>
                          <td><span className={`su-statut-pill su-statut-${execTone}`}>{doneCount}/{total} terminé{total > 1 ? 's' : ''}</span></td>
                          <td><span className={`su-statut-pill su-statut-${REVUE_TONE[revue]}`}>{REVUE_LABEL[revue]}</span></td>
                          <td>
                            <div className="su-row-actions">
                              {canMarkEnRevue && (
                                <button type="button" className="su-revue-btn" title="Marquer cette tâche en revue" onClick={() => handleMarkEnRevue(g.taskId)}>
                                  <Flag size={12} />Marquer en revue
                                </button>
                              )}
                              <button type="button" className="su-message-btn" title="Discussion de la tâche" aria-label="Discussion de la tâche" onClick={() => setDiscussionTaskId(g.taskId)}>
                                <MessageCircle size={14} />
                                {unreadTaskIds.has(g.taskId) && <span className="su-message-dot" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expanded && (
                          <tr className="su-detail-row">
                            <td></td>
                            <td colSpan={8}>
                              <table className="su-subtable">
                                <thead>
                                  <tr>
                                    <th>Collaborateur</th><th>Heures</th><th>Date de début</th><th>Staffé le</th>
                                    <th title="Temps restant à la personne pour terminer sa tâche (heures attribuées − temps déjà travaillé)">Temps restant</th>
                                    <th>Statut</th><th>Note</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {g.assignments.map((a) => {
                                    const info = tempsRestantInfo(a, nowMs)
                                    return (
                                      <tr key={a.id}>
                                        <td>
                                          <span className="su-employee">
                                            <span className="su-employee-dot">{initiales(a.user_nom)}</span>
                                            <span><strong>{a.user_nom}</strong></span>
                                          </span>
                                        </td>
                                        <td>{fmtHeures(a.heures)} h</td>
                                        <td>{fmtDate(a.task_date_debut)}</td>
                                        <td>{fmtDate(a.created_at)}</td>
                                        <td><span className={`su-temps-restant su-temps-restant-${info.tone}`}>{info.label}</span></td>
                                        <td><span className={`su-statut-pill su-statut-${STATUT_CLASS[a.execution_statut]}`}>{a.execution_statut_display}</span></td>
                                        <td>
                                          {a.note !== null ? (
                                            <button type="button" className="su-rating-stars" title={a.note_commentaire || undefined} onClick={() => setRatingId(a.id)}>
                                              {[1, 2, 3, 4, 5].map((value) => <Star key={value} size={13} className={value <= a.note! ? 'is-filled' : ''} />)}
                                            </button>
                                          ) : a.execution_statut === 'terminee' ? (
                                            <button type="button" className="su-rate-btn" onClick={() => setRatingId(a.id)}><Star size={12} />Noter</button>
                                          ) : (
                                            <span className="su-rating-none">—</span>
                                          )}
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {ratingAssignment && (
        <RatingModal assignment={ratingAssignment} onClose={() => setRatingId(null)} onSubmit={handleRate} />
      )}

      {discussionTaskId != null && (
        <TaskDetailByIdModal
          taskId={discussionTaskId}
          onClose={() => setDiscussionTaskId(null)}
          onRead={markTaskReadLocally}
        />
      )}
    </section>
  )
}
