import { useEffect, useMemo, useState } from 'react'
import {
  Calendar, ClipboardList, Clock, Clock3, Info, Star, User, UserCheck, UserX, Users,
} from 'lucide-react'
import { fetchTaskAssignments, type TaskAssignment } from '../api/taskAssignments'
import { fetchEmployees, fetchTeams, type Employee, type Team } from '../api/employees'
import { ApiError } from '../api/client'
import DatePicker from '../components/DatePicker'
import './PerformanceStaffingPage.css'

const errorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    const payload = error.payload as Record<string, unknown> | null
    if (payload && typeof payload === 'object') {
      const firstValue = Object.values(payload)[0]
      if (typeof firstValue === 'string') return firstValue
      if (Array.isArray(firstValue) && typeof firstValue[0] === 'string') return firstValue[0]
    }
    return 'La requête a échoué.'
  }
  return 'Impossible de contacter le serveur.'
}

type Tab = 'ehs' | 'temps' | 'notes'

const TABS: { key: Tab; label: string }[] = [
  { key: 'ehs', label: 'EHS & Staffing' },
  { key: 'temps', label: 'Temps (heures)' },
  { key: 'notes', label: 'Notes & Performance' },
]

const SUBTITLES: Record<Tab, string> = {
  ehs: 'Suivez la performance de vos équipes et la mobilisation des ressources.',
  temps: 'Suivez la performance de vos équipes et la mobilisation des ressources.',
  notes: 'Suivez la performance de vos équipes et la qualité des réalisations.',
}

const nomComplet = (p: { first_name: string; last_name: string }) => `${p.first_name} ${p.last_name}`
const fmtHeures = (h: number) => `${h.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} h`
const fmtEhs = (v: number) => v.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
const fmtPct = (v: number) => `${v.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`
const fmtNote = (v: number) => v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const mondayOf = (iso: string) => {
  const d = new Date(iso)
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7))
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
}
const fmtSemaine = (mondayIso: string) => {
  const monday = new Date(`${mondayIso}T00:00:00`)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const f = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
  return `${f(monday)} → ${f(sunday)}/${sunday.getFullYear()}`
}

