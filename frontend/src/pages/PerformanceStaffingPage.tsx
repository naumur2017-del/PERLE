import { useState } from 'react'
import {
  ArrowRight, Calendar, Clock, Clock3, ClipboardList, Info, Star, User, UserCheck, UserX, Users,
} from 'lucide-react'
import './PerformanceStaffingPage.css'

type Tab = 'ehs' | 'temps' | 'notes'

const TABS: { key: Tab; label: string }[] = [
  { key: 'ehs', label: 'EHS & Staffing' },
  { key: 'temps', label: 'Temps (heures)' },
  { key: 'notes', label: 'Notes & Performance' },
]

const KPIS = [
  { icon: Users, tone: 'indigo', label: 'EHS consommés / total', value: '1 235 / 2 100', sub: '58,81 %' },
  { icon: Users, tone: 'orange', label: "Équipe la plus consommatrice d'EHS", value: 'RE - Ressources', sub: '428 EHS (34,65 %)' },
  { icon: ClipboardList, tone: 'blue', label: 'Nombre total de staffings', value: '245', sub: 'staffings' },
  { icon: UserCheck, tone: 'green', label: 'Personnes staffées', value: '36', sub: 'personnes' },
  { icon: UserX, tone: 'red', label: 'Personnes non staffées', value: '6', sub: 'personnes' },
]

const CONSO_PAR_EQUIPE = [
  { equipe: 'RE - Ressources', consomme: 428, total: 720, pct: 59.44 },
  { equipe: 'FO - Front Office', consomme: 312, total: 540, pct: 57.78 },
  { equipe: 'PI - Pilotage / Ingénierie', consomme: 198, total: 360, pct: 55.00 },
  { equipe: 'DIR - Direction', consomme: 152, total: 240, pct: 63.33 },
  { equipe: 'DG - Direction Générale', consomme: 145, total: 240, pct: 60.42 },
]
const CONSO_PAR_EQUIPE_TOTAL = { consomme: 1235, total: 2100, pct: 58.81 }

const CONSO_PAR_EMPLOYE = [
  { nom: 'Essogo Erine', equipe: 'RE', consomme: 162, pct: 13.12 },
  { nom: 'Ibrahim Mbouombouo', equipe: 'PI', consomme: 128, pct: 10.36 },
  { nom: 'Pamella Guebediang', equipe: 'PI', consomme: 124, pct: 10.04 },
  { nom: 'Ajara Lamare', equipe: 'FO', consomme: 118, pct: 9.55 },
  { nom: 'Herman Tsaffack', equipe: 'RE', consomme: 95, pct: 7.69 },
]
const CONSO_PAR_EMPLOYE_TOTAL = { consomme: 627, pct: 50.77 }

const STATUT_STAFFING = [
  { statut: 'Correctement staffés', tone: 'green', nb: 24, pct: 66.67 },
  { statut: 'Sous-staffés', tone: 'orange', nb: 8, pct: 22.22 },
  { statut: 'Surstaffés', tone: 'red', nb: 4, pct: 11.11 },
]
const STATUT_STAFFING_TOTAL = { nb: 36, pct: 100 }

const STAFFINGS_PAR_MANAGER = [
  { nom: 'Ajara Lamare', nb: 78, employes: 32 },
  { nom: 'Ibrahim Mbouombouo', nb: 62, employes: 28 },
  { nom: 'Pamella Guebediang', nb: 48, employes: 24 },
  { nom: 'Théodore Bessala', nb: 32, employes: 18 },
  { nom: 'Ngando Djakou Garnier', nb: 25, employes: 16 },
]
const STAFFINGS_PAR_MANAGER_TOTAL = 245

const STAFFINGS_PAR_EMPLOYE = [
  { nom: 'Essogo Erine', nb: 32, equipe: 'RE' },
  { nom: 'Ibrahim Mbouombouo', nb: 28, equipe: 'PI' },
  { nom: 'Pamella Guebediang', nb: 24, equipe: 'PI' },
  { nom: 'Ajara Lamare', nb: 22, equipe: 'FO' },
  { nom: 'Herman Tsaffack', nb: 18, equipe: 'RE' },
]
const STAFFINGS_PAR_EMPLOYE_TOTAL = 124

