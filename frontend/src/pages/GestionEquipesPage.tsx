import { useMemo, useState } from 'react'
import {
  BarChart3, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download, Eye, FileText,
  Info, Network, Pencil, Plus, RotateCcw, Search, Star, StickyNote, UserCheck, UserPlus, UserX,
  Users, Users2, X, MoreVertical,
} from 'lucide-react'
import './GestionEquipesPage.css'

type StatutEmploye = 'Actif' | 'Inactif' | 'En congé'
type StatutAffectation = 'Actif' | 'Inactif'

interface Affectation {
  equipeCode: string
  equipeNom: string
  grade: string
  dateEffet: string
  salaire: number
  statut: StatutAffectation
}

interface Mouvement {
  date: string
  ancienGrade: string
  nouveauGrade: string
  type: string
  dateFin: string
}

interface Employe {
  id: string
  nom: string
  email: string
  initiales: string
  couleur: string
  statut: StatutEmploye
  departement: string
  fonction: string
  manager: string
  telephone: string
  typeContrat: string
  dateEntree: string
  derniereMajDate: string
  derniereMajPar: string
  affectations: Affectation[]
  historique: Record<string, Mouvement[]>
}

const EQUIPES = [
  { code: 'MO1', nom: 'MO1 - Middle Office 1' },
  { code: 'BO1', nom: 'BO1 - Back Office 1' },
  { code: 'BO2', nom: 'BO2 - Back Office 2' },
  { code: 'PI', nom: 'PI - Pilotage & Ingénierie' },
  { code: 'IT', nom: 'IT - Informatique' },
  { code: 'RH', nom: 'RH - Ressources Humaines' },
  { code: 'DG', nom: 'DG - Direction Générale' },
  { code: 'TR', nom: 'TR - Trésorerie' },
  { code: 'ARC', nom: 'ARC - Architecture' },
]