export default function PerformanceStaffingPage({ navigateTo }: { navigateTo: (page: string) => void }) {
  const [assignments, setAssignments] = useState<TaskAssignment[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<Tab>('ehs')
  const [filterProjet, setFilterProjet] = useState('Tous')
  const [filterEquipe, setFilterEquipe] = useState('Toutes')
  const [filterManager, setFilterManager] = useState('Tous')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchTaskAssignments(), fetchEmployees(), fetchTeams()])
      .then(([assignmentsData, employeesData, teamsData]) => {
        if (cancelled) return
        setAssignments(assignmentsData)
        setEmployees(employeesData)
        setTeams(teamsData)
      })
      .catch((err) => { if (!cancelled) setLoadError(errorMessage(err)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const managerByEquipeCode = useMemo(() => {
    const map = new Map<string, string>()
    for (const team of teams) if (team.manager) map.set(team.code, nomComplet(team.manager))
    return map
  }, [teams])

  const projets = useMemo(
    () => Array.from(new Set(assignments.map((a) => a.project_nom).filter((p): p is string => !!p))).sort(),
    [assignments],
  )
  const equipes = useMemo(() => Array.from(new Set(assignments.map((a) => a.equipe_nom))).sort(), [assignments])
  const managers = useMemo(
    () => Array.from(new Set(teams.filter((t) => t.manager).map((t) => nomComplet(t.manager as NonNullable<Team['manager']>)))).sort(),
    [teams],
  )

  const filtered = useMemo(() => assignments.filter((a) => (
    (filterProjet === 'Tous' || a.project_nom === filterProjet)
    && (filterEquipe === 'Toutes' || a.equipe_nom === filterEquipe)
    && (filterManager === 'Tous' || managerByEquipeCode.get(a.equipe_code) === filterManager)
    && (!dateDebut || a.created_at.slice(0, 10) >= dateDebut)
    && (!dateFin || a.created_at.slice(0, 10) <= dateFin)
  )), [assignments, filterProjet, filterEquipe, filterManager, dateDebut, dateFin, managerByEquipeCode])

  // ---------------- EHS & Staffing ----------------
  const totalEhs = useMemo(() => filtered.reduce((s, a) => s + a.ehs_consomme, 0), [filtered])
  const staffedUserIds = useMemo(() => new Set(filtered.map((a) => a.user)), [filtered])
  const nonStaffes = useMemo(
    () => employees.filter((e) => e.is_active && !staffedUserIds.has(e.id)),
    [employees, staffedUserIds],
  )

  const ehsParEquipe = useMemo(() => {
    const map = new Map<string, number>()
    for (const a of filtered) map.set(a.equipe_nom, (map.get(a.equipe_nom) ?? 0) + a.ehs_consomme)
    return Array.from(map.entries())
      .map(([equipe, ehs]) => ({ equipe, ehs, pct: totalEhs > 0 ? (ehs / totalEhs) * 100 : 0 }))
      .sort((a, b) => b.ehs - a.ehs)
  }, [filtered, totalEhs])

  const ehsParEmploye = useMemo(() => {
    const map = new Map<string, { nom: string; equipe: string; ehs: number }>()
    for (const a of filtered) {
      const cur = map.get(a.user_nom) ?? { nom: a.user_nom, equipe: a.equipe_code, ehs: 0 }
      cur.ehs += a.ehs_consomme
      map.set(a.user_nom, cur)
    }
    return Array.from(map.values()).sort((a, b) => b.ehs - a.ehs).slice(0, 5)
  }, [filtered])

  const statutRepartition = useMemo(() => {
    const map = new Map<string, number>()
    for (const a of filtered) map.set(a.execution_statut_display, (map.get(a.execution_statut_display) ?? 0) + 1)
    return Array.from(map.entries()).map(([statut, nb]) => ({ statut, nb, pct: filtered.length > 0 ? (nb / filtered.length) * 100 : 0 }))
  }, [filtered])

  const staffingsParManager = useMemo(() => {
    const map = new Map<string, { nom: string; nb: number; employes: Set<number> }>()
    for (const a of filtered) {
      const nom = managerByEquipeCode.get(a.equipe_code) ?? 'Non assigné'
      const cur = map.get(nom) ?? { nom, nb: 0, employes: new Set<number>() }
      cur.nb += 1
      cur.employes.add(a.user)
      map.set(nom, cur)
    }
    return Array.from(map.values()).map((v) => ({ nom: v.nom, nb: v.nb, employes: v.employes.size })).sort((a, b) => b.nb - a.nb)
  }, [filtered, managerByEquipeCode])

  const staffingsParEmploye = useMemo(() => {
    const map = new Map<string, { nom: string; equipe: string; nb: number }>()
    for (const a of filtered) {
      const cur = map.get(a.user_nom) ?? { nom: a.user_nom, equipe: a.equipe_code, nb: 0 }
      cur.nb += 1
      map.set(a.user_nom, cur)
    }
    return Array.from(map.values()).sort((a, b) => b.nb - a.nb).slice(0, 5)
  }, [filtered])

  const equipeTopEhs = ehsParEquipe[0] ?? null

  // ---------------- Temps (heures) ----------------
  const heuresTravailleesTotal = useMemo(() => filtered.reduce((s, a) => s + a.temps_travaille_secondes / 3600, 0), [filtered])
  const heuresAlloueesTotal = useMemo(() => filtered.reduce((s, a) => s + a.heures, 0), [filtered])
  const tauxRealisation = heuresAlloueesTotal > 0 ? (heuresTravailleesTotal / heuresAlloueesTotal) * 100 : 0
  const moyenneHeuresParPersonne = staffedUserIds.size > 0 ? heuresTravailleesTotal / staffedUserIds.size : 0

  const heuresParEquipe = useMemo(() => {
    const map = new Map<string, number>()
    for (const a of filtered) map.set(a.equipe_nom, (map.get(a.equipe_nom) ?? 0) + a.temps_travaille_secondes / 3600)
    return Array.from(map.entries())
      .map(([equipe, heures]) => ({ equipe, heures, pct: heuresTravailleesTotal > 0 ? (heures / heuresTravailleesTotal) * 100 : 0 }))
      .sort((a, b) => b.heures - a.heures)
  }, [filtered, heuresTravailleesTotal])

  const heuresParProjet = useMemo(() => {
    const map = new Map<string, number>()
    for (const a of filtered) {
      const projet = a.project_nom ?? 'Transversale'
      map.set(projet, (map.get(projet) ?? 0) + a.temps_travaille_secondes / 3600)
    }
    return Array.from(map.entries())
      .map(([projet, heures]) => ({ projet, heures, pct: heuresTravailleesTotal > 0 ? (heures / heuresTravailleesTotal) * 100 : 0 }))
      .sort((a, b) => b.heures - a.heures)
  }, [filtered, heuresTravailleesTotal])

  const evolutionParSemaine = useMemo(() => {
    const map = new Map<string, { staffings: number; heuresAllouees: number }>()
    for (const a of filtered) {
      const semaine = mondayOf(a.created_at)
      const cur = map.get(semaine) ?? { staffings: 0, heuresAllouees: 0 }
      cur.staffings += 1
      cur.heuresAllouees += a.heures
      map.set(semaine, cur)
    }
    return Array.from(map.entries())
      .map(([semaine, v]) => ({ semaine, ...v }))
      .sort((a, b) => b.semaine.localeCompare(a.semaine))
      .slice(0, 6)
  }, [filtered])

  const employesSousMoyenne = useMemo(() => {
    const map = new Map<number, { nom: string; equipe: string; heures: number }>()
    for (const a of filtered) {
      const cur = map.get(a.user) ?? { nom: a.user_nom, equipe: `${a.equipe_code} — ${a.equipe_nom}`, heures: 0 }
      cur.heures += a.temps_travaille_secondes / 3600
      map.set(a.user, cur)
    }
    return Array.from(map.values())
      .filter((x) => x.heures < moyenneHeuresParPersonne)
      .sort((a, b) => a.heures - b.heures)
  }, [filtered, moyenneHeuresParPersonne])

  // ---------------- Notes & Performance ----------------
  const rated = useMemo(() => filtered.filter((a) => a.note !== null), [filtered])
  const noteMoyenneGlobale = rated.length > 0 ? rated.reduce((s, a) => s + (a.note ?? 0), 0) / rated.length : null

  const noteParEquipe = useMemo(() => {
    const map = new Map<string, { total: number; nb: number }>()
    for (const a of rated) {
      const cur = map.get(a.equipe_nom) ?? { total: 0, nb: 0 }
      cur.total += a.note ?? 0
      cur.nb += 1
      map.set(a.equipe_nom, cur)
    }
    return Array.from(map.entries()).map(([equipe, v]) => ({ equipe, note: v.total / v.nb, nb: v.nb })).sort((a, b) => b.note - a.note)
  }, [rated])

  const noteParEmploye = useMemo(() => {
    const map = new Map<string, { equipe: string; total: number; nb: number }>()
    for (const a of rated) {
      const cur = map.get(a.user_nom) ?? { equipe: a.equipe_code, total: 0, nb: 0 }
      cur.total += a.note ?? 0
      cur.nb += 1
      map.set(a.user_nom, cur)
    }
    return Array.from(map.entries()).map(([nom, v]) => ({ nom, equipe: v.equipe, note: v.total / v.nb, nb: v.nb })).sort((a, b) => b.note - a.note)
  }, [rated])

  const noteParManager = useMemo(() => {
    const map = new Map<string, { total: number; nb: number }>()
    for (const a of rated) {
      const nom = a.notee_par_nom ?? '—'
      const cur = map.get(nom) ?? { total: 0, nb: 0 }
      cur.total += a.note ?? 0
      cur.nb += 1
      map.set(nom, cur)
    }
    return Array.from(map.entries()).map(([nom, v]) => ({ nom, note: v.total / v.nb, nb: v.nb })).sort((a, b) => b.note - a.note)
  }, [rated])

  const equipeTopNote = noteParEquipe[0] ?? null
  const employeTopNote = noteParEmploye[0] ?? null

  const KPIS_EHS = [
    { icon: Users, tone: 'indigo', label: 'EHS consommés (total)', value: `${fmtEhs(totalEhs)} EHS`, sub: `${filtered.length} staffing(s)` },
    {
      icon: Users, tone: 'orange', label: "Équipe la plus consommatrice d'EHS",
      value: equipeTopEhs?.equipe ?? '—',
      sub: equipeTopEhs ? `${fmtEhs(equipeTopEhs.ehs)} EHS (${fmtPct(equipeTopEhs.pct)})` : 'Aucune donnée',
    },
    { icon: ClipboardList, tone: 'blue', label: 'Nombre total de staffings', value: String(filtered.length), sub: 'staffings' },
    { icon: UserCheck, tone: 'green', label: 'Personnes staffées', value: String(staffedUserIds.size), sub: 'personnes' },
    { icon: UserX, tone: 'red', label: 'Personnes non staffées', value: String(nonStaffes.length), sub: 'parmi les actifs' },
  ]

  const TEMPS_KPIS = [
    { icon: Clock, tone: 'indigo', label: 'Heures travaillées (total)', value: fmtHeures(heuresTravailleesTotal), sub: 'Sur la période sélectionnée' },
    { icon: Clock3, tone: 'blue', label: 'Heures allouées (total)', value: fmtHeures(heuresAlloueesTotal), sub: `Taux de réalisation : ${fmtPct(tauxRealisation)}` },
    { icon: User, tone: 'purple', label: "Moyenne d'heures travaillées / personne", value: fmtHeures(moyenneHeuresParPersonne), sub: 'Parmi les personnes staffées' },
    { icon: Calendar, tone: 'indigo', label: 'Équivalent jours travaillés (8h)', value: (heuresTravailleesTotal / 8).toLocaleString('fr-FR', { maximumFractionDigits: 1 }), sub: 'Jours' },
  ]

  const NOTES_KPIS = [
    { icon: Star, tone: 'indigo', label: 'Note moyenne globale', value: noteMoyenneGlobale !== null ? `${fmtNote(noteMoyenneGlobale)} / 5` : '—', sub: 'Sur la période sélectionnée' },
    { icon: Users, tone: 'green', label: 'Équipe la mieux notée', value: equipeTopNote?.equipe ?? '—', value2: equipeTopNote ? `${fmtNote(equipeTopNote.note)} / 5` : undefined, sub: 'Note moyenne' },
    { icon: User, tone: 'purple', label: 'Employé le mieux noté', value: employeTopNote?.nom ?? '—', value2: employeTopNote ? `${fmtNote(employeTopNote.note)} / 5` : undefined, sub: 'Note moyenne' },
    { icon: ClipboardList, tone: 'orange', label: 'Tâches évaluées', value: String(rated.length), sub: `Sur ${filtered.length} staffing(s)` },
  ]

  return (
    <section className="pfs-page">
      <div className="pfs-title-row">
        <div>
          <h1>Performance & Staffing</h1>
          <p>{SUBTITLES[activeTab]}</p>
          <button type="button" className="pfs-link-btn" onClick={() => navigateTo('pilotage')}>Voir le pilotage des projets</button>
        </div>
        <div className="pfs-toolbar">
          <DatePicker label="Staffé à partir du" value={dateDebut} onChange={setDateDebut} />
          <DatePicker label="Jusqu'au" value={dateFin} min={dateDebut || undefined} onChange={setDateFin} />
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
          <label>Manager
            <select value={filterManager} onChange={(e) => setFilterManager(e.target.value)}>
              <option>Tous</option>
              {managers.map((m) => <option key={m}>{m}</option>)}
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

      {loading && <p className="ge-detail-empty">Chargement…</p>}
      {loadError && <p className="ge-detail-empty">{loadError}</p>}

      {!loading && !loadError && (
        <>
          {activeTab === 'ehs' ? (
            <>
              <div className="pfs-kpis">
                {KPIS_EHS.map((kpi) => (
                  <article key={kpi.label} className={`pfs-kpi pfs-kpi-${kpi.tone}`}>
                    <span className="pfs-kpi-icon"><kpi.icon size={18} /></span>
                    <div>
                      <span className="pfs-kpi-label">{kpi.label}</span>
                      <strong className={kpi.value.length > 14 ? 'pfs-kpi-value-name' : undefined}>{kpi.value}</strong>
                      <small>{kpi.sub}</small>
                    </div>
                  </article>
                ))}
              </div>

              <div className="pfs-grid pfs-grid-3">
                <section className="pfs-panel">
                  <h3>Consommation d'EHS par équipe</h3>
                  {ehsParEquipe.length === 0 ? <p className="pfs-empty">Aucun staffing sur la période.</p> : (
                    <table className="pfs-table">
                      <thead><tr><th>Équipe</th><th>EHS consommés</th><th>% du total</th></tr></thead>
                      <tbody>
                        {ehsParEquipe.map((row) => (
                          <tr key={row.equipe}><td>{row.equipe}</td><td>{fmtEhs(row.ehs)}</td><td>{fmtPct(row.pct)}</td></tr>
                        ))}
                      </tbody>
                      <tfoot><tr><td>TOTAL</td><td>{fmtEhs(totalEhs)}</td><td>100,0 %</td></tr></tfoot>
                    </table>
                  )}
                </section>

                <section className="pfs-panel">
                  <h3>Consommation d'EHS par employé (Top 5)</h3>
                  {ehsParEmploye.length === 0 ? <p className="pfs-empty">Aucun staffing sur la période.</p> : (
                    <table className="pfs-table">
                      <thead><tr><th>Employé</th><th>Équipe</th><th>EHS consommés</th></tr></thead>
                      <tbody>
                        {ehsParEmploye.map((row) => (
                          <tr key={row.nom}><td className="pfs-name">{row.nom}</td><td>{row.equipe}</td><td>{fmtEhs(row.ehs)}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </section>

                <section className="pfs-panel">
                  <h3>Répartition par statut d'exécution</h3>
                  {statutRepartition.length === 0 ? <p className="pfs-empty">Aucun staffing sur la période.</p> : (
                    <table className="pfs-table">
                      <thead><tr><th>Statut</th><th>Nombre</th><th>%</th></tr></thead>
                      <tbody>
                        {statutRepartition.map((row) => (
                          <tr key={row.statut}><td>{row.statut}</td><td>{row.nb}</td><td>{fmtPct(row.pct)}</td></tr>
                        ))}
                      </tbody>
                      <tfoot><tr><td>TOTAL</td><td>{filtered.length}</td><td>100,0 %</td></tr></tfoot>
                    </table>
                  )}
                </section>
              </div>

              <div className="pfs-grid pfs-grid-3">
                <section className="pfs-panel">
                  <h3>Nombre de staffings par manager</h3>
                  {staffingsParManager.length === 0 ? <p className="pfs-empty">Aucun staffing sur la période.</p> : (
                    <table className="pfs-table">
                      <thead><tr><th>Manager</th><th>Staffings</th><th>Employés distincts</th></tr></thead>
                      <tbody>
                        {staffingsParManager.map((row) => (
                          <tr key={row.nom}><td className="pfs-name">{row.nom}</td><td>{row.nb}</td><td>{row.employes}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </section>

                <section className="pfs-panel">
                  <h3>Nombre de staffings par employé (Top 5)</h3>
                  {staffingsParEmploye.length === 0 ? <p className="pfs-empty">Aucun staffing sur la période.</p> : (
                    <table className="pfs-table">
                      <thead><tr><th>Employé</th><th>Staffings</th></tr></thead>
                      <tbody>
                        {staffingsParEmploye.map((row) => (
                          <tr key={row.nom}><td className="pfs-name">{row.nom}</td><td>{row.nb}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </section>

                <section className="pfs-panel">
                  <h3>Personnel non staffé</h3>
                  {nonStaffes.length === 0 ? <p className="pfs-empty">Tous les employés actifs ont au moins un staffing.</p> : (
                    <table className="pfs-table">
                      <thead><tr><th>Employé</th><th>Équipe</th><th>Fonction</th></tr></thead>
                      <tbody>
                        {nonStaffes.map((e) => (
                          <tr key={e.id}>
                            <td className="pfs-name">{nomComplet(e)}</td>
                            <td>{e.team ? `${e.team.code} — ${e.team.name}` : '—'}</td>
                            <td>{e.fonction || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot><tr><td>TOTAL</td><td colSpan={2}>{nonStaffes.length}</td></tr></tfoot>
                    </table>
                  )}
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
                  <h3>Heures travaillées par équipe</h3>
                  {heuresParEquipe.length === 0 ? <p className="pfs-empty">Aucune heure travaillée sur la période.</p> : (
                    <table className="pfs-table">
                      <thead><tr><th>#</th><th>Équipe</th><th>Heures</th><th>% du total</th></tr></thead>
                      <tbody>
                        {heuresParEquipe.map((row, index) => (
                          <tr key={row.equipe}><td>{index + 1}</td><td>{row.equipe}</td><td>{fmtHeures(row.heures)}</td><td>{fmtPct(row.pct)}</td></tr>
                        ))}
                      </tbody>
                      <tfoot><tr><td colSpan={2}>TOTAL</td><td>{fmtHeures(heuresTravailleesTotal)}</td><td>100,0 %</td></tr></tfoot>
                    </table>
                  )}
                </section>

                <section className="pfs-panel">
                  <h3>Heures travaillées par projet</h3>
                  {heuresParProjet.length === 0 ? <p className="pfs-empty">Aucune heure travaillée sur la période.</p> : (
                    <table className="pfs-table">
                      <thead><tr><th>#</th><th>Projet</th><th>Heures</th><th>% du total</th></tr></thead>
                      <tbody>
                        {heuresParProjet.map((row, index) => (
                          <tr key={row.projet}><td>{index + 1}</td><td>{row.projet}</td><td>{fmtHeures(row.heures)}</td><td>{fmtPct(row.pct)}</td></tr>
                        ))}
                      </tbody>
                      <tfoot><tr><td colSpan={2}>TOTAL</td><td>{fmtHeures(heuresTravailleesTotal)}</td><td>100,0 %</td></tr></tfoot>
                    </table>
                  )}
                </section>

                <section className="pfs-panel">
                  <h3>Évolution du staffing par semaine</h3>
                  {evolutionParSemaine.length === 0 ? <p className="pfs-empty">Aucun staffing sur la période.</p> : (
                    <table className="pfs-table">
                      <thead><tr><th>Semaine</th><th>Staffings</th><th>Heures allouées</th></tr></thead>
                      <tbody>
                        {evolutionParSemaine.map((row) => (
                          <tr key={row.semaine}><td>{fmtSemaine(row.semaine)}</td><td>{row.staffings}</td><td>{fmtHeures(row.heuresAllouees)}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </section>
              </div>

              <section className="pfs-panel">
                <h3>Employés sous la moyenne d'heures travaillées ({fmtHeures(moyenneHeuresParPersonne)})</h3>
                {employesSousMoyenne.length === 0 ? <p className="pfs-empty">Personne sous la moyenne sur la période.</p> : (
                  <table className="pfs-table">
                    <thead><tr><th>#</th><th>Employé</th><th>Équipe</th><th>Heures travaillées</th><th>Écart vs moyenne</th><th>Statut</th></tr></thead>
                    <tbody>
                      {employesSousMoyenne.map((row, index) => (
                        <tr key={row.nom}>
                          <td>{index + 1}</td>
                          <td className="pfs-name">{row.nom}</td>
                          <td>{row.equipe}</td>
                          <td>{fmtHeures(row.heures)}</td>
                          <td>{fmtHeures(row.heures - moyenneHeuresParPersonne)}</td>
                          <td><span className="pfs-statut pfs-statut-orange">Sous la moyenne</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
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
                      {kpi.value2 && <strong className="pfs-kpi-value2 tone-green">{kpi.value2}</strong>}
                      <small>{kpi.sub}</small>
                    </div>
                  </article>
                ))}
              </div>

              {rated.length === 0 ? (
                <p className="pfs-empty">Aucune tâche notée pour le moment — notez un staffing terminé depuis Suivi des staffings.</p>
              ) : (
                <div className="pfs-grid pfs-grid-3">
                  <section className="pfs-panel">
                    <h3>Note moyenne par équipe <span className="pfs-h3-sub">(classement décroissant)</span></h3>
                    <table className="pfs-table">
                      <thead><tr><th>#</th><th>Équipe</th><th>Note (/5)</th><th>Tâches évaluées</th></tr></thead>
                      <tbody>
                        {noteParEquipe.map((row, index) => (
                          <tr key={row.equipe}><td>{index + 1}</td><td>{row.equipe}</td><td>{fmtNote(row.note)}</td><td>{row.nb}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </section>

                  <section className="pfs-panel">
                    <h3>Note moyenne par employé <span className="pfs-h3-sub">(classement décroissant)</span></h3>
                    <table className="pfs-table">
                      <thead><tr><th>#</th><th>Employé</th><th>Équipe</th><th>Note (/5)</th><th>Tâches évaluées</th></tr></thead>
                      <tbody>
                        {noteParEmploye.map((row, index) => (
                          <tr key={row.nom}><td>{index + 1}</td><td className="pfs-name">{row.nom}</td><td>{row.equipe}</td><td>{fmtNote(row.note)}</td><td>{row.nb}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </section>

                  <section className="pfs-panel">
                    <h3>Note moyenne donnée par manager <span className="pfs-h3-sub">(classement décroissant)</span></h3>
                    <table className="pfs-table">
                      <thead><tr><th>#</th><th>Manager</th><th>Note donnée (/5)</th><th>Tâches évaluées</th></tr></thead>
                      <tbody>
                        {noteParManager.map((row, index) => (
                          <tr key={row.nom}><td>{index + 1}</td><td className="pfs-name">{row.nom}</td><td>{fmtNote(row.note)}</td><td>{row.nb}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </section>
                </div>
              )}
            </>
          )}

          {activeTab === 'ehs' ? (
            <div className="pfs-info-banner">
              <Info size={14} />
              <span>Les données sont calculées en direct sur les staffings réels de l'organisation, selon la période et les filtres appliqués.</span>
            </div>
          ) : activeTab === 'temps' ? (
            <div className="pfs-info-banner pfs-info-banner-stack">
              <Info size={14} />
              <div>
                <p>Les heures travaillées correspondent au temps réellement enregistré via Exécuté staffing (démarrer/pause/reprendre/terminer).</p>
                <p>Les heures allouées sont celles attribuées à chaque personne au moment du staffing.</p>
              </div>
            </div>
          ) : (
            <div className="pfs-info-banner pfs-info-banner-stack">
              <Info size={14} />
              <div>
                <p>Les notes sont attribuées par le manager depuis Suivi des staffings, une fois la tâche terminée.</p>
                <p>La note moyenne globale est pondérée sur le nombre de tâches évaluées.</p>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}
