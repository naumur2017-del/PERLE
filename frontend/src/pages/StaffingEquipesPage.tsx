// Staffing des équipes : attribuer une tâche du catalogue (Architecture des tâches) à une
// équipe et à son manager. Dès la validation, la tâche est envoyée (statut « envoyee ») et
// apparaît immédiatement dans Nouveau staffing, onglet À valider — le workflow s'y poursuit
// normalement (le manager l'accepte ou la refuse, puis répartit les heures).
import { useState, useEffect, type FormEvent } from 'react'
import {
  ChevronLeft, ChevronRight, Copy, Download, Eye, Filter, Info, Pencil, Plus, Search, Trash2, X,
} from 'lucide-react'
import { fetchTeams, type Team } from '../api/employees'
import { fetchProjects, type Project } from '../api/projects'
import { fetchLignesBudgetaires, type LigneBudgetaire } from '../api/architectureMonetaire'
import {
  createTask, deleteTask, fetchTasks, updateTask, type Task, type TaskFormValues,
  type TaskPriorite, type TaskStatut,
} from '../api/tasks'
import { ApiError } from '../api/client'
import DatePicker from '../components/DatePicker'
import { Panel, KpiCard, type PanelState } from '../components/dashboard/DashboardUI'
import { TasksTrendChart } from '../components/dashboard/ManagerCharts'
import { TeamTasksBarChart, TaskStatusDonut, ProjectBudgetScatter } from '../components/dashboard/StaffingCharts'
import { formatMontant } from '../utils/currency'
import '../components/dashboard/dashboard.css'
import './StaffingEquipesPage.css'

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

const formatDate = (value: string | null): string => {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-FR')
}

const staffingSummary = (task: Task): string => {
  const count = task.assignments.length
  if (count === 0) return 'Non staffée'
  if (count === 1) return `Staffée à ${task.assignments[0].user_nom}`
  return `Staffée à ${count} personnes`
}

const PRIORITE_OPTIONS: { value: TaskPriorite; label: string }[] = [
  { value: 'haute', label: 'Haute' },
  { value: 'moyenne', label: 'Moyenne' },
  { value: 'basse', label: 'Basse' },
]

const STATUT_OPTIONS: { value: TaskStatut; label: string }[] = [
  { value: 'envoyee', label: 'Envoyée' },
  { value: 'acceptee', label: 'Acceptée' },
  { value: 'refusee', label: 'Refusée' },
]

const MONTHS_FR = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.']

const PAGE_SIZE = 8

type PanelMode = { kind: 'create'; from?: Task } | { kind: 'edit'; task: Task } | { kind: 'view'; task: Task } | null

interface LigneOption { value: number; label: string }

