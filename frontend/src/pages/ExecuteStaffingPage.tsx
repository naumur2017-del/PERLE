import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  AlertTriangle, Calendar, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Folder, Info,
  ListChecks, MessageCircle, MoreVertical, Pause, Play, RotateCcw, Search, SlidersHorizontal,
  UserCheck, X, XCircle,
} from 'lucide-react'
import { ColumnsMenu, useColumnVisibility, type ColumnDef } from '../components/ColumnsMenu'
import { executeTaskAssignmentAction, type TaskAssignment, type TaskExecutionStatut } from '../api/taskAssignments'
import { ApiError } from '../api/client'
import { formatMontant } from '../utils/currency'
import './ExecuteStaffingPage.css'

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

type Tab = 'a_demarrer' | 'en_cours' | 'en_pause' | 'terminee'

const TABS: { key: Tab; label: string }[] = [
  { key: 'a_demarrer', label: 'À démarrer' },
  { key: 'en_cours', label: 'En cours' },
  { key: 'en_pause', label: 'En pause' },
  { key: 'terminee', label: 'Terminer' },
]

const STATUT_EXECUTION_CLASS: Record<TaskExecutionStatut, string> = {
  a_demarrer: 'orange', en_cours: 'blue', en_pause: 'orange', terminee: 'green',
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-FR')
}

function formatDateTime(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('fr-FR')
}

