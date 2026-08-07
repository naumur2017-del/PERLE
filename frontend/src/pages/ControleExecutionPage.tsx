import { useState } from 'react'
import {
  Calendar, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  ClipboardList, Download, Gauge, Info, RefreshCw, RotateCcw, Star, UserCheck, UserMinus,
  UserPlus, UserX,
} from 'lucide-react'
import './ControleExecutionPage.css'

interface Evaluation {
  projet: string
  tache: string
  employe: string
  equipe: string
  manager: string
  statut: 'Terminée' | 'En cours' | 'En retard'
  note: number
  derniereEvaluation: string
}

const EVALUATIONS: Evaluation[] = [
  { projet: 'ERP Academy', tache: 'Analyse fonctionnelle', employe: 'Ibrahim M.', equipe: 'MO1', manager: 'Ajara Lamare', statut: 'Terminée', note: 4, derniereEvaluation: '20/05/2025 14:30' },
  { projet: 'ERP Academy', tache: 'Développement module', employe: 'Herman T.', equipe: 'IT', manager: 'Ajara Lamare', statut: 'Terminée', note: 5, derniereEvaluation: '20/05/2025 11:15' },
  { projet: 'Mission Audit Interne', tache: 'Collecte des données', employe: 'Pamella G.', equipe: 'MO2', manager: 'Ajara Lamare', statut: 'Terminée', note: 3, derniereEvaluation: '19/05/2025 16:45' },
  { projet: 'Digitalisation RH', tache: 'Spécifications détaillées', employe: 'Belomo E.', equipe: 'BO1', manager: 'Ajara Lamare', statut: 'En cours', note: 4, derniereEvaluation: '20/05/2025 09:20' },
  { projet: 'Refonte SI Comptable', tache: 'Tests d’intégration', employe: 'Erine E.', equipe: 'IT', manager: 'Ajara Lamare', statut: 'Terminée', note: 5, derniereEvaluation: '18/05/2025 17:05' },
  { projet: 'Formation 200 Agents', tache: 'Préparation supports', employe: 'Thibaut M.', equipe: 'FO', manager: 'Ajara Lamare', statut: 'En cours', note: 3, derniereEvaluation: '20/05/2025 10:10' },
  { projet: 'Implémentation CRM', tache: 'Paramétrage', employe: 'Théodore B.', equipe: 'IT', manager: 'Ajara Lamare', statut: 'Terminée', note: 4, derniereEvaluation: '19/05/2025 15:00' },
  { projet: 'Étude marché RDC', tache: 'Analyse des résultats', employe: 'Brayan E.', equipe: 'MO2', manager: 'Ajara Lamare', statut: 'En retard', note: 2, derniereEvaluation: '18/05/2025 12:40' },
]

const PROJET_OPTIONS = Array.from(new Set(EVALUATIONS.map((e) => e.projet))).sort()
const EQUIPE_OPTIONS = Array.from(new Set(EVALUATIONS.map((e) => e.equipe))).sort()
const MANAGER_OPTIONS = Array.from(new Set(EVALUATIONS.map((e) => e.manager))).sort()
const EMPLOYE_OPTIONS = Array.from(new Set(EVALUATIONS.map((e) => e.employe))).sort()

const STAFFING_LEVELS = [
  { key: 'non', label: 'Non staffés', value: 6, pct: '5,2%', tone: 'red', icon: UserX },
  { key: 'sous', label: 'Sous-staffés', value: 11, pct: '9,6%', tone: 'orange', icon: UserMinus },
  { key: 'optimal', label: 'Staffing optimal', value: 28, pct: '24,3%', tone: 'green', icon: UserCheck },
  { key: 'sur', label: 'Surstaffés', value: 4, pct: '3,5%', tone: 'red', icon: UserPlus },
] as const

const STAFFING_TRENDS: Record<string, number[]> = {
  non: [8, 7, 6, 7, 5, 6, 5, 6],
  sous: [13, 12, 11, 12, 10, 11, 10, 11],
  optimal: [24, 25, 26, 27, 26, 28, 27, 28],
  sur: [5, 4, 5, 4, 3, 4, 3, 4],
}

