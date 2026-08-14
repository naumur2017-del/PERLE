import { useMemo, useState, type ReactNode } from 'react'
import {
  Calendar, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Eye, Inbox,
  Info, Lock, PlayCircle, Plus, RotateCcw, Search, Settings2, SlidersHorizontal, Unlock, Users, Wallet, X,
} from 'lucide-react'
import { ColumnsMenu, useColumnVisibility, type ColumnDef } from '../components/ColumnsMenu'
import './StaffingPage.css'

type Statut = 'a-configurer' | 'prete' | 'staffee'

interface TacheWrike {
  id: string
  projet: string
  tache: string
  equipe: string
  priorite: 'Haute' | 'Moyenne' | 'Basse'
  creeLe: string
  echeance: string
  ligneBudgetaire: string | null
  ehsPrevu: number | null
  statut: Statut
  collaborateur: string | null
  collaborateurProfil: string | null
  staffeLe: string | null
}

const EQUIPES = ['BO – Back Office', 'MO – Maîtrise d’œuvre', 'FO – Fonctions support', 'OP – Opérations', 'PI – Pilotage et amélioration', 'IT – Systèmes d’information', 'RES – Ressources']

const LIGNES_BUDGET_INITIAL = [
  { nom: 'Déplacement terrain', disponible: 42.0 },
  { nom: 'Consultation externe', disponible: 27.5 },
  { nom: 'Formation équipe', disponible: 18.0 },
  { nom: 'Achat matériel', disponible: 20.0 },
  { nom: 'Support technique', disponible: 25.0 },
]

const COLLABORATEURS = [
  { nom: 'Ibrahim Mbouombouo', profil: 'Comptable Senior', equipe: 'BO – Back Office' },
  { nom: 'Belomo Edwige', profil: 'Analyste Financier', equipe: 'BO – Back Office' },
  { nom: 'Essogo Erine', profil: 'Analyste Financier', equipe: 'BO – Back Office' },
  { nom: 'Pamella Guebediang', profil: 'Contrôleur de gestion', equipe: 'MO – Maîtrise d’œuvre' },
  { nom: 'Herman Tsaffock', profil: 'Analyste Financier', equipe: 'MO – Maîtrise d’œuvre' },
  { nom: 'Mbarga Thibaut', profil: 'Opérateur ERP', equipe: 'OP – Opérations' },
  { nom: 'Théodore Bessala', profil: 'Chef de projet', equipe: 'PI – Pilotage et amélioration' },
  { nom: 'Brayan Ebongue', profil: 'Développeur Senior', equipe: 'IT – Systèmes d’information' },
]

