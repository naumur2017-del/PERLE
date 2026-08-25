import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowDownToLine,
  ArrowRight,
  Banknote,
  BarChart3,
  Bell,
  Briefcase,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Circle,
  Clock,
  Download,
  Eye,
  EyeOff,
  FileText,
  Gift,
  Hand,
  HelpCircle,
  IdCard,
  Info,
  LayoutDashboard,
  ListChecks,
  Pencil,
  Percent,
  Plus,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Trash2,
  UploadCloud,
  User,
  Wallet,
  Wallet2,
  X,
} from 'lucide-react'
import passportCover from '../assets/passport.jpg'
import profilePhoto from '../assets/profile.jpg'
import { ColumnsMenu, useColumnVisibility, type ColumnDef } from '../components/ColumnsMenu'
import { fetchMe, updateMe, uploadMyDocument, type MeProfile, type MeProfileEditableFields } from '../api/employees'
import { ApiError } from '../api/client'
import type { Session } from '../auth/session'
import './SalariePage.css'

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

type Statut = 'Approuvée' | 'En attente' | 'Refusée'

interface CongeDemande {
  id: string
  dateDemande: string
  type: string
  dateDebut: string
  dateFin: string
  duree: number
  motif: string
  statut: Statut
  approuvePar: string
  approuveRole: string
  dateReponse: string
}

interface AvanceDemande {
  id: string
  dateDemande: string
  montant: number
  motif: string
  remboursement: string
  remboursementDetail: string
  statut: Statut
  approuvePar: string
  approuveRole: string
  dateReponse: string
}

const initialCongeDemandes: CongeDemande[] = [
  { id: 'CONG-2025-005', dateDemande: '15/05/2025', type: 'Congé annuel payé', dateDebut: '02/06/2025', dateFin: '06/06/2025', duree: 5, motif: 'Vacances personnelles', statut: 'Approuvée', approuvePar: 'Ajara LAMARE', approuveRole: 'Manager', dateReponse: '17/05/2025' },
  { id: 'CONG-2025-004', dateDemande: '05/05/2025', type: 'Congé exceptionnel', dateDebut: '20/05/2025', dateFin: '21/05/2025', duree: 2, motif: 'Événement familial', statut: 'En attente', approuvePar: 'Ajara LAMARE', approuveRole: 'Manager', dateReponse: '-' },
]

const initialAvanceDemandes: AvanceDemande[] = [
  { id: 'AVC-2025-003', dateDemande: '12/05/2025', montant: 150000, motif: 'Frais médicaux', remboursement: 'Prélèvement sur 3 salaires', remboursementDetail: '(50 000 FCFA / mois)', statut: 'En attente', approuvePar: 'Théodore BESSALA', approuveRole: 'Responsable des Ressources (RE)', dateReponse: '-' },
]

const formatDateFr = (date: Date) => date.toLocaleDateString('fr-FR')

const formatInputDate = (value: string) => {
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

const daysBetween = (startValue: string, endValue: string) => {
  const start = new Date(startValue)
  const end = new Date(endValue)
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1)
}

const nextId = (prefix: string, items: { id: string }[]) => {
  const numbers = items.map((item) => parseInt(item.id.split('-').pop() ?? '0', 10)).filter((value) => !Number.isNaN(value))
  const next = (numbers.length ? Math.max(...numbers) : 0) + 1
  return `${prefix}-${String(next).padStart(3, '0')}`
}

function countByStatut<T extends { statut: Statut }>(items: T[], statut: Statut) {
  return items.filter((item) => item.statut === statut).length
}

const PERIODES = ['Mai 2025', 'Avril 2025', 'Mars 2025', 'Février 2025', 'Janvier 2025', 'Décembre 2024']

function PeriodeFilter({ value, onChange, label = 'Période' }: { value: string; onChange: (value: string) => void; label?: string }) {
  return (
    <label className="salarie-filter salarie-filter-periode">
      <Calendar size={13} strokeWidth={2} />
      {label} :
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {PERIODES.map((periode) => <option key={periode} value={periode}>{periode}</option>)}
      </select>
    </label>
  )
}

const tabs = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { id: 'activites', label: 'Activités', icon: ListChecks },
  { id: 'remuneration', label: 'Rémunération', icon: Banknote },
  { id: 'demandes', label: 'Demandes', icon: FileText },
  { id: 'profil', label: 'Mon profil', icon: User },
] as const

type TabId = (typeof tabs)[number]['id']

export default function SalariePage({ session, onSessionUpdate }: { session: Session; onSessionUpdate: (patch: Partial<Session>) => void }) {
  const [activeTab, setActiveTab] = useState<TabId>('demandes')
  const activeLabel = tabs.find((tab) => tab.id === activeTab)!.label

  return (
    <section className="salarie-page">
      <nav className="salarie-tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button key={tab.id} className={activeTab === tab.id ? 'active' : ''} onClick={() => setActiveTab(tab.id)}>
              <Icon size={15} strokeWidth={2.2} />{tab.label}
            </button>
          )
        })}
      </nav>

      {activeTab === 'dashboard' ? <DashboardTab session={session} />
        : activeTab === 'activites' ? <ActivitesTab />
        : activeTab === 'remuneration' ? <RemunerationTab />
        : activeTab === 'demandes' ? <DemandesTab />
        : activeTab === 'profil' ? <ProfilTab onSessionUpdate={onSessionUpdate} />
        : <ComingSoon label={activeLabel} icon={tabs.find((tab) => tab.id === activeTab)!.icon} />}
    </section>
  )
}

function ComingSoon({ label, icon: Icon }: { label: string; icon: typeof LayoutDashboard }) {
  return (
    <div className="salarie-soon">
      <Icon size={30} strokeWidth={1.6} />
      <strong>{label}</strong>
      <p>Cet espace est en cours de construction et sera bientôt disponible.</p>
    </div>
  )
}

function StatutPill({ statut }: { statut: Statut }) {
  const className = statut === 'Approuvée' ? 'approuvee' : statut === 'Refusée' ? 'refusee' : 'attente'
  return <span className={`salarie-pill ${className}`}>{statut}</span>
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="salarie-info-row">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  )
}

function Note({ children }: { children: ReactNode }) {
  return (
    <div className="salarie-note">
      <Info size={15} strokeWidth={2} />
      <p>{children}</p>
    </div>
  )
}

function Lightbox({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return createPortal(
    <div className="salarie-lightbox-overlay" onClick={onClose}>
      <div className={`salarie-lightbox${wide ? ' salarie-lightbox-wide' : ''}`} onClick={(event) => event.stopPropagation()}>
        <div className="salarie-lightbox-head">
          <h3>{title}</h3>
          <button aria-label="Fermer l’aperçu" onClick={onClose}><X size={16} strokeWidth={2} /></button>
        </div>
        <div className="salarie-lightbox-body">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

function Pagination() {
  return (
    <div className="salarie-pagination">
      <button disabled><ChevronsLeft size={13} /></button>
      <button disabled><ChevronLeft size={13} /></button>
      <button className="active">1</button>
      <button disabled><ChevronRight size={13} /></button>
      <button disabled><ChevronsRight size={13} /></button>
    </div>
  )
}

function SummaryCard({ icon, iconClass, title, total, totalLabel, attente, approuvee, refusee }: { icon: ReactNode; iconClass: string; title: string; total: number; totalLabel: string; attente: number; approuvee: number; refusee: number }) {
  return (
    <article className="salarie-summary-card">
      <div className="salarie-summary-main">
        <span className={`salarie-summary-icon ${iconClass}`}>{icon}</span>
        <div>
          <h4>{title}</h4>
          <strong>{total}</strong>
          <small>{totalLabel}</small>
        </div>
      </div>
      <div className="salarie-summary-breakdown">
        <div><strong>{attente}</strong><small className="attente">En attente</small></div>
        <div><strong>{approuvee}</strong><small className="approuvee">Approuvée</small></div>
        <div><strong>{refusee}</strong><small className="refusee">Refusée</small></div>
      </div>
    </article>
  )
}

interface CongeFormValues {
  type: string
  dateDebut: string
  dateFin: string
  motif: string
}

function CongeForm({ onCancel, onCreate }: { onCancel: () => void; onCreate: (values: CongeFormValues) => void }) {
  const [type, setType] = useState('Congé annuel payé')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [motif, setMotif] = useState('')

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!dateDebut || !dateFin || !motif.trim()) return
    onCreate({ type, dateDebut, dateFin, motif: motif.trim() })
  }

  return (
    <form className="salarie-form" onSubmit={handleSubmit}>
      <label>Type de congé
        <select value={type} onChange={(event) => setType(event.target.value)}>
          <option>Congé annuel payé</option>
          <option>Congé exceptionnel</option>
          <option>Congé maladie</option>
          <option>Congé sans solde</option>
        </select>
      </label>
      <div className="salarie-form-row">
        <label>Date de début<input type="date" required value={dateDebut} onChange={(event) => setDateDebut(event.target.value)} /></label>
        <label>Date de fin<input type="date" required value={dateFin} min={dateDebut || undefined} onChange={(event) => setDateFin(event.target.value)} /></label>
      </div>
      <label>Motif<textarea required rows={3} value={motif} placeholder="Décrivez le motif de votre demande" onChange={(event) => setMotif(event.target.value)} /></label>
      <div className="salarie-form-actions">
        <button type="button" className="salarie-ghost-btn" onClick={onCancel}>Annuler</button>
        <button type="submit" className="salarie-primary-btn"><Plus size={14} strokeWidth={2.4} />Envoyer la demande</button>
      </div>
    </form>
  )
}

interface AvanceFormValues {
  montant: number
  motif: string
  mois: number
}

function AvanceForm({ onCancel, onCreate }: { onCancel: () => void; onCreate: (values: AvanceFormValues) => void }) {
  const [montant, setMontant] = useState('')
  const [motif, setMotif] = useState('')
  const [mois, setMois] = useState('3')

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const montantValue = Number(montant)
    if (!montantValue || montantValue <= 0 || !motif.trim()) return
    onCreate({ montant: montantValue, motif: motif.trim(), mois: Number(mois) })
  }

  return (
    <form className="salarie-form" onSubmit={handleSubmit}>
      <label>Montant demandé (FCFA)<input type="number" required min={1000} step={1000} value={montant} placeholder="Ex. 150000" onChange={(event) => setMontant(event.target.value)} /></label>
      <label>Motif<textarea required rows={3} value={motif} placeholder="Décrivez le motif de votre demande" onChange={(event) => setMotif(event.target.value)} /></label>
      <label>Remboursement proposé
        <select value={mois} onChange={(event) => setMois(event.target.value)}>
          <option value="1">Prélèvement sur 1 salaire</option>
          <option value="2">Prélèvement sur 2 salaires</option>
          <option value="3">Prélèvement sur 3 salaires</option>
          <option value="6">Prélèvement sur 6 salaires</option>
        </select>
      </label>
      <div className="salarie-form-actions">
        <button type="button" className="salarie-ghost-btn" onClick={onCancel}>Annuler</button>
        <button type="submit" className="salarie-primary-btn"><Plus size={14} strokeWidth={2.4} />Envoyer la demande</button>
      </div>
    </form>
  )
}

