import { useState } from 'react'
import {
  AlertCircle, Calendar, CheckCircle2, ChevronLeft, ChevronRight, Clock, Download, Folder,
  ListChecks, MoreVertical, PlayCircle, RefreshCw, RotateCcw, Search, TrendingDown, TrendingUp,
  User, UserCheck, Users,
} from 'lucide-react'
import './ExecuteStaffingPage.css'

interface TacheExecutee {
  code: string
  nom: string
  attribueA: string
  profil: string
  dateAssignation: string
  dateEcheance: string
  statut: 'Terminée' | 'En cours' | 'En retard'
  progTemporelle: number
  progEhs: number
  progMonetaire: number
  ehsPrevu: number | null
  ehsConsomme: number | null
  ehsRestant: number | null
  derniereMaj: string
}

const TACHES: TacheExecutee[] = [
  { code: 'BO1-T01', nom: 'Saisie des écritures comptables', attribueA: 'Ibrahim Mbouombouo', profil: 'Comptable Senior', dateAssignation: '02/05/2025', dateEcheance: '20/05/2025', statut: 'Terminée', progTemporelle: 100, progEhs: 100, progMonetaire: 100, ehsPrevu: 15, ehsConsomme: 15, ehsRestant: 0, derniereMaj: '20/05/2025 16:20' },
  { code: 'BO1-T02', nom: 'Rapprochement bancaire', attribueA: 'Belomo Edwige', profil: 'Analyste Financier', dateAssignation: '02/05/2025', dateEcheance: '20/05/2025', statut: 'En cours', progTemporelle: 60, progEhs: 50, progMonetaire: 60, ehsPrevu: 20, ehsConsomme: 10, ehsRestant: 10, derniereMaj: '20/05/2025 16:15' },
  { code: 'BO1-T03', nom: 'Établissement des déclarations fiscales', attribueA: 'Essogo Erine', profil: 'Analyste Financier', dateAssignation: '03/05/2025', dateEcheance: '20/05/2025', statut: 'En cours', progTemporelle: 30, progEhs: 20, progMonetaire: 20, ehsPrevu: 30, ehsConsomme: 6, ehsRestant: 24, derniereMaj: '20/05/2025 15:30' },
  { code: 'MO1-T01', nom: 'Analyse financière', attribueA: 'Pamella Guebediang', profil: 'Contrôleur de gestion', dateAssignation: '05/05/2025', dateEcheance: '20/05/2025', statut: 'En cours', progTemporelle: 45, progEhs: 40, progMonetaire: 40, ehsPrevu: 25, ehsConsomme: 10, ehsRestant: 15, derniereMaj: '20/05/2025 16:30' },
  { code: 'MO1-T02', nom: 'Préparation du budget', attribueA: 'Herman Tsaffock', profil: 'Analyste Financier', dateAssignation: '06/05/2025', dateEcheance: '10/06/2025', statut: 'En retard', progTemporelle: 25, progEhs: 25, progMonetaire: 25, ehsPrevu: 18, ehsConsomme: 3.6, ehsRestant: 14.4, derniereMaj: '20/05/2025 14:10' },
  { code: 'FO1-T01', nom: 'Reporting mensuel', attribueA: 'Assabe Zainabou', profil: 'Chargé Reporting', dateAssignation: '07/05/2025', dateEcheance: '12/06/2025', statut: 'En cours', progTemporelle: 70, progEhs: 70, progMonetaire: 60, ehsPrevu: null, ehsConsomme: null, ehsRestant: null, derniereMaj: '20/05/2025 16:05' },
  { code: 'OP1-T01', nom: 'Suivi des opérations', attribueA: 'Mbarga Thibaut', profil: 'Opérateur ERP', dateAssignation: '08/05/2025', dateEcheance: '15/06/2025', statut: 'En cours', progTemporelle: 25, progEhs: 15, progMonetaire: 20, ehsPrevu: 22, ehsConsomme: 3.3, ehsRestant: 18.7, derniereMaj: '20/05/2025 15:40' },
  { code: 'PI1-T01', nom: 'Planification stratégique', attribueA: 'Théodore Bessala', profil: 'Chef de projet', dateAssignation: '08/05/2025', dateEcheance: '20/06/2025', statut: 'En cours', progTemporelle: 40, progEhs: 30, progMonetaire: 30, ehsPrevu: 16, ehsConsomme: 4.8, ehsRestant: 11.2, derniereMaj: '20/05/2025 16:20' },
]