const TACHES_INITIAL: TacheWrike[] = [
  { id: 'WRK-1456', projet: 'ERP Academy', tache: 'Analyse des besoins utilisateurs', equipe: 'MO – Maîtrise d’œuvre', priorite: 'Moyenne', creeLe: '07/05/2025', echeance: '15/05/2025', ligneBudgetaire: null, ehsPrevu: null, statut: 'a-configurer', collaborateur: null, collaborateurProfil: null, staffeLe: null },
  { id: 'WRK-1457', projet: 'ERP Academy', tache: 'Mission de collecte des données', equipe: 'MO – Maîtrise d’œuvre', priorite: 'Haute', creeLe: '07/05/2025', echeance: '20/05/2025', ligneBudgetaire: null, ehsPrevu: null, statut: 'a-configurer', collaborateur: null, collaborateurProfil: null, staffeLe: null },
  { id: 'WRK-1458', projet: 'ERP Academy', tache: 'Rédaction rapport préliminaire', equipe: 'MO – Maîtrise d’œuvre', priorite: 'Moyenne', creeLe: '07/05/2025', echeance: '25/05/2025', ligneBudgetaire: null, ehsPrevu: null, statut: 'a-configurer', collaborateur: null, collaborateurProfil: null, staffeLe: null },
  { id: 'WRK-1459', projet: 'ERP Academy', tache: 'Atelier de restitution intermédiaire', equipe: 'MO – Maîtrise d’œuvre', priorite: 'Basse', creeLe: '07/05/2025', echeance: '30/05/2025', ligneBudgetaire: null, ehsPrevu: null, statut: 'a-configurer', collaborateur: null, collaborateurProfil: null, staffeLe: null },
  { id: 'WRK-1460', projet: 'ERP Academy', tache: 'Validation rapport final', equipe: 'MO – Maîtrise d’œuvre', priorite: 'Haute', creeLe: '07/05/2025', echeance: '05/06/2025', ligneBudgetaire: null, ehsPrevu: null, statut: 'a-configurer', collaborateur: null, collaborateurProfil: null, staffeLe: null },
  { id: 'WRK-1461', projet: 'ERP Academy', tache: 'Archivage des documents', equipe: 'MO – Maîtrise d’œuvre', priorite: 'Basse', creeLe: '07/05/2025', echeance: '07/06/2025', ligneBudgetaire: null, ehsPrevu: null, statut: 'a-configurer', collaborateur: null, collaborateurProfil: null, staffeLe: null },

  { id: 'WRK-1442', projet: 'ERP Academy', tache: 'Cartographie des processus', equipe: 'MO – Maîtrise d’œuvre', priorite: 'Moyenne', creeLe: '02/05/2025', echeance: '18/05/2025', ligneBudgetaire: 'Consultation externe', ehsPrevu: 12, statut: 'prete', collaborateur: null, collaborateurProfil: null, staffeLe: null },
  { id: 'WRK-1443', projet: 'Mission Audit Interne', tache: 'Revue des contrôles internes', equipe: 'BO – Back Office', priorite: 'Haute', creeLe: '03/05/2025', echeance: '22/05/2025', ligneBudgetaire: 'Déplacement terrain', ehsPrevu: 20, statut: 'prete', collaborateur: null, collaborateurProfil: null, staffeLe: null },
  { id: 'WRK-1444', projet: 'Digitalisation RH', tache: 'Paramétrage du SIRH', equipe: 'IT – Systèmes d’information', priorite: 'Basse', creeLe: '04/05/2025', echeance: '28/05/2025', ligneBudgetaire: 'Formation équipe', ehsPrevu: 8, statut: 'prete', collaborateur: null, collaborateurProfil: null, staffeLe: null },
  { id: 'WRK-1445', projet: 'Étude de faisabilité usine', tache: 'Analyse des coûts', equipe: 'PI – Pilotage et amélioration', priorite: 'Moyenne', creeLe: '05/05/2025', echeance: '02/06/2025', ligneBudgetaire: 'Achat matériel', ehsPrevu: 15, statut: 'prete', collaborateur: null, collaborateurProfil: null, staffeLe: null },
  { id: 'WRK-1446', projet: 'ERP Academy', tache: "Tests d'intégration module RH", equipe: 'IT – Systèmes d’information', priorite: 'Haute', creeLe: '06/05/2025', echeance: '10/06/2025', ligneBudgetaire: 'Support technique', ehsPrevu: 10, statut: 'prete', collaborateur: null, collaborateurProfil: null, staffeLe: null },

  { id: 'WRK-1401', projet: 'ERP Academy', tache: 'Saisie des écritures comptables', equipe: 'BO – Back Office', priorite: 'Haute', creeLe: '28/04/2025', echeance: '12/05/2025', ligneBudgetaire: 'Support technique', ehsPrevu: 15, statut: 'staffee', collaborateur: 'Ibrahim Mbouombouo', collaborateurProfil: 'Comptable Senior', staffeLe: '30/04/2025' },
  { id: 'WRK-1402', projet: 'ERP Academy', tache: 'Rapprochement bancaire', equipe: 'BO – Back Office', priorite: 'Haute', creeLe: '28/04/2025', echeance: '12/05/2025', ligneBudgetaire: 'Déplacement terrain', ehsPrevu: 20, statut: 'staffee', collaborateur: 'Belomo Edwige', collaborateurProfil: 'Analyste Financier', staffeLe: '30/04/2025' },
  { id: 'WRK-1403', projet: 'Mission Audit Interne', tache: 'Établissement des déclarations fiscales', equipe: 'BO – Back Office', priorite: 'Haute', creeLe: '29/04/2025', echeance: '13/05/2025', ligneBudgetaire: 'Consultation externe', ehsPrevu: 30, statut: 'staffee', collaborateur: 'Essogo Erine', collaborateurProfil: 'Analyste Financier', staffeLe: '01/05/2025' },
  { id: 'WRK-1404', projet: 'ERP Academy', tache: 'Analyse financière', equipe: 'MO – Maîtrise d’œuvre', priorite: 'Moyenne', creeLe: '29/04/2025', echeance: '14/05/2025', ligneBudgetaire: 'Achat matériel', ehsPrevu: 25, statut: 'staffee', collaborateur: 'Pamella Guebediang', collaborateurProfil: 'Contrôleur de gestion', staffeLe: '02/05/2025' },
  { id: 'WRK-1405', projet: 'Digitalisation RH', tache: 'Préparation du budget', equipe: 'MO – Maîtrise d’œuvre', priorite: 'Moyenne', creeLe: '30/04/2025', echeance: '14/05/2025', ligneBudgetaire: 'Formation équipe', ehsPrevu: 18, statut: 'staffee', collaborateur: 'Herman Tsaffock', collaborateurProfil: 'Analyste Financier', staffeLe: '02/05/2025' },
  { id: 'WRK-1406', projet: 'Étude de faisabilité usine', tache: 'Suivi des opérations', equipe: 'OP – Opérations', priorite: 'Moyenne', creeLe: '30/04/2025', echeance: '15/05/2025', ligneBudgetaire: 'Support technique', ehsPrevu: 22, statut: 'staffee', collaborateur: 'Mbarga Thibaut', collaborateurProfil: 'Opérateur ERP', staffeLe: '03/05/2025' },
  { id: 'WRK-1407', projet: 'ERP Academy', tache: 'Planification stratégique', equipe: 'PI – Pilotage et amélioration', priorite: 'Moyenne', creeLe: '01/05/2025', echeance: '15/05/2025', ligneBudgetaire: 'Déplacement terrain', ehsPrevu: 16, statut: 'staffee', collaborateur: 'Théodore Bessala', collaborateurProfil: 'Chef de projet', staffeLe: '03/05/2025' },
]