const NON_STAFFES = [
  { nom: 'Mballa Christian', equipe: 'PI', role: 'Analyste de données', motif: 'Aucune tâche affectée' },
  { nom: 'Kengne Alice', equipe: 'FO', role: 'Chargée de communication', motif: "En attente d'affectation" },
  { nom: 'Nana Paul', equipe: 'RE', role: 'Assistant administratif', motif: 'Aucune tâche affectée' },
  { nom: 'Nguimatsia Bruno', equipe: 'PI', role: 'Développeur', motif: "En attente d'affectation" },
  { nom: 'Zanga Linda', equipe: 'FO', role: 'Téléopératrice', motif: "En attente d'affectation" },
  { nom: 'Oumarou Idriss', equipe: 'PI', role: 'Stagiaire', motif: 'Aucune tâche affectée' },
]

const MOYENNE_HEURES = '71 h 10'

const TEMPS_KPIS = [
  { icon: Clock, tone: 'indigo', label: 'Heures consommées (total)', value: '2 846 h 30', sub: 'Sur la période sélectionnée' },
  { icon: Calendar, tone: 'blue', label: 'Jours travaillés (total)', value: '427', sub: 'Jours' },
  { icon: User, tone: 'purple', label: 'Moyenne d\'heures par personne', value: MOYENNE_HEURES, sub: 'En moyenne' },
  { icon: Clock3, tone: 'indigo', label: 'Heures prévues (total)', value: '3 560 h 00', sub: 'Taux réalisation : 79,91 %' },
]

const HEURES_PAR_EQUIPE = [
  { equipe: 'PI - Pilotage / Ingénierie', heures: '812 h 45', pct: 28.55 },
  { equipe: 'RE - Ressources', heures: '678 h 20', pct: 23.84 },
  { equipe: 'FO - Front Office', heures: '562 h 10', pct: 19.75 },
  { equipe: 'DIR - Direction', heures: '431 h 15', pct: 15.16 },
  { equipe: 'DG - Direction Générale', heures: '362 h 00', pct: 12.70 },
]
const HEURES_PAR_EQUIPE_TOTAL = { heures: '2 846 h 30', pct: 100 }

const HEURES_PAR_PROJET = [
  { projet: 'PADESCE', heures: '1 124 h 20', pct: 39.50 },
  { projet: 'TRANSFAGRI', heures: '642 h 15', pct: 22.57 },
  { projet: 'PASNFI', heures: '418 h 30', pct: 14.71 },
  { projet: 'CGA - Prestations internes', heures: '352 h 45', pct: 12.39 },
  { projet: 'Autres projets', heures: '308 h 40', pct: 10.83 },
]
const HEURES_PAR_PROJET_TOTAL = { heures: '2 846 h 30', pct: 100 }

const EVOLUTION_HEURES = [
  { periode: '26/05/2025 - 31/05/2025', consomme: '497 h 30', prevu: '600 h 00', taux: 82.92 },
  { periode: '19/05/2025 - 25/05/2025', consomme: '586 h 05', prevu: '720 h 00', taux: 81.40 },
  { periode: '12/05/2025 - 18/05/2025', consomme: '712 h 10', prevu: '900 h 00', taux: 79.12 },
  { periode: '05/05/2025 - 11/05/2025', consomme: '638 h 15', prevu: '820 h 00', taux: 77.84 },
  { periode: '01/05/2025 - 04/05/2025', consomme: '412 h 30', prevu: '520 h 00', taux: 79.33 },
]
const EVOLUTION_HEURES_TOTAL = { consomme: '2 846 h 30', prevu: '3 560 h 00', taux: 79.91 }

