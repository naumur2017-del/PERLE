import { useEffect, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowDown, ArrowUp, Ban, CheckCircle2, ChevronDown, ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight,
  FolderClosed, FolderOpen, Layers, MoreVertical, Pencil, Plus, RotateCcw, Search, Trash2, X,
} from 'lucide-react'
import './ArchitectureMonetairePage.css'

type LigneType = 'recette' | 'depense'

interface LigneBudgetaire {
  id: number
  code: string
  nom: string
  equipe: string
  niveau: 1 | 2 | 3
  type: LigneType
  declinaison: string | null
  actif: boolean
  parentId: number | null
}

interface SeedLeaf { nom: string; equipe?: string; declinaison?: string; actif?: boolean }
interface SeedNiveau2 { nom: string; equipe?: string; leaves: SeedLeaf[] }
interface SeedNiveau1 { nom: string; equipe: string; type: LigneType; enfants: SeedNiveau2[] }

const SEED: SeedNiveau1[] = [
  {
    nom: 'RENTREES FINANCIERES', equipe: 'RE', type: 'recette',
    enfants: [
      {
        nom: 'Paiement des programmes et projets', leaves: [
          { nom: 'Paiement des programmes et projets' },
          { nom: 'Autres paiement' },
          { nom: 'Avance sur Paiement des programmes et projets' },
        ],
      },
      {
        nom: 'Décaissement de prêt', leaves: [
          { nom: 'Décaissement prêt DG' },
          { nom: 'Décaissement prêt salariés' },
          { nom: 'Décaissement prêt Banque' },
          { nom: 'Décaissement prêt Prêtataires' },
        ],
      },
      {
        nom: 'Subventions reçues', leaves: [
          { nom: 'Subvention bailleur principal' },
          { nom: 'Subvention partenaire local' },
          { nom: 'Don ponctuel' },
        ],
      },
      {
        nom: 'Produits financiers', leaves: [
          { nom: 'Intérêts bancaires' },
          { nom: 'Plus-value de change' },
        ],
      },
    ],
  },
  {
    nom: 'DEPENSES DG', equipe: 'DG', type: 'depense',
    enfants: [
      { nom: 'Parentaux', leaves: [{ nom: 'Parentaux', declinaison: 'Parentaux BMN national' }] },
      {
        nom: 'Relations publiques', equipe: 'DIR', leaves: [
          { nom: 'Restaurants' },
          { nom: 'Cadeaux' },
          { nom: 'Relations publiques - autres' },
        ],
      },
      {
        nom: 'Déplacements DG', leaves: [
          { nom: "Billets d'avion" },
          { nom: 'Hôtel' },
          { nom: 'Per diem' },
        ],
      },
      {
        nom: 'Frais de représentation', leaves: [
          { nom: 'Réceptions officielles' },
          { nom: 'Dons institutionnels', actif: false },
        ],
      },
    ],
  },
  {
    nom: 'DEPENSES RESSOURCES HUMAINES', equipe: 'RH', type: 'depense',
    enfants: [
      {
        nom: 'Salaires et charges', leaves: [
          { nom: 'Salaires bruts' },
          { nom: 'Charges sociales' },
          { nom: 'Primes' },
        ],
      },
      {
        nom: 'Recrutement', leaves: [
          { nom: 'Annonces de recrutement' },
          { nom: 'Tests et évaluations' },
        ],
      },
      {
        nom: 'Formation', leaves: [
          { nom: 'Formation interne' },
          { nom: 'Formation externe' },
          { nom: 'Certifications' },
        ],
      },
    ],
  },
  {
    nom: 'DEPENSES OPERATIONS', equipe: 'OPS', type: 'depense',
    enfants: [
      {
        nom: 'Logistique terrain', leaves: [
          { nom: 'Carburant' },
          { nom: 'Location véhicules' },
          { nom: 'Entretien véhicules' },
        ],
      },
      {
        nom: 'Achats matériel', leaves: [
          { nom: 'Équipements EHS' },
          { nom: 'Consommables de bureau' },
          { nom: 'Petit matériel' },
        ],
      },
      {
        nom: 'Missions terrain', leaves: [
          { nom: 'Transport mission' },
          { nom: 'Hébergement mission' },
          { nom: 'Per diem mission' },
        ],
      },
    ],
  },
  {
    nom: 'DEPENSES COMMUNICATION', equipe: 'COM', type: 'depense',
    enfants: [
      {
        nom: 'Supports de communication', leaves: [
          { nom: 'Impression brochures' },
          { nom: 'Supports numériques' },
        ],
      },
      {
        nom: 'Événementiel', leaves: [
          { nom: 'Location salle' },
          { nom: 'Traiteur' },
          { nom: 'Location matériel audiovisuel' },
        ],
      },
    ],
  },
  {
    nom: 'DEPENSES INFORMATIQUE', equipe: 'IT', type: 'depense',
    enfants: [
      {
        nom: 'Licences et abonnements', leaves: [
          { nom: 'Licences logicielles' },
          { nom: 'Hébergement cloud' },
          { nom: 'Abonnements SaaS' },
        ],
      },
      {
        nom: 'Matériel informatique', leaves: [
          { nom: 'Ordinateurs' },
          { nom: 'Imprimantes' },
          { nom: 'Accessoires informatiques' },
        ],
      },
    ],
  },
  {
    nom: 'DEPENSES FINANCE', equipe: 'FIN', type: 'depense',
    enfants: [
      {
        nom: 'Frais bancaires', leaves: [
          { nom: 'Frais de tenue de compte' },
          { nom: 'Frais de virement' },
        ],
      },
      {
        nom: 'Audit et conformité', leaves: [
          { nom: 'Audit externe' },
          { nom: 'Conseil fiscal' },
        ],
      },
    ],
  },
  {
    nom: 'DEPENSES TRESORERIE', equipe: 'FIN', type: 'depense',
    enfants: [
      {
        nom: "Remboursement d'emprunt", leaves: [
          { nom: 'Remboursement capital' },
          { nom: 'Remboursement intérêts' },
        ],
      },
      {
        nom: 'Avances internes', leaves: [
          { nom: 'Avance sur salaire' },
          { nom: 'Avance sur frais de mission' },
        ],
      },
    ],
  },
]

