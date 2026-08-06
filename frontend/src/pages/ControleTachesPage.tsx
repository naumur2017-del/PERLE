import { useState } from 'react'
import {
  AlertTriangle, CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList,
  FileCheck2, Lock, MoreVertical, PauseCircle, PlayCircle, RotateCcw, Search,
  TrendingUp, UserX,
} from 'lucide-react'
import './ControleTachesPage.css'

interface Tache {
  code: string
  projet: string
  nom: string
  division: string
  type: 'E' | 'D'
  attribuePar: string
  attribueA: string
  matricule: string
  dateDebut: string
  dateFin: string
  echeance: string
  ehsPrevu: number
  ehsConsomme: number
  ehsRestant: number
  dureePrevue: number
  dureeConsommee: number
  dureeRestante: number
  progTemporelle: number
  progEhs: number
  progMonetaire: number
  statut: 'Non démarrée' | 'En cours' | 'Terminée' | 'Bloquée' | 'En retard'
  priorite: 'Haute' | 'Moyenne' | 'Basse'
}

const TACHES: Tache[] = [
  { code: 'T-2025-002', projet: 'PADESCE', nom: 'Collecte des données cohorte B', division: 'Suivi & Évaluation', type: 'E', attribuePar: 'Ajara LAMARE', attribueA: 'Herman Tsaffock', matricule: 'IT001V1', dateDebut: '05/05/2025', dateFin: '20/05/2025', echeance: '20/05/2025', ehsPrevu: 80, ehsConsomme: 56, ehsRestant: 24, dureePrevue: 15, dureeConsommee: 9, dureeRestante: 6, progTemporelle: 60, progEhs: 70, progMonetaire: 65, statut: 'En cours', priorite: 'Haute' },
  { code: 'T-2025-013', projet: 'CGP', nom: 'Rédaction du rapport de projet', division: 'Gestion de projet', type: 'D', attribuePar: 'Pamella Guebediang', attribueA: 'Diego Ngounou', matricule: 'IT003V2', dateDebut: '12/05/2025', dateFin: '26/05/2025', echeance: '26/05/2025', ehsPrevu: 60, ehsConsomme: 20, ehsRestant: 40, dureePrevue: 14, dureeConsommee: 4, dureeRestante: 10, progTemporelle: 40, progEhs: 33, progMonetaire: 25, statut: 'Bloquée', priorite: 'Moyenne' },
  { code: 'T-2025-004', projet: 'PILOTAGE', nom: 'Suivi budgétaire mensuel', division: 'Finance & Budget', type: 'E', attribuePar: 'Théodore Bessala', attribueA: 'Harmann Patrice', matricule: 'IT001V1', dateDebut: '10/05/2025', dateFin: '18/05/2025', echeance: '18/05/2025', ehsPrevu: 40, ehsConsomme: 40, ehsRestant: 0, dureePrevue: 8, dureeConsommee: 8, dureeRestante: 0, progTemporelle: 100, progEhs: 100, progMonetaire: 98, statut: 'Terminée', priorite: 'Haute' },
  { code: 'T-2025-005', projet: 'MIDER', nom: 'Analyse des données terrain', division: 'Suivi & Évaluation', type: 'E', attribuePar: 'Ajara Lamare', attribueA: 'Herman Patrice', matricule: 'IT007V1', dateDebut: '08/05/2025', dateFin: '18/05/2025', echeance: '15/05/2025', ehsPrevu: 50, ehsConsomme: 35, ehsRestant: 15, dureePrevue: 10, dureeConsommee: 9, dureeRestante: 1, progTemporelle: 90, progEhs: 70, progMonetaire: 65, statut: 'En retard', priorite: 'Haute' },
  { code: 'T-2025-006', projet: 'DIEGO', nom: 'Préparation atelier de restitution', division: 'Communication', type: 'D', attribuePar: 'Pamella Guebediang', attribueA: 'Zainabou Patrice', matricule: 'IT007V1', dateDebut: '19/05/2025', dateFin: '30/05/2025', echeance: '30/05/2025', ehsPrevu: 40, ehsConsomme: 20, ehsRestant: 20, dureePrevue: 11, dureeConsommee: 4, dureeRestante: 7, progTemporelle: 36, progEhs: 50, progMonetaire: 40, statut: 'En cours', priorite: 'Moyenne' },
  { code: 'T-2025-007', projet: 'BAC OFFICE', nom: 'Vérification des pièces justificatives', division: 'Back Office', type: 'E', attribuePar: 'Théodore Bessala', attribueA: 'Julienne Ekouma', matricule: 'IT010V1', dateDebut: '16/05/2025', dateFin: '22/05/2025', echeance: '22/05/2025', ehsPrevu: 30, ehsConsomme: 4, ehsRestant: 26, dureePrevue: 6, dureeConsommee: 4, dureeRestante: 2, progTemporelle: 32, progEhs: 40, progMonetaire: 40, statut: 'En cours', priorite: 'Basse' },
]

