import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Briefcase, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight,
  ClipboardList, Columns3, Download, Gauge, GripVertical, Hourglass, Info, MoreVertical,
  RotateCcw, Search, Users, Wallet,
} from 'lucide-react'
import { fetchProjects, type Project as ApiProject, type ProjectLigne as ApiProjectLigne } from '../api/projects'
import { fetchTaskAssignments, type TaskAssignment } from '../api/taskAssignments'
import { fetchOrganisationEhs } from '../api/organisation'
import { ApiError } from '../api/client'
import { currencySuffix } from '../utils/currency'
import './PilotagePage.css'

const MONETAIRE_LABEL = `Total Monétaire (${currencySuffix()})`

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

interface BudgetLine {
  code: string
  ligneNom: string
  ligneCode: string
  equipeNom: string
  ehsPrevu: number
  ehsConsomme: number
  ehsRestant: number
  budgetPrevu: number
  budgetConsomme: number
  budgetRestant: number
  progTemporelle: number
  progEhs: number
  progOperationnelle: number
}

interface Project {
  code: string
  name: string
  client: string
  createdBy: string
  equipesList: string[]
  equipes: string
  debut: string | null
  fin: string | null
  statut: 'En cours' | 'Terminé' | 'En retard'
  ehsPrevu: number
  ehsConsomme: number
  ehsRestant: number
  budgetPrevu: number
  budgetConsomme: number
  budgetRestant: number
  dureePrevue: number | null
  dureeEcoulee: number | null
  dureeRestante: number | null
  progTemporelle: number
  progEhs: number
  progOperationnelle: number
  avancementGlobal: number
  statutGlobal: 'En bonne voie' | 'À surveiller' | 'Terminé' | 'En retard'
  lignes: BudgetLine[]
}

const AVATAR_COLORS = ['#6b46c1', '#3b82f6', '#16a34a', '#f59e0b', '#db2777', '#0d9488', '#4338ca', '#dc2626']

function hashName(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return hash
}

const avatarColor = (name: string) => AVATAR_COLORS[hashName(name) % AVATAR_COLORS.length]
const initials = (name: string) => name.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()

const fmtDateOrDash = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('fr-FR') : '—'
const fmtInt = (n: number) => Math.round(n).toLocaleString('fr-FR')
const fmtEhs = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

const joursEntre = (isoA: string, isoB: string) => Math.round((new Date(isoB).getTime() - new Date(isoA).getTime()) / 86400000)

const pctOf = (consomme: number, prevu: number) => prevu ? Math.round((consomme / prevu) * 100) : 0

type RiskLetter = 'A' | 'B' | 'C' | 'D'

function classifyRisk(pct: number): { letter: RiskLetter; label: string } {
  if (pct <= 25) return { letter: 'A', label: 'Faible' }
  if (pct <= 50) return { letter: 'B', label: 'Modérée' }
  if (pct <= 75) return { letter: 'C', label: 'Élevée' }
  return { letter: 'D', label: 'Critique' }
}

/** Progression temporelle réelle (aujourd'hui entre date de début et date de fin), 0 tant que les
 * dates ne sont pas renseignées — jamais une valeur inventée. */
function progTemporelleOf(debut: string | null, fin: string | null, todayMs: number): number {
  if (!debut || !fin) return 0
  const start = new Date(debut).getTime()
  const end = new Date(fin).getTime()
  if (end <= start) return 100
  return Math.round(Math.max(0, Math.min(100, ((todayMs - start) / (end - start)) * 100)))
}

function statutFromProgress(dateFin: string | null, avancementGlobal: number, todayMs: number): Project['statut'] {
  if (avancementGlobal >= 98) return 'Terminé'
  if (dateFin && new Date(dateFin).getTime() < todayMs) return 'En retard'
  return 'En cours'
}

function statutGlobalFromDrift(statut: Project['statut'], drift: number): Project['statutGlobal'] {
  if (statut === 'Terminé') return 'Terminé'
  if (drift > 15) return 'En retard'
  if (drift > 5) return 'À surveiller'
  return 'En bonne voie'
}

