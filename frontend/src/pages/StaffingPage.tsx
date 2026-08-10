import { useState } from 'react'
import {
  Calendar, CalendarClock, ChevronLeft, ChevronRight, ExternalLink, Folder, Hourglass, ListChecks,
  MoreVertical, PlayCircle, RotateCcw, Search, TrendingDown, TrendingUp, User, UserCheck,
} from 'lucide-react'
import './StaffingPage.css'

interface TacheStaffing {
  code: string
  nom: string
  type: 'E' | 'D'
  priorite: 'Haute' | 'Moyenne' | 'Basse'
  division: string
  profil: string
  employe: string
  employeProfil: string
  ehsAlloues: number | null
  ehsConsommes: number | null
  ehsRestants: number | null
  progTemporelle: number | null
  progEhs: number | null
  progMonetaire: number | null
}

const TACHES: TacheStaffing[] = [
  { code: 'BO1-T01', nom: 'Saisie des écritures comptables', type: 'E', priorite: 'Haute', division: 'BO', profil: 'Comptable Senior', employe: 'Ibrahim Mbouombouo', employeProfil: 'Comptable Senior', ehsAlloues: 15, ehsConsommes: 6, ehsRestants: 9, progTemporelle: 65, progEhs: 40, progMonetaire: 65 },
  { code: 'BO1-T02', nom: 'Rapprochement bancaire', type: 'E', priorite: 'Haute', division: 'BO', profil: 'Analyste Financier', employe: 'Belomo Edwige', employeProfil: 'Analyste Financier', ehsAlloues: 20, ehsConsommes: 4, ehsRestants: 16, progTemporelle: 20, progEhs: 25, progMonetaire: 25 },
  { code: 'BO1-T03', nom: 'Établissement des déclarations fiscales', type: 'E', priorite: 'Haute', division: 'BO', profil: 'Analyste Financier', employe: 'Essogo Erine', employeProfil: 'Analyste Financier', ehsAlloues: 30, ehsConsommes: 0, ehsRestants: 30, progTemporelle: 10, progEhs: 0, progMonetaire: 5 },
  { code: 'MO1-T01', nom: 'Analyse financière', type: 'E', priorite: 'Moyenne', division: 'MO', profil: 'Contrôleur de gestion', employe: 'Pamella Guebediang', employeProfil: 'Contrôleur de gestion', ehsAlloues: 25, ehsConsommes: 12, ehsRestants: 13, progTemporelle: 50, progEhs: 48, progMonetaire: 40 },
  { code: 'MO1-T02', nom: 'Préparation du budget', type: 'E', priorite: 'Moyenne', division: 'MO', profil: 'Analyste Financier', employe: 'Herman Tsaffock', employeProfil: 'Analyste Financier', ehsAlloues: 18, ehsConsommes: 5, ehsRestants: 13, progTemporelle: 30, progEhs: 38, progMonetaire: 33 },
  { code: 'FO1-T01', nom: 'Reporting mensuel', type: 'D', priorite: 'Basse', division: 'FO', profil: 'Chargé Reporting', employe: 'Assabe Zainabou', employeProfil: 'Chargé Reporting', ehsAlloues: null, ehsConsommes: null, ehsRestants: null, progTemporelle: 70, progEhs: 60, progMonetaire: 60 },
  { code: 'OP1-T01', nom: 'Suivi des opérations', type: 'E', priorite: 'Moyenne', division: 'OP', profil: 'Opérateur ERP', employe: 'Mbarga Thibaut', employeProfil: 'Opérateur ERP', ehsAlloues: 22, ehsConsommes: 3, ehsRestants: 19, progTemporelle: 25, progEhs: 14, progMonetaire: 20 },
  { code: 'PI1-T01', nom: 'Planification stratégique', type: 'E', priorite: 'Moyenne', division: 'PI', profil: 'Chef de projet', employe: 'Théodore Bessala', employeProfil: 'Chef de projet', ehsAlloues: 16, ehsConsommes: 6, ehsRestants: 10, progTemporelle: 30, progEhs: 38, progMonetaire: 33 },
  { code: 'IT1-T01', nom: 'Développement module ERP', type: 'E', priorite: 'Haute', division: 'IT', profil: 'Développeur Senior', employe: 'Brayan Ebongue', employeProfil: 'Développeur Senior', ehsAlloues: 24, ehsConsommes: 8, ehsRestants: 16, progTemporelle: 45, progEhs: 33, progMonetaire: 40 },
  { code: 'IT1-T02', nom: 'Tests et recette', type: 'D', priorite: 'Basse', division: 'IT', profil: 'Testeur QA', employe: 'Erine Essogo', employeProfil: 'Testeur QA', ehsAlloues: null, ehsConsommes: null, ehsRestants: null, progTemporelle: null, progEhs: null, progMonetaire: null },
]