function buildLignes(seed: SeedNiveau1[]): LigneBudgetaire[] {
  const out: LigneBudgetaire[] = []
  let id = 1
  seed.forEach((n1, i1) => {
    const code1 = String.fromCharCode(65 + i1)
    const id1 = id++
    out.push({ id: id1, code: code1, nom: n1.nom, equipe: n1.equipe, niveau: 1, type: n1.type, declinaison: null, actif: true, parentId: null })
    n1.enfants.forEach((n2, i2) => {
      const code2 = code1 + String.fromCharCode(65 + i2)
      const id2 = id++
      const equipe2 = n2.equipe ?? n1.equipe
      out.push({ id: id2, code: code2, nom: n2.nom, equipe: equipe2, niveau: 2, type: n1.type, declinaison: null, actif: true, parentId: id1 })
      n2.leaves.forEach((leaf, i3) => {
        const code3 = code2 + String(i3 + 1).padStart(2, '0')
        out.push({
          id: id++, code: code3, nom: leaf.nom, equipe: leaf.equipe ?? equipe2, niveau: 3, type: n1.type,
          declinaison: leaf.declinaison ?? null, actif: leaf.actif ?? true, parentId: id2,
        })
      })
    })
  })
  return out
}

const INITIAL_LIGNES = buildLignes(SEED)

const TYPE_LABELS: Record<LigneType, string> = { recette: 'Recette', depense: 'Dépense' }

interface VisibleRow extends LigneBudgetaire {
  depth: number
}

function nextCode(lignes: LigneBudgetaire[], parent: LigneBudgetaire | null): string {
  if (!parent) {
    const count = lignes.filter((l) => l.niveau === 1).length
    return String.fromCharCode(65 + count)
  }
  const siblings = lignes.filter((l) => l.parentId === parent.id)
  if (parent.niveau === 1) return parent.code + String.fromCharCode(65 + siblings.length)
  return parent.code + String(siblings.length + 1).padStart(2, '0')
}

interface LigneFormValues {
  nom: string
  equipe: string
  declinaison: string
  type: LigneType
}

