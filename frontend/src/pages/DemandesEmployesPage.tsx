import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Building2, Calendar, Check, Plus, Search, Trash2, Wallet, X } from 'lucide-react'
import {
  createFermetureTechnique, deleteFermetureTechnique, fetchFermeturesTechniques,
  fetchOrganisationAvanceDemandes, fetchOrganisationCongeDemandes, reviewAvanceDemande, reviewCongeDemande,
  type AvanceDemande, type CongeDemande, type DemandeStatut, type FermetureTechnique,
} from '../api/demandes'
import { fetchEmployees, fetchTeams, type Employee, type Team } from '../api/employees'
import { ApiError } from '../api/client'
import { formatMontant } from '../utils/currency'
import './DemandesEmployesPage.css'

type Tab = 'conges' | 'avances' | 'technique'
type Section = 'nouvelle' | 'historique'

const STATUT_LABELS: Record<DemandeStatut, string> = { attente: 'En attente', approuvee: 'Approuvée', refusee: 'Refusée' }
const STATUT_CLASS: Record<DemandeStatut, string> = { attente: 'ge-pill-conge', approuvee: 'ge-pill-actif', refusee: 'ge-pill-inactif' }

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

const formatDate = (value: string | null) => value ? new Date(value).toLocaleDateString('fr-FR') : 'À définir'

const formatDuree = (value: number) => Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.', ',')

const traitePar = (demande: { statut: DemandeStatut; reviewed_by_nom: string | null }) => {
  if (demande.reviewed_by_nom) return demande.reviewed_by_nom
  if (demande.statut === 'attente') return '—'
  return 'Approbation automatique (délai de 3 jours dépassé)'
}

function DemandeSection({ count, emptyLabel, children }: { count: number; emptyLabel: string; children: ReactNode }) {
  return (
    <div className="ge-table-panel de-section">
      {count === 0 ? (
        <p className="ge-detail-empty">{emptyLabel}</p>
      ) : (
        <div className="ge-table-wrap de-table-scroll">
          <table className="ge-table">
            {children}
          </table>
        </div>
      )}
    </div>
  )
}