const STATUT_LABEL: Record<Statut, string> = { 'a-configurer': 'À configurer', prete: 'Prêt à staffer', staffee: 'Déjà staffée' }
const STATUT_CLASS: Record<Statut, string> = { 'a-configurer': 'orange', prete: 'blue', staffee: 'green' }
const PRIORITE_CLASS: Record<TacheWrike['priorite'], string> = { Haute: 'haute', Moyenne: 'moyenne', Basse: 'basse' }

const TABS: { key: Statut; label: string }[] = [
  { key: 'a-configurer', label: 'Tâches à configurer' },
  { key: 'prete', label: 'Prêtes à staffer' },
  { key: 'staffee', label: 'Déjà staffées' },
]

const fmtEhs = (value: number | null) => value === null ? '-' : value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function initiales(nom: string) {
  return nom.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
}

type NsColumnId = 'wrike' | 'projet' | 'tache' | 'equipe' | 'ligneBudgetaire' | 'ehs' | 'attribueA' | 'echeance' | 'statutStaffing'

const NS_CELL_DEFS: Record<NsColumnId, { className?: string; render: (t: TacheWrike) => ReactNode }> = {
  wrike: { className: 'ns-code', render: (t) => t.id },
  projet: { render: (t) => t.projet },
  tache: { className: 'ns-name', render: (t) => t.tache },
  equipe: { render: (t) => t.equipe },
  ligneBudgetaire: { render: (t) => t.ligneBudgetaire ?? <span className="ns-pill-warn">À définir</span> },
  ehs: { render: (t) => t.ehsPrevu !== null ? `${fmtEhs(t.ehsPrevu)} EHS` : <span className="ns-pill-warn">À définir</span> },
  attribueA: {
    render: (t) => (
      <span className="ns-employee">
        <span className="ns-employee-dot">{initiales(t.collaborateur ?? '?')}</span>
        <span><strong>{t.collaborateur}</strong><small>{t.collaborateurProfil}</small></span>
      </span>
    ),
  },
  echeance: { render: (t) => t.echeance },
  statutStaffing: { render: (t) => <span className={`ns-statut ns-statut-${STATUT_CLASS[t.statut]}`}>{STATUT_LABEL[t.statut]}</span> },
}

