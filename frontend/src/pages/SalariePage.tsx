import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
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
  FileText,
  Gift,
  Hand,
  IdCard,
  Info,
  LayoutDashboard,
  ListChecks,
  Plus,
  ShieldAlert,
  Sparkles,
  Trash2,
  UploadCloud,
  User,
  Wallet,
  X,
} from 'lucide-react'
import passportCover from '../assets/passport.jpg'
import profilePhoto from '../assets/profile.jpg'
import './SalariePage.css'

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

const congeDemandes: CongeDemande[] = [
  { id: 'CONG-2025-005', dateDemande: '15/05/2025', type: 'Congé annuel payé', dateDebut: '02/06/2025', dateFin: '06/06/2025', duree: 5, motif: 'Vacances personnelles', statut: 'Approuvée', approuvePar: 'Ajara LAMARE', approuveRole: 'Manager', dateReponse: '17/05/2025' },
  { id: 'CONG-2025-004', dateDemande: '05/05/2025', type: 'Congé exceptionnel', dateDebut: '20/05/2025', dateFin: '21/05/2025', duree: 2, motif: 'Événement familial', statut: 'En attente', approuvePar: 'Ajara LAMARE', approuveRole: 'Manager', dateReponse: '-' },
]

const avanceDemandes: AvanceDemande[] = [
  { id: 'AVC-2025-003', dateDemande: '12/05/2025', montant: 150000, motif: 'Frais médicaux', remboursement: 'Prélèvement sur 3 salaires', remboursementDetail: '(50 000 FCFA / mois)', statut: 'En attente', approuvePar: 'Théodore BESSALA', approuveRole: 'Responsable des Ressources (RE)', dateReponse: '-' },
]

function countByStatut<T extends { statut: Statut }>(items: T[], statut: Statut) {
  return items.filter((item) => item.statut === statut).length
}

const tabs = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { id: 'activites', label: 'Activités', icon: ListChecks },
  { id: 'remuneration', label: 'Rémunération', icon: Banknote },
  { id: 'demandes', label: 'Demandes', icon: FileText },
  { id: 'profil', label: 'Mon profil', icon: User },
] as const

type TabId = (typeof tabs)[number]['id']