const EMPLOYES: Employe[] = [
  {
    id: 'EMP-2025-021', nom: 'Essogo Erine', email: 'erine.essogo@naumur.com', initiales: 'EE', couleur: '#4338ca',
    statut: 'Actif', departement: 'Pilotage & Opérations', fonction: 'Comptable', manager: 'Ajara Lamare',
    telephone: '+237 6 77 12 34 56', typeContrat: 'CDI', dateEntree: '10/05/2022', derniereMajDate: '10/02/2025', derniereMajPar: 'Ajara Lamare',
    affectations: [
      { equipeCode: 'MO1', equipeNom: 'MO1 - Middle Office 1', grade: 'G4', dateEffet: '01/06/2026', salaire: 125000, statut: 'Actif' },
      { equipeCode: 'BO2', equipeNom: 'BO2 - Back Office 2', grade: 'G3', dateEffet: '15/03/2026', salaire: 95000, statut: 'Actif' },
      { equipeCode: 'PI', equipeNom: 'PI - Pilotage & Ingénierie', grade: 'G2', dateEffet: '10/02/2025', salaire: 75000, statut: 'Actif' },
      { equipeCode: 'IT', equipeNom: 'IT - Informatique', grade: 'G2', dateEffet: '01/12/2024', salaire: 75000, statut: 'Inactif' },
    ],
    historique: {
      MO1: [
        { date: '01/06/2026', ancienGrade: 'G3', nouveauGrade: 'G4', type: 'Promotion', dateFin: '—' },
        { date: '15/10/2025', ancienGrade: 'G2', nouveauGrade: 'G3', type: 'Promotion', dateFin: '31/05/2026' },
        { date: '10/02/2025', ancienGrade: 'G2', nouveauGrade: 'G2', type: 'Affectation initiale', dateFin: '14/10/2025' },
      ],
    },
  },
  {
    id: 'EMP-2025-005', nom: 'Mbouombouo Ibrahim', email: 'ibrahim.m@naumur.com', initiales: 'IM', couleur: '#16a34a',
    statut: 'Actif', departement: 'Pilotage & Opérations', fonction: 'Contrôleur de gestion', manager: 'Ajara Lamare',
    telephone: '+237 6 90 22 11 08', typeContrat: 'CDI', dateEntree: '12/07/2021', derniereMajDate: '08/02/2025', derniereMajPar: 'Ajara Lamare',
    affectations: [
      { equipeCode: 'MO1', equipeNom: 'MO1 - Middle Office 1', grade: 'G4', dateEffet: '08/02/2025', salaire: 120000, statut: 'Actif' },
      { equipeCode: 'BO1', equipeNom: 'BO1 - Back Office 1', grade: 'G3', dateEffet: '12/07/2023', salaire: 90000, statut: 'Actif' },
    ],
    historique: { MO1: [{ date: '08/02/2025', ancienGrade: 'G3', nouveauGrade: 'G4', type: 'Promotion', dateFin: '—' }] },
  },
  {
    id: 'EMP-2025-014', nom: 'Guebediang Pamella', email: 'pamella.g@naumur.com', initiales: 'PG', couleur: '#f59e0b',
    statut: 'Actif', departement: 'Pilotage & Opérations', fonction: 'Contrôleur de gestion', manager: 'Ajara Lamare',
    telephone: '+237 6 55 87 43 21', typeContrat: 'CDI', dateEntree: '12/07/2021', derniereMajDate: '05/02/2025', derniereMajPar: 'Ajara Lamare',
    affectations: [
      { equipeCode: 'MO1', equipeNom: 'MO1 - Middle Office 1', grade: 'G3', dateEffet: '05/02/2025', salaire: 95000, statut: 'Actif' },
      { equipeCode: 'BO2', equipeNom: 'BO2 - Back Office 2', grade: 'G3', dateEffet: '01/03/2023', salaire: 95000, statut: 'Actif' },
    ],
    historique: { MO1: [{ date: '05/02/2025', ancienGrade: 'G2', nouveauGrade: 'G3', type: 'Promotion', dateFin: '—' }] },
  },
  {
    id: 'EMP-2025-009', nom: 'Bessala Ndzana Théodore', email: 'theodore.b@naumur.com', initiales: 'BT', couleur: '#db2777',
    statut: 'Actif', departement: 'Ressources Humaines', fonction: 'Responsable RH', manager: 'Ngando D. Garnier',
    telephone: '+237 6 71 09 88 45', typeContrat: 'CDI', dateEntree: '01/02/2019', derniereMajDate: '01/02/2025', derniereMajPar: 'Direction',
    affectations: [
      { equipeCode: 'RH', equipeNom: 'RH - Ressources Humaines', grade: 'G4', dateEffet: '01/02/2025', salaire: 130000, statut: 'Actif' },
      { equipeCode: 'MO1', equipeNom: 'MO1 - Middle Office 1', grade: 'G3', dateEffet: '01/06/2022', salaire: 95000, statut: 'Actif' },
    ],
    historique: { RH: [{ date: '01/02/2025', ancienGrade: 'G3', nouveauGrade: 'G4', type: 'Promotion', dateFin: '—' }] },
  },
  {
    id: 'EMP-2025-010', nom: 'Assabe Zainabou', email: 'zainabou.a@naumur.com', initiales: 'AZ', couleur: '#0ea5e9',
    statut: 'Actif', departement: 'Direction Générale', fonction: 'Assistante de direction', manager: 'Ngando D. Garnier',
    telephone: '+237 6 82 34 19 67', typeContrat: 'CDI', dateEntree: '15/03/2018', derniereMajDate: '01/02/2025', derniereMajPar: 'Direction',
    affectations: [{ equipeCode: 'DG', equipeNom: 'DG - Direction Générale', grade: 'G4', dateEffet: '01/02/2025', salaire: 130000, statut: 'Actif' }],
    historique: { DG: [{ date: '01/02/2025', ancienGrade: 'G4', nouveauGrade: 'G4', type: 'Affectation initiale', dateFin: '—' }] },
  },
  {
    id: 'EMP-2025-012', nom: 'Herman Tsaffack', email: 'herman.t@naumur.com', initiales: 'HT', couleur: '#dc2626',
    statut: 'Actif', departement: 'Ressources Humaines', fonction: 'Maintenancier & Réseau', manager: 'Théodore Bessala',
    telephone: '+237 6 96 40 12 78', typeContrat: 'CDD', dateEntree: '15/08/2022', derniereMajDate: '28/01/2025', derniereMajPar: 'Ajara Lamare',
    affectations: [
      { equipeCode: 'IT', equipeNom: 'IT - Informatique', grade: 'G3', dateEffet: '28/01/2025', salaire: 95000, statut: 'Actif' },
      { equipeCode: 'BO2', equipeNom: 'BO2 - Back Office 2', grade: 'G2', dateEffet: '15/08/2022', salaire: 75000, statut: 'Actif' },
    ],
    historique: { IT: [{ date: '28/01/2025', ancienGrade: 'G2', nouveauGrade: 'G3', type: 'Promotion', dateFin: '—' }] },
  },
  {
    id: 'EMP-2025-018', nom: 'Bella Gamaliel Fabrice', email: 'gamaliel.b@naumur.com', initiales: 'BG', couleur: '#0d9488',
    statut: 'Actif', departement: 'Back Office', fonction: 'Agent back office', manager: 'Ajara Lamare',
    telephone: '+237 6 60 15 27 39', typeContrat: 'CDI', dateEntree: '25/01/2023', derniereMajDate: '25/01/2025', derniereMajPar: 'Ajara Lamare',
    affectations: [
      { equipeCode: 'BO1', equipeNom: 'BO1 - Back Office 1', grade: 'G3', dateEffet: '25/01/2025', salaire: 90000, statut: 'Actif' },
      { equipeCode: 'MO1', equipeNom: 'MO1 - Middle Office 1', grade: 'G2', dateEffet: '25/01/2023', salaire: 75000, statut: 'Actif' },
    ],
    historique: { BO1: [{ date: '25/01/2025', ancienGrade: 'G2', nouveauGrade: 'G3', type: 'Promotion', dateFin: '—' }] },
  },
  {
    id: 'EMP-2025-022', nom: 'Nyanné Kédé Jezabel', email: 'jezabel.n@naumur.com', initiales: 'NJ', couleur: '#a855f7',
    statut: 'En congé', departement: 'Back Office', fonction: 'Agent back office', manager: 'Ajara Lamare',
    telephone: '+237 6 54 78 90 23', typeContrat: 'CDI', dateEntree: '15/01/2023', derniereMajDate: '15/01/2025', derniereMajPar: 'Ajara Lamare',
    affectations: [{ equipeCode: 'BO1', equipeNom: 'BO1 - Back Office 1', grade: 'G3', dateEffet: '15/01/2025', salaire: 90000, statut: 'Actif' }],
    historique: { BO1: [{ date: '15/01/2025', ancienGrade: 'G3', nouveauGrade: 'G3', type: 'Affectation initiale', dateFin: '—' }] },
  },
  {
    id: 'EMP-2025-030', nom: 'Essogo Jacques', email: 'jacques.e@naumur.com', initiales: 'EJ', couleur: '#6b7280',
    statut: 'Inactif', departement: 'Trésorerie', fonction: 'Trésorier', manager: 'Direction',
    telephone: '+237 6 91 45 60 82', typeContrat: 'CDI', dateEntree: '10/12/2024', derniereMajDate: '10/12/2024', derniereMajPar: 'Direction',
    affectations: [{ equipeCode: 'TR', equipeNom: 'TR - Trésorerie', grade: 'G2', dateEffet: '10/12/2024', salaire: 75000, statut: 'Inactif' }],
    historique: { TR: [{ date: '10/12/2024', ancienGrade: 'G2', nouveauGrade: 'G2', type: 'Affectation initiale', dateFin: '—' }] },
  },
  {
    id: 'EMP-2025-031', nom: 'Ngono Mireille', email: 'mireille.n@naumur.com', initiales: 'NM', couleur: '#ea580c',
    statut: 'Inactif', departement: 'Architecture', fonction: 'Analyste architecture', manager: 'Direction',
    telephone: '+237 6 83 21 74 09', typeContrat: 'CDD', dateEntree: '05/12/2024', derniereMajDate: '05/12/2024', derniereMajPar: 'Direction',
    affectations: [{ equipeCode: 'ARC', equipeNom: 'ARC - Architecture', grade: 'G2', dateEffet: '05/12/2024', salaire: 75000, statut: 'Inactif' }],
    historique: { ARC: [{ date: '05/12/2024', ancienGrade: 'G2', nouveauGrade: 'G2', type: 'Affectation initiale', dateFin: '—' }] },
  },
]