const KPIS = [
  { icon: ClipboardList, tone: 'purple', label: 'Nombre total de tâches', value: '1 248', sub: 'Toutes tâches confondues' },
  { icon: PauseCircle, tone: 'gray', label: 'Non démarrées', value: '156', sub: '12,5%' },
  { icon: PlayCircle, tone: 'blue', label: 'En cours', value: '642', sub: '51,4%' },
  { icon: CheckCircle2, tone: 'green', label: 'Terminées', value: '382', sub: '30,6%' },
  { icon: Lock, tone: 'orange', label: 'Bloquées', value: '32', sub: '2,6%' },
  { icon: AlertTriangle, tone: 'red', label: 'En retard', value: '36', sub: '2,9%' },
  { icon: CalendarClock, tone: 'purple', label: 'Échéances cette semaine', value: '78', sub: 'Tâches concernées' },
]

const REPARTITION = [
  { label: 'Non démarrées (12,5%)', value: 156, color: '#9ca3af' },
  { label: 'En cours (51,4%)', value: 642, color: '#3b82f6' },
  { label: 'Terminées (30,6%)', value: 382, color: '#16a34a' },
  { label: 'Bloquées (2,6%)', value: 32, color: '#f59e0b' },
]

const ALERTES = [
  { icon: Lock, tone: 'red', label: 'Tâches bloquées', value: 32 },
  { icon: CalendarClock, tone: 'orange', label: 'Échéances proches (7 jours)', value: 78 },
  { icon: TrendingUp, tone: 'purple', label: 'Dépassement EHS', value: 24 },
  { icon: UserX, tone: 'slate', label: 'Collaborateurs inactifs', value: 11 },
  { icon: AlertTriangle, tone: 'red', label: 'Tâches en retard', value: 36 },
]

const TACHES_EN_RETARD = [
  { code: 'T-2025-015', projet: 'MIDER', nom: 'Analyse des données terrain', retard: '-2 jours', echeance: '15/05/2025' },
  { code: 'T-2025-011', projet: 'PADESCE', nom: 'Collecte des données cohorte A', retard: '-1 jour', echeance: '16/05/2025' },
  { code: 'T-2025-032', projet: 'PAS NFI', nom: 'Synthèse rapport financier', retard: '-1 jour', echeance: '16/05/2025' },
  { code: 'T-2025-021', projet: 'PANSFI', nom: 'Vérification des justificatifs', retard: '-1 jour', echeance: '16/05/2025' },
]

const TACHES_PROCHES = [
  { code: 'T-2025-018', projet: 'CARAVEL', nom: 'Préparation campagne marketing', echeance: '19/05/2025', delai: '2 jours' },
  { code: 'T-2025-024', projet: 'PERLE', nom: 'Tests & validation module RH', echeance: '20/05/2025', delai: '3 jours' },
  { code: 'T-2025-012', projet: 'PADESCE', nom: 'Collecte des données cohorte B', echeance: '20/05/2025', delai: '3 jours' },
  { code: 'T-2025-020', projet: 'TRESORERIE', nom: 'Rapprochement bancaire mensuel', echeance: '21/05/2025', delai: '4 jours' },
]