const KPIS = [
  { icon: ListChecks, tone: 'blue', label: 'Tâches totales du projet', value: '44', sub: '100%' },
  { icon: CheckCircle2, tone: 'green', label: 'Tâches terminées', value: '16', sub: '36,36%' },
  { icon: Clock, tone: 'orange', label: 'Tâches en cours', value: '22', sub: '50,00%' },
  { icon: AlertCircle, tone: 'red', label: 'Tâches en retard', value: '6', sub: '13,64%' },
  { icon: Users, tone: 'purple', label: 'Heures travaillées totales', value: '482,50 EHS', sub: 'Sur 256,00 EHS prévus' },
  { icon: TrendingUp, tone: 'indigo', label: 'Avancement global du projet', value: '32%', sub: 'Progression moyenne', progress: 32 },
]

const PLUS_ACTIFS = [
  { nom: 'Ibrahim Mbouombouo', profil: 'Comptable Senior', enCours: 1, terminees: 2, ehs: 25, percent: 25.88 },
  { nom: 'Belomo Edwige', profil: 'Analyste Financier', enCours: 1, terminees: 0, ehs: 16, percent: 16.57 },
  { nom: 'Pamella Guebediang', profil: 'Contrôleur de gestion', enCours: 1, terminees: 0, ehs: 10, percent: 10.35 },
]

const MOINS_ACTIFS = [
  { nom: 'Erine Essogo', profil: 'Analyste Financier', enCours: 1, terminees: 0, ehs: 0, percent: 0 },
  { nom: 'Assabe Zainabou', profil: 'Chargé Reporting', enCours: 1, terminees: 0, ehs: 5, percent: 5.18 },
  { nom: 'Théodore Bessala', profil: 'Chef de projet', enCours: 1, terminees: 0, ehs: 4.8, percent: 4.97 },
]

const CONSOMMATION_PAR_STATUT = [
  { label: 'Terminées', value: 102, color: '#16a34a' },
  { label: 'En cours', value: 96, color: '#3b82f6' },
  { label: 'En retard', value: 30, color: '#dc2626' },
  { label: 'À venir', value: 28, color: '#9ca3af' },
]

const fmtEhs = (value: number | null) => value === null ? '-' : value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const statutClass = (statut: TacheExecutee['statut']) => statut === 'Terminée' ? 'termine' : statut === 'En retard' ? 'retard' : 'cours'

function ProgressBar({ value, tone }: { value: number; tone: string }) {
  return (
    <div className="es-progress">
      <span className="es-progress-track"><i className={tone} style={{ width: `${value}%` }} /></span>
      <b>{value}%</b>
    </div>
  )
}