const NOTE_TREND = [3.8, 4.0, 3.6, 4.3, 3.9, 4.2, 3.9, 4.1]

type ResumeVue = 'projet' | 'equipe' | 'employe'

const RESUME_DATA: Record<ResumeVue, { label: string; rows: { nom: string; note: number; taches: number; ehs: number; staffing: number; tone: 'green' | 'orange' | 'red' }[] }> = {
  projet: {
    label: 'Projet',
    rows: [
      { nom: 'ERP Academy', note: 4.3, taches: 85, ehs: 512.5, staffing: 98, tone: 'green' },
      { nom: 'Digitalisation RH', note: 4.1, taches: 62, ehs: 342.0, staffing: 87, tone: 'orange' },
      { nom: 'Mission Audit Interne', note: 3.6, taches: 45, ehs: 285.0, staffing: 72, tone: 'orange' },
      { nom: 'Refonte SI Comptable', note: 4.6, taches: 58, ehs: 410.8, staffing: 112, tone: 'red' },
      { nom: 'Formation 200 Agents', note: 4.0, taches: 120, ehs: 685.25, staffing: 95, tone: 'green' },
    ],
  },
  equipe: {
    label: 'Équipe',
    rows: [
      { nom: 'IT', note: 4.4, taches: 148, ehs: 890.4, staffing: 101, tone: 'green' },
      { nom: 'MO1', note: 4.0, taches: 96, ehs: 512.0, staffing: 92, tone: 'green' },
      { nom: 'MO2', note: 3.5, taches: 74, ehs: 388.6, staffing: 68, tone: 'red' },
      { nom: 'BO1', note: 4.2, taches: 60, ehs: 305.2, staffing: 89, tone: 'orange' },
      { nom: 'FO', note: 3.9, taches: 74, ehs: 401.0, staffing: 95, tone: 'green' },
    ],
  },
  employe: {
    label: 'Employé',
    rows: [
      { nom: 'Herman T.', note: 4.8, taches: 22, ehs: 148.5, staffing: 100, tone: 'green' },
      { nom: 'Ibrahim M.', note: 4.1, taches: 19, ehs: 121.0, staffing: 94, tone: 'green' },
      { nom: 'Pamella G.', note: 3.4, taches: 15, ehs: 96.4, staffing: 65, tone: 'red' },
      { nom: 'Belomo E.', note: 4.0, taches: 17, ehs: 108.8, staffing: 88, tone: 'orange' },
      { nom: 'Erine E.', note: 4.6, taches: 20, ehs: 132.2, staffing: 105, tone: 'orange' },
    ],
  },
}

const AVATAR_COLORS = ['#6b46c1', '#3b82f6', '#16a34a', '#f59e0b', '#db2777', '#0d9488', '#4338ca', '#dc2626']

function hashName(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return hash
}

const avatarColor = (name: string) => AVATAR_COLORS[hashName(name) % AVATAR_COLORS.length]
const initials = (name: string) => name.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()

const statutClass = (statut: Evaluation['statut']) => statut === 'Terminée' ? 'termine' : statut === 'En cours' ? 'cours' : 'retard'
const staffingDotClass = (tone: 'green' | 'orange' | 'red') => tone

function StarRow({ value, size = 11 }: { value: number; size?: number }) {
  const rounded = Math.round(value)
  return (
    <span className="ce-stars">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={size} fill={i < rounded ? '#f59e0b' : 'none'} color={i < rounded ? '#f59e0b' : '#d1d5db'} />
      ))}
    </span>
  )
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const w = 100, h = 26
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / (max - min || 1)) * h
    return `${x},${y}`
  }).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="ce-spark" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.6" strokeDasharray="3 3" strokeLinecap="round" />
    </svg>
  )
}

