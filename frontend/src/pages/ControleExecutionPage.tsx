import { useState } from 'react'
import {
  AlertTriangle, CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck,
  ClipboardList, Download, Eye, OctagonAlert, Paperclip, RotateCcw, Search, Target,
} from 'lucide-react'
import './ControleExecutionPage.css'

interface Verification {
  ref: string
  projet: string
  tache: string
  type: string
  date: string
  verifiePar: string
  statut: 'Conforme' | 'Non conforme' | 'En attente'
  criticite: 'Basse' | 'Moyenne' | 'Élevée' | 'Critique'
  conformite: string
  observations: string
  pieces: number
}

const VERIFICATIONS: Verification[] = [
  { ref: 'VER-2025-152', projet: 'PADESCE', tache: 'Collecte de données cohorte B', type: 'Respect des délais', date: '29/05/2025', verifiePar: 'Ajara Lamare', statut: 'Conforme', criticite: 'Moyenne', conformite: '100%', observations: 'Respect du délai contractuel', pieces: 2 },
  { ref: 'VER-2025-151', projet: 'CGP', tache: 'Rédaction du rapport mensuel', type: 'Qualité livrable', date: '28/05/2025', verifiePar: 'Pamella Guediang', statut: 'Non conforme', criticite: 'Élevée', conformite: '60%', observations: 'Manque d’analyses détaillées', pieces: 3 },
  { ref: 'VER-2025-150', projet: 'PILOTAGE', tache: 'Suivi budgétaire mensuel', type: 'Conformité budget', date: '27/05/2025', verifiePar: 'Théodore Bessala', statut: 'Conforme', criticite: 'Moyenne', conformite: '100%', observations: 'Budget respecté', pieces: 1 },
  { ref: 'VER-2025-149', projet: 'MIDER', tache: 'Analyse des données terrain', type: 'Exactitude données', date: '27/05/2025', verifiePar: 'Mala Patrice', statut: 'Non conforme', criticite: 'Critique', conformite: '40%', observations: 'Données incomplètes et incohérentes', pieces: 4 },
  { ref: 'VER-2025-148', projet: 'DIEGO', tache: 'Préparation atelier de restitution', type: 'Préparation logistique', date: '26/05/2025', verifiePar: 'Assabe Zainabou', statut: 'Conforme', criticite: 'Basse', conformite: '-', observations: 'Bonne préparation logistique', pieces: 2 },
  { ref: 'VER-2025-147', projet: 'BAC OFFICE', tache: 'Vérification des pièces justificatives', type: 'Conformité pièces', date: '26/05/2025', verifiePar: 'Julienne Ekouma', statut: 'En attente', criticite: 'Moyenne', conformite: '-', observations: 'En cours de vérification', pieces: 0 },
]

const KPIS = [
  { icon: ClipboardList, tone: 'purple', label: 'Total vérifications', value: '1 152', sub: 'Toutes vérifications' },
  { icon: CheckCircle2, tone: 'green', label: 'Conformes', value: '842', sub: '73,1%' },
  { icon: AlertTriangle, tone: 'orange', label: 'Non conformes', value: '210', sub: '18,2%' },
  { icon: OctagonAlert, tone: 'red', label: 'Critiques', value: '68', sub: '5,9%' },
  { icon: CalendarClock, tone: 'purple', label: 'En attente', value: '32', sub: '2,8%' },
  { icon: Target, tone: 'green', label: 'Taux de conformité global', value: '73,1%', sub: 'Objectif : 80%' },
  { icon: CalendarClock, tone: 'purple', label: 'Vérifications cette semaine', value: '54', sub: 'Cette semaine' },
  { icon: ClipboardCheck, tone: 'purple', label: 'Vérifications ce mois', value: '312', sub: 'Ce mois' },
]

const REPARTITION = [
  { label: 'Conformes (73,1%)', value: 842, color: '#16a34a' },
  { label: 'Non conformes (18,2%)', value: 210, color: '#f59e0b' },
  { label: 'Critiques (5,9%)', value: 68, color: '#dc2626' },
  { label: 'En attente (2,8%)', value: 32, color: '#6b46c1' },
]

const ALERTES = [
  { icon: OctagonAlert, tone: 'red', label: 'Vérifications critiques', value: 68 },
  { icon: AlertTriangle, tone: 'orange', label: 'Non conformes ouvertes', value: 210 },
  { icon: ClipboardList, tone: 'orange', label: 'Actions correctives en attente', value: 96 },
  { icon: CalendarClock, tone: 'purple', label: 'Échéances actions correctives (7 jours)', value: 38 },
  { icon: OctagonAlert, tone: 'red', label: 'Tâches bloquées pour non-conformité', value: 22 },
]

const CONFORMITE_PAR_PROJET = [
  { projet: 'PADESCE', taux: 85.6 },
  { projet: 'CGP', taux: 62.4 },
  { projet: 'PILOTAGE', taux: 78.9 },
  { projet: 'MIDER', taux: 55.2 },
  { projet: 'DIEGO', taux: 90.1 },
  { projet: 'BAC OFFICE', taux: 71.3 },
]

