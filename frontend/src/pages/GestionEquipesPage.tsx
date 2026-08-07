import { useState } from 'react'
import {
  BarChart3, ChevronLeft, ChevronRight, Filter, MoreVertical, Network,
  RotateCcw, Search, UserCheck, UserPlus, Users, Users2,
} from 'lucide-react'
import './GestionEquipesPage.css'

interface Employe {
  matricule: string
  nom: string
  fonction: string
  equipe: string
  grade: string
  manager: string
  statut: 'Actif'
  dateEntree: string
  initiales: string
  couleur: string
}

const EMPLOYES: Employe[] = [
  { matricule: 'NAU-0001', nom: 'Ngando D. Garnier', fonction: 'Directeur Général', equipe: 'Direction Générale', grade: 'G6', manager: '—', statut: 'Actif', dateEntree: '15/03/2018', initiales: 'NG', couleur: '#6b46c1' },
  { matricule: 'NAU-0023', nom: 'Ajara Lamare', fonction: 'Manager Pilotage', equipe: 'Pilotage & Contrôle', grade: 'G5', manager: 'Ngando D. Garnier', statut: 'Actif', dateEntree: '02/01/2020', initiales: 'AL', couleur: '#3b82f6' },
  { matricule: 'NAU-0057', nom: 'Ibrahim Mbouombouo', fonction: 'Contrôleur', equipe: 'Pilotage & Contrôle', grade: 'G4', manager: 'Ajara Lamare', statut: 'Actif', dateEntree: '12/07/2021', initiales: 'IM', couleur: '#16a34a' },
  { matricule: 'NAU-0084', nom: 'Pamella Guebediang', fonction: 'Contrôleur', equipe: 'Pilotage & Contrôle', grade: 'G4', manager: 'Ajara Lamare', statut: 'Actif', dateEntree: '12/07/2021', initiales: 'PG', couleur: '#f59e0b' },
  { matricule: 'NAU-0101', nom: 'Théodore Bessala', fonction: 'Responsable RH', equipe: 'Ressources Humaines', grade: 'G5', manager: 'Ngando D. Garnier', statut: 'Actif', dateEntree: '01/02/2019', initiales: 'TB', couleur: '#db2777' },
  { matricule: 'NAU-0112', nom: 'Belomo Edwige', fonction: 'Assistante RH', equipe: 'Ressources Humaines', grade: 'G3', manager: 'Théodore Bessala', statut: 'Actif', dateEntree: '10/05/2022', initiales: 'BE', couleur: '#0d9488' },
  { matricule: 'NAU-0125', nom: 'Essogo Erine', fonction: 'Comptable', equipe: 'Ressources Humaines', grade: 'G3', manager: 'Théodore Bessala', statut: 'Actif', dateEntree: '10/05/2022', initiales: 'EE', couleur: '#4338ca' },
  { matricule: 'NAU-0140', nom: 'Herman Tsaffock', fonction: 'Maintenancier & Réseau', equipe: 'Ressources Humaines', grade: 'G3', manager: 'Théodore Bessala', statut: 'Actif', dateEntree: '15/08/2022', initiales: 'HT', couleur: '#dc2626' },
  { matricule: 'NAU-0167', nom: 'Mbarga Thibaut', fonction: 'Agent de liaison', equipe: 'Ressources Humaines', grade: 'G2', manager: 'Théodore Bessala', statut: 'Actif', dateEntree: '03/01/2023', initiales: 'MT', couleur: '#6b7280' },
  { matricule: 'NAU-0189', nom: 'Ekouma Julienne', fonction: 'Assistante Comptable', equipe: 'Trésorerie', grade: 'G3', manager: '—', statut: 'Actif', dateEntree: '18/04/2023', initiales: 'EJ', couleur: '#16a34a' },
]

