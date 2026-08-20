import { type Dispatch, type SetStateAction, useMemo, useState } from 'react'
import {
  Activity, Calendar, CheckCircle2, Clock3, Hourglass, Info, RotateCcw, Search,
  SlidersHorizontal, UserCheck,
} from 'lucide-react'
import {
  type AffectationStatut, type TacheWrike,
  STATUT_AFFECTATION_CLASS, STATUT_AFFECTATION_LABEL, fmtHeures, initiales,
} from '../data/staffing'
import './SuiviStaffingPage.css'

interface StaffingRow {
  tache: TacheWrike
  affectationId: string
  collaborateur: string
  collaborateurProfil: string
  heures: number
  staffeLe: string
  statut: AffectationStatut
}

interface SuiviStaffingPageProps {
  navigateTo: (page: string) => void
  taches: TacheWrike[]
  setTaches: Dispatch<SetStateAction<TacheWrike[]>>
}

export default function SuiviStaffingPage({ navigateTo, taches, setTaches }: SuiviStaffingPageProps) {
  const [filterProjet, setFilterProjet] = useState('Tous')
  const [filterCollaborateur, setFilterCollaborateur] = useState('Tous')
  const [filterStatut, setFilterStatut] = useState('Tous')
  const [search, setSearch] = useState('')

  const rows: StaffingRow[] = useMemo(() => taches.flatMap((tache) => tache.affectations.map((affectation) => ({
    tache,
    affectationId: affectation.id,
    collaborateur: affectation.collaborateur,
    collaborateurProfil: affectation.collaborateurProfil,
    heures: affectation.heures,
    staffeLe: affectation.staffeLe,
    statut: affectation.statut,
  }))), [taches])

  const projets = useMemo(() => Array.from(new Set(rows.map((r) => r.tache.projet))), [rows])
  const collaborateurs = useMemo(() => Array.from(new Set(rows.map((r) => r.collaborateur))), [rows])

  const filtered = rows.filter((r) => (
    (filterProjet === 'Tous' || r.tache.projet === filterProjet)
    && (filterCollaborateur === 'Tous' || r.collaborateur === filterCollaborateur)
    && (filterStatut === 'Tous' || STATUT_AFFECTATION_LABEL[r.statut] === filterStatut)
    && (search.trim() === '' || `${r.tache.id} ${r.tache.tache} ${r.collaborateur}`.toLowerCase().includes(search.trim().toLowerCase()))
  ))

  const resetFiltres = () => {
    setFilterProjet('Tous'); setFilterCollaborateur('Tous'); setFilterStatut('Tous'); setSearch('')
  }

  const updateStatut = (tacheId: string, affectationId: string, statut: AffectationStatut) => {
    setTaches((list) => list.map((t) => t.id === tacheId
      ? { ...t, affectations: t.affectations.map((a) => a.id === affectationId ? { ...a, statut } : a) }
      : t))
  }

  const countEnAttente = rows.filter((r) => r.statut === 'en-attente').length
  const countEnCours = rows.filter((r) => r.statut === 'en-cours').length
  const countTermine = rows.filter((r) => r.statut === 'termine').length

  const KPIS = [
    { icon: Activity, tone: 'indigo', label: 'Staffings réalisés', value: String(rows.length), sub: 'Toutes affectations confondues' },
    { icon: Hourglass, tone: 'orange', label: 'En attente', value: String(countEnAttente), sub: "Pas encore démarrés" },
    { icon: Clock3, tone: 'blue', label: 'En cours', value: String(countEnCours), sub: "Staffings en cours d'exécution" },
    { icon: CheckCircle2, tone: 'green', label: 'Terminés', value: String(countTermine), sub: 'Staffings clôturés' },
  ]

  return (
    <section className="su-page">
      <nav className="su-subtabs">
        <button onClick={() => navigateTo('staffing')}><UserCheck size={14} />Nouveau staffing</button>
        <button className="active" onClick={() => navigateTo('staffing-suivi')}><Activity size={14} />Suivi des staffings</button>
      </nav>

      <div className="su-title-row">
        <div>
          <h1>Suivi des staffings <Info size={15} className="su-title-info" /></h1>
          <p>Suivez l'évolution de chaque staffing réalisé et faites évoluer son statut.</p>
        </div>
      </div>

      <div className="su-toolbar">
        <button type="button" className="su-daterange"><Calendar size={14} />01/05/2025 → 31/12/2025</button>
        <button type="button" className="su-btn-outline"><SlidersHorizontal size={14} />Filtres avancés</button>
      </div>

      <div className="su-kpis">
        {KPIS.map((kpi) => (
          <article key={kpi.label} className={`su-kpi su-kpi-${kpi.tone}`}>
            <span className="su-kpi-icon"><kpi.icon size={17} /></span>
            <div>
              <span className="su-kpi-label">{kpi.label}</span>
              <strong>{kpi.value}</strong>
              <small>{kpi.sub}</small>
            </div>
          </article>
        ))}
      </div>

      <div className="su-filters">
        <label>Projet
          <select value={filterProjet} onChange={(e) => setFilterProjet(e.target.value)}>
            <option>Tous</option>
            {projets.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <label>Collaborateur
          <select value={filterCollaborateur} onChange={(e) => setFilterCollaborateur(e.target.value)}>
            <option>Tous</option>
            {collaborateurs.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label>Statut
          <select value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)}>
            <option>Tous</option>
            {Object.values(STATUT_AFFECTATION_LABEL).map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="su-search">
          <Search size={14} />
          <input placeholder="Rechercher une tâche, un collaborateur..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <button type="button" className="su-reset" onClick={resetFiltres}><RotateCcw size={14} />Réinitialiser</button>
      </div>

      <div className="su-info-banner">
        <Info size={14} />
        <span>Chaque staffing démarre "En attente". Faites-le évoluer vers "En cours" puis "Terminé" au fil de son avancement.</span>
      </div>

      <section className="su-table-panel">
        <div className="su-table-head">
          <h3>Staffings <span className="su-count-badge">{filtered.length}</span></h3>
        </div>
        <div className="su-table-wrap">
          <table className="su-table">
            <thead>
              <tr>
                <th>Wrike</th><th>Tâche</th><th>Projet</th><th>Équipe</th><th>Collaborateur</th>
                <th>Heures</th><th>Staffé le</th><th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="su-empty">Aucun staffing ne correspond à ces filtres.</td></tr>
              )}
              {filtered.map((row) => (
                <tr key={row.affectationId}>
                  <td className="su-code">{row.tache.id}</td>
                  <td className="su-name">{row.tache.tache}</td>
                  <td>{row.tache.projet}</td>
                  <td>{row.tache.equipe}</td>
                  <td>
                    <span className="su-employee">
                      <span className="su-employee-dot">{initiales(row.collaborateur)}</span>
                      <span><strong>{row.collaborateur}</strong><small>{row.collaborateurProfil}</small></span>
                    </span>
                  </td>
                  <td>{fmtHeures(row.heures)} h</td>
                  <td>{row.staffeLe}</td>
                  <td>
                    <select
                      className={`su-statut-select su-statut-${STATUT_AFFECTATION_CLASS[row.statut]}`}
                      value={row.statut}
                      onChange={(e) => updateStatut(row.tache.id, row.affectationId, e.target.value as AffectationStatut)}
                    >
                      {(Object.keys(STATUT_AFFECTATION_LABEL) as AffectationStatut[]).map((statut) => (
                        <option key={statut} value={statut}>{STATUT_AFFECTATION_LABEL[statut]}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  )
}