const TOP_NON_CONFORMITES = [
  { type: 'Qualité livrable', valeur: 78 },
  { type: 'Exactitude données', valeur: 45 },
  { type: 'Respect des délais', valeur: 38 },
  { type: 'Conformité budget', valeur: 28 },
  { type: 'Conformité pièces', valeur: 21 },
]

const ACTIONS_CORRECTIVES = [
  { ref: 'AC-2025-096', nonConformite: 'Données incomplètes', projet: 'MIDER', responsable: 'Mala Patrice', echeance: '02/06/2025' },
  { ref: 'AC-2025-095', nonConformite: 'Manque d’analyses', projet: 'CGP', responsable: 'Pamella Guediang', echeance: '01/06/2025' },
  { ref: 'AC-2025-094', nonConformite: 'Retard de livraison', projet: 'PILOTAGE', responsable: 'Théodore Bessala', echeance: '03/06/2025' },
  { ref: 'AC-2025-093', nonConformite: 'Pièces manquantes', projet: 'PADESCE', responsable: 'Ajara Lamare', echeance: '31/05/2025' },
  { ref: 'AC-2025-092', nonConformite: 'Données incohérentes', projet: 'MIDER', responsable: 'Assabe Zainabou', echeance: '04/06/2025' },
]

const statutClass = (statut: Verification['statut']) => {
  if (statut === 'Conforme') return 'conforme'
  if (statut === 'Non conforme') return 'non-conforme'
  return 'attente'
}

const criticiteClass = (criticite: Verification['criticite']) => {
  if (criticite === 'Critique') return 'critique'
  if (criticite === 'Élevée') return 'elevee'
  if (criticite === 'Basse') return 'basse'
  return 'moyenne'
}

const barTone = (value: number) => value >= 75 ? 'good' : value >= 60 ? 'warn' : 'bad'

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
    <div className="ce-donut-wrap">
      <svg viewBox="0 0 160 160" className="ce-donut-svg" role="img" aria-label="Répartition des vérifications">
        {slices.map((slice) => <path key={slice.label} d={slice.path} fill={slice.color} />)}
        <text x={cx} y={cy - 4} textAnchor="middle" className="ce-donut-value">{total.toLocaleString('fr-FR')}</text>
        <text x={cx} y={cy + 13} textAnchor="middle" className="ce-donut-sub">Total</text>
      </svg>
      <ul className="ce-donut-legend">
        {REPARTITION.map((item) => (
          <li key={item.label}><i style={{ background: item.color }} />{item.label}</li>
        ))}
      </ul>
    </div>
  )
}