const EMPLOYES_SOUS_MOYENNE = [
  { nom: 'Mballa Christian', equipe: 'PI - Pilotage / Ingénierie', heures: '42 h 30', ecart: '-28 h 40', pct: 59.74, role: 'Analyste de données' },
  { nom: 'Kengne Alice', equipe: 'FO - Front Office', heures: '48 h 10', ecart: '-23 h 00', pct: 67.63, role: 'Chargée de communication' },
  { nom: 'Nana Paul', equipe: 'RE - Ressources', heures: '51 h 20', ecart: '-19 h 50', pct: 72.13, role: 'Assistant administratif' },
  { nom: 'Nguimatsia Bruno', equipe: 'PI - Pilotage / Ingénierie', heures: '55 h 40', ecart: '-15 h 30', pct: 78.25, role: 'Développeur' },
  { nom: 'Zanga Linda', equipe: 'FO - Front Office', heures: '58 h 00', ecart: '-13 h 10', pct: 81.56, role: 'Téléopératrice' },
]

const SUBTITLES: Record<Tab, string> = {
  ehs: 'Suivez la performance de vos équipes et la mobilisation des ressources.',
  temps: 'Suivez la performance de vos équipes et la mobilisation des ressources.',
  notes: 'Suivez la performance de vos équipes et la qualité des réalisations.',
}

const NOTES_KPIS: { icon: typeof Star; tone: string; label: string; value: string; value2?: string; value2Tone?: string; sub: string }[] = [
  { icon: Star, tone: 'indigo', label: 'Note moyenne globale', value: '4,18 / 5', sub: 'Sur la période sélectionnée' },
  { icon: Users, tone: 'green', label: 'Équipe la mieux notée', value: 'PI - Pilotage / Ingénierie', value2: '4,58 / 5', value2Tone: 'green', sub: 'Note moyenne' },
  { icon: User, tone: 'purple', label: 'Employé le mieux noté', value: 'Essogo Erine', value2: '4,85 / 5', value2Tone: 'blue', sub: 'Note moyenne' },
  { icon: ClipboardList, tone: 'orange', label: 'Nombre de tâches évaluées', value: '1 248', sub: 'Tâches' },
]

const NOTE_PAR_EQUIPE = [
  { equipe: 'PI - Pilotage / Ingénierie', note: 4.58, nb: 312 },
  { equipe: 'FO - Front Office', note: 4.32, nb: 248 },
  { equipe: 'RE - Ressources', note: 4.17, nb: 236 },
  { equipe: 'DIR - Direction', note: 4.05, nb: 184 },
  { equipe: 'DG - Direction Générale', note: 3.92, nb: 132 },
]

const NOTE_PAR_EMPLOYE = [
  { nom: 'Essogo Erine', equipe: 'RE', note: 4.85, nb: 56 },
  { nom: 'Ibrahim Mbouombouo', equipe: 'PI', note: 4.62, nb: 63 },
  { nom: 'Pamella Guebediang', equipe: 'PI', note: 4.47, nb: 52 },
  { nom: 'Ajara Lamare', equipe: 'FO', note: 4.38, nb: 47 },
  { nom: 'Herman Tsaffack', equipe: 'RE', note: 4.31, nb: 41 },
]

const NOTE_PAR_MANAGER = [
  { nom: 'Ajara Lamare', note: 4.36, nb: 187 },
  { nom: 'Ibrahim Mbouombouo', note: 4.24, nb: 163 },
  { nom: 'Pamella Guebediang', note: 4.19, nb: 151 },
  { nom: 'Théodore Bessala', note: 4.05, nb: 128 },
  { nom: 'Ngando Djakou Garnier', note: 3.98, nb: 98 },
]

const fmtPct = (value: number) => `${value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`
const fmtNote = (value: number) => value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const statutToneClass = (tone: string) => `pfs-statut-${tone}`

function VoirTout() {
  return <button type="button" className="pfs-voir-tout">Voir tout <ArrowRight size={14} /></button>
}

