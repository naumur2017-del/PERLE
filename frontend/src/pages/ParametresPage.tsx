import { useEffect, useState, type FormEvent } from 'react'
import { Calendar, Pencil, Plus, Trash2, X } from 'lucide-react'
import {
  createCongeType, deleteCongeType, fetchCongeTypes, updateCongeType,
  type CongeModePeriode, type CongeType, type CongeUnite,
} from '../api/demandes'
import { ApiError } from '../api/client'
import './ParametresPage.css'

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

const UNITE_LABELS: Record<CongeUnite, string> = { mois: 'jour(s) / mois', annee: 'jour(s) / an' }
const MODE_LABELS: Record<CongeModePeriode, string> = {
  employe: 'Le salarié choisit la période',
  entreprise: "L'entreprise définit la période",
}

interface CongeTypeFormValues {
  nom: string
  jours_alloues: number
  unite: CongeUnite
  mode_periode: CongeModePeriode
}

function CongeTypeModal({ initial, onClose, onSubmit }: {
  initial?: CongeType
  onClose: () => void
  onSubmit: (values: CongeTypeFormValues) => Promise<void>
}) {
  const [nom, setNom] = useState(initial?.nom ?? '')
  const [joursAlloues, setJoursAlloues] = useState(String(initial?.jours_alloues ?? '2'))
  const [unite, setUnite] = useState<CongeUnite>(initial?.unite ?? 'mois')
  const [modePeriode, setModePeriode] = useState<CongeModePeriode>(initial?.mode_periode ?? 'employe')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSave = nom.trim() !== '' && Number(joursAlloues) >= 0 && !saving

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      await onSubmit({ nom: nom.trim(), jours_alloues: Number(joursAlloues), unite, mode_periode: modePeriode })
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <div className="ge-modal-overlay" role="dialog" aria-modal="true" aria-label={initial ? 'Modifier le type de congé' : 'Ajouter un type de congé'} onMouseDown={() => { if (!saving) onClose() }}>
      <div className="ge-modal param-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="ge-modal-head">
          <div>
            <h3>{initial ? 'Modifier le type de congé' : 'Ajouter un type de congé'}</h3>
            <p className="ge-modal-subtitle">Définissez le nom, le quota de jours ouvrables et qui choisit la période.</p>
          </div>
          <button type="button" className="ge-modal-close" onClick={onClose} aria-label="Fermer" disabled={saving}><X size={16} /></button>
        </div>

        <form className="param-form" onSubmit={handleSubmit}>
          {error && <p className="ge-form-error">{error}</p>}

          <label className="param-field">Nom du type de congé *
            <input required value={nom} placeholder="Ex. Congé annuel payé" onChange={(event) => setNom(event.target.value)} />
          </label>

          <div className="param-form-row">
            <label className="param-field">Jours ouvrables alloués *
              <input required type="number" min={0} value={joursAlloues} onChange={(event) => setJoursAlloues(event.target.value)} />
            </label>
            <label className="param-field">Unité
              <select value={unite} onChange={(event) => setUnite(event.target.value as CongeUnite)}>
                <option value="mois">Par mois</option>
                <option value="annee">Par année</option>
              </select>
            </label>
          </div>

          <label className="param-field">Qui choisit la période ?
            <select value={modePeriode} onChange={(event) => setModePeriode(event.target.value as CongeModePeriode)}>
              <option value="employe">Le salarié choisit la période</option>
              <option value="entreprise">L'entreprise définit la période</option>
            </select>
          </label>
          {modePeriode === 'entreprise' && (
            <p className="param-hint">
              Le salarié ne saisira pas de dates : l'admin/directeur les précisera au moment d'approuver la demande.
            </p>
          )}
          <p className="param-hint">
            Ce type accepte les demi-journées (ex. 2,5 jours) dans le formulaire de demande du salarié.
          </p>

          <div className="ge-modal-actions">
            <button type="button" className="ge-btn-outline" onClick={onClose} disabled={saving}>Annuler</button>
            <button type="submit" className="ge-btn-primary" disabled={!canSave}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CongesTab() {
  const [types, setTypes] = useState<CongeType[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editingType, setEditingType] = useState<CongeType | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const loadTypes = () => fetchCongeTypes().then(setTypes)

  useEffect(() => {
    let cancelled = false
    loadTypes()
      .catch(() => { if (!cancelled) setLoadError('Impossible de charger les types de congé.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const handleCreate = async (values: CongeTypeFormValues) => {
    const created = await createCongeType(values)
    setTypes((prev) => [...prev, created].sort((a, b) => a.nom.localeCompare(b.nom)))
    setShowCreate(false)
  }

  const handleUpdate = async (id: number, values: CongeTypeFormValues) => {
    const updated = await updateCongeType(id, values)
    setTypes((prev) => prev.map((item) => item.id === id ? updated : item).sort((a, b) => a.nom.localeCompare(b.nom)))
    setEditingType(null)
  }

  const handleToggleActif = async (type: CongeType) => {
    const updated = await updateCongeType(type.id, { actif: !type.actif })
    setTypes((prev) => prev.map((item) => item.id === type.id ? updated : item))
  }

  const handleDelete = async (type: CongeType) => {
    if (!window.confirm(`Supprimer le type de congé « ${type.nom} » ?`)) return
    setDeleteError(null)
    try {
      await deleteCongeType(type.id)
      setTypes((prev) => prev.filter((item) => item.id !== type.id))
    } catch (err) {
      setDeleteError(errorMessage(err))
    }
  }

  return (
    <div className="param-tab">
      <div className="param-tab-heading">
        <div>
          <h2>Types de congé</h2>
          <p>Définissez les types de congé disponibles pour vos employés, leur quota de jours ouvrables et qui en choisit la période. « Congé maladie » et « Congé Technique » sont fournis par défaut et ne peuvent pas être supprimés.</p>
        </div>
        <button type="button" className="ge-btn-primary" onClick={() => setShowCreate(true)}><Plus size={14} />Ajouter un type</button>
      </div>

      {loading && <p className="ge-detail-empty">Chargement…</p>}
      {loadError && <p className="ge-detail-empty">{loadError}</p>}
      {deleteError && <p className="ge-form-error">{deleteError}</p>}

      {!loading && !loadError && (
        <div className="ge-table-panel">
          <div className="ge-table-wrap">
            <table className="ge-table">
              <thead>
                <tr><th>Nom</th><th>Quota</th><th>Période</th><th>Statut</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {types.map((type) => {
                  if (type.categorie !== 'standard') {
                    return (
                      <tr key={type.id}>
                        <td>
                          <strong>{type.nom}</strong>
                          {type.description && <p className="param-type-desc">{type.description}</p>}
                        </td>
                        <td>—</td>
                        <td>—</td>
                        <td>—</td>
                        <td>—</td>
                      </tr>
                    )
                  }
                  return (
                    <tr key={type.id}>
                      <td>
                        <strong>{type.nom}</strong>
                        {type.description && <p className="param-type-desc">{type.description}</p>}
                      </td>
                      <td>{type.jours_alloues} {UNITE_LABELS[type.unite as CongeUnite]}</td>
                      <td>{MODE_LABELS[type.mode_periode as CongeModePeriode]}</td>
                      <td><span className={`ge-pill ${type.actif ? 'ge-pill-actif' : 'ge-pill-inactif'}`}>{type.actif ? 'Actif' : 'Inactif'}</span></td>
                      <td className="de-actions">
                        <button type="button" className="ge-row-action" aria-label="Modifier" title="Modifier" onClick={() => setEditingType(type)}><Pencil size={13} /></button>
                        <button type="button" className="ge-btn-outline param-toggle-btn" onClick={() => handleToggleActif(type)}>
                          {type.actif ? 'Désactiver' : 'Activer'}
                        </button>
                        <button type="button" className="ge-row-action ge-row-action-danger" aria-label="Supprimer" title="Supprimer" onClick={() => handleDelete(type)}><Trash2 size={13} /></button>
                      </td>
                    </tr>
                  )
                })}
                {types.length === 0 && (
                  <tr><td colSpan={5} className="ge-detail-empty">Aucun type de congé défini pour le moment.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreate && <CongeTypeModal onClose={() => setShowCreate(false)} onSubmit={handleCreate} />}
      {editingType && (
        <CongeTypeModal
          initial={editingType}
          onClose={() => setEditingType(null)}
          onSubmit={(values) => handleUpdate(editingType.id, values)}
        />
      )}
    </div>
  )
}

const tabs = [
  { id: 'conges', label: 'Congés', icon: Calendar },
] as const

type TabId = (typeof tabs)[number]['id']

export default function ParametresPage() {
  const [activeTab, setActiveTab] = useState<TabId>('conges')

  return (
    <section className="ge-page">
      <nav className="ge-subtabs">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button key={tab.id} className={activeTab === tab.id ? 'active' : ''} onClick={() => setActiveTab(tab.id)}>
              <Icon size={14} />{tab.label}
            </button>
          )
        })}
      </nav>

      {activeTab === 'conges' && <CongesTab />}
    </section>
  )
}
