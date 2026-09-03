import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  AlertTriangle, CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList,
  Gauge, Lock, PauseCircle, PlayCircle, RotateCcw, Search,
} from 'lucide-react'
import { ColumnsMenu, useColumnVisibility, type ColumnDef } from '../components/ColumnsMenu'
import { fetchTaskAssignments, type TaskAssignment } from '../api/taskAssignments'
import { ApiError } from '../api/client'
import './ControleTachesPage.css'

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

type Statut = 'Non démarrée' | 'En cours' | 'En pause' | 'Terminée' | 'En retard'

const DAY_MS = 86_400_000
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

/** Nombre de jours entre aujourd'hui et l'échéance (positif = à venir, négatif = dépassée). */
function joursJusquEcheance(echeance: string): number {
  return Math.round((startOfDay(new Date(echeance)) - startOfDay(new Date())) / DAY_MS)
}

/** Statut affiché : dérivé de l'exécution réelle (TaskAssignment.execution_statut), sauf qu'une
 * tâche non terminée dont l'échéance est dépassée bascule sur « En retard » — les 5 valeurs
 * possibles forment une partition stricte (chaque tâche compte dans une seule et unique case),
 * pour que KPIs, donut et alertes restent toujours cohérents entre eux. */
function statutAffiche(a: TaskAssignment): Statut {
  if (a.execution_statut === 'terminee') return 'Terminée'
  if (a.echeance && joursJusquEcheance(a.echeance) < 0) return 'En retard'
  if (a.execution_statut === 'en_cours') return 'En cours'
  if (a.execution_statut === 'en_pause') return 'En pause'
  return 'Non démarrée'
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-FR')
}

const fmtHeures = (h: number) => `${h.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} h`
const fmtPct = (v: number) => `${v.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} %`

const statutClass = (statut: Statut) => {
  if (statut === 'En cours') return 'cours'
  if (statut === 'Terminée') return 'termine'
  if (statut === 'En pause') return 'bloque'
  if (statut === 'En retard') return 'retard'
  return 'attente'
}

const prioriteClass = (priorite: string) => priorite === 'Haute' ? 'haute' : priorite === 'Basse' ? 'basse' : 'moyenne'