/** Reconstitue chaque projet (et ses lignes budgétaires réelles) à partir des données du backend
 * — /api/projects/ (avec ses lignes, dont montant_consomme_fcfa déjà agrégé côté serveur depuis
 * TaskAssignment) et /api/task-assignments/ (pour les EHS réellement consommés, par projet et
 * par ligne). L'« équivalent EHS » d'un budget est dérivé du taux configuré dans Paramètres > EHS
 * (montant ÷ taux) — il n'existe pas de quota EHS suivi indépendamment du budget monétaire dans
 * ce système, donc pas de troisième groupe de colonnes redondant à inventer ici.*/
function deriveProjects(apiProjects: ApiProject[], assignments: TaskAssignment[], tauxEhs: number, todayMs: number): Project[] {
  return apiProjects.map((p) => {
    const projectAssignments = assignments.filter((a) => a.project_code === p.code)
    const ehsConsommeTotal = projectAssignments.reduce((sum, a) => sum + a.ehs_consomme, 0)

    const lignes: BudgetLine[] = p.lignes.map((l: ApiProjectLigne) => {
      const ehsConsomme = projectAssignments
        .filter((a) => a.ligne_budgetaire_code === l.ligne_budgetaire_code)
        .reduce((sum, a) => sum + a.ehs_consomme, 0)
      const budgetPrevu = l.montant
      const budgetConsomme = l.montant_consomme_fcfa
      const ehsPrevu = tauxEhs > 0 ? budgetPrevu / tauxEhs : 0
      const debut = l.date_debut ?? p.date_debut
      const fin = l.date_fin ?? p.date_fin
      return {
        code: l.code, ligneNom: l.ligne_budgetaire_nom, ligneCode: l.ligne_budgetaire_code, equipeNom: l.equipe_nom,
        ehsPrevu, ehsConsomme, ehsRestant: Math.max(0, ehsPrevu - ehsConsomme),
        budgetPrevu, budgetConsomme, budgetRestant: Math.max(0, l.montant_reste_fcfa),
        progTemporelle: progTemporelleOf(debut, fin, todayMs),
        progEhs: pctOf(ehsConsomme, ehsPrevu),
        progOperationnelle: pctOf(budgetConsomme, budgetPrevu),
      }
    })

    const budgetPrevu = p.lignes.reduce((sum, l) => sum + l.montant, 0)
    const budgetConsomme = p.lignes.reduce((sum, l) => sum + l.montant_consomme_fcfa, 0)
    const ehsPrevu = tauxEhs > 0 ? budgetPrevu / tauxEhs : 0

    const progTemporelle = progTemporelleOf(p.date_debut, p.date_fin, todayMs)
    const progEhs = pctOf(ehsConsommeTotal, ehsPrevu)
    const progOperationnelle = pctOf(budgetConsomme, budgetPrevu)
    const avancementGlobal = Math.round(progTemporelle * 0.3 + progEhs * 0.35 + progOperationnelle * 0.35)

    const dureePrevue = p.date_debut && p.date_fin ? joursEntre(p.date_debut, p.date_fin) : null
    const todayIso = new Date(todayMs).toISOString().slice(0, 10)
    const dureeEcoulee = p.date_debut ? Math.max(0, Math.min(dureePrevue ?? Infinity, joursEntre(p.date_debut, todayIso))) : null
    const dureeRestante = dureePrevue !== null && dureeEcoulee !== null ? Math.max(0, dureePrevue - dureeEcoulee) : null

    const statut = statutFromProgress(p.date_fin, avancementGlobal, todayMs)
    const drift = progTemporelle - avancementGlobal
    const statutGlobal = statutGlobalFromDrift(statut, drift)

    const equipesList = Array.from(new Set(p.lignes.map((l) => l.equipe_nom)))

    return {
      code: p.code, name: p.nom, client: p.client || 'Non renseigné', createdBy: p.created_by_nom ?? '—',
      equipesList, equipes: equipesList.length > 0 ? equipesList.join(', ') : '—',
      debut: p.date_debut, fin: p.date_fin,
      statut, ehsPrevu, ehsConsomme: ehsConsommeTotal, ehsRestant: Math.max(0, ehsPrevu - ehsConsommeTotal),
      budgetPrevu, budgetConsomme, budgetRestant: Math.max(0, budgetPrevu - budgetConsomme),
      dureePrevue, dureeEcoulee, dureeRestante,
      progTemporelle, progEhs, progOperationnelle, avancementGlobal, statutGlobal,
      lignes,
    }
  })
}