const TOTAL_EMPLOYES = 136
const DEPARTEMENTS = Array.from(new Set(EMPLOYES.map((e) => e.departement)))
const GRADES = ['G1', 'G2', 'G3', 'G4', 'G5']
const TYPES_MOUVEMENT = ['Promotion', 'Affectation initiale', 'Mutation', 'Rétrogradation']

const KPIS = [
  { icon: Users, tone: 'purple', label: 'Total employés', value: '136', sub: 'Actifs' },
  { icon: UserCheck, tone: 'green', label: 'Employés staffables', value: '124', sub: 'Avec grade actif' },
  { icon: UserX, tone: 'orange', label: 'Sans grade défini', value: '12', sub: 'Dans au moins une équipe' },
  { icon: Star, tone: 'pink', label: 'Promotions ce mois', value: '8', sub: 'Toutes équipes' },
  { icon: Users2, tone: 'blue', label: 'Équipes', value: '9', sub: 'Dans l’organisation' },
]

const LEGENDE_GRADES = [
  { code: 'G5', label: 'Expert' },
  { code: 'G4', label: 'Senior' },
  { code: 'G3', label: 'Confirmé' },
  { code: 'G2', label: 'Junior' },
  { code: 'G1', label: 'Stagiaire' },
]

const fmtMontant = (value: number) => value.toLocaleString('fr-FR')