function RepartitionDonut({ total, repartition }: { total: number; repartition: { label: string; value: number; color: string }[] }) {
  if (total === 0) return <p className="ct-empty">Aucune tâche sur ce périmètre.</p>
  const cx = 80, cy = 80, outer = 68, inner = 44
  const slices = repartition.reduce<{ label: string; value: number; color: string; path: string }[]>((acc, item) => {
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
        {repartition.map((item) => (
          <li key={item.label}><i style={{ background: item.color }} />{item.label} ({total > 0 ? `${((item.value / total) * 100).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} %` : '0 %'})</li>
        ))}
      </ul>
    </div>
  )
}

type TacheColumnId =
  | 'code' | 'projet' | 'ligneBudgetaire' | 'nom' | 'division' | 'attribuePar' | 'attribueA'
  | 'dateDebut' | 'dateFin' | 'echeance'
  | 'dureePrevue' | 'dureeConsommee' | 'dureeRestante'
  | 'progTemporelle' | 'statut' | 'priorite'

const TACHE_COLUMNS: ColumnDef<TacheColumnId>[] = [
  { id: 'code', label: 'Code tâche' },
  { id: 'projet', label: 'Projet' },
  { id: 'ligneBudgetaire', label: 'Ligne budgétaire' },
  { id: 'nom', label: 'Nom de la tâche' },
  { id: 'division', label: 'Équipe' },
  { id: 'attribuePar', label: 'Attribué par' },
  { id: 'attribueA', label: 'Attribué à' },
  { id: 'dateDebut', label: 'Date début' },
  { id: 'dateFin', label: 'Date fin' },
  { id: 'echeance', label: 'Échéance' },
  { id: 'dureePrevue', label: 'Prévues', group: 'Heures' },
  { id: 'dureeConsommee', label: 'Consommées', group: 'Heures' },
  { id: 'dureeRestante', label: 'Restantes', group: 'Heures' },
  { id: 'progTemporelle', label: 'Progression' },
  { id: 'statut', label: 'Statut' },
  { id: 'priorite', label: 'Priorité' },
]

interface ControleTachesPageProps {
  navigateTo: (page: string) => void
  onOpenLigneBudgetaire?: (projetCode: string, ligneCode: string) => void
}

export default function ControleTachesPage({ navigateTo, onOpenLigneBudgetaire }: ControleTachesPageProps) {
  const [assignments, setAssignments] = useState<TaskAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [filterProjet, setFilterProjet] = useState('Tous')
  const [filterLigne, setFilterLigne] = useState('Toutes')
  const [filterEquipe, setFilterEquipe] = useState('Toutes')
  const [filterStatut, setFilterStatut] = useState<'Tous' | Statut>('Tous')
  const [filterPriorite, setFilterPriorite] = useState('Toutes')
  const { hiddenColumns, toggleColumn, visibleColumns, headerCells } = useColumnVisibility(TACHE_COLUMNS)
  const totalColSpan = visibleColumns.length

  useEffect(() => {
    let cancelled = false
    fetchTaskAssignments()
      .then((data) => { if (!cancelled) setAssignments(data) })
      .catch((err) => { if (!cancelled) setLoadError(errorMessage(err)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const ligneLabel = (a: TaskAssignment) => `${a.ligne_budgetaire_code} — ${a.ligne_budgetaire_nom}`
  const equipeLabel = (a: TaskAssignment) => `${a.equipe_code} — ${a.equipe_nom}`

  const projets = useMemo(() => Array.from(new Set(assignments.map((a) => a.project_nom ?? 'Transversale'))).sort(), [assignments])
  const lignesBudgetaires = useMemo(() => Array.from(new Set(assignments.map(ligneLabel))).sort(), [assignments])
  const equipes = useMemo(() => Array.from(new Set(assignments.map(equipeLabel))).sort(), [assignments])

  const cellDefs = useMemo<Record<TacheColumnId, { className?: string; render: (a: TaskAssignment) => ReactNode }>>(() => ({
    code: { className: 'ct-code', render: (a) => a.task_code },
    projet: { render: (a) => a.project_nom ?? 'Transversale' },
    ligneBudgetaire: {
      render: (a) => a.project_code ? (
        <button
          type="button"
          className="ct-ligne-link"
          onClick={() => onOpenLigneBudgetaire?.(a.project_code as string, a.ligne_budgetaire_code)}
          title="Voir la ligne budgétaire dans Pilotage des projets"
        >
          {ligneLabel(a)}
        </button>
      ) : ligneLabel(a),
    },
    nom: { className: 'ct-name', render: (a) => a.template_nom },
    division: { render: (a) => equipeLabel(a) },
    attribuePar: { render: (a) => a.task_created_by_nom ?? '—' },
    attribueA: { render: (a) => a.user_nom },
    dateDebut: { render: (a) => formatDate(a.demarree_le) },
    dateFin: { render: (a) => formatDate(a.terminee_le) },
    echeance: { render: (a) => formatDate(a.echeance) },
    dureePrevue: { render: (a) => fmtHeures(a.heures) },
    dureeConsommee: { render: (a) => fmtHeures(a.temps_travaille_secondes / 3600) },
    dureeRestante: { render: (a) => fmtHeures(a.heures - a.temps_travaille_secondes / 3600) },
    progTemporelle: { render: (a) => fmtPct(a.heures > 0 ? (a.temps_travaille_secondes / 3600 / a.heures) * 100 : 0) },
    statut: { render: (a) => <span className={`ct-pill ct-pill-${statutClass(statutAffiche(a))}`}>{statutAffiche(a)}</span> },
    priorite: { render: (a) => <span className={`ct-priorite ct-priorite-${prioriteClass(a.priorite_display)}`}>{a.priorite_display}</span> },
  }), [onOpenLigneBudgetaire])

  const resetFiltres = () => {
    setSearch(''); setFilterProjet('Tous'); setFilterLigne('Toutes'); setFilterEquipe('Toutes')
    setFilterStatut('Tous'); setFilterPriorite('Toutes')
  }

  const tachesFiltrees = useMemo(() => assignments.filter((a) => (
    (filterProjet === 'Tous' || (a.project_nom ?? 'Transversale') === filterProjet)
    && (filterLigne === 'Toutes' || ligneLabel(a) === filterLigne)
    && (filterEquipe === 'Toutes' || equipeLabel(a) === filterEquipe)
    && (filterStatut === 'Tous' || statutAffiche(a) === filterStatut)
    && (filterPriorite === 'Toutes' || a.priorite_display === filterPriorite)
    && (search.trim() === '' || `${a.task_code} ${a.template_nom} ${a.user_nom} ${a.task_created_by_nom ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()))
  )), [assignments, filterProjet, filterLigne, filterEquipe, filterStatut, filterPriorite, search])

  // ---------------- Agrégats (KPIs, donut, alertes, mini-panels) ----------------
  const counts = useMemo(() => {
    const c: Record<Statut, number> = { 'Non démarrée': 0, 'En cours': 0, 'En pause': 0, 'Terminée': 0, 'En retard': 0 }
    for (const a of tachesFiltrees) c[statutAffiche(a)] += 1
    return c
  }, [tachesFiltrees])

  const echeancesSemaine = useMemo(
    () => tachesFiltrees.filter((a) => a.echeance && statutAffiche(a) !== 'Terminée' && joursJusquEcheance(a.echeance) >= 0 && joursJusquEcheance(a.echeance) <= 7).length,
    [tachesFiltrees],
  )

  const total = tachesFiltrees.length
  const pct = (n: number) => total > 0 ? fmtPct((n / total) * 100) : '0,0 %'

  const KPIS = [
    { icon: ClipboardList, tone: 'purple', label: 'Nombre total de tâches suivies', value: String(total), sub: 'Toutes tâches confondues' },
    { icon: PauseCircle, tone: 'gray', label: 'Non démarrées', value: String(counts['Non démarrée']), sub: pct(counts['Non démarrée']) },
    { icon: PlayCircle, tone: 'blue', label: 'En cours', value: String(counts['En cours']), sub: pct(counts['En cours']) },
    { icon: CheckCircle2, tone: 'green', label: 'Terminées', value: String(counts['Terminée']), sub: pct(counts['Terminée']) },
    { icon: Lock, tone: 'orange', label: 'En pause', value: String(counts['En pause']), sub: pct(counts['En pause']) },
    { icon: AlertTriangle, tone: 'red', label: 'En retard', value: String(counts['En retard']), sub: pct(counts['En retard']) },
    { icon: CalendarClock, tone: 'purple', label: 'Échéances cette semaine', value: String(echeancesSemaine), sub: 'Tâches concernées' },
  ]

  const REPARTITION_TOUTES: { label: Statut; value: number; color: string }[] = [
    { label: 'Non démarrée', value: counts['Non démarrée'], color: '#9ca3af' },
    { label: 'En cours', value: counts['En cours'], color: '#3b82f6' },
    { label: 'Terminée', value: counts['Terminée'], color: '#16a34a' },
    { label: 'En pause', value: counts['En pause'], color: '#f59e0b' },
    { label: 'En retard', value: counts['En retard'], color: '#dc2626' },
  ]
  const REPARTITION = REPARTITION_TOUTES.filter((s) => s.value > 0)

  const ALERTES = [
    { icon: Lock, tone: 'orange', label: 'Tâches en pause', value: counts['En pause'] },
    { icon: CalendarClock, tone: 'purple', label: 'Échéances proches (7 jours)', value: echeancesSemaine },
    { icon: AlertTriangle, tone: 'red', label: 'Tâches en retard', value: counts['En retard'] },
  ]

  const TACHES_EN_RETARD = useMemo(() => tachesFiltrees
    .filter((a) => statutAffiche(a) === 'En retard' && a.echeance)
    .map((a) => ({ a, jours: joursJusquEcheance(a.echeance as string) }))
    .sort((x, y) => x.jours - y.jours)
    .slice(0, 8), [tachesFiltrees])

  const TACHES_PROCHES = useMemo(() => tachesFiltrees
    .filter((a) => a.echeance && statutAffiche(a) !== 'Terminée' && statutAffiche(a) !== 'En retard' && joursJusquEcheance(a.echeance) <= 7)
    .map((a) => ({ a, jours: joursJusquEcheance(a.echeance as string) }))
    .sort((x, y) => x.jours - y.jours)
    .slice(0, 8), [tachesFiltrees])

  const COLLABORATEURS_ACTIFS = useMemo(() => Array.from(
    tachesFiltrees.filter((a) => statutAffiche(a) === 'En cours')
      .reduce<Map<string, number>>((acc, a) => acc.set(a.user_nom, (acc.get(a.user_nom) ?? 0) + 1), new Map())
      .entries(),
  ).map(([nom, taches]) => ({ nom, taches })).sort((a, b) => b.taches - a.taches).slice(0, 8), [tachesFiltrees])

  return (
    <section className="ct-page">
      <nav className="ct-subtabs">
        <button onClick={() => navigateTo('pilotage')}><ClipboardList size={14} />Pilotage des projets et gestion budgétaire</button>
        <button className="active" onClick={() => navigateTo('controle-taches')}><CheckCircle2 size={14} />Contrôle des tâches</button>
        <button onClick={() => navigateTo('controle-execution')}><Gauge size={14} />Performance & Staffing</button>
      </nav>

      {loading && <p className="ct-empty">Chargement…</p>}
      {loadError && <p className="ct-empty">{loadError}</p>}

      {!loading && !loadError && (
        <>
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

          <div className="ct-side-panels">
            <div className="ct-panel">
              <h3>Répartition des tâches</h3>
              <RepartitionDonut total={total} repartition={REPARTITION} />
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
            </div>
          </div>

          <div className="ct-filters">
            <label>Projet
              <select value={filterProjet} onChange={(event) => setFilterProjet(event.target.value)}>
                <option value="Tous">Tous les projets</option>
                {projets.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label>Ligne budgétaire
              <select value={filterLigne} onChange={(event) => setFilterLigne(event.target.value)}>
                <option value="Toutes">Toutes les lignes</option>
                {lignesBudgetaires.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </label>
            <label>Équipe
              <select value={filterEquipe} onChange={(event) => setFilterEquipe(event.target.value)}>
                <option value="Toutes">Toutes les équipes</option>
                {equipes.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </label>
            <label>Statut
              <select value={filterStatut} onChange={(event) => setFilterStatut(event.target.value as 'Tous' | Statut)}>
                <option value="Tous">Tous les statuts</option>
                <option>Non démarrée</option><option>En cours</option><option>Terminée</option><option>En pause</option><option>En retard</option>
              </select>
            </label>
            <label>Priorité
              <select value={filterPriorite} onChange={(event) => setFilterPriorite(event.target.value)}>
                <option value="Toutes">Toutes les priorités</option>
                <option>Haute</option><option>Moyenne</option><option>Basse</option>
              </select>
            </label>
            <label className="ct-search">
              <Search size={14} />
              <input placeholder="Rechercher une tâche (code, nom, collaborateur...)" value={search} onChange={(event) => setSearch(event.target.value)} />
            </label>
            <button type="button" className="ct-reset" onClick={resetFiltres}><RotateCcw size={14} />Réinitialiser</button>
          </div>

          <div className="ct-table-panel">
            <div className="ct-table-head">
              <h3>Liste des tâches ({tachesFiltrees.length.toLocaleString('fr-FR')} sur {assignments.length.toLocaleString('fr-FR')})</h3>
              <ColumnsMenu columns={TACHE_COLUMNS} hiddenColumns={hiddenColumns} onToggle={toggleColumn} />
            </div>
            <div className="ct-table-wrap">
              <table className="ct-table">
                <thead>
                  <tr>
                    {headerCells.map((cell) => cell.isGroup
                      ? <th key={cell.key} colSpan={cell.colSpan}>{cell.label}</th>
                      : <th key={cell.key} rowSpan={2}>{cell.label}</th>)}
                  </tr>
                  <tr>
                    {visibleColumns.filter((c) => c.group).map((c) => <th key={c.id}>{c.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {tachesFiltrees.length === 0 && (
                    <tr><td colSpan={totalColSpan} className="ct-empty">Aucune tâche ne correspond à ces filtres.</td></tr>
                  )}
                  {tachesFiltrees.map((tache) => (
                    <tr key={tache.id}>
                      {visibleColumns.map((c) => {
                        const def = cellDefs[c.id]
                        return <td key={c.id} className={def.className}>{def.render(tache)}</td>
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ct-table-foot">
              <span>Affichage de {tachesFiltrees.length} sur {tachesFiltrees.length} tâches</span>
              <nav className="ct-pagination" aria-label="Pagination">
                <button type="button" disabled><ChevronLeft size={14} /></button>
                <button type="button" className="is-active">1</button>
                <button type="button" disabled><ChevronRight size={14} /></button>
              </nav>
            </div>
          </div>

          <div className="ct-bottom">
            <div className="ct-mini-panel">
              <div className="ct-mini-head"><h3>Les tâches les plus en retard</h3></div>
              {TACHES_EN_RETARD.length === 0 ? <p className="ct-empty">Aucune tâche en retard.</p> : (
                <table className="ct-mini-table">
                  <thead><tr><th>#</th><th>Code tâche</th><th>Projet</th><th>Tâche</th><th>Retard</th><th>Échéance</th></tr></thead>
                  <tbody>
                    {TACHES_EN_RETARD.map((row, index) => (
                      <tr key={row.a.id}>
                        <td>{index + 1}</td>
                        <td className="ct-code">{row.a.task_code}</td>
                        <td>{row.a.project_nom ?? 'Transversale'}</td>
                        <td className="ct-name">{row.a.template_nom}</td>
                        <td className="ct-negative">-{Math.abs(row.jours)} jour{Math.abs(row.jours) > 1 ? 's' : ''}</td>
                        <td>{formatDate(row.a.echeance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="ct-mini-panel">
              <div className="ct-mini-head"><h3>Les tâches proches de l’échéance</h3></div>
              {TACHES_PROCHES.length === 0 ? <p className="ct-empty">Aucune échéance dans les 7 prochains jours.</p> : (
                <table className="ct-mini-table">
                  <thead><tr><th>#</th><th>Code tâche</th><th>Projet</th><th>Tâche</th><th>Échéance</th><th></th></tr></thead>
                  <tbody>
                    {TACHES_PROCHES.map((row, index) => (
                      <tr key={row.a.id}>
                        <td>{index + 1}</td>
                        <td className="ct-code">{row.a.task_code}</td>
                        <td>{row.a.project_nom ?? 'Transversale'}</td>
                        <td className="ct-name">{row.a.template_nom}</td>
                        <td>{formatDate(row.a.echeance)}</td>
                        <td className="ct-warning">{row.jours === 0 ? "Aujourd'hui" : `${row.jours} jour${row.jours > 1 ? 's' : ''}`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="ct-mini-panel">
              <div className="ct-mini-head"><h3>Collaborateurs ayant le plus de tâches en cours</h3></div>
              {COLLABORATEURS_ACTIFS.length === 0 ? <p className="ct-empty">Aucune tâche en cours actuellement.</p> : (
                <table className="ct-mini-table">
                  <thead><tr><th>#</th><th>Collaborateur</th><th>Tâches en cours</th></tr></thead>
                  <tbody>
                    {COLLABORATEURS_ACTIFS.map((row, index) => (
                      <tr key={row.nom}>
                        <td>{index + 1}</td>
                        <td className="ct-name">{row.nom}</td>
                        <td>{row.taches}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  )
}