export default function PerformanceStaffingPage({ navigateTo }: { navigateTo: (page: string) => void }) {
  const [activeTab, setActiveTab] = useState<Tab>('ehs')
  const [filterProjet, setFilterProjet] = useState('Tous')
  const [filterEquipe, setFilterEquipe] = useState('Toutes')
  const [filterManager, setFilterManager] = useState('Tous')

  return (
    <section className="pfs-page">
      <div className="pfs-title-row">
        <div>
          <h1>Performance & Staffing</h1>
          <p>{SUBTITLES[activeTab]}</p>
          <button type="button" className="pfs-link-btn" onClick={() => navigateTo('pilotage')}>Voir le pilotage des projets</button>
        </div>
        <div className="pfs-toolbar">
          <label>Période
            <button type="button" className="pfs-daterange"><Calendar size={14} />01/05/2025 → 31/05/2025</button>
          </label>
          <label>Projet
            <select value={filterProjet} onChange={(e) => setFilterProjet(e.target.value)}>
              <option>Tous</option>
              <option>ERP Academy</option>
              <option>Mission Audit Interne</option>
              <option>Digitalisation RH</option>
            </select>
          </label>
          <label>Équipe
            <select value={filterEquipe} onChange={(e) => setFilterEquipe(e.target.value)}>
              <option>Toutes</option>
              <option>RE - Ressources</option>
              <option>FO - Front Office</option>
              <option>PI - Pilotage / Ingénierie</option>
              <option>DIR - Direction</option>
              <option>DG - Direction Générale</option>
            </select>
          </label>
          <label>Manager
            <select value={filterManager} onChange={(e) => setFilterManager(e.target.value)}>
              <option>Tous</option>
              <option>Ajara Lamare</option>
              <option>Ibrahim Mbouombouo</option>
              <option>Pamella Guebediang</option>
              <option>Théodore Bessala</option>
            </select>
          </label>
        </div>
      </div>

      <nav className="pfs-tabs">
        {TABS.map((tab) => (
          <button key={tab.key} className={activeTab === tab.key ? 'active' : ''} onClick={() => setActiveTab(tab.key)}>
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === 'ehs' ? (
        <>
          <div className="pfs-kpis">
            {KPIS.map((kpi) => (
              <article key={kpi.label} className={`pfs-kpi pfs-kpi-${kpi.tone}`}>
                <span className="pfs-kpi-icon"><kpi.icon size={18} /></span>
                <div>
                  <span className="pfs-kpi-label">{kpi.label}</span>
                  <strong>{kpi.value}</strong>
                  <small>{kpi.sub}</small>
                </div>
              </article>
            ))}
          </div>

          <div className="pfs-grid pfs-grid-3">
            <section className="pfs-panel">
              <h3>Consommation d'EHS par équipe</h3>
              <table className="pfs-table">
                <thead><tr><th>Équipe</th><th>EHS consommés</th><th>EHS total</th><th>% consommation</th></tr></thead>
                <tbody>
                  {CONSO_PAR_EQUIPE.map((row) => (
                    <tr key={row.equipe}>
                      <td>{row.equipe}</td>
                      <td>{row.consomme}</td>
                      <td>{row.total}</td>
                      <td>{fmtPct(row.pct)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>TOTAL</td>
                    <td>{CONSO_PAR_EQUIPE_TOTAL.consomme}</td>
                    <td>{CONSO_PAR_EQUIPE_TOTAL.total}</td>
                    <td>{fmtPct(CONSO_PAR_EQUIPE_TOTAL.pct)}</td>
                  </tr>
                </tfoot>
              </table>
            </section>

            <section className="pfs-panel">
              <h3>Consommation d'EHS par employé (Top 5)</h3>
              <table className="pfs-table">
                <thead><tr><th>Employé</th><th>Équipe</th><th>EHS consommés</th><th>% du total EHS</th></tr></thead>
                <tbody>
                  {CONSO_PAR_EMPLOYE.map((row) => (
                    <tr key={row.nom}>
                      <td className="pfs-name">{row.nom}</td>
                      <td>{row.equipe}</td>
                      <td>{row.consomme}</td>
                      <td>{fmtPct(row.pct)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>TOTAL TOP 5</td>
                    <td>—</td>
                    <td>{CONSO_PAR_EMPLOYE_TOTAL.consomme}</td>
                    <td>{fmtPct(CONSO_PAR_EMPLOYE_TOTAL.pct)}</td>
                  </tr>
                </tfoot>
              </table>
            </section>

            <section className="pfs-panel">
              <h3>Statut de staffing des employés</h3>
              <table className="pfs-table">
                <thead><tr><th>Statut</th><th>Nombre de personnes</th><th>%</th></tr></thead>
                <tbody>
                  {STATUT_STAFFING.map((row) => (
                    <tr key={row.statut}>
                      <td><span className={`pfs-statut ${statutToneClass(row.tone)}`}>{row.statut}</span></td>
                      <td>{row.nb}</td>
                      <td>{fmtPct(row.pct)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>TOTAL</td>
                    <td>{STATUT_STAFFING_TOTAL.nb}</td>
                    <td>{STATUT_STAFFING_TOTAL.pct} %</td>
                  </tr>
                </tfoot>
              </table>
            </section>
          </div>

          <div className="pfs-grid pfs-grid-3">
            <section className="pfs-panel">
              <h3>Nombre de staffings par manager</h3>
              <table className="pfs-table">
                <thead><tr><th>Manager</th><th>Nombre de staffings</th></tr></thead>
                <tbody>
                  {STAFFINGS_PAR_MANAGER.map((row) => (
                    <tr key={row.nom}><td className="pfs-name">{row.nom}</td><td>{row.nb}</td></tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td>TOTAL</td><td>{STAFFINGS_PAR_MANAGER_TOTAL}</td></tr>
                </tfoot>
              </table>
            </section>

            <section className="pfs-panel">
              <h3>Nombre de staffings par employé (Top 5)</h3>
              <table className="pfs-table">
                <thead><tr><th>Employé</th><th>Nombre de staffings</th></tr></thead>
                <tbody>
                  {STAFFINGS_PAR_EMPLOYE.map((row) => (
                    <tr key={row.nom}><td className="pfs-name">{row.nom}</td><td>{row.nb}</td></tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td>TOTAL TOP 5</td><td>{STAFFINGS_PAR_EMPLOYE_TOTAL}</td></tr>
                </tfoot>
              </table>
            </section>

            <section className="pfs-panel">
              <h3>Situation actuelle (personnel non staffé)</h3>
              <table className="pfs-table">
                <thead><tr><th>Employé</th><th>Équipe</th><th>Rôle / Fonction</th><th>Motif principal</th></tr></thead>
                <tbody>
                  {NON_STAFFES.map((row) => (
                    <tr key={row.nom}>
                      <td className="pfs-name">{row.nom}</td>
                      <td>{row.equipe}</td>
                      <td>{row.role}</td>
                      <td>{row.motif}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td>TOTAL</td><td colSpan={3}>{NON_STAFFES.length}</td></tr>
                </tfoot>
              </table>
            </section>
          </div>
        </>
      ) : activeTab === 'temps' ? (
        <>
          <div className="pfs-kpis pfs-kpis-4">
            {TEMPS_KPIS.map((kpi) => (
              <article key={kpi.label} className={`pfs-kpi pfs-kpi-${kpi.tone}`}>
                <span className="pfs-kpi-icon"><kpi.icon size={18} /></span>
                <div>
                  <span className="pfs-kpi-label">{kpi.label}</span>
                  <strong>{kpi.value}</strong>
                  <small>{kpi.sub}</small>
                </div>
              </article>
            ))}
          </div>

          <div className="pfs-grid pfs-grid-3">
            <section className="pfs-panel">
              <h3>Heures consommées par équipe</h3>
              <table className="pfs-table">
                <thead><tr><th>#</th><th>Équipe</th><th>Heures consommées</th><th>% du total</th></tr></thead>
                <tbody>
                  {HEURES_PAR_EQUIPE.map((row, index) => (
                    <tr key={row.equipe}>
                      <td>{index + 1}</td>
                      <td>{row.equipe}</td>
                      <td>{row.heures}</td>
                      <td>{fmtPct(row.pct)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2}>TOTAL</td>
                    <td>{HEURES_PAR_EQUIPE_TOTAL.heures}</td>
                    <td>{HEURES_PAR_EQUIPE_TOTAL.pct} %</td>
                  </tr>
                </tfoot>
              </table>
            </section>

            <section className="pfs-panel">
              <h3>Heures consommées par projet</h3>
              <table className="pfs-table">
                <thead><tr><th>#</th><th>Projet</th><th>Heures consommées</th><th>% du total</th></tr></thead>
                <tbody>
                  {HEURES_PAR_PROJET.map((row, index) => (
                    <tr key={row.projet}>
                      <td>{index + 1}</td>
                      <td>{row.projet}</td>
                      <td>{row.heures}</td>
                      <td>{fmtPct(row.pct)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2}>TOTAL</td>
                    <td>{HEURES_PAR_PROJET_TOTAL.heures}</td>
                    <td>{HEURES_PAR_PROJET_TOTAL.pct} %</td>
                  </tr>
                </tfoot>
              </table>
            </section>

            <section className="pfs-panel">
              <h3>Évolution de la consommation d'heures</h3>
              <table className="pfs-table">
                <thead><tr><th>#</th><th>Période</th><th>Heures consommées</th><th>Heures prévues</th><th>Taux réalisation</th></tr></thead>
                <tbody>
                  {EVOLUTION_HEURES.map((row, index) => (
                    <tr key={row.periode}>
                      <td>{index + 1}</td>
                      <td>{row.periode}</td>
                      <td>{row.consomme}</td>
                      <td>{row.prevu}</td>
                      <td>{fmtPct(row.taux)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2}>TOTAL PÉRIODE</td>
                    <td>{EVOLUTION_HEURES_TOTAL.consomme}</td>
                    <td>{EVOLUTION_HEURES_TOTAL.prevu}</td>
                    <td>{fmtPct(EVOLUTION_HEURES_TOTAL.taux)}</td>
                  </tr>
                </tfoot>
              </table>
            </section>
          </div>

          <section className="pfs-panel">
            <h3>Employés n'ayant pas atteint la moyenne d'heures ({MOYENNE_HEURES})</h3>
            <table className="pfs-table">
              <thead>
                <tr>
                  <th>#</th><th>Employé</th><th>Équipe</th><th>Heures consommées</th><th>Écart vs moyenne</th>
                  <th>% de la moyenne</th><th>Rôle / Fonction</th><th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {EMPLOYES_SOUS_MOYENNE.map((row, index) => (
                  <tr key={row.nom}>
                    <td>{index + 1}</td>
                    <td className="pfs-name">{row.nom}</td>
                    <td>{row.equipe}</td>
                    <td>{row.heures}</td>
                    <td>{row.ecart}</td>
                    <td>{fmtPct(row.pct)}</td>
                    <td>{row.role}</td>
                    <td><span className={`pfs-statut ${statutToneClass('orange')}`}>Sous la moyenne</span></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>TOTAL</td>
                  <td>{EMPLOYES_SOUS_MOYENNE.length} employés</td>
                  <td>—</td><td>—</td><td>—</td><td>—</td><td>—</td>
                </tr>
              </tfoot>
            </table>
          </section>
        </>
      ) : (
        <>
          <div className="pfs-kpis pfs-kpis-4">
            {NOTES_KPIS.map((kpi) => (
              <article key={kpi.label} className={`pfs-kpi pfs-kpi-${kpi.tone}`}>
                <span className="pfs-kpi-icon"><kpi.icon size={18} /></span>
                <div>
                  <span className="pfs-kpi-label">{kpi.label}</span>
                  <strong className={kpi.value2 ? 'pfs-kpi-value-name' : undefined}>{kpi.value}</strong>
                  {kpi.value2 && <strong className={`pfs-kpi-value2 tone-${kpi.value2Tone}`}>{kpi.value2}</strong>}
                  <small>{kpi.sub}</small>
                </div>
              </article>
            ))}
          </div>

          <div className="pfs-grid pfs-grid-3">
            <section className="pfs-panel">
              <h3>Note moyenne par équipe <span className="pfs-h3-sub">(classement décroissant)</span></h3>
              <table className="pfs-table">
                <thead><tr><th>#</th><th>Équipe</th><th>Note moyenne (/5)</th><th>Nombre de tâches évaluées</th></tr></thead>
                <tbody>
                  {NOTE_PAR_EQUIPE.map((row, index) => (
                    <tr key={row.equipe}>
                      <td>{index + 1}</td>
                      <td>{row.equipe}</td>
                      <td>{fmtNote(row.note)}</td>
                      <td>{row.nb}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <VoirTout />
            </section>

            <section className="pfs-panel">
              <h3>Note moyenne par employé <span className="pfs-h3-sub">(classement décroissant)</span></h3>
              <table className="pfs-table">
                <thead><tr><th>#</th><th>Employé</th><th>Équipe</th><th>Note moyenne (/5)</th><th>Nombre de tâches évaluées</th></tr></thead>
                <tbody>
                  {NOTE_PAR_EMPLOYE.map((row, index) => (
                    <tr key={row.nom}>
                      <td>{index + 1}</td>
                      <td className="pfs-name">{row.nom}</td>
                      <td>{row.equipe}</td>
                      <td>{fmtNote(row.note)}</td>
                      <td>{row.nb}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <VoirTout />
            </section>

            <section className="pfs-panel">
              <h3>Note moyenne donnée par manager <span className="pfs-h3-sub">(classement décroissant)</span></h3>
              <table className="pfs-table">
                <thead><tr><th>#</th><th>Manager</th><th>Note moyenne donnée (/5)</th><th>Nombre de tâches évaluées</th></tr></thead>
                <tbody>
                  {NOTE_PAR_MANAGER.map((row, index) => (
                    <tr key={row.nom}>
                      <td>{index + 1}</td>
                      <td className="pfs-name">{row.nom}</td>
                      <td>{fmtNote(row.note)}</td>
                      <td>{row.nb}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <VoirTout />
            </section>
          </div>

          <div className="pfs-grid pfs-grid-2">
            <section className="pfs-panel">
              <h3>Nombre de staffings par manager <span className="pfs-h3-sub">(classement décroissant)</span></h3>
              <table className="pfs-table">
                <thead><tr><th>#</th><th>Manager</th><th>Nombre de staffings réalisés</th><th>Nombre d'employés staffés</th></tr></thead>
                <tbody>
                  {STAFFINGS_PAR_MANAGER.map((row, index) => (
                    <tr key={row.nom}>
                      <td>{index + 1}</td>
                      <td className="pfs-name">{row.nom}</td>
                      <td>{row.nb}</td>
                      <td>{row.employes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <VoirTout />
            </section>

            <section className="pfs-panel">
              <h3>Nombre de staffings par employé <span className="pfs-h3-sub">(classement décroissant)</span></h3>
              <table className="pfs-table">
                <thead><tr><th>#</th><th>Employé</th><th>Nombre de staffings</th><th>Équipe</th></tr></thead>
                <tbody>
                  {STAFFINGS_PAR_EMPLOYE.map((row, index) => (
                    <tr key={row.nom}>
                      <td>{index + 1}</td>
                      <td className="pfs-name">{row.nom}</td>
                      <td>{row.nb}</td>
                      <td>{row.equipe}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <VoirTout />
            </section>
          </div>
        </>
      )}

      {activeTab === 'ehs' ? (
        <div className="pfs-info-banner">
          <Info size={14} />
          <span>Les données sont calculées sur la période sélectionnée et selon les filtres appliqués.</span>
        </div>
      ) : activeTab === 'temps' ? (
        <div className="pfs-info-banner pfs-info-banner-stack">
          <Info size={14} />
          <div>
            <p>Les heures consommées correspondent aux heures réellement imputées aux tâches via le module Staffing.</p>
            <p>Les heures prévues proviennent des plannings et des estimations initiales des projets.</p>
          </div>
        </div>
      ) : (
        <div className="pfs-info-banner pfs-info-banner-stack">
          <Info size={14} />
          <div>
            <p>Les notes sont attribuées par les managers lors de la clôture des tâches dans le module Staffing.</p>
            <p>La note moyenne globale est pondérée sur le nombre de tâches évaluées.</p>
          </div>
        </div>
      )}
    </section>
  )
}