function CollaborateurSelect({ equipe, value, onChange, disabled, autoFocus }: {
  equipe: string
  value: string
  onChange: (nom: string) => void
  disabled?: boolean
  autoFocus?: boolean
}) {
  const [showAll, setShowAll] = useState(false)
  const membresEquipe = COLLABORATEURS.filter((c) => c.equipe === equipe)
  const membresHorsEquipe = COLLABORATEURS.filter((c) => c.equipe !== equipe)

  return (
    <div className="ns-collab-select">
      <select autoFocus={autoFocus} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        <option value="">Sélectionner un collaborateur</option>
        <optgroup label="Membres de l'équipe">
          {membresEquipe.map((c) => <option key={c.nom} value={c.nom}>{c.nom} — {c.profil}</option>)}
        </optgroup>
        {showAll && (
          <optgroup label="Hors équipe">
            {membresHorsEquipe.map((c) => <option key={c.nom} value={c.nom}>{c.nom} — {c.profil}</option>)}
          </optgroup>
        )}
      </select>
      {!disabled && (
        <button
          type="button"
          className={`ns-collab-plus ${showAll ? 'active' : ''}`}
          title="Afficher les collaborateurs hors équipe"
          onClick={() => setShowAll((s) => !s)}
        >
          <Plus size={14} />
        </button>
      )}
    </div>
  )
}