export default function SalariePage() {
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

      {activeTab === 'dashboard' ? <DashboardTab />
        : activeTab === 'demandes' ? <DemandesTab />
        : activeTab === 'profil' ? <ProfilTab />
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

function Lightbox({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return createPortal(
    <div className="salarie-lightbox-overlay" onClick={onClose}>
      <div className="salarie-lightbox" onClick={(event) => event.stopPropagation()}>
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

function DemandesTab() {
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
            <label className="salarie-filter"><Calendar size={13} strokeWidth={2} />Filtrer par mois : <b>Mai 2025</b><ChevronDown size={13} strokeWidth={2} /></label>
            <button className="salarie-primary-btn"><Plus size={14} strokeWidth={2.4} />Nouvelle demande de congé</button>
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
                    <button aria-label="Voir la demande"><Eye size={14} strokeWidth={2} /></button>
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
            <label className="salarie-filter"><Calendar size={13} strokeWidth={2} />Filtrer par mois : <b>Mai 2025</b><ChevronDown size={13} strokeWidth={2} /></label>
            <button className="salarie-primary-btn"><Download size={14} strokeWidth={2.4} />Nouvelle demande d’avance</button>
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
                    <button aria-label="Voir la demande"><Eye size={14} strokeWidth={2} /></button>
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
    </div>
  )
}

const personalInfoLeft: [string, ReactNode][] = [
  ['Matricule', 'IT001V1'],
  ['Nom complet', 'Maxwell Ebongue'],
  ['Date de naissance', '15/03/1992'],
  ['Lieu de naissance', 'Yaoundé, Cameroun'],
  ['Nationalité', 'Camerounaise'],
  ['Situation matrimoniale', 'Célibataire'],
  ['Nombre d’enfants', '0'],
]

const personalInfoRight: [string, ReactNode][] = [
  ['Téléphone', '+237 6 78 90 12 34'],
  ['Email professionnel', 'maxwell.ebongue@perle.com'],
  ['Email personnel', 'maxwell.ebongue@gmail.com'],
  ['Adresse', <>Quartier Bastos, Yaoundé<br />BP 12345 Yaoundé</>],
  ['Date d’embauche', '05/01/2024'],
  ['Statut', <span className="salarie-pill approuvee">Actif</span>],
  ['Poste', 'Analyste des données'],
  ['Équipe', 'VRAI'],
  ['Grade', '6'],
]

function PersonalInfoCard() {
  return (
    <section className="salarie-panel salarie-profil-card personal-card">
      <h3>Informations personnelles</h3>
      <div className="salarie-personal-body">
        <div className="salarie-avatar-block">
          <img src={profilePhoto} alt="Maxwell Ebongue" className="salarie-avatar-photo" />
          <button className="salarie-ghost-btn"><Camera size={13} strokeWidth={2} />Modifier la photo</button>
        </div>
        <div className="salarie-info-columns">
          <div className="salarie-info-col">{personalInfoLeft.map(([label, value]) => <InfoRow key={label} label={label} value={value} />)}</div>
          <div className="salarie-info-col">{personalInfoRight.map(([label, value]) => <InfoRow key={label} label={label} value={value} />)}</div>
        </div>
      </div>
    </section>
  )
}

const documents: { icon?: typeof IdCard; image?: string; title: string; rows: [string, ReactNode][] }[] = [
  {
    icon: IdCard,
    title: 'Carte Nationale d’Identité (CNI)',
    rows: [
      ['Numéro', '010123456789'],
      ['Date d’expiration', '20/11/2031'],
      ['Statut', <span className="salarie-pill approuvee">Valide</span>],
    ],
  },
  {
    image: passportCover,
    title: 'Autres pièces d’identité',
    rows: [
      ['Type', 'Passeport'],
      ['Numéro', 'A12345678'],
      ['Date d’expiration', '14/08/2028'],
      ['Statut', <span className="salarie-pill approuvee">Valide</span>],
    ],
  },
]

function DocumentsCard() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const openDoc = openIndex !== null ? documents[openIndex] : null

  return (
    <section className="salarie-panel salarie-profil-card documents-card">
      <h3>Documents officiels</h3>
      <div className="salarie-document-list">
        {documents.map((doc, index) => {
          const Icon = doc.icon
          return (
            <article key={doc.title} className="salarie-document">
              {doc.image
                ? <img src={doc.image} alt={doc.title} className="salarie-document-photo" />
                : Icon && <span className="salarie-document-thumb"><Icon size={28} strokeWidth={1.6} /></span>}
              <div className="salarie-document-body">
                <strong>{doc.title}</strong>
                {doc.rows.map(([label, value]) => <InfoRow key={label} label={label} value={value} />)}
              </div>
              <div className="salarie-actions">
                <button aria-label="Voir le document" onClick={() => setOpenIndex(index)}><Eye size={14} strokeWidth={2} /></button>
                <button aria-label="Télécharger le document"><Download size={14} strokeWidth={2} /></button>
              </div>
            </article>
          )
        })}
      </div>
      <Note>Veuillez vous assurer que vos documents sont à jour. Les documents expirés peuvent impacter certains processus (contrat, missions, etc.).</Note>

      {openDoc && (
        <Lightbox title={openDoc.title} onClose={() => setOpenIndex(null)}>
          {openDoc.image
            ? <img src={openDoc.image} alt={openDoc.title} className="salarie-lightbox-image" />
            : (
              <div className="salarie-lightbox-placeholder">
                {openDoc.icon && <openDoc.icon size={40} strokeWidth={1.4} />}
                <p>Aucun visuel n’est disponible pour ce document.</p>
              </div>
            )}
          <div className="salarie-info-col">{openDoc.rows.map(([label, value]) => <InfoRow key={label} label={label} value={value} />)}</div>
        </Lightbox>
      )}
    </section>
  )
}

const professionalInfo: [string, ReactNode][] = [
  ['Département', 'Informatique'],
  ['Responsable hiérarchique', 'Ajara LAMARE (Manager)'],
  ['Date d’embauche', '05/01/2024'],
  ['Type de contrat', 'CDI'],
  ['Période d’essai', 'Terminée'],
  ['Ancienneté', '1 an, 4 mois et 26 jours'],
  ['Lieu de travail', 'Yaoundé - Siège'],
  ['Temps de travail', 'Temps plein'],
  ['Horaire', '08h30 - 17h30 (Lun - Ven)'],
]

const competencesPrincipales = ['Analyse de données', 'Excel avancé', 'Tableau de bord & Reporting', 'SQL', 'Power BI']
const competencesSecondaires = ['Python', 'Gestion de projet', 'Communication']

function ProfessionalInfoCard() {
  return (
    <section className="salarie-panel salarie-profil-card professional-card">
      <h3>Informations professionnelles</h3>
      <div className="salarie-professional-body">
        <div className="salarie-info-col">{professionalInfo.map(([label, value]) => <InfoRow key={label} label={label} value={value} />)}</div>
        <div className="salarie-skills">
          <div>
            <h4>Compétences principales</h4>
            <ul>{competencesPrincipales.map((skill) => <li key={skill} className="checked"><CheckCircle2 size={14} strokeWidth={2} />{skill}</li>)}</ul>
          </div>
          <div>
            <h4>Compétences secondaires</h4>
            <ul>{competencesSecondaires.map((skill) => <li key={skill}><Circle size={14} strokeWidth={2} />{skill}</li>)}</ul>
          </div>
        </div>
      </div>
    </section>
  )
}

function CvCard() {
  const [previewOpen, setPreviewOpen] = useState(false)

  return (
    <section className="salarie-panel salarie-profil-card cv-card">
      <h3>CV à jour</h3>
      <div className="salarie-cv-file">
        <span className="salarie-cv-icon"><FileText size={20} strokeWidth={1.8} /></span>
        <div>
          <strong>Maxwell_Ebongue_CV.pdf</strong>
          <small>Dernière mise à jour : 10/05/2025</small>
          <small>Taille : 512 Ko</small>
        </div>
        <div className="salarie-actions">
          <button aria-label="Voir le CV" onClick={() => setPreviewOpen(true)}><Eye size={14} strokeWidth={2} /></button>
          <button aria-label="Télécharger le CV"><Download size={14} strokeWidth={2} /></button>
        </div>
      </div>
      <div className="salarie-dropzone">
        <UploadCloud size={26} strokeWidth={1.6} />
        <strong>Remplacer le CV</strong>
        <span>Glissez-déposez votre fichier ici ou</span>
        <button type="button" className="salarie-primary-btn">Parcourir vos fichiers</button>
        <small>Formats acceptés : PDF (Max. 5 Mo)</small>
      </div>
      <Note>Veuillez maintenir votre CV à jour pour faciliter les opportunités internes et externes.</Note>

      {previewOpen && (
        <Lightbox title="Maxwell_Ebongue_CV.pdf" onClose={() => setPreviewOpen(false)}>
          <div className="salarie-lightbox-placeholder">
            <FileText size={40} strokeWidth={1.4} />
            <p>Aperçu indisponible : aucun fichier PDF n’a encore été téléversé pour ce CV de démonstration.</p>
          </div>
        </Lightbox>
      )}
    </section>
  )
}

const autresInfo: [string, ReactNode][] = [
  ['N° CNPS', '123 4567890 1A'],
  ['N° Contribuable', 'M092012345678A'],
  ['Banque', 'Afriland First Bank'],
  ['N° Compte bancaire', '10033 02001 00123456789 45'],
  ['Groupe sanguin', 'O+'],
  ['Personne à contacter en cas d’urgence', <>Ebongue Marie (Sœur)<br />+237 6 71 23 45 67</>],
  ['Assurance santé', <span className="salarie-pill approuvee">Actif (AFH Assurances)</span>],
]

function OtherInfoCard() {
  return (
    <section className="salarie-panel salarie-profil-card other-card">
      <h3>Autres informations</h3>
      <div className="salarie-info-col">{autresInfo.map(([label, value]) => <InfoRow key={label} label={label} value={value} />)}</div>
      <Note>Si une information est incorrecte, veuillez soumettre une demande de correction dans l’onglet « Demandes ».</Note>
    </section>
  )
}

function ProfilTab() {
  return (
    <div className="salarie-profil">
      <div className="salarie-profil-row row-1">
        <PersonalInfoCard />
        <DocumentsCard />
      </div>
      <div className="salarie-profil-row row-2">
        <ProfessionalInfoCard />
        <CvCard />
        <OtherInfoCard />
      </div>
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

function DashboardTab() {
  return (
    <div className="salarie-dashboard">
      <div className="salarie-dash-greeting">
        <span className="salarie-dash-wave"><Hand size={22} strokeWidth={2} /></span>
        <p>
          <strong>Bonjour Maxwell Ebongue,</strong><br />
          Ce mois-ci vous avez travaillé sur <strong>4 projets</strong>, réalisé <strong>18 tâches</strong>, consommé <strong>67,5 EHS</strong>,
          pour un temps total de <strong>154 h 20 min</strong>. Votre rémunération estimative est de <strong>542 000 FCFA</strong>,
          dont <strong>58 000 FCFA</strong> de primes. Vous avez <strong>1 demande de congé en attente</strong> et <strong>aucune sanction active</strong>.
        </p>
        <span className="salarie-dash-illustration" aria-hidden="true">
          <Sparkles size={26} strokeWidth={1.6} />
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