const STATUT_OPTIONS: Project['statut'][] = ['En cours', 'Terminé', 'En retard']

const statutGlobalClass = (s: Project['statutGlobal']) => s === 'En bonne voie' ? 'bonne-voie' : s === 'À surveiller' ? 'surveiller' : s === 'Terminé' ? 'termine' : 'retard'

function getPageList(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '...', current - 1, current, current + 1, '...', total]
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="pil-mini-bar">
      <div className="pil-mini-bar-track"><span style={{ width: `${Math.min(100, value)}%`, background: color }} /></div>
      <b>{value}%</b>
    </div>
  )
}

const RISK_LABELS: Record<RiskLetter, string> = { A: 'Faible', B: 'Modérée', C: 'Élevée', D: 'Critique' }

function RiskBadge({ letter }: { letter: RiskLetter }) {
  return <span className={`pil-classify-badge pil-classify-${letter.toLowerCase()}`} title={RISK_LABELS[letter]}>{letter}</span>
}

function PctCell({ consomme, prevu }: { consomme: number; prevu: number }) {
  const pct = pctOf(consomme, prevu)
  const { letter } = classifyRisk(pct)
  return (
    <div className="pil-pct-cell">
      <span className="pil-pct-value">{pct}%</span>
      <RiskBadge letter={letter} />
    </div>
  )
}

type ColumnId =
  | 'code' | 'name' | 'client' | 'createdBy' | 'equipe' | 'debut' | 'fin' | 'duree'
  | 'ehsPrevu' | 'ehsConsomme' | 'ehsRestant' | 'ehsPct'
  | 'budgetPrevu' | 'budgetConsomme' | 'budgetRestant' | 'budgetPct'
  | 'progTemporelle' | 'progEhs' | 'progOperationnelle'
  | 'statutRisque' | 'statutGlobal'

const COLUMNS: { id: ColumnId; label: string; group?: string }[] = [
  { id: 'code', label: 'Code projet' },
  { id: 'name', label: 'Nom du projet' },
  { id: 'client', label: 'Client' },
  { id: 'createdBy', label: 'Créé par' },
  { id: 'equipe', label: 'Équipe(s)' },
  { id: 'debut', label: 'Début' },
  { id: 'fin', label: 'Fin' },
  { id: 'duree', label: 'Durée' },
  { id: 'ehsPrevu', label: 'Prévu', group: 'Total EHS' },
  { id: 'ehsConsomme', label: 'Consommé', group: 'Total EHS' },
  { id: 'ehsRestant', label: 'Restant', group: 'Total EHS' },
  { id: 'ehsPct', label: '%', group: 'Total EHS' },
  { id: 'budgetPrevu', label: 'Prévu', group: MONETAIRE_LABEL },
  { id: 'budgetConsomme', label: 'Consommé', group: MONETAIRE_LABEL },
  { id: 'budgetRestant', label: 'Restant', group: MONETAIRE_LABEL },
  { id: 'budgetPct', label: '%', group: MONETAIRE_LABEL },
  { id: 'progTemporelle', label: 'Temporelle', group: 'Progression' },
  { id: 'progEhs', label: 'Équivalent EHS', group: 'Progression' },
  { id: 'progOperationnelle', label: 'Opérationnelle', group: 'Progression' },
  { id: 'statutRisque', label: 'Statut' },
  { id: 'statutGlobal', label: 'Statut global' },
]