const KPIS = [
  { icon: ListChecks, tone: 'blue', label: 'Tâches disponibles', value: '44', sub: 'Non assignées' },
  { icon: UserCheck, tone: 'green', label: 'Tâches attribuées', value: '16', sub: 'Déjà assignées' },
  { icon: Hourglass, tone: 'orange', label: 'EHS disponibles (projet)', value: '174,00 EHS', sub: 'Sur 256,00 EHS au total' },
  { icon: CalendarClock, tone: 'purple', label: 'Délai du projet', value: '45 jours restants', sub: 'Sur 245 jours au total' },
  { icon: TrendingUp, tone: 'indigo', label: 'Avancement global du projet', value: '32%', sub: 'Progression moyenne', progress: 32 },
]

const STEPS = [
  { label: 'Sélection des tâches', sub: 'Choisissez les tâches à staffer' },
  { label: 'Affectation des ressources', sub: 'Assignez les ressources disponibles' },
  { label: 'Validation du staffing', sub: 'Vérifiez et validez les affectations' },
]

const TOP_STAFFES = [
  { nom: 'Ibrahim Mbouombouo', profil: 'Comptable Senior', taches: 5, ehs: 85, percent: 33.20 },
  { nom: 'Herman Tsaffock', profil: 'Analyste Financier', taches: 4, ehs: 68, percent: 26.56 },
  { nom: 'Belomo Edwige', profil: 'Analyste Financier', taches: 3, ehs: 50, percent: 19.53 },
]

const TOTAL_TACHES_DISPONIBLES = 44

const LEAST_STAFFES = [
  { nom: 'Erine Essogo', profil: 'Testeur QA', taches: 1, ehs: 0, percent: 0 },
  { nom: 'Assabe Zainabou', profil: 'Chargé Reporting', taches: 1, ehs: 0, percent: 0 },
  { nom: 'Théodore Bessala', profil: 'Chef de projet', taches: 1, ehs: 16, percent: 6.25 },
]

const fmtEhs = (value: number | null) => value === null ? '-' : value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtPercent = (value: number | null) => value === null ? '-' : `${value}%`
const prioriteClass = (priorite: TacheStaffing['priorite']) => priorite === 'Haute' ? 'haute' : priorite === 'Moyenne' ? 'moyenne' : 'basse'

function ProgressBar({ value, tone }: { value: number | null; tone: string }) {
  if (value === null) return <span className="ns-progress-empty">-</span>
  return (
    <div className="ns-progress">
      <span className="ns-progress-track"><i className={tone} style={{ width: `${value}%` }} /></span>
      <b>{value}%</b>
    </div>
  )
}