const KPIS = [
  { icon: Users, tone: 'purple', label: 'Total employés', value: '85', sub: 'Actifs : 82  ·  Inactifs : 3' },
  { icon: Users2, tone: 'blue', label: 'Équipes', value: '12', sub: 'Actives : 11  ·  Inactives : 1' },
  { icon: UserCheck, tone: 'orange', label: 'Managers', value: '18', sub: '21,2% de l’effectif' },
  { icon: BarChart3, tone: 'green', label: 'Employés par grade', value: '6', sub: 'Grades définis' },
  { icon: UserPlus, tone: 'pink', label: 'Nouvelles recrues', value: '5', sub: 'Ce mois-ci' },
]

const REPARTITION_EQUIPE = [
  { label: 'Pilotage & Contrôle', value: 22, pct: '25,9%', color: '#6b46c1' },
  { label: 'Ressources Humaines', value: 18, pct: '21,2%', color: '#3b82f6' },
  { label: 'Trésorerie', value: 12, pct: '14,1%', color: '#16a34a' },
  { label: 'Back Office', value: 10, pct: '11,8%', color: '#f59e0b' },
  { label: 'Direction Générale', value: 6, pct: '7,1%', color: '#dc2626' },
  { label: 'Autres', value: 17, pct: '20,0%', color: '#9ca3af' },
]

const REPARTITION_GRADE = [
  { label: 'G6 - Direction', value: 2, pct: 2.4 },
  { label: 'G5 - Cadre supérieur', value: 9, pct: 10.6 },
  { label: 'G4 - Cadre confirmé', value: 18, pct: 21.2 },
  { label: 'G3 - Cadre intermédiaire', value: 32, pct: 37.6 },
  { label: 'G2 - Agent de maîtrise', value: 16, pct: 18.8 },
  { label: 'G1 - Exécutant', value: 8, pct: 9.4 },
]

const STATUT_EMPLOYES = [
  { tone: 'green', label: 'Actifs', value: 82, pct: '96,5%' },
  { tone: 'orange', label: 'En congé', value: 2, pct: '2,4%' },
  { tone: 'red', label: 'Inactifs', value: 3, pct: '3,5%' },
]

function EquipeDonut() {
  const total = REPARTITION_EQUIPE.reduce((sum, item) => sum + item.value, 0)
  const cx = 80, cy = 80, outer = 68, inner = 44
  const slices = REPARTITION_EQUIPE.reduce<{ label: string; color: string; path: string }[]>((acc, item) => {
    const from = acc.length > 0 ? REPARTITION_EQUIPE.slice(0, acc.length).reduce((sum, s) => sum + s.value, 0) / total : 0
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
    acc.push({ label: item.label, color: item.color, path: `M ${x1} ${y1} A ${outer} ${outer} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${inner} ${inner} 0 ${large} 0 ${xi1} ${yi1} Z` })
    return acc
  }, [])

  return (
    <div className="ge-donut-wrap">
      <svg viewBox="0 0 160 160" className="ge-donut-svg" role="img" aria-label="Répartition par équipe">
        {slices.map((slice) => <path key={slice.label} d={slice.path} fill={slice.color} />)}
        <text x={cx} y={cy - 4} textAnchor="middle" className="ge-donut-value">{total}</text>
        <text x={cx} y={cy + 13} textAnchor="middle" className="ge-donut-sub">Total</text>
      </svg>
      <ul className="ge-donut-legend">
        {REPARTITION_EQUIPE.map((item) => (
          <li key={item.label}><i style={{ background: item.color }} /><span>{item.label}</span><b>{item.value} ({item.pct})</b></li>
        ))}
      </ul>
    </div>
  )
}

