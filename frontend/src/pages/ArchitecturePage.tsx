import { useState, useEffect, type FormEvent } from 'react'
import {
  Archive, Building2, CalendarClock, ChevronDown, ChevronLeft, ChevronRight, Copy, Download, Eye, Filter, Folder, FolderOpen,
  ListChecks, Pencil, Plus, Search, Trash2, UserCheck, X,
} from 'lucide-react'
import { fetchTeams, type Team } from '../api/employees'
import { fetchProjects, type Project } from '../api/projects'
import { fetchLignesBudgetaires, type LigneBudgetaire } from '../api/architectureMonetaire'
import {
  createTask, deleteTask, fetchTasks, updateTask, type Task, type TaskFormValues,
  type TaskPriorite, type TaskStatut,
} from '../api/tasks'
import {
  createTaskTemplate, deleteTaskTemplate, fetchTaskTemplates, updateTaskTemplate, type TaskTemplate,
  type TaskTemplateDeclenchement, type TaskTemplateFrequence, type TaskTemplatePriorite, type TaskTemplateType,
} from '../api/taskTemplates'
import { ApiError } from '../api/client'
import './ArchitecturePage.css'

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

const PAGE_SIZE = 8

type PageTab = 'attribution' | 'banque'
type PanelMode = { kind: 'create'; from?: Task } | { kind: 'edit'; task: Task } | { kind: 'view'; task: Task } | null