function LigneBudgetaireModal({ mode, parent, initial, onClose, onSubmit }: {
  mode: 'create' | 'edit'
  parent?: LigneBudgetaire | null
  initial?: LigneBudgetaire
  onClose: () => void
  onSubmit: (values: LigneFormValues) => void
}) {
  const [nom, setNom] = useState(initial?.nom ?? '')
  const [equipe, setEquipe] = useState(initial?.equipe ?? parent?.equipe ?? '')
  const [declinaison, setDeclinaison] = useState(initial?.declinaison ?? '')
  const [type, setType] = useState<LigneType>(initial?.type ?? parent?.type ?? 'depense')

  const niveau = initial?.niveau ?? (parent ? parent.niveau + 1 : 1)
  const typeIsEditable = mode === 'create' && !parent

  const canSave = nom.trim() !== '' && equipe.trim() !== ''

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!canSave) return
    onSubmit({ nom: nom.trim(), equipe: equipe.trim().toUpperCase(), declinaison: declinaison.trim(), type })
  }

  return (
    <div className="ge-modal-overlay" role="dialog" aria-modal="true" aria-label={mode === 'edit' ? 'Modifier la ligne budgétaire' : 'Nouvelle ligne budgétaire'} onMouseDown={onClose}>
      <div className="ge-modal param-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="ge-modal-head">
          <div>
            <h3>{mode === 'edit' ? 'Modifier la ligne budgétaire' : 'Nouvelle ligne budgétaire'}</h3>
            <p className="ge-modal-subtitle">
              {parent ? <>Sous-ligne de <strong>{parent.code} — {parent.nom}</strong> (niveau {niveau})</> : `Ligne de niveau ${niveau}`}
            </p>
          </div>
          <button type="button" className="ge-modal-close" onClick={onClose} aria-label="Fermer"><X size={16} /></button>
        </div>

        <form className="param-form" onSubmit={handleSubmit}>
          <label className="param-field">Nom de la ligne budgétaire *
            <input required value={nom} placeholder="Ex. Carburant" onChange={(event) => setNom(event.target.value)} />
          </label>

          <div className="param-form-row">
            <label className="param-field">Équipe *
              <input required value={equipe} placeholder="Ex. RE, DG, IT..." onChange={(event) => setEquipe(event.target.value)} />
            </label>
            <label className="param-field">Type
              {typeIsEditable ? (
                <select value={type} onChange={(event) => setType(event.target.value as LigneType)}>
                  <option value="recette">Recette</option>
                  <option value="depense">Dépense</option>
                </select>
              ) : (
                <input value={TYPE_LABELS[type]} disabled />
              )}
            </label>
          </div>

          <label className="param-field">Déclinaison (facultatif)
            <input value={declinaison} placeholder="Ex. Parentaux BMN national" onChange={(event) => setDeclinaison(event.target.value)} />
          </label>

          <div className="ge-modal-actions">
            <button type="button" className="ge-btn-outline" onClick={onClose}>Annuler</button>
            <button type="submit" className="ge-btn-primary" disabled={!canSave}>Enregistrer</button>
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
  const [lignes, setLignes] = useState<LigneBudgetaire[]>(INITIAL_LIGNES)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'tous' | LigneType>('tous')
  const [equipeFilter, setEquipeFilter] = useState('toutes')
  const [niveauFilter, setNiveauFilter] = useState<'tous' | '1' | '2' | '3'>('tous')
  const [statutFilter, setStatutFilter] = useState<'tous' | 'actif' | 'inactif'>('actif')
  const [expandedIds, setExpandedIds] = useState<Set<number>>(
    () => new Set(INITIAL_LIGNES.filter((l) => l.niveau === 1).map((l) => l.id)),
  )
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [createFor, setCreateFor] = useState<{ parent: LigneBudgetaire | null } | null>(null)
  const [editingLigne, setEditingLigne] = useState<LigneBudgetaire | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const equipes = Array.from(new Set(lignes.map((l) => l.equipe))).sort()

  const treeMode = search.trim() === '' && typeFilter === 'tous' && equipeFilter === 'toutes' && niveauFilter === 'tous'

  const matchesStatut = (l: LigneBudgetaire) => statutFilter === 'tous' || (statutFilter === 'actif') === l.actif
  const hasChildren = (id: number) => lignes.some((l) => l.parentId === id)

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
      const kids = lignes.filter((l) => l.parentId === parentId && matchesStatut(l)).sort((a, b) => a.code.localeCompare(b.code))
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
        && (typeFilter === 'tous' || l.type === typeFilter)
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
  const setTypeFilterAndResetPage = (value: typeof typeFilter) => { setTypeFilter(value); setPage(1) }
  const setEquipeFilterAndResetPage = (value: string) => { setEquipeFilter(value); setPage(1) }
  const setNiveauFilterAndResetPage = (value: typeof niveauFilter) => { setNiveauFilter(value); setPage(1) }
  const setStatutFilterAndResetPage = (value: typeof statutFilter) => { setStatutFilter(value); setPage(1) }
  const setPerPageAndResetPage = (value: number) => { setPerPage(value); setPage(1) }

  const resetFilters = () => {
    setSearch(''); setTypeFilter('tous'); setEquipeFilter('toutes'); setNiveauFilter('tous'); setStatutFilter('tous'); setPage(1)
  }

  const handleCreate = (values: LigneFormValues) => {
    const parent = createFor?.parent ?? null
    const niveau = (parent ? parent.niveau + 1 : 1) as 1 | 2 | 3
    const type = parent ? parent.type : values.type
    const newLigne: LigneBudgetaire = {
      id: Math.max(0, ...lignes.map((l) => l.id)) + 1,
      code: nextCode(lignes, parent),
      nom: values.nom,
      equipe: values.equipe,
      niveau,
      type,
      declinaison: values.declinaison || null,
      actif: true,
      parentId: parent?.id ?? null,
    }
    setLignes((prev) => [...prev, newLigne])
    if (parent) setExpandedIds((prev) => new Set(prev).add(parent.id))
    setCreateFor(null)
  }

  const handleUpdate = (values: LigneFormValues) => {
    if (!editingLigne) return
    setLignes((prev) => prev.map((l) => l.id === editingLigne.id
      ? { ...l, nom: values.nom, equipe: values.equipe, declinaison: values.declinaison || null }
      : l))
    setEditingLigne(null)
  }

  const handleToggleActif = (ligne: LigneBudgetaire) => {
    setLignes((prev) => prev.map((l) => l.id === ligne.id ? { ...l, actif: !l.actif } : l))
  }

  const handleDelete = (ligne: LigneBudgetaire) => {
    setActionError(null)
    if (hasChildren(ligne.id)) {
      setActionError(`Impossible de supprimer « ${ligne.nom} » : cette ligne a des sous-lignes. Supprimez-les d’abord.`)
      return
    }
    if (!window.confirm(`Supprimer la ligne budgétaire « ${ligne.nom} » ?`)) return
    setLignes((prev) => prev.filter((l) => l.id !== ligne.id))
  }

  return (
    <section className="ge-page am-page">
      <div className="ge-header-row">
        <div />
        <div className="ge-header-actions">
          <button type="button" className="ge-btn-primary" onClick={() => setCreateFor({ parent: null })}>
            <Plus size={14} />Nouvelle ligne budgétaire
          </button>
        </div>
      </div>

      <div className="ge-filters am-filters">
        <label className="ge-search">
          <Search size={14} />
          <input placeholder="Rechercher une ligne budgétaire..." value={search} onChange={(event) => setSearchAndResetPage(event.target.value)} />
        </label>
        <label>Type
          <select value={typeFilter} onChange={(event) => setTypeFilterAndResetPage(event.target.value as typeof typeFilter)}>
            <option value="tous">Tous</option>
            <option value="recette">Recette</option>
            <option value="depense">Dépense</option>
          </select>
        </label>
        <label>Équipe
          <select value={equipeFilter} onChange={(event) => setEquipeFilterAndResetPage(event.target.value)}>
            <option value="toutes">Toutes</option>
            {equipes.map((e) => <option key={e} value={e}>{e}</option>)}
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

      {actionError && <p className="ge-form-error">{actionError}</p>}

      <div className="ge-table-panel">
        <div className="ge-table-wrap">
          <table className="ge-table am-table">
            <thead>
              <tr>
                <th>Code</th><th>Ligne budgétaire</th><th>Équipe</th><th>Niveau</th><th>Type</th><th>Déclinaison</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((ligne) => {
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
                    <td>{ligne.equipe}</td>
                    <td><span className="ge-pill am-niveau-pill">{ligne.niveau}</span></td>
                    <td>
                      <span className={`am-type ${ligne.type === 'recette' ? 'am-type-recette' : 'am-type-depense'}`}>
                        {ligne.type === 'recette' ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
                        {TYPE_LABELS[ligne.type]}
                      </span>
                    </td>
                    <td className="am-declinaison">{ligne.declinaison ?? '—'}</td>
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
              {pageRows.length === 0 && (
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
        <LigneBudgetaireModal mode="create" parent={createFor.parent} onClose={() => setCreateFor(null)} onSubmit={handleCreate} />
      )}
      {editingLigne && (
        <LigneBudgetaireModal mode="edit" initial={editingLigne} onClose={() => setEditingLigne(null)} onSubmit={handleUpdate} />
      )}
    </section>
  )
}