const statutClass = (statut: StatutEmploye) => {
  if (statut === 'Actif') return 'actif'
  if (statut === 'En congé') return 'conge'
  return 'inactif'
}

function InfosGeneralesTab({ employe }: { employe: Employe }) {
  const rows: [string, string][] = [
    ['Fonction', employe.fonction],
    ['Département', employe.departement],
    ['Manager', employe.manager],
    ['Type de contrat', employe.typeContrat],
    ['Date d’entrée', employe.dateEntree],
    ['Téléphone', employe.telephone],
    ['Email', employe.email],
  ]
  return (
    <dl className="ge-info-grid">
      {rows.map(([label, value]) => (
        <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
      ))}
    </dl>
  )
}

function AffectationsTab({ employe }: { employe: Employe }) {
  const equipesEmploye = employe.affectations.map((a) => a.equipeCode)
  const [equipeSelectionnee, setEquipeSelectionnee] = useState(equipesEmploye[0])
  const [typeMouvement, setTypeMouvement] = useState('Tous')

  const historique = (employe.historique[equipeSelectionnee] ?? []).filter(
    (m) => typeMouvement === 'Tous' || m.type === typeMouvement
  )
  const equipeSelectionneeNom = employe.affectations.find((a) => a.equipeCode === equipeSelectionnee)?.equipeNom ?? equipeSelectionnee

  return (
    <div className="ge-detail-section">
      <h4><Info size={13} />Affectations par équipe & grade actuel</h4>
      <div className="ge-detail-table-wrap">
        <table className="ge-detail-table">
          <thead>
            <tr><th>Équipe</th><th>Grade actuel</th><th>Date d’effet</th><th>Salaire / valeur liée au grade</th><th>Statut</th></tr>
          </thead>
          <tbody>
            {employe.affectations.map((affectation) => (
              <tr key={affectation.equipeCode}>
                <td>{affectation.equipeNom}</td>
                <td><span className="ge-grade-pill">{affectation.grade}</span></td>
                <td>{affectation.dateEffet}</td>
                <td>{fmtMontant(affectation.salaire)} FCFA / EHS</td>
                <td><span className={`ge-pill ge-pill-${affectation.statut === 'Actif' ? 'actif' : 'inactif'}`}>{affectation.statut}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h4 className="ge-detail-section-title-spaced">Historique des grades & promotions ({equipeSelectionnee})</h4>
      <div className="ge-detail-filters">
        <label>Équipe
          <select value={equipeSelectionnee} onChange={(event) => setEquipeSelectionnee(event.target.value)}>
            {employe.affectations.map((a) => <option key={a.equipeCode} value={a.equipeCode}>{a.equipeNom}</option>)}
          </select>
        </label>
        <label>Type de mouvement
          <select value={typeMouvement} onChange={(event) => setTypeMouvement(event.target.value)}>
            <option value="Tous">Tous</option>
            {TYPES_MOUVEMENT.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>
      </div>
      <div className="ge-detail-table-wrap">
        <table className="ge-detail-table">
          <thead>
            <tr><th>Date</th><th>Ancien grade</th><th>Nouveau grade</th><th>Type de mouvement</th><th>Date de fin</th></tr>
          </thead>
          <tbody>
            {historique.map((mouvement, index) => (
              <tr key={`${mouvement.date}-${index}`}>
                <td>{mouvement.date}</td>
                <td><span className="ge-grade-pill ge-grade-pill-muted">{mouvement.ancienGrade}</span></td>
                <td><span className="ge-grade-pill">{mouvement.nouveauGrade}</span></td>
                <td>{mouvement.type}</td>
                <td>{mouvement.dateFin}</td>
              </tr>
            ))}
            {historique.length === 0 && (
              <tr><td colSpan={5} className="ge-detail-empty">Aucun mouvement pour {equipeSelectionneeNom}.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <button type="button" className="ge-btn-outline ge-detail-history-btn">
        <BarChart3 size={14} />Voir l’historique complet de toutes les équipes
      </button>
    </div>
  )
}

function DocumentsTab({ employe }: { employe: Employe }) {
  const documents = [
    { nom: 'Contrat de travail.pdf', date: employe.dateEntree },
    { nom: 'Carte nationale d’identité.pdf', date: employe.dateEntree },
    { nom: 'Diplôme.pdf', date: employe.dateEntree },
  ]
  return (
    <ul className="ge-doc-list">
      {documents.map((doc) => (
        <li key={doc.nom}>
          <span className="ge-doc-icon"><FileText size={14} /></span>
          <div><strong>{doc.nom}</strong><small>Ajouté le {doc.date}</small></div>
          <button type="button" className="ge-row-action" aria-label={`Télécharger ${doc.nom}`}><Download size={13} /></button>
        </li>
      ))}
    </ul>
  )
}

function NotesTab() {
  return (
    <div className="ge-notes">
      <textarea className="ge-notes-input" placeholder="Ajouter une note sur cet employé..." rows={3} />
      <button type="button" className="ge-btn-primary ge-notes-submit"><StickyNote size={13} />Ajouter la note</button>
      <p className="ge-notes-empty">Aucune note pour le moment.</p>
    </div>
  )
}

function DetailEmploye({ employe, onClose }: { employe: Employe; onClose: () => void }) {
  const [tab, setTab] = useState<'infos' | 'affectations' | 'documents' | 'notes'>('affectations')

  return (
    <aside className="ge-detail-panel">
      <div className="ge-detail-head">
        <span>Détail employé</span>
        <button type="button" className="ge-detail-close" onClick={onClose} aria-label="Fermer"><X size={15} /></button>
      </div>

      <div className="ge-detail-identity">
        <span className="ge-avatar ge-avatar-lg" style={{ background: employe.couleur }}>{employe.initiales}</span>
        <div>
          <div className="ge-detail-name-row">
            <strong>{employe.nom}</strong>
            <span className={`ge-pill ge-pill-${statutClass(employe.statut)}`}>{employe.statut}</span>
          </div>
          <span className="ge-detail-id">ID : {employe.id}</span>
          <span className="ge-detail-email">{employe.email}</span>
        </div>
      </div>

      <nav className="ge-detail-tabs">
        <button className={tab === 'infos' ? 'active' : ''} onClick={() => setTab('infos')}>Infos générales</button>
        <button className={tab === 'affectations' ? 'active' : ''} onClick={() => setTab('affectations')}>Affectations & grades</button>
        <button className={tab === 'documents' ? 'active' : ''} onClick={() => setTab('documents')}>Documents</button>
        <button className={tab === 'notes' ? 'active' : ''} onClick={() => setTab('notes')}>Notes</button>
      </nav>

      <div className="ge-detail-body">
        {tab === 'infos' && <InfosGeneralesTab employe={employe} />}
        {tab === 'affectations' && <AffectationsTab employe={employe} />}
        {tab === 'documents' && <DocumentsTab employe={employe} />}
        {tab === 'notes' && <NotesTab />}
      </div>
    </aside>
  )
}

export default function GestionEquipesPage({ navigateTo }: { navigateTo: (page: string) => void }) {
  const [search, setSearch] = useState('')
  const [statutFiltre, setStatutFiltre] = useState('Tous')
  const [departementFiltre, setDepartementFiltre] = useState('Tous')
  const [equipeFiltre, setEquipeFiltre] = useState('Tous')
  const [gradeFiltre, setGradeFiltre] = useState('Tous')
  const [selectedId, setSelectedId] = useState<string | null>(EMPLOYES[0].id)

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return EMPLOYES.filter((employe) => {
      const matchesQuery = !query
        || employe.nom.toLowerCase().includes(query)
        || employe.id.toLowerCase().includes(query)
        || employe.email.toLowerCase().includes(query)
      const matchesStatut = statutFiltre === 'Tous' || employe.statut === statutFiltre
      const matchesDepartement = departementFiltre === 'Tous' || employe.departement === departementFiltre
      const matchesEquipe = equipeFiltre === 'Tous' || employe.affectations.some((a) => a.equipeCode === equipeFiltre)
      const matchesGrade = gradeFiltre === 'Tous' || employe.affectations.some((a) => a.grade === gradeFiltre)
      return matchesQuery && matchesStatut && matchesDepartement && matchesEquipe && matchesGrade
    })
  }, [search, statutFiltre, departementFiltre, equipeFiltre, gradeFiltre])

  const isFiltered = search.trim() !== '' || statutFiltre !== 'Tous' || departementFiltre !== 'Tous' || equipeFiltre !== 'Tous' || gradeFiltre !== 'Tous'
  const selected = EMPLOYES.find((employe) => employe.id === selectedId) ?? null

  const resetFilters = () => {
    setSearch('')
    setStatutFiltre('Tous')
    setDepartementFiltre('Tous')
    setEquipeFiltre('Tous')
    setGradeFiltre('Tous')
  }

  return (
    <section className="ge-page">
      <div className="ge-header-row">
        <nav className="ge-subtabs">
          <button className="active" onClick={() => navigateTo('gestion')}><Users size={14} />Employés</button>
          <button onClick={() => navigateTo('gestion-equipes')}><Users2 size={14} />Équipes</button>
          <button onClick={() => navigateTo('gestion-grades')}><BarChart3 size={14} />Grilles de grades</button>
          <button onClick={() => navigateTo('gestion-organigramme')}><Network size={14} />Organigramme</button>
        </nav>
        <div className="ge-header-actions">
          <button type="button" className="ge-btn-outline"><Download size={14} />Exporter</button>
          <button type="button" className="ge-btn-primary"><Plus size={14} />Nouvel employé</button>
        </div>
      </div>

      <div className="ge-kpis">
        {KPIS.map((kpi) => (
          <article key={kpi.label} className={`ge-kpi ge-kpi-${kpi.tone}`}>
            <span className="ge-kpi-icon"><kpi.icon size={18} /></span>
            <div>
              <strong>{kpi.value}</strong>
              <span>{kpi.label}</span>
              <small>{kpi.sub}</small>
            </div>
          </article>
        ))}
      </div>

      <div className="ge-filters">
        <label className="ge-search">
          <Search size={14} />
          <input placeholder="Rechercher un employé (nom, ID, email...)" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
      </div>
      <div className="ge-filters">
        <label>Statut
          <select value={statutFiltre} onChange={(event) => setStatutFiltre(event.target.value)}>
            <option value="Tous">Tous les statuts</option>
            <option value="Actif">Actif</option>
            <option value="En congé">En congé</option>
            <option value="Inactif">Inactif</option>
          </select>
        </label>
        <label>Département
          <select value={departementFiltre} onChange={(event) => setDepartementFiltre(event.target.value)}>
            <option value="Tous">Tous</option>
            {DEPARTEMENTS.map((departement) => <option key={departement} value={departement}>{departement}</option>)}
          </select>
        </label>
        <label>Équipe
          <select value={equipeFiltre} onChange={(event) => setEquipeFiltre(event.target.value)}>
            <option value="Tous">Toutes les équipes</option>
            {EQUIPES.map((equipe) => <option key={equipe.code} value={equipe.code}>{equipe.nom}</option>)}
          </select>
        </label>
        <label>Grade
          <select value={gradeFiltre} onChange={(event) => setGradeFiltre(event.target.value)}>
            <option value="Tous">Tous les grades</option>
            {GRADES.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
          </select>
        </label>
        <button type="button" className="ge-reset" onClick={resetFilters}><RotateCcw size={14} />Réinitialiser</button>
      </div>

      <div className={`ge-main ${selected ? '' : 'ge-main-full'}`}>
        <div className="ge-table-panel">
          <div className="ge-table-head"><h3>Liste des employés ({isFiltered ? filtered.length : EMPLOYES.length})</h3></div>
          <div className="ge-table-wrap">
            <table className="ge-table">
              <thead>
                <tr>
                  <th>ID Employé</th><th>Employé</th><th>Statut</th><th>Département</th><th>Grade principal</th>
                  <th>Équipes & grades actifs</th><th>Dernière mise à jour</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((employe) => {
                  const badgesVisibles = employe.affectations.slice(0, 3)
                  const reste = employe.affectations.length - badgesVisibles.length
                  return (
                    <tr key={employe.id} className={employe.id === selectedId ? 'is-selected' : ''}>
                      <td className="ge-code">{employe.id}</td>
                      <td>
                        <div className="ge-employe-cell">
                          <span className="ge-avatar" style={{ background: employe.couleur }}>{employe.initiales}</span>
                          <div>
                            <strong>{employe.nom}</strong>
                            <small>{employe.email}</small>
                          </div>
                        </div>
                      </td>
                      <td><span className={`ge-pill ge-pill-${statutClass(employe.statut)}`}>{employe.statut}</span></td>
                      <td>{employe.departement}</td>
                      <td><span className="ge-grade-pill">{employe.affectations[0]?.grade ?? '—'}</span></td>
                      <td>
                        <div className="ge-team-badges">
                          {badgesVisibles.map((affectation) => (
                            <span key={affectation.equipeCode} className="ge-team-badge">{affectation.equipeCode} ({affectation.grade})</span>
                          ))}
                          {reste > 0 && <span className="ge-team-badge ge-team-badge-more">+{reste}</span>}
                        </div>
                      </td>
                      <td>
                        <strong>{employe.derniereMajDate}</strong>
                        <small className="ge-sub">Par {employe.derniereMajPar}</small>
                      </td>
                      <td>
                        <div className="ge-actions">
                          <button type="button" className="ge-row-action" aria-label="Voir le détail" onClick={() => setSelectedId(employe.id)}><Eye size={13} /></button>
                          <button type="button" className="ge-row-action" aria-label="Modifier" title="Modifier"><Pencil size={13} /></button>
                          <button type="button" className="ge-row-action" aria-label="Actions" title="Autres actions"><MoreVertical size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="ge-detail-empty">Aucun employé ne correspond à votre recherche.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="ge-table-foot">
            <span>
              {isFiltered
                ? `${filtered.length} employé${filtered.length > 1 ? 's' : ''} trouvé${filtered.length > 1 ? 's' : ''}`
                : `Affichage de 1 à ${EMPLOYES.length} sur ${TOTAL_EMPLOYES} employés`}
            </span>
            <div className="ge-table-foot-right">
              <label className="ge-page-size">
                <select defaultValue="10"><option value="10">10</option><option value="25">25</option><option value="50">50</option></select>
              </label>
              <nav className="ge-pagination" aria-label="Pagination">
                <button type="button" disabled><ChevronsLeft size={14} /></button>
                <button type="button" disabled><ChevronLeft size={14} /></button>
                <button type="button" className="is-active">1</button>
                <button type="button">2</button>
                <button type="button">3</button>
                <button type="button">4</button>
                <button type="button">5</button>
                <span className="ge-page-ellipsis">…</span>
                <button type="button">14</button>
                <button type="button"><ChevronRight size={14} /></button>
                <button type="button"><ChevronsRight size={14} /></button>
              </nav>
            </div>
          </div>
        </div>

        {selected && <DetailEmploye employe={selected} onClose={() => setSelectedId(null)} />}
      </div>

      <div className="ge-legend-row">
        <div className="ge-legend">
          <span className="ge-legend-title">Légende des grades</span>
          {LEGENDE_GRADES.map((grade) => (
            <span key={grade.code} className="ge-legend-item"><b className="ge-grade-pill">{grade.code}</b>{grade.label}</span>
          ))}
        </div>
        <div className="ge-legend-info">
          <Info size={14} />
          <span>Un employé doit avoir un grade actif dans une équipe pour pouvoir être staffé sur une tâche de cette équipe.</span>
        </div>
      </div>

      {!selected && (
        <button type="button" className="ge-reopen-detail" onClick={() => setSelectedId(EMPLOYES[0].id)}>
          <UserPlus size={14} />Afficher le détail d’un employé
        </button>
      )}
    </section>
  )
}