export default function StaffingPage({ navigateTo }: { navigateTo: (page: string) => void }) {
  const [taches, setTaches] = useState<TacheWrike[]>(TACHES_INITIAL)
  const [lignesBudget, setLignesBudget] = useState(LIGNES_BUDGET_INITIAL)
  const [activeTab, setActiveTab] = useState<Statut>('a-configurer')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [staffingUnlocked, setStaffingUnlocked] = useState(false)

  const [filterProjet, setFilterProjet] = useState('Tous')
  const [filterEquipe, setFilterEquipe] = useState('Toutes')
  const [filterLigne, setFilterLigne] = useState('Toutes')
  const [filterStatut, setFilterStatut] = useState('Tous')
  const [filterPriorite, setFilterPriorite] = useState('Toutes')
  const [search, setSearch] = useState('')

  const [formLigne, setFormLigne] = useState('')
  const [formEhs, setFormEhs] = useState('')
  const [formCollaborateur, setFormCollaborateur] = useState('')

  const projets = useMemo(() => Array.from(new Set(taches.map((t) => t.projet))), [taches])
  const equipes = EQUIPES

  const nsColumns = useMemo<ColumnDef<NsColumnId>[]>(() => {
    const cols: ColumnDef<NsColumnId>[] = [
      { id: 'wrike', label: 'Wrike' },
      { id: 'projet', label: 'Projet' },
      { id: 'tache', label: 'Tâche' },
      { id: 'equipe', label: 'Équipe' },
      { id: 'ligneBudgetaire', label: 'Ligne budgétaire' },
      { id: 'ehs', label: activeTab === 'staffee' ? 'EHS alloués' : 'EHS prévus tâche' },
    ]
    if (activeTab === 'staffee') cols.push({ id: 'attribueA', label: 'Attribué à' })
    cols.push({ id: 'echeance', label: 'Échéance' }, { id: 'statutStaffing', label: 'Statut staffing' })
    return cols
  }, [activeTab])
  const { hiddenColumns, toggleColumn, visibleColumns } = useColumnVisibility(nsColumns)

  const selected = taches.find((t) => t.id === selectedId) ?? null

  const handleSelect = (tache: TacheWrike) => {
    setSelectedId(tache.id)
    setFormLigne(tache.ligneBudgetaire ?? '')
    setFormEhs(tache.ehsPrevu !== null ? String(tache.ehsPrevu) : '')
    setStaffingUnlocked(false)
    setFormCollaborateur('')
  }

  const closePanel = () => {
    setSelectedId(null)
    setStaffingUnlocked(false)
    setFormCollaborateur('')
  }

  const filtered = taches.filter((t) => (
    t.statut === activeTab
    && (filterProjet === 'Tous' || t.projet === filterProjet)
    && (filterEquipe === 'Toutes' || t.equipe === filterEquipe)
    && (filterLigne === 'Toutes' || t.ligneBudgetaire === filterLigne)
    && (filterStatut === 'Tous' || STATUT_LABEL[t.statut] === filterStatut)
    && (filterPriorite === 'Toutes' || t.priorite === filterPriorite)
    && (search.trim() === '' || `${t.id} ${t.tache} ${t.projet} ${t.collaborateur ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()))
  ))

  const resetFiltres = () => {
    setFilterProjet('Tous'); setFilterEquipe('Toutes'); setFilterLigne('Toutes')
    setFilterStatut('Tous'); setFilterPriorite('Toutes'); setSearch('')
  }

  const ehsNecessaireNum = parseFloat(formEhs.replace(',', '.'))
  const ligneChoisieDisponible = lignesBudget.find((l) => l.nom === formLigne)?.disponible ?? 0
  const budgetValide = formLigne !== '' && !Number.isNaN(ehsNecessaireNum) && ehsNecessaireNum > 0 && ehsNecessaireNum <= ligneChoisieDisponible

  const consommerLigne = (nom: string, montant: number) => {
    setLignesBudget((lignes) => lignes.map((l) => l.nom === nom ? { ...l, disponible: Math.round((l.disponible - montant) * 100) / 100 } : l))
  }

  const todayStr = () => new Date().toLocaleDateString('fr-FR')

  const handleEnregistrerSansStaffing = () => {
    if (!selected || selected.statut !== 'a-configurer' || !budgetValide) return
    consommerLigne(formLigne, ehsNecessaireNum)
    setTaches((list) => list.map((t) => t.id === selected.id ? { ...t, ligneBudgetaire: formLigne, ehsPrevu: ehsNecessaireNum, statut: 'prete' } : t))
    closePanel()
  }

  const handleAssignerCollaborateur = () => {
    if (!selected || formCollaborateur === '') return
    const profil = COLLABORATEURS.find((c) => c.nom === formCollaborateur)?.profil ?? ''
    setTaches((list) => list.map((t) => t.id === selected.id
      ? { ...t, statut: 'staffee', collaborateur: formCollaborateur, collaborateurProfil: profil, staffeLe: todayStr() }
      : t))
    setStaffingUnlocked(false)
    setFormCollaborateur('')
  }

  const countConfig = taches.filter((t) => t.statut === 'a-configurer').length
  const countPrete = taches.filter((t) => t.statut === 'prete').length
  const countStaffee = taches.filter((t) => t.statut === 'staffee').length
  const ehsRestantTotal = lignesBudget.reduce((sum, l) => sum + l.disponible, 0)

  const KPIS = [
    { icon: Inbox, tone: 'blue', label: 'Tâches reçues de Wrike', value: String(taches.length), sub: 'Total des tâches' },
    { icon: Settings2, tone: 'orange', label: 'À configurer', value: String(countConfig), sub: 'Ligne budgétaire et EHS à définir' },
    { icon: Users, tone: 'purple', label: 'Prêtes à staffer', value: String(countPrete), sub: 'EHS définis' },
    { icon: CheckCircle2, tone: 'green', label: 'Déjà staffées', value: String(countStaffee), sub: 'Tâches affectées' },
    { icon: Wallet, tone: 'indigo', label: 'EHS restant disponibles', value: `${fmtEhs(ehsRestantTotal)}`, sub: 'Sur les lignes sélectionnées' },
    { icon: Users, tone: 'blue', label: 'Collaborateurs disponibles', value: String(COLLABORATEURS.length), sub: 'Dans votre équipe' },
  ]

  return (
    <section className="ns-page">
      <div className="ns-title-row">
        <div>
          <h1>Nouveau staffing <Info size={15} className="ns-title-info" /></h1>
          <p>Les tâches créées dans Wrike sont automatiquement importées et affichées ici pour votre équipe.</p>
        </div>
        <button type="button" className="ns-btn-outline" onClick={() => navigateTo('staffing-execute')}><PlayCircle size={14} />Voir l'exécuté staffing</button>
      </div>

      <div className="ns-toolbar">
        <button type="button" className="ns-daterange"><Calendar size={14} />01/05/2025 → 31/12/2025</button>
        <button type="button" className="ns-btn-outline"><SlidersHorizontal size={14} />Filtres avancés</button>
      </div>

      <div className="ns-kpis">
        {KPIS.map((kpi) => (
          <article key={kpi.label} className={`ns-kpi ns-kpi-${kpi.tone}`}>
            <span className="ns-kpi-icon"><kpi.icon size={17} /></span>
            <div>
              <span className="ns-kpi-label">{kpi.label}</span>
              <strong>{kpi.value}</strong>
              <small>{kpi.sub}</small>
            </div>
          </article>
        ))}
      </div>

      <div className="ns-layout">
        <div className="ns-main">
          <nav className="ns-tabs">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                className={activeTab === tab.key ? 'active' : ''}
                onClick={() => { setActiveTab(tab.key); closePanel() }}
              >
                {tab.label} <span className="ns-tab-count">{taches.filter((t) => t.statut === tab.key).length}</span>
              </button>
            ))}
          </nav>

          <div className="ns-filters">
            <label>Projet
              <select value={filterProjet} onChange={(e) => setFilterProjet(e.target.value)}>
                <option>Tous</option>
                {projets.map((p) => <option key={p}>{p}</option>)}
              </select>
            </label>
            <label>Équipe
              <select value={filterEquipe} onChange={(e) => setFilterEquipe(e.target.value)}>
                <option>Toutes</option>
                {equipes.map((e) => <option key={e}>{e}</option>)}
              </select>
            </label>
            <label>Ligne budgétaire
              <select value={filterLigne} onChange={(e) => setFilterLigne(e.target.value)}>
                <option>Toutes</option>
                {lignesBudget.map((l) => <option key={l.nom}>{l.nom}</option>)}
              </select>
            </label>
            <label>Statut staffing
              <select value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)}>
                <option>Tous</option>
                {Object.values(STATUT_LABEL).map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label>Priorité
              <select value={filterPriorite} onChange={(e) => setFilterPriorite(e.target.value)}>
                <option>Toutes</option>
                <option>Haute</option><option>Moyenne</option><option>Basse</option>
              </select>
            </label>
            <label className="ns-search">
              <Search size={14} />
              <input placeholder="Rechercher une tâche, un projet..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </label>
            <button type="button" className="ns-reset" onClick={resetFiltres}><RotateCcw size={14} />Réinitialiser</button>
          </div>

          <div className="ns-info-banner">
            <Info size={14} />
            {activeTab === 'a-configurer' && <span>Les tâches sont importées depuis Wrike. Rattachez-les à une ligne budgétaire, définissez les EHS nécessaires puis staffez un collaborateur.</span>}
            {activeTab === 'prete' && <span>Ces tâches ont déjà leur ligne budgétaire et leurs EHS définis. Il ne reste plus qu'à leur attribuer un collaborateur.</span>}
            {activeTab === 'staffee' && <span>Ces tâches sont déjà staffées et assignées à un collaborateur.</span>}
          </div>

          <section className="ns-table-panel">
            <div className="ns-table-head">
              <h3>Liste des tâches importées de Wrike <span className="ns-count-badge">{filtered.length}</span></h3>
              <div className="ns-table-head-actions">
                <ColumnsMenu columns={nsColumns} hiddenColumns={hiddenColumns} onToggle={toggleColumn} buttonClassName="ns-cols-btn" />
                <label>Afficher<select defaultValue={10}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select></label>
                <span>1-{filtered.length} sur {filtered.length}</span>
                <button type="button" disabled><ChevronLeft size={14} /></button>
                <button type="button" disabled><ChevronRight size={14} /></button>
              </div>
            </div>
            <div className="ns-table-wrap">
              <table className="ns-table">
                <thead>
                  <tr>
                    {visibleColumns.map((c) => <th key={c.id}>{c.label}</th>)}
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={visibleColumns.length + 1} className="ns-empty">Aucune tâche ne correspond à ces filtres.</td></tr>
                  )}
                  {filtered.map((tache) => (
                    <tr key={tache.id} className={selectedId === tache.id ? 'ns-row-selected' : ''} onClick={() => handleSelect(tache)}>
                      {visibleColumns.map((c) => {
                        const def = NS_CELL_DEFS[c.id]
                        return <td key={c.id} className={def.className}>{def.render(tache)}</td>
                      })}
                      <td onClick={(e) => e.stopPropagation()}>
                        <button type="button" className="ns-action-btn" onClick={() => handleSelect(tache)}>
                          {tache.statut === 'a-configurer' && 'Configurer'}
                          {tache.statut === 'prete' && 'Staffer'}
                          {tache.statut === 'staffee' && <><Eye size={13} />Voir</>}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="ns-detail">
          <h3>Détail de la tâche sélectionnée</h3>
          {!selected && (
            <div className="ns-detail-empty">
              <Inbox size={26} />
              <p>Sélectionnez une tâche dans la liste pour voir son détail et la configurer.</p>
            </div>
          )}

          {selected && (
            <>
              <div className="ns-detail-head">
                <span className={`ns-detail-check ns-statut-${STATUT_CLASS[selected.statut]}`}><CheckCircle2 size={14} /></span>
                <strong>{selected.id}</strong>
                <span className="ns-detail-badge">Reçue de Wrike</span>
              </div>

              <dl className="ns-detail-info">
                <div><dt>Projet</dt><dd>{selected.projet}</dd></div>
                <div><dt>Tâche</dt><dd>{selected.tache}</dd></div>
                <div><dt>Équipe</dt><dd>{selected.equipe}</dd></div>
                <div><dt>Créée le</dt><dd>{selected.creeLe}</dd></div>
                <div><dt>Échéance</dt><dd className="ns-echeance">{selected.echeance}</dd></div>
                <div><dt>Priorité</dt><dd><span className={`ns-priorite ns-priorite-${PRIORITE_CLASS[selected.priorite]}`}>{selected.priorite}</span></dd></div>
              </dl>

              <div className="ns-detail-section">
                <h4>1. Rattachement budgétaire</h4>
                <label className="ns-detail-field">
                  Ligne budgétaire *
                  <select
                    value={formLigne}
                    disabled={selected.statut !== 'a-configurer'}
                    onChange={(e) => setFormLigne(e.target.value)}
                  >
                    <option value="">Sélectionner une ligne</option>
                    {lignesBudget.map((l) => <option key={l.nom} value={l.nom}>{l.nom}</option>)}
                  </select>
                </label>
                {formLigne !== '' && (
                  <div className="ns-ehs-box">
                    <span>EHS restant disponibles <Info size={12} /></span>
                    <strong>{fmtEhs(ligneChoisieDisponible)} EHS</strong>
                    <small>Disponibles sur cette ligne budgétaire</small>
                  </div>
                )}
              </div>

              <div className="ns-detail-section">
                <h4>2. EHS à affecter à cette tâche</h4>
                <label className="ns-detail-field">
                  EHS nécessaires pour réaliser cette tâche *
                  <div className="ns-ehs-input">
                    <input
                      type="number"
                      min={0}
                      step="0.5"
                      value={formEhs}
                      disabled={selected.statut !== 'a-configurer'}
                      onChange={(e) => setFormEhs(e.target.value)}
                    />
                    <span>EHS</span>
                  </div>
                </label>
                {selected.statut === 'a-configurer' && formLigne !== '' && formEhs !== '' && !budgetValide && (
                  <small className="ns-field-error">EHS invalides ou supérieurs au disponible de la ligne.</small>
                )}
              </div>

              <div className="ns-detail-section">
                <h4>
                  3. Staffing
                  {selected.statut === 'prete' && !selected.collaborateur && (
                    staffingUnlocked ? <Unlock size={12} className="ns-lock-icon unlocked" /> : <Lock size={12} className="ns-lock-icon" />
                  )}
                </h4>

                {selected.statut === 'prete' && !selected.collaborateur && staffingUnlocked ? (
                  <>
                    <label className="ns-detail-field">
                      Attribuer à *
                      <CollaborateurSelect equipe={selected.equipe} value={formCollaborateur} onChange={setFormCollaborateur} autoFocus />
                    </label>
                    <div className="ns-detail-actions">
                      <button type="button" className="ns-btn-primary" disabled={formCollaborateur === ''} onClick={handleAssignerCollaborateur}>Enregistrer</button>
                      <button type="button" className="ns-btn-secondary" onClick={() => { setStaffingUnlocked(false); setFormCollaborateur('') }}><X size={13} />Annuler</button>
                    </div>
                  </>
                ) : (
                  <div className="ns-staff-readonly">
                    {selected.collaborateur ? (
                      <span className="ns-employee">
                        <span className="ns-employee-dot">{initiales(selected.collaborateur)}</span>
                        <span><strong>{selected.collaborateur}</strong><small>{selected.collaborateurProfil}</small></span>
                      </span>
                    ) : (
                      <p className="ns-staff-empty">
                        {selected.statut === 'a-configurer'
                          ? "Configurez d'abord la ligne budgétaire et les EHS. L'attribution d'un collaborateur se fait ensuite depuis l'onglet « Prêtes à staffer »."
                          : 'Aucun collaborateur attribué pour le moment.'}
                      </p>
                    )}
                  </div>
                )}

                {selected.statut === 'prete' && !selected.collaborateur && !staffingUnlocked && (
                  <button type="button" className="ns-btn-secondary" onClick={() => setStaffingUnlocked(true)}><Unlock size={13} />Attribuer un collaborateur</button>
                )}

                {selected.statut === 'staffee' && selected.staffeLe && (
                  <div className="ns-staffe-info">
                    <Clock3 size={13} />Staffée le {selected.staffeLe}
                  </div>
                )}
              </div>

              {selected.statut === 'a-configurer' && (
                <div className="ns-detail-actions">
                  <button type="button" className="ns-btn-primary" disabled={!budgetValide} onClick={handleEnregistrerSansStaffing}>Enregistrer la configuration</button>
                </div>
              )}
            </>
          )}
        </aside>
      </div>
    </section>
  )
}
