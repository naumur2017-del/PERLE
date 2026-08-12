import { useState } from 'react'
import {
  Calendar, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Download,
  ExternalLink, FileText, Folder, Info, ListChecks, MessageCircle, MoreVertical, Pause, Play,
  RotateCcw, Search, SlidersHorizontal, UserCheck, X,
} from 'lucide-react'
import './ExecuteStaffingPage.css'

type StatutStaffing = 'en-attente' | 'accepte' | 'refuse'
type StatutExecution = 'en-cours' | 'en-pause' | 'terminee'
type Tab = 'a-accepter' | 'en-cours' | 'en-pause' | 'terminee'

interface TacheAssignee {
  id: string
  projet: string
  tache: string
  description: string
  attribueePar: string
  attribueeParRole: string
  equipe: string
  ligneBudgetaire: string
  ehsAffectes: number
  debut: string
  echeance: string
  priorite: 'Haute' | 'Moyenne' | 'Basse'
  pieceJointe: string | null
  statutStaffing: StatutStaffing
  statutExecution: StatutExecution | null
}

const TACHES_INITIAL: TacheAssignee[] = [
  { id: 'WRK-1457', projet: 'ERP Academy', tache: 'Mission de collecte des données', description: 'Collecter les données auprès des bénéficiaires selon le questionnaire validé.', attribueePar: 'Ajara Lamare', attribueeParRole: 'Manager MO1', equipe: 'MO1 - Middle Office 1', ligneBudgetaire: 'Déplacements terrain', ehsAffectes: 16, debut: '20/05/2025', echeance: '15/06/2025', priorite: 'Haute', pieceJointe: 'Questionnaire_collecte_donnees.pdf', statutStaffing: 'en-attente', statutExecution: null },
  { id: 'WRK-1458', projet: 'ERP Academy', tache: 'Rédaction rapport préliminaire', description: 'Rédiger le rapport préliminaire de synthèse à partir des données collectées.', attribueePar: 'Ajara Lamare', attribueeParRole: 'Manager MO1', equipe: 'MO1 - Middle Office 1', ligneBudgetaire: 'Études et analyses', ehsAffectes: 12, debut: '22/05/2025', echeance: '30/06/2025', priorite: 'Moyenne', pieceJointe: null, statutStaffing: 'en-attente', statutExecution: null },
  { id: 'WRK-1459', projet: 'ERP Academy', tache: 'Atelier de restitution intermédiaire', description: "Organiser l'atelier de restitution intermédiaire avec les parties prenantes.", attribueePar: 'Ajara Lamare', attribueeParRole: 'Manager MO1', equipe: 'MO1 - Middle Office 1', ligneBudgetaire: 'Réunions et ateliers', ehsAffectes: 8, debut: '25/05/2025', echeance: '05/06/2025', priorite: 'Basse', pieceJointe: null, statutStaffing: 'en-attente', statutExecution: null },

  { id: 'WRK-1456', projet: 'ERP Academy', tache: 'Analyse des besoins utilisateurs', description: 'Recueillir et documenter les besoins fonctionnels auprès des utilisateurs clés.', attribueePar: 'Ajara Lamare', attribueeParRole: 'Manager MO1', equipe: 'MO1 - Middle Office 1', ligneBudgetaire: 'Études et analyses', ehsAffectes: 20, debut: '01/05/2025', echeance: '10/05/2025', priorite: 'Haute', pieceJointe: null, statutStaffing: 'accepte', statutExecution: 'en-cours' },
  { id: 'WRK-1462', projet: 'Mission Audit Interne', tache: 'Revue des contrôles internes', description: 'Passer en revue les contrôles internes du cycle achats-fournisseurs.', attribueePar: 'Herman Tsaffock', attribueeParRole: 'Manager BO1', equipe: 'BO1 - Back Office 1', ligneBudgetaire: 'Déplacements terrain', ehsAffectes: 20, debut: '03/05/2025', echeance: '22/05/2025', priorite: 'Haute', pieceJointe: null, statutStaffing: 'accepte', statutExecution: 'en-cours' },
  { id: 'WRK-1463', projet: 'Digitalisation RH', tache: 'Paramétrage du SIRH', description: "Paramétrer les modules congés et absences du SIRH.", attribueePar: 'Belomo Edwige', attribueeParRole: 'Manager IT1', equipe: 'IT1 - Développement 1', ligneBudgetaire: 'Formation équipe', ehsAffectes: 8, debut: '04/05/2025', echeance: '28/05/2025', priorite: 'Basse', pieceJointe: null, statutStaffing: 'accepte', statutExecution: 'en-cours' },
  { id: 'WRK-1464', projet: 'Étude de faisabilité usine', tache: 'Analyse des coûts', description: "Chiffrer les coûts d'investissement et d'exploitation du projet d'usine.", attribueePar: 'Pamela G.', attribueeParRole: 'Manager PI1', equipe: 'PI1 - Pilotage 1', ligneBudgetaire: 'Achat matériel', ehsAffectes: 15, debut: '05/05/2025', echeance: '02/06/2025', priorite: 'Moyenne', pieceJointe: null, statutStaffing: 'accepte', statutExecution: 'en-cours' },
  { id: 'WRK-1465', projet: 'ERP Academy', tache: "Tests d'intégration module RH", description: "Exécuter les scénarios de tests d'intégration du module RH.", attribueePar: 'Ajara Lamare', attribueeParRole: 'Manager MO1', equipe: 'IT1 - Développement 1', ligneBudgetaire: 'Support technique', ehsAffectes: 10, debut: '06/05/2025', echeance: '10/06/2025', priorite: 'Haute', pieceJointe: null, statutStaffing: 'accepte', statutExecution: 'en-cours' },

  { id: 'WRK-1460', projet: 'ERP Academy', tache: 'Validation rapport final', description: 'Faire valider le rapport final par le comité de pilotage.', attribueePar: 'Ajara Lamare', attribueeParRole: 'Manager MO1', equipe: 'MO1 - Middle Office 1', ligneBudgetaire: 'Contrôle qualité', ehsAffectes: 10, debut: '05/06/2025', echeance: '12/06/2025', priorite: 'Haute', pieceJointe: null, statutStaffing: 'accepte', statutExecution: 'en-pause' },
  { id: 'WRK-1466', projet: 'Formation 200 Agents', tache: 'Préparation supports pédagogiques', description: 'Concevoir les supports pédagogiques de la formation des 200 agents.', attribueePar: 'Essogo Erine', attribueeParRole: 'Manager FO1', equipe: 'FO1 - Front Office 1', ligneBudgetaire: 'Consultation externe', ehsAffectes: 14, debut: '08/05/2025', echeance: '20/06/2025', priorite: 'Moyenne', pieceJointe: null, statutStaffing: 'accepte', statutExecution: 'en-pause' },
  { id: 'WRK-1467', projet: 'Implémentation CRM', tache: 'Paramétrage des workflows', description: 'Paramétrer les workflows de validation des opportunités commerciales.', attribueePar: 'Théodore Bessala', attribueeParRole: 'Manager PI1', equipe: 'PI1 - Pilotage 1', ligneBudgetaire: 'Support technique', ehsAffectes: 12, debut: '10/05/2025', echeance: '25/06/2025', priorite: 'Basse', pieceJointe: null, statutStaffing: 'accepte', statutExecution: 'en-pause' },
  { id: 'WRK-1468', projet: 'Refonte SI Comptable', tache: 'Migration des données', description: "Migrer les données comptables historiques vers le nouveau système.", attribueePar: 'Brayan Ebongue', attribueeParRole: 'Manager IT1', equipe: 'IT1 - Développement 1', ligneBudgetaire: 'Achat matériel', ehsAffectes: 18, debut: '12/05/2025', echeance: '30/06/2025', priorite: 'Haute', pieceJointe: null, statutStaffing: 'accepte', statutExecution: 'en-pause' },

  { id: 'WRK-1401', projet: 'ERP Academy', tache: 'Saisie des écritures comptables', description: 'Saisir les écritures comptables du mois dans le nouvel ERP.', attribueePar: 'Ajara Lamare', attribueeParRole: 'Manager MO1', equipe: 'BO1 - Back Office 1', ligneBudgetaire: 'Support technique', ehsAffectes: 15, debut: '28/04/2025', echeance: '12/05/2025', priorite: 'Haute', pieceJointe: null, statutStaffing: 'accepte', statutExecution: 'terminee' },
  { id: 'WRK-1402', projet: 'ERP Academy', tache: 'Rapprochement bancaire', description: 'Effectuer le rapprochement bancaire du mois écoulé.', attribueePar: 'Ajara Lamare', attribueeParRole: 'Manager MO1', equipe: 'BO1 - Back Office 1', ligneBudgetaire: 'Déplacements terrain', ehsAffectes: 20, debut: '28/04/2025', echeance: '12/05/2025', priorite: 'Haute', pieceJointe: null, statutStaffing: 'accepte', statutExecution: 'terminee' },
  { id: 'WRK-1403', projet: 'Mission Audit Interne', tache: 'Établissement des déclarations fiscales', description: 'Préparer et déposer les déclarations fiscales du trimestre.', attribueePar: 'Herman Tsaffock', attribueeParRole: 'Manager BO1', equipe: 'BO1 - Back Office 1', ligneBudgetaire: 'Consultation externe', ehsAffectes: 30, debut: '29/04/2025', echeance: '13/05/2025', priorite: 'Haute', pieceJointe: null, statutStaffing: 'accepte', statutExecution: 'terminee' },
  { id: 'WRK-1404', projet: 'ERP Academy', tache: 'Analyse financière', description: "Analyser les indicateurs financiers clés du projet.", attribueePar: 'Ajara Lamare', attribueeParRole: 'Manager MO1', equipe: 'MO1 - Middle Office 1', ligneBudgetaire: 'Achat matériel', ehsAffectes: 25, debut: '29/04/2025', echeance: '14/05/2025', priorite: 'Moyenne', pieceJointe: null, statutStaffing: 'accepte', statutExecution: 'terminee' },
  { id: 'WRK-1405', projet: 'Digitalisation RH', tache: 'Préparation du budget', description: 'Préparer le budget prévisionnel du projet RH.', attribueePar: 'Belomo Edwige', attribueeParRole: 'Manager IT1', equipe: 'MO1 - Middle Office 1', ligneBudgetaire: 'Formation équipe', ehsAffectes: 18, debut: '30/04/2025', echeance: '14/05/2025', priorite: 'Moyenne', pieceJointe: null, statutStaffing: 'accepte', statutExecution: 'terminee' },
  { id: 'WRK-1406', projet: 'Étude de faisabilité usine', tache: 'Suivi des opérations', description: 'Suivre l\'avancement des opérations terrain du projet.', attribueePar: 'Pamela G.', attribueeParRole: 'Manager PI1', equipe: 'OP1 - Opérations 1', ligneBudgetaire: 'Support technique', ehsAffectes: 22, debut: '30/04/2025', echeance: '15/05/2025', priorite: 'Moyenne', pieceJointe: null, statutStaffing: 'accepte', statutExecution: 'terminee' },
  { id: 'WRK-1407', projet: 'ERP Academy', tache: 'Planification stratégique', description: 'Élaborer le planning stratégique du prochain trimestre.', attribueePar: 'Ajara Lamare', attribueeParRole: 'Manager MO1', equipe: 'PI1 - Pilotage 1', ligneBudgetaire: 'Déplacements terrain', ehsAffectes: 16, debut: '01/05/2025', echeance: '15/05/2025', priorite: 'Moyenne', pieceJointe: null, statutStaffing: 'accepte', statutExecution: 'terminee' },
  { id: 'WRK-1408', projet: 'Formation 200 Agents', tache: 'Recueil des besoins de formation', description: 'Recenser les besoins de formation auprès des 200 agents.', attribueePar: 'Essogo Erine', attribueeParRole: 'Manager FO1', equipe: 'FO1 - Front Office 1', ligneBudgetaire: 'Études et analyses', ehsAffectes: 10, debut: '20/04/2025', echeance: '05/05/2025', priorite: 'Basse', pieceJointe: null, statutStaffing: 'accepte', statutExecution: 'terminee' },
  { id: 'WRK-1409', projet: 'Implémentation CRM', tache: 'Cahier des charges', description: 'Rédiger le cahier des charges fonctionnel du CRM.', attribueePar: 'Théodore Bessala', attribueeParRole: 'Manager PI1', equipe: 'PI1 - Pilotage 1', ligneBudgetaire: 'Consultation externe', ehsAffectes: 14, debut: '18/04/2025', echeance: '02/05/2025', priorite: 'Moyenne', pieceJointe: null, statutStaffing: 'accepte', statutExecution: 'terminee' },
  { id: 'WRK-1410', projet: 'Refonte SI Comptable', tache: "Audit de l'existant", description: "Réaliser l'audit du système comptable existant.", attribueePar: 'Brayan Ebongue', attribueeParRole: 'Manager IT1', equipe: 'IT1 - Développement 1', ligneBudgetaire: 'Achat matériel', ehsAffectes: 20, debut: '15/04/2025', echeance: '28/04/2025', priorite: 'Haute', pieceJointe: null, statutStaffing: 'accepte', statutExecution: 'terminee' },
  { id: 'WRK-1411', projet: 'Mission Audit Interne', tache: 'Restitution préliminaire', description: 'Présenter les conclusions préliminaires de la mission d\'audit.', attribueePar: 'Herman Tsaffock', attribueeParRole: 'Manager BO1', equipe: 'BO1 - Back Office 1', ligneBudgetaire: 'Réunions et ateliers', ehsAffectes: 8, debut: '22/04/2025', echeance: '06/05/2025', priorite: 'Moyenne', pieceJointe: null, statutStaffing: 'accepte', statutExecution: 'terminee' },
  { id: 'WRK-1412', projet: 'ERP Academy', tache: 'Archivage des documents', description: 'Archiver les documents de la phase de cadrage du projet.', attribueePar: 'Ajara Lamare', attribueeParRole: 'Manager MO1', equipe: 'MO1 - Middle Office 1', ligneBudgetaire: 'Contrôle qualité', ehsAffectes: 6, debut: '25/04/2025', echeance: '07/05/2025', priorite: 'Basse', pieceJointe: null, statutStaffing: 'accepte', statutExecution: 'terminee' },
]