function ConsommationDonut() {
  const total = CONSOMMATION_PAR_STATUT.reduce((sum, item) => sum + item.value, 0)
  const cx = 80, cy = 80, outer = 68, inner = 44
  const slices = CONSOMMATION_PAR_STATUT.reduce<{ label: string; value: number; color: string; path: string }[]>((acc, item) => {
    const from = acc.length > 0 ? acc.reduce((sum, s) => sum + s.value, 0) / total : 0
    const to = from + item.value / total
    const point = (ratio: number, r: number) => {
      const angle = -Math.PI / 2 + ratio * Math.PI * 2
      return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as const
    }
    const [x1, y1] = point(from, outer)
    const [x2, y2] = point(to, outer)
    const [xi2, yi2] = point(to, inner)
    const [xi1, yi1] = point(from, inner)
    const large = to - from > 0.5 ? 1 : 0
    acc.push({ ...item, path: `M ${x1} ${y1} A ${outer} ${outer} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${inner} ${inner} 0 ${large} 0 ${xi1} ${yi1} Z` })
    return acc
  }, [])

  return (
    <div className="es-donut-wrap">
      <svg viewBox="0 0 160 160" className="es-donut-svg" role="img" aria-label="Consommation EHS par statut">
        {slices.map((slice) => <path key={slice.label} d={slice.path} fill={slice.color} />)}
        <text x={cx} y={cy - 4} textAnchor="middle" className="es-donut-value">{total.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</text>
        <text x={cx} y={cy + 13} textAnchor="middle" className="es-donut-sub">EHS prévus</text>
      </svg>
      <ul className="es-donut-legend">
        {CONSOMMATION_PAR_STATUT.map((item) => (
          <li key={item.label}>
            <i style={{ background: item.color }} />
            <span>{item.label}</span>
            <b>{item.value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EHS</b>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function ExecuteStaffingPage({ navigateTo }: { navigateTo: (page: string) => void }) {
  const [search, setSearch] = useState('')
  const [autoSync, setAutoSync] = useState(true)

  return (
    <section className="es-page">
      <nav className="es-subtabs">
        <button onClick={() => navigateTo('staffing')}><UserCheck size={14} />Nouveau staffing</button>
        <button className="active" onClick={() => navigateTo('staffing-execute')}><PlayCircle size={14} />Exécuté staffing</button>
      </nav>

      <div className="es-info-bar">
        <div className="es-info-item">
          <span className="es-info-icon"><Folder size={16} /></span>
          <div><small>Projet</small><strong>PRJ.001 - ERP Academy</strong><span>Développement du nouvel ERP</span></div>
        </div>
        <div className="es-info-sep" />
        <div className="es-info-item">
          <span className="es-info-icon"><Calendar size={16} /></span>
          <div><small>Période du projet</small><strong>01/05/2025 → 31/12/2025</strong><span>Durée totale : 245 jours</span></div>
        </div>
        <div className="es-info-sep" />
        <div className="es-info-item">
          <span className="es-info-icon"><User size={16} /></span>
          <div><small>Manager du projet</small><strong>Ajara Lamare</strong><span>Manager PI</span></div>
        </div>
      </div>

      <div className="es-kpis">
        {KPIS.map((kpi) => (
          <article key={kpi.label} className={`es-kpi es-kpi-${kpi.tone}`}>
            <span className="es-kpi-icon"><kpi.icon size={17} /></span>
            <div>
              <span className="es-kpi-label">{kpi.label}</span>
              <strong>{kpi.value}</strong>
              <small>{kpi.sub}</small>
              {typeof kpi.progress === 'number' && <span className="es-kpi-track"><i style={{ width: `${kpi.progress}%` }} /></span>}
            </div>
          </article>
        ))}
      </div>

      <div className="es-filters">
        <label>Division<select defaultValue="Toutes"><option>Toutes</option></select></label>
        <label>Employé<select defaultValue="Tous"><option>Tous</option></select></label>
        <label>Statut<select defaultValue="Tous"><option>Tous</option></select></label>
        <label className="es-search">
          <Search size={14} />
          <input placeholder="Rechercher une tâche, un projet ou un employé..." value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <button type="button" className="es-reset" onClick={() => setSearch('')}><RotateCcw size={14} />Réinitialiser</button>
        <label>Période d’affichage<div className="es-daterange"><Calendar size={13} />01/05/2025 → 31/12/2025</div></label>
        <button type="button" className="es-btn-primary"><Download size={14} />Exporter</button>
      </div>

      <section className="es-table-panel">
        <div className="es-table-head"><h3>Tâches exécutées <span className="es-count-badge">44</span></h3></div>
        <div className="es-table-wrap">
          <table className="es-table">
            <thead>
              <tr>
                <th>Code</th><th>Nom de la tâche</th><th>Attribué à (Employé)</th><th>Profil / Emploi</th>
                <th>Date d’assignation</th><th>Date d’échéance</th><th>Statut</th>
                <th>Progression temporelle</th><th>Progression EHS</th><th>Progression monétaire</th>
                <th>EHS prévus</th><th>EHS consommés</th><th>EHS restants</th><th>Dernière mise à jour</th><th></th>
              </tr>
            </thead>
            <tbody>
              {TACHES.map((tache) => (
                <tr key={tache.code}>
                  <td className="es-code">{tache.code}</td>
                  <td className="es-name">{tache.nom}</td>
                  <td>
                    <span className="es-employee"><span className="es-employee-dot">{tache.attribueA.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span>{tache.attribueA}</span>
                  </td>
                  <td>{tache.profil}</td>
                  <td>{tache.dateAssignation}</td>
                  <td>{tache.dateEcheance}</td>
                  <td><span className={`es-pill es-pill-${statutClass(tache.statut)}`}>{tache.statut}</span></td>
                  <td><ProgressBar value={tache.progTemporelle} tone="blue" /></td>
                  <td><ProgressBar value={tache.progEhs} tone="green" /></td>
                  <td><ProgressBar value={tache.progMonetaire} tone="orange" /></td>
                  <td>{fmtEhs(tache.ehsPrevu)}</td>
                  <td>{fmtEhs(tache.ehsConsomme)}</td>
                  <td>{fmtEhs(tache.ehsRestant)}</td>
                  <td className="es-maj">{tache.derniereMaj}</td>
                  <td><button type="button" className="es-row-action" aria-label="Actions"><MoreVertical size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="es-table-foot">
          <span>Affichage de 1 à {TACHES.length} sur 44 tâches</span>
          <div className="es-table-foot-right">
            <label className="es-page-size">Lignes par page
              <select defaultValue={10}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select>
            </label>
            <nav className="es-pagination" aria-label="Pagination">
              <button type="button" disabled><ChevronLeft size={14} /></button>
              <button type="button" className="is-active">1</button>
              <button type="button">2</button>
              <button type="button">3</button>
              <button type="button">4</button>
              <button type="button">5</button>
              <button type="button"><ChevronRight size={14} /></button>
            </nav>
          </div>
        </div>
      </section>

      <div className="es-bottom">
        <div className="es-mini-panel good">
          <h3><TrendingUp size={15} />Les 3 employés les plus actifs (en EHS consommés)</h3>
          <table className="es-mini-table">
            <thead><tr><th>Employé</th><th>En cours</th><th>Terminées</th><th>EHS consommés</th><th>% du total EHS</th></tr></thead>
            <tbody>
              {PLUS_ACTIFS.map((row) => (
                <tr key={row.nom}>
                  <td className="es-name"><strong>{row.nom}</strong><small>{row.profil}</small></td>
                  <td>{row.enCours}</td>
                  <td>{row.terminees}</td>
                  <td>{fmtEhs(row.ehs)}</td>
                  <td><div className="es-mini-bar"><span className="es-mini-track"><i className="good" style={{ width: `${row.percent}%` }} /></span><b>{row.percent.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</b></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="es-mini-panel bad">
          <h3><TrendingDown size={15} />Les 3 employés les moins actifs (en EHS consommés)</h3>
          <table className="es-mini-table">
            <thead><tr><th>Employé</th><th>En cours</th><th>Terminées</th><th>EHS consommés</th><th>% du total EHS</th></tr></thead>
            <tbody>
              {MOINS_ACTIFS.map((row) => (
                <tr key={row.nom}>
                  <td className="es-name"><strong>{row.nom}</strong><small>{row.profil}</small></td>
                  <td>{row.enCours}</td>
                  <td>{row.terminees}</td>
                  <td>{fmtEhs(row.ehs)}</td>
                  <td><div className="es-mini-bar"><span className="es-mini-track"><i className="bad" style={{ width: `${Math.max(row.percent, 3)}%` }} /></span><b>{row.percent.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</b></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="es-mini-panel">
          <h3>Consommation EHS par statut</h3>
          <ConsommationDonut />
        </div>
      </div>

      <div className="es-sync-bar">
        <span><RefreshCw size={13} />Les données sont mises à jour en temps réel. Dernière synchronisation : 20/05/2025 à 16:20</span>
        <button type="button" className={`es-toggle ${autoSync ? 'is-on' : ''}`} onClick={() => setAutoSync((value) => !value)}>
          <i /><span>Mise à jour automatique {autoSync ? 'activée' : 'désactivée'}</span>
        </button>
      </div>
    </section>
  )
}
