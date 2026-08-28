import { useEffect, useState } from 'react'
import {
  Activity, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Inbox, Info, Rocket, RotateCcw,
  Search, UserCheck, UserX, Users, X,
} from 'lucide-react'
import { fetchMe, fetchTeams, type MeProfile, type Team } from '../api/employees'
import { fetchTasks, updateTask, type Task } from '../api/tasks'
import { ApiError } from '../api/client'
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

const fmtHeures = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

type Tab = 'prete' | 'staffee'

export default function StaffingPage({ navigateTo }: { navigateTo: (page: string) => void }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [me, setMe] = useState<MeProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<Tab>('prete')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [filterProjet, setFilterProjet] = useState('Tous')
  const [filterEquipe, setFilterEquipe] = useState('Toutes')
  const [search, setSearch] = useState('')
  const [assigneeChoice, setAssigneeChoice] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([fetchTasks({ staffing: true }), fetchTeams(), fetchMe()])
      .then(([tasksData, teamsData, meData]) => {
        setTasks(tasksData)
        setTeams(teamsData)
        setMe(meData)
      })
      .catch(() => setLoadError('Impossible de charger les tâches à staffer.'))
      .finally(() => setLoading(false))
  }, [])

  const selected = tasks.find((t) => t.id === selectedId) ?? null
  const selectedTeam = selected ? teams.find((t) => t.id === selected.equipe) ?? null : null

  const handleSelect = (task: Task) => {
    setSelectedId(task.id)
    setAssigneeChoice(null)
    setActionError(null)
  }

  const closePanel = () => {
    setSelectedId(null)
    setAssigneeChoice(null)
  }

  const countPrete = tasks.filter((t) => !t.assignee).length
  const countStaffee = tasks.filter((t) => t.assignee).length
  const heuresAStaffer = tasks.filter((t) => !t.assignee).reduce((sum, t) => sum + t.heures, 0)

  const projets = Array.from(new Set(tasks.map((t) => t.project_nom)))
  const equipes = Array.from(new Set(tasks.map((t) => t.equipe_nom)))

  const filtered = tasks.filter((t) => (
    (activeTab === 'prete' ? !t.assignee : !!t.assignee)
    && (filterProjet === 'Tous' || t.project_nom === filterProjet)
    && (filterEquipe === 'Toutes' || t.equipe_nom === filterEquipe)
    && (search.trim() === '' || `${t.code} ${t.template_nom} ${t.project_nom}`.toLowerCase().includes(search.trim().toLowerCase()))
  ))

  const resetFiltres = () => { setFilterProjet('Tous'); setFilterEquipe('Toutes'); setSearch('') }

  const handleAssign = async () => {
    if (!selected || assigneeChoice === null) return
    setSaving(true)
    setActionError(null)
    try {
      const updated = await updateTask(selected.id, { assignee: assigneeChoice })
      setTasks((prev) => prev.map((t) => t.id === updated.id ? updated : t))
      setAssigneeChoice(null)
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const KPIS = [
    { icon: Inbox, tone: 'blue', label: 'Tâches lancées', value: String(tasks.length), sub: 'Reçues depuis Architecture des tâches' },
    { icon: UserX, tone: 'orange', label: 'Prêtes à staffer', value: String(countPrete), sub: "En attente d'attribution" },
    { icon: CheckCircle2, tone: 'green', label: 'Déjà staffées', value: String(countStaffee), sub: 'Attribuées à quelqu’un' },
    { icon: Clock3, tone: 'indigo', label: 'Heures à staffer', value: fmtHeures(heuresAStaffer), sub: 'Sur les tâches non attribuées' },
    { icon: Users, tone: 'purple', label: 'Équipes managées', value: String(new Set(tasks.map((t) => t.equipe)).size), sub: 'Concernées par ces tâches' },
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
          <p>Attribuez-vous une tâche lancée par votre équipe, ou attribuez-la à l’un de vos membres.</p>
        </div>
        <button type="button" className="ns-btn-outline" onClick={() => navigateTo('staffing-execute')}>Voir l'exécuté staffing</button>
      </div>

      {loadError && <p className="ns-empty">{loadError}</p>}
      {actionError && <p className="ns-empty">{actionError}</p>}

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

          {tasks.length === 0 ? (
            <div className="ns-info-banner">
              <Info size={14} />
              <span>Aucune tâche lancée ne vous attend pour l’instant. Une tâche apparaît ici dès qu’elle est « lancée » depuis Architecture des tâches, pour une équipe dont vous êtes le manager.</span>
            </div>
          ) : (
            <div className={`ns-layout ${selected ? 'has-detail' : ''}`}>
              <div className="ns-main">
                <nav className="ns-tabs">
                  <button className={activeTab === 'prete' ? 'active' : ''} onClick={() => { setActiveTab('prete'); closePanel() }}>
                    Prêtes à staffer <span className="ns-tab-count">{countPrete}</span>
                  </button>
                  <button className={activeTab === 'staffee' ? 'active' : ''} onClick={() => { setActiveTab('staffee'); closePanel() }}>
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
                  {activeTab === 'prete'
                    ? <span>Ces tâches ont été lancées par leur équipe mais n'ont encore personne d'attribué.</span>
                    : <span>Ces tâches ont déjà quelqu'un d'attribué. Vous pouvez le changer à tout moment.</span>}
                </div>

                <section className="ns-table-panel">
                  <div className="ns-table-head">
                    <h3>{activeTab === 'prete' ? 'Tâches prêtes à staffer' : 'Tâches déjà staffées'} <span className="ns-count-badge">{filtered.length}</span></h3>
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
                          <th>Heures</th><th>Attribuée à</th><th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.length === 0 && (
                          <tr><td colSpan={8} className="ns-empty">Aucune tâche ne correspond à ces filtres.</td></tr>
                        )}
                        {filtered.map((task) => (
                          <tr key={task.id} className={selectedId === task.id ? 'ns-row-selected' : ''} onClick={() => handleSelect(task)}>
                            <td className="ns-code">{task.code}</td>
                            <td>{task.project_nom}</td>
                            <td className="ns-name">{task.template_nom}</td>
                            <td>{task.equipe_nom}</td>
                            <td>{task.ligne_budgetaire_nom}</td>
                            <td>{fmtHeures(task.heures)} h</td>
                            <td>
                              {task.assignee ? (
                                <span className="ns-statut ns-statut-green">{task.assignee_nom}</span>
                              ) : (
                                <span className="ns-pill-warn">Non attribuée</span>
                              )}
                            </td>
                            <td onClick={(e) => e.stopPropagation()}>
                              <button type="button" className="ns-action-btn" onClick={() => handleSelect(task)}>Staffer</button>
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
                    <span className="ns-detail-check ns-statut-blue"><Rocket size={14} /></span>
                    <strong>{selected.code}</strong>
                    <span className="ns-detail-badge">Lancée</span>
                  </div>

                  <dl className="ns-detail-info">
                    <div><dt>Tâche</dt><dd>{selected.template_nom}</dd></div>
                    <div><dt>Projet</dt><dd>{selected.project_code} — {selected.project_nom}</dd></div>
                    <div><dt>Équipe</dt><dd>{selected.equipe_code} — {selected.equipe_nom}</dd></div>
                    <div><dt>Ligne budgétaire</dt><dd>{selected.ligne_budgetaire_code} — {selected.ligne_budgetaire_nom}</dd></div>
                    <div><dt>Montant</dt><dd>{selected.montant.toLocaleString('fr-FR')} FCFA</dd></div>
                    <div><dt>Heures</dt><dd>{fmtHeures(selected.heures)} h</dd></div>
                  </dl>

                  {selected.assignee && (
                    <div className="ns-detail-section">
                      <h4>Actuellement attribuée à</h4>
                      <ul className="ns-affectations-list">
                        <li>
                          <span className="ns-employee">
                            <span className="ns-employee-dot">{selected.assignee_nom?.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}</span>
                            <span><strong>{selected.assignee_nom}</strong></span>
                          </span>
                        </li>
                      </ul>
                    </div>
                  )}

                  <div className="ns-detail-section">
                    <h4>{selected.assignee ? 'Réattribuer' : 'Attribuer'} la tâche</h4>
                    {actionError && <p className="ns-empty">{actionError}</p>}
                    <label className="ns-detail-field">
                      Attribuer à *
                      <select value={assigneeChoice ?? ''} onChange={(e) => setAssigneeChoice(e.target.value === '' ? null : Number(e.target.value))}>
                        <option value="">Sélectionner</option>
                        {me && <option value={me.id}>Moi-même — {me.first_name} {me.last_name}</option>}
                        {selectedTeam?.members
                          .filter((m) => m.id !== me?.id)
                          .map((m) => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
                      </select>
                    </label>
                    <div className="ns-detail-actions">
                      <button type="button" className="ns-btn-primary" disabled={assigneeChoice === null || saving} onClick={handleAssign}>
                        {saving ? 'Enregistrement…' : 'Enregistrer le staffing'}
                      </button>
                    </div>
                  </div>
                </aside>
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}