function exportTasksCsv(tasks: Task[]) {
  const header = ['Code', 'Tâche', 'Projet', 'Équipe', 'Manager', 'Ligne budgétaire', 'Sous-ligne', 'Date de début', 'Échéance', 'Priorité', 'Statut', 'Créé le']
  const rows = tasks.map((t) => [
    t.code, t.template_nom, t.project_nom ? `${t.project_code} — ${t.project_nom}` : 'Transversale',
    `${t.equipe_code} — ${t.equipe_nom}`, t.equipe_manager_nom ?? '', `${t.ligne_budgetaire_code} — ${t.ligne_budgetaire_nom}`,
    t.ligne_budgetaire_declinaison, formatDate(t.date_debut), formatDate(t.echeance), t.priorite_display, t.statut_display, formatDate(t.created_at),
  ])
  const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\r\n')
  const bom = String.fromCharCode(0xfeff)
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `staffing-des-equipes-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function TaskPanel({ mode, teams, projects, lignes, onClose, onCreated, onUpdated, onDeleteRequest }: {
  mode: Exclude<PanelMode, null>
  teams: Team[]
  projects: Project[]
  lignes: LigneBudgetaire[]
  onClose: () => void
  onCreated: (task: Task) => void
  onUpdated: (task: Task) => void
  onDeleteRequest: (task: Task) => void
}) {
  const seed = mode.kind === 'create' ? mode.from : mode.task
  const [description, setDescription] = useState(seed?.description ?? '')
  const [transversale, setTransversale] = useState(seed ? seed.project === null : false)
  const [projectId, setProjectId] = useState<number | null>(seed?.project ?? null)
  const [equipeId, setEquipeId] = useState<number | null>(seed?.equipe ?? null)
  const [ligneId, setLigneId] = useState<number | null>(seed?.ligne_budgetaire ?? null)
  const [sousLigneId, setSousLigneId] = useState<number | null>(null)
  const [dateDebut, setDateDebut] = useState(mode.kind === 'create' ? '' : seed?.date_debut ?? '')
  const [echeance, setEcheance] = useState(mode.kind === 'create' ? '' : seed?.echeance ?? '')
  const [priorite, setPriorite] = useState<TaskPriorite>(seed?.priorite ?? 'moyenne')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(mode.kind !== 'view')

  const readOnly = mode.kind === 'view' && !editing
  const selectedProject = projects.find((p) => p.id === projectId) ?? null

  // Une tâche ne peut être rattachée qu'à une ligne budgétaire monétaire (voir Task.ligne_budgetaire,
  // obligatoire côté backend) : les lignes EHS ('E', catalogue de tâches) du projet n'ont pas leur place ici.
  const projectLignesMonetaires = selectedProject ? selectedProject.lignes.filter((l) => l.type_ligne === 'M') : []
  const equipeOptions = transversale
    ? teams
    : selectedProject ? teams.filter((t) => projectLignesMonetaires.some((l) => l.equipe === t.id)) : []
  const selectedEquipe = teams.find((t) => t.id === equipeId) ?? null

  const ligneOptions: LigneOption[] = transversale
    ? lignes.filter((l) => l.equipe === equipeId && l.actif).map((l) => ({ value: l.id, label: `${l.code} — ${l.nom}` }))
    : selectedProject
      ? projectLignesMonetaires.filter((l) => l.equipe === equipeId).map((l) => ({ value: l.ligne_budgetaire as number, label: `${l.ligne_budgetaire_code} — ${l.ligne_budgetaire_nom}` }))
      : []
  // Sous-lignes disponibles : les LigneBudgetaire directement enfants de la ligne sélectionnée
  // (arborescence de l'Architecture monétaire) — vide si la ligne choisie est déjà une feuille.
  const sousLigneOptions = ligneId === null ? [] : lignes.filter((l) => l.parent === ligneId && l.actif)
  const selectedSousLigne = sousLigneOptions.find((l) => l.id === sousLigneId) ?? null

  const canSave = ligneId !== null && equipeId !== null && echeance !== ''
    && description.trim() !== '' && (transversale || projectId !== null)

  const handleTransversaleChange = (checked: boolean) => {
    setTransversale(checked)
    if (checked) setProjectId(null)
    setEquipeId(null)
    setLigneId(null)
    setSousLigneId(null)
  }

  const handleProjectChange = (value: string) => {
    setProjectId(value === '' ? null : Number(value))
    setEquipeId(null)
    setLigneId(null)
    setSousLigneId(null)
  }

  const handleEquipeChange = (value: string) => {
    setEquipeId(value === '' ? null : Number(value))
    setLigneId(null)
    setSousLigneId(null)
  }

  const handleLigneChange = (value: string) => {
    setLigneId(value === '' ? null : Number(value))
    setSousLigneId(null)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSave || ligneId === null) return
    setSaving(true)
    setError(null)
    const payload: TaskFormValues = {
      template: null,
      description: description.trim(),
      project: transversale ? null : projectId,
      ligne_budgetaire: sousLigneId ?? ligneId,
      date_debut: dateDebut || null,
      echeance,
      priorite,
    }
    try {
      if (mode.kind === 'edit' || (mode.kind === 'view' && editing)) {
        const updated = await updateTask(mode.task.id, payload)
        onUpdated(updated)
      } else {
        const created = await createTask(payload)
        onCreated(created)
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const title = mode.kind === 'create' ? 'Attribuer une tâche' : mode.kind === 'edit' ? 'Modifier l’attribution' : editing ? 'Modifier l’attribution' : (mode.task.template_nom || 'Détail de la tâche')
  const submitLabel = mode.kind === 'create' ? 'Valider l’attribution' : 'Enregistrer'

  return (
    <div className="arch-panel">
      <div className="arch-panel-head">
        <h3>DÉTAIL / ATTRIBUTION D’UNE TÂCHE</h3>
        <button type="button" className="ge-modal-close" onClick={onClose} aria-label="Fermer"><X size={16} /></button>
      </div>

      {readOnly ? (
        <div className="arch-panel-view">
          <div className="arch-panel-view-head">
            <strong>{mode.task.code}</strong>
            <span className={`arch-pill arch-pill-${mode.task.statut}`}>{mode.task.statut_display}</span>
          </div>
          <h4>{title}</h4>
          {mode.task.description && <p className="arch-task-detail-desc">{mode.task.description}</p>}
          <dl className="arch-task-detail">
            <div><dt>Projet / Nature</dt><dd>{mode.task.project_nom ? `${mode.task.project_code} — ${mode.task.project_nom}` : 'Transversale (aucun projet)'}</dd></div>
            <div><dt>Équipe destinataire</dt><dd>{mode.task.equipe_code} — {mode.task.equipe_nom}</dd></div>
            <div><dt>Manager destinataire</dt><dd>{mode.task.equipe_manager_nom ?? 'Aucun manager défini'}</dd></div>
            <div><dt>Ligne budgétaire</dt><dd>{mode.task.ligne_budgetaire_code} — {mode.task.ligne_budgetaire_nom}</dd></div>
            <div><dt>Sous-ligne</dt><dd>{mode.task.ligne_budgetaire_declinaison || '—'}</dd></div>
            <div><dt>Date de début</dt><dd>{formatDate(mode.task.date_debut)}</dd></div>
            <div><dt>Échéance</dt><dd>{formatDate(mode.task.echeance)}</dd></div>
            <div><dt>Priorité</dt><dd>{mode.task.priorite_display}</dd></div>
            <div><dt>Statut</dt><dd>{mode.task.statut_display}{mode.task.statut === 'acceptee' && <span className="arch-staffed-hint"> · {staffingSummary(mode.task).toLowerCase()}</span>}</dd></div>
            <div><dt>Créée par</dt><dd>{mode.task.created_by_nom ?? '-'}</dd></div>
          </dl>
          <div className="ge-modal-actions">
            <button type="button" className="arch-delete-btn" onClick={() => onDeleteRequest(mode.task)}><Trash2 size={13} />Supprimer la tâche</button>
            <button type="button" className="ge-btn-primary" onClick={() => setEditing(true)}><Pencil size={13} />Modifier</button>
          </div>
        </div>
      ) : (
        <form className="param-form" onSubmit={handleSubmit}>
          {error && <p className="ge-form-error">{error}</p>}

          <div className="arch-panel-grid">
            <label className="param-field">Projet / Nature *
              <select required={!transversale} disabled={transversale} value={projectId ?? ''} onChange={(event) => handleProjectChange(event.target.value)}>
                <option value="">{transversale ? 'Tâche transversale' : 'Sélectionner un projet'}</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.nom}</option>)}
              </select>
            </label>
            <label className="param-field">Équipe destinataire *
              <select required value={equipeId ?? ''} onChange={(event) => handleEquipeChange(event.target.value)} disabled={!transversale && !selectedProject}>
                <option value="">{!transversale && !selectedProject ? 'Choisissez un projet d’abord' : equipeOptions.length === 0 ? 'Aucune équipe disponible' : 'Sélectionner une équipe'}</option>
                {equipeOptions.map((t) => <option key={t.id} value={t.id}>{t.code} — {t.name}</option>)}
              </select>
            </label>
            <DatePicker label="Date de début" className="param-field" value={dateDebut} onChange={setDateDebut} />
            <DatePicker label="Échéance *" className="param-field" required value={echeance} min={dateDebut || undefined} onChange={setEcheance} />

            <label className="param-checkbox-field">
              <input type="checkbox" checked={transversale} onChange={(event) => handleTransversaleChange(event.target.checked)} />
              Tâche transversale (aucun projet)
            </label>
            <label className="param-field">Manager destinataire
              <input readOnly value={selectedEquipe?.manager ? `${selectedEquipe.manager.first_name} ${selectedEquipe.manager.last_name}` : selectedEquipe ? 'Aucun manager défini' : ''} placeholder="Choisissez une équipe" />
            </label>
            <label className="param-field">Priorité *
              <select required value={priorite} onChange={(event) => setPriorite(event.target.value as TaskPriorite)}>
                {PRIORITE_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </label>

            <label className="param-field">Ligne budgétaire *
              <select required value={ligneId ?? ''} onChange={(event) => handleLigneChange(event.target.value)} disabled={!equipeId}>
                <option value="">{!equipeId ? 'Choisissez une équipe d’abord' : ligneOptions.length === 0 ? 'Aucune ligne disponible' : 'Sélectionner une ligne'}</option>
                {ligneOptions.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </label>
            <label className="param-field">Sous-ligne
              <select value={sousLigneId ?? ''} onChange={(event) => setSousLigneId(event.target.value === '' ? null : Number(event.target.value))} disabled={ligneId === null}>
                <option value="">{ligneId === null ? 'Sélectionnez d’abord une ligne budgétaire' : sousLigneOptions.length === 0 ? 'Aucune sous-ligne disponible' : 'Sélectionner une sous-ligne'}</option>
                {sousLigneOptions.map((l) => <option key={l.id} value={l.id}>{l.code} — {l.nom}</option>)}
              </select>
              {selectedSousLigne?.declinaison && <p className="charge-hint">{selectedSousLigne.declinaison}</p>}
            </label>

            <label className="param-field arch-panel-full">Description / Contexte *
              <textarea required rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Précisez le contexte de cette attribution..." />
            </label>
          </div>

          <div className="ge-modal-actions">
            <button type="button" className="ge-btn-outline" onClick={onClose} disabled={saving}>Annuler</button>
            <button type="submit" className="ge-btn-primary" disabled={!canSave || saving}>{saving ? 'Enregistrement…' : submitLabel}</button>
          </div>
        </form>
      )}
    </div>
  )
}

export default function StaffingEquipesPage({ navigateTo }: { navigateTo: (page: string) => void }) {
  const [teams, setTeams] = useState<Team[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [lignes, setLignes] = useState<LigneBudgetaire[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState<TaskStatut | 'tous'>('tous')
  const [filterEcheanceDebut, setFilterEcheanceDebut] = useState('')
  const [filterEcheanceFin, setFilterEcheanceFin] = useState('')
  const [showMoreFilters, setShowMoreFilters] = useState(false)
  const [filterEquipe, setFilterEquipe] = useState<number | 'tous'>('tous')
  const [filterPriorite, setFilterPriorite] = useState<TaskPriorite | 'tous'>('tous')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [page, setPage] = useState(1)
  const [panel, setPanel] = useState<PanelMode>(null)

  useEffect(() => {
    Promise.all([fetchTeams(), fetchTasks(), fetchProjects(), fetchLignesBudgetaires()])
      .then(([teamsData, tasksData, projectsData, lignesData]) => {
        setTeams(teamsData)
        setTasks(tasksData)
        setProjects(projectsData)
        setLignes(lignesData)
      })
      .catch(() => setLoadError('Impossible de charger le staffing des équipes.'))
      .finally(() => setLoading(false))
  }, [])

  const query = search.trim().toLowerCase()
  const filtered = tasks.filter((t) => (
    (filterStatut === 'tous' || t.statut === filterStatut)
    && (filterEquipe === 'tous' || t.equipe === filterEquipe)
    && (filterPriorite === 'tous' || t.priorite === filterPriorite)
    && (!filterEcheanceDebut || (t.echeance ?? '') >= filterEcheanceDebut)
    && (!filterEcheanceFin || (t.echeance ?? '') <= filterEcheanceFin)
    && (!query || t.template_nom.toLowerCase().includes(query) || t.code.toLowerCase().includes(query)
      || (t.project_nom ?? '').toLowerCase().includes(query) || t.equipe_nom.toLowerCase().includes(query))
  ))

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const changeFilter = (apply: () => void) => { apply(); setPage(1) }

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const pageAllSelected = pageItems.length > 0 && pageItems.every((t) => selectedIds.has(t.id))
  const toggleSelectPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (pageAllSelected) pageItems.forEach((t) => next.delete(t.id))
      else pageItems.forEach((t) => next.add(t.id))
      return next
    })
  }

  const selectedTasks = tasks.filter((t) => selectedIds.has(t.id))

  const handleDuplicate = () => {
    if (selectedTasks.length !== 1) return
    setPanel({ kind: 'create', from: selectedTasks[0] })
  }

  const handleExport = () => {
    exportTasksCsv(selectedTasks.length > 0 ? selectedTasks : filtered)
  }

  const handleCreated = (task: Task) => {
    setTasks((prev) => [task, ...prev])
    setPanel(null)
  }

  const handleUpdated = (task: Task) => {
    setTasks((prev) => prev.map((t) => t.id === task.id ? task : t))
    setPanel({ kind: 'view', task })
  }

  const handleDeleteRequest = async (task: Task) => {
    if (!window.confirm(`Supprimer la tâche « ${task.template_nom} » attribuée à ${task.equipe_nom} ?`)) return
    setActionError(null)
    try {
      await deleteTask(task.id)
      setTasks((prev) => prev.filter((t) => t.id !== task.id))
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(task.id); return next })
      setPanel(null)
    } catch (err) {
      setActionError(errorMessage(err))
    }
  }

  const dashboardState: PanelState = loadError ? 'error' : loading ? 'loading' : 'ready'

  const projetsDefinitifs = projects.filter((p) => p.statut === 'definitif')
  const budgetTotalEngage = projetsDefinitifs.reduce((sum, p) => sum + p.budget_execution, 0)
  const tachesEnvoyees = tasks.filter((t) => t.statut === 'envoyee').length
  const tachesDecidees = tasks.filter((t) => t.statut === 'acceptee' || t.statut === 'refusee')
  const tauxAcceptation = tachesDecidees.length > 0
    ? Math.round((tachesDecidees.filter((t) => t.statut === 'acceptee').length / tachesDecidees.length) * 100)
    : null
  const equipesActives = new Set(tasks.map((t) => t.equipe)).size

  const tachesParEquipe = teams
    .map((team) => ({ label: team.name, value: tasks.filter((t) => t.equipe === team.id).length }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)

  const repartitionStatut = [
    { label: 'Envoyée', value: tasks.filter((t) => t.statut === 'envoyee').length },
    { label: 'Acceptée', value: tasks.filter((t) => t.statut === 'acceptee').length },
    { label: 'Refusée', value: tasks.filter((t) => t.statut === 'refusee').length },
  ]

  // Évolution des tâches sur les 7 derniers mois : créées (date de création) vs
  // acceptées (date de décision du manager) — même fenêtre que ManagerDashboard.
  const now = new Date()
  const trendBuckets = Array.from({ length: 7 }, (_, i) => {
    const start = new Date(now.getFullYear(), now.getMonth() - (6 - i), 1)
    const end = new Date(now.getFullYear(), now.getMonth() - (6 - i) + 1, 1)
    return { label: MONTHS_FR[start.getMonth()], start, end, created: 0, done: 0 }
  })
  tasks.forEach((t) => {
    const createdAt = new Date(t.created_at)
    const createdBucket = trendBuckets.find((b) => createdAt >= b.start && createdAt < b.end)
    if (createdBucket) createdBucket.created += 1
    if (t.statut === 'acceptee' && t.statut_decide_le) {
      const decideAt = new Date(t.statut_decide_le)
      const decideBucket = trendBuckets.find((b) => decideAt >= b.start && decideAt < b.end)
      if (decideBucket) decideBucket.done += 1
    }
  })
  const tasksTrend = trendBuckets.map((b) => ({ label: b.label, created: b.created, done: b.done }))

  const projectScatterData = projetsDefinitifs.map((p) => {
    const attribue = p.lignes.reduce((sum, l) => sum + l.montant, 0)
    return {
      label: p.nom,
      budgetExecution: p.budget_execution,
      attribuePercent: p.budget_execution > 0 ? (attribue / p.budget_execution) * 100 : 0,
    }
  })

  return (
    <section className="arch-page se-page">
      <div className="se-title-row">
        <div>
          <h1>Staffing des équipes <Info size={15} className="se-title-info" /></h1>
          <p>Attribuez une tâche du catalogue à une équipe et à son manager. Dès la validation, la tâche est envoyée et apparaît dans Nouveau staffing, onglet À valider, où le workflow se poursuit.</p>
        </div>
        <button type="button" className="ge-btn-outline" onClick={() => navigateTo('staffing')}>Voir Nouveau staffing</button>
      </div>

      {loadError && <p className="ge-form-error">{loadError}</p>}

      <div className="dsh-root se-dashboard">
        <div className="dsh-kpi-grid">
          <KpiCard loading={loading} icon="▦" tone="primary" label="Projets enregistrés"
            value={String(projetsDefinitifs.length)}
            trend={{ direction: 'flat', text: `${Math.max(0, projects.length - projetsDefinitifs.length)} en brouillon` }}
            details="Projets définitivement enregistrés"
            onOpen={() => navigateTo('pilotage')} />
          <KpiCard loading={loading} icon="◈" tone="ok" label="Budget total engagé"
            value={formatMontant(budgetTotalEngage, undefined, { notation: 'compact' })}
            trend={{ direction: 'flat', text: 'Budget d’exécution cumulé' }}
            details="Sur les projets enregistrés"
            onOpen={() => navigateTo('pilotage')} />
          <KpiCard loading={loading} icon="▤" tone="primary" label="Tâches attribuées"
            value={String(tasks.length)}
            trend={{ direction: 'flat', text: `${equipesActives} équipe(s) concernée(s)` }}
            details="Toutes équipes confondues"
            onOpen={() => changeFilter(() => { setFilterStatut('tous'); setFilterEquipe('tous') })} />
          <KpiCard loading={loading} icon="⏳" tone={tachesEnvoyees > 0 ? 'warn' : 'ok'} label="Tâches à valider"
            value={String(tachesEnvoyees)}
            trend={{ direction: tachesEnvoyees > 0 ? 'down' : 'flat', text: 'En attente de décision', good: tachesEnvoyees === 0 }}
            details="Envoyées, pas encore décidées"
            onOpen={() => changeFilter(() => setFilterStatut('envoyee'))} />
          <KpiCard loading={loading} icon="✓" tone={tauxAcceptation === null || tauxAcceptation >= 70 ? 'ok' : 'warn'} label="Taux d’acceptation"
            value={tauxAcceptation === null ? '—' : `${tauxAcceptation} %`}
            trend={{ direction: 'flat', text: `${tachesDecidees.length} décision(s)` }}
            details="Acceptées parmi les décidées"
            onOpen={() => changeFilter(() => setFilterStatut('acceptee'))} />
          <KpiCard loading={loading} icon="☰" tone="primary" label="Équipes actives"
            value={String(equipesActives)}
            trend={{ direction: 'flat', text: `${teams.length} équipe(s) au total` }}
            details="Ayant au moins une tâche"
            onOpen={() => navigateTo('gestion-equipes')} />
        </div>

        <div className="dsh-grid">
          <Panel className="dsh-col-7" title="Évolution des tâches" subtitle="Créées et acceptées par mois, sur les 7 derniers mois" state={dashboardState}>
            <TasksTrendChart data={tasksTrend} />
          </Panel>
          <Panel className="dsh-col-5" title="Tâches par équipe" subtitle="Volume total attribué, toutes périodes confondues" state={dashboardState}>
            <TeamTasksBarChart data={tachesParEquipe} />
          </Panel>
          <Panel className="dsh-col-5" title="Répartition par statut" subtitle="Décision du manager destinataire" state={dashboardState}>
            <TaskStatusDonut data={repartitionStatut} />
          </Panel>
          <Panel className="dsh-col-7" title="Projets — budget vs attribution" subtitle="Un point par projet enregistré définitivement" state={dashboardState}>
            <ProjectBudgetScatter data={projectScatterData} />
          </Panel>
        </div>
      </div>

      <div className="arch-attribution">
        {actionError && <p className="ge-form-error">{actionError}</p>}

        <div className="arch-toolbar-row">
          <button type="button" className="arch-btn-primary" onClick={() => setPanel({ kind: 'create' })}><Plus size={14} />Attribuer une tâche</button>
          <button type="button" className="arch-btn-outline" onClick={handleDuplicate} disabled={selectedTasks.length !== 1}><Copy size={14} />Dupliquer</button>
          <button type="button" className="arch-btn-outline" onClick={handleExport} disabled={filtered.length === 0}><Download size={14} />Exporter</button>

          <select className="arch-select-sm" value={filterStatut} onChange={(event) => changeFilter(() => setFilterStatut(event.target.value as TaskStatut | 'tous'))}>
            <option value="tous">Tous statuts</option>
            {STATUT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>

          <label className="arch-date-filter">Échéance du
            <DatePicker value={filterEcheanceDebut} onChange={(v) => changeFilter(() => setFilterEcheanceDebut(v))} />
          </label>
          <label className="arch-date-filter">au
            <DatePicker value={filterEcheanceFin} min={filterEcheanceDebut || undefined} onChange={(v) => changeFilter(() => setFilterEcheanceFin(v))} />
          </label>

          <label className="arch-search">
            <Search size={13} />
            <input placeholder="Rechercher..." value={search} onChange={(event) => changeFilter(() => setSearch(event.target.value))} />
          </label>

          <button type="button" className={`arch-btn-outline ${showMoreFilters ? 'is-active' : ''}`} onClick={() => setShowMoreFilters((v) => !v)}><Filter size={14} />Filtres</button>
        </div>

        {showMoreFilters && (
          <div className="arch-toolbar-row arch-toolbar-row-secondary">
            <select className="arch-select-sm" value={filterEquipe} onChange={(event) => changeFilter(() => setFilterEquipe(event.target.value === 'tous' ? 'tous' : Number(event.target.value)))}>
              <option value="tous">Toutes les équipes</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.code} — {t.name}</option>)}
            </select>
            <select className="arch-select-sm" value={filterPriorite} onChange={(event) => changeFilter(() => setFilterPriorite(event.target.value as TaskPriorite | 'tous'))}>
              <option value="tous">Toutes priorités</option>
              {PRIORITE_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
        )}

        <div className="arch-table-panel">
          <div className="arch-table-wrap">
            <table className="arch-table">
              <thead>
                <tr>
                  <th className="arch-th-checkbox"><input type="checkbox" checked={pageAllSelected} onChange={toggleSelectPage} aria-label="Tout sélectionner" /></th>
                  <th>Code</th><th>Projet / Nature</th><th>Tâche (depuis catalogue)</th><th>Équipe destinataire</th>
                  <th>Manager destinataire</th><th>Ligne budgétaire</th><th>Sous-ligne</th>
                  <th>Date de début</th><th>Échéance</th><th>Priorité</th>
                  <th>Statut</th><th>Créé le</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={13} className="ge-detail-empty">Chargement…</td></tr>}
                {!loading && pageItems.map((task) => (
                  <tr key={task.id}>
                    <td className="arch-th-checkbox"><input type="checkbox" checked={selectedIds.has(task.id)} onChange={() => toggleSelect(task.id)} aria-label={`Sélectionner ${task.code}`} /></td>
                    <td className="arch-code">{task.code}</td>
                    <td>{task.project_nom ? <>{task.project_code}<br /><small>{task.project_nom}</small></> : <span className="arch-transversale-tag">– Transversale</span>}</td>
                    <td className="arch-name">{task.template_nom}</td>
                    <td>{task.equipe_code}</td>
                    <td>{task.equipe_manager_nom ?? '—'}</td>
                    <td>{task.ligne_budgetaire_code} — {task.ligne_budgetaire_nom}</td>
                    <td>{task.ligne_budgetaire_declinaison || '—'}</td>
                    <td>{formatDate(task.date_debut)}</td>
                    <td>{formatDate(task.echeance)}</td>
                    <td><span className={`arch-pill arch-pill-prio-${task.priorite}`}>{task.priorite_display}</span></td>
                    <td>
                      <span className={`arch-pill arch-pill-${task.statut}`}>{task.statut_display}</span>
                      {task.statut === 'acceptee' && (
                        <div className="arch-staffed-hint">{staffingSummary(task)}</div>
                      )}
                    </td>
                    <td>{formatDate(task.created_at)}</td>
                    <td>
                      <div className="arch-actions">
                        <button type="button" className="arch-row-action" aria-label="Voir le détail" onClick={() => setPanel({ kind: 'view', task })}><Eye size={13} /></button>
                        <button type="button" className="arch-row-action" aria-label="Modifier" onClick={() => setPanel({ kind: 'edit', task })}><Pencil size={13} /></button>
                        <button type="button" className="arch-row-action danger" aria-label="Supprimer" onClick={() => handleDeleteRequest(task)}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && pageItems.length === 0 && (
                  <tr><td colSpan={13} className="ge-detail-empty">Aucune tâche ne correspond à ces filtres.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="arch-table-foot">
            <span>Affichage {filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1} à {Math.min(currentPage * PAGE_SIZE, filtered.length)} sur {filtered.length} tâche{filtered.length > 1 ? 's' : ''}</span>
            <nav className="arch-pagination" aria-label="Pagination">
              <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft size={14} /></button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} type="button" className={p === currentPage ? 'is-active' : ''} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight size={14} /></button>
            </nav>
          </div>
        </div>

        {panel && (
          <TaskPanel
            key={panel.kind === 'create' ? `create-${panel.from?.id ?? 'blank'}` : `${panel.kind}-${panel.task.id}`}
            mode={panel}
            teams={teams}
            projects={projects}
            lignes={lignes}
            onClose={() => setPanel(null)}
            onCreated={handleCreated}
            onUpdated={handleUpdated}
            onDeleteRequest={handleDeleteRequest}
          />
        )}
      </div>
    </section>
  )
}
