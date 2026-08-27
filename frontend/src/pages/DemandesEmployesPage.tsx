import { useEffect, useState, type ReactNode } from 'react'
import { Calendar, Check, Search, Wallet, X } from 'lucide-react'
import {
  fetchOrganisationAvanceDemandes, fetchOrganisationCongeDemandes, reviewAvanceDemande, reviewCongeDemande,
  type AvanceDemande, type CongeDemande, type DemandeStatut, type TypeConge,
} from '../api/demandes'
import { ApiError } from '../api/client'
import './DemandesEmployesPage.css'

type Tab = 'conges' | 'avances'
type Section = 'nouvelle' | 'historique'

const STATUT_LABELS: Record<DemandeStatut, string> = { attente: 'En attente', approuvee: 'Approuvée', refusee: 'Refusée' }
const STATUT_CLASS: Record<DemandeStatut, string> = { attente: 'ge-pill-conge', approuvee: 'ge-pill-actif', refusee: 'ge-pill-inactif' }
const TYPE_CONGE_LABELS: Record<TypeConge, string> = {
  annuel: 'Congé annuel payé', exceptionnel: 'Congé exceptionnel', maladie: 'Congé maladie', sans_solde: 'Congé sans solde',
}

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

const formatDate = (value: string) => new Date(value).toLocaleDateString('fr-FR')

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

function CongeRow({ demande, busy, onReview }: { demande: CongeDemande; busy: boolean; onReview: (id: number, statut: 'approuvee' | 'refusee') => void }) {
  return (
    <tr>
      <td><strong>{demande.employee_nom}</strong><br /><small>{demande.employee_fonction || 'Sans fonction'}</small></td>
      <td>{TYPE_CONGE_LABELS[demande.type_conge]}</td>
      <td>{formatDate(demande.date_debut)}</td>
      <td>{formatDate(demande.date_fin)}</td>
      <td>{demande.duree} j</td>
      <td className="de-motif">{demande.motif || 'Aucun motif renseigné'}</td>
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

function AvanceRow({ demande, busy, onReview }: { demande: AvanceDemande; busy: boolean; onReview: (id: number, statut: 'approuvee' | 'refusee') => void }) {
  return (
    <tr>
      <td><strong>{demande.employee_nom}</strong><br /><small>{demande.employee_fonction || 'Sans fonction'}</small></td>
      <td><strong>{demande.montant.toLocaleString('fr-FR')} FCFA</strong></td>
      <td className="de-motif">{demande.motif || 'Aucun motif renseigné'}</td>
      <td>
        {demande.nombre_mois} salaire{demande.nombre_mois > 1 ? 's' : ''}
        <br /><small>({Math.round(demande.montant / demande.nombre_mois).toLocaleString('fr-FR')} FCFA/mois)</small>
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

  const handleReviewConge = async (id: number, statut: 'approuvee' | 'refusee') => {
    setBusyId(id)
    setActionError(null)
    try {
      const updated = await reviewCongeDemande(id, statut)
      setConges((prev) => prev.map((item) => item.id === id ? updated : item))
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setBusyId(null)
    }
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
        </nav>
        <div className="ge-header-actions">
          <button type="button" className="ge-btn-outline" onClick={() => navigateTo('gestion')}>Retour aux employés</button>
        </div>
      </div>

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

      {actionError && <p className="ge-form-error">{actionError}</p>}
      {loading && <p className="ge-detail-empty">Chargement des demandes…</p>}
      {loadError && <p className="ge-detail-empty">{loadError}</p>}

      {!loading && !loadError && tab === 'conges' && section === 'nouvelle' && (
        <DemandeSection count={nouvellesConges.length} emptyLabel="Aucune nouvelle demande de congé.">
          {congeTableHead}
          <tbody>
            {nouvellesConges.map((demande) => (
              <CongeRow key={demande.id} demande={demande} busy={busyId === demande.id} onReview={handleReviewConge} />
            ))}
          </tbody>
        </DemandeSection>
      )}

      {!loading && !loadError && tab === 'conges' && section === 'historique' && (
        <DemandeSection count={historiqueConges.length} emptyLabel="Aucune demande de congé traitée pour le moment.">
          {congeTableHead}
          <tbody>
            {historiqueConges.map((demande) => (
              <CongeRow key={demande.id} demande={demande} busy={busyId === demande.id} onReview={handleReviewConge} />
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
    </section>
  )
}