const TABS: { key: Tab; label: string }[] = [
  { key: 'a-accepter', label: 'Staffing à accepter' },
  { key: 'en-cours', label: 'En cours' },
  { key: 'en-pause', label: 'En pause' },
  { key: 'terminee', label: 'Terminer' },
]

const STATUT_STAFFING_LABEL: Record<StatutStaffing, string> = { 'en-attente': "En attente d'acceptation", accepte: 'Accepté', refuse: 'Refusé' }
const STATUT_STAFFING_CLASS: Record<StatutStaffing, string> = { 'en-attente': 'orange', accepte: 'green', refuse: 'red' }
const STATUT_EXECUTION_LABEL: Record<StatutExecution, string> = { 'en-cours': 'En cours', 'en-pause': 'En pause', terminee: 'Terminée' }
const STATUT_EXECUTION_CLASS: Record<StatutExecution, string> = { 'en-cours': 'blue', 'en-pause': 'orange', terminee: 'green' }
const PRIORITE_CLASS: Record<TacheAssignee['priorite'], string> = { Haute: 'haute', Moyenne: 'moyenne', Basse: 'basse' }

function initiales(nom: string) {
  return nom.split(' ').filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase()
}

interface ExecuteStaffingPageProps {
  navigateTo: (page: string) => void
  onStartTimer: (code: string, nom: string) => void
  onToggleTimer: (code: string) => void
  onStopTimer: (code: string) => void
  timers: { code: string; running: boolean }[]
}

