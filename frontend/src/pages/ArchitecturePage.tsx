import { useEffect, useState, type FormEvent } from 'react'
import {
  Archive, Building2, CalendarClock, CheckCircle2, ChevronDown, ChevronRight, Eye, File, Folder,
  FolderKanban, FolderOpen, ListChecks, Pencil, Plus, Rocket, Search, Trash2, User, UserCheck, Users, X,
} from 'lucide-react'
import { fetchTeams, type Team, type TeamMember } from '../api/employees'
import { fetchProjects, type Project } from '../api/projects'
import { createTask, deleteTask, fetchTasks, launchTask, type Task } from '../api/tasks'
import {
  createTaskTemplate, deleteTaskTemplate, fetchTaskTemplates, updateTaskTemplate, type TaskTemplate,
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

const MODULES_LIES = [
  { icon: FolderKanban, label: 'Création de projet' },
  { icon: ListChecks, label: 'Pilotage des projets' },
  { icon: UserCheck, label: 'Staffing' },
]

type PageTab = 'staffing' | 'banque'
type Selection = { type: 'team'; id: number } | { type: 'member'; id: number; teamId: number } | null

function TeamTree({ teams, expanded, onToggle, selected, onSelect }: {
  teams: Team[]
  expanded: Set<number>
  onToggle: (id: number) => void
  selected: Selection
  onSelect: (selection: Selection) => void
}) {
  return (
    <ul className="arch-tree">
      {teams.map((team) => {
        const isExpanded = expanded.has(team.id)
        const isSelected = selected?.type === 'team' && selected.id === team.id
        return (
          <li key={team.id}>
            <div className={`arch-tree-row ${isSelected ? 'selected' : ''}`} onClick={() => onSelect({ type: 'team', id: team.id })}>
              {team.members.length > 0 ? (
                <button
                  type="button"
                  className="arch-tree-toggle"
                  onClick={(event) => { event.stopPropagation(); onToggle(team.id) }}
                  aria-label={isExpanded ? 'Réduire' : 'Développer'}
                >
                  {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </button>
              ) : <span className="arch-tree-toggle-spacer" />}
              <span className="arch-tree-node-icon">
                {isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />}
              </span>
              <span className="arch-tree-code">{team.code}</span>
              <span className="arch-tree-label">- {team.name}</span>
              <span className="arch-tree-count">{team.members.length}</span>
            </div>
            {isExpanded && team.members.length > 0 && (
              <ul className="arch-tree">
                {team.members.map((member: TeamMember) => {
                  const mSelected = selected?.type === 'member' && selected.id === member.id
                  return (
                    <li key={member.id}>
                      <div
                        className={`arch-tree-row ${mSelected ? 'selected' : ''}`}
                        style={{ paddingLeft: 28 }}
                        onClick={() => onSelect({ type: 'member', id: member.id, teamId: team.id })}
                      >
                        <span className="arch-tree-toggle-spacer" />
                        <span className="arch-tree-node-icon"><User size={13} /></span>
                        <span className="arch-tree-label">{member.first_name} {member.last_name}</span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function TaskCreateModal({ team, projects, templates, onClose, onSubmit }: {
  team: Team
  projects: Project[]
  templates: TaskTemplate[]
  onClose: () => void
  onSubmit: (values: { template: number; project_ligne: number; heures: number }) => Promise<void>
}) {
  const [templateId, setTemplateId] = useState<number | null>(null)
  const [projectId, setProjectId] = useState<number | null>(null)
  const [ligneId, setLigneId] = useState<number | null>(null)
  const [heures, setHeures] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeTemplates = templates.filter((t) => t.actif)
  const selectedTemplate = activeTemplates.find((t) => t.id === templateId) ?? null
  const projectsWithLignesForTeam = projects.filter((p) => p.lignes.some((l) => l.equipe === team.id))
  const selectedProject = projects.find((p) => p.id === projectId) ?? null
  const lignesForTeam = selectedProject ? selectedProject.lignes.filter((l) => l.equipe === team.id) : []
  const selectedLigne = lignesForTeam.find((l) => l.id === ligneId) ?? null

  const heuresNumber = Number(heures) || 0
  const canSave = templateId !== null && ligneId !== null && heuresNumber > 0

  const handleProjectChange = (value: string) => {
    setProjectId(value === '' ? null : Number(value))
    setLigneId(null)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSave || templateId === null || ligneId === null) return
    setSaving(true)
    setError(null)
    try {
      await onSubmit({ template: templateId, project_ligne: ligneId, heures: heuresNumber })
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <div className="ge-modal-overlay" role="dialog" aria-modal="true" aria-label="Nouvelle tâche" onMouseDown={() => { if (!saving) onClose() }}>
      <div className="ge-modal arch-task-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="ge-modal-head arch-modal-head-row">
          <span className="arch-modal-icon"><ListChecks size={18} /></span>
          <div>
            <h3>Nouvelle tâche</h3>
            <p className="ge-modal-subtitle">
              Pour l’équipe <strong>{team.code} — {team.name}</strong>
              {team.manager && <> · reviendra à son manager, <strong>{team.manager.first_name} {team.manager.last_name}</strong></>}
              . L’attribution à un membre se fera plus tard depuis Staffing.
            </p>
          </div>
          <button type="button" className="ge-modal-close" onClick={onClose} aria-label="Fermer" disabled={saving}><X size={16} /></button>
        </div>

        <form className="param-form arch-task-form" onSubmit={handleSubmit}>
          {error && <p className="ge-form-error">{error}</p>}

          <div className="arch-form-section">
            <span className="arch-form-section-title"><Archive size={12} />Tâche de la banque</span>
            <label className="param-field">Modèle de tâche *
              <select required value={templateId ?? ''} onChange={(event) => setTemplateId(event.target.value === '' ? null : Number(event.target.value))}>
                <option value="">{activeTemplates.length === 0 ? 'Aucune tâche dans la banque' : 'Sélectionner une tâche'}</option>
                {activeTemplates.map((t) => <option key={t.id} value={t.id}>{t.code} — {t.nom}</option>)}
              </select>
            </label>
            {selectedTemplate?.description && <p className="charge-hint">{selectedTemplate.description}</p>}
          </div>

          <div className="arch-form-section">
            <span className="arch-form-section-title"><FolderKanban size={12} />Financement</span>
            <div className="param-form-row">
              <label className="param-field">Projet *
                <select required value={projectId ?? ''} onChange={(event) => handleProjectChange(event.target.value)}>
                  <option value="">{projectsWithLignesForTeam.length === 0 ? 'Aucun projet avec une ligne pour cette équipe' : 'Sélectionner un projet'}</option>
                  {projectsWithLignesForTeam.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.nom}</option>)}
                </select>
              </label>
              <label className="param-field">Ligne budgétaire *
                <select required value={ligneId ?? ''} onChange={(event) => setLigneId(event.target.value === '' ? null : Number(event.target.value))} disabled={!selectedProject}>
                  <option value="">{!selectedProject ? 'Choisissez un projet d’abord' : lignesForTeam.length === 0 ? 'Aucune ligne pour cette équipe' : 'Sélectionner une ligne'}</option>
                  {lignesForTeam.map((l) => <option key={l.id} value={l.id}>{l.ligne_budgetaire_code} — {l.ligne_budgetaire_nom}</option>)}
                </select>
              </label>
            </div>
            {selectedLigne && (
              <div className="arch-ligne-preview">
                <span>{selectedLigne.ligne_budgetaire_code} — {selectedLigne.ligne_budgetaire_nom}</span>
                <strong>{selectedLigne.montant.toLocaleString('fr-FR')} FCFA</strong>
              </div>
            )}
          </div>

          <div className="arch-form-section">
            <span className="arch-form-section-title"><CalendarClock size={12} />Durée</span>
            <label className="param-field">Nombre d’heures pour la tâche *
              <input required type="number" min={0} step="0.5" value={heures} placeholder="Ex. 8" onChange={(event) => setHeures(event.target.value)} />
            </label>
          </div>

          <div className="ge-modal-actions">
            <button type="button" className="ge-btn-outline" onClick={onClose} disabled={saving}>Annuler</button>
            <button type="submit" className="ge-btn-primary" disabled={!canSave || saving}>{saving ? 'Création…' : 'Créer la tâche'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TaskDetailModal({ task, onClose, onDelete }: { task: Task; onClose: () => void; onDelete: () => void }) {
  return (
    <div className="ge-modal-overlay" role="dialog" aria-modal="true" aria-label="Détail de la tâche" onMouseDown={onClose}>
      <div className="ge-modal param-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="ge-modal-head">
          <div>
            <h3>{task.template_nom}</h3>
            <p className="ge-modal-subtitle">{task.code}</p>
          </div>
          <button type="button" className="ge-modal-close" onClick={onClose} aria-label="Fermer"><X size={16} /></button>
        </div>
        <div className="param-form arch-task-detail">
          {task.template_description && <p className="arch-task-detail-desc">{task.template_description}</p>}
          <dl>
            <div><dt>Équipe</dt><dd>{task.equipe_code} — {task.equipe_nom}</dd></div>
            <div><dt>Responsable (manager)</dt><dd>{task.equipe_manager_nom ?? 'Aucun manager défini'}</dd></div>
            <div><dt>Assignée à</dt><dd>{task.assignee_nom ?? 'À attribuer depuis Staffing'}</dd></div>
            <div><dt>Projet</dt><dd>{task.project_code} — {task.project_nom}</dd></div>
            <div><dt>Ligne budgétaire</dt><dd>{task.ligne_budgetaire_code} — {task.ligne_budgetaire_nom}</dd></div>
            <div><dt>Montant</dt><dd>{task.montant.toLocaleString('fr-FR')} FCFA</dd></div>
            <div><dt>Heures</dt><dd>{task.heures.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} h</dd></div>
            <div><dt>Statut</dt><dd><span className={`ge-pill ${task.actif ? 'ge-pill-actif' : 'ge-pill-inactif'}`}>{task.actif ? 'Active' : 'Inactive'}</span></dd></div>
            <div><dt>Staffing</dt><dd>{task.lancee ? `Lancée${task.lancee_le ? ` le ${new Date(task.lancee_le).toLocaleDateString('fr-FR')}` : ''}` : 'Pas encore lancée'}</dd></div>
            <div><dt>Créée par</dt><dd>{task.created_by_nom ?? '-'}</dd></div>
          </dl>
          <div className="ge-modal-actions">
            <button type="button" className="arch-delete-btn" onClick={onDelete}><Trash2 size={13} />Supprimer la tâche</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function TaskTemplateModal({ initial, onClose, onSubmit }: {
  initial?: TaskTemplate
  onClose: () => void
  onSubmit: (values: { nom: string; description: string }) => Promise<void>
}) {
  const [nom, setNom] = useState(initial?.nom ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSave = nom.trim() !== ''

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      await onSubmit({ nom: nom.trim(), description: description.trim() })
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <div className="ge-modal-overlay" role="dialog" aria-modal="true" aria-label={initial ? 'Modifier la tâche' : 'Nouvelle tâche dans la banque'} onMouseDown={() => { if (!saving) onClose() }}>
      <div className="ge-modal param-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="ge-modal-head">
          <div>
            <h3>{initial ? 'Modifier la tâche' : 'Nouvelle tâche dans la banque'}</h3>
            <p className="ge-modal-subtitle">Un simple intitulé réutilisable, sans équipe, ligne budgétaire, heures ni montant.</p>
          </div>
          <button type="button" className="ge-modal-close" onClick={onClose} aria-label="Fermer" disabled={saving}><X size={16} /></button>
        </div>
        <form className="param-form" onSubmit={handleSubmit}>
          {error && <p className="ge-form-error">{error}</p>}
          <label className="param-field">Nom de la tâche *
            <input required value={nom} placeholder="Ex. Rédaction du rapport" onChange={(event) => setNom(event.target.value)} />
          </label>
          <label className="param-field">Description (facultatif)
            <textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <div className="ge-modal-actions">
            <button type="button" className="ge-btn-outline" onClick={onClose} disabled={saving}>Annuler</button>
            <button type="submit" className="ge-btn-primary" disabled={!canSave || saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TaskTemplateBankTab({ templates, loading, onCreated, onUpdated, onDeleted }: {
  templates: TaskTemplate[]
  loading: boolean
  onCreated: (t: TaskTemplate) => void
  onUpdated: (t: TaskTemplate) => void
  onDeleted: (id: number) => void
}) {
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<TaskTemplate | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const handleCreate = async (values: { nom: string; description: string }) => {
    const created = await createTaskTemplate(values)
    onCreated(created)
    setShowCreate(false)
  }

  const handleUpdate = async (values: { nom: string; description: string }) => {
    if (!editing) return
    const updated = await updateTaskTemplate(editing.id, values)
    onUpdated(updated)
    setEditing(null)
  }

  const handleToggleActif = async (template: TaskTemplate) => {
    const updated = await updateTaskTemplate(template.id, { actif: !template.actif })
    onUpdated(updated)
  }

  const handleDelete = async (template: TaskTemplate) => {
    if (!window.confirm(`Supprimer la tâche « ${template.nom} » de la banque ?`)) return
    setActionError(null)
    try {
      await deleteTaskTemplate(template.id)
      onDeleted(template.id)
    } catch (err) {
      setActionError(errorMessage(err))
    }
  }

  return (
    <div className="param-tab">
      <div className="param-tab-heading">
        <div>
          <h2>Banque de tâches</h2>
          <p>Définissez ici les tâches réutilisables : un simple nom, sans équipe ni ligne budgétaire ni heures ni montant. Elles se choisissent ensuite depuis Attribution staffing, pour éviter de redéfinir la même tâche à chaque équipe.</p>
        </div>
        <button type="button" className="ge-btn-primary" onClick={() => setShowCreate(true)}><Plus size={14} />Nouvelle tâche</button>
      </div>

      {actionError && <p className="ge-form-error">{actionError}</p>}

      <div className="ge-table-panel">
        <div className="ge-table-wrap">
          <table className="ge-table">
            <thead><tr><th>Code</th><th>Nom</th><th>Description</th><th>Statut</th><th>Actions</th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="ge-detail-empty">Chargement…</td></tr>}
              {!loading && templates.map((template) => (
                <tr key={template.id}>
                  <td className="arch-code">{template.code}</td>
                  <td className="arch-name">{template.nom}</td>
                  <td className="param-type-desc">{template.description || '—'}</td>
                  <td><span className={`ge-pill ${template.actif ? 'ge-pill-actif' : 'ge-pill-inactif'}`}>{template.actif ? 'Actif' : 'Inactif'}</span></td>
                  <td className="ge-actions">
                    <button type="button" className="ge-row-action" aria-label="Modifier" title="Modifier" onClick={() => setEditing(template)}><Pencil size={13} /></button>
                    <button type="button" className="ge-btn-outline param-toggle-btn" onClick={() => handleToggleActif(template)}>
                      {template.actif ? 'Désactiver' : 'Activer'}
                    </button>
                    <button type="button" className="ge-row-action ge-row-action-danger" aria-label="Supprimer" title="Supprimer" onClick={() => handleDelete(template)}><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
              {!loading && templates.length === 0 && (
                <tr><td colSpan={5} className="ge-detail-empty">Aucune tâche dans la banque pour le moment.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && <TaskTemplateModal onClose={() => setShowCreate(false)} onSubmit={handleCreate} />}
      {editing && <TaskTemplateModal initial={editing} onClose={() => setEditing(null)} onSubmit={handleUpdate} />}
    </div>
  )
}

function StaffingAttributionTab({ teams, tasks, projects, templates, loading, setTasks, actionError, setActionError }: {
  teams: Team[]
  tasks: Task[]
  projects: Project[]
  templates: TaskTemplate[]
  loading: boolean
  setTasks: (updater: (prev: Task[]) => Task[]) => void
  actionError: string | null
  setActionError: (error: string | null) => void
}) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [selected, setSelected] = useState<Selection>(null)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [viewTask, setViewTask] = useState<Task | null>(null)

  const toggleTeam = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectNode = (selection: Selection) => {
    setSelected(selection)
    if (selection?.type === 'team') setExpanded((prev) => new Set(prev).add(selection.id))
  }

  const selectedTeam = selected?.type === 'team' ? teams.find((t) => t.id === selected.id) ?? null : null
  const selectedMember = selected?.type === 'member'
    ? teams.flatMap((t) => t.members).find((m) => m.id === selected.id) ?? null
    : null

  const scoped = !selected ? tasks
    : selected.type === 'team' ? tasks.filter((t) => t.equipe === selected.id)
    : tasks.filter((t) => t.assignee === selected.id)
  const query = search.trim().toLowerCase()
  const filteredTasks = scoped.filter((t) => !query || t.template_nom.toLowerCase().includes(query) || t.code.toLowerCase().includes(query))

  const heading = !selected ? 'Toutes les tâches'
    : selectedTeam ? `Tâches de l’équipe ${selectedTeam.name}`
    : selectedMember ? `Tâches de ${selectedMember.first_name} ${selectedMember.last_name}`
    : 'Tâches'

  const tachesActives = tasks.filter((t) => t.actif).length
  const derniere = tasks.length > 0 ? [...tasks].sort((a, b) => b.created_at.localeCompare(a.created_at))[0] : null

  const kpis = [
    { icon: ListChecks, tone: 'purple', label: 'Tâches totales', value: String(tasks.length), sub: '' },
    { icon: Building2, tone: 'indigo', label: 'Équipes', value: String(teams.length), sub: '' },
    {
      icon: CheckCircle2, tone: 'green', label: 'Tâches actives', value: String(tachesActives),
      sub: tasks.length > 0 ? `${((tachesActives / tasks.length) * 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : '',
    },
    {
      icon: CalendarClock, tone: 'indigo', label: 'Dernière mise à jour',
      value: derniere ? new Date(derniere.created_at).toLocaleDateString('fr-FR') : '-',
      sub: derniere?.created_by_nom ? `Par ${derniere.created_by_nom}` : '',
    },
  ]

  const handleCreateTask = async (values: { template: number; project_ligne: number; heures: number }) => {
    const created = await createTask(values)
    setTasks((prev) => [created, ...prev])
    setShowCreate(false)
  }

  const handleDeleteTask = async (task: Task) => {
    if (!window.confirm(`Supprimer la tâche « ${task.template_nom} » ?`)) return
    setActionError(null)
    try {
      await deleteTask(task.id)
      setTasks((prev) => prev.filter((t) => t.id !== task.id))
      setViewTask(null)
    } catch (err) {
      setActionError(errorMessage(err))
    }
  }

  const handleLaunchTask = async (task: Task) => {
    setActionError(null)
    try {
      const updated = await launchTask(task.id)
      setTasks((prev) => prev.map((t) => t.id === updated.id ? updated : t))
    } catch (err) {
      setActionError(errorMessage(err))
    }
  }

  return (
    <>
      <div className="arch-modules-banner">
        <span className="arch-modules-icon"><FolderKanban size={14} /></span>
        <span>Ce référentiel alimente les modules :</span>
        <div className="arch-modules-list">
          {MODULES_LIES.map((module) => (
            <span key={module.label} className="arch-module-chip"><module.icon size={12} />{module.label}</span>
          ))}
        </div>
      </div>

      <div className="arch-kpis">
        {kpis.map((kpi) => (
          <article key={kpi.label} className={`arch-kpi arch-kpi-${kpi.tone}`}>
            <span className="arch-kpi-icon"><kpi.icon size={17} /></span>
            <div>
              <strong>{kpi.value}</strong>
              <span>{kpi.label}</span>
              {kpi.sub && <small>{kpi.sub}</small>}
            </div>
          </article>
        ))}
      </div>

      {actionError && <p className="ge-form-error">{actionError}</p>}

      <div className="arch-main">
        <div className="arch-tree-panel">
          <h3>Équipes &amp; membres</h3>
          <div className="arch-tree-wrap">
            {loading ? <p className="ge-detail-empty">Chargement…</p> : (
              <TeamTree teams={teams} expanded={expanded} onToggle={toggleTeam} selected={selected} onSelect={selectNode} />
            )}
            {!loading && teams.length === 0 && <p className="ge-detail-empty">Aucune équipe définie.</p>}
          </div>
        </div>

        <div className="arch-content">
          <h3>{heading}</h3>
          <div className="arch-filters">
            <label className="arch-search">
              <Search size={13} />
              <input placeholder="Rechercher un code ou un nom de tâche..." value={search} onChange={(event) => setSearch(event.target.value)} />
            </label>
            {selected && <button type="button" className="arch-btn-outline" onClick={() => setSelected(null)}><Users size={13} />Voir toutes les tâches</button>}
          </div>

          {selected?.type === 'team' && (
            <div className="arch-toolbar">
              <button type="button" className="arch-btn-primary" onClick={() => setShowCreate(true)}><Plus size={14} />Nouvelle tâche</button>
            </div>
          )}

          <div className="arch-table-panel">
            <div className="arch-table-wrap">
              <table className="arch-table">
                <thead>
                  <tr>
                    <th>Code</th><th>Nom de la tâche</th><th>Équipe</th><th>Projet</th><th>Ligne budgétaire</th>
                    <th>Montant</th><th>Heures</th><th>Assignée à</th><th>Statut</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && <tr><td colSpan={10} className="ge-detail-empty">Chargement…</td></tr>}
                  {!loading && filteredTasks.map((task) => (
                    <tr key={task.id}>
                      <td className="arch-code">{task.code}</td>
                      <td className="arch-name">{task.template_nom}</td>
                      <td>{task.equipe_code}</td>
                      <td>{task.project_code}</td>
                      <td>{task.ligne_budgetaire_code} — {task.ligne_budgetaire_nom}</td>
                      <td>{task.montant.toLocaleString('fr-FR')} FCFA</td>
                      <td>{task.heures.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} h</td>
                      <td>{task.assignee_nom ?? <File size={13} />}</td>
                      <td><span className={`ge-pill ${task.actif ? 'ge-pill-actif' : 'ge-pill-inactif'}`}>{task.actif ? 'Active' : 'Inactive'}</span></td>
                      <td>
                        <div className="arch-actions">
                          {task.lancee ? (
                            <span className="arch-launched-pill" title={task.lancee_le ? `Lancée le ${new Date(task.lancee_le).toLocaleDateString('fr-FR')}` : 'Lancée'}><Rocket size={12} />Lancée</span>
                          ) : (
                            <button type="button" className="arch-row-action" aria-label="Lancer la tâche" title="Lancer la tâche (visible dans Nouveau staffing du manager)" onClick={() => handleLaunchTask(task)}><Rocket size={13} /></button>
                          )}
                          <button type="button" className="arch-row-action" aria-label="Voir le détail" onClick={() => setViewTask(task)}><Eye size={13} /></button>
                          <button type="button" className="arch-row-action danger" aria-label="Supprimer" onClick={() => handleDeleteTask(task)}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!loading && filteredTasks.length === 0 && (
                    <tr><td colSpan={10} className="ge-detail-empty">
                      {selected ? 'Aucune tâche pour cette sélection.' : 'Aucune tâche définie pour le moment.'}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="arch-table-foot">
              <span>{filteredTasks.length} tâche{filteredTasks.length > 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      </div>

      {showCreate && selectedTeam && (
        <TaskCreateModal team={selectedTeam} projects={projects} templates={templates} onClose={() => setShowCreate(false)} onSubmit={handleCreateTask} />
      )}
      {viewTask && (
        <TaskDetailModal task={viewTask} onClose={() => setViewTask(null)} onDelete={() => handleDeleteTask(viewTask)} />
      )}
    </>
  )
}

export default function ArchitecturePage() {
  const [pageTab, setPageTab] = useState<PageTab>('staffing')

  const [teams, setTeams] = useState<Team[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([fetchTeams(), fetchTasks(), fetchProjects(), fetchTaskTemplates()])
      .then(([teamsData, tasksData, projectsData, templatesData]) => {
        setTeams(teamsData)
        setTasks(tasksData)
        setProjects(projectsData)
        setTemplates(templatesData)
      })
      .catch(() => setLoadError('Impossible de charger l’architecture des tâches.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="arch-page">
      <nav className="arch-subtabs">
        <button className={pageTab === 'staffing' ? 'active' : ''} onClick={() => setPageTab('staffing')}><UserCheck size={14} />Attribution staffing</button>
        <button className={pageTab === 'banque' ? 'active' : ''} onClick={() => setPageTab('banque')}><Archive size={14} />Architecture des tâches</button>
      </nav>

      {loadError && <p className="ge-form-error">{loadError}</p>}

      {pageTab === 'banque' ? (
        <TaskTemplateBankTab
          templates={templates}
          loading={loading}
          onCreated={(t) => setTemplates((prev) => [...prev, t])}
          onUpdated={(t) => setTemplates((prev) => prev.map((x) => x.id === t.id ? t : x))}
          onDeleted={(id) => setTemplates((prev) => prev.filter((x) => x.id !== id))}
        />
      ) : (
        <StaffingAttributionTab
          teams={teams} tasks={tasks} projects={projects} templates={templates} loading={loading}
          setTasks={setTasks} actionError={actionError} setActionError={setActionError}
        />
      )}
    </section>
  )
}
