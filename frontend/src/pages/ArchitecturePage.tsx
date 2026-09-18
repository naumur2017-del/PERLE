import { useState, useEffect, type FormEvent } from 'react'
import {
  Archive, Building2, ChevronDown, ChevronRight, Download, Folder, FolderOpen,
  ListChecks, Pencil, Plus, Search, Trash2, Upload, X,
} from 'lucide-react'
import { fetchTeams, type Team } from '../api/employees'
import {
  createTaskTemplate, deleteTaskTemplate, downloadTaskTemplateModele, fetchTaskTemplates, importTaskTemplates,
  updateTaskTemplate, type TaskTemplate,
  type TaskTemplateDeclenchement, type TaskTemplateFrequence, type TaskTemplatePriorite, type TaskTemplateType,
} from '../api/taskTemplates'
import { ApiError } from '../api/client'
import ExcelImportModal from '../components/ExcelImportModal'
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

const TEMPLATE_TYPE_OPTIONS: { value: TaskTemplateType; label: string }[] = [
  { value: 'dossier', label: 'Dossier' },
  { value: 'tache_elementaire', label: 'Tâche élémentaire' },
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
  // Section « Paramétrage » retirée du formulaire de création/édition (Catalogue des tâches) :
  // ces valeurs restent envoyées avec leur défaut (ou celui déjà en place en édition) plutôt que
  // saisies à la main, mais restent affichées en lecture seule dans le détail d'une tâche.
  const frequence: TaskTemplateFrequence = seed?.frequence ?? 'ponctuelle'
  const modeDeclenchement: TaskTemplateDeclenchement = seed?.mode_declenchement ?? 'manuel'
  const prioriteDefaut: TaskTemplatePriorite = seed?.priorite_defaut ?? 'moyenne'
  const dureeEstimee = seed?.duree_estimee_heures != null ? String(seed.duree_estimee_heures) : ''
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

          <div className="ge-modal-actions">
            <button type="button" className="ge-btn-outline" onClick={onClose} disabled={saving}>Annuler</button>
            <button type="submit" className="ge-btn-primary" disabled={!canSave || saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
          </div>
        </form>
      )}
    </div>
  )
}

function TaskTemplateBankTab({ templates, teams, loading, onCreated, onUpdated, onDeleted, onImported }: {
  templates: TaskTemplate[]
  teams: Team[]
  loading: boolean
  onCreated: (t: TaskTemplate) => void
  onUpdated: (t: TaskTemplate) => void
  onDeleted: (id: number) => void
  onImported: () => void
}) {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [expandedTeams, setExpandedTeams] = useState<Set<number>>(new Set())
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null)
  const [panel, setPanel] = useState<{ kind: 'create'; parentId: number | null; equipeId?: number | null } | { kind: 'edit' | 'view'; node: TaskTemplate } | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)

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
        <button type="button" className="arch-btn-outline" onClick={() => setImportOpen(true)}><Upload size={14} />Importer depuis Excel</button>
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

      {importOpen && (
        <ExcelImportModal
          title="Importer le catalogue des tâches"
          hint="Téléchargez le modèle, remplissez une ligne par élément (code, nom, code parent, équipe...) puis importez le fichier."
          onDownloadModele={downloadTaskTemplateModele}
          onImport={importTaskTemplates}
          onClose={() => setImportOpen(false)}
          onImported={onImported}
        />
      )}
    </div>
  )
}

export default function ArchitecturePage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([fetchTeams(), fetchTaskTemplates()])
      .then(([teamsData, templatesData]) => {
        setTeams(teamsData)
        setTemplates(templatesData)
      })
      .catch(() => setLoadError('Impossible de charger l’architecture des tâches.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="arch-page">
      {loadError && <p className="ge-form-error">{loadError}</p>}

      <TaskTemplateBankTab
        templates={templates}
        teams={teams}
        loading={loading}
        onCreated={(t) => setTemplates((prev) => [...prev, t])}
        onUpdated={(t) => setTemplates((prev) => prev.map((x) => x.id === t.id ? t : x))}
        onDeleted={(id) => setTemplates((prev) => prev.filter((x) => x.id !== id))}
        onImported={() => { fetchTaskTemplates().then(setTemplates).catch(() => {}) }}
      />
    </section>
  )
}