const COLLABORATEURS_ACTIFS = [
  { nom: 'Maxwell Ebongue', matricule: 'IT001V1', taches: 8, ehs: 120 },
  { nom: 'Diego Ngounou', matricule: 'IT003V2', taches: 7, ehs: 95 },
  { nom: 'Mala Patrice', matricule: 'IT007V1', taches: 6, ehs: 80 },
  { nom: 'Julienne Ekouma', matricule: 'IT010V1', taches: 6, ehs: 75 },
]

const statutClass = (statut: Tache['statut']) => {
  if (statut === 'En cours') return 'cours'
  if (statut === 'Terminée') return 'termine'
  if (statut === 'Bloquée') return 'bloque'
  if (statut === 'En retard') return 'retard'
  return 'attente'
}

const prioriteClass = (priorite: Tache['priorite']) => priorite === 'Haute' ? 'haute' : priorite === 'Moyenne' ? 'moyenne' : 'basse'

function TauxGauge({ value }: { value: number }) {
  const r = 48
  const c = 2 * Math.PI * r
  return (
    <svg width="118" height="118" viewBox="0 0 118 118" className="ct-gauge">
      <circle cx="59" cy="59" r={r} fill="none" stroke="#efeafb" strokeWidth="10" />
      <circle
        cx="59" cy="59" r={r} fill="none" stroke="#6b46c1" strokeWidth="10" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c - (value / 100) * c} transform="rotate(-90 59 59)"
      />
      <text x="59" y="65" textAnchor="middle" className="ct-gauge-text">{value}%</text>
    </svg>
  )
}

