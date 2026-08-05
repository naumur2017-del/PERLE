import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  Banknote,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Circle,
  Download,
  Eye,
  FileText,
  IdCard,
  Info,
  LayoutDashboard,
  ListChecks,
  Plus,
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

      {activeTab === 'demandes' ? <DemandesTab />
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