const CELL_DEFS: Record<ColumnId, { className?: string; render: (p: Project) => ReactNode }> = {
  code: { className: 'pil-code', render: (p) => p.code },
  name: { className: 'pil-name', render: (p) => p.name },
  client: { render: (p) => p.client },
  createdBy: {
    render: (p) => (
      <div className="pil-chef-cell">
        <span className="pil-avatar" style={{ background: avatarColor(p.createdBy) }}>{initials(p.createdBy)}</span>
        {p.createdBy}
      </div>
    ),
  },
  equipe: { render: (p) => p.equipes },
  debut: { render: (p) => fmtDateOrDash(p.debut) },
  fin: { render: (p) => fmtDateOrDash(p.fin) },
  duree: { render: (p) => p.dureePrevue !== null ? `${p.dureePrevue} jours` : '—' },
  ehsPrevu: { render: (p) => fmtEhs(p.ehsPrevu) },
  ehsConsomme: { render: (p) => fmtEhs(p.ehsConsomme) },
  ehsRestant: { render: (p) => fmtEhs(p.ehsRestant) },
  ehsPct: { render: (p) => <PctCell consomme={p.ehsConsomme} prevu={p.ehsPrevu} /> },
  budgetPrevu: { render: (p) => fmtInt(p.budgetPrevu) },
  budgetConsomme: { render: (p) => fmtInt(p.budgetConsomme) },
  budgetRestant: { render: (p) => fmtInt(p.budgetRestant) },
  budgetPct: { render: (p) => <PctCell consomme={p.budgetConsomme} prevu={p.budgetPrevu} /> },
  progTemporelle: { render: (p) => <ProgressBar value={p.progTemporelle} color="#3b82f6" /> },
  progEhs: { render: (p) => <ProgressBar value={p.progEhs} color="#16a34a" /> },
  progOperationnelle: { render: (p) => <ProgressBar value={p.progOperationnelle} color="#6b46c1" /> },
  statutRisque: {
    render: (p) => (
      <div className="pil-risk-cell">
        <RiskBadge letter={classifyRisk(pctOf(p.ehsConsomme, p.ehsPrevu)).letter} />
        <RiskBadge letter={classifyRisk(pctOf(p.budgetConsomme, p.budgetPrevu)).letter} />
      </div>
    ),
  },
  statutGlobal: {
    render: (p) => (
      <span className={`pil-status-global pil-status-${statutGlobalClass(p.statutGlobal)}`}><i />{p.statutGlobal}</span>
    ),
  },
}

export interface PilotageFocusTarget {
  projetCode: string
  ligneCode: string
}

interface PilotagePageProps {
  navigateTo: (page: string) => void
  focusTarget?: PilotageFocusTarget | null
  onFocusConsumed?: () => void
}