export default function ControleExecutionPage({ navigateTo }: { navigateTo: (page: string) => void }) {
  const [search, setSearch] = useState('')

  return (
    <section className="ce-page">
      <div className="ce-subtabs-row">
        <nav className="ce-subtabs">
          <button onClick={() => navigateTo('pilotage')}><ClipboardList size={14} />Pilotage des projets et gestion budgétaire</button>
          <button onClick={() => navigateTo('controle-taches')}><CheckCircle2 size={14} />Contrôle des tâches</button>
          <button className="active" onClick={() => navigateTo('controle-execution')}><ClipboardCheck size={14} />Contrôle d’exécution et conformité</button>
        </nav>
        <button type="button" className="ce-btn-primary"><Download size={14} />Exporter</button>
      </div>

      <div className="ce-kpis">
        {KPIS.map((kpi) => (
          <article key={kpi.label} className={`ce-kpi ce-kpi-${kpi.tone}`}>
            <span className="ce-kpi-icon"><kpi.icon size={17} /></span>
            <div>
              <strong>{kpi.value}</strong>
              <span>{kpi.label}</span>
              <small>{kpi.sub}</small>
            </div>
          </article>
        ))}
      </div>

      <div className="ce-filters">
        <label>Projet<select defaultValue="Tous"><option>Tous les projets</option></select></label>
        <label>Manager<select defaultValue="Tous"><option>Tous les managers</option></select></label>
        <label>Chef de projet<select defaultValue="Tous"><option>Tous les chefs</option></select></label>
        <label>Division<select defaultValue="Toutes"><option>Toutes les divisions</option></select></label>
        <label>Collaborateur<select defaultValue="Tous"><option>Tous les collaborateurs</option></select></label>
      </div>
      <div className="ce-filters">
        <label>Type de vérification<select defaultValue="Tous"><option>Tous les types</option></select></label>
        <label>Criticité<select defaultValue="Toutes"><option>Toutes les criticités</option></select></label>
        <label>Statut<select defaultValue="Tous"><option>Tous les statuts</option></select></label>
        <label>Période<div className="ce-daterange"><CalendarClock size={13} />01/05/2025 → 31/05/2025</div></label>
        <label className="ce-search">
          <Search size={14} />
          <input placeholder="Rechercher une vérification (réf, tâche, projet...)" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <button type="button" className="ce-reset" onClick={() => setSearch('')}><RotateCcw size={14} />Réinitialiser</button>
      </div>

      <div className="ce-main">
        <div className="ce-table-panel">
          <div className="ce-table-head"><h3>Liste des vérifications d’exécution et de conformité</h3></div>
          <div className="ce-table-wrap">
            <table className="ce-table">
              <thead>
                <tr>
                  <th>Réf. vérification</th><th>Projet</th><th>Tâche concernée</th><th>Type de vérification</th>
                  <th>Date vérification</th><th>Vérifié par</th><th>Statut</th><th>Criticité</th>
                  <th>Conformité</th><th>Observations</th><th>Pièces jointes</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {VERIFICATIONS.map((v) => (
                  <tr key={v.ref}>
                    <td className="ce-code">{v.ref}</td>
                    <td>{v.projet}</td>
                    <td className="ce-name">{v.tache}</td>
                    <td>{v.type}</td>
                    <td>{v.date}</td>
                    <td>{v.verifiePar}</td>
                    <td><span className={`ce-pill ce-pill-${statutClass(v.statut)}`}>{v.statut}</span></td>
                    <td><span className={`ce-criticite ce-criticite-${criticiteClass(v.criticite)}`}>{v.criticite}</span></td>
                    <td>{v.conformite}</td>
                    <td className="ce-name">{v.observations}</td>
                    <td><span className="ce-pieces"><Paperclip size={12} />{v.pieces}</span></td>
                    <td><button type="button" className="ce-row-action" aria-label="Voir la vérification"><Eye size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="ce-table-foot">
            <span>Affichage de 1 à {VERIFICATIONS.length} sur 1 152 vérifications</span>
            <nav className="ce-pagination" aria-label="Pagination">
              <button type="button" disabled><ChevronLeft size={14} /></button>
              <button type="button" className="is-active">1</button>
              <button type="button">2</button>
              <button type="button">3</button>
              <button type="button">4</button>
              <button type="button">5</button>
              <span className="ce-page-ellipsis">…</span>
              <button type="button">192</button>
              <button type="button"><ChevronRight size={14} /></button>
            </nav>
          </div>
        </div>

        <aside className="ce-side">
          <div className="ce-panel">
            <h3>Répartition des vérifications</h3>
            <RepartitionDonut />
          </div>
          <div className="ce-panel">
            <h3>Alertes de conformité</h3>
            <ul className="ce-alertes">
              {ALERTES.map((alerte) => (
                <li key={alerte.label}>
                  <span className={`ce-alerte-icon ${alerte.tone}`}><alerte.icon size={14} /></span>
                  <span className="ce-alerte-label">{alerte.label}</span>
                  <b>{alerte.value}</b>
                </li>
              ))}
            </ul>
            <button type="button" className="ce-btn-outline">Voir toutes les alertes</button>
          </div>
        </aside>
      </div>

      <div className="ce-bottom">
        <div className="ce-mini-panel">
          <div className="ce-mini-head"><h3>Taux de conformité par projet</h3><button type="button">Voir tout</button></div>
          <ul className="ce-bar-list">
            {CONFORMITE_PAR_PROJET.map((row) => (
              <li key={row.projet}>
                <span className="ce-bar-label">{row.projet}</span>
                <span className="ce-bar-track"><i className={barTone(row.taux)} style={{ width: `${row.taux}%` }} /></span>
                <b>{row.taux.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</b>
              </li>
            ))}
          </ul>
        </div>

        <div className="ce-mini-panel">
          <div className="ce-mini-head"><h3>Top 5 des non-conformités par type</h3><button type="button">Voir tout</button></div>
          <ul className="ce-bar-list">
            {TOP_NON_CONFORMITES.map((row) => {
              const max = TOP_NON_CONFORMITES[0].valeur
              return (
                <li key={row.type}>
                  <span className="ce-bar-label">{row.type}</span>
                  <span className="ce-bar-track"><i className="bad" style={{ width: `${(row.valeur / max) * 100}%` }} /></span>
                  <b>{row.valeur}</b>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="ce-mini-panel">
          <div className="ce-mini-head"><h3>Actions correctives en cours</h3><button type="button">Voir tout</button></div>
          <table className="ce-mini-table">
            <thead><tr><th>Réf. action</th><th>Non-conformité</th><th>Projet</th><th>Responsable</th><th>Échéance</th><th>Statut</th></tr></thead>
            <tbody>
              {ACTIONS_CORRECTIVES.map((row) => (
                <tr key={row.ref}>
                  <td className="ce-code">{row.ref}</td>
                  <td className="ce-name">{row.nonConformite}</td>
                  <td>{row.projet}</td>
                  <td>{row.responsable}</td>
                  <td>{row.echeance}</td>
                  <td><span className="ce-pill ce-pill-attente">En cours</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
