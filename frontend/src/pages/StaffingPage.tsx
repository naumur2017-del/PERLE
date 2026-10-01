import { useEffect, useState } from 'react'
import {
  Activity, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Inbox, Info, RotateCcw,
  Search, Star, Trash2, UserCheck, UserPlus, UserX, Users, X, XCircle,
} from 'lucide-react'
import { fetchEmployees, fetchMe, fetchTeams, type Employee, type MeProfile, type Team, type TeamMember } from '../api/employees'
import { fetchOrganisationEhs } from '../api/organisation'
import { decideTask, fetchTask, fetchTasks, taskRevueStatut, type Task } from '../api/tasks'
import { createTaskAssignment, deleteTaskAssignment, rateTaskAssignment, type TaskAssignment } from '../api/taskAssignments'
import { ApiError } from '../api/client'
import RatingModal from '../components/RatingModal'
import { formatMontant } from '../utils/currency'
import './StaffingPage.css'

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

const fmtDate = (value: string | null) => value ? new Date(value).toLocaleDateString('fr-FR') : '—'
const fmtFcfa = (value: number) => formatMontant(value)
const fmtEhs = (value: number) => value.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
const JOUR_HEURES = 8

const initiales = (nom: string) => nom.split(' ').filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase()

const assigneesLabel = (task: Task): string => {
  if (task.assignments.length === 0) return 'Non attribuée'
  if (task.assignments.length === 1) return task.assignments[0].user_nom
  return `${task.assignments.length} personnes`
}

type Tab = 'a_valider' | 'prete' | 'staffee' | 'en_revue' | 'termine'

const TAB_MESSAGES: Record<Tab, string> = {
  a_valider: 'Ces tâches ont été envoyées à votre équipe. Acceptez-les pour pouvoir les staffer, ou refusez-les.',
  prete: "Ces tâches ont été acceptées mais n'ont encore personne d'attribué.",
  staffee: 'Ces tâches ont déjà au moins une personne attribuée. Vous pouvez en ajouter ou en retirer à tout moment.',
  en_revue: 'Toutes les personnes staffées sur ces tâches ont terminé leur exécution : notez-les pour les faire passer en Terminées.',
  termine: 'Ces tâches sont terminées et toutes les personnes staffées ont été notées.',
}

const TAB_TITLES: Record<Tab, string> = {
  a_valider: 'Tâches à valider', prete: 'Tâches prêtes à staffer', staffee: 'Tâches déjà staffées',
  en_revue: 'Tâches en revue', termine: 'Tâches terminées',
}