export default function ExecuteStaffingPage({ navigateTo, onStartTimer, onToggleTimer, onStopTimer, timers }: ExecuteStaffingPageProps) {
  const [taches, setTaches] = useState<TacheAssignee[]>(TACHES_INITIAL)
  const [pageTab, setPageTab] = useState<'mes-taches' | 'historique'>('mes-taches')
  const [activeTab, setActiveTab] = useState<Tab>('a-accepter')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const selected = taches.find((t) => t.id === selectedId) ?? null

  const statutExecutionEffectif = (tache: TacheAssignee): StatutExecution | null => {
    if (tache.statutStaffing !== 'accepte') return null
    if (tache.statutExecution === 'terminee') return 'terminee'
    const timer = timers.find((t) => t.code === tache.id)
    if (timer) return timer.running ? 'en-cours' : 'en-pause'
    return tache.statutExecution
  }

  const tabOf = (tache: TacheAssignee): Tab | null => {
    if (tache.statutStaffing === 'en-attente') return 'a-accepter'
    if (tache.statutStaffing === 'refuse') return null
    const exec = statutExecutionEffectif(tache)
    if (exec === 'terminee') return 'terminee'
    if (exec === 'en-pause') return 'en-pause'
    if (exec === 'en-cours') return 'en-cours'
    return null
  }

  const counts: Record<Tab, number> = { 'a-accepter': 0, 'en-cours': 0, 'en-pause': 0, terminee: 0 }
  taches.forEach((t) => { const tab = tabOf(t); if (tab) counts[tab] += 1 })

  const filtered = taches.filter((t) => (
    tabOf(t) === activeTab
    && (search.trim() === '' || `${t.id} ${t.tache} ${t.projet} ${t.attribueePar}`.toLowerCase().includes(search.trim().toLowerCase()))
  ))

  const handleSelect = (tache: TacheAssignee) => setSelectedId(tache.id)
  const closePanel = () => setSelectedId(null)

  const handleAccepter = (tache: TacheAssignee) => {
    setTaches((list) => list.map((t) => t.id === tache.id ? { ...t, statutStaffing: 'accepte', statutExecution: 'en-cours' } : t))
    if (!timers.some((t) => t.code === tache.id)) onStartTimer(tache.id, tache.tache)
    setActiveTab('en-cours')
  }

  const handleDecliner = (tache: TacheAssignee) => {
    setTaches((list) => list.map((t) => t.id === tache.id ? { ...t, statutStaffing: 'refuse' } : t))
  }

  const handlePause = (tache: TacheAssignee) => {
    if (timers.some((t) => t.code === tache.id)) onToggleTimer(tache.id)
    setTaches((list) => list.map((t) => t.id === tache.id ? { ...t, statutExecution: 'en-pause' } : t))
  }

  const handleReprendre = (tache: TacheAssignee) => {
    if (timers.some((t) => t.code === tache.id)) onToggleTimer(tache.id)
    setTaches((list) => list.map((t) => t.id === tache.id ? { ...t, statutExecution: 'en-cours' } : t))
  }

  const handleTerminer = (tache: TacheAssignee) => {
    if (timers.some((t) => t.code === tache.id)) onStopTimer(tache.id)
    setTaches((list) => list.map((t) => t.id === tache.id ? { ...t, statutExecution: 'terminee' } : t))
  }

  const KPIS = [
    { icon: ListChecks, tone: 'purple', label: 'Staffings à accepter', value: counts['a-accepter'], sub: 'En attente de votre réponse' },
    { icon: Play, tone: 'blue', label: 'En cours', value: counts['en-cours'], sub: "Tâches en cours d'exécution" },
    { icon: Pause, tone: 'orange', label: 'En pause', value: counts['en-pause'], sub: 'Tâches temporairement suspendues' },
    { icon: CheckCircle2, tone: 'green', label: 'Terminer', value: counts.terminee, sub: 'Tâches à clôturer' },
  ]

  return (
    <section className="es-page">
      <div className="es-title-row">
        <div>
          <h1>Exécuté staffing <Info size={15} className="es-title-info" /></h1>
          <p>Consultez et exécutez les tâches qui vous sont affectées.</p>
        </div>
        <button type="button" className="es-btn-outline" onClick={() => navigateTo('staffing')}><UserCheck size={14} />Voir le nouveau staffing</button>
      </div>

      <div className="es-toolbar">
        <button type="button" className="es-daterange"><Calendar size={14} />01/05/2025 → 31/12/2025</button>
        <button type="button" className="es-btn-outline"><SlidersHorizontal size={14} />Filtres avancés</button>
      </div>

      <div className="es-kpis">
        {KPIS.map((kpi) => (
          <article key={kpi.label} className={`es-kpi es-kpi-${kpi.tone}`}>
            <span className="es-kpi-icon"><kpi.icon size={19} /></span>
            <strong>{kpi.value}</strong>
            <span className="es-kpi-label">{kpi.label}</span>
            <small>{kpi.sub}</small>
          </article>
        ))}
      </div>

      <div className="es-layout">
        <div className="es-main">
          <nav className="es-page-tabs">
            <button className={pageTab === 'mes-taches' ? 'active' : ''} onClick={() => setPageTab('mes-taches')}>Mes tâches</button>
            <button className={pageTab === 'historique' ? 'active' : ''} onClick={() => setPageTab('historique')}>Historique</button>
          </nav>

          {pageTab === 'mes-taches' ? (
            <>
              <nav className="es-tabs">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    className={activeTab === tab.key ? 'active' : ''}
                    onClick={() => { setActiveTab(tab.key); closePanel() }}
                  >
                    {tab.label} <span className="es-tab-count">{counts[tab.key]}</span>
                  </button>
                ))}
              </nav>

              <div className="es-filters">
                <label className="es-search">
                  <Search size={14} />
                  <input placeholder="Rechercher une tâche, un projet..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </label>
                <button type="button" className="es-reset" onClick={() => setSearch('')}><RotateCcw size={14} />Réinitialiser</button>
              </div>

              <section className="es-table-panel">
                <div className="es-table-head">
                  <h3>{TABS.find((t) => t.key === activeTab)?.label} <span className="es-count-badge">{filtered.length}</span></h3>
                </div>
                <div className="es-table-wrap">
                  <table className="es-table">
                    <thead>
                      <tr>
                        <th>Projet</th><th>Tâche (Réf. Wrike)</th><th>Attribuée par</th><th>Ligne budgétaire</th>
                        <th>EHS affectés</th><th>Début</th><th>Échéance</th><th>Statut staffing</th>
                        <th>Statut d'exécution</th><th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 && (
                        <tr><td colSpan={10} className="es-empty">Aucune tâche dans cette section.</td></tr>
                      )}
                      {filtered.map((tache) => {
                        const exec = statutExecutionEffectif(tache)
                        return (
                          <tr key={tache.id} className={selectedId === tache.id ? 'es-row-selected' : ''} onClick={() => handleSelect(tache)}>
                            <td><span className="es-projet-cell"><Folder size={13} />{tache.projet}</span></td>
                            <td className="es-name"><strong>{tache.tache}</strong><small>{tache.id}</small></td>
                            <td>
                              <span className="es-employee"><span className="es-employee-dot">{initiales(tache.attribueePar)}</span>
                                <span><strong>{tache.attribueePar}</strong><small>{tache.attribueeParRole}</small></span>
                              </span>
                            </td>
                            <td>{tache.ligneBudgetaire}</td>
                            <td>{tache.ehsAffectes.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td>{tache.debut}</td>
                            <td className={tache.statutStaffing === 'en-attente' ? 'es-echeance' : ''}>{tache.echeance}</td>
                            <td><span className={`es-pill es-pill-${STATUT_STAFFING_CLASS[tache.statutStaffing]}`}>{STATUT_STAFFING_LABEL[tache.statutStaffing]}</span></td>
                            <td>{exec ? <span className={`es-pill es-pill-${STATUT_EXECUTION_CLASS[exec]}`}>{STATUT_EXECUTION_LABEL[exec]}</span> : <span className="es-no-action">—</span>}</td>
                            <td onClick={(e) => e.stopPropagation()}>
                              <button type="button" className="es-row-action" aria-label="Actions" title="Voir le détail" onClick={() => handleSelect(tache)}>
                                <MoreVertical size={16} />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="es-table-foot">
                  <span>Affichage de 1 à {filtered.length} sur {filtered.length} tâches</span>
                  <div className="es-table-foot-right">
                    <label className="es-page-size">Lignes par page
                      <select defaultValue={10}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select>
                    </label>
                    <nav className="es-pagination" aria-label="Pagination">
                      <button type="button" disabled><ChevronLeft size={14} /></button>
                      <button type="button" className="is-active">1</button>
                      <button type="button" disabled><ChevronRight size={14} /></button>
                    </nav>
                  </div>
                </div>
              </section>

              <div className="es-legend">
                <span><i className="dot orange" />En attente d'acceptation</span>
                <span><i className="dot green" />Accepté</span>
                <span><i className="dot red" />Refusé</span>
                <span><i className="dot blue" />En cours</span>
                <span><i className="dot amber" />En pause</span>
                <span><i className="dot teal" />Terminée</span>
              </div>

              <div className="es-info-banner">
                <Info size={14} />
                <span>En acceptant le staffing, vous confirmez votre disponibilité et vous vous engagez à exécuter cette tâche dans les délais prévus.</span>
              </div>
            </>
          ) : (
            <section className="es-table-panel">
              <div className="es-table-head"><h3>Historique <span className="es-count-badge">{taches.length}</span></h3></div>
              <div className="es-table-wrap">
                <table className="es-table">
                  <thead>
                    <tr>
                      <th>Projet</th><th>Tâche (Réf. Wrike)</th><th>Attribuée par</th><th>Statut staffing</th><th>Statut d'exécution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taches.map((tache) => {
                      const exec = statutExecutionEffectif(tache)
                      return (
                        <tr key={tache.id} onClick={() => handleSelect(tache)}>
                          <td><span className="es-projet-cell"><Folder size={13} />{tache.projet}</span></td>
                          <td className="es-name"><strong>{tache.tache}</strong><small>{tache.id}</small></td>
                          <td>{tache.attribueePar}</td>
                          <td><span className={`es-pill es-pill-${STATUT_STAFFING_CLASS[tache.statutStaffing]}`}>{STATUT_STAFFING_LABEL[tache.statutStaffing]}</span></td>
                          <td>{exec ? <span className={`es-pill es-pill-${STATUT_EXECUTION_CLASS[exec]}`}>{STATUT_EXECUTION_LABEL[exec]}</span> : <span className="es-no-action">—</span>}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>

        <aside className={`es-detail ${selected ? '' : 'is-empty'}`}>
          {!selected && (
            <div className="es-detail-empty">
              <ListChecks size={26} />
              <p>Sélectionnez une tâche dans la liste pour voir son détail.</p>
            </div>
          )}

          {selected && (
            <>
              <div className="es-detail-head">
                <h3>Détail de la tâche</h3>
                <button type="button" className="es-detail-close" onClick={closePanel} aria-label="Fermer"><X size={16} /></button>
              </div>

              <div className="es-detail-id">
                <span className="es-detail-wrk">WRK</span>
                <strong>{selected.id}</strong>
                <span className="es-detail-badge">Reçue de Wrike</span>
              </div>

              <dl className="es-detail-info">
                <div><dt>Projet</dt><dd>{selected.projet}</dd></div>
                <div><dt>Tâche</dt><dd>{selected.tache}</dd></div>
                <div className="es-detail-block"><dt>Description</dt><dd>{selected.description}</dd></div>
                <div><dt>Attribuée par</dt><dd>{selected.attribueePar} ({selected.attribueeParRole})</dd></div>
                <div><dt>Équipe</dt><dd>{selected.equipe}</dd></div>
                <div><dt>Ligne budgétaire</dt><dd>{selected.ligneBudgetaire}</dd></div>
                <div><dt>EHS affectés</dt><dd>{selected.ehsAffectes.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</dd></div>
                <div><dt>Début prévue</dt><dd>{selected.debut}</dd></div>
                <div><dt>Échéance</dt><dd className="es-echeance">{selected.echeance}</dd></div>
                <div><dt>Priorité</dt><dd><span className={`es-priorite es-priorite-${PRIORITE_CLASS[selected.priorite]}`}>{selected.priorite}</span></dd></div>
                <div><dt>Lien Wrike</dt><dd>
                  <a
                    className="es-wrike-link"
                    href={`https://www.wrike.com/open.htm?id=${encodeURIComponent(selected.id)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ouvrir dans Wrike <ExternalLink size={12} />
                  </a>
                </dd></div>
              </dl>

              {selected.pieceJointe && (
                <div className="es-detail-section">
                  <h4>Pièces jointes / Consignes</h4>
                  <a className="es-attachment" href="#" onClick={(e) => e.preventDefault()}>
                    <FileText size={14} />{selected.pieceJointe}<Download size={13} className="es-attachment-dl" />
                  </a>
                </div>
              )}

              {selected.statutStaffing === 'en-attente' && (
                <>
                  <div className="es-response-box">
                    <span><Info size={13} />Votre réponse au staffing</span>
                    <p>Vous devez accepter ou décliner cette tâche pour pouvoir l'exécuter.</p>
                  </div>
                  <div className="es-detail-actions">
                    <button type="button" className="es-btn-accept" onClick={() => handleAccepter(selected)}><Check size={14} />Accepter le staffing</button>
                    <button type="button" className="es-btn-decline" onClick={() => handleDecliner(selected)}><X size={14} />Décliner</button>
                  </div>
                  <a className="es-contact-link" href="#" onClick={(e) => e.preventDefault()}><MessageCircle size={13} />Besoin d'informations complémentaires ? Contacter le manager</a>
                </>
              )}

              {selected.statutStaffing === 'refuse' && (
                <div className="es-response-box declined">
                  <span><Info size={13} />Staffing décliné</span>
                  <p>Vous avez décliné cette tâche. Contactez votre manager si vous souhaitez revenir sur cette décision.</p>
                </div>
              )}

              {selected.statutStaffing === 'accepte' && statutExecutionEffectif(selected) !== 'terminee' && (
                <>
                  <div className="es-response-box">
                    <span><Clock3 size={13} />Suivi d'exécution</span>
                    <p>{statutExecutionEffectif(selected) === 'en-cours' ? 'Cette tâche est actuellement en cours d\'exécution.' : "Cette tâche est actuellement en pause."}</p>
                  </div>
                  <div className="es-detail-actions">
                    {statutExecutionEffectif(selected) === 'en-cours' ? (
                      <button type="button" className="es-btn-pause" onClick={() => handlePause(selected)}><Pause size={14} />Mettre en pause</button>
                    ) : (
                      <button type="button" className="es-btn-accept" onClick={() => handleReprendre(selected)}><Play size={14} />Reprendre l'exécution</button>
                    )}
                    <button type="button" className="es-btn-finish" onClick={() => handleTerminer(selected)}><CheckCircle2 size={14} />Terminer la tâche</button>
                  </div>
                </>
              )}

              {selected.statutStaffing === 'accepte' && statutExecutionEffectif(selected) === 'terminee' && (
                <div className="es-response-box done">
                  <span><CheckCircle2 size={13} />Tâche terminée</span>
                  <p>Cette tâche a été clôturée. Retrouvez-la dans l'onglet « Historique ».</p>
                </div>
              )}
            </>
          )}
        </aside>
      </div>
    </section>
  )
}