function fmtEhs(value: number) {
  return value.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function fmtFcfa(value: number) {
  return formatMontant(value)
}

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

/** Temps réellement travaillé, dérivé en direct de ce qui est confirmé côté serveur
 * (TaskAssignment.temps_travaille_secondes) plus le segment actif en cours le cas échéant —
 * jamais un compteur local qui pourrait diverger de ce qui est enregistré en base. */
function tempsTravailleLive(assignment: TaskAssignment, nowMs: number): number {
  const base = assignment.temps_travaille_secondes
  if (assignment.execution_statut === 'en_cours' && assignment.demarree_le) {
    return base + Math.max(0, (nowMs - new Date(assignment.demarree_le).getTime()) / 1000)
  }
  return base
}

/** Temps restant à la personne pour terminer sa tâche — heures allouées moins temps réellement
 * travaillé (pas un décompte jusqu'à l'échéance : voir échéanceDepassee ci-dessous pour ça). */
function tempsRestantTravailInfo(a: TaskAssignment, nowMs: number) {
  if (a.execution_statut === 'terminee') return { label: 'Terminée', tone: 'done' } as const
  const alloueesSecondes = a.heures * 3600
  const restantSecondes = alloueesSecondes - tempsTravailleLive(a, nowMs)
  const label = formatDDHHMMSS(Math.floor(restantSecondes))
  if (restantSecondes < 0) return { label, tone: 'retard' } as const
  if (alloueesSecondes > 0 && restantSecondes <= alloueesSecondes * 0.2) return { label, tone: 'urgent' } as const
  return { label, tone: 'ok' } as const
}

/** L'échéance de la tâche (date limite fixée par le manager) est-elle déjà dépassée ?
 * Distinct du temps restant alloué : une tâche peut être en avance sur son quota d'heures
 * tout en étant après son échéance calendaire, et inversement. */
function echeanceDepassee(echeance: string | null, exec: TaskExecutionStatut, nowMs: number): boolean {
  if (exec === 'terminee' || !echeance) return false
  return new Date(echeance).getTime() - nowMs < 0
}

const DETAIL_CLOSE_MS = 220

type StaffColumnId = 'projet' | 'tache' | 'attribueePar' | 'ligneBudgetaire' | 'heures' | 'echeance' | 'tempsRestant' | 'statutExecution'

const STAFF_COLUMNS: ColumnDef<StaffColumnId>[] = [
  { id: 'projet', label: 'Projet' },
  { id: 'tache', label: 'Tâche' },
  { id: 'attribueePar', label: 'Attribuée par' },
  { id: 'ligneBudgetaire', label: 'Ligne budgétaire' },
  { id: 'heures', label: 'Heures' },
  { id: 'echeance', label: 'Échéance' },
  { id: 'tempsRestant', label: 'Temps restant' },
  { id: 'statutExecution', label: "Statut d'exécution" },
]

const STAFF_CELL_DEFS: Record<StaffColumnId, { className?: string; render: (a: TaskAssignment, nowMs: number) => ReactNode }> = {
  projet: { render: (a) => <span className="es-projet-cell"><Folder size={13} />{a.project_nom ?? 'Transversale'}</span> },
  tache: { className: 'es-name', render: (a) => <><strong>{a.template_nom}</strong><small>{a.task_code}</small></> },
  attribueePar: {
    render: (a) => (
      <span className="es-employee">
        <span className="es-employee-dot">{a.task_created_by_nom ? a.task_created_by_nom.split(' ').filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase() : '—'}</span>
        <span><strong>{a.task_created_by_nom ?? '—'}</strong><small>{a.equipe_nom}</small></span>
      </span>
    ),
  },
  ligneBudgetaire: { render: (a) => `${a.ligne_budgetaire_code} — ${a.ligne_budgetaire_nom}` },
  heures: { render: (a) => `${a.heures} h` },
  echeance: { render: (a) => <span className={a.execution_statut === 'a_demarrer' ? 'es-echeance' : undefined}>{formatDate(a.echeance)}</span> },
  tempsRestant: {
    render: (a, nowMs) => {
      const info = tempsRestantTravailInfo(a, nowMs)
      return <span className={`es-temps-restant es-temps-restant-${info.tone}`}>{info.label}</span>
    },
  },
  statutExecution: { render: (a) => <span className={`es-pill es-pill-${STATUT_EXECUTION_CLASS[a.execution_statut]}`}>{a.execution_statut_display}</span> },
}

interface ExecuteStaffingPageProps {
  navigateTo: (page: string) => void
  // « Mes » attributions de tâches viennent de l'App parente — c'est la même source unique que
  // consomme le minuteur flottant, donc une pause faite ici ou depuis le minuteur reste toujours
  // synchronisée entre les deux affichages.
  assignments: TaskAssignment[]
  loading: boolean
  loadError: string | null
  onAssignmentUpdate: (updated: TaskAssignment) => void
  onAssignmentRemove: (id: number) => void
  // Code de tâche à ouvrir directement en arrivant (ex. depuis le « Voir » du minuteur flottant) —
  // sans ça, la tâche en cours/en pause resterait invisible tant qu'on est sur l'onglet
  // « À démarrer » par défaut.
  focusCode?: string | null
  onFocusConsumed?: () => void
}

export default function ExecuteStaffingPage({
  navigateTo, assignments, loading, loadError, onAssignmentUpdate, onAssignmentRemove, focusCode, onFocusConsumed,
}: ExecuteStaffingPageProps) {
  const [actionError, setActionError] = useState<string | null>(null)
  const [acting, setActing] = useState(false)

  const [pageTab, setPageTab] = useState<'mes-taches' | 'historique'>('mes-taches')
  const [activeTab, setActiveTab] = useState<Tab>('a_demarrer')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [panelClosing, setPanelClosing] = useState(false)
  const closeTimeoutRef = useRef<number | null>(null)
  const [search, setSearch] = useState('')
  const [filterProjet, setFilterProjet] = useState('Tous')
  const [filterEquipe, setFilterEquipe] = useState('Toutes')
  const [nowMs, setNowMs] = useState(() => Date.now())
  const { hiddenColumns, toggleColumn, visibleColumns } = useColumnVisibility(STAFF_COLUMNS)

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => () => { if (closeTimeoutRef.current) window.clearTimeout(closeTimeoutRef.current) }, [])

  const projets = useMemo(() => Array.from(new Set(assignments.map((a) => a.project_nom ?? 'Transversale'))), [assignments])
  const equipes = useMemo(() => Array.from(new Set(assignments.map((a) => a.equipe_nom))), [assignments])

  const selected = assignments.find((a) => a.id === selectedId) ?? null

  const counts: Record<Tab, number> = { a_demarrer: 0, en_cours: 0, en_pause: 0, terminee: 0 }
  assignments.forEach((a) => { counts[a.execution_statut] += 1 })

  const filtered = assignments
    .filter((a) => (
      a.execution_statut === activeTab
      && (filterProjet === 'Tous' || (a.project_nom ?? 'Transversale') === filterProjet)
      && (filterEquipe === 'Toutes' || a.equipe_nom === filterEquipe)
      && (search.trim() === '' || `${a.task_code} ${a.template_nom} ${a.project_nom ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()))
    ))
    .sort((a, b) => a.created_at.localeCompare(b.created_at))

  const resetFiltres = () => {
    setFilterProjet('Tous'); setFilterEquipe('Toutes'); setSearch('')
  }

  const handleSelect = (assignment: TaskAssignment) => {
    if (closeTimeoutRef.current) { window.clearTimeout(closeTimeoutRef.current); closeTimeoutRef.current = null }
    setPanelClosing(false)
    setActionError(null)
    setSelectedId(assignment.id)
  }

  // Ouvre directement la bonne tâche (et le bon onglet — sinon une tâche en cours/en pause reste
  // invisible sous « À démarrer », l'onglet par défaut) quand on arrive via une demande externe
  // (ex. le « Voir » du minuteur flottant). N'agit qu'une fois les données chargées.
  useEffect(() => {
    if (!focusCode || loading) return
    const assignment = assignments.find((a) => a.task_code === focusCode)
    if (assignment) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- réagit à une demande de navigation externe (focusCode), pas dérivé du rendu
      setPageTab('mes-taches')
      setActiveTab(assignment.execution_statut)
      handleSelect(assignment)
    }
    onFocusConsumed?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleSelect est stable pour ce composant ; ne doit réagir qu'à focusCode/loading/assignments
  }, [focusCode, loading, assignments])

  const closePanel = () => {
    setPanelClosing(true)
    closeTimeoutRef.current = window.setTimeout(() => {
      setSelectedId(null)
      setPanelClosing(false)
      closeTimeoutRef.current = null
    }, DETAIL_CLOSE_MS)
  }

  const runAction = async (assignment: TaskAssignment, action: 'demarrer' | 'pause' | 'reprendre' | 'terminer' | 'decliner') => {
    setActing(true)
    setActionError(null)
    try {
      const result = await executeTaskAssignmentAction(assignment.id, action)
      // Décliner supprime l'attribution : elle ne m'appartient plus, elle doit disparaître de ma liste.
      if (action === 'decliner') {
        onAssignmentRemove(assignment.id)
      } else {
        // Écrit dans la source unique partagée avec le minuteur flottant — les deux affichages
        // restent donc toujours synchronisés, quel que soit celui depuis lequel l'action est faite.
        onAssignmentUpdate(result as TaskAssignment)
      }
      if (action === 'demarrer') setActiveTab('en_cours')
      if (action === 'decliner') closePanel()
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setActing(false)
    }
  }

  const KPIS = [
    { icon: ListChecks, tone: 'purple', label: 'À démarrer', value: counts.a_demarrer, sub: 'En attente de votre réponse' },
    { icon: Play, tone: 'blue', label: 'En cours', value: counts.en_cours, sub: "Tâches en cours d'exécution" },
    { icon: Pause, tone: 'orange', label: 'En pause', value: counts.en_pause, sub: 'Tâches temporairement suspendues' },
    { icon: CheckCircle2, tone: 'green', label: 'Terminer', value: counts.terminee, sub: 'Tâches à clôturer' },
  ]

  if (loading) return <section className="es-page"><p className="es-empty">Chargement…</p></section>

  return (
    <section className="es-page">
      <div className="es-title-row">
        <div>
          <h1>Exécuté staffing <Info size={15} className="es-title-info" /></h1>
          <p>Consultez et exécutez les tâches qui vous sont affectées.</p>
        </div>
        <button type="button" className="es-btn-outline" onClick={() => navigateTo('staffing')}><UserCheck size={14} />Voir le nouveau staffing</button>
      </div>

      {loadError && <p className="es-empty">{loadError}</p>}

      {!loadError && (
        <>
          <div className="es-toolbar">
            <button type="button" className="es-daterange" disabled><Calendar size={14} />Toutes périodes</button>
            <button type="button" className="es-btn-outline" disabled><SlidersHorizontal size={14} />Filtres avancés</button>
          </div>

          <div className="es-kpis">
            {KPIS.map((kpi) => (
              <article key={kpi.label} className={`es-kpi es-kpi-${kpi.tone}`}>
                <span className="es-kpi-icon"><kpi.icon size={19} /></span>
                <strong>{kpi.value}</strong>
                <span className="es-kpi-label">{kpi.label}</span>
                <small>{kpi.sub}</small>
              </article>
            ))}
          </div>

          <div className={`es-layout ${selected ? 'has-detail' : ''}`}>
            <div className="es-main">
              <nav className="es-page-tabs">
                <button className={pageTab === 'mes-taches' ? 'active' : ''} onClick={() => setPageTab('mes-taches')}>Mes tâches</button>
                <button className={pageTab === 'historique' ? 'active' : ''} onClick={() => setPageTab('historique')}>Historique</button>
              </nav>

              {assignments.length === 0 ? (
                <div className="es-info-banner">
                  <Info size={14} />
                  <span>Aucune tâche ne vous a été attribuée pour l’instant. Une tâche apparaît ici dès qu’un manager vous l’attribue depuis Nouveau staffing.</span>
                </div>
              ) : pageTab === 'mes-taches' ? (
                <>
                  <nav className="es-tabs">
                    {TABS.map((tab) => (
                      <button
                        key={tab.key}
                        className={activeTab === tab.key ? 'active' : ''}
                        onClick={() => { setActiveTab(tab.key); closePanel() }}
                      >
                        {tab.label} <span className="es-tab-count">{counts[tab.key]}</span>
                      </button>
                    ))}
                  </nav>

                  <div className="es-filters">
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
                    <label className="es-search">
                      <Search size={14} />
                      <input placeholder="Rechercher une tâche, un projet..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    </label>
                    <button type="button" className="es-reset" onClick={resetFiltres}><RotateCcw size={14} />Réinitialiser</button>
                  </div>

                  {actionError && <p className="es-empty">{actionError}</p>}

                  <section className="es-table-panel">
                    <div className="es-table-head">
                      <h3>{TABS.find((t) => t.key === activeTab)?.label} <span className="es-count-badge">{filtered.length}</span></h3>
                      <ColumnsMenu columns={STAFF_COLUMNS} hiddenColumns={hiddenColumns} onToggle={toggleColumn} />
                    </div>
                    <div className="es-table-wrap">
                      <table className="es-table">
                        <thead>
                          <tr>
                            {visibleColumns.map((c) => <th key={c.id}>{c.label}</th>)}
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.length === 0 && (
                            <tr><td colSpan={visibleColumns.length + 1} className="es-empty">Aucune tâche dans cette section.</td></tr>
                          )}
                          {filtered.map((assignment) => (
                            <tr key={assignment.id} className={selectedId === assignment.id ? 'es-row-selected' : ''} onClick={() => handleSelect(assignment)}>
                              {visibleColumns.map((c) => {
                                const def = STAFF_CELL_DEFS[c.id]
                                return <td key={c.id} className={def.className}>{def.render(assignment, nowMs)}</td>
                              })}
                              <td onClick={(e) => e.stopPropagation()}>
                                {activeTab === 'a_demarrer' ? (
                                  <button type="button" className="es-accept-btn" disabled={acting} onClick={() => runAction(assignment, 'demarrer')}>
                                    <Play size={13} />Démarrer
                                  </button>
                                ) : (
                                  <button type="button" className="es-row-action" aria-label="Actions" title="Voir le détail" onClick={() => handleSelect(assignment)}>
                                    <MoreVertical size={16} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="es-table-foot">
                      <span>Affichage de 1 à {filtered.length} sur {filtered.length} tâches</span>
                      <div className="es-table-foot-right">
                        <label className="es-page-size">Lignes par page
                          <select defaultValue={10}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select>
                        </label>
                        <nav className="es-pagination" aria-label="Pagination">
                          <button type="button" disabled><ChevronLeft size={14} /></button>
                          <button type="button" className="is-active">1</button>
                          <button type="button" disabled><ChevronRight size={14} /></button>
                        </nav>
                      </div>
                    </div>
                  </section>

                  <div className="es-legend">
                    <span><i className="dot orange" />À démarrer</span>
                    <span><i className="dot blue" />En cours</span>
                    <span><i className="dot amber" />En pause</span>
                    <span><i className="dot teal" />Terminée</span>
                  </div>

                  <div className="es-info-banner">
                    <Info size={14} />
                    <span>En démarrant le staffing, vous confirmez votre disponibilité et vous vous engagez à exécuter cette tâche dans les délais prévus.</span>
                  </div>
                </>
              ) : (
                <section className="es-table-panel">
                  <div className="es-table-head"><h3>Historique <span className="es-count-badge">{assignments.length}</span></h3></div>
                  <div className="es-table-wrap">
                    <table className="es-table">
                      <thead>
                        <tr>
                          <th>Projet</th><th>Tâche</th><th>Heures</th><th>Échéance</th><th>Statut d'exécution</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...assignments].sort((a, b) => a.created_at.localeCompare(b.created_at)).map((assignment) => (
                          <tr key={assignment.id} onClick={() => handleSelect(assignment)}>
                            <td><span className="es-projet-cell"><Folder size={13} />{assignment.project_nom ?? 'Transversale'}</span></td>
                            <td className="es-name"><strong>{assignment.template_nom}</strong><small>{assignment.task_code}</small></td>
                            <td>{assignment.heures} h</td>
                            <td>{formatDate(assignment.echeance)}</td>
                            <td><span className={`es-pill es-pill-${STATUT_EXECUTION_CLASS[assignment.execution_statut]}`}>{assignment.execution_statut_display}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>

            {selected && (
              <aside className={`es-detail ${panelClosing ? 'es-detail-closing' : ''}`}>
                <div className="es-detail-head">
                  <h3>Détail de la tâche</h3>
                  <button type="button" className="es-detail-close" onClick={closePanel} aria-label="Fermer"><X size={16} /></button>
                </div>

                <div className="es-detail-id">
                  <strong>{selected.task_code}</strong>
                  <span className="es-detail-badge">{selected.template_code}</span>
                </div>

                <dl className="es-detail-info">
                  <div><dt>Projet</dt><dd>{selected.project_nom ? `${selected.project_code} — ${selected.project_nom}` : 'Transversale (aucun projet)'}</dd></div>
                  <div><dt>Tâche</dt><dd>{selected.template_nom}</dd></div>
                  {selected.task_description && <div className="es-detail-block"><dt>Description</dt><dd>{selected.task_description}</dd></div>}
                  <div><dt>Attribuée par</dt><dd>{selected.task_created_by_nom ?? '—'}</dd></div>
                  <div><dt>Équipe</dt><dd>{selected.equipe_code} — {selected.equipe_nom}</dd></div>
                  <div><dt>Ligne budgétaire</dt><dd>{selected.ligne_budgetaire_code} — {selected.ligne_budgetaire_nom}</dd></div>
                  <div><dt>Échéance</dt><dd className="es-echeance">{formatDate(selected.echeance)}</dd></div>
                  <div><dt>Priorité</dt><dd>{selected.priorite_display}</dd></div>
                  <div><dt>Heures attribuées</dt><dd>{selected.heures} h</dd></div>
                  {selected.execution_statut !== 'a_demarrer' && (
                    <div><dt>Temps travaillé</dt><dd className="es-temps-travaille">{formatDDHHMMSS(Math.floor(tempsTravailleLive(selected, nowMs)))}</dd></div>
                  )}
                  <div><dt>Consommation</dt><dd>{fmtEhs(selected.ehs_consomme)} EHS (grade {selected.user_grade}) · {fmtFcfa(selected.montant_fcfa)}</dd></div>
                  {selected.demarree_le && <div><dt>Démarrée le</dt><dd>{formatDateTime(selected.demarree_le)}</dd></div>}
                  {selected.terminee_le && <div><dt>Terminée le</dt><dd>{formatDateTime(selected.terminee_le)}</dd></div>}
                </dl>

                {actionError && <p className="es-empty">{actionError}</p>}

                {selected.execution_statut === 'a_demarrer' && (
                  <>
                    <div className="es-response-box">
                      <span><Info size={13} />Votre réponse au staffing</span>
                      <p>Vous devez démarrer cette tâche pour pouvoir l'exécuter.</p>
                    </div>
                    {echeanceDepassee(selected.echeance, selected.execution_statut, nowMs) && (
                      <div className="es-overtime-warning">
                        <AlertTriangle size={15} />
                        <div>
                          <strong>Échéance dépassée</strong>
                          <p>L'échéance de cette tâche est déjà passée.</p>
                        </div>
                      </div>
                    )}
                    <div className="es-detail-actions">
                      <button type="button" className="es-btn-accept" disabled={acting} onClick={() => runAction(selected, 'demarrer')}><Play size={14} />Démarrer</button>
                      <button type="button" className="es-btn-pause" disabled={acting} onClick={() => runAction(selected, 'decliner')}><XCircle size={14} />Décliner</button>
                    </div>
                    <a className="es-contact-link" href="#" onClick={(e) => e.preventDefault()}><MessageCircle size={13} />Besoin d'informations complémentaires ? Contacter le manager</a>
                  </>
                )}

                {(selected.execution_statut === 'en_cours' || selected.execution_statut === 'en_pause') && (
                  <>
                    <div className="es-response-box">
                      <span><Clock3 size={13} />Suivi d'exécution</span>
                      <p>{selected.execution_statut === 'en_cours' ? "Cette tâche est actuellement en cours d'exécution." : 'Cette tâche est actuellement en pause.'}</p>
                    </div>
                    <div className="es-detail-actions">
                      {selected.execution_statut === 'en_cours' ? (
                        <button type="button" className="es-btn-pause" disabled={acting} onClick={() => runAction(selected, 'pause')}><Pause size={14} />Mettre en pause</button>
                      ) : (
                        <button type="button" className="es-btn-accept" disabled={acting} onClick={() => runAction(selected, 'reprendre')}><Play size={14} />Reprendre l'exécution</button>
                      )}
                      <button type="button" className="es-btn-finish" disabled={acting} onClick={() => runAction(selected, 'terminer')}><CheckCircle2 size={14} />Terminer la tâche</button>
                    </div>
                  </>
                )}

                {selected.execution_statut === 'terminee' && (
                  <div className="es-response-box done">
                    <span><CheckCircle2 size={13} />Tâche terminée</span>
                    <p>Cette tâche a été clôturée. Retrouvez-la dans l'onglet « Historique ».</p>
                  </div>
                )}
              </aside>
            )}
          </div>
        </>
      )}
    </section>
  )
}