export default function StaffingPage({ navigateTo, focusTaskId, onFocusConsumed }: {
  navigateTo: (page: string) => void
  focusTaskId?: number | null
  onFocusConsumed?: () => void
}) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [pendingTasks, setPendingTasks] = useState<Task[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [me, setMe] = useState<MeProfile | null>(null)
  // Pour pouvoir staffer n'importe quel employé de l'organisation sur une tâche, pas seulement
  // un membre de l'équipe destinataire (ex. renfort ponctuel d'une autre équipe) — voir
  // selectableMembers.
  const [allEmployees, setAllEmployees] = useState<Employee[]>([])
  const [ehsRate, setEhsRate] = useState(150)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<Tab>('a_valider')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [filterProjet, setFilterProjet] = useState('Tous')
  const [filterEquipe, setFilterEquipe] = useState('Toutes')
  const [search, setSearch] = useState('')
  const [assignMemberId, setAssignMemberId] = useState<number | null>(null)
  const [assignHeures, setAssignHeures] = useState('')
  const [assignInstructions, setAssignInstructions] = useState('')
  const [saving, setSaving] = useState(false)
  const [ratingAssignment, setRatingAssignment] = useState<TaskAssignment | null>(null)

  useEffect(() => {
    Promise.all([fetchTasks({ staffing: true }), fetchTasks({ aValider: true }), fetchTeams(), fetchMe(), fetchOrganisationEhs(), fetchEmployees()])
      .then(([tasksData, pendingData, teamsData, meData, ehsData, employeesData]) => {
        setTasks(tasksData)
        setPendingTasks(pendingData)
        setTeams(teamsData)
        setMe(meData)
        setEhsRate(ehsData.taux_ehs_fcfa)
        setAllEmployees(employeesData)
      })
      .catch(() => setLoadError('Impossible de charger les tâches à staffer.'))
      .finally(() => setLoading(false))
  }, [])

  // Ouvre directement la tâche visée depuis une notification (« nouvelle tâche envoyée à votre
  // équipe ») dans l'onglet « À valider ». N'agit qu'une fois les données chargées.
  useEffect(() => {
    if (focusTaskId == null || loading) return
    if (pendingTasks.some((t) => t.id === focusTaskId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- réagit à une demande de navigation externe (focusTaskId), pas dérivé du rendu
      setActiveTab('a_valider')
      setSelectedId(focusTaskId)
    }
    onFocusConsumed?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ne doit réagir qu'à focusTaskId/loading/pendingTasks
  }, [focusTaskId, loading, pendingTasks])

  const allTasks = [...pendingTasks, ...tasks]
  const selected = activeTab === 'a_valider'
    ? pendingTasks.find((t) => t.id === selectedId) ?? null
    : tasks.find((t) => t.id === selectedId) ?? null
  const selectedTeam = selected ? teams.find((t) => t.id === selected.equipe) ?? null : null
  const alreadyAssignedIds = new Set(selected?.assignments.map((a) => a.user) ?? [])
  // Une personne en congé ou inactive ne peut pas être staffée (contrôle aussi côté backend,
  // voir TaskAssignmentSerializer.validate) : elle reste visible mais désactivée dans la liste.
  const statutLabel = (statut: string) => statut === 'conge' ? ' — en congé' : statut === 'inactif' ? ' — inactif' : ''
  // Le manager peut staffer n'importe quel employé de l'organisation sur sa tâche, pas seulement
  // un membre de l'équipe destinataire (renfort ponctuel d'une autre équipe) — voir
  // TaskAssignmentSerializer.validate, qui ne vérifie plus que l'appartenance à l'organisation.
  const teamMemberIds = new Set((selectedTeam?.members ?? []).map((m) => m.id))
  const otherEmployees = allEmployees.filter((e) => e.id !== me?.id && !teamMemberIds.has(e.id) && !alreadyAssignedIds.has(e.id))
  const selectableMembers: (TeamMember | MeProfile | Employee)[] = [
    ...(me && !alreadyAssignedIds.has(me.id) ? [me] : []),
    ...(selectedTeam?.members.filter((m) => m.id !== me?.id && !alreadyAssignedIds.has(m.id)) ?? []),
    ...otherEmployees,
  ]
  const availableMembers = selectableMembers.filter((m) => m.statut === 'actif')
  const assignMember = availableMembers.find((m) => m.id === assignMemberId) ?? null
  const assignHeuresNumber = Number(assignHeures) || 0
  const ehsPreview = assignMember ? assignMember.grade * assignHeuresNumber : 0
  const montantPreview = ehsPreview * ehsRate
  const resteApres = selected?.budget_reste_fcfa != null ? selected.budget_reste_fcfa - montantPreview : null
  const depasseReste = resteApres !== null && resteApres < 0
  const canAssign = assignMember !== null && assignHeuresNumber > 0 && !depasseReste

  const handleSelect = (task: Task) => {
    setSelectedId(task.id)
    setAssignMemberId(null)
    setAssignHeures('')
    setActionError(null)
  }

  const closePanel = () => {
    setSelectedId(null)
    setAssignMemberId(null)
    setAssignHeures('')
    setRatingAssignment(null)
  }

  const changeTab = (tab: Tab) => { setActiveTab(tab); closePanel() }

  const countAValider = pendingTasks.length
  const countPrete = tasks.filter((t) => t.assignments.length === 0).length
  const countStaffee = tasks.filter((t) => t.assignments.length > 0 && taskRevueStatut(t) === 'en_cours').length
  const countEnRevue = tasks.filter((t) => taskRevueStatut(t) === 'en_revue').length
  const countTermine = tasks.filter((t) => taskRevueStatut(t) === 'termine').length

  const projets = Array.from(new Set(allTasks.map((t) => t.project_nom).filter((p): p is string => Boolean(p))))
  const equipes = Array.from(new Set(allTasks.map((t) => t.equipe_nom)))

  const scoped = activeTab === 'a_valider' ? pendingTasks
    : activeTab === 'prete' ? tasks.filter((t) => t.assignments.length === 0)
    : activeTab === 'staffee' ? tasks.filter((t) => t.assignments.length > 0 && taskRevueStatut(t) === 'en_cours')
    : activeTab === 'en_revue' ? tasks.filter((t) => taskRevueStatut(t) === 'en_revue')
    : tasks.filter((t) => taskRevueStatut(t) === 'termine')

  const filtered = scoped.filter((t) => (
    (filterProjet === 'Tous' || t.project_nom === filterProjet)
    && (filterEquipe === 'Toutes' || t.equipe_nom === filterEquipe)
    && (search.trim() === '' || `${t.code} ${t.template_nom} ${t.project_nom ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()))
  ))

  const resetFiltres = () => { setFilterProjet('Tous'); setFilterEquipe('Toutes'); setSearch('') }

  const refreshTask = async (id: number) => {
    const updated = await fetchTask(id)
    setTasks((prev) => prev.some((t) => t.id === id) ? prev.map((t) => t.id === id ? updated : t) : prev)
    setPendingTasks((prev) => prev.some((t) => t.id === id) ? prev.map((t) => t.id === id ? updated : t) : prev)
    return updated
  }

  const handleDecision = async (task: Task, decision: 'acceptee' | 'refusee') => {
    setSaving(true)
    setActionError(null)
    try {
      const updated = await decideTask(task.id, decision)
      setPendingTasks((prev) => prev.filter((t) => t.id !== task.id))
      if (decision === 'acceptee') setTasks((prev) => [updated, ...prev])
      if (selectedId === task.id) closePanel()
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleAssign = async () => {
    if (!selected || !canAssign || assignMemberId === null) return
    setSaving(true)
    setActionError(null)
    try {
      await createTaskAssignment({
        task: selected.id, user: assignMemberId, heures: assignHeuresNumber,
        instructions: assignInstructions.trim(),
      })
      await refreshTask(selected.id)
      setAssignMemberId(null)
      setAssignHeures('')
      setAssignInstructions('')
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveAssignment = async (assignment: TaskAssignment) => {
    if (!selected) return
    if (!window.confirm(`Retirer ${assignment.user_nom} de cette tâche ?`)) return
    setSaving(true)
    setActionError(null)
    try {
      await deleteTaskAssignment(assignment.id)
      await refreshTask(selected.id)
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleRate = async (note: number, commentaire: string) => {
    if (!ratingAssignment || !selected) return
    await rateTaskAssignment(ratingAssignment.id, note, commentaire)
    await refreshTask(selected.id)
    setRatingAssignment(null)
  }

  const KPIS = [
    { icon: Inbox, tone: 'blue', label: 'Tâches reçues', value: String(allTasks.length), sub: 'Reçues depuis Attribution des tâches' },
    { icon: Clock3, tone: 'orange', label: 'En attente de décision', value: String(countAValider), sub: 'À accepter ou refuser' },
    { icon: UserX, tone: 'indigo', label: 'Prêtes à staffer', value: String(countPrete), sub: 'Acceptées, sans personne attribuée' },
    { icon: CheckCircle2, tone: 'green', label: 'Déjà staffées', value: String(countStaffee), sub: 'Staffées, exécution en cours' },
    { icon: Users, tone: 'purple', label: 'Équipes managées', value: String(new Set(allTasks.map((t) => t.equipe)).size), sub: 'Concernées par ces tâches' },
  ]

  if (loading) return <section className="ns-page"><p className="ns-empty">Chargement…</p></section>

  return (
    <section className="ns-page">
      <nav className="ns-subtabs">
        <button className="active" onClick={() => navigateTo('staffing')}><UserCheck size={14} />Nouveau staffing</button>
        <button onClick={() => navigateTo('staffing-suivi')}><Activity size={14} />Suivi des staffings</button>
      </nav>

      <div className="ns-title-row">
        <div>
          <h1>Nouveau staffing <Info size={15} className="ns-title-info" /></h1>
          <p>Acceptez ou refusez les tâches envoyées à votre équipe, puis répartissez les tâches acceptées entre vous-même et/ou vos membres, avec les heures de chacun.</p>
        </div>
        <button type="button" className="ns-btn-outline" onClick={() => navigateTo('staffing-execute')}>Voir l'exécuté staffing</button>
      </div>

      {loadError && <p className="ns-empty">{loadError}</p>}

      {!loadError && (
        <>
          <div className="ns-kpis">
            {KPIS.map((kpi) => (
              <article key={kpi.label} className={`ns-kpi ns-kpi-${kpi.tone}`}>
                <span className="ns-kpi-icon"><kpi.icon size={17} /></span>
                <div>
                  <span className="ns-kpi-label">{kpi.label}</span>
                  <strong>{kpi.value}</strong>
                  <small>{kpi.sub}</small>
                </div>
              </article>
            ))}
          </div>

          {allTasks.length === 0 ? (
            <div className="ns-info-banner">
              <Info size={14} />
              <span>Aucune tâche ne vous attend pour l’instant. Une tâche apparaît ici dès qu’elle est attribuée depuis Attribution des tâches à une équipe dont vous êtes le manager.</span>
            </div>
          ) : (
            <div className={`ns-layout ${selected ? 'has-detail' : ''}`}>
              <div className="ns-main">
                <nav className="ns-tabs">
                  <button className={activeTab === 'a_valider' ? 'active' : ''} onClick={() => changeTab('a_valider')}>
                    À valider <span className="ns-tab-count">{countAValider}</span>
                  </button>
                  <button className={activeTab === 'prete' ? 'active' : ''} onClick={() => changeTab('prete')}>
                    Prêtes à staffer <span className="ns-tab-count">{countPrete}</span>
                  </button>
                  <button className={activeTab === 'staffee' ? 'active' : ''} onClick={() => changeTab('staffee')}>
                    Déjà staffées <span className="ns-tab-count">{countStaffee}</span>
                  </button>
                  <button className={activeTab === 'en_revue' ? 'active' : ''} onClick={() => changeTab('en_revue')}>
                    En revue <span className="ns-tab-count">{countEnRevue}</span>
                  </button>
                  <button className={activeTab === 'termine' ? 'active' : ''} onClick={() => changeTab('termine')}>
                    Terminées <span className="ns-tab-count">{countTermine}</span>
                  </button>
                </nav>

                <div className="ns-filters">
                  <label>Projet
                    <select value={filterProjet} onChange={(e) => setFilterProjet(e.target.value)}>
                      <option>Tous</option>
                      {projets.map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </label>
                  <label>Équipe
                    <select value={filterEquipe} onChange={(e) => setFilterEquipe(e.target.value)}>
                      <option>Toutes</option>
                      {equipes.map((e) => <option key={e}>{e}</option>)}
                    </select>
                  </label>
                  <label className="ns-search">
                    <Search size={14} />
                    <input placeholder="Rechercher une tâche, un projet..." value={search} onChange={(e) => setSearch(e.target.value)} />
                  </label>
                  <button type="button" className="ns-reset" onClick={resetFiltres}><RotateCcw size={14} />Réinitialiser</button>
                </div>

                <div className="ns-info-banner">
                  <Info size={14} />
                  <span>{TAB_MESSAGES[activeTab]}</span>
                </div>

                {actionError && <p className="ns-empty">{actionError}</p>}

                <section className="ns-table-panel">
                  <div className="ns-table-head">
                    <h3>
                      {TAB_TITLES[activeTab]}
                      {' '}<span className="ns-count-badge">{filtered.length}</span>
                    </h3>
                    <div className="ns-table-head-actions">
                      <span>{filtered.length} tâche{filtered.length > 1 ? 's' : ''}</span>
                      <button type="button" disabled><ChevronLeft size={14} /></button>
                      <button type="button" disabled><ChevronRight size={14} /></button>
                    </div>
                  </div>
                  <div className="ns-table-wrap">
                    <table className="ns-table">
                      <thead>
                        <tr>
                          <th>Code</th><th>Projet</th><th>Tâche</th><th>Équipe</th><th>Ligne budgétaire</th>
                          <th>Date de début</th><th>Échéance</th><th>Priorité</th>
                          <th>{activeTab === 'a_valider' ? 'Décision' : 'Attribuée à'}</th><th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.length === 0 && (
                          <tr><td colSpan={10} className="ns-empty">Aucune tâche ne correspond à ces filtres.</td></tr>
                        )}
                        {filtered.map((task) => (
                          <tr key={task.id} className={selectedId === task.id ? 'ns-row-selected' : ''} onClick={() => handleSelect(task)}>
                            <td className="ns-code">{task.code}</td>
                            <td>{task.project_nom ?? 'Transversale'}</td>
                            <td className="ns-name">{task.template_nom}</td>
                            <td>{task.equipe_nom}</td>
                            <td>{task.ligne_budgetaire_nom}</td>
                            <td>{fmtDate(task.date_debut)}</td>
                            <td>{fmtDate(task.echeance)}</td>
                            <td>{task.priorite_display}</td>
                            <td>
                              {activeTab === 'a_valider' ? (
                                <span className="ns-pill-warn">En attente</span>
                              ) : task.assignments.length > 0 ? (
                                <span className="ns-statut ns-statut-green">{assigneesLabel(task)}</span>
                              ) : (
                                <span className="ns-pill-warn">Non attribuée</span>
                              )}
                            </td>
                            <td onClick={(e) => e.stopPropagation()}>
                              {activeTab === 'a_valider' ? (
                                <div className="ns-decision-actions">
                                  <button type="button" className="ns-action-btn" disabled={saving} onClick={() => handleDecision(task, 'acceptee')}><Check size={13} />Accepter</button>
                                  <button type="button" className="ns-action-btn ns-action-btn-danger" disabled={saving} onClick={() => handleDecision(task, 'refusee')}><XCircle size={13} />Refuser</button>
                                </div>
                              ) : (
                                <button type="button" className="ns-action-btn" onClick={() => handleSelect(task)}>{activeTab === 'prete' ? 'Staffer' : 'Voir'}</button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>

              {selected && (
                <aside className="ns-detail">
                  <div className="ns-detail-head-row">
                    <h3>Détail de la tâche sélectionnée</h3>
                    <button type="button" className="ns-detail-close" onClick={closePanel} aria-label="Fermer"><X size={16} /></button>
                  </div>

                  <div className="ns-detail-head">
                    <span className="ns-detail-check ns-statut-blue">{activeTab === 'a_valider' ? <Clock3 size={14} /> : <CheckCircle2 size={14} />}</span>
                    <strong>{selected.code}</strong>
                    <span className="ns-detail-badge">{selected.statut_display}</span>
                  </div>

                  <dl className="ns-detail-info">
                    <div><dt>Tâche</dt><dd>{selected.template_nom}</dd></div>
                    <div><dt>Projet</dt><dd>{selected.project_nom ? `${selected.project_code} — ${selected.project_nom}` : 'Transversale (aucun projet)'}</dd></div>
                    <div><dt>Équipe</dt><dd>{selected.equipe_code} — {selected.equipe_nom}</dd></div>
                    <div><dt>Ligne budgétaire</dt><dd>{selected.ligne_budgetaire_code} — {selected.ligne_budgetaire_nom}</dd></div>
                    <div><dt>Date de début</dt><dd>{fmtDate(selected.date_debut)}</dd></div>
                    <div><dt>Échéance</dt><dd>{fmtDate(selected.echeance)}</dd></div>
                    <div><dt>Priorité</dt><dd>{selected.priorite_display}</dd></div>
                    {selected.budget_ligne_montant != null && (
                      <div><dt>Reste sur la ligne (projet)</dt><dd>{fmtFcfa(selected.budget_reste_fcfa ?? 0)} <small>/ {fmtFcfa(selected.budget_ligne_montant)}</small></dd></div>
                    )}
                  </dl>
                  {selected.description && <p className="ns-detail-desc">{selected.description}</p>}

                  {activeTab === 'a_valider' ? (
                    <div className="ns-detail-section">
                      <h4>Décision</h4>
                      <div className="ns-detail-actions">
                        <button type="button" className="ns-btn-primary" disabled={saving} onClick={() => handleDecision(selected, 'acceptee')}>
                          <Check size={14} />{saving ? 'Enregistrement…' : 'Accepter'}
                        </button>
                        <button type="button" className="ns-btn-outline" disabled={saving} onClick={() => handleDecision(selected, 'refusee')}>
                          <XCircle size={14} />Refuser
                        </button>
                      </div>
                    </div>
                  ) : (activeTab === 'en_revue' || activeTab === 'termine') ? (
                    <div className="ns-detail-section">
                      <h4>Personnes staffées</h4>
                      <ul className="ns-affectations-list">
                        {selected.assignments.map((a) => (
                          <li key={a.id}>
                            <span className="ns-employee">
                              <span className="ns-employee-dot">{initiales(a.user_nom)}</span>
                              <span>
                                <strong>{a.user_nom}</strong>
                                <small>{a.heures} h (grade {a.user_grade}) · {fmtEhs(a.ehs_consomme)} EHS · {fmtFcfa(a.montant_fcfa)} · {a.execution_statut_display}</small>
                                {a.note != null && (
                                  <span className="su-rating-stars" aria-label={`Note : ${a.note}/5`}>
                                    {[1, 2, 3, 4, 5].map((v) => <Star key={v} size={13} className={v <= a.note! ? 'is-filled' : ''} />)}
                                  </span>
                                )}
                                {a.note_commentaire && <small className="ns-affectation-instructions">« {a.note_commentaire} »</small>}
                              </span>
                            </span>
                            <button type="button" className="ns-action-btn" onClick={() => setRatingAssignment(a)}>
                              <Star size={12} />{a.note != null ? 'Modifier la note' : 'Noter'}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <>
                      {selected.assignments.length > 0 && (
                        <div className="ns-detail-section">
                          <h4>Personnes attribuées</h4>
                          <ul className="ns-affectations-list">
                            {selected.assignments.map((a) => (
                              <li key={a.id}>
                                <span className="ns-employee">
                                  <span className="ns-employee-dot">{initiales(a.user_nom)}</span>
                                  <span>
                                    <strong>{a.user_nom}</strong>
                                    <small>{a.heures} h (grade {a.user_grade}) · {fmtEhs(a.ehs_consomme)} EHS · {fmtFcfa(a.montant_fcfa)} · {a.execution_statut_display}</small>
                                    {a.instructions && <small className="ns-affectation-instructions">« {a.instructions} »</small>}
                                  </span>
                                </span>
                                {a.execution_statut !== 'terminee' && (
                                  <button type="button" className="ge-row-action ge-row-action-danger" aria-label={`Retirer ${a.user_nom}`} disabled={saving} onClick={() => handleRemoveAssignment(a)}>
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="ns-detail-section">
                        <h4><UserPlus size={14} />Attribuer à une personne</h4>
                        <label className="ns-detail-field">
                          Personne *
                          <select value={assignMemberId ?? ''} onChange={(e) => setAssignMemberId(e.target.value === '' ? null : Number(e.target.value))}>
                            <option value="">{availableMembers.length === 0 ? 'Personne disponible' : 'Sélectionner'}</option>
                            {me && !alreadyAssignedIds.has(me.id) && (
                              <option value={me.id} disabled={me.statut !== 'actif'}>Moi-même — {me.first_name} {me.last_name} (grade {me.grade}){statutLabel(me.statut)}</option>
                            )}
                            {selectedTeam && selectedTeam.members.filter((m) => m.id !== me?.id && !alreadyAssignedIds.has(m.id)).length > 0 && (
                              <optgroup label={`Équipe ${selectedTeam.name}`}>
                                {selectedTeam.members
                                  .filter((m) => m.id !== me?.id && !alreadyAssignedIds.has(m.id))
                                  .map((m) => <option key={m.id} value={m.id} disabled={m.statut !== 'actif'}>{m.first_name} {m.last_name} (grade {m.grade}){statutLabel(m.statut)}</option>)}
                              </optgroup>
                            )}
                            {otherEmployees.length > 0 && (
                              <optgroup label="Autres employés de l’organisation">
                                {otherEmployees.map((e) => (
                                  <option key={e.id} value={e.id} disabled={e.statut !== 'actif'}>
                                    {e.first_name} {e.last_name} (grade {e.grade}){e.team ? ` — ${e.team.name}` : ''}{statutLabel(e.statut)}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                          </select>
                        </label>
                        <label className="ns-detail-field">
                          Heures sur cette tâche *
                          <input type="number" min={0} step="0.5" value={assignHeures} placeholder="Ex. 8" onChange={(e) => setAssignHeures(e.target.value)} />
                        </label>
                        <label className="ns-detail-field">
                          Instructions pour la personne attribuée
                          <textarea
                            rows={3}
                            value={assignInstructions}
                            placeholder="Précisez les étapes à suivre, le contexte ou toute explication utile pour faciliter l’exécution..."
                            onChange={(e) => setAssignInstructions(e.target.value)}
                          />
                        </label>

                        {assignMember && assignHeuresNumber > 0 && (
                          <div className="ns-predict-grid">
                            <div className="ns-predict-card">
                              <span className="ns-predict-card-label"><Activity size={11} />Consommation de cette attribution</span>
                              <strong className="ns-predict-card-value">{fmtEhs(ehsPreview)} EHS</strong>
                              <span className="ns-predict-card-sub">{assignMember.grade} EHS/h × {assignHeuresNumber} h · ≈ {(assignHeuresNumber / JOUR_HEURES).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} jour(s) de 8h</span>
                            </div>

                            {selected.budget_ligne_montant != null && resteApres !== null && (
                              <>
                                <div className={`ns-predict-card${depasseReste ? ' is-danger' : ''}`}>
                                  <span className="ns-predict-card-label">Reste sur la ligne — FCFA</span>
                                  <strong className="ns-predict-card-value">{fmtFcfa(resteApres)}</strong>
                                  <span className="ns-predict-card-sub">Somme initiale : {fmtFcfa(selected.budget_ligne_montant)}</span>
                                  {depasseReste && <span className="ns-predict-card-sub is-danger-text">Dépasse le reste disponible ({fmtFcfa(selected.budget_reste_fcfa ?? 0)}).</span>}
                                </div>
                                <div className={`ns-predict-card${depasseReste ? ' is-danger' : ''}`}>
                                  <span className="ns-predict-card-label">Reste sur la ligne — EHS</span>
                                  <strong className="ns-predict-card-value">{fmtEhs(resteApres / ehsRate)} EHS</strong>
                                  <span className="ns-predict-card-sub">Somme initiale : {fmtEhs(selected.budget_ligne_montant / ehsRate)} EHS</span>
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        <div className="ns-detail-actions">
                          <button type="button" className="ns-btn-primary" disabled={!canAssign || saving} onClick={handleAssign}>
                            {saving ? 'Enregistrement…' : 'Ajouter cette personne'}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </aside>
              )}
            </div>
          )}
        </>
      )}

      {ratingAssignment && (
        <RatingModal assignment={ratingAssignment} onClose={() => setRatingAssignment(null)} onSubmit={handleRate} />
      )}
    </section>
  )
}