function exportTasksCsv(tasks: Task[]) {
  const header = ['Code', 'Tâche', 'Projet', 'Équipe', 'Manager', 'Ligne budgétaire', 'Échéance', 'Priorité', 'Statut', 'Créé le']
  const rows = tasks.map((t) => [
    t.template_code, t.template_nom, t.project_nom ? `${t.project_code} — ${t.project_nom}` : 'Transversale',
    `${t.equipe_code} — ${t.equipe_nom}`, t.equipe_manager_nom ?? '', `${t.ligne_budgetaire_code} — ${t.ligne_budgetaire_nom}`,
    formatDate(t.echeance), t.priorite_display, t.statut_display, formatDate(t.created_at),
  ])
  const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\r\n')
  const bom = String.fromCharCode(0xfeff)
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `attribution-des-taches-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function TaskPanel({ mode, teams, projects, templates, lignes, onClose, onCreated, onUpdated, onDeleteRequest }: {
  mode: Exclude<PanelMode, null>
  teams: Team[]
  projects: Project[]
  templates: TaskTemplate[]
  lignes: LigneBudgetaire[]
  onClose: () => void
  onCreated: (task: Task) => void
  onUpdated: (task: Task) => void
  onDeleteRequest: (task: Task) => void
}) {
  const seed = mode.kind === 'create' ? mode.from : mode.task
  const [templateId, setTemplateId] = useState<number | null>(seed?.template ?? null)
  const [description, setDescription] = useState(seed?.description ?? '')
  const [transversale, setTransversale] = useState(seed ? seed.project === null : false)
  const [projectId, setProjectId] = useState<number | null>(seed?.project ?? null)
  const [equipeId, setEquipeId] = useState<number | null>(seed?.equipe ?? null)
  const [ligneId, setLigneId] = useState<number | null>(seed?.ligne_budgetaire ?? null)
  const [echeance, setEcheance] = useState(mode.kind === 'create' ? '' : seed?.echeance ?? '')
  const [priorite, setPriorite] = useState<TaskPriorite>(seed?.priorite ?? 'moyenne')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(mode.kind !== 'view')

  const readOnly = mode.kind === 'view' && !editing
  const activeTemplates = templates.filter((t) => t.actif || t.id === templateId)
  const selectedTemplate = activeTemplates.find((t) => t.id === templateId) ?? null
  const selectedProject = projects.find((p) => p.id === projectId) ?? null

  const equipeOptions = transversale
    ? teams
    : selectedProject ? teams.filter((t) => selectedProject.lignes.some((l) => l.equipe === t.id)) : []
  const selectedEquipe = teams.find((t) => t.id === equipeId) ?? null

  const ligneOptions = transversale
    ? lignes.filter((l) => l.equipe === equipeId && l.actif).map((l) => ({ value: l.id, label: `${l.code} — ${l.nom}` }))
    : selectedProject
      ? selectedProject.lignes.filter((l) => l.equipe === equipeId).map((l) => ({ value: l.ligne_budgetaire, label: `${l.ligne_budgetaire_code} — ${l.ligne_budgetaire_nom}` }))
      : []

  const canSave = templateId !== null && ligneId !== null && equipeId !== null && echeance !== ''
    && description.trim() !== '' && (transversale || projectId !== null)

  const handleTemplateChange = (value: string) => {
    const id = value === '' ? null : Number(value)
    setTemplateId(id)
    const tpl = templates.find((t) => t.id === id)
    if (description.trim() === '' && tpl?.details) setDescription(tpl.details)
    if (tpl) setPriorite(tpl.priorite_defaut)
  }

  const handleTransversaleChange = (checked: boolean) => {
    setTransversale(checked)
    if (checked) setProjectId(null)
    setEquipeId(null)
    setLigneId(null)
  }

  const handleProjectChange = (value: string) => {
    setProjectId(value === '' ? null : Number(value))
    setEquipeId(null)
    setLigneId(null)
  }

  const handleEquipeChange = (value: string) => {
    setEquipeId(value === '' ? null : Number(value))
    setLigneId(null)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSave || templateId === null || ligneId === null) return
    setSaving(true)
    setError(null)
    const payload: TaskFormValues = {
      template: templateId,
      description: description.trim(),
      project: transversale ? null : projectId,
      ligne_budgetaire: ligneId,
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

  return (
    <div className="arch-panel">
      <div className="arch-panel-head">
        <h3>{mode.kind === 'view' && !editing ? 'DÉTAIL / ATTRIBUTION D’UNE TÂCHE' : 'DÉTAIL / ATTRIBUTION D’UNE TÂCHE'}</h3>
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
            <label className="param-field">Échéance *
              <input required type="date" value={echeance} onChange={(event) => setEcheance(event.target.value)} />
            </label>

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

            <label className="param-field">Tâche (depuis catalogue) *
              <select required value={templateId ?? ''} onChange={(event) => handleTemplateChange(event.target.value)}>
                <option value="">{activeTemplates.length === 0 ? 'Aucune tâche dans le catalogue' : 'Sélectionner une tâche'}</option>
                {activeTemplates.map((t) => <option key={t.id} value={t.id}>{t.code} — {t.nom}{t.type_element === 'dossier' ? ' (dossier)' : ''}</option>)}
              </select>
              {selectedTemplate?.details && <p className="charge-hint">{selectedTemplate.details}</p>}
            </label>
            <label className="param-field">Ligne budgétaire *
              <select required value={ligneId ?? ''} onChange={(event) => setLigneId(event.target.value === '' ? null : Number(event.target.value))} disabled={!equipeId}>
                <option value="">{!equipeId ? 'Choisissez une équipe d’abord' : ligneOptions.length === 0 ? 'Aucune ligne disponible' : 'Sélectionner une ligne'}</option>
                {ligneOptions.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </label>

            <label className="param-field arch-panel-full">Description / Contexte *
              <textarea required rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Précisez le contexte de cette attribution..." />
            </label>
          </div>

          <div className="ge-modal-actions">
            <button type="button" className="ge-btn-outline" onClick={onClose} disabled={saving}>Annuler</button>
            <button type="submit" className="ge-btn-primary" disabled={!canSave || saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
          </div>
        </form>
      )}
    </div>
  )
}

function TaskAttributionTab({ teams, tasks, projects, templates, lignes, loading, setTasks, actionError, setActionError }: {
  teams: Team[]
  tasks: Task[]
  projects: Project[]
  templates: TaskTemplate[]
  lignes: LigneBudgetaire[]
  loading: boolean
  setTasks: (updater: (prev: Task[]) => Task[]) => void
  actionError: string | null
  setActionError: (error: string | null) => void
}) {
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

  return (
    <div className="arch-attribution">
      <p className="arch-attribution-lead">Attribuer une tâche du catalogue à une équipe et à son manager.</p>

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
          <input type="date" value={filterEcheanceDebut} onChange={(event) => changeFilter(() => setFilterEcheanceDebut(event.target.value))} />
        </label>
        <label className="arch-date-filter">au
          <input type="date" value={filterEcheanceFin} onChange={(event) => changeFilter(() => setFilterEcheanceFin(event.target.value))} />
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
                <th>Manager destinataire</th><th>Ligne budgétaire</th><th>Échéance</th><th>Priorité</th><th>Statut</th>
                <th>Créé le</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={11} className="ge-detail-empty">Chargement…</td></tr>}
              {!loading && pageItems.map((task) => (
                <tr key={task.id}>
                  <td className="arch-th-checkbox"><input type="checkbox" checked={selectedIds.has(task.id)} onChange={() => toggleSelect(task.id)} aria-label={`Sélectionner ${task.code}`} /></td>
                  <td className="arch-code">{task.template_code}</td>
                  <td>{task.project_nom ? <>{task.project_code}<br /><small>{task.project_nom}</small></> : <span className="arch-transversale-tag">– Transversale</span>}</td>
                  <td className="arch-name">{task.template_nom}</td>
                  <td>{task.equipe_code}</td>
                  <td>{task.equipe_manager_nom ?? '—'}</td>
                  <td>{task.ligne_budgetaire_code} — {task.ligne_budgetaire_nom}</td>
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
                <tr><td colSpan={11} className="ge-detail-empty">Aucune tâche ne correspond à ces filtres.</td></tr>
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
          templates={templates}
          lignes={lignes}
          onClose={() => setPanel(null)}
          onCreated={handleCreated}
          onUpdated={handleUpdated}
          onDeleteRequest={handleDeleteRequest}
        />
      )}
    </div>
  )
}

const TEMPLATE_TYPE_OPTIONS: { value: TaskTemplateType; label: string }[] = [
  { value: 'dossier', label: 'Dossier' },
  { value: 'tache_elementaire', label: 'Tâche élémentaire' },
]
const TEMPLATE_FREQUENCE_OPTIONS: { value: 'ponctuelle' | 'recurrente'; label: string }[] = [
  { value: 'ponctuelle', label: 'Ponctuelle' },
  { value: 'recurrente', label: 'Récurrente' },
]
const TEMPLATE_DECLENCHEMENT_OPTIONS: { value: 'manuel' | 'automatique'; label: string }[] = [
  { value: 'manuel', label: 'Manuel' },
  { value: 'automatique', label: 'Automatique' },
]

interface TemplateNode extends TaskTemplate { children: TemplateNode[] }

function buildTemplateTree(templates: TaskTemplate[]): TemplateNode[] {
  const nodes = new Map<number, TemplateNode>(templates.map((t) => [t.id, { ...t, children: [] }]))
  const roots: TemplateNode[] = []
  nodes.forEach((node) => {
    if (node.parent !== null && nodes.has(node.parent)) {
      nodes.get(node.parent)!.children.push(node)
    } else {
      roots.push(node)
    }
  })
  return roots
}

function exportTemplatesCsv(templates: TaskTemplate[]) {
  const header = ['Code', 'Nom', 'Niveau', 'Parent', 'Équipe', 'Type', 'Attribuable', 'Statut', 'Créée le']
  const rows = templates.map((t) => [
    t.code, t.nom, String(t.niveau), t.parent_code ?? '', t.equipe_nom ? `${t.equipe_code} — ${t.equipe_nom}` : '',
    t.type_element_display, t.attribuable ? 'Oui' : 'Non', t.actif ? 'Actif' : 'Inactif', formatDate(t.created_at),
  ])
  const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\r\n')
  const bom = String.fromCharCode(0xfeff)
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `catalogue-des-taches-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function CatalogueTree({ nodes, depth = 0, expanded, onToggle, selectedId, onSelect }: {
  nodes: TemplateNode[]
  depth?: number
  expanded: Set<number>
  onToggle: (id: number) => void
  selectedId: number | null
  onSelect: (node: TemplateNode) => void
}) {
  return (
    <ul className="arch-tree">
      {nodes.map((node) => {
        const isExpanded = expanded.has(node.id)
        const isSelected = selectedId === node.id
        const isLeaf = node.type_element === 'tache_elementaire'
        return (
          <li key={node.id}>
            <div className={`arch-tree-row ${isSelected ? 'selected' : ''} ${!node.actif ? 'arch-tree-row-inactive' : ''}`} style={{ paddingLeft: depth * 14 }} onClick={() => onSelect(node)}>
              {node.children.length > 0 ? (
                <button type="button" className="arch-tree-toggle" onClick={(event) => { event.stopPropagation(); onToggle(node.id) }} aria-label={isExpanded ? 'Réduire' : 'Développer'}>
                  {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </button>
              ) : <span className="arch-tree-toggle-spacer" />}
              <span className="arch-tree-node-icon">{isLeaf ? <ListChecks size={13} /> : (isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />)}</span>
              <span className="arch-tree-code">{node.code}</span>
              <span className="arch-tree-label">- {node.nom}</span>
            </div>
            {isExpanded && node.children.length > 0 && (
              <CatalogueTree nodes={node.children} depth={depth + 1} expanded={expanded} onToggle={onToggle} selectedId={selectedId} onSelect={onSelect} />
            )}
          </li>
        )
      })}
    </ul>
  )
}

function CataloguePanel({ mode, templates, dossiers, teams, onClose, onCreated, onUpdated, onDeleteRequest }: {
  mode: { kind: 'create'; parentId: number | null; equipeId?: number | null } | { kind: 'edit' | 'view'; node: TaskTemplate }
  templates: TaskTemplate[]
  dossiers: TaskTemplate[]
  teams: Team[]
  onClose: () => void
  onCreated: (t: TaskTemplate) => void
  onUpdated: (t: TaskTemplate) => void
  onDeleteRequest: (t: TaskTemplate) => void
}) {
  const seed = mode.kind === 'edit' || mode.kind === 'view' ? mode.node : null
  const initialParentId = mode.kind === 'create' && mode.parentId !== null
    ? (dossiers.some((d) => d.id === mode.parentId) ? mode.parentId : null)
    : null
  const [code, setCode] = useState(seed?.code ?? '')
  const [nom, setNom] = useState(seed?.nom ?? '')
  const [parentId, setParentId] = useState<number | null>(seed ? seed.parent : initialParentId)
  const initialEquipeId = (): number | null => {
    if (seed) return seed.equipe
    if (initialParentId !== null) {
      const parentTemplate = templates.find((t) => t.id === initialParentId)
      if (parentTemplate) return parentTemplate.equipe
    }
    if (mode.kind === 'create' && mode.equipeId != null) return mode.equipeId
    return null
  }
  const [equipeId, setEquipeId] = useState<number | null>(initialEquipeId())
  const [typeElement, setTypeElement] = useState<TaskTemplateType>(seed?.type_element ?? 'dossier')
  const [attribuable, setAttribuable] = useState(seed?.attribuable ?? true)
  const [recurrente, setRecurrente] = useState(seed?.recurrente ?? false)
  const [details, setDetails] = useState(seed?.details ?? '')
  const [explication, setExplication] = useState(seed?.explication ?? '')
  const [frequence, setFrequence] = useState<TaskTemplateFrequence>(seed?.frequence ?? 'ponctuelle')
  const [modeDeclenchement, setModeDeclenchement] = useState<TaskTemplateDeclenchement>(seed?.mode_declenchement ?? 'manuel')
  const [prioriteDefaut, setPrioriteDefaut] = useState<TaskTemplatePriorite>(seed?.priorite_defaut ?? 'moyenne')
  const [dureeEstimee, setDureeEstimee] = useState(seed?.duree_estimee_heures != null ? String(seed.duree_estimee_heures) : '')
  const [actif, setActif] = useState(seed?.actif ?? true)
  const [saving, setSaving] = useState(false)
  const [togglingActif, setTogglingActif] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(mode.kind !== 'view')

  const readOnly = mode.kind === 'view' && !editing
  const parentNode = templates.find((t) => t.id === parentId) ?? null
  const isRoot = parentId === null
  const canSave = nom.trim() !== '' && (mode.kind !== 'create' || code.trim() !== '') && (!isRoot || equipeId !== null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSave) return
    setSaving(true)
    setError(null)
    const payload = {
      nom: nom.trim(),
      equipe: equipeId,
      type_element: typeElement,
      attribuable: typeElement === 'tache_elementaire' ? attribuable : true,
      recurrente,
      details: details.trim(),
      explication: explication.trim(),
      frequence,
      mode_declenchement: modeDeclenchement,
      priorite_defaut: prioriteDefaut,
      duree_estimee_heures: dureeEstimee === '' ? null : Number(dureeEstimee),
      actif,
    }
    try {
      if (mode.kind === 'create') {
        const created = await createTaskTemplate({ ...payload, code: code.trim(), parent: parentId })
        onCreated(created)
      } else {
        const updated = await updateTaskTemplate(mode.node.id, payload)
        onUpdated(updated)
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActif = async () => {
    if (mode.kind !== 'view') return
    setTogglingActif(true)
    setError(null)
    try {
      const updated = await updateTaskTemplate(mode.node.id, { actif: !mode.node.actif })
      onUpdated(updated)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setTogglingActif(false)
    }
  }

  return (
    <div className="arch-panel">
      <div className="arch-panel-head">
        <h3>DÉTAIL DE LA TÂCHE</h3>
        <button type="button" className="ge-modal-close" onClick={onClose} aria-label="Fermer"><X size={16} /></button>
      </div>

      {readOnly ? (
        <div className="arch-panel-view">
          <div className="arch-panel-view-head">
            <strong>{mode.node.code}</strong>
            <span className={`ge-pill ${mode.node.actif ? 'ge-pill-actif' : 'ge-pill-inactif'}`}>{mode.node.actif ? 'Actif' : 'Inactif'}</span>
            <span className="arch-pill arch-pill-prio-moyenne">{mode.node.type_element_display}</span>
          </div>
          <h4>{mode.node.nom}</h4>
          {mode.node.details && <p className="arch-task-detail-desc">{mode.node.details}</p>}
          <dl className="arch-task-detail">
            <div><dt>Parent</dt><dd>{mode.node.parent_nom ? `${mode.node.parent_code} — ${mode.node.parent_nom}` : 'Racine'}</dd></div>
            <div><dt>Niveau</dt><dd>{mode.node.niveau}</dd></div>
            <div><dt>Équipe</dt><dd>{mode.node.equipe_nom ? `${mode.node.equipe_code} — ${mode.node.equipe_nom}` : '—'}</dd></div>
            {mode.node.type_element === 'tache_elementaire' && (
              <>
                <div><dt>Attribuable</dt><dd>{mode.node.attribuable ? 'Oui' : 'Non'}</dd></div>
                <div><dt>Récurrente</dt><dd>{mode.node.recurrente ? 'Oui' : 'Non'}</dd></div>
                <div><dt>Fréquence</dt><dd>{mode.node.frequence_display}</dd></div>
                <div><dt>Mode de déclenchement</dt><dd>{mode.node.mode_declenchement_display}</dd></div>
                <div><dt>Priorité par défaut</dt><dd>{mode.node.priorite_defaut_display}</dd></div>
                <div><dt>Durée estimée</dt><dd>{mode.node.duree_estimee_heures != null ? `${mode.node.duree_estimee_heures} h` : '—'}</dd></div>
                <div><dt>Attributions en cours</dt><dd>{mode.node.attributions_count}</dd></div>
              </>
            )}
            {mode.node.explication && <div><dt>Explication</dt><dd>{mode.node.explication}</dd></div>}
            <div><dt>Sous-éléments</dt><dd>{mode.node.enfants_count}</dd></div>
            <div><dt>Créée le</dt><dd>{formatDate(mode.node.created_at)} {mode.node.created_by_nom ? `par ${mode.node.created_by_nom}` : ''}</dd></div>
            <div><dt>Dernière modification</dt><dd>{formatDate(mode.node.updated_at)} {mode.node.updated_by_nom ? `par ${mode.node.updated_by_nom}` : ''}</dd></div>
          </dl>
          <div className="ge-modal-actions">
            <button type="button" className="arch-delete-btn" onClick={() => onDeleteRequest(mode.node)}><Trash2 size={13} />Supprimer</button>
            <button type="button" className="ge-btn-outline param-toggle-btn" disabled={togglingActif} onClick={handleToggleActif}>
              {togglingActif ? 'Enregistrement…' : mode.node.actif ? 'Désactiver' : 'Activer'}
            </button>
            <button type="button" className="ge-btn-primary" onClick={() => setEditing(true)}><Pencil size={13} />Modifier</button>
          </div>
        </div>
      ) : (
        <form className="param-form" onSubmit={handleSubmit}>
          {error && <p className="ge-form-error">{error}</p>}

          <div className="arch-form-section">
            <span className="arch-form-section-title"><Archive size={12} />Identification</span>
            <div className="arch-panel-grid">
              <label className="param-field">Code *
                {mode.kind === 'create' ? (
                  <input required value={code} placeholder="Ex. PI, A01..." onChange={(event) => setCode(event.target.value)} />
                ) : (
                  <input readOnly value={code} />
                )}
              </label>
              <label className="param-field">Nom de la tâche *
                <input required value={nom} placeholder="Ex. Chiffrage unitaire" onChange={(event) => setNom(event.target.value)} />
              </label>
              <label className="param-field">Statut *
                <select value={actif ? '1' : '0'} onChange={(event) => setActif(event.target.value === '1')}>
                  <option value="1">Actif</option>
                  <option value="0">Inactif</option>
                </select>
              </label>

              <label className="param-field">Parent
                {mode.kind === 'create' ? (
                  <select value={parentId ?? ''} onChange={(event) => {
                    const id = event.target.value === '' ? null : Number(event.target.value)
                    setParentId(id)
                    const p = templates.find((t) => t.id === id)
                    setEquipeId(p?.equipe ?? null)
                  }}>
                    <option value="">Racine (aucun parent — premier niveau)</option>
                    {dossiers.map((d) => <option key={d.id} value={d.id}>{d.code} — {d.nom}</option>)}
                  </select>
                ) : (
                  <input readOnly value={parentNode ? `${parentNode.code} — ${parentNode.nom}` : 'Racine (aucun parent — premier niveau)'} />
                )}
              </label>
              <label className="param-field">Équipe {isRoot && '*'}
                {isRoot ? (
                  <select required value={equipeId ?? ''} onChange={(event) => setEquipeId(event.target.value === '' ? null : Number(event.target.value))}>
                    <option value="">Sélectionner une équipe</option>
                    {teams.map((t) => <option key={t.id} value={t.id}>{t.code} — {t.name}</option>)}
                  </select>
                ) : (
                  <input readOnly value={parentNode?.equipe_nom ? `${parentNode.equipe_code} — ${parentNode.equipe_nom}` : (seed?.equipe_nom ? `${seed.equipe_code} — ${seed.equipe_nom}` : 'Héritée du premier niveau')} />
                )}
              </label>
              <label className="param-field">Type d’élément *
                <select value={typeElement} onChange={(event) => setTypeElement(event.target.value as TaskTemplateType)}>
                  {TEMPLATE_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
              {typeElement === 'tache_elementaire' && (
                <label className="param-field">Tâche attribuable *
                  <select value={attribuable ? '1' : '0'} onChange={(event) => setAttribuable(event.target.value === '1')}>
                    <option value="1">Oui</option>
                    <option value="0">Non</option>
                  </select>
                </label>
              )}
              <label className="param-checkbox-field">
                <input type="checkbox" checked={recurrente} onChange={(event) => setRecurrente(event.target.checked)} />
                Tâche récurrente
              </label>
            </div>
          </div>

          <div className="arch-form-section">
            <span className="arch-form-section-title"><ListChecks size={12} />Description fonctionnelle</span>
            <div className="arch-panel-grid">
              <label className="param-field arch-panel-full">Détails
                <textarea rows={3} value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Ce que couvre cette tâche..." />
              </label>
              <label className="param-field arch-panel-full">Explication
                <textarea rows={3} value={explication} onChange={(event) => setExplication(event.target.value)} placeholder="Pourquoi cette tâche existe, comment la réaliser..." />
              </label>
            </div>
          </div>

          {typeElement === 'tache_elementaire' && (
            <div className="arch-form-section">
              <span className="arch-form-section-title"><CalendarClock size={12} />Paramétrage</span>
              <div className="arch-panel-grid">
                <label className="param-field">Fréquence
                  <select value={frequence} onChange={(event) => setFrequence(event.target.value as TaskTemplateFrequence)}>
                    {TEMPLATE_FREQUENCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
                <label className="param-field">Mode de déclenchement
                  <select value={modeDeclenchement} onChange={(event) => setModeDeclenchement(event.target.value as TaskTemplateDeclenchement)}>
                    {TEMPLATE_DECLENCHEMENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
                <label className="param-field">Priorité par défaut
                  <select value={prioriteDefaut} onChange={(event) => setPrioriteDefaut(event.target.value as TaskTemplatePriorite)}>
                    {PRIORITE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
                <label className="param-field">Durée estimée (heures)
                  <input type="number" min={0} step="0.5" value={dureeEstimee} placeholder="-" onChange={(event) => setDureeEstimee(event.target.value)} />
                </label>
              </div>
            </div>
          )}

          <div className="ge-modal-actions">
            <button type="button" className="ge-btn-outline" onClick={onClose} disabled={saving}>Annuler</button>
            <button type="submit" className="ge-btn-primary" disabled={!canSave || saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
          </div>
        </form>
      )}
    </div>
  )
}

function TaskTemplateBankTab({ templates, teams, loading, onCreated, onUpdated, onDeleted }: {
  templates: TaskTemplate[]
  teams: Team[]
  loading: boolean
  onCreated: (t: TaskTemplate) => void
  onUpdated: (t: TaskTemplate) => void
  onDeleted: (id: number) => void
}) {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [expandedTeams, setExpandedTeams] = useState<Set<number>>(new Set())
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null)
  const [panel, setPanel] = useState<{ kind: 'create'; parentId: number | null; equipeId?: number | null } | { kind: 'edit' | 'view'; node: TaskTemplate } | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const dossiers = templates.filter((t) => t.type_element === 'dossier')
  const tree = buildTemplateTree(templates)
  const selectedId = panel && panel.kind !== 'create' ? panel.node.id : null
  const selectedTeam = teams.find((t) => t.id === selectedTeamId) ?? null

  const rootsByTeam = new Map<number, TemplateNode[]>()
  const unassignedRoots: TemplateNode[] = []
  tree.forEach((root) => {
    if (root.equipe !== null) {
      if (!rootsByTeam.has(root.equipe)) rootsByTeam.set(root.equipe, [])
      rootsByTeam.get(root.equipe)!.push(root)
    } else {
      unassignedRoots.push(root)
    }
  })

  const toggle = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleTeam = (id: number) => {
    setExpandedTeams((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const expandToReveal = (node: TaskTemplate) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      let current: TaskTemplate | undefined = node
      if (current.enfants_count > 0) next.add(current.id)
      while (current?.parent !== null && current?.parent !== undefined) {
        next.add(current.parent)
        current = templates.find((t) => t.id === current!.parent)
      }
      return next
    })
    if (node.equipe !== null) setExpandedTeams((prev) => new Set(prev).add(node.equipe!))
  }

  const handleSelect = (node: TemplateNode) => {
    setSelectedTeamId(null)
    setPanel({ kind: 'view', node })
    expandToReveal(node)
  }

  const handleSelectTeam = (team: Team) => {
    setPanel(null)
    setSelectedTeamId(team.id)
    setExpandedTeams((prev) => new Set(prev).add(team.id))
  }

  const handleNewClick = () => {
    if (selectedId !== null) {
      setPanel({ kind: 'create', parentId: selectedId })
    } else if (selectedTeamId !== null) {
      setPanel({ kind: 'create', parentId: null, equipeId: selectedTeamId })
    } else {
      setPanel({ kind: 'create', parentId: null })
    }
  }

  const handleDeleteRequest = async (template: TaskTemplate) => {
    if (!window.confirm(`Supprimer « ${template.nom} » du catalogue ?`)) return
    setActionError(null)
    try {
      await deleteTaskTemplate(template.id)
      onDeleted(template.id)
      setPanel(null)
    } catch (err) {
      setActionError(errorMessage(err))
    }
  }

  const query = search.trim().toLowerCase()
  const searchMatches = query ? templates.filter((t) => t.nom.toLowerCase().includes(query) || t.code.toLowerCase().includes(query)) : []

  return (
    <div className="arch-attribution">
      <p className="arch-attribution-lead">Référentiel permanent des tâches disponibles pour attribution aux équipes.</p>

      {actionError && <p className="ge-form-error">{actionError}</p>}

      <div className="arch-toolbar-row">
        <button type="button" className="arch-btn-primary" onClick={handleNewClick}><Plus size={14} />Nouvelle tâche</button>
        <button type="button" className="arch-btn-outline" onClick={() => exportTemplatesCsv(templates)} disabled={templates.length === 0}><Download size={14} />Exporter</button>
        <label className="arch-search">
          <Search size={13} />
          <input placeholder="Rechercher une tâche, un code..." value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
      </div>

      <div className="arch-main">
        <div className="arch-tree-panel">
          <h3>Arbre de l’architecture</h3>
          <div className="arch-tree-wrap">
            {loading ? <p className="ge-detail-empty">Chargement…</p> : query ? (
              searchMatches.length === 0 ? <p className="ge-detail-empty">Aucun résultat.</p> : (
                <ul className="arch-tree">
                  {searchMatches.map((t) => (
                    <li key={t.id}>
                      <div className={`arch-tree-row ${selectedId === t.id ? 'selected' : ''}`} onClick={() => setPanel({ kind: 'view', node: t })}>
                        <span className="arch-tree-toggle-spacer" />
                        <span className="arch-tree-node-icon">{t.type_element === 'tache_elementaire' ? <ListChecks size={13} /> : <Folder size={14} />}</span>
                        <span className="arch-tree-code">{t.code}</span>
                        <span className="arch-tree-label">- {t.nom}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )
            ) : (
              <ul className="arch-tree">
                {teams.map((team) => {
                  const teamExpanded = expandedTeams.has(team.id)
                  const roots = rootsByTeam.get(team.id) ?? []
                  return (
                    <li key={`team-${team.id}`}>
                      <div className={`arch-tree-row ${selectedTeamId === team.id ? 'selected' : ''}`} onClick={() => handleSelectTeam(team)}>
                        {roots.length > 0 ? (
                          <button type="button" className="arch-tree-toggle" onClick={(event) => { event.stopPropagation(); toggleTeam(team.id) }} aria-label={teamExpanded ? 'Réduire' : 'Développer'}>
                            {teamExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                          </button>
                        ) : <span className="arch-tree-toggle-spacer" />}
                        <span className="arch-tree-node-icon"><Building2 size={14} /></span>
                        <span className="arch-tree-code">{team.code}</span>
                        <span className="arch-tree-label">- {team.name}</span>
                        <span className="arch-tree-count">{roots.length}</span>
                      </div>
                      {teamExpanded && roots.length > 0 && (
                        <CatalogueTree nodes={roots} depth={1} expanded={expanded} onToggle={toggle} selectedId={selectedId} onSelect={handleSelect} />
                      )}
                    </li>
                  )
                })}
                {unassignedRoots.length > 0 && (
                  <li key="unassigned">
                    <div className={`arch-tree-row ${selectedTeamId === -1 ? 'selected' : ''}`} onClick={() => { setPanel(null); setSelectedTeamId(-1); setExpandedTeams((prev) => new Set(prev).add(-1)) }}>
                      {expandedTeams.has(-1) ? (
                        <button type="button" className="arch-tree-toggle" onClick={(event) => { event.stopPropagation(); toggleTeam(-1) }} aria-label="Réduire"><ChevronDown size={13} /></button>
                      ) : (
                        <button type="button" className="arch-tree-toggle" onClick={(event) => { event.stopPropagation(); toggleTeam(-1) }} aria-label="Développer"><ChevronRight size={13} /></button>
                      )}
                      <span className="arch-tree-node-icon"><Building2 size={14} /></span>
                      <span className="arch-tree-label">Sans équipe assignée</span>
                      <span className="arch-tree-count">{unassignedRoots.length}</span>
                    </div>
                    {expandedTeams.has(-1) && (
                      <CatalogueTree nodes={unassignedRoots} depth={1} expanded={expanded} onToggle={toggle} selectedId={selectedId} onSelect={handleSelect} />
                    )}
                  </li>
                )}
              </ul>
            )}
            {!loading && !query && teams.length === 0 && <p className="ge-detail-empty">Aucune équipe définie : créez-en une depuis Gestion des équipes.</p>}
          </div>
        </div>

        <div className="arch-content">
          {panel ? (
            <CataloguePanel
              key={panel.kind === 'create' ? `create-${panel.parentId ?? panel.equipeId ?? 'root'}` : `${panel.kind}-${panel.node.id}-${panel.node.updated_at}`}
              mode={panel}
              templates={templates}
              dossiers={dossiers}
              teams={teams}
              onClose={() => setPanel(null)}
              onCreated={(t) => { onCreated(t); setPanel({ kind: 'view', node: t }); expandToReveal(t) }}
              onUpdated={(t) => { onUpdated(t); setPanel({ kind: 'view', node: t }); expandToReveal(t) }}
              onDeleteRequest={handleDeleteRequest}
            />
          ) : selectedTeam ? (
            <div className="arch-panel">
              <div className="arch-panel-view">
                <div className="arch-panel-view-head">
                  <strong>{selectedTeam.code}</strong>
                  <span className="arch-pill arch-pill-prio-moyenne">{rootsByTeam.get(selectedTeam.id)?.length ?? 0} élément(s) racine</span>
                </div>
                <h4>{selectedTeam.name}</h4>
                <p className="ge-detail-empty" style={{ padding: 0, textAlign: 'left' }}>Premier niveau de l’arborescence pour cette équipe. Créez-y un dossier ou une tâche élémentaire.</p>
                <div className="ge-modal-actions">
                  <button type="button" className="ge-btn-primary" onClick={handleNewClick}><Plus size={13} />Nouvelle tâche pour cette équipe</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="arch-panel">
              <div className="arch-panel-view" style={{ alignItems: 'center', textAlign: 'center' }}>
                <p className="ge-detail-empty">Sélectionnez une équipe ou un élément de l’arbre pour voir son détail, ou créez-en un nouveau.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ArchitecturePage() {
  const [pageTab, setPageTab] = useState<PageTab>('attribution')

  const [teams, setTeams] = useState<Team[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [lignes, setLignes] = useState<LigneBudgetaire[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([fetchTeams(), fetchTasks(), fetchProjects(), fetchTaskTemplates(), fetchLignesBudgetaires()])
      .then(([teamsData, tasksData, projectsData, templatesData, lignesData]) => {
        setTeams(teamsData)
        setTasks(tasksData)
        setProjects(projectsData)
        setTemplates(templatesData)
        setLignes(lignesData)
      })
      .catch(() => setLoadError('Impossible de charger l’architecture des tâches.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="arch-page">
      <nav className="arch-subtabs">
        <button className={pageTab === 'attribution' ? 'active' : ''} onClick={() => setPageTab('attribution')}><UserCheck size={14} />Attribution des tâches</button>
        <button className={pageTab === 'banque' ? 'active' : ''} onClick={() => setPageTab('banque')}><Archive size={14} />Catalogue des tâches</button>
      </nav>

      {loadError && <p className="ge-form-error">{loadError}</p>}

      {pageTab === 'banque' ? (
        <TaskTemplateBankTab
          templates={templates}
          teams={teams}
          loading={loading}
          onCreated={(t) => setTemplates((prev) => [...prev, t])}
          onUpdated={(t) => setTemplates((prev) => prev.map((x) => x.id === t.id ? t : x))}
          onDeleted={(id) => setTemplates((prev) => prev.filter((x) => x.id !== id))}
        />
      ) : (
        <TaskAttributionTab
          teams={teams} tasks={tasks} projects={projects} templates={templates} lignes={lignes} loading={loading}
          setTasks={setTasks} actionError={actionError} setActionError={setActionError}
        />
      )}
    </section>
  )
}