export default function PilotagePage({ navigateTo, focusTarget, onFocusConsumed }: PilotagePageProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [createdBy, setCreatedBy] = useState('Tous')
  const [client, setClient] = useState('Tous')
  const [statut, setStatut] = useState('Tous')
  const [equipe, setEquipe] = useState('Toutes')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)
  const [exportOpen, setExportOpen] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [hiddenColumns, setHiddenColumns] = useState<Set<ColumnId>>(new Set())
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false)
  const [highlightedLigne, setHighlightedLigne] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchProjects('definitif'), fetchTaskAssignments(), fetchOrganisationEhs()])
      .then(([apiProjects, assignments, ehsData]) => {
        if (cancelled) return
        setProjects(deriveProjects(apiProjects, assignments, ehsData.taux_ehs_fcfa, Date.now()))
      })
      .catch((err) => { if (!cancelled) setLoadError(errorMessage(err)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!focusTarget || loading) return
    const idx = projects.findIndex((p) => p.code === focusTarget.projetCode)
    if (idx === -1) { onFocusConsumed?.(); return }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets local filters in response to an external navigation command (focusTarget), not derived from render
    setSearch(''); setCreatedBy('Tous'); setClient('Tous'); setStatut('Tous'); setEquipe('Toutes')
    setPage(Math.floor(idx / pageSize) + 1)
    setExpandedRows((prev) => new Set(prev).add(focusTarget.projetCode))
    setHighlightedLigne(`${focusTarget.projetCode}:${focusTarget.ligneCode}`)

    const scrollTimer = setTimeout(() => {
      document.getElementById(`pil-ligne-${focusTarget.projetCode}-${focusTarget.ligneCode}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 150)
    const clearTimer = setTimeout(() => setHighlightedLigne(null), 2600)

    onFocusConsumed?.()

    return () => { clearTimeout(scrollTimer); clearTimeout(clearTimer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTarget, loading, projects])

  const toggleExpand = (code: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  const toggleColumn = (id: ColumnId) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const visibleColumns = useMemo(() => COLUMNS.filter((c) => !hiddenColumns.has(c.id)), [hiddenColumns])
  const totalColSpan = visibleColumns.length + 2

  const headerCells = useMemo(() => {
    const cells: { key: string; label: string; colSpan: number; isGroup: boolean }[] = []
    let i = 0
    while (i < COLUMNS.length) {
      const col = COLUMNS[i]
      if (hiddenColumns.has(col.id)) { i++; continue }
      if (!col.group) {
        cells.push({ key: col.id, label: col.label, colSpan: 1, isGroup: false })
        i++
        continue
      }
      const groupName = col.group
      let count = 0
      while (i < COLUMNS.length && COLUMNS[i].group === groupName) {
        if (!hiddenColumns.has(COLUMNS[i].id)) count++
        i++
      }
      if (count > 0) cells.push({ key: groupName, label: groupName, colSpan: count, isGroup: true })
    }
    return cells
  }, [hiddenColumns])

  const createdByOptions = useMemo(() => Array.from(new Set(projects.map((p) => p.createdBy))).sort(), [projects])
  const clientOptions = useMemo(() => Array.from(new Set(projects.map((p) => p.client))).sort(), [projects])
  const equipeOptions = useMemo(() => Array.from(new Set(projects.flatMap((p) => p.equipesList))).sort(), [projects])

  const filtered = useMemo(() => projects.filter((p) => {
    if (createdBy !== 'Tous' && p.createdBy !== createdBy) return false
    if (client !== 'Tous' && p.client !== client) return false
    if (statut !== 'Tous' && p.statut !== statut) return false
    if (equipe !== 'Toutes' && !p.equipesList.includes(equipe)) return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      if (!p.name.toLowerCase().includes(q) && !p.code.toLowerCase().includes(q) && !p.client.toLowerCase().includes(q)) return false
    }
    return true
  }), [projects, createdBy, client, statut, equipe, search])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const paginated = filtered.slice((currentPage - 1) * pageSize, (currentPage - 1) * pageSize + pageSize)

  const resetFilters = () => {
    setSearch(''); setCreatedBy('Tous'); setClient('Tous'); setStatut('Tous'); setEquipe('Toutes'); setPage(1)
  }

  const kpiProjetsActifs = filtered.filter((p) => p.statut === 'En cours').length
  const kpiEhsConsomme = filtered.reduce((sum, p) => sum + p.ehsConsomme, 0)
  const kpiEhsPrevu = filtered.reduce((sum, p) => sum + p.ehsPrevu, 0)
  const kpiBudgetConsomme = filtered.reduce((sum, p) => sum + p.budgetConsomme, 0)
  const kpiBudgetPrevu = filtered.reduce((sum, p) => sum + p.budgetPrevu, 0)
  const kpiDureeEcoulee = filtered.reduce((sum, p) => sum + (p.dureeEcoulee ?? 0), 0)
  const kpiDureePrevue = filtered.reduce((sum, p) => sum + (p.dureePrevue ?? 0), 0)
  const kpiProgOperationnelle = pctOf(kpiBudgetConsomme, kpiBudgetPrevu)

  const KPIS = [
    { icon: <Briefcase size={18} />, tone: 'purple', label: 'PROJETS ACTIFS', value: String(kpiProjetsActifs), sub: `${pctOf(kpiProjetsActifs, filtered.length)}% du total`, pct: pctOf(kpiProjetsActifs, filtered.length) },
    { icon: <Users size={18} />, tone: 'blue', label: 'EHS CONSOMMÉS', value: `${fmtEhs(kpiEhsConsomme)} EHS`, sub: `Sur ${fmtEhs(kpiEhsPrevu)} EHS prévus`, pct: pctOf(kpiEhsConsomme, kpiEhsPrevu) },
    { icon: <Wallet size={18} />, tone: 'green', label: 'MONTANTS CONSOMMÉS', value: `${fmtInt(kpiBudgetConsomme)} ${currencySuffix()}`, sub: `Sur ${fmtInt(kpiBudgetPrevu)} ${currencySuffix()} prévus`, pct: pctOf(kpiBudgetConsomme, kpiBudgetPrevu) },
    { icon: <Hourglass size={18} />, tone: 'slate', label: 'DURÉE CONSOMMÉE', value: `${fmtInt(kpiDureeEcoulee)} jours`, sub: `Sur ${fmtInt(kpiDureePrevue)} jours prévus`, pct: pctOf(kpiDureeEcoulee, kpiDureePrevue) },
    { icon: <Gauge size={18} />, tone: 'indigo', label: 'PROGRESSION OPÉRATIONNELLE', value: `${kpiProgOperationnelle}%`, sub: 'Taux global opérationnel', pct: kpiProgOperationnelle },
  ]
  const KPI_COLORS: Record<string, string> = { purple: '#6b46c1', blue: '#3b82f6', teal: '#0d9488', green: '#16a34a', slate: '#4c3a8f', indigo: '#4338ca' }

  return (
    <section className="pil-page">
      <nav className="pil-subtabs">
        <button className="active" onClick={() => navigateTo('pilotage')}><ClipboardList size={14} />Pilotage des projets et gestion budgétaire</button>
        <button onClick={() => navigateTo('controle-taches')}><CheckCircle2 size={14} />Contrôle des tâches</button>
        <button onClick={() => navigateTo('controle-execution')}><Gauge size={14} />Performance & Staffing</button>
      </nav>

      <div className="pil-toolbar">
        <div className="pil-export-wrap">
          <button type="button" className="pil-btn-primary" onClick={() => setExportOpen((open) => !open)}>
            <Download size={14} />Exporter<ChevronDown size={12} />
          </button>
          {exportOpen && (
            <ul className="pil-export-menu" onMouseLeave={() => setExportOpen(false)}>
              <li><button type="button" disabled title="Fonctionnalité à venir">Exporter en PDF</button></li>
              <li><button type="button" disabled title="Fonctionnalité à venir">Exporter en Excel</button></li>
              <li><button type="button" disabled title="Fonctionnalité à venir">Exporter en CSV</button></li>
            </ul>
          )}
        </div>
      </div>

      {loading && <p className="pil-empty">Chargement du portefeuille de projets…</p>}
      {loadError && <p className="pil-empty">{loadError}</p>}

      {!loading && !loadError && (
        <>
          <div className="pil-kpis">
            {KPIS.map((kpi) => (
              <article key={kpi.label} className={`pil-kpi pil-kpi-${kpi.tone}`}>
                <div className="pil-kpi-head">
                  <span className="pil-kpi-icon">{kpi.icon}</span>
                  <span>{kpi.label}</span>
                  <span className="pil-kpi-pct">{kpi.pct}%</span>
                </div>
                <strong>{kpi.value}</strong>
                <small>{kpi.sub}</small>
                <div className="pil-kpi-bar"><i style={{ width: `${Math.min(100, kpi.pct)}%`, background: KPI_COLORS[kpi.tone] }} /></div>
              </article>
            ))}
          </div>

          <div className="pil-filters">
            <label>Créé par
              <select value={createdBy} onChange={(event) => { setCreatedBy(event.target.value); setPage(1) }}>
                <option>Tous</option>
                {createdByOptions.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label>Client
              <select value={client} onChange={(event) => { setClient(event.target.value); setPage(1) }}>
                <option>Tous</option>
                {clientOptions.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label>Statut
              <select value={statut} onChange={(event) => { setStatut(event.target.value); setPage(1) }}>
                <option>Tous</option>
                {STATUT_OPTIONS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label>Équipe
              <select value={equipe} onChange={(event) => { setEquipe(event.target.value); setPage(1) }}>
                <option>Toutes</option>
                {equipeOptions.map((e) => <option key={e}>{e}</option>)}
              </select>
            </label>
            <label className="pil-search">
              <Search size={14} />
              <input placeholder="Rechercher un projet..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} />
            </label>
            <button type="button" className="pil-reset" onClick={resetFilters}><RotateCcw size={14} />Réinitialiser</button>
          </div>

          <div className="pil-table-panel">
            <div className="pil-table-head">
              <h3>Liste des projets ({filtered.length})</h3>
              <div className="pil-columns-wrap">
                <button type="button" className="pil-btn-outline" onClick={() => setColumnsMenuOpen((open) => !open)}>
                  <Columns3 size={14} />Colonnes<ChevronDown size={12} />
                </button>
                {columnsMenuOpen && (
                  <div className="pil-columns-menu" onMouseLeave={() => setColumnsMenuOpen(false)}>
                    {COLUMNS.map((c) => (
                      <label key={c.id} className="pil-columns-menu-item">
                        <input type="checkbox" checked={!hiddenColumns.has(c.id)} onChange={() => toggleColumn(c.id)} />
                        {c.group ? `${c.group} — ${c.label}` : c.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="pil-table-wrap">
              <table className="pil-table">
                <thead>
                  <tr>
                    <th rowSpan={2}></th>
                    {headerCells.map((cell) => cell.isGroup
                      ? <th key={cell.key} colSpan={cell.colSpan}>{cell.label}</th>
                      : <th key={cell.key} rowSpan={2}>{cell.key === 'name' ? <span className="pil-th-info">Nom du projet<Info size={11} /></span> : cell.label}</th>)}
                    <th rowSpan={2}></th>
                  </tr>
                  <tr>
                    {visibleColumns.filter((c) => c.group).map((c) => <th key={c.id}>{c.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((p) => {
                    const isExpanded = expandedRows.has(p.code)
                    return (
                      <Fragment key={p.code}>
                        <tr className={isExpanded ? 'pil-row-expanded' : undefined}>
                          <td className="pil-expand-toggle">
                            <button
                              type="button"
                              className="pil-chevron-btn"
                              onClick={() => toggleExpand(p.code)}
                              aria-label={isExpanded ? 'Réduire le projet' : 'Développer le projet'}
                              aria-expanded={isExpanded}
                            >
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                          </td>
                          {visibleColumns.map((c) => {
                            const def = CELL_DEFS[c.id]
                            return <td key={c.id} className={def.className}>{def.render(p)}</td>
                          })}
                          <td><button type="button" className="pil-row-action" aria-label="Actions" disabled title="Fonctionnalité à venir"><MoreVertical size={14} /></button></td>
                        </tr>
                        {isExpanded && (
                          <tr className="pil-expand-row">
                            <td colSpan={totalColSpan} className="pil-expand-cell">
                              {p.lignes.length === 0 ? (
                                <p className="pil-empty">Aucune ligne budgétaire attribuée à ce projet pour le moment.</p>
                              ) : (
                                <div className="pil-budget-lines">
                                  <table className="pil-subtable">
                                    <thead>
                                      <tr>
                                        <th colSpan={3}>Lignes budgétaires</th>
                                        <th colSpan={3}>Total EHS</th>
                                        <th colSpan={3}>{MONETAIRE_LABEL}</th>
                                        <th colSpan={3}>Progression</th>
                                      </tr>
                                      <tr>
                                        <th>Code</th><th>Ligne budgétaire</th><th>Équipe</th>
                                        <th>Prévu</th><th>Consommé</th><th>Restant</th>
                                        <th>Prévu</th><th>Consommé</th><th>Restant</th>
                                        <th>Temporelle</th><th>Équivalent EHS</th><th>Opérationnelle</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {p.lignes.map((line) => (
                                        <tr
                                          key={line.code}
                                          id={`pil-ligne-${p.code}-${line.code}`}
                                          className={highlightedLigne === `${p.code}:${line.code}` ? 'pil-line-highlight' : undefined}
                                        >
                                          <td className="pil-line-code">{line.code}</td>
                                          <td className="pil-line-name"><GripVertical size={12} className="pil-drag-handle" />{line.ligneCode} — {line.ligneNom}</td>
                                          <td className="pil-line-intitule">{line.equipeNom}</td>
                                          <td>{fmtEhs(line.ehsPrevu)}</td>
                                          <td>{fmtEhs(line.ehsConsomme)}</td>
                                          <td>{fmtEhs(line.ehsRestant)}</td>
                                          <td>{fmtInt(line.budgetPrevu)}</td>
                                          <td>{fmtInt(line.budgetConsomme)}</td>
                                          <td>{fmtInt(line.budgetRestant)}</td>
                                          <td><ProgressBar value={line.progTemporelle} color="#3b82f6" /></td>
                                          <td><ProgressBar value={line.progEhs} color="#16a34a" /></td>
                                          <td><ProgressBar value={line.progOperationnelle} color="#6b46c1" /></td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                  {paginated.length === 0 && (
                    <tr><td colSpan={totalColSpan} className="pil-empty">Aucun projet ne correspond à ces filtres.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="pil-table-note">
              <Info size={14} />
              <p>
                <strong>Logique de calcul du Statut :</strong> pour les colonnes Total EHS et {MONETAIRE_LABEL}, le taux <b>Consommé / Prévu</b> détermine un niveau de risque —
                {' '}<b>0 à 25 % = Faible (A)</b>, <b>26 à 50 % = Modérée (B)</b>, <b>51 à 75 % = Élevée (C)</b>, <b>76 % et plus = Critique (D)</b>.
                {' '}La colonne <b>Statut</b> reprend ces deux lettres, dans l'ordre EHS puis {MONETAIRE_LABEL}, pour donner une vue synthétique du niveau de risque du projet.
                {' '}L'équivalent EHS d'un montant est obtenu en le divisant par le taux configuré dans Paramètres &gt; EHS.
              </p>
            </div>

            <div className="pil-table-foot">
              <div className="pil-table-foot-left">
                <span>Affichage de {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} à {Math.min(currentPage * pageSize, filtered.length)} sur {filtered.length} projets</span>
              </div>
              <div className="pil-table-foot-right">
                <label className="pil-page-size">Lignes par page
                  <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1) }}>
                    <option value={8}>8</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </label>
                <nav className="pil-pagination" aria-label="Pagination">
                  <button type="button" disabled={currentPage <= 1} onClick={() => setPage((pg) => Math.max(1, pg - 1))}><ChevronLeft size={14} /></button>
                  {getPageList(currentPage, pageCount).map((item, index) => item === '...'
                    ? <span key={`ellipsis-${index}`} className="pil-page-ellipsis">…</span>
                    : <button key={item} type="button" className={item === currentPage ? 'is-active' : ''} onClick={() => setPage(item)}>{item}</button>)}
                  <button type="button" disabled={currentPage >= pageCount} onClick={() => setPage((pg) => Math.min(pageCount, pg + 1))}><ChevronRight size={14} /></button>
                </nav>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