export default function StaffingPage({ navigateTo }: { navigateTo: (page: string) => void }) {
  const [search, setSearch] = useState('')

  return (
    <section className="ns-page">
      <nav className="ns-subtabs">
        <button className="active" onClick={() => navigateTo('staffing')}><UserCheck size={14} />Nouveau staffing</button>
        <button onClick={() => navigateTo('staffing-execute')}><PlayCircle size={14} />Exécuté staffing</button>
      </nav>

      <div className="ns-info-bar">
        <div className="ns-info-item">
          <span className="ns-info-icon"><Folder size={16} /></span>
          <div><small>Projet</small><strong>PRJ.001 - ERP Academy</strong><span>Développement du nouvel ERP</span></div>
        </div>
        <div className="ns-info-sep" />
        <div className="ns-info-item">
          <span className="ns-info-icon"><Calendar size={16} /></span>
          <div><small>Période du projet</small><strong>01/05/2025 → 31/12/2025</strong><span>Durée totale : 245 jours</span></div>
        </div>
        <div className="ns-info-sep" />
        <div className="ns-info-item">
          <span className="ns-info-icon"><User size={16} /></span>
          <div><small>Manager du projet</small><strong>Ajara Lamare</strong><span>Manager PI</span></div>
        </div>
      </div>

      <div className="ns-kpis">
        {KPIS.map((kpi) => (
          <article key={kpi.label} className={`ns-kpi ns-kpi-${kpi.tone}`}>
            <span className="ns-kpi-icon"><kpi.icon size={17} /></span>
            <div>
              <span className="ns-kpi-label">{kpi.label}</span>
              <strong>{kpi.value}</strong>
              <small>{kpi.sub}</small>
              {typeof kpi.progress === 'number' && <span className="ns-kpi-track"><i style={{ width: `${kpi.progress}%` }} /></span>}
            </div>
          </article>
        ))}
      </div>

      <div className="ns-steps">
        {STEPS.map((step, index) => (
          <div key={step.label} className="ns-step-wrap">
            <div className={`ns-step ${index === 0 ? 'active' : ''}`}>
              <span className="ns-step-num">{index + 1}</span>
              <div><strong>{step.label}</strong><small>{step.sub}</small></div>
            </div>
            {index < STEPS.length - 1 && <ChevronRight size={16} className="ns-step-arrow" />}
          </div>
        ))}
      </div>

      <div className="ns-filters">
        <label>Division<select defaultValue="Toutes"><option>Toutes</option></select></label>
        <label>Type de tâche<select defaultValue="Tous"><option>Tous</option></select></label>
        <label>Statut<select defaultValue="Tous"><option>Tous les statuts</option></select></label>
        <label className="ns-search">
          <Search size={14} />
          <input placeholder="Rechercher une tâche, un projet ou un employé..." value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <button type="button" className="ns-reset" onClick={() => setSearch('')}><RotateCcw size={14} />Réinitialiser</button>
      </div>

      <section className="ns-table-panel">
        <div className="ns-table-head">
          <h3>Mes tâches à staffer <span className="ns-count-badge">{TOTAL_TACHES_DISPONIBLES}</span></h3>
          <div className="ns-table-head-actions">
            <label>Afficher<select defaultValue={10}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select></label>
            <span>1-{TACHES.length} sur {TOTAL_TACHES_DISPONIBLES}</span>
            <button type="button" disabled><ChevronLeft size={14} /></button>
            <button type="button"><ChevronRight size={14} /></button>
          </div>
        </div>
        <div className="ns-table-wrap">
          <table className="ns-table">
            <thead>
              <tr>
                <th>Code</th><th>Nom de la tâche</th><th>Type</th><th>Priorité</th><th>Division</th>
                <th>Profil / Emploi recherché</th><th>Attribué à (Employé)</th>
                <th>EHS alloués</th><th>EHS consommés</th><th>EHS restants</th>
                <th>Progression temporelle</th><th>Progression EHS</th><th>Progression monétaire</th><th>Wrike</th><th></th>
              </tr>
            </thead>
            <tbody>
              {TACHES.map((tache) => (
                <tr key={tache.code}>
                  <td className="ns-code">{tache.code}</td>
                  <td className="ns-name">{tache.nom}</td>
                  <td><span className={`ns-type ${tache.type === 'D' ? 'money' : ''}`}>{tache.type}</span></td>
                  <td><span className={`ns-priorite ns-priorite-${prioriteClass(tache.priorite)}`}>{tache.priorite}</span></td>
                  <td>{tache.division}</td>
                  <td>{tache.profil}</td>
                  <td>
                    <span className="ns-employee"><span className="ns-employee-dot">{tache.employe.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span>
                      <span><strong>{tache.employe}</strong><small>{tache.employeProfil}</small></span>
                    </span>
                  </td>
                  <td>{fmtEhs(tache.ehsAlloues)}</td>
                  <td>{fmtEhs(tache.ehsConsommes)}</td>
                  <td>{fmtEhs(tache.ehsRestants)}</td>
                  <td><ProgressBar value={tache.progTemporelle} tone="blue" /></td>
                  <td><ProgressBar value={tache.progEhs} tone="green" /></td>
                  <td><ProgressBar value={tache.progMonetaire} tone="orange" /></td>
                  <td>
                    <a
                      className="ns-wrike-link"
                      href={`https://www.wrike.com/open.htm?id=${encodeURIComponent(tache.code)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Ouvrir dans Wrike"
                    >
                      <ExternalLink size={13} />
                    </a>
                  </td>
                  <td><button type="button" className="ns-row-action" aria-label="Actions"><MoreVertical size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="ns-bottom">
        <div className="ns-mini-panel good">
          <h3><TrendingUp size={15} />Les 3 employés les plus staffés</h3>
          <table className="ns-mini-table">
            <thead><tr><th>Employé</th><th>Tâches assignées</th><th>EHS alloués</th><th>% du total EHS</th></tr></thead>
            <tbody>
              {TOP_STAFFES.map((row) => (
                <tr key={row.nom}>
                  <td className="ns-name"><strong>{row.nom}</strong><small>{row.profil}</small></td>
                  <td>{row.taches}</td>
                  <td>{fmtEhs(row.ehs)}</td>
                  <td>
                    <div className="ns-mini-bar"><span className="ns-mini-track"><i className="good" style={{ width: `${row.percent}%` }} /></span><b>{fmtPercent(row.percent)}</b></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ns-mini-panel bad">
          <h3><TrendingDown size={15} />Les 3 employés les moins staffés</h3>
          <table className="ns-mini-table">
            <thead><tr><th>Employé</th><th>Tâches assignées</th><th>EHS alloués</th><th>% du total EHS</th></tr></thead>
            <tbody>
              {LEAST_STAFFES.map((row) => (
                <tr key={row.nom}>
                  <td className="ns-name"><strong>{row.nom}</strong><small>{row.profil}</small></td>
                  <td>{row.taches}</td>
                  <td>{fmtEhs(row.ehs)}</td>
                  <td>
                    <div className="ns-mini-bar"><span className="ns-mini-track"><i className="bad" style={{ width: `${Math.max(row.percent, 3)}%` }} /></span><b>{fmtPercent(row.percent)}</b></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
