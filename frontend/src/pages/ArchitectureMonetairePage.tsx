import { useEffect, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import {
  Ban, CheckCircle2, ChevronDown, ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight,
  FolderClosed, FolderOpen, Layers, MoreVertical, Pencil, Plus, RotateCcw, Search, Trash2, X,
} from 'lucide-react'
import {
  createLigneBudgetaire, deleteLigneBudgetaire, fetchLignesBudgetaires, updateLigneBudgetaire,
  type LigneBudgetaire,
} from '../api/architectureMonetaire'
import { fetchTeams, type Team } from '../api/employees'
import { ApiError } from '../api/client'
import './ArchitectureMonetairePage.css'

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

interface VisibleRow extends LigneBudgetaire {
  depth: number
}

interface LigneFormValues {
  nom: string
  equipe: number
  declinaison: string
  montant_prevu: number | null
}

function LigneBudgetaireModal({ mode, teams, parent, initial, onClose, onSubmit }: {
  mode: 'create' | 'edit'
  teams: Team[]
  parent?: LigneBudgetaire | null
  initial?: LigneBudgetaire
  onClose: () => void
  onSubmit: (values: LigneFormValues) => Promise<void>
}) {
  const [nom, setNom] = useState(initial?.nom ?? '')
  const [equipe, setEquipe] = useState<number>(initial?.equipe ?? parent?.equipe ?? teams[0]?.id ?? 0)
  const [declinaison, setDeclinaison] = useState(initial?.declinaison ?? '')
  const [montantPrevu, setMontantPrevu] = useState(initial?.montant_prevu != null ? String(initial.montant_prevu) : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const niveau = initial?.niveau ?? (parent ? parent.niveau + 1 : 1)
  const canSave = nom.trim() !== '' && !!equipe && !saving

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      await onSubmit({ nom: nom.trim(), equipe, declinaison: declinaison.trim(), montant_prevu: montantPrevu.trim() === '' ? null : Number(montantPrevu) })
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <div className="ge-modal-overlay" role="dialog" aria-modal="true" aria-label={mode === 'edit' ? 'Modifier la ligne budgétaire' : 'Nouvelle ligne budgétaire'} onMouseDown={() => { if (!saving) onClose() }}>
      <div className="ge-modal param-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="ge-modal-head">
          <div>
            <h3>{mode === 'edit' ? 'Modifier la ligne budgétaire' : 'Nouvelle ligne budgétaire'}</h3>
            <p className="ge-modal-subtitle">
              {parent ? <>Sous-ligne de <strong>{parent.code} — {parent.nom}</strong> (niveau {niveau})</> : `Ligne de niveau ${niveau}`}
            </p>
          </div>
          <button type="button" className="ge-modal-close" onClick={onClose} aria-label="Fermer" disabled={saving}><X size={16} /></button>
        </div>

        <form className="param-form" onSubmit={handleSubmit}>
          {error && <p className="ge-form-error">{error}</p>}

          <label className="param-field">Nom de la ligne budgétaire *
            <input required value={nom} placeholder="Ex. Carburant" onChange={(event) => setNom(event.target.value)} />
          </label>

          <label className="param-field">Équipe *
            <select required value={equipe} onChange={(event) => setEquipe(Number(event.target.value))}>
              {teams.length === 0 && <option value={0}>Aucune équipe disponible</option>}
              {teams.map((team) => <option key={team.id} value={team.id}>{team.code} — {team.name}</option>)}
            </select>
          </label>

          <label className="param-field">Déclinaison (facultatif)
            <input value={declinaison} placeholder="Ex. Parentaux BMN national" onChange={(event) => setDeclinaison(event.target.value)} />
          </label>

          {niveau === 3 && (
            <label className="param-field">Montant prévu (facultatif)
              <input type="number" min={0} value={montantPrevu} placeholder="Ex. 1 000 000" onChange={(event) => setMontantPrevu(event.target.value)} />
            </label>
          )}
          {niveau === 3 && (
            <p className="param-hint">
              Plafond consommable par chaque projet qui attribue cette ligne (indépendant pour chaque projet). Laisser vide pour ne fixer aucune limite.
            </p>
          )}

          <div className="ge-modal-actions">
            <button type="button" className="ge-btn-outline" onClick={onClose} disabled={saving}>Annuler</button>
            <button type="submit" className="ge-btn-primary" disabled={!canSave}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function RowActionsMenu({ ligne, canAddChild, onEdit, onAddChild, onToggleActif, onDelete }: {
  ligne: LigneBudgetaire
  canAddChild: boolean
  onEdit: () => void
  onAddChild: () => void
  onToggleActif: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const toggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const menuHeight = 170
      const menuWidth = 210
      // Flip above the button (instead of the usual below) when there isn't room under it,
      // so the menu never renders past the bottom edge of the viewport on a long table.
      const top = rect.bottom + 6 + menuHeight > window.innerHeight
        ? Math.max(8, rect.top - menuHeight - 6)
        : rect.bottom + 6
      const left = Math.max(8, rect.right - menuWidth)
      setPosition({ top, left })
    }
    setOpen((value) => !value)
  }

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  return (
    <>
      <button type="button" ref={buttonRef} className="ge-row-action" aria-label="Plus d’actions" aria-haspopup="menu" aria-expanded={open} onClick={toggle}>
        <MoreVertical size={13} />
      </button>
      {open && position && createPortal(
        <>
          <div className="ge-row-menu-backdrop" onClick={() => setOpen(false)} />
          <div className="ge-row-menu-list" role="menu" style={{ top: position.top, left: position.left }}>
            <button type="button" role="menuitem" onClick={() => { setOpen(false); onEdit() }}>
              <Pencil size={13} strokeWidth={2} />Modifier
            </button>
            {canAddChild && (
              <button type="button" role="menuitem" onClick={() => { setOpen(false); onAddChild() }}>
                <Layers size={13} strokeWidth={2} />Ajouter une sous-ligne
              </button>
            )}
            <button type="button" role="menuitem" onClick={() => { setOpen(false); onToggleActif() }}>
              {ligne.actif ? <Ban size={13} strokeWidth={2} /> : <CheckCircle2 size={13} strokeWidth={2} />}
              {ligne.actif ? 'Désactiver' : 'Activer'}
            </button>
            <button type="button" role="menuitem" className="ge-row-menu-danger" onClick={() => { setOpen(false); onDelete() }}>
              <Trash2 size={13} strokeWidth={2} />Supprimer
            </button>
          </div>
        </>,
        document.body,
      )}
    </>
  )
}

const PER_PAGE_OPTIONS = [10, 25, 50, 100]

export default function ArchitectureMonetairePage() {
  const [lignes, setLignes] = useState<LigneBudgetaire[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [equipeFilter, setEquipeFilter] = useState<'toutes' | number>('toutes')
  const [niveauFilter, setNiveauFilter] = useState<'tous' | '1' | '2' | '3'>('tous')
  const [statutFilter, setStatutFilter] = useState<'tous' | 'actif' | 'inactif'>('actif')
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [createFor, setCreateFor] = useState<{ parent: LigneBudgetaire | null } | null>(null)
  const [editingLigne, setEditingLigne] = useState<LigneBudgetaire | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchLignesBudgetaires(), fetchTeams()])
      .then(([lignesData, teamsData]) => {
        if (cancelled) return
        setLignes(lignesData)
        setTeams(teamsData)
        setExpandedIds(new Set(lignesData.filter((l) => l.niveau === 1).map((l) => l.id)))
      })
      .catch(() => { if (!cancelled) setLoadError('Impossible de charger l’architecture monétaire.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const treeMode = search.trim() === '' && equipeFilter === 'toutes' && niveauFilter === 'tous'

  const matchesStatut = (l: LigneBudgetaire) => statutFilter === 'tous' || (statutFilter === 'actif') === l.actif
  const hasChildren = (id: number) => lignes.some((l) => l.parent === id)

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  let visible: VisibleRow[]
  if (treeMode) {
    visible = []
    const walk = (parentId: number | null, depth: number) => {
      const kids = lignes.filter((l) => l.parent === parentId && matchesStatut(l)).sort((a, b) => a.code.localeCompare(b.code))
      for (const kid of kids) {
        visible.push({ ...kid, depth })
        if (hasChildren(kid.id) && expandedIds.has(kid.id)) walk(kid.id, depth + 1)
      }
    }
    walk(null, 0)
  } else {
    const q = search.trim().toLowerCase()
    visible = lignes
      .filter((l) =>
        matchesStatut(l)
        && (equipeFilter === 'toutes' || l.equipe === equipeFilter)
        && (niveauFilter === 'tous' || String(l.niveau) === niveauFilter)
        && (!q || l.code.toLowerCase().includes(q) || l.nom.toLowerCase().includes(q)),
      )
      .sort((a, b) => a.code.localeCompare(b.code))
      .map((l) => ({ ...l, depth: 0 }))
  }

  const totalPages = Math.max(1, Math.ceil(visible.length / perPage))
  const currentPage = Math.min(page, totalPages)
  const pageRows = visible.slice((currentPage - 1) * perPage, currentPage * perPage)

  const setSearchAndResetPage = (value: string) => { setSearch(value); setPage(1) }
  const setEquipeFilterAndResetPage = (value: 'toutes' | number) => { setEquipeFilter(value); setPage(1) }
  const setNiveauFilterAndResetPage = (value: typeof niveauFilter) => { setNiveauFilter(value); setPage(1) }
  const setStatutFilterAndResetPage = (value: typeof statutFilter) => { setStatutFilter(value); setPage(1) }
  const setPerPageAndResetPage = (value: number) => { setPerPage(value); setPage(1) }

  const resetFilters = () => {
    setSearch(''); setEquipeFilter('toutes'); setNiveauFilter('tous'); setStatutFilter('tous'); setPage(1)
  }

  const handleCreate = async (values: LigneFormValues) => {
    const parent = createFor?.parent ?? null
    const created = await createLigneBudgetaire({ nom: values.nom, equipe: values.equipe, declinaison: values.declinaison, montant_prevu: values.montant_prevu, parent: parent?.id ?? null })
    setLignes((prev) => [...prev, created])
    if (parent) setExpandedIds((prev) => new Set(prev).add(parent.id))
    setCreateFor(null)
  }

  const handleUpdate = async (values: LigneFormValues) => {
    if (!editingLigne) return
    const updated = await updateLigneBudgetaire(editingLigne.id, { nom: values.nom, equipe: values.equipe, declinaison: values.declinaison, montant_prevu: values.montant_prevu })
    setLignes((prev) => prev.map((l) => l.id === updated.id ? updated : l))
    setEditingLigne(null)
  }

  const handleToggleActif = async (ligne: LigneBudgetaire) => {
    setActionError(null)
    try {
      const updated = await updateLigneBudgetaire(ligne.id, { actif: !ligne.actif })
      setLignes((prev) => prev.map((l) => l.id === updated.id ? updated : l))
    } catch (err) {
      setActionError(errorMessage(err))
    }
  }

  const handleDelete = async (ligne: LigneBudgetaire) => {
    setActionError(null)
    if (!window.confirm(`Supprimer la ligne budgétaire « ${ligne.nom} » ?`)) return
    try {
      await deleteLigneBudgetaire(ligne.id)
      setLignes((prev) => prev.filter((l) => l.id !== ligne.id))
    } catch (err) {
      setActionError(errorMessage(err))
    }
  }

  return (
    <section className="ge-page am-page">
      <div className="ge-header-row">
        <div />
        <div className="ge-header-actions">
          <button type="button" className="ge-btn-primary" onClick={() => setCreateFor({ parent: null })} disabled={teams.length === 0}>
            <Plus size={14} />Nouvelle ligne budgétaire
          </button>
        </div>
      </div>

      <div className="ge-filters am-filters">
        <label className="ge-search">
          <Search size={14} />
          <input placeholder="Rechercher une ligne budgétaire..." value={search} onChange={(event) => setSearchAndResetPage(event.target.value)} />
        </label>
        <label>Équipe
          <select value={equipeFilter} onChange={(event) => setEquipeFilterAndResetPage(event.target.value === 'toutes' ? 'toutes' : Number(event.target.value))}>
            <option value="toutes">Toutes</option>
            {teams.map((team) => <option key={team.id} value={team.id}>{team.code} — {team.name}</option>)}
          </select>
        </label>
        <label>Niveau
          <select value={niveauFilter} onChange={(event) => setNiveauFilterAndResetPage(event.target.value as typeof niveauFilter)}>
            <option value="tous">Tous</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
          </select>
        </label>
        <label>Statut
          <select value={statutFilter} onChange={(event) => setStatutFilterAndResetPage(event.target.value as typeof statutFilter)}>
            <option value="actif">Actif</option>
            <option value="inactif">Inactif</option>
            <option value="tous">Tous</option>
          </select>
        </label>
        <button type="button" className="ge-reset" onClick={resetFilters}><RotateCcw size={14} />Réinitialiser</button>
      </div>

      {loadError && <p className="ge-form-error">{loadError}</p>}
      {actionError && <p className="ge-form-error">{actionError}</p>}

      <div className="ge-table-panel">
        <div className="ge-table-wrap">
          <table className="ge-table am-table">
            <thead>
              <tr>
                <th>Code</th><th>Ligne budgétaire</th><th>Équipe</th><th>Niveau</th><th>Déclinaison</th><th>Montant prévu</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="ge-detail-empty">Chargement…</td></tr>
              )}
              {!loading && pageRows.map((ligne) => {
                const kids = hasChildren(ligne.id)
                const isExpanded = expandedIds.has(ligne.id)
                return (
                  <tr key={ligne.id} className={!ligne.actif ? 'am-row-inactif' : ''}>
                    <td className="am-code-cell">
                      <span className="am-code-indent" style={{ width: treeMode ? ligne.depth * 20 : 0 }} />
                      {treeMode && kids ? (
                        <button type="button" className="am-tree-toggle" onClick={() => toggleExpand(ligne.id)} aria-label={isExpanded ? 'Réduire' : 'Développer'}>
                          {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                        </button>
                      ) : <span className="am-tree-toggle-spacer" />}
                      <span className={`am-node-icon ${ligne.niveau === 1 ? 'am-icon-1' : ligne.niveau === 2 ? 'am-icon-2' : 'am-icon-3'}`}>
                        {kids ? (isExpanded ? <FolderOpen size={14} /> : <FolderClosed size={14} />) : <span className="am-leaf-dot" />}
                      </span>
                      <span className={`am-code-text ${ligne.niveau === 3 ? 'am-code-leaf' : ''}`}>{ligne.code}</span>
                    </td>
                    <td className={ligne.niveau === 1 ? 'am-nom-1' : ligne.niveau === 2 ? 'am-nom-2' : ''}>{ligne.nom}</td>
                    <td>{ligne.equipe_code}</td>
                    <td><span className="ge-pill am-niveau-pill">{ligne.niveau}</span></td>
                    <td className="am-declinaison">{ligne.declinaison || '—'}</td>
                    <td>{ligne.montant_prevu != null ? `${ligne.montant_prevu.toLocaleString('fr-FR')} FCFA` : '—'}</td>
                    <td>
                      <RowActionsMenu
                        ligne={ligne}
                        canAddChild={ligne.niveau < 3}
                        onEdit={() => setEditingLigne(ligne)}
                        onAddChild={() => setCreateFor({ parent: ligne })}
                        onToggleActif={() => handleToggleActif(ligne)}
                        onDelete={() => handleDelete(ligne)}
                      />
                    </td>
                  </tr>
                )
              })}
              {!loading && pageRows.length === 0 && (
                <tr><td colSpan={7} className="ge-detail-empty">Aucune ligne budgétaire ne correspond à votre recherche.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="ge-table-foot">
          <span>
            {visible.length === 0
              ? 'Aucune ligne budgétaire'
              : `Affichage ${(currentPage - 1) * perPage + 1} à ${Math.min(currentPage * perPage, visible.length)} sur ${visible.length} ligne${visible.length > 1 ? 's' : ''} budgétaire${visible.length > 1 ? 's' : ''}`}
          </span>
          <div className="ge-table-foot-right">
            <label className="ge-page-size">
              <select value={perPage} onChange={(event) => setPerPageAndResetPage(Number(event.target.value))}>
                {PER_PAGE_OPTIONS.map((n) => <option key={n} value={n}>{n} / page</option>)}
              </select>
            </label>
            <nav className="ge-pagination" aria-label="Pagination">
              <button type="button" disabled={currentPage === 1} onClick={() => setPage(1)}><ChevronsLeft size={14} /></button>
              <button type="button" disabled={currentPage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft size={14} /></button>
              <button type="button" className="is-active">{currentPage}</button>
              <button type="button" disabled={currentPage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}><ChevronRight size={14} /></button>
              <button type="button" disabled={currentPage === totalPages} onClick={() => setPage(totalPages)}><ChevronsRight size={14} /></button>
            </nav>
          </div>
        </div>
      </div>

      {createFor && (
        <LigneBudgetaireModal mode="create" teams={teams} parent={createFor.parent} onClose={() => setCreateFor(null)} onSubmit={handleCreate} />
      )}
      {editingLigne && (
        <LigneBudgetaireModal mode="edit" teams={teams} initial={editingLigne} onClose={() => setEditingLigne(null)} onSubmit={handleUpdate} />
      )}
    </section>
  )
}