export default function GestionEquipesPage({ navigateTo }: { navigateTo: (page: string) => void }) {
  const [search, setSearch] = useState('')

  return (
    <section className="ge-page">
      <div className="ge-header-row">
        <nav className="ge-subtabs">
          <button className="active" onClick={() => navigateTo('gestion')}><Users size={14} />Employés</button>
          <button onClick={() => navigateTo('gestion-equipes')}><Users2 size={14} />Équipes</button>
          <button onClick={() => navigateTo('gestion-grades')}><BarChart3 size={14} />Grades et échelons</button>
          <button onClick={() => navigateTo('gestion-organigramme')}><Network size={14} />Organigramme</button>
        </nav>
        <button type="button" className="ge-btn-outline" onClick={() => navigateTo('gestion-organigramme')}>
          <Network size={14} />Voir l’organigramme
        </button>
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
        <label>Équipe<select defaultValue="Toutes"><option>Toutes les équipes</option></select></label>
        <label>Grade<select defaultValue="Tous"><option>Tous les grades</option></select></label>
        <label>Statut<select defaultValue="Tous"><option>Tous les statuts</option></select></label>
        <label>Type de contrat<select defaultValue="Tous"><option>Tous les types</option></select></label>
        <label>Manager<select defaultValue="Tous"><option>Tous les managers</option></select></label>
        <label className="ge-search">
          <Search size={14} />
          <input placeholder="Rechercher un employé (nom, matricule, email...)" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <button type="button" className="ge-reset" onClick={() => setSearch('')}><RotateCcw size={14} />Réinitialiser</button>
        <button type="button" className="ge-btn-primary"><Filter size={14} />Filtrer</button>
      </div>

      <div className="ge-main">
        <div className="ge-table-panel">
          <div className="ge-table-head"><h3>Liste des employés</h3></div>
          <div className="ge-table-wrap">
            <table className="ge-table">
              <thead>
                <tr>
                  <th>Matricule</th><th>Employé</th><th>Équipe</th><th>Grade</th><th>Fonction</th>
                  <th>Manager</th><th>Statut</th><th>Date d’entrée</th><th></th>
                </tr>
              </thead>
              <tbody>
                {EMPLOYES.map((employe) => (
                  <tr key={employe.matricule}>
                    <td className="ge-code">{employe.matricule}</td>
                    <td>
                      <div className="ge-employe-cell">
                        <span className="ge-avatar" style={{ background: employe.couleur }}>{employe.initiales}</span>
                        <div>
                          <strong>{employe.nom}</strong>
                          <small>{employe.fonction}</small>
                        </div>
                      </div>
                    </td>
                    <td>{employe.equipe}</td>
                    <td><span className="ge-grade-pill">{employe.grade}</span></td>
                    <td>{employe.fonction}</td>
                    <td>{employe.manager}</td>
                    <td><span className="ge-pill ge-pill-actif">{employe.statut}</span></td>
                    <td>{employe.dateEntree}</td>
                    <td><button type="button" className="ge-row-action" aria-label="Actions"><MoreVertical size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="ge-table-foot">
            <span>Affichage de 1 à {EMPLOYES.length} sur 85 employés</span>
            <nav className="ge-pagination" aria-label="Pagination">
              <button type="button" disabled><ChevronLeft size={14} /></button>
              <button type="button" className="is-active">1</button>
              <button type="button">2</button>
              <button type="button">3</button>
              <button type="button">4</button>
              <button type="button">5</button>
              <button type="button"><ChevronRight size={14} /></button>
            </nav>
            <label className="ge-page-size">
              <select defaultValue="10"><option>10</option><option>25</option><option>50</option></select>
            </label>
          </div>
        </div>

        <aside className="ge-side">
          <div className="ge-panel">
            <h3>Répartition par équipe</h3>
            <EquipeDonut />
          </div>

          <div className="ge-panel">
            <h3>Répartition par grade</h3>
            <ul className="ge-grade-list">
              {REPARTITION_GRADE.map((item) => (
                <li key={item.label}>
                  <div className="ge-grade-row-head">
                    <span>{item.label}</span>
                    <b>{item.value} ({item.pct.toString().replace('.', ',')}%)</b>
                  </div>
                  <div className="ge-grade-bar"><span style={{ width: `${item.pct}%` }} /></div>
                </li>
              ))}
            </ul>
          </div>

          <div className="ge-panel">
            <h3>Statut des employés</h3>
            <div className="ge-statut-cards">
              {STATUT_EMPLOYES.map((item) => (
                <article key={item.label} className={`ge-statut-card ge-statut-${item.tone}`}>
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                  <small>{item.pct}</small>
                </article>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}
