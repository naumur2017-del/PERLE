import { useEffect, useState } from 'react'
import {
  Activity, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Inbox, Info, RotateCcw,
  Search, Trash2, UserCheck, UserPlus, UserX, Users, X, XCircle,
} from 'lucide-react'
import { fetchMe, fetchTeams, type MeProfile, type Team, type TeamMember } from '../api/employees'
import { fetchOrganisationEhs } from '../api/organisation'
import { decideTask, fetchTask, fetchTasks, type Task } from '../api/tasks'
import { createTaskAssignment, deleteTaskAssignment, type TaskAssignment } from '../api/taskAssignments'
import { ApiError } from '../api/client'
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

type Tab = 'a_valider' | 'prete' | 'staffee'

export default function StaffingPage({ navigateTo }: { navigateTo: (page: string) => void }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [pendingTasks, setPendingTasks] = useState<Task[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [me, setMe] = useState<MeProfile | null>(null)
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
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([fetchTasks({ staffing: true }), fetchTasks({ aValider: true }), fetchTeams(), fetchMe(), fetchOrganisationEhs()])
      .then(([tasksData, pendingData, teamsData, meData, ehsData]) => {
        setTasks(tasksData)
        setPendingTasks(pendingData)
        setTeams(teamsData)
        setMe(meData)
        setEhsRate(ehsData.taux_ehs_fcfa)
      })
      .catch(() => setLoadError('Impossible de charger les tâches à staffer.'))
      .finally(() => setLoading(false))
  }, [])

  const allTasks = [...pendingTasks, ...tasks]
  const selected = activeTab === 'a_valider'
    ? pendingTasks.find((t) => t.id === selectedId) ?? null
    : tasks.find((t) => t.id === selectedId) ?? null
  const selectedTeam = selected ? teams.find((t) => t.id === selected.equipe) ?? null : null
  // Le backend n'autorise le staffing que si la personne est le manager de l'équipe ou l'un de
  // ses membres (voir TaskAssignmentSerializer.validate).
  const meCanSelfAssign = me !== null && selectedTeam !== null
    && (selectedTeam.manager?.id === me.id || me.team?.id === selectedTeam.id)
  const alreadyAssignedIds = new Set(selected?.assignments.map((a) => a.user) ?? [])
  const availableMembers: (TeamMember | MeProfile)[] = [
    ...(me && meCanSelfAssign && !alreadyAssignedIds.has(me.id) ? [me] : []),
    ...(selectedTeam?.members.filter((m) => m.id !== me?.id && !alreadyAssignedIds.has(m.id)) ?? []),
  ]
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
  }

  const changeTab = (tab: Tab) => { setActiveTab(tab); closePanel() }

  const countAValider = pendingTasks.length
  const countPrete = tasks.filter((t) => t.assignments.length === 0).length
  const countStaffee = tasks.filter((t) => t.assignments.length > 0).length

  const projets = Array.from(new Set(allTasks.map((t) => t.project_nom).filter((p): p is string => Boolean(p))))
  const equipes = Array.from(new Set(allTasks.map((t) => t.equipe_nom)))

  const scoped = activeTab === 'a_valider' ? pendingTasks
    : activeTab === 'prete' ? tasks.filter((t) => t.assignments.length === 0)
    : tasks.filter((t) => t.assignments.length > 0)

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
      await createTaskAssignment({ task: selected.id, user: assignMemberId, heures: assignHeuresNumber })
      await refreshTask(selected.id)
      setAssignMemberId(null)
      setAssignHeures('')
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

  const KPIS = [
    { icon: Inbox, tone: 'blue', label: 'Tâches reçues', value: String(allTasks.length), sub: 'Reçues depuis Attribution des tâches' },
    { icon: Clock3, tone: 'orange', label: 'En attente de décision', value: String(countAValider), sub: 'À accepter ou refuser' },
    { icon: UserX, tone: 'indigo', label: 'Prêtes à staffer', value: String(countPrete), sub: 'Acceptées, sans personne attribuée' },
    { icon: CheckCircle2, tone: 'green', label: 'Déjà staffées', value: String(countStaffee), sub: 'Au moins une personne attribuée' },
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
                  {activeTab === 'a_valider'
                    ? <span>Ces tâches ont été envoyées à votre équipe. Acceptez-les pour pouvoir les staffer, ou refusez-les.</span>
                    : activeTab === 'prete'
                      ? <span>Ces tâches ont été acceptées mais n'ont encore personne d'attribué.</span>
                      : <span>Ces tâches ont déjà au moins une personne attribuée. Vous pouvez en ajouter ou en retirer à tout moment.</span>}
                </div>

                {actionError && <p className="ns-empty">{actionError}</p>}

                <section className="ns-table-panel">
                  <div className="ns-table-head">
                    <h3>
                      {activeTab === 'a_valider' ? 'Tâches à valider' : activeTab === 'prete' ? 'Tâches prêtes à staffer' : 'Tâches déjà staffées'}
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
                          <th>Échéance</th><th>Priorité</th>
                          <th>{activeTab === 'a_valider' ? 'Décision' : 'Attribuée à'}</th><th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.length === 0 && (
                          <tr><td colSpan={9} className="ns-empty">Aucune tâche ne correspond à ces filtres.</td></tr>
                        )}
                        {filtered.map((task) => (
                          <tr key={task.id} className={selectedId === task.id ? 'ns-row-selected' : ''} onClick={() => handleSelect(task)}>
                            <td className="ns-code">{task.template_code}</td>
                            <td>{task.project_nom ?? 'Transversale'}</td>
                            <td className="ns-name">{task.template_nom}</td>
                            <td>{task.equipe_nom}</td>
                            <td>{task.ligne_budgetaire_nom}</td>
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
                                <button type="button" className="ns-action-btn" onClick={() => handleSelect(task)}>Staffer</button>
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
                            {me && meCanSelfAssign && !alreadyAssignedIds.has(me.id) && <option value={me.id}>Moi-même — {me.first_name} {me.last_name} (grade {me.grade})</option>}
                            {selectedTeam?.members
                              .filter((m) => m.id !== me?.id && !alreadyAssignedIds.has(m.id))
                              .map((m) => <option key={m.id} value={m.id}>{m.first_name} {m.last_name} (grade {m.grade})</option>)}
                          </select>
                        </label>
                        <label className="ns-detail-field">
                          Heures sur cette tâche *
                          <input type="number" min={0} step="0.5" value={assignHeures} placeholder="Ex. 8" onChange={(e) => setAssignHeures(e.target.value)} />
                        </label>

                        {assignMember && assignHeuresNumber > 0 && (
                          <div className={`charge-hint${depasseReste ? ' charge-hint-danger' : ''}`}>
                            {fmtEhs(ehsPreview)} EHS ({assignMember.grade} EHS/h × {assignHeuresNumber} h) = {fmtFcfa(montantPreview)}
                            {' '}(≈ {(assignHeuresNumber / JOUR_HEURES).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} jour(s) de 8h)
                            {selected.budget_ligne_montant != null && resteApres !== null && (
                              depasseReste
                                ? <> — dépasse le reste disponible ({fmtFcfa(selected.budget_reste_fcfa ?? 0)}).</>
                                : <> — reste après attribution : {fmtFcfa(resteApres)}.</>
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
    </section>
  )
}