export default function ControleExecutionPage({ navigateTo }: { navigateTo: (page: string) => void }) {
  const [exportOpen, setExportOpen] = useState(false)
  const [resumeVue, setResumeVue] = useState<ResumeVue>('projet')
  const resume = RESUME_DATA[resumeVue]

  return (
    <section className="ce-page">
      <nav className="ce-subtabs">
        <button onClick={() => navigateTo('pilotage')}><ClipboardList size={14} />Pilotage des projets et gestion budgétaire</button>
        <button onClick={() => navigateTo('controle-taches')}><CheckCircle2 size={14} />Contrôle des tâches</button>
        <button className="active" onClick={() => navigateTo('controle-execution')}><Gauge size={14} />Performance & Staffing</button>
      </nav>

      <div className="ce-toolbar">
        <label className="ce-period">Période
          <div className="ce-period-select"><Calendar size={13} />Cette semaine<ChevronDown size={12} /></div>
        </label>
        <button type="button" className="ce-btn-outline"><RefreshCw size={14} />Actualiser</button>
        <div className="ce-export-wrap">
          <button type="button" className="ce-btn-primary" onClick={() => setExportOpen((open) => !open)}>
            <Download size={14} />Exporter<ChevronDown size={12} />
          </button>
          {exportOpen && (
            <ul className="ce-export-menu" onMouseLeave={() => setExportOpen(false)}>
              <li><button type="button" onClick={() => setExportOpen(false)}>Exporter en PDF</button></li>
              <li><button type="button" onClick={() => setExportOpen(false)}>Exporter en Excel</button></li>
              <li><button type="button" onClick={() => setExportOpen(false)}>Exporter en CSV</button></li>
            </ul>
          )}
        </div>
      </div>

      <div className="ce-kpis">
        <article className="ce-kpi ce-kpi-blue">
          <div className="ce-kpi-top">
            <span className="ce-kpi-icon"><Star size={18} /></span>
            <span className="ce-kpi-label">Note moyenne des tâches</span>
          </div>
          <strong>4,1 /5</strong>
          <StarRow value={4.1} />
          <small>Sur 452 tâches évaluées</small>
          <Sparkline data={NOTE_TREND} color="#3b82f6" />
        </article>
        {STAFFING_LEVELS.map((level) => (
          <article key={level.key} className={`ce-kpi ce-kpi-${level.tone}`}>
            <div className="ce-kpi-top">
              <span className="ce-kpi-icon"><level.icon size={18} /></span>
              <span className="ce-kpi-label">{level.label}</span>
            </div>
            <strong>{level.value}</strong>
            <small>{level.pct} des collaborateurs</small>
            <Sparkline data={STAFFING_TRENDS[level.key]} color={level.tone === 'red' ? '#dc2626' : level.tone === 'orange' ? '#f59e0b' : '#16a34a'} />
          </article>
        ))}
      </div>

      <div className="ce-filters">
        <label>Projet
          <select defaultValue="Tous">
            <option>Tous</option>
            {PROJET_OPTIONS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <label>Division / Équipe
          <select defaultValue="Toutes">
            <option>Toutes</option>
            {EQUIPE_OPTIONS.map((e) => <option key={e}>{e}</option>)}
          </select>
        </label>
        <label>Manager
          <select defaultValue="Tous">
            <option>Tous</option>
            {MANAGER_OPTIONS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </label>
        <label>Employé
          <select defaultValue="Tous">
            <option>Tous</option>
            {EMPLOYE_OPTIONS.map((e) => <option key={e}>{e}</option>)}
          </select>
        </label>
        <label>Niveau de staffing
          <select defaultValue="Tous">
            <option>Tous</option>
            {STAFFING_LEVELS.map((l) => <option key={l.key}>{l.label}</option>)}
          </select>
        </label>
        <label>Note
          <select defaultValue="Toutes">
            <option>Toutes</option>
            <option>5</option><option>4</option><option>3</option><option>2</option><option>1</option>
          </select>
        </label>
        <button type="button" className="ce-reset"><RotateCcw size={14} />Réinitialiser les filtres</button>
      </div>

      <div className="ce-main">
        <div className="ce-table-panel">
          <div className="ce-table-head"><h3>Performance des tâches<Info size={13} /></h3></div>
          <div className="ce-table-wrap">
            <table className="ce-table">
              <thead>
                <tr>
                  <th>Projet</th><th>Tâche</th><th>Employé</th><th>Équipe</th><th>Manager</th>
                  <th>Statut</th><th>Note /5</th><th>Dernière évaluation</th><th></th>
                </tr>
              </thead>
              <tbody>
                {EVALUATIONS.map((e, index) => (
                  <tr key={`${e.projet}-${index}`}>
                    <td>{e.projet}</td>
                    <td className="ce-name">{e.tache}</td>
                    <td>
                      <div className="ce-employe-cell">
                        <span className="ce-avatar" style={{ background: avatarColor(e.employe) }}>{initials(e.employe)}</span>
                        {e.employe}
                      </div>
                    </td>
                    <td>{e.equipe}</td>
                    <td>{e.manager}</td>
                    <td><span className={`ce-pill ce-pill-${statutClass(e.statut)}`}>{e.statut}</span></td>
                    <td><span className="ce-note-cell"><StarRow value={e.note} /><b>{e.note} / 5</b></span></td>
                    <td>{e.derniereEvaluation}</td>
                    <td><button type="button" className="ce-row-action" aria-label="Voir le détail"><ChevronRight size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="ce-table-foot">
            <span>Affichage de 1 à {EVALUATIONS.length} sur 452 tâches</span>
            <div className="ce-table-foot-right">
              <label className="ce-page-size">Lignes par page
                <select defaultValue={10}>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </label>
              <nav className="ce-pagination" aria-label="Pagination">
                <button type="button" disabled><ChevronsLeft size={14} /></button>
                <button type="button" disabled><ChevronLeft size={14} /></button>
                <button type="button" className="is-active">1</button>
                <button type="button">2</button>
                <button type="button">3</button>
                <button type="button">4</button>
                <button type="button">5</button>
                <span className="ce-page-ellipsis">…</span>
                <button type="button">46</button>
                <button type="button"><ChevronRight size={14} /></button>
                <button type="button"><ChevronsRight size={14} /></button>
              </nav>
            </div>
          </div>
        </div>

        <aside className="ce-side">
          <div className="ce-panel">
            <h3>Situation du staffing (collaborateurs)<Info size={13} /></h3>
            <div className="ce-staffing-grid">
              {STAFFING_LEVELS.map((level) => (
                <div key={level.key} className={`ce-staffing-card tone-${level.tone}`}>
                  <span className="ce-staffing-icon"><level.icon size={15} /></span>
                  <span className="ce-staffing-label">{level.label}</span>
                  <strong>{level.value}</strong>
                  <small>{level.pct}</small>
                  <button type="button" className="ce-staffing-link">Voir la liste</button>
                </div>
              ))}
            </div>
          </div>

          <div className="ce-panel">
            <h3>Résumé par vue<Info size={13} /></h3>
            <div className="ce-resume-tabs">
              <button type="button" className={resumeVue === 'projet' ? 'active' : ''} onClick={() => setResumeVue('projet')}>Par projet</button>
              <button type="button" className={resumeVue === 'equipe' ? 'active' : ''} onClick={() => setResumeVue('equipe')}>Par équipe</button>
              <button type="button" className={resumeVue === 'employe' ? 'active' : ''} onClick={() => setResumeVue('employe')}>Par employé</button>
            </div>
            <table className="ce-resume-table">
              <thead>
                <tr>
                  <th>{resume.label}</th><th>Note /5</th><th>Tâches éval.</th><th>Équiv. EHS</th><th>Staffing moyen</th>
                </tr>
              </thead>
              <tbody>
                {resume.rows.map((row) => (
                  <tr key={row.nom}>
                    <td className="ce-name">{row.nom}</td>
                    <td>{row.note.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                    <td>{row.taches}</td>
                    <td>{row.ehs.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td><span className={`ce-staffing-dot ${staffingDotClass(row.tone)}`} />{row.staffing}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" className="ce-see-all">Voir tous les {resume.label.toLowerCase()}s</button>
          </div>
        </aside>
      </div>

      <div className="ce-footbar">
        <span className="ce-footbar-left"><Info size={13} />Les notes sont attribuées par les managers. Elles permettent d’évaluer la qualité d’exécution des tâches.</span>
        <span className="ce-footbar-right"><RefreshCw size={12} />Dernière synchronisation : 20/05/2025 à 16:20<i className="ce-dot" />Données à jour</span>
      </div>
    </section>
  )
}