function CongeApprovalDatesModal({ demande, onClose, onSubmit }: {
  demande: CongeDemande
  onClose: () => void
  onSubmit: (dateDebut: string, dateFin: string) => Promise<void>
}) {
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!dateDebut || !dateFin) return
    setSaving(true)
    setError(null)
    try {
      await onSubmit(dateDebut, dateFin)
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <div className="ge-modal-overlay" role="dialog" aria-modal="true" aria-label="Fixer la période du congé" onMouseDown={() => { if (!saving) onClose() }}>
      <div className="ge-modal param-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="ge-modal-head">
          <div>
            <h3>Fixer la période du congé</h3>
            <p className="ge-modal-subtitle">
              {demande.employee_nom} — {demande.type_conge_detail.nom} est défini par l'entreprise : indiquez les dates avant d'approuver.
            </p>
          </div>
          <button type="button" className="ge-modal-close" onClick={onClose} aria-label="Fermer" disabled={saving}><X size={16} /></button>
        </div>
        <form className="param-form" onSubmit={handleSubmit}>
          {error && <p className="ge-form-error">{error}</p>}
          <div className="param-form-row">
            <label className="param-field">Date de début<input type="date" required value={dateDebut} onChange={(event) => setDateDebut(event.target.value)} /></label>
            <label className="param-field">Date de fin<input type="date" required value={dateFin} min={dateDebut || undefined} onChange={(event) => setDateFin(event.target.value)} /></label>
          </div>
          <div className="ge-modal-actions">
            <button type="button" className="ge-btn-outline" onClick={onClose} disabled={saving}>Annuler</button>
            <button type="submit" className="ge-btn-primary" disabled={saving || !dateDebut || !dateFin}>{saving ? 'Approbation…' : 'Approuver le congé'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CongeRow({ demande, busy, onApprove, onRefuse }: {
  demande: CongeDemande
  busy: boolean
  onApprove: (demande: CongeDemande) => void
  onRefuse: (id: number) => void
}) {
  return (
    <tr>
      <td><strong>{demande.employee_nom}</strong><br /><small>{demande.employee_fonction || 'Sans fonction'}</small></td>
      <td>{demande.type_conge_detail.nom}</td>
      <td>{formatDate(demande.date_debut)}</td>
      <td>{demande.date_fin ? formatDate(demande.date_fin) : (demande.type_conge_detail.categorie === 'maladie' ? (demande.cloture ? '—' : 'En cours') : 'À définir')}</td>
      <td>{formatDuree(demande.duree)} j</td>
      <td className="de-motif">{demande.motif || 'Aucun motif renseigné'}</td>
      <td><span className={`ge-pill ${STATUT_CLASS[demande.statut]}`}>{STATUT_LABELS[demande.statut]}</span></td>
      <td>{traitePar(demande)}</td>
      <td className="de-actions">
        {demande.statut === 'attente' ? (
          <>
            <button type="button" aria-label="Approuver" className="de-approve" disabled={busy} onClick={() => onApprove(demande)}><Check size={14} /></button>
            <button type="button" aria-label="Refuser" className="de-refuse" disabled={busy} onClick={() => onRefuse(demande.id)}><X size={14} /></button>
          </>
        ) : '—'}
      </td>
    </tr>
  )
}

function AvanceRow({ demande, busy, onReview }: { demande: AvanceDemande; busy: boolean; onReview: (id: number, statut: 'approuvee' | 'refusee') => void }) {
  return (
    <tr>
      <td><strong>{demande.employee_nom}</strong><br /><small>{demande.employee_fonction || 'Sans fonction'}</small></td>
      <td><strong>{formatMontant(demande.montant)}</strong></td>
      <td className="de-motif">{demande.motif || 'Aucun motif renseigné'}</td>
      <td>
        {demande.nombre_mois} salaire{demande.nombre_mois > 1 ? 's' : ''}
        <br /><small>({formatMontant(Math.round(demande.montant / demande.nombre_mois))}/mois)</small>
      </td>
      <td><span className={`ge-pill ${STATUT_CLASS[demande.statut]}`}>{STATUT_LABELS[demande.statut]}</span></td>
      <td>{traitePar(demande)}</td>
      <td className="de-actions">
        {demande.statut === 'attente' ? (
          <>
            <button type="button" aria-label="Approuver" className="de-approve" disabled={busy} onClick={() => onReview(demande.id, 'approuvee')}><Check size={14} /></button>
            <button type="button" aria-label="Refuser" className="de-refuse" disabled={busy} onClick={() => onReview(demande.id, 'refusee')}><X size={14} /></button>
          </>
        ) : '—'}
      </td>
    </tr>
  )
}

function FermetureTechniqueForm({ teams, employees, onCancel, onCreate }: {
  teams: Team[]
  employees: Employee[]
  onCancel: () => void
  onCreate: (values: { date_debut: string; date_fin: string; description: string; equipes_exceptees: number[]; employes_exceptes: number[] }) => Promise<void>
}) {
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [description, setDescription] = useState('')
  const [equipes, setEquipes] = useState<number[]>([])
  const [employesExceptes, setEmployesExceptes] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggle = (list: number[], setList: (v: number[]) => void, id: number) => {
    setList(list.includes(id) ? list.filter((item) => item !== id) : [...list, id])
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!dateDebut || !dateFin) return
    setSaving(true)
    setError(null)
    try {
      await onCreate({ date_debut: dateDebut, date_fin: dateFin, description: description.trim(), equipes_exceptees: equipes, employes_exceptes: employesExceptes })
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <form className="param-form de-technique-form" onSubmit={handleSubmit}>
      {error && <p className="ge-form-error">{error}</p>}
      <div className="param-form-row">
        <label className="param-field">Date de début *<input type="date" required value={dateDebut} onChange={(event) => setDateDebut(event.target.value)} /></label>
        <label className="param-field">Date de fin *<input type="date" required value={dateFin} min={dateDebut || undefined} onChange={(event) => setDateFin(event.target.value)} /></label>
      </div>
      <label className="param-field">Description (facultatif)
        <input value={description} placeholder="Ex. Fermeture annuelle de fin d'année" onChange={(event) => setDescription(event.target.value)} />
      </label>

      <div className="de-technique-exceptions">
        <div>
          <strong>Équipes exceptées</strong>
          <p className="param-hint de-technique-hint">Ces équipes ne seront pas concernées par cette fermeture.</p>
          <div className="de-technique-checklist">
            {teams.map((team) => (
              <label key={team.id}>
                <input type="checkbox" checked={equipes.includes(team.id)} onChange={() => toggle(equipes, setEquipes, team.id)} />
                {team.name}
              </label>
            ))}
            {teams.length === 0 && <p className="ge-detail-empty">Aucune équipe.</p>}
          </div>
        </div>
        <div>
          <strong>Salariés exceptés</strong>
          <p className="param-hint de-technique-hint">Ces salariés ne seront pas concernés, même si leur équipe l'est.</p>
          <div className="de-technique-checklist">
            {employees.map((employee) => (
              <label key={employee.id}>
                <input type="checkbox" checked={employesExceptes.includes(employee.id)} onChange={() => toggle(employesExceptes, setEmployesExceptes, employee.id)} />
                {employee.first_name} {employee.last_name}
              </label>
            ))}
            {employees.length === 0 && <p className="ge-detail-empty">Aucun salarié.</p>}
          </div>
        </div>
      </div>

      <div className="ge-modal-actions">
        <button type="button" className="ge-btn-outline" onClick={onCancel} disabled={saving}>Annuler</button>
        <button type="submit" className="ge-btn-primary" disabled={saving || !dateDebut || !dateFin}>{saving ? 'Application…' : 'Appliquer la fermeture'}</button>
      </div>
    </form>
  )
}

function FermetureTechniqueTab() {
  const [fermetures, setFermetures] = useState<FermetureTechnique[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchFermeturesTechniques(), fetchTeams(), fetchEmployees()])
      .then(([f, t, e]) => { if (!cancelled) { setFermetures(f); setTeams(t); setEmployees(e) } })
      .catch(() => { if (!cancelled) setLoadError('Impossible de charger les fermetures techniques.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const handleCreate = async (values: { date_debut: string; date_fin: string; description: string; equipes_exceptees: number[]; employes_exceptes: number[] }) => {
    const created = await createFermetureTechnique(values)
    setFermetures((prev) => [created, ...prev])
    setShowForm(false)
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Supprimer cette période de fermeture technique ?')) return
    setDeletingId(id)
    try {
      await deleteFermetureTechnique(id)
      setFermetures((prev) => prev.filter((item) => item.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  const nameFor = (id: number, list: { id: number; name?: string; first_name?: string; last_name?: string }[]) => {
    const item = list.find((entry) => entry.id === id)
    if (!item) return null
    return item.name ?? `${item.first_name} ${item.last_name}`
  }

  return (
    <div className="param-tab">
      <div className="param-tab-heading">
        <div>
          <h2>Congé Technique</h2>
          <p>Définissez une période de fermeture collective de l'entreprise, avec des exceptions par équipe ou par salarié. Aucune demande individuelle n'est créée, mais les salariés couverts (hors exceptions) passent automatiquement au statut « Congé » pendant la période, puis reviennent à « Actif » à la fin.</p>
        </div>
        {!showForm && <button type="button" className="ge-btn-primary" onClick={() => setShowForm(true)}><Plus size={14} />Nouvelle fermeture</button>}
      </div>

      {loading && <p className="ge-detail-empty">Chargement…</p>}
      {loadError && <p className="ge-detail-empty">{loadError}</p>}

      {showForm && (
        <FermetureTechniqueForm teams={teams} employees={employees} onCancel={() => setShowForm(false)} onCreate={handleCreate} />
      )}

      {!loading && !loadError && !showForm && (
        <div className="ge-table-panel">
          <div className="ge-table-wrap">
            <table className="ge-table">
              <thead><tr><th>Du</th><th>Au</th><th>Description</th><th>Équipes exceptées</th><th>Salariés exceptés</th><th>Action</th></tr></thead>
              <tbody>
                {fermetures.map((f) => (
                  <tr key={f.id}>
                    <td>{formatDate(f.date_debut)}</td>
                    <td>{formatDate(f.date_fin)}</td>
                    <td className="de-motif">{f.description || '—'}</td>
                    <td>{f.equipes_exceptees.length === 0 ? '—' : f.equipes_exceptees.map((id) => nameFor(id, teams)).filter(Boolean).join(', ')}</td>
                    <td>{f.employes_exceptes.length === 0 ? '—' : f.employes_exceptes.map((id) => nameFor(id, employees)).filter(Boolean).join(', ')}</td>
                    <td className="de-actions">
                      <button type="button" aria-label="Supprimer" className="de-refuse" disabled={deletingId === f.id} onClick={() => handleDelete(f.id)}><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
                {fermetures.length === 0 && (
                  <tr><td colSpan={6} className="ge-detail-empty">Aucune fermeture technique configurée pour le moment.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DemandesEmployesPage({ navigateTo }: { navigateTo: (page: string) => void }) {
  const [tab, setTab] = useState<Tab>('conges')
  const [section, setSection] = useState<Section>('nouvelle')
  const [conges, setConges] = useState<CongeDemande[]>([])
  const [avances, setAvances] = useState<AvanceDemande[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [approvalDatesFor, setApprovalDatesFor] = useState<CongeDemande | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchOrganisationCongeDemandes(), fetchOrganisationAvanceDemandes()])
      .then(([congesData, avancesData]) => {
        if (cancelled) return
        setConges(congesData)
        setAvances(avancesData)
      })
      .catch(() => { if (!cancelled) setLoadError('Impossible de charger les demandes.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const handleReviewConge = async (id: number, statut: 'approuvee' | 'refusee', dates?: { date_debut: string; date_fin: string }) => {
    setBusyId(id)
    setActionError(null)
    try {
      const updated = await reviewCongeDemande(id, statut, dates)
      setConges((prev) => prev.map((item) => item.id === id ? updated : item))
    } catch (err) {
      setActionError(errorMessage(err))
      throw err
    } finally {
      setBusyId(null)
    }
  }

  const handleApproveConge = (demande: CongeDemande) => {
    if (demande.type_conge_detail.mode_periode === 'entreprise' && !demande.date_debut) {
      setApprovalDatesFor(demande)
      return
    }
    handleReviewConge(demande.id, 'approuvee').catch(() => {})
  }

  const handleRefuseConge = (id: number) => {
    handleReviewConge(id, 'refusee').catch(() => {})
  }

  const handleReviewAvance = async (id: number, statut: 'approuvee' | 'refusee') => {
    setBusyId(id)
    setActionError(null)
    try {
      const updated = await reviewAvanceDemande(id, statut)
      setAvances((prev) => prev.map((item) => item.id === id ? updated : item))
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  const query = search.trim().toLowerCase()
  const filteredConges = conges.filter((c) => !query || c.employee_nom.toLowerCase().includes(query))
  const filteredAvances = avances.filter((a) => !query || a.employee_nom.toLowerCase().includes(query))

  const nouvellesConges = filteredConges.filter((c) => c.statut === 'attente')
  const historiqueConges = filteredConges.filter((c) => c.statut !== 'attente')
  const nouvellesAvances = filteredAvances.filter((a) => a.statut === 'attente')
  const historiqueAvances = filteredAvances.filter((a) => a.statut !== 'attente')

  const congeTableHead = (
    <thead>
      <tr><th>Employé</th><th>Type</th><th>Du</th><th>Au</th><th>Durée</th><th>Motif</th><th>Statut</th><th>Traité par</th><th>Action</th></tr>
    </thead>
  )
  const avanceTableHead = (
    <thead>
      <tr><th>Employé</th><th>Montant</th><th>Motif</th><th>Remboursement</th><th>Statut</th><th>Traité par</th><th>Action</th></tr>
    </thead>
  )

  const changeTab = (next: Tab) => {
    setTab(next)
    setSection('nouvelle')
  }

  const nouvelleCount = tab === 'conges' ? nouvellesConges.length : nouvellesAvances.length
  const historiqueCount = tab === 'conges' ? historiqueConges.length : historiqueAvances.length

  return (
    <section className="ge-page">
      <div className="ge-header-row">
        <nav className="ge-subtabs">
          <button className={tab === 'conges' ? 'active' : ''} onClick={() => changeTab('conges')}>
            <Calendar size={14} />Demandes de congé{nouvellesConges.length > 0 && <span className="de-badge">{nouvellesConges.length}</span>}
          </button>
          <button className={tab === 'avances' ? 'active' : ''} onClick={() => changeTab('avances')}>
            <Wallet size={14} />Demandes d'avance{nouvellesAvances.length > 0 && <span className="de-badge">{nouvellesAvances.length}</span>}
          </button>
          <button className={tab === 'technique' ? 'active' : ''} onClick={() => changeTab('technique')}>
            <Building2 size={14} />Congé Technique
          </button>
        </nav>
        <div className="ge-header-actions">
          <button type="button" className="ge-btn-outline" onClick={() => navigateTo('gestion')}>Retour aux employés</button>
        </div>
      </div>

      {tab !== 'technique' && (
        <div className="ge-filters">
          <div className="de-section-tabs">
            <button type="button" className={section === 'nouvelle' ? 'active' : ''} onClick={() => setSection('nouvelle')}>
              Nouvelle<span className="de-section-count">{nouvelleCount}</span>
            </button>
            <button type="button" className={section === 'historique' ? 'active' : ''} onClick={() => setSection('historique')}>
              Historique<span className="de-section-count">{historiqueCount}</span>
            </button>
          </div>
          <label className="ge-search">
            <Search size={14} />
            <input placeholder="Rechercher un employé..." value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
        </div>
      )}

      {actionError && <p className="ge-form-error">{actionError}</p>}

      {tab === 'technique' && <FermetureTechniqueTab />}

      {tab !== 'technique' && loading && <p className="ge-detail-empty">Chargement des demandes…</p>}
      {tab !== 'technique' && loadError && <p className="ge-detail-empty">{loadError}</p>}

      {!loading && !loadError && tab === 'conges' && section === 'nouvelle' && (
        <DemandeSection count={nouvellesConges.length} emptyLabel="Aucune nouvelle demande de congé.">
          {congeTableHead}
          <tbody>
            {nouvellesConges.map((demande) => (
              <CongeRow key={demande.id} demande={demande} busy={busyId === demande.id} onApprove={handleApproveConge} onRefuse={handleRefuseConge} />
            ))}
          </tbody>
        </DemandeSection>
      )}

      {!loading && !loadError && tab === 'conges' && section === 'historique' && (
        <DemandeSection count={historiqueConges.length} emptyLabel="Aucune demande de congé traitée pour le moment.">
          {congeTableHead}
          <tbody>
            {historiqueConges.map((demande) => (
              <CongeRow key={demande.id} demande={demande} busy={busyId === demande.id} onApprove={handleApproveConge} onRefuse={handleRefuseConge} />
            ))}
          </tbody>
        </DemandeSection>
      )}

      {!loading && !loadError && tab === 'avances' && section === 'nouvelle' && (
        <DemandeSection count={nouvellesAvances.length} emptyLabel="Aucune nouvelle demande d'avance.">
          {avanceTableHead}
          <tbody>
            {nouvellesAvances.map((demande) => (
              <AvanceRow key={demande.id} demande={demande} busy={busyId === demande.id} onReview={handleReviewAvance} />
            ))}
          </tbody>
        </DemandeSection>
      )}

      {!loading && !loadError && tab === 'avances' && section === 'historique' && (
        <DemandeSection count={historiqueAvances.length} emptyLabel="Aucune demande d'avance traitée pour le moment.">
          {avanceTableHead}
          <tbody>
            {historiqueAvances.map((demande) => (
              <AvanceRow key={demande.id} demande={demande} busy={busyId === demande.id} onReview={handleReviewAvance} />
            ))}
          </tbody>
        </DemandeSection>
      )}

      {approvalDatesFor && (
        <CongeApprovalDatesModal
          demande={approvalDatesFor}
          onClose={() => setApprovalDatesFor(null)}
          onSubmit={async (dateDebut, dateFin) => {
            await handleReviewConge(approvalDatesFor.id, 'approuvee', { date_debut: dateDebut, date_fin: dateFin })
            setApprovalDatesFor(null)
          }}
        />
      )}
    </section>
  )
}