function DemandesTab() {
  const [periode, setPeriode] = useState(PERIODES[0])
  const [congeDemandes, setCongeDemandes] = useState<CongeDemande[]>(initialCongeDemandes)
  const [avanceDemandes, setAvanceDemandes] = useState<AvanceDemande[]>(initialAvanceDemandes)
  const [viewConge, setViewConge] = useState<CongeDemande | null>(null)
  const [viewAvance, setViewAvance] = useState<AvanceDemande | null>(null)
  const [showCongeForm, setShowCongeForm] = useState(false)
  const [showAvanceForm, setShowAvanceForm] = useState(false)

  const handleCreateConge = (values: CongeFormValues) => {
    const newDemande: CongeDemande = {
      id: nextId('CONG-2025', congeDemandes),
      dateDemande: formatDateFr(new Date()),
      type: values.type,
      dateDebut: formatInputDate(values.dateDebut),
      dateFin: formatInputDate(values.dateFin),
      duree: daysBetween(values.dateDebut, values.dateFin),
      motif: values.motif,
      statut: 'En attente',
      approuvePar: 'Ajara LAMARE',
      approuveRole: 'Manager',
      dateReponse: '-',
    }
    setCongeDemandes((prev) => [newDemande, ...prev])
    setShowCongeForm(false)
  }

  const handleCreateAvance = (values: AvanceFormValues) => {
    const monthly = Math.round(values.montant / values.mois)
    const newDemande: AvanceDemande = {
      id: nextId('AVC-2025', avanceDemandes),
      dateDemande: formatDateFr(new Date()),
      montant: values.montant,
      motif: values.motif,
      remboursement: `Prélèvement sur ${values.mois} salaire${values.mois > 1 ? 's' : ''}`,
      remboursementDetail: `(${monthly.toLocaleString('fr-FR')} FCFA / mois)`,
      statut: 'En attente',
      approuvePar: 'Théodore BESSALA',
      approuveRole: 'Responsable des Ressources (RE)',
      dateReponse: '-',
    }
    setAvanceDemandes((prev) => [newDemande, ...prev])
    setShowAvanceForm(false)
  }

  const congeAttente = countByStatut(congeDemandes, 'En attente')
  const congeApprouvee = countByStatut(congeDemandes, 'Approuvée')
  const congeRefusee = countByStatut(congeDemandes, 'Refusée')

  const avanceAttente = countByStatut(avanceDemandes, 'En attente')
  const avanceApprouvee = countByStatut(avanceDemandes, 'Approuvée')
  const avanceRefusee = countByStatut(avanceDemandes, 'Refusée')

  return (
    <div className="salarie-demandes">
      <div className="salarie-heading">
        <h2>Mes demandes</h2>
        <p>Consultez et suivez l’état de vos demandes.</p>
      </div>

      <div className="salarie-tab-filter-row">
        <PeriodeFilter value={periode} onChange={setPeriode} />
      </div>

      <div className="salarie-summary">
        <SummaryCard
          icon={<Calendar size={19} strokeWidth={2} />} iconClass="conge" title="Demandes de congé"
          total={congeDemandes.length} totalLabel={congeDemandes.length > 1 ? 'demandes au total' : 'demande au total'}
          attente={congeAttente} approuvee={congeApprouvee} refusee={congeRefusee}
        />
        <SummaryCard
          icon={<Wallet size={19} strokeWidth={2} />} iconClass="avance" title="Demandes d’avance sur salaire"
          total={avanceDemandes.length} totalLabel={avanceDemandes.length > 1 ? 'demandes au total' : 'demande au total'}
          attente={avanceAttente} approuvee={avanceApprouvee} refusee={avanceRefusee}
        />
      </div>

      <section className="salarie-panel">
        <div className="salarie-panel-heading">
          <div className="salarie-panel-title"><span className="salarie-panel-icon conge"><Calendar size={15} strokeWidth={2} /></span><h3>Demandes de congé</h3></div>
          <div className="salarie-panel-actions">
            <PeriodeFilter value={periode} onChange={setPeriode} label="Filtrer par mois" />
            <button className="salarie-primary-btn" onClick={() => setShowCongeForm(true)}><Plus size={14} strokeWidth={2.4} />Nouvelle demande de congé</button>
          </div>
        </div>
        <div className="salarie-table-wrap">
          <table>
            <thead>
              <tr><th>N° Demande</th><th>Date de demande</th><th>Type de congé</th><th>Date de début</th><th>Date de fin</th><th>Durée (jours)</th><th>Motif</th><th>Statut</th><th>Approuvé par</th><th>Date de réponse</th><th>Action</th></tr>
            </thead>
            <tbody>
              {congeDemandes.map((demande) => (
                <tr key={demande.id}>
                  <td><strong>{demande.id}</strong></td>
                  <td>{demande.dateDemande}</td>
                  <td>{demande.type}</td>
                  <td>{demande.dateDebut}</td>
                  <td>{demande.dateFin}</td>
                  <td>{demande.duree}</td>
                  <td>{demande.motif}</td>
                  <td><StatutPill statut={demande.statut} /></td>
                  <td><strong>{demande.approuvePar}</strong><small>{demande.approuveRole}</small></td>
                  <td>{demande.dateReponse}</td>
                  <td className="salarie-actions">
                    <button aria-label="Voir la demande" onClick={() => setViewConge(demande)}><Eye size={14} strokeWidth={2} /></button>
                    {demande.statut === 'En attente' && <button aria-label="Supprimer la demande" className="danger"><Trash2 size={14} strokeWidth={2} /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="salarie-table-footer">
          <span>Affichage de 1 à {congeDemandes.length} sur {congeDemandes.length} demandes</span>
          <Pagination />
        </div>
      </section>

      <section className="salarie-panel">
        <div className="salarie-panel-heading">
          <div className="salarie-panel-title"><span className="salarie-panel-icon avance"><Wallet size={15} strokeWidth={2} /></span><h3>Demandes d’avance sur salaire</h3></div>
          <div className="salarie-panel-actions">
            <PeriodeFilter value={periode} onChange={setPeriode} label="Filtrer par mois" />
            <button className="salarie-primary-btn" onClick={() => setShowAvanceForm(true)}><Download size={14} strokeWidth={2.4} />Nouvelle demande d’avance</button>
          </div>
        </div>
        <div className="salarie-table-wrap">
          <table>
            <thead>
              <tr><th>N° Demande</th><th>Date de demande</th><th>Montant demandé (FCFA)</th><th>Motif</th><th>Remboursement proposé</th><th>Statut</th><th>Approuvé par</th><th>Date de réponse</th><th>Action</th></tr>
            </thead>
            <tbody>
              {avanceDemandes.map((demande) => (
                <tr key={demande.id}>
                  <td><strong>{demande.id}</strong></td>
                  <td>{demande.dateDemande}</td>
                  <td><strong>{demande.montant.toLocaleString('fr-FR')}</strong></td>
                  <td>{demande.motif}</td>
                  <td>{demande.remboursement}<small>{demande.remboursementDetail}</small></td>
                  <td><StatutPill statut={demande.statut} /></td>
                  <td><strong>{demande.approuvePar}</strong><small>{demande.approuveRole}</small></td>
                  <td>{demande.dateReponse}</td>
                  <td className="salarie-actions">
                    <button aria-label="Voir la demande" onClick={() => setViewAvance(demande)}><Eye size={14} strokeWidth={2} /></button>
                    {demande.statut === 'En attente' && <button aria-label="Supprimer la demande" className="danger"><Trash2 size={14} strokeWidth={2} /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="salarie-table-footer">
          <span>Affichage de 1 à {avanceDemandes.length} sur {avanceDemandes.length} demande{avanceDemandes.length > 1 ? 's' : ''}</span>
          <Pagination />
        </div>
      </section>

      <div className="salarie-info">
        <Info size={18} strokeWidth={2} />
        <div>
          <strong>Informations importantes</strong>
          <ul>
            <li>Vos demandes sont soumises à validation par le responsable concerné.</li>
            <li>Vous serez notifié par email dès qu’une réponse sera apportée à votre demande.</li>
            <li>Les demandes approuvées seront automatiquement prises en compte par le système.</li>
          </ul>
        </div>
      </div>

      {viewConge && (
        <Lightbox title={`Demande ${viewConge.id}`} onClose={() => setViewConge(null)}>
          <div className="salarie-info-col">
            <InfoRow label="Type de congé" value={viewConge.type} />
            <InfoRow label="Date de demande" value={viewConge.dateDemande} />
            <InfoRow label="Date de début" value={viewConge.dateDebut} />
            <InfoRow label="Date de fin" value={viewConge.dateFin} />
            <InfoRow label="Durée" value={`${viewConge.duree} jour${viewConge.duree > 1 ? 's' : ''}`} />
            <InfoRow label="Motif" value={viewConge.motif} />
            <InfoRow label="Statut" value={<StatutPill statut={viewConge.statut} />} />
            <InfoRow label="Approuvé par" value={`${viewConge.approuvePar} (${viewConge.approuveRole})`} />
            <InfoRow label="Date de réponse" value={viewConge.dateReponse} />
          </div>
        </Lightbox>
      )}

      {viewAvance && (
        <Lightbox title={`Demande ${viewAvance.id}`} onClose={() => setViewAvance(null)}>
          <div className="salarie-info-col">
            <InfoRow label="Date de demande" value={viewAvance.dateDemande} />
            <InfoRow label="Montant demandé" value={`${viewAvance.montant.toLocaleString('fr-FR')} FCFA`} />
            <InfoRow label="Motif" value={viewAvance.motif} />
            <InfoRow label="Remboursement proposé" value={`${viewAvance.remboursement} ${viewAvance.remboursementDetail}`} />
            <InfoRow label="Statut" value={<StatutPill statut={viewAvance.statut} />} />
            <InfoRow label="Approuvé par" value={`${viewAvance.approuvePar} (${viewAvance.approuveRole})`} />
            <InfoRow label="Date de réponse" value={viewAvance.dateReponse} />
          </div>
        </Lightbox>
      )}

      {showCongeForm && (
        <Lightbox title="Nouvelle demande de congé" onClose={() => setShowCongeForm(false)}>
          <CongeForm onCancel={() => setShowCongeForm(false)} onCreate={handleCreateConge} />
        </Lightbox>
      )}

      {showAvanceForm && (
        <Lightbox title="Nouvelle demande d’avance" onClose={() => setShowAvanceForm(false)}>
          <AvanceForm onCancel={() => setShowAvanceForm(false)} onCreate={handleCreateAvance} />
        </Lightbox>
      )}
    </div>
  )
}

const formatDateNaissance = (value: string | null) => {
  if (!value) return 'Non renseignée'
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

const STATUT_LABELS: Record<MeProfile['statut'], string> = { actif: 'Actif', conge: 'En congé', inactif: 'Inactif' }
const STATUT_PILL_CLASS: Record<MeProfile['statut'], string> = { actif: 'approuvee', conge: 'attente', inactif: 'refusee' }

type PersonalForm = {
  first_name: string
  last_name: string
  matricule: string
  date_naissance: string
  pays: string
  ville: string
  phone: string
  email: string
  fonction: string
  statut: MeProfile['statut']
}

const personalFormFrom = (profile: MeProfile): PersonalForm => ({
  first_name: profile.first_name,
  last_name: profile.last_name,
  matricule: profile.matricule,
  date_naissance: profile.date_naissance ?? '',
  pays: profile.pays,
  ville: profile.ville,
  phone: profile.phone,
  email: profile.email,
  fonction: profile.fonction,
  statut: profile.statut,
})

function PersonalInfoCard({ profile, onUpdated }: { profile: MeProfile; onUpdated: (profile: MeProfile) => void }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<PersonalForm>(() => personalFormFrom(profile))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fullName = `${profile.first_name} ${profile.last_name}`

  const startEdit = () => {
    setForm(personalFormFrom(profile))
    setError(null)
    setEditing(true)
  }

  const handleChange = (key: keyof PersonalForm) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const updated = await updateMe({ ...form, date_naissance: form.date_naissance || null })
      onUpdated(updated)
      setEditing(false)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const personalInfoLeft: [string, ReactNode][] = [
    ['Matricule', profile.matricule || 'Non renseigné'],
    ['Nom complet', fullName],
    ['Date de naissance', formatDateNaissance(profile.date_naissance)],
    ['Lieu de naissance', profile.ville && profile.pays ? `${profile.ville}, ${profile.pays}` : 'Non renseigné'],
  ]

  const personalInfoRight: [string, ReactNode][] = [
    ['Téléphone', profile.phone || 'Non renseigné'],
    ['Email professionnel', profile.email],
    ['Organisation', profile.organisation?.name ?? 'Non renseignée'],
    ['Statut', <span className={`salarie-pill ${STATUT_PILL_CLASS[profile.statut]}`}>{STATUT_LABELS[profile.statut]}</span>],
    ['Poste', profile.fonction || 'Non renseigné'],
  ]

  return (
    <section className="salarie-panel salarie-profil-card personal-card">
      <div className="salarie-card-head">
        <h3>Informations personnelles</h3>
        {!editing && <button type="button" className="salarie-ghost-btn" onClick={startEdit}><Pencil size={13} strokeWidth={2} />Modifier</button>}
      </div>

      {!editing ? (
        <div className="salarie-personal-body">
          <div className="salarie-avatar-block">
            <img src={profilePhoto} alt={fullName} className="salarie-avatar-photo" />
            <button className="salarie-ghost-btn"><Camera size={13} strokeWidth={2} />Modifier la photo</button>
          </div>
          <div className="salarie-info-columns">
            <div className="salarie-info-col">{personalInfoLeft.map(([label, value]) => <InfoRow key={label} label={label} value={value} />)}</div>
            <div className="salarie-info-col">{personalInfoRight.map(([label, value]) => <InfoRow key={label} label={label} value={value} />)}</div>
          </div>
        </div>
      ) : (
        <form className="salarie-form" onSubmit={handleSubmit}>
          {error && <p className="form-error">{error}</p>}
          <div className="salarie-form-row">
            <label>Prénom<input value={form.first_name} onChange={handleChange('first_name')} required /></label>
            <label>Nom<input value={form.last_name} onChange={handleChange('last_name')} required /></label>
          </div>
          <div className="salarie-form-row">
            <label>Matricule<input value={form.matricule} onChange={handleChange('matricule')} /></label>
            <label>Date de naissance<input type="date" value={form.date_naissance} onChange={handleChange('date_naissance')} /></label>
          </div>
          <div className="salarie-form-row">
            <label>Pays<input value={form.pays} onChange={handleChange('pays')} /></label>
            <label>Ville<input value={form.ville} onChange={handleChange('ville')} /></label>
          </div>
          <div className="salarie-form-row">
            <label>Téléphone<input value={form.phone} onChange={handleChange('phone')} /></label>
            <label>Email professionnel<input type="email" value={form.email} onChange={handleChange('email')} required /></label>
          </div>
          <div className="salarie-form-row">
            <label>Poste<input value={form.fonction} onChange={handleChange('fonction')} /></label>
            <label>Statut
              <select value={form.statut} onChange={handleChange('statut')}>
                <option value="actif">Actif</option>
                <option value="conge">En congé</option>
                <option value="inactif">Inactif</option>
              </select>
            </label>
          </div>
          <div className="salarie-form-actions">
            <button type="button" className="salarie-ghost-btn" disabled={saving} onClick={() => setEditing(false)}>Annuler</button>
            <button type="submit" className="salarie-primary-btn" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
          </div>
        </form>
      )}
    </section>
  )
}

type DocField = 'cni_document' | 'autre_piece_document' | 'cv_document' | 'contrat_document'

const DOCUMENTS_META: { field: DocField; title: string; kind: 'image' | 'pdf'; placeholderIcon?: typeof IdCard; placeholderImage?: string }[] = [
  { field: 'cni_document', title: 'Carte Nationale d’Identité (CNI)', kind: 'image', placeholderIcon: IdCard },
  { field: 'autre_piece_document', title: 'Autres pièces d’identité', kind: 'image', placeholderImage: passportCover },
  { field: 'cv_document', title: 'CV à jour', kind: 'pdf', placeholderIcon: FileText },
  { field: 'contrat_document', title: 'Contrat de travail', kind: 'pdf', placeholderIcon: FileText },
]

const documentFileName = (url: string) => decodeURIComponent(url.split('/').pop() ?? '')

function DocumentsCard({ profile, onUpdated }: { profile: MeProfile; onUpdated: (profile: MeProfile) => void }) {
  const [openField, setOpenField] = useState<DocField | null>(null)
  const [uploadingField, setUploadingField] = useState<DocField | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleUpload = async (field: DocField, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setUploadingField(field)
    setError(null)
    try {
      onUpdated(await uploadMyDocument(field, file))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setUploadingField(null)
    }
  }

  const openDoc = DOCUMENTS_META.find((doc) => doc.field === openField) ?? null
  const openDocUrl = openField ? profile[openField] : null

  return (
    <section className="salarie-panel salarie-profil-card documents-card">
      <h3>Documents officiels</h3>
      {error && <p className="form-error">{error}</p>}
      <div className="salarie-document-list">
        {DOCUMENTS_META.map((doc) => {
          const url = profile[doc.field]
          const Icon = doc.placeholderIcon
          return (
            <article key={doc.field} className="salarie-document">
              {doc.kind === 'image' && url
                ? <img src={url} alt={doc.title} className="salarie-document-photo" />
                : doc.kind === 'image' && doc.placeholderImage
                  ? <img src={doc.placeholderImage} alt={doc.title} className="salarie-document-photo" />
                  : Icon && <span className="salarie-document-thumb"><Icon size={28} strokeWidth={1.6} /></span>}
              <div className="salarie-document-body">
                <strong>{doc.title}</strong>
                <InfoRow label="Statut" value={<span className={`salarie-pill ${url ? 'approuvee' : 'attente'}`}>{url ? 'Téléversé' : 'Non téléversé'}</span>} />
                {url && doc.kind === 'pdf' && <InfoRow label="Fichier" value={documentFileName(url)} />}
              </div>
              <div className="salarie-actions">
                {url && <button aria-label={`Voir ${doc.title}`} onClick={() => setOpenField(doc.field)}><Eye size={14} strokeWidth={2} /></button>}
                <label className="salarie-upload-btn" aria-label={`Téléverser ${doc.title}`} title={url ? 'Remplacer le document' : 'Téléverser le document'}>
                  <UploadCloud size={14} strokeWidth={2} />
                  <input
                    type="file"
                    accept={doc.kind === 'pdf' ? 'application/pdf' : 'image/*'}
                    className="salarie-upload-input"
                    disabled={uploadingField !== null}
                    onChange={(event) => handleUpload(doc.field, event)}
                  />
                </label>
              </div>
            </article>
          )
        })}
      </div>
      <Note>Pièces d’identité : formats JPG ou PNG. CV et contrat : format PDF uniquement.</Note>

      {openDoc && openDocUrl && (
        <Lightbox title={openDoc.title} onClose={() => setOpenField(null)} wide={openDoc.kind === 'pdf'}>
          {openDoc.kind === 'image'
            ? <img src={openDocUrl} alt={openDoc.title} className="salarie-lightbox-image" />
            : <iframe src={openDocUrl} title={openDoc.title} className="salarie-pdf-frame" />}
        </Lightbox>
      )}
    </section>
  )
}

const TYPE_CONTRAT_LABELS: Record<string, string> = { cdi: 'CDI', cdd: 'CDD', stage: 'Stage', alternance: 'Alternance', consultant: 'Consultant' }
const PERIODE_ESSAI_LABELS: Record<string, string> = { en_cours: 'En cours', terminee: 'Terminée' }
const TEMPS_TRAVAIL_LABELS: Record<string, string> = { temps_plein: 'Temps plein', temps_partiel: 'Temps partiel' }

const splitSkills = (value: string) => value.split(',').map((skill) => skill.trim()).filter(Boolean)

type ProfessionalForm = Omit<
  Pick<
    MeProfileEditableFields,
    'departement' | 'responsable_hierarchique' | 'date_embauche' | 'type_contrat' | 'periode_essai'
    | 'lieu_travail' | 'temps_travail' | 'horaire' | 'competences_principales' | 'competences_secondaires'
  >,
  'date_embauche'
> & { date_embauche: string }

const professionalFormFrom = (profile: MeProfile): ProfessionalForm => ({
  departement: profile.departement,
  responsable_hierarchique: profile.responsable_hierarchique,
  date_embauche: profile.date_embauche ?? '',
  type_contrat: profile.type_contrat,
  periode_essai: profile.periode_essai,
  lieu_travail: profile.lieu_travail,
  temps_travail: profile.temps_travail,
  horaire: profile.horaire,
  competences_principales: profile.competences_principales,
  competences_secondaires: profile.competences_secondaires,
})

function ProfessionalInfoCard({ profile, onUpdated }: { profile: MeProfile; onUpdated: (profile: MeProfile) => void }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<ProfessionalForm>(() => professionalFormFrom(profile))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startEdit = () => {
    setForm(professionalFormFrom(profile))
    setError(null)
    setEditing(true)
  }

  const handleChange = (key: keyof ProfessionalForm) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      onUpdated(await updateMe({ ...form, date_embauche: form.date_embauche || null }))
      setEditing(false)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const professionalInfo: [string, ReactNode][] = [
    ['Département', profile.departement || 'Non renseigné'],
    ['Responsable hiérarchique', profile.responsable_hierarchique || 'Non renseigné'],
    ['Date d’embauche', profile.date_embauche ? formatDateNaissance(profile.date_embauche) : 'Non renseignée'],
    ['Type de contrat', TYPE_CONTRAT_LABELS[profile.type_contrat] ?? 'Non renseigné'],
    ['Période d’essai', PERIODE_ESSAI_LABELS[profile.periode_essai] ?? 'Non renseignée'],
    ['Ancienneté', profile.anciennete ?? 'Non renseignée'],
    ['Lieu de travail', profile.lieu_travail || 'Non renseigné'],
    ['Temps de travail', TEMPS_TRAVAIL_LABELS[profile.temps_travail] ?? 'Non renseigné'],
    ['Horaire', profile.horaire || 'Non renseigné'],
  ]

  const competencesPrincipales = splitSkills(profile.competences_principales)
  const competencesSecondaires = splitSkills(profile.competences_secondaires)

  return (
    <section className="salarie-panel salarie-profil-card professional-card">
      <div className="salarie-card-head">
        <h3>Informations professionnelles</h3>
        {!editing && <button type="button" className="salarie-ghost-btn" onClick={startEdit}><Pencil size={13} strokeWidth={2} />Modifier</button>}
      </div>

      {!editing ? (
        <div className="salarie-professional-body">
          <div className="salarie-info-col">{professionalInfo.map(([label, value]) => <InfoRow key={label} label={label} value={value} />)}</div>
          <div className="salarie-skills">
            <div>
              <h4>Compétences principales</h4>
              {competencesPrincipales.length
                ? <ul>{competencesPrincipales.map((skill) => <li key={skill} className="checked"><CheckCircle2 size={14} strokeWidth={2} />{skill}</li>)}</ul>
                : <p className="salarie-empty-hint">Non renseignées</p>}
            </div>
            <div>
              <h4>Compétences secondaires</h4>
              {competencesSecondaires.length
                ? <ul>{competencesSecondaires.map((skill) => <li key={skill}><Circle size={14} strokeWidth={2} />{skill}</li>)}</ul>
                : <p className="salarie-empty-hint">Non renseignées</p>}
            </div>
          </div>
        </div>
      ) : (
        <form className="salarie-form" onSubmit={handleSubmit}>
          {error && <p className="form-error">{error}</p>}
          <div className="salarie-form-row">
            <label>Département<input value={form.departement} onChange={handleChange('departement')} /></label>
            <label>Responsable hiérarchique<input value={form.responsable_hierarchique} onChange={handleChange('responsable_hierarchique')} /></label>
          </div>
          <div className="salarie-form-row">
            <label>Date d’embauche<input type="date" value={form.date_embauche} onChange={handleChange('date_embauche')} /></label>
            <label>Type de contrat
              <select value={form.type_contrat} onChange={handleChange('type_contrat')}>
                <option value="">Non renseigné</option>
                <option value="cdi">CDI</option>
                <option value="cdd">CDD</option>
                <option value="stage">Stage</option>
                <option value="alternance">Alternance</option>
                <option value="consultant">Consultant</option>
              </select>
            </label>
          </div>
          <div className="salarie-form-row">
            <label>Période d’essai
              <select value={form.periode_essai} onChange={handleChange('periode_essai')}>
                <option value="">Non renseignée</option>
                <option value="en_cours">En cours</option>
                <option value="terminee">Terminée</option>
              </select>
            </label>
            <label>Lieu de travail<input value={form.lieu_travail} onChange={handleChange('lieu_travail')} /></label>
          </div>
          <div className="salarie-form-row">
            <label>Temps de travail
              <select value={form.temps_travail} onChange={handleChange('temps_travail')}>
                <option value="">Non renseigné</option>
                <option value="temps_plein">Temps plein</option>
                <option value="temps_partiel">Temps partiel</option>
              </select>
            </label>
            <label>Horaire<input value={form.horaire} onChange={handleChange('horaire')} placeholder="Ex. 08h30 - 17h30 (Lun - Ven)" /></label>
          </div>
          <label>Compétences principales (séparées par des virgules)
            <input value={form.competences_principales} onChange={handleChange('competences_principales')} placeholder="Ex. Excel, SQL, Power BI" />
          </label>
          <label>Compétences secondaires (séparées par des virgules)
            <input value={form.competences_secondaires} onChange={handleChange('competences_secondaires')} placeholder="Ex. Python, Communication" />
          </label>
          <div className="salarie-form-actions">
            <button type="button" className="salarie-ghost-btn" disabled={saving} onClick={() => setEditing(false)}>Annuler</button>
            <button type="submit" className="salarie-primary-btn" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
          </div>
        </form>
      )}
    </section>
  )
}

type OtherForm = Pick<
  MeProfileEditableFields,
  'cnps' | 'contribuable' | 'banque' | 'compte_bancaire' | 'groupe_sanguin' | 'contact_urgence_nom' | 'contact_urgence_telephone' | 'assurance_sante'
>

const otherFormFrom = (profile: MeProfile): OtherForm => ({
  cnps: profile.cnps,
  contribuable: profile.contribuable,
  banque: profile.banque,
  compte_bancaire: profile.compte_bancaire,
  groupe_sanguin: profile.groupe_sanguin,
  contact_urgence_nom: profile.contact_urgence_nom,
  contact_urgence_telephone: profile.contact_urgence_telephone,
  assurance_sante: profile.assurance_sante,
})

function OtherInfoCard({ profile, onUpdated }: { profile: MeProfile; onUpdated: (profile: MeProfile) => void }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<OtherForm>(() => otherFormFrom(profile))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startEdit = () => {
    setForm(otherFormFrom(profile))
    setError(null)
    setEditing(true)
  }

  const handleChange = (key: keyof OtherForm) => (event: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      onUpdated(await updateMe(form))
      setEditing(false)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const autresInfo: [string, ReactNode][] = [
    ['N° CNPS', profile.cnps || 'Non renseigné'],
    ['N° Contribuable', profile.contribuable || 'Non renseigné'],
    ['Banque', profile.banque || 'Non renseignée'],
    ['N° Compte bancaire', profile.compte_bancaire || 'Non renseigné'],
    ['Groupe sanguin', profile.groupe_sanguin || 'Non renseigné'],
    ['Personne à contacter en cas d’urgence', profile.contact_urgence_nom || profile.contact_urgence_telephone
      ? <>{profile.contact_urgence_nom}{profile.contact_urgence_nom && profile.contact_urgence_telephone && <br />}{profile.contact_urgence_telephone}</>
      : 'Non renseignée'],
    ['Assurance santé', profile.assurance_sante || 'Non renseignée'],
  ]

  return (
    <section className="salarie-panel salarie-profil-card other-card">
      <div className="salarie-card-head">
        <h3>Autres informations</h3>
        {!editing && <button type="button" className="salarie-ghost-btn" onClick={startEdit}><Pencil size={13} strokeWidth={2} />Modifier</button>}
      </div>

      {!editing ? (
        <div className="salarie-info-col">{autresInfo.map(([label, value]) => <InfoRow key={label} label={label} value={value} />)}</div>
      ) : (
        <form className="salarie-form" onSubmit={handleSubmit}>
          {error && <p className="form-error">{error}</p>}
          <div className="salarie-form-row">
            <label>N° CNPS<input value={form.cnps} onChange={handleChange('cnps')} /></label>
            <label>N° Contribuable<input value={form.contribuable} onChange={handleChange('contribuable')} /></label>
          </div>
          <div className="salarie-form-row">
            <label>Banque<input value={form.banque} onChange={handleChange('banque')} /></label>
            <label>N° Compte bancaire<input value={form.compte_bancaire} onChange={handleChange('compte_bancaire')} /></label>
          </div>
          <div className="salarie-form-row">
            <label>Groupe sanguin<input value={form.groupe_sanguin} onChange={handleChange('groupe_sanguin')} placeholder="Ex. O+" /></label>
            <label>Assurance santé<input value={form.assurance_sante} onChange={handleChange('assurance_sante')} /></label>
          </div>
          <div className="salarie-form-row">
            <label>Contact d’urgence — Nom<input value={form.contact_urgence_nom} onChange={handleChange('contact_urgence_nom')} placeholder="Ex. Marie Ebongue (Sœur)" /></label>
            <label>Contact d’urgence — Téléphone<input value={form.contact_urgence_telephone} onChange={handleChange('contact_urgence_telephone')} /></label>
          </div>
          <div className="salarie-form-actions">
            <button type="button" className="salarie-ghost-btn" disabled={saving} onClick={() => setEditing(false)}>Annuler</button>
            <button type="submit" className="salarie-primary-btn" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
          </div>
        </form>
      )}
      <Note>Ces informations restent visibles uniquement par vous et les Ressources Humaines.</Note>
    </section>
  )
}

function ProfilTab({ onSessionUpdate }: { onSessionUpdate: (patch: Partial<Session>) => void }) {
  const [profile, setProfile] = useState<MeProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchMe()
      .then((data) => { if (!cancelled) setProfile(data) })
      .catch(() => { if (!cancelled) setLoadError('Impossible de charger votre profil.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const handleProfileUpdate = (updated: MeProfile) => {
    setProfile(updated)
    onSessionUpdate({
      firstName: updated.first_name,
      lastName: updated.last_name,
      email: updated.email,
      phone: updated.phone,
      fonction: updated.fonction,
      matricule: updated.matricule,
      dateNaissance: updated.date_naissance,
      pays: updated.pays,
      ville: updated.ville,
    })
  }

  if (loading) return <p className="salarie-profil-empty">Chargement de votre profil…</p>
  if (loadError || !profile) return <p className="salarie-profil-empty">{loadError ?? 'Profil introuvable.'}</p>

  return (
    <div className="salarie-profil">
      <PersonalInfoCard profile={profile} onUpdated={handleProfileUpdate} />
      <DocumentsCard profile={profile} onUpdated={handleProfileUpdate} />
      <ProfessionalInfoCard profile={profile} onUpdated={handleProfileUpdate} />
      <OtherInfoCard profile={profile} onUpdated={handleProfileUpdate} />
    </div>
  )
}

const frNumber = (value: number, decimals = 2) => value.toFixed(decimals).replace('.', ',')

const monthlyEhs = [
  { month: 'Déc. 2024', value: 52.3 },
  { month: 'Janv. 2025', value: 61.2 },
  { month: 'Fév. 2025', value: 72.8 },
  { month: 'Mars 2025', value: 85.1 },
  { month: 'Avr. 2025', value: 89.3 },
  { month: 'Mai 2025', value: 67.5 },
]

const ehsByProject = [
  { name: 'Projet CGA', value: 27, color: '#2a78d6' },
  { name: 'Projet PADESCE', value: 18, color: '#eb6834' },
  { name: 'Projet PERLE', value: 12.5, color: '#4a3aa7' },
  { name: 'Projet TRANSFAGRI', value: 10, color: '#1baf7a' },
]

const dashboardStats = [
  { icon: BarChart3, iconClass: 'ehs', label: 'EHS consommés ce mois', value: '67,50', unit: 'EHS', sub: 'Sur 89,30 EHS consommés en Avril', progress: 75.6 },
  { icon: Clock, iconClass: 'temps', label: 'Temps total travaillé ce mois', value: '154h 20m', sub: 'Sur 168h ce mois', progress: 91.8 },
  { icon: CheckCircle2, iconClass: 'taches', label: 'Tâches terminées ce mois', value: '18', sub: 'Sur 24 tâches', progress: 75.0 },
  { icon: Briefcase, iconClass: 'projets', label: 'Projets actifs', value: '4', sub: 'Sur 7 projets ce mois' },
  { icon: Wallet, iconClass: 'salaire', label: 'Salaire estimatif', value: '542 000', unit: 'FCFA', sub: 'Détails dans Rémunération', link: true },
  { icon: Gift, iconClass: 'prime', label: 'Prime estimative', value: '58 000', unit: 'FCFA', sub: 'Détails dans Rémunération', link: true },
]

const bottomStats = [
  { icon: Calendar, iconClass: 'conge', label: 'Solde de congés', value: '12', unit: 'jours', sub: 'Sur 25 jours/an', link: 'Voir le détail' },
  { icon: FileText, iconClass: 'attente', label: 'Demandes en attente', value: '1', sub: null, link: 'Voir mes demandes' },
  { icon: ShieldAlert, iconClass: 'sanction', label: 'Sanctions actives', value: '0', sub: null, link: 'Voir le détail' },
  { icon: Wallet, iconClass: 'avance', label: 'Avances en cours', value: '150 000', unit: 'FCFA', sub: 'Reste à rembourser 120 000 FCFA', link: 'Voir le détail' },
]

const notifications = [
  { icon: Calendar, iconClass: 'conge', text: <>Votre demande de congé du <strong>05/06/2025</strong> au <strong>07/06/2025</strong> est en attente.</>, time: 'Il y a 1 heure' },
  { icon: CheckCircle2, iconClass: 'avance', text: <>Votre demande d’avance de <strong>150 000 FCFA</strong> a été acceptée.</>, time: 'Il y a 1 jour' },
  { icon: FileText, iconClass: 'paie', text: <>Votre fiche de paie de <strong>Mai 2025</strong> est disponible.</>, time: 'Il y a 2 jours' },
  { icon: ShieldAlert, iconClass: 'sanction', text: 'Une nouvelle sanction a été enregistrée.', time: 'Il y a 3 jours' },
  { icon: Bell, iconClass: 'rappel', text: <><strong>Rappel :</strong> Réunion d’équipe prévue demain à 10h00.</>, time: 'Il y a 5 jours' },
]

function DashboardStatCard({ icon: Icon, iconClass, label, value, unit, sub, progress, link }: { icon: typeof BarChart3; iconClass: string; label: string; value: string; unit?: string; sub?: string | null; progress?: number; link?: boolean }) {
  return (
    <article className="salarie-dash-stat">
      <span className={`salarie-dash-stat-icon ${iconClass}`}><Icon size={18} strokeWidth={2} /></span>
      <div>
        <span className="salarie-dash-stat-label">{label}</span>
        <strong>{value}{unit && <small> {unit}</small>}</strong>
        {sub && (link
          ? <a className="salarie-dash-stat-link">{sub} <ArrowRight size={11} strokeWidth={2.4} /></a>
          : <small className="salarie-dash-stat-sub">{sub}</small>)}
        {typeof progress === 'number' && (
          <div className="salarie-dash-progress">
            <span className="salarie-dash-progress-track"><i style={{ width: `${progress}%` }} /></span>
            <b>{frNumber(progress, 1)}%</b>
          </div>
        )}
      </div>
    </article>
  )
}

function LineChart() {
  const width = 600
  const height = 220
  const left = 34
  const right = 592
  const top = 26
  const bottom = 180
  const ticks = [0, 20, 40, 60, 80, 100]
  const step = (right - left) / (monthlyEhs.length - 1)
  const valueToY = (value: number) => bottom - (value / 100) * (bottom - top)
  const points = monthlyEhs.map((entry, index) => ({ ...entry, x: left + index * step, y: valueToY(entry.value) }))
  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${bottom} L ${points[0].x} ${bottom} Z`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="salarie-linechart" role="img" aria-label="Évolution mensuelle des EHS consommés">
      {ticks.map((tick) => {
        const y = valueToY(tick)
        return (
          <g key={tick}>
            <line x1={left} x2={right} y1={y} y2={y} className="salarie-chart-grid" />
            <text x={left - 10} y={y + 3} className="salarie-chart-axis" textAnchor="end">{tick}</text>
          </g>
        )
      })}
      <path d={areaPath} className="salarie-chart-area" />
      <path d={linePath} className="salarie-chart-line" />
      {points.map((point, index) => {
        const anchor = index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'
        return (
          <g key={point.month}>
            <circle cx={point.x} cy={point.y} r={4} className="salarie-chart-dot" />
            <text x={point.x} y={point.y - 12} className="salarie-chart-value" textAnchor={anchor}>{frNumber(point.value)}</text>
            <text x={point.x} y={bottom + 20} className="salarie-chart-axis" textAnchor={anchor}>{point.month}</text>
          </g>
        )
      })}
    </svg>
  )
}

function DonutChart() {
  const size = 200
  const center = size / 2
  const radius = 70
  const strokeWidth = 30
  const circumference = 2 * Math.PI * radius
  const gap = 4
  const total = ehsByProject.reduce((sum, entry) => sum + entry.value, 0)

  const segments = ehsByProject.reduce<{ name: string; value: number; color: string; dash: number; offset: number; percent: number }[]>((acc, entry) => {
    const offset = acc.length > 0 ? acc[acc.length - 1].offset + (acc[acc.length - 1].dash + gap) : 0
    const raw = (entry.value / total) * circumference
    acc.push({ ...entry, dash: Math.max(raw - gap, 0), offset, percent: (entry.value / total) * 100 })
    return acc
  }, [])

  return (
    <div className="salarie-donut-wrap">
      <svg viewBox={`0 0 ${size} ${size}`} className="salarie-donut" role="img" aria-label="Répartition des EHS par projet">
        <g transform={`rotate(-90 ${center} ${center})`}>
          {segments.map((segment) => (
            <circle
              key={segment.name}
              cx={center} cy={center} r={radius} fill="none"
              stroke={segment.color} strokeWidth={strokeWidth}
              strokeDasharray={`${segment.dash} ${circumference - segment.dash}`}
              strokeDashoffset={-segment.offset}
            />
          ))}
        </g>
        <text x={center} y={center - 6} textAnchor="middle" className="salarie-donut-label">Total</text>
        <text x={center} y={center + 16} textAnchor="middle" className="salarie-donut-total">{frNumber(total)}</text>
        <text x={center} y={center + 32} textAnchor="middle" className="salarie-donut-label">EHS</text>
      </svg>
      <ul className="salarie-donut-legend">
        {segments.map((segment) => (
          <li key={segment.name}>
            <span style={{ background: segment.color }} />
            <div>
              <strong>{segment.name}</strong>
              <small>{frNumber(segment.value)} EHS ({frNumber(segment.percent, 1)}%)</small>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function DashboardTab({ session }: { session: Session }) {
  const [periode, setPeriode] = useState(PERIODES[0])

  return (
    <div className="salarie-dashboard">
      <div className="salarie-tab-filter-row">
        <PeriodeFilter value={periode} onChange={setPeriode} />
      </div>

      <div className="salarie-dash-greeting">
        <span className="salarie-dash-wave"><Hand size={26} strokeWidth={2} /></span>
        <div className="salarie-dash-greeting-text">
          <h3>Bonjour {session.firstName} {session.lastName},</h3>
          <p>
            Ce mois-ci vous avez travaillé sur <strong>4 projets</strong>, réalisé <strong>18 tâches</strong>, consommé <strong>67,5 EHS</strong>,
            pour un temps total de <strong>154 h 20 min</strong>. Votre rémunération estimative est de <strong>542 000 FCFA</strong>,
            dont <strong>58 000 FCFA</strong> de primes. Vous avez <strong>1 demande de congé en attente</strong> et <strong>aucune sanction active</strong>.
          </p>
        </div>
        <span className="salarie-dash-illustration" aria-hidden="true">
          <Sparkles size={34} strokeWidth={1.4} />
        </span>
      </div>

      <div className="salarie-dash-stats">
        {dashboardStats.map((stat) => <DashboardStatCard key={stat.label} {...stat} />)}
      </div>

      <div className="salarie-dash-panels">
        <section className="salarie-panel salarie-dash-chart-card">
          <div className="salarie-dash-panel-heading">
            <h3>Évolution mensuelle des EHS consommés</h3>
            <label className="salarie-filter">6 derniers mois<ChevronDown size={13} strokeWidth={2} /></label>
          </div>
          <LineChart />
        </section>

        <section className="salarie-panel salarie-dash-donut-card">
          <div className="salarie-dash-panel-heading">
            <h3>Répartition des EHS par projet (Mai 2025)</h3>
          </div>
          <DonutChart />
        </section>

        <section className="salarie-panel salarie-dash-notifications">
          <div className="salarie-dash-panel-heading">
            <h3>Dernières notifications</h3>
            <a>Voir tout</a>
          </div>
          <ul className="salarie-notif-list">
            {notifications.map((notif, index) => {
              const Icon = notif.icon
              return (
                <li key={index}>
                  <span className={`salarie-notif-icon ${notif.iconClass}`}><Icon size={14} strokeWidth={2} /></span>
                  <div>
                    <p>{notif.text}</p>
                    <small>{notif.time}</small>
                  </div>
                </li>
              )
            })}
          </ul>
          <a className="salarie-dash-stat-link salarie-notif-footer">Voir toutes les notifications <ArrowRight size={12} strokeWidth={2.4} /></a>
        </section>
      </div>

      <div className="salarie-dash-stats salarie-dash-stats-bottom">
        {bottomStats.map((stat) => (
          <article key={stat.label} className="salarie-dash-stat compact">
            <span className={`salarie-dash-stat-icon ${stat.iconClass}`}><stat.icon size={18} strokeWidth={2} /></span>
            <div>
              <span className="salarie-dash-stat-label">{stat.label}</span>
              <strong>{stat.value}{stat.unit && <small> {stat.unit}</small>}</strong>
              {stat.sub && <small className="salarie-dash-stat-sub">{stat.sub}</small>}
              {stat.link && <a className="salarie-dash-stat-link">{stat.link} <ArrowRight size={11} strokeWidth={2.4} /></a>}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

interface LigneRemu {
  label: string
  montant: number
}

const frMontant = (value: number) => Math.round(value).toLocaleString('fr-FR')

const elementsPositifs: LigneRemu[] = [
  { label: 'Salaire de base (fixe)', montant: 2000000 },
  { label: 'Primes de performance', montant: 58000 },
  { label: 'Prime de rattrapage', montant: 40000 },
]

const deductionsLegales: LigneRemu[] = [
  { label: 'Charges sociales (10,5%)', montant: 208290 },
  { label: 'Impôt sur le revenu', montant: 80000 },
  { label: 'Autres retenues', montant: 20000 },
]

const penalitesLignes: LigneRemu[] = [
  { label: 'Retard', montant: 15000 },
  { label: 'Demande d’explication', montant: 10000 },
  { label: 'Rappel à l’ordre', montant: 5000 },
]

const sumMontants = (lignes: LigneRemu[]) => lignes.reduce((sum, ligne) => sum + ligne.montant, 0)

const totalPositifs = sumMontants(elementsPositifs)
const totalDeductionsLegales = sumMontants(deductionsLegales)
const totalPenalites = sumMontants(penalitesLignes)
const netAPayer = totalPositifs - totalDeductionsLegales - totalPenalites

const penalitesDetails = [
  { type: 'Retard', motif: 'Retard sur tâche « Collecte des données »', montant: 15000, statut: 'Appliquée' },
  { type: 'Demande d’explication', motif: 'Justification demandée sur livrable en retard', montant: 10000, statut: 'Appliquée' },
  { type: 'Rappel à l’ordre', motif: 'Manquement aux règles internes', montant: 5000, statut: 'Appliquée' },
]

const remuStats = [
  { icon: Wallet, iconClass: 'salaire', label: 'Salaire de base', value: frMontant(2000000), unit: 'FCFA', sub: 'Fixe mensuel' },
  { icon: Gift, iconClass: 'prime', label: 'Primes du mois', value: frMontant(58000), unit: 'FCFA', sub: 'Selon résultats' },
  { icon: Clock, iconClass: 'rattrapage', label: 'Prime de rattrapage', value: frMontant(40000), unit: 'FCFA', sub: 'Ajustement exceptionnel', tooltip: 'Régularisation exceptionnelle décidée par le pilotage.' },
  { icon: Percent, iconClass: 'taux', label: 'Taux de charges sociales', value: '10,5', unit: '%', sub: 'Employeur' },
  { icon: ArrowDownToLine, iconClass: 'deductions', label: 'Total déductions', value: `- ${frMontant(totalDeductionsLegales + totalPenalites)}`, unit: 'FCFA', sub: 'Retenues & sanctions' },
  { icon: Wallet2, iconClass: 'net', label: 'Net à payer', value: frMontant(netAPayer), unit: 'FCFA', sub: 'Après déductions' },
]

const repartitionElements = [
  { name: 'Salaire de base', montant: 2000000, color: '#2a78d6' },
  { name: 'Déductions légales', montant: totalDeductionsLegales, color: '#eb6834' },
  { name: 'Pénalités / Sanctions', montant: totalPenalites, color: '#4a3aa7' },
  { name: 'Primes (performance + rattrapage)', montant: 98000, color: '#1baf7a' },
]

function RemuColumn({ title, tone, lignes, totalLabel, total }: { title: string; tone: string; lignes: LigneRemu[]; totalLabel: string; total: number }) {
  return (
    <div className={`salarie-remu-col ${tone}`}>
      <h4>{title}</h4>
      <ul>
        {lignes.map((ligne) => (
          <li key={ligne.label}><span>{ligne.label}</span><b>{frMontant(ligne.montant)}</b></li>
        ))}
      </ul>
      <div className="salarie-remu-total"><span>{totalLabel}</span><b>{frMontant(total)}</b></div>
    </div>
  )
}

function RemuDonut() {
  const size = 200
  const center = size / 2
  const radius = 70
  const strokeWidth = 30
  const circumference = 2 * Math.PI * radius
  const gap = 4
  const weightTotal = repartitionElements.reduce((sum, entry) => sum + entry.montant, 0)

  const segments = repartitionElements.reduce<{ name: string; montant: number; color: string; dash: number; offset: number; percent: number }[]>((acc, entry) => {
    const offset = acc.length > 0 ? acc[acc.length - 1].offset + (acc[acc.length - 1].dash + gap) : 0
    const raw = (entry.montant / weightTotal) * circumference
    acc.push({ ...entry, dash: Math.max(raw - gap, 0), offset, percent: (entry.montant / totalPositifs) * 100 })
    return acc
  }, [])

  return (
    <div className="salarie-donut-wrap column">
      <svg viewBox={`0 0 ${size} ${size}`} className="salarie-donut" role="img" aria-label="Répartition des éléments de la rémunération">
        <g transform={`rotate(-90 ${center} ${center})`}>
          {segments.map((segment) => (
            <circle
              key={segment.name}
              cx={center} cy={center} r={radius} fill="none"
              stroke={segment.color} strokeWidth={strokeWidth}
              strokeDasharray={`${segment.dash} ${circumference - segment.dash}`}
              strokeDashoffset={-segment.offset}
            />
          ))}
        </g>
        <text x={center} y={center - 6} textAnchor="middle" className="salarie-donut-label">Total brut</text>
        <text x={center} y={center + 14} textAnchor="middle" className="salarie-donut-total">{frMontant(totalPositifs)}</text>
        <text x={center} y={center + 30} textAnchor="middle" className="salarie-donut-label">FCFA</text>
      </svg>
      <ul className="salarie-donut-legend remu">
        {segments.map((segment) => (
          <li key={segment.name}>
            <span style={{ background: segment.color }} />
            <strong>{segment.name}</strong>
            <div className="salarie-remu-legend-values">
              <b>{frNumber(segment.percent, 1)}%</b>
              <small>{frMontant(segment.montant)} FCFA</small>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function RemunerationTab() {
  const [periode, setPeriode] = useState(PERIODES[0])
  const [detailsVisibles, setDetailsVisibles] = useState(true)

  return (
    <div className="salarie-remuneration">
      <div className="salarie-remu-heading">
        <div>
          <h2>Récapitulatif de rémunération</h2>
          <PeriodeFilter value={periode} onChange={setPeriode} />
        </div>
        <div className="salarie-remu-heading-actions">
          <button type="button" className="salarie-ghost-btn" onClick={() => setDetailsVisibles((value) => !value)}>
            {detailsVisibles ? <EyeOff size={14} strokeWidth={2} /> : <Eye size={14} strokeWidth={2} />}
            {detailsVisibles ? 'Masquer les détails' : 'Afficher les détails'}
          </button>
          <button className="salarie-primary-btn"><Download size={14} strokeWidth={2.4} />Télécharger le bulletin de paie (PDF)</button>
        </div>
      </div>

      <div className="salarie-dash-stats salarie-remu-stats">
        {remuStats.map((stat) => (
          <article key={stat.label} className="salarie-dash-stat">
            <span className={`salarie-dash-stat-icon ${stat.iconClass}`}><stat.icon size={18} strokeWidth={2} /></span>
            <div>
              <span className="salarie-dash-stat-label">{stat.label}{stat.tooltip && <span className="salarie-remu-tooltip" title={stat.tooltip}><HelpCircle size={11} strokeWidth={2} /></span>}</span>
              <strong>{stat.value}{stat.unit && <small> {stat.unit}</small>}</strong>
              <small className="salarie-dash-stat-sub">{stat.sub}</small>
            </div>
          </article>
        ))}
      </div>

      <div className="salarie-remu-panels">
        {detailsVisibles && (
          <section className="salarie-panel salarie-remu-detail-card">
            <div className="salarie-dash-panel-heading">
              <h3>Détail de la rémunération</h3>
              <PeriodeFilter value={periode} onChange={setPeriode} />
            </div>
            <div className="salarie-remu-columns">
              <RemuColumn title="1. Éléments positifs" tone="positif" lignes={elementsPositifs} totalLabel="Total éléments positifs (A)" total={totalPositifs} />
              <span className="salarie-remu-op">+</span>
              <RemuColumn title="2. Déductions légales" tone="deduction" lignes={deductionsLegales} totalLabel="Total déductions légales (B)" total={totalDeductionsLegales} />
              <span className="salarie-remu-op">+</span>
              <RemuColumn title="3. Pénalités / Sanctions" tone="penalite" lignes={penalitesLignes} totalLabel="Total pénalités (C)" total={totalPenalites} />
              <span className="salarie-remu-op">=</span>
              <div className="salarie-remu-col resultat">
                <h4>Résultat</h4>
                <ul>
                  <li><span>Éléments positifs (A)</span><b>{frMontant(totalPositifs)}</b></li>
                  <li><span>- Déductions légales (B)</span><b>- {frMontant(totalDeductionsLegales)}</b></li>
                  <li><span>- Pénalités (C)</span><b>- {frMontant(totalPenalites)}</b></li>
                </ul>
                <div className="salarie-remu-total net"><span>Net à payer (A - B - C)</span><b>{frMontant(netAPayer)}</b></div>
              </div>
            </div>
            <Note>Les montants sont exprimés en FCFA.</Note>
          </section>
        )}

        <div className="salarie-remu-side">
          {detailsVisibles && (
            <section className="salarie-panel salarie-remu-donut-card">
              <div className="salarie-dash-panel-heading"><h3>Répartition des éléments</h3></div>
              <RemuDonut />
            </section>
          )}

          {detailsVisibles && (
            <section className="salarie-panel salarie-remu-penalites-card">
              <div className="salarie-dash-panel-heading"><h3>Détails des pénalités - {periode}</h3></div>
              <div className="salarie-table-wrap">
                <table>
                  <thead>
                    <tr><th>Type de pénalité</th><th>Motif</th><th>Montant (FCFA)</th><th>Statut</th></tr>
                  </thead>
                  <tbody>
                    {penalitesDetails.map((ligne) => (
                      <tr key={ligne.type}>
                        <td><strong>{ligne.type}</strong></td>
                        <td>{ligne.motif}</td>
                        <td>- {frMontant(ligne.montant)}</td>
                        <td><span className="salarie-pill refusee">{ligne.statut}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="salarie-remu-total penalites"><span>Total pénalités</span><b>- {frMontant(totalPenalites)} FCFA</b></div>
            </section>
          )}

          <div className="salarie-info">
            <Info size={18} strokeWidth={2} />
            <div>
              <strong>Informations importantes</strong>
              <ul>
                <li>La valeur d’un EHS est fixée à 3 000 FCFA.</li>
                <li>Les primes sont calculées selon les critères définis par le pilotage.</li>
                <li>Les bulletins de paie sont disponibles après validation.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <section className="salarie-panel salarie-remu-history-card">
        <div className="salarie-dash-panel-heading">
          <h3>Récapitulatif des activités</h3>
          <PeriodeFilter value={periode} onChange={setPeriode} label="Mois" />
        </div>
        <div className="salarie-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Projet</th>
                <th>Tâche</th>
                <th>Date de début</th>
                <th>Date de fin</th>
                <th>Temps total</th>
                <th>EHS consommés</th>
              </tr>
            </thead>
            <tbody>
              {tachesHistorique.map((tache) => (
                <tr key={tache.tache}>
                  <td><ProjetBadge label={tache.projet} tone={tache.badge} /></td>
                  <td><strong>{tache.tache}</strong></td>
                  <td>{tache.dateDebut}</td>
                  <td>{tache.dateFin}</td>
                  <td>{tache.tempsTotal}</td>
                  <td>{frNumber(tache.ehs)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="salarie-table-total">
                <td colSpan={4}>Total</td>
                <td>{totalTempsHistorique}</td>
                <td>{frNumber(totalEhsHistorique)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="salarie-table-footer">
          <span>Affichage de 1 à {tachesHistorique.length} sur {tachesHistorique.length} activités</span>
          <div className="salarie-pagination">
            <button disabled><ChevronsLeft size={13} /></button>
            <button disabled><ChevronLeft size={13} /></button>
            <button className="active">1</button>
            <button disabled><ChevronRight size={13} /></button>
            <button disabled><ChevronsRight size={13} /></button>
          </div>
        </div>
      </section>
    </div>
  )
}

interface TacheEnCours {
  projet: string
  badge: string
  tache: string
  dateDebut: string
  dateEcheance: string
  tempsPasse: string
  ehs: number
  statut: 'En cours' | 'En retard'
}

interface TacheHistorique {
  projet: string
  badge: string
  tache: string
  dateDebut: string
  dateFin: string
  tempsTotal: string
  ehs: number
  validePar: string
  dateValidation: string
}

const tachesEnCours: TacheEnCours[] = [
  { projet: 'CGA', badge: 'blue', tache: 'Élaboration du rapport financier mensuel', dateDebut: '02/05/2025', dateEcheance: '05/06/2025', tempsPasse: '18h 30m', ehs: 8.5, statut: 'En cours' },
  { projet: 'PADESCE', badge: 'violet', tache: 'Suivi des formations - Cohorte B', dateDebut: '05/05/2025', dateEcheance: '10/06/2025', tempsPasse: '16h 20m', ehs: 6, statut: 'En cours' },
  { projet: 'PERLE', badge: 'green', tache: 'Tests module Staffing', dateDebut: '07/05/2025', dateEcheance: '20/05/2025', tempsPasse: '14h 10m', ehs: 5, statut: 'En cours' },
  { projet: 'TRANSFAGRI', badge: 'red', tache: 'Analyse des données bénéficiaires', dateDebut: '03/05/2025', dateEcheance: '18/05/2025', tempsPasse: '10h 05m', ehs: 4, statut: 'En retard' },
  { projet: 'DIEGO', badge: 'indigo', tache: 'Collecte et traitement des données', dateDebut: '08/05/2025', dateEcheance: '22/05/2025', tempsPasse: '07h 30m', ehs: 3, statut: 'En cours' },
  { projet: 'PILOTAGE INTERNE', badge: 'gray', tache: 'Réunions et Reporting', dateDebut: '09/05/2025', dateEcheance: '30/05/2025', tempsPasse: '05h 20m', ehs: 2.5, statut: 'En cours' },
]

const totalTempsPasse = '71h 55m'
const totalEhsEnCours = tachesEnCours.reduce((sum, tache) => sum + tache.ehs, 0)

const tachesHistorique: TacheHistorique[] = [
  { projet: 'CGA', badge: 'blue', tache: 'Collecte des pièces comptables', dateDebut: '01/05/2025', dateFin: '15/05/2025', tempsTotal: '20h 15m', ehs: 8, validePar: 'Ajara LAMARE', dateValidation: '16/05/2025' },
  { projet: 'PADESCE', badge: 'violet', tache: 'Suivi des formations - Cohorte A', dateDebut: '10/05/2025', dateFin: '25/05/2025', tempsTotal: '30h 00m', ehs: 12, validePar: 'Diego NGOUNOU', dateValidation: '26/05/2025' },
  { projet: 'PERLE', badge: 'green', tache: 'Conception des spécifications', dateDebut: '05/05/2025', dateFin: '20/05/2025', tempsTotal: '25h 10m', ehs: 10, validePar: 'Théodore BESSALA', dateValidation: '21/05/2025' },
  { projet: 'TRANSFAGRI', badge: 'red', tache: 'Rapport diagnostic préliminaire', dateDebut: '02/05/2025', dateFin: '12/05/2025', tempsTotal: '18h 45m', ehs: 7.5, validePar: 'Pamella GUEBEDIANG', dateValidation: '13/05/2025' },
  { projet: 'DIEGO', badge: 'indigo', tache: 'Saisie et vérification des données', dateDebut: '03/05/2025', dateFin: '17/05/2025', tempsTotal: '22h 30m', ehs: 9, validePar: 'Ajara LAMARE', dateValidation: '18/05/2025' },
]

const parseTempsLabel = (label: string) => {
  const match = label.match(/(\d+)h\s*(\d+)?/)
  if (!match) return 0
  return Number(match[1]) * 60 + Number(match[2] ?? 0)
}

const formatMinutesToTemps = (totalMinutes: number) => `${Math.floor(totalMinutes / 60)}h ${String(totalMinutes % 60).padStart(2, '0')}m`

const totalTempsHistorique = formatMinutesToTemps(tachesHistorique.reduce((sum, tache) => sum + parseTempsLabel(tache.tempsTotal), 0))
const totalEhsHistorique = tachesHistorique.reduce((sum, tache) => sum + tache.ehs, 0)

function ProjetBadge({ label, tone }: { label: string; tone: string }) {
  return <span className={`salarie-project-badge ${tone}`}>{label}</span>
}

function TacheStatutPill({ statut }: { statut: 'En cours' | 'En retard' }) {
  return <span className={`salarie-pill ${statut === 'En retard' ? 'refusee' : 'attente'}`}>{statut}</span>
}

type EnCoursColumnId = 'projet' | 'tache' | 'dateDebut' | 'dateEcheance' | 'tempsPasse' | 'ehs' | 'statut'

const EN_COURS_COLUMNS: ColumnDef<EnCoursColumnId>[] = [
  { id: 'projet', label: 'Projet' },
  { id: 'tache', label: 'Tâche' },
  { id: 'dateDebut', label: 'Date de début' },
  { id: 'dateEcheance', label: 'Date d’échéance' },
  { id: 'tempsPasse', label: 'Temps passé' },
  { id: 'ehs', label: 'EHS consommés' },
  { id: 'statut', label: 'Statut' },
]

const EN_COURS_LEFT_IDS: EnCoursColumnId[] = ['projet', 'tache', 'dateDebut', 'dateEcheance']

type HistoriqueColumnId = 'projet' | 'tache' | 'dateDebut' | 'dateFin' | 'tempsTotal' | 'ehs' | 'livrable' | 'validePar' | 'dateValidation'

const HISTORIQUE_COLUMNS: ColumnDef<HistoriqueColumnId>[] = [
  { id: 'projet', label: 'Projet' },
  { id: 'tache', label: 'Tâche' },
  { id: 'dateDebut', label: 'Date de début' },
  { id: 'dateFin', label: 'Date de fin' },
  { id: 'tempsTotal', label: 'Temps total' },
  { id: 'ehs', label: 'EHS consommés' },
  { id: 'livrable', label: 'Livrable' },
  { id: 'validePar', label: 'Validé par' },
  { id: 'dateValidation', label: 'Date de validation' },
]

function ActivitesTab() {
  const [periode, setPeriode] = useState(PERIODES[0])
  const [viewEnCours, setViewEnCours] = useState<TacheEnCours | null>(null)
  const [viewHistorique, setViewHistorique] = useState<TacheHistorique | null>(null)
  const enCoursCols = useColumnVisibility(EN_COURS_COLUMNS)
  const historiqueCols = useColumnVisibility(HISTORIQUE_COLUMNS)
  const enCoursLeftCount = enCoursCols.visibleColumns.filter((c) => EN_COURS_LEFT_IDS.includes(c.id)).length
  const enCoursRightCount = (enCoursCols.visibleColumns.some((c) => c.id === 'statut') ? 1 : 0) + 1

  return (
    <div className="salarie-activites">
      <div className="salarie-heading">
        <h2>Mes activités</h2>
        <p>Consultez le détail de vos tâches en cours et l’historique de vos tâches effectuées.</p>
      </div>

      <div className="salarie-filters">
        <label className="salarie-filter-field">
          <span>Période</span>
          <div className="salarie-filter-control select">
            <Calendar size={13} strokeWidth={2} />
            <select value={periode} onChange={(event) => setPeriode(event.target.value)}>
              {PERIODES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </label>
        <label className="salarie-filter-field">
          <span>Projet</span>
          <div className="salarie-filter-control select">Tous les projets<ChevronDown size={13} strokeWidth={2} /></div>
        </label>
        <label className="salarie-filter-field">
          <span>Statut</span>
          <div className="salarie-filter-control select">Tous les statuts<ChevronDown size={13} strokeWidth={2} /></div>
        </label>
        <button className="salarie-ghost-btn salarie-filter-reset"><RotateCcw size={13} strokeWidth={2} />Réinitialiser</button>
      </div>

      <section className="salarie-panel">
        <div className="salarie-panel-heading">
          <div className="salarie-panel-title"><h3>Détail des tâches en cours</h3><span className="salarie-count-badge">{tachesEnCours.length} tâches</span></div>
          <div className="salarie-panel-actions">
            <ColumnsMenu columns={EN_COURS_COLUMNS} hiddenColumns={enCoursCols.hiddenColumns} onToggle={enCoursCols.toggleColumn} />
            <button className="salarie-ghost-btn"><Download size={13} strokeWidth={2} />Exporter</button>
          </div>
        </div>
        <div className="salarie-table-wrap">
          <table>
            <thead>
              <tr>
                {enCoursCols.visibleColumns.map((c) => <th key={c.id}>{c.label}</th>)}
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {tachesEnCours.map((tache) => (
                <tr key={tache.tache}>
                  {enCoursCols.visibleColumns.map((c) => {
                    if (c.id === 'projet') return <td key={c.id}><ProjetBadge label={tache.projet} tone={tache.badge} /></td>
                    if (c.id === 'tache') return <td key={c.id}>{tache.tache}</td>
                    if (c.id === 'dateDebut') return <td key={c.id}>{tache.dateDebut}</td>
                    if (c.id === 'dateEcheance') return <td key={c.id}>{tache.dateEcheance}</td>
                    if (c.id === 'tempsPasse') return <td key={c.id}>{tache.tempsPasse}</td>
                    if (c.id === 'ehs') return <td key={c.id}>{frNumber(tache.ehs)}</td>
                    return <td key={c.id}><TacheStatutPill statut={tache.statut} /></td>
                  })}
                  <td className="salarie-actions"><button aria-label="Voir la tâche" onClick={() => setViewEnCours(tache)}><Eye size={14} strokeWidth={2} /></button></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="salarie-table-total">
                {enCoursLeftCount > 0 && <td colSpan={enCoursLeftCount}>Total</td>}
                {enCoursCols.visibleColumns.some((c) => c.id === 'tempsPasse') && <td>{totalTempsPasse}</td>}
                {enCoursCols.visibleColumns.some((c) => c.id === 'ehs') && <td>{frNumber(totalEhsEnCours)}</td>}
                <td colSpan={enCoursRightCount}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className="salarie-panel">
        <div className="salarie-panel-heading">
          <div className="salarie-panel-title"><h3>Historique des tâches effectuées</h3><span className="salarie-count-badge">12 tâches</span></div>
          <div className="salarie-panel-actions">
            <PeriodeFilter value={periode} onChange={setPeriode} label="Mois" />
            <ColumnsMenu columns={HISTORIQUE_COLUMNS} hiddenColumns={historiqueCols.hiddenColumns} onToggle={historiqueCols.toggleColumn} />
            <button className="salarie-ghost-btn"><Download size={13} strokeWidth={2} />Exporter</button>
          </div>
        </div>
        <div className="salarie-table-wrap">
          <table>
            <thead>
              <tr>
                {historiqueCols.visibleColumns.map((c) => <th key={c.id}>{c.label}</th>)}
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {tachesHistorique.map((tache) => (
                <tr key={tache.tache}>
                  {historiqueCols.visibleColumns.map((c) => {
                    if (c.id === 'projet') return <td key={c.id}><ProjetBadge label={tache.projet} tone={tache.badge} /></td>
                    if (c.id === 'tache') return <td key={c.id}>{tache.tache}</td>
                    if (c.id === 'dateDebut') return <td key={c.id}>{tache.dateDebut}</td>
                    if (c.id === 'dateFin') return <td key={c.id}>{tache.dateFin}</td>
                    if (c.id === 'tempsTotal') return <td key={c.id}>{tache.tempsTotal}</td>
                    if (c.id === 'ehs') return <td key={c.id}>{frNumber(tache.ehs)}</td>
                    if (c.id === 'livrable') return <td key={c.id}><span className="salarie-livrable-icon"><FileText size={13} strokeWidth={2} /></span></td>
                    if (c.id === 'validePar') return <td key={c.id}>{tache.validePar}</td>
                    return <td key={c.id}>{tache.dateValidation}</td>
                  })}
                  <td className="salarie-actions"><button aria-label="Voir la tâche" onClick={() => setViewHistorique(tache)}><Eye size={14} strokeWidth={2} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="salarie-table-footer">
          <span>Affichage de 1 à 5 sur 12 tâches</span>
          <div className="salarie-pagination">
            <button disabled><ChevronsLeft size={13} /></button>
            <button disabled><ChevronLeft size={13} /></button>
            <button className="active">1</button>
            <button>2</button>
            <button>3</button>
            <button><ChevronRight size={13} /></button>
            <button><ChevronsRight size={13} /></button>
          </div>
        </div>
      </section>

      {viewEnCours && (
        <Lightbox title={viewEnCours.tache} onClose={() => setViewEnCours(null)}>
          <div className="salarie-info-col">
            <InfoRow label="Projet" value={<ProjetBadge label={viewEnCours.projet} tone={viewEnCours.badge} />} />
            <InfoRow label="Date de début" value={viewEnCours.dateDebut} />
            <InfoRow label="Date d’échéance" value={viewEnCours.dateEcheance} />
            <InfoRow label="Temps passé" value={viewEnCours.tempsPasse} />
            <InfoRow label="EHS consommés" value={frNumber(viewEnCours.ehs)} />
            <InfoRow label="Statut" value={<TacheStatutPill statut={viewEnCours.statut} />} />
          </div>
        </Lightbox>
      )}

      {viewHistorique && (
        <Lightbox title={viewHistorique.tache} onClose={() => setViewHistorique(null)}>
          <div className="salarie-info-col">
            <InfoRow label="Projet" value={<ProjetBadge label={viewHistorique.projet} tone={viewHistorique.badge} />} />
            <InfoRow label="Date de début" value={viewHistorique.dateDebut} />
            <InfoRow label="Date de fin" value={viewHistorique.dateFin} />
            <InfoRow label="Temps total" value={viewHistorique.tempsTotal} />
            <InfoRow label="EHS consommés" value={frNumber(viewHistorique.ehs)} />
            <InfoRow label="Validé par" value={viewHistorique.validePar} />
            <InfoRow label="Date de validation" value={viewHistorique.dateValidation} />
          </div>
        </Lightbox>
      )}
    </div>
  )
}