function RepartitionDonut() {
  const total = REPARTITION.reduce((sum, item) => sum + item.value, 0)
  const cx = 80, cy = 80, outer = 68, inner = 44
  const slices = REPARTITION.reduce<{ label: string; value: number; color: string; path: string }[]>((acc, item) => {
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
    <div className="ct-donut-wrap">
      <svg viewBox="0 0 160 160" className="ct-donut-svg" role="img" aria-label="Répartition des tâches">
        {slices.map((slice) => <path key={slice.label} d={slice.path} fill={slice.color} />)}
        <text x={cx} y={cy - 4} textAnchor="middle" className="ct-donut-value">{total.toLocaleString('fr-FR')}</text>
        <text x={cx} y={cy + 13} textAnchor="middle" className="ct-donut-sub">Total</text>
      </svg>
      <ul className="ct-donut-legend">
        {REPARTITION.map((item) => (
          <li key={item.label}><i style={{ background: item.color }} />{item.label}</li>
        ))}
      </ul>
    </div>
  )
}

export default function ControleTachesPage({ navigateTo }: { navigateTo: (page: string) => void }) {
  const [search, setSearch] = useState('')

  return (
    <section className="ct-page">
      <nav className="ct-subtabs">
        <button onClick={() => navigateTo('pilotage')}><ClipboardList size={14} />Pilotage des projets et gestion budgétaire</button>
        <button className="active" onClick={() => navigateTo('controle-taches')}><CheckCircle2 size={14} />Contrôle des tâches</button>
        <button onClick={() => navigateTo('controle-execution')}><FileCheck2 size={14} />Contrôle d’exécution et conformité</button>
      </nav>

      <div className="ct-top">
        <div className="ct-kpis">
          {KPIS.map((kpi) => (
            <article key={kpi.label} className={`ct-kpi ct-kpi-${kpi.tone}`}>
              <span className="ct-kpi-icon"><kpi.icon size={17} /></span>
              <div>
                <strong>{kpi.value}</strong>
                <span>{kpi.label}</span>
                <small>{kpi.sub}</small>
              </div>
            </article>
          ))}
        </div>
        <div className="ct-gauge-card">
          <TauxGauge value={68} />
          <strong>Taux global d’avancement</strong>
          <small>EHS consommés / EHS prévus</small>
        </div>
      </div>

      <div className="ct-filters">
        <label>Projet<select defaultValue="Tous"><option>Tous les projets</option></select></label>
        <label>Manager<select defaultValue="Tous"><option>Tous les managers</option></select></label>
        <label>Chef de projet<select defaultValue="Tous"><option>Tous les chefs</option></select></label>
        <label>Division<select defaultValue="Toutes"><option>Toutes les divisions</option></select></label>
        <label>Collaborateur<select defaultValue="Tous"><option>Tous les collaborateurs</option></select></label>
        <label>Statut<select defaultValue="Tous"><option>Tous les statuts</option></select></label>
        <label>Priorité<select defaultValue="Toutes"><option>Toutes les priorités</option></select></label>
        <label>Type<select defaultValue="Tous"><option>Tous (E / D)</option></select></label>
        <label className="ct-search">
          <Search size={14} />
          <input placeholder="Rechercher une tâche (code, nom, collaborateur...)" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <button type="button" className="ct-reset" onClick={() => setSearch('')}><RotateCcw size={14} />Réinitialiser</button>
      </div>

      <div className="ct-main">
        <div className="ct-table-panel">
          <div className="ct-table-head"><h3>Liste des tâches ({TACHES.length.toLocaleString('fr-FR')} sur 1 248)</h3></div>
          <div className="ct-table-wrap">
            <table className="ct-table">
              <thead>
                <tr>
                  <th rowSpan={2}>Code tâche</th>
                  <th rowSpan={2}>Projet</th>
                  <th rowSpan={2}>Nom de la tâche</th>
                  <th rowSpan={2}>Division</th>
                  <th rowSpan={2}>Type</th>
                  <th rowSpan={2}>Attribué par</th>
                  <th rowSpan={2}>Attribué à</th>
                  <th rowSpan={2}>Matricule</th>
                  <th rowSpan={2}>Date début</th>
                  <th rowSpan={2}>Date fin</th>
                  <th rowSpan={2}>Échéance</th>
                  <th colSpan={3}>EHS</th>
                  <th colSpan={3}>Durée (jours)</th>
                  <th colSpan={3}>Progression</th>
                  <th rowSpan={2}>Statut</th>
                  <th rowSpan={2}>Priorité</th>
                  <th rowSpan={2}></th>
                </tr>
                <tr>
                  <th>Prévu</th><th>Consommés</th><th>Restants</th>
                  <th>Prévue</th><th>Consommée</th><th>Restante</th>
                  <th>Temporelle</th><th>EHS</th><th>Monétaire</th>
                </tr>
              </thead>
              <tbody>
                {TACHES.map((tache) => (
                  <tr key={tache.code}>
                    <td className="ct-code">{tache.code}</td>
                    <td>{tache.projet}</td>
                    <td className="ct-name">{tache.nom}</td>
                    <td>{tache.division}</td>
                    <td><span className={`ct-type ${tache.type === 'D' ? 'money' : ''}`}>{tache.type}</span></td>
                    <td>{tache.attribuePar}</td>
                    <td>{tache.attribueA}</td>
                    <td>{tache.matricule}</td>
                    <td>{tache.dateDebut}</td>
                    <td>{tache.dateFin}</td>
                    <td>{tache.echeance}</td>
                    <td>{tache.ehsPrevu}</td>
                    <td>{tache.ehsConsomme}</td>
                    <td>{tache.ehsRestant}</td>
                    <td>{tache.dureePrevue}</td>
                    <td>{tache.dureeConsommee}</td>
                    <td>{tache.dureeRestante}</td>
                    <td>{tache.progTemporelle}%</td>
                    <td>{tache.progEhs}%</td>
                    <td>{tache.progMonetaire}%</td>
                    <td><span className={`ct-pill ct-pill-${statutClass(tache.statut)}`}>{tache.statut}</span></td>
                    <td><span className={`ct-priorite ct-priorite-${prioriteClass(tache.priorite)}`}>{tache.priorite}</span></td>
                    <td><button type="button" className="ct-row-action" aria-label="Actions"><MoreVertical size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="ct-table-foot">
            <span>Affichage de 1 à {TACHES.length} sur 1 248 tâches</span>
            <nav className="ct-pagination" aria-label="Pagination">
              <button type="button" disabled><ChevronLeft size={14} /></button>
              <button type="button" className="is-active">1</button>
              <button type="button">2</button>
              <button type="button">3</button>
              <button type="button">4</button>
              <span className="ct-page-ellipsis">…</span>
              <button type="button">208</button>
              <button type="button"><ChevronRight size={14} /></button>
            </nav>
          </div>
        </div>

        <aside className="ct-side">
          <div className="ct-panel">
            <h3>Répartition des tâches</h3>
            <RepartitionDonut />
          </div>
          <div className="ct-panel">
            <h3>Alertes</h3>
            <ul className="ct-alertes">
              {ALERTES.map((alerte) => (
                <li key={alerte.label}>
                  <span className={`ct-alerte-icon ${alerte.tone}`}><alerte.icon size={14} /></span>
                  <span className="ct-alerte-label">{alerte.label}</span>
                  <b>{alerte.value}</b>
                </li>
              ))}
            </ul>
            <button type="button" className="ct-btn-outline ct-alertes-cta">Voir toutes les alertes</button>
          </div>
        </aside>
      </div>

      <div className="ct-bottom">
        <div className="ct-mini-panel">
          <div className="ct-mini-head"><h3>Les 10 tâches les plus en retard</h3><button type="button">Voir tout</button></div>
          <table className="ct-mini-table">
            <thead><tr><th>#</th><th>Code tâche</th><th>Projet</th><th>Tâche</th><th>Retard</th><th>Échéance</th></tr></thead>
            <tbody>
              {TACHES_EN_RETARD.map((row, index) => (
                <tr key={row.code}>
                  <td>{index + 1}</td>
                  <td className="ct-code">{row.code}</td>
                  <td>{row.projet}</td>
                  <td className="ct-name">{row.nom}</td>
                  <td className="ct-negative">{row.retard}</td>
                  <td>{row.echeance}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="ct-see-more">Voir les 6 autres</button>
        </div>

        <div className="ct-mini-panel">
          <div className="ct-mini-head"><h3>Les 10 tâches proches de l’échéance</h3><button type="button">Voir tout</button></div>
          <table className="ct-mini-table">
            <thead><tr><th>#</th><th>Code tâche</th><th>Projet</th><th>Tâche</th><th>Échéance</th><th></th></tr></thead>
            <tbody>
              {TACHES_PROCHES.map((row, index) => (
                <tr key={row.code}>
                  <td>{index + 1}</td>
                  <td className="ct-code">{row.code}</td>
                  <td>{row.projet}</td>
                  <td className="ct-name">{row.nom}</td>
                  <td>{row.echeance}</td>
                  <td className="ct-warning">{row.delai}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="ct-see-more">Voir les 6 autres</button>
        </div>

        <div className="ct-mini-panel">
          <div className="ct-mini-head"><h3>Collaborateurs ayant le plus de tâches en cours</h3><button type="button">Voir tout</button></div>
          <table className="ct-mini-table">
            <thead><tr><th>#</th><th>Collaborateur</th><th>Matricule</th><th>Tâches en cours</th><th>EHS consommés</th></tr></thead>
            <tbody>
              {COLLABORATEURS_ACTIFS.map((row, index) => (
                <tr key={row.matricule}>
                  <td>{index + 1}</td>
                  <td className="ct-name">{row.nom}</td>
                  <td>{row.matricule}</td>
                  <td>{row.taches}</td>
                  <td>{row.ehs}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="ct-see-more">Voir les 6 autres</button>
        </div>
      </div>
    </section>
  )
}
