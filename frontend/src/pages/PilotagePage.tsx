import { useMemo, useState } from 'react'
import {
  Briefcase, Calendar, ChevronDown, ChevronLeft, ChevronRight, Clock, Download,
  Hourglass, MoreVertical, RefreshCw, RotateCcw, Search, SlidersHorizontal, TrendingUp, Users,
} from 'lucide-react'
import './PilotagePage.css'

interface Project {
  code: string
  name: string
  client: string
  chef: string
  division: string
  priorite: string
  debut: string
  fin: string
  statut: 'En cours' | 'Terminé' | 'En retard'
  ehsPrevu: number
  ehsConsomme: number
  ehsRestant: number
  budgetPrevu: number
  budgetConsomme: number
  budgetRestant: number
  dureePrevue: number
  dureeEcoulee: number
  dureeRestante: number
  progTemporelle: number
  progEhs: number
  progMonetaire: number
  avancementGlobal: number
  statutGlobal: 'En bonne voie' | 'À surveiller' | 'Terminé' | 'En retard'
}

const CLIENTS = ['Cabinet Conseil X', 'Société ABC', 'Industries SA', 'Groupe ZETA', 'Holding MBDA', 'Ministère Y', 'Entreprise DEF', 'Client International', 'Banque Centrale', 'Groupe Atlantique', 'SARL Nova', 'Fondation Koré']
const CHEFS = ['Ajara Lamare', 'Herman Tsaffock', 'Pamela G.', 'Belomo Edwige', 'Ibrahim M.', 'Essogo Erine', 'Théodore Bessala', 'Brayan Ebongue', 'Nadine Fokou', 'Serge Amougou']
const DIVISIONS = ['Digital', 'Finance', 'Industrie', 'RH', 'Santé', 'Énergie']
const PRIORITES = ['Haute', 'Moyenne', 'Basse']
const NAME_BASES = [
  'ERP Academy', 'Mission Audit Interne', 'Étude de faisabilité usine', 'Digitalisation RH', 'Refonte SI Comptable',
  'Formation 200 Agents', 'Implémentation CRM', 'Étude marché RDC', 'Optimisation supply chain', 'Déploiement ERP filiale',
  'Migration cloud', 'Refonte site institutionnel', 'Audit sécurité SI', 'Programme qualité ISO', "Plan de formation cadres",
  "Étude d'impact environnemental", 'Modernisation réseau', 'Déploiement paie SIRH', 'Cartographie des risques', 'Refonte processus achats',
]

function mulberry32(seed: number) {
  return function random() {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pad2 = (n: number) => String(n).padStart(2, '0')
const addDays = (base: Date, days: number) => { const d = new Date(base); d.setDate(d.getDate() + days); return d }
const fmtDate = (d: Date) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`
const fmtInt = (n: number) => Math.round(n).toLocaleString('fr-FR')
const fmtEhs = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function statutFromProgress(dureeEcoulee: number, dureePrevue: number, avancementGlobal: number): Project['statut'] {
  if (avancementGlobal >= 98) return 'Terminé'
  if (dureeEcoulee >= dureePrevue) return 'En retard'
  return 'En cours'
}

function statutGlobalFromDrift(statut: Project['statut'], drift: number): Project['statutGlobal'] {
  if (statut === 'Terminé') return 'Terminé'
  if (drift > 15) return 'En retard'
  if (drift > 5) return 'À surveiller'
  return 'En bonne voie'
}

function buildProject(index: number, rnd: () => number): Project {
  const code = `PRJ.${String(index).padStart(3, '0')}`
  const lot = Math.floor((index - 1) / NAME_BASES.length)
  const name = `${NAME_BASES[(index - 1) % NAME_BASES.length]}${lot > 0 ? ` — Lot ${lot + 1}` : ''}`
  const client = CLIENTS[Math.floor(rnd() * CLIENTS.length)]
  const chef = CHEFS[Math.floor(rnd() * CHEFS.length)]
  const division = DIVISIONS[Math.floor(rnd() * DIVISIONS.length)]
  const priorite = PRIORITES[Math.floor(rnd() * PRIORITES.length)]

  const dureePrevue = Math.round(90 + rnd() * 210)
  const tauxTemps = Math.min(1, 0.05 + rnd() * 1.05)
  const dureeEcoulee = Math.min(dureePrevue, Math.round(dureePrevue * tauxTemps))
  const dureeRestante = Math.max(0, dureePrevue - dureeEcoulee)

  const tauxEhs = Math.min(1, Math.max(0, tauxTemps + (rnd() - 0.5) * 0.25))
  const ehsPrevu = Math.round((50 + rnd() * 250) * 100) / 100
  const ehsConsomme = Math.round(ehsPrevu * tauxEhs * 100) / 100
  const ehsRestant = Math.round((ehsPrevu - ehsConsomme) * 100) / 100

  const tauxBudget = Math.min(1, Math.max(0, tauxTemps + (rnd() - 0.5) * 0.2))
  const budgetPrevu = Math.round((ehsPrevu * (280000 + rnd() * 220000)) / 100000) * 100000
  const budgetConsomme = Math.round((budgetPrevu * tauxBudget) / 100000) * 100000
  const budgetRestant = Math.max(0, budgetPrevu - budgetConsomme)

  const progTemporelle = Math.round(tauxTemps * 100)
  const progEhs = Math.round(tauxEhs * 100)
  const progMonetaire = Math.round(tauxBudget * 100)
  const avancementGlobal = Math.round(progTemporelle * 0.3 + progEhs * 0.35 + progMonetaire * 0.35)

  const statut = statutFromProgress(dureeEcoulee, dureePrevue, avancementGlobal)
  const drift = progTemporelle - avancementGlobal
  const statutGlobal = statutGlobalFromDrift(statut, drift)

  const debutDate = addDays(new Date(2025, 0, 1), Math.floor(rnd() * 200))
  const finDate = addDays(debutDate, dureePrevue)

  return {
    code, name, client, chef, division, priorite,
    debut: fmtDate(debutDate), fin: fmtDate(finDate),
    statut, ehsPrevu, ehsConsomme, ehsRestant,
    budgetPrevu, budgetConsomme, budgetRestant,
    dureePrevue, dureeEcoulee, dureeRestante,
    progTemporelle, progEhs, progMonetaire, avancementGlobal, statutGlobal,
  }
}

const FIXED_PROJECTS: Project[] = [
  { code: 'PRJ.001', name: 'ERP Academy', client: 'Cabinet Conseil X', chef: 'Ajara Lamare', division: 'Digital', priorite: 'Haute', debut: '01/05/2025', fin: '31/12/2025', statut: 'En cours', ehsPrevu: 256, ehsConsomme: 174.5, ehsRestant: 81.5, budgetPrevu: 125000000, budgetConsomme: 85430000, budgetRestant: 39570000, dureePrevue: 245, dureeEcoulee: 165, dureeRestante: 80, progTemporelle: 67, progEhs: 68, progMonetaire: 68, avancementGlobal: 68, statutGlobal: 'En bonne voie' },
  { code: 'PRJ.002', name: 'Mission Audit Interne', client: 'Société ABC', chef: 'Herman Tsaffock', division: 'Finance', priorite: 'Moyenne', debut: '15/03/2025', fin: '15/07/2025', statut: 'En cours', ehsPrevu: 110, ehsConsomme: 72.4, ehsRestant: 37.6, budgetPrevu: 55000000, budgetConsomme: 36100000, budgetRestant: 18900000, dureePrevue: 123, dureeEcoulee: 88, dureeRestante: 35, progTemporelle: 72, progEhs: 66, progMonetaire: 66, avancementGlobal: 67, statutGlobal: 'À surveiller' },
  { code: 'PRJ.003', name: 'Étude de faisabilité usine', client: 'Industries SA', chef: 'Pamela G.', division: 'Industrie', priorite: 'Haute', debut: '10/04/2025', fin: '10/08/2025', statut: 'En cours', ehsPrevu: 95, ehsConsomme: 60, ehsRestant: 35, budgetPrevu: 40000000, budgetConsomme: 22800000, budgetRestant: 17200000, dureePrevue: 123, dureeEcoulee: 67, dureeRestante: 56, progTemporelle: 49, progEhs: 57, progMonetaire: 57, avancementGlobal: 54, statutGlobal: 'À surveiller' },
  { code: 'PRJ.004', name: 'Digitalisation RH', client: 'Groupe ZETA', chef: 'Belomo Edwige', division: 'RH', priorite: 'Moyenne', debut: '05/02/2025', fin: '05/06/2025', statut: 'Terminé', ehsPrevu: 80, ehsConsomme: 76, ehsRestant: 4, budgetPrevu: 58700000, budgetConsomme: 58700000, budgetRestant: 1300000, dureePrevue: 120, dureeEcoulee: 120, dureeRestante: 0, progTemporelle: 100, progEhs: 95, progMonetaire: 98, avancementGlobal: 99, statutGlobal: 'Terminé' },
  { code: 'PRJ.005', name: 'Refonte SI Comptable', client: 'Holding MBDA', chef: 'Ibrahim M.', division: 'Finance', priorite: 'Haute', debut: '20/03/2025', fin: '20/09/2025', statut: 'En cours', ehsPrevu: 160, ehsConsomme: 89.1, ehsRestant: 70.9, budgetPrevu: 90000000, budgetConsomme: 42600000, budgetRestant: 47400000, dureePrevue: 185, dureeEcoulee: 95, dureeRestante: 90, progTemporelle: 51, progEhs: 47, progMonetaire: 47, avancementGlobal: 48, statutGlobal: 'À surveiller' },
  { code: 'PRJ.006', name: 'Formation 200 Agents', client: 'Ministère Y', chef: 'Essogo Erine', division: 'RH', priorite: 'Basse', debut: '01/05/2025', fin: '30/11/2025', statut: 'En cours', ehsPrevu: 130, ehsConsomme: 46.8, ehsRestant: 63.2, budgetPrevu: 40000000, budgetConsomme: 18400000, budgetRestant: 21600000, dureePrevue: 214, dureeEcoulee: 61, dureeRestante: 153, progTemporelle: 28, progEhs: 36, progMonetaire: 36, avancementGlobal: 40, statutGlobal: 'En retard' },
  { code: 'PRJ.007', name: 'Implémentation CRM', client: 'Entreprise DEF', chef: 'Théodore Bessala', division: 'Digital', priorite: 'Moyenne', debut: '18/01/2025', fin: '18/05/2025', statut: 'Terminé', ehsPrevu: 60, ehsConsomme: 60, ehsRestant: 0, budgetPrevu: 35000000, budgetConsomme: 34200000, budgetRestant: 800000, dureePrevue: 120, dureeEcoulee: 120, dureeRestante: 0, progTemporelle: 100, progEhs: 100, progMonetaire: 98, avancementGlobal: 100, statutGlobal: 'Terminé' },
  { code: 'PRJ.008', name: 'Étude marché RDC', client: 'Client International', chef: 'Brayan Ebongue', division: 'Industrie', priorite: 'Basse', debut: '12/05/2025', fin: '12/10/2025', statut: 'En retard', ehsPrevu: 50, ehsConsomme: 11, ehsRestant: 39, budgetPrevu: 18000000, budgetConsomme: 6400000, budgetRestant: 11600000, dureePrevue: 155, dureeEcoulee: 23, dureeRestante: 132, progTemporelle: 15, progEhs: 36, progMonetaire: 36, avancementGlobal: 29, statutGlobal: 'En retard' },
]

const TOTAL_PROJECTS = 128

function buildProjects(): Project[] {
  const rnd = mulberry32(20250520)
  const projects = [...FIXED_PROJECTS]
  for (let i = FIXED_PROJECTS.length + 1; i <= TOTAL_PROJECTS; i++) projects.push(buildProject(i, rnd))
  return projects
}

const ALL_PROJECTS = buildProjects()
const CHEF_OPTIONS = Array.from(new Set(ALL_PROJECTS.map((p) => p.chef))).sort()
const CLIENT_OPTIONS = Array.from(new Set(ALL_PROJECTS.map((p) => p.client))).sort()
const STATUT_OPTIONS: Project['statut'][] = ['En cours', 'Terminé', 'En retard']

const statutClass = (s: Project['statut']) => s === 'En cours' ? 'cours' : s === 'Terminé' ? 'termine' : 'retard'
const statutGlobalClass = (s: Project['statutGlobal']) => s === 'En bonne voie' ? 'bonne-voie' : s === 'À surveiller' ? 'surveiller' : s === 'Terminé' ? 'termine' : 'retard'

function getPageList(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '...', current - 1, current, current + 1, '...', total]
}

const EHS_MONTHS = [
  { label: 'Mai 2025', prevu: 420, consomme: 244, taux: 58 },
  { label: 'Juin 2025', prevu: 440, consomme: 286, taux: 65 },
  { label: 'Juil. 2025', prevu: 460, consomme: 331, taux: 72 },
  { label: 'Août 2025', prevu: 430, consomme: 292, taux: 68 },
  { label: 'Sept. 2025', prevu: 480, consomme: 360, taux: 75 },
  { label: 'Oct. 2025', prevu: 400, consomme: 248, taux: 62 },
]

const PROGRESS_MONTHS = [
  { label: 'Mai 2025', value: 15 },
  { label: 'Juin 2025', value: 22 },
  { label: 'Juil. 2025', value: 32 },
  { label: 'Août 2025', value: 45 },
  { label: 'Sept. 2025', value: 58 },
  { label: 'Oct. 2025', value: 68 },
]

const BUDGET_BREAKDOWN = [
  { label: 'Ressources humaines', percent: 45, color: '#3b82f6' },
  { label: 'Charges directes', percent: 25, color: '#f59e0b' },
  { label: 'Sous-traitance', percent: 15, color: '#22c55e' },
  { label: 'Déplacements', percent: 10, color: '#fb923c' },
  { label: 'Autres charges', percent: 5, color: '#e9d5ff' },
]

function EhsMonthChart() {
  const W = 460, H = 230, PL = 32, PR = 34, PT = 26, PB = 26
  const plotW = W - PL - PR, plotH = H - PT - PB
  const maxY = 600
  const slot = plotW / EHS_MONTHS.length
  const barW = Math.min(16, slot * 0.28)
  const y = (v: number) => PT + plotH - (v / maxY) * plotH
  const yTaux = (v: number) => PT + plotH - (v / 125) * plotH

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="pil-chart-svg" role="img" aria-label="Consommation EHS par mois">
      {[0, 100, 200, 300, 400, 500, 600].map((v) => (
        <g key={v}>
          <line x1={PL} x2={W - PR} y1={y(v)} y2={y(v)} className="pil-grid" />
          <text x={PL - 6} y={y(v) + 3} className="pil-axis" textAnchor="end">{v}</text>
        </g>
      ))}
      {[0, 25, 50, 75, 100, 125].map((v) => (
        <text key={v} x={W - PR + 6} y={yTaux(v) + 3} className="pil-axis" textAnchor="start">{v}%</text>
      ))}
      {EHS_MONTHS.map((m, i) => {
        const x = PL + slot * i
        return (
          <g key={m.label}>
            <rect x={x + slot / 2 - barW - 2} y={y(m.prevu)} width={barW} height={PT + plotH - y(m.prevu)} fill="#c4b5fd" rx="2" />
            <rect x={x + slot / 2 + 2} y={y(m.consomme)} width={barW} height={PT + plotH - y(m.consomme)} fill="#6d28d9" rx="2" />
            <text x={x + slot / 2} y={H - 6} className="pil-axis" textAnchor="middle">{m.label}</text>
          </g>
        )
      })}
      <path d={EHS_MONTHS.map((m, i) => `${i === 0 ? 'M' : 'L'} ${PL + slot * i + slot / 2} ${yTaux(m.taux)}`).join(' ')} fill="none" stroke="#16a34a" strokeWidth="2" />
      {EHS_MONTHS.map((m, i) => (
        <g key={`${m.label}-pt`}>
          <circle cx={PL + slot * i + slot / 2} cy={yTaux(m.taux)} r="3" fill="#16a34a" />
          <text x={PL + slot * i + slot / 2} y={yTaux(m.taux) - 8} className="pil-point-label" textAnchor="middle">{m.taux}%</text>
        </g>
      ))}
    </svg>
  )
}

function ProgressLineChart() {
  const W = 460, H = 230, PL = 30, PR = 14, PT = 26, PB = 26
  const plotW = W - PL - PR, plotH = H - PT - PB
  const slot = plotW / (PROGRESS_MONTHS.length - 1)
  const y = (v: number) => PT + plotH - (v / 100) * plotH
  const points = PROGRESS_MONTHS.map((m, i) => [PL + slot * i, y(m.value)] as const)
  const linePath = points.map(([x, yy], i) => `${i === 0 ? 'M' : 'L'} ${x} ${yy}`).join(' ')
  const areaPath = `${linePath} L ${points[points.length - 1][0]} ${PT + plotH} L ${points[0][0]} ${PT + plotH} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="pil-chart-svg" role="img" aria-label="Évolution de l'avancement global">
      {[0, 20, 40, 60, 80, 100].map((v) => (
        <g key={v}>
          <line x1={PL} x2={W - PR} y1={y(v)} y2={y(v)} className="pil-grid" />
          <text x={PL - 6} y={y(v) + 3} className="pil-axis" textAnchor="end">{v}%</text>
        </g>
      ))}
      <path d={areaPath} fill="#ede9fe" />
      <path d={linePath} fill="none" stroke="#6d28d9" strokeWidth="2.5" />
      {points.map(([x, yy], i) => (
        <g key={PROGRESS_MONTHS[i].label}>
          <circle cx={x} cy={yy} r="3.5" fill="#6d28d9" />
          <text x={x} y={yy - 10} className="pil-point-label" textAnchor="middle">{PROGRESS_MONTHS[i].value}%</text>
          <text x={x} y={H - 6} className="pil-axis" textAnchor="middle">{PROGRESS_MONTHS[i].label}</text>
        </g>
      ))}
    </svg>
  )
}

function BudgetDonutChart() {
  const cx = 90, cy = 90, outer = 78, inner = 50
  const offsets = BUDGET_BREAKDOWN.map((_, index) =>
    BUDGET_BREAKDOWN.slice(0, index).reduce((sum, item) => sum + item.percent, 0) / 100)
  const slices = BUDGET_BREAKDOWN.map((item, index) => {
    const from = offsets[index]
    const to = from + item.percent / 100
    const point = (ratio: number, r: number) => {
      const angle = -Math.PI / 2 + ratio * Math.PI * 2
      return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as const
    }
    const [x1, y1] = point(from, outer)
    const [x2, y2] = point(to, outer)
    const [xi2, yi2] = point(to, inner)
    const [xi1, yi1] = point(from, inner)
    const large = to - from > 0.5 ? 1 : 0
    return { ...item, path: `M ${x1} ${y1} A ${outer} ${outer} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${inner} ${inner} 0 ${large} 0 ${xi1} ${yi1} Z` }
  })

  return (
    <div className="pil-donut-layout">
      <svg viewBox="0 0 180 180" className="pil-donut-svg" role="img" aria-label="Répartition du budget consommé">
        {slices.map((slice) => <path key={slice.label} d={slice.path} fill={slice.color} />)}
        <text x={cx} y={cy - 6} textAnchor="middle" className="pil-donut-value">85 430 000</text>
        <text x={cx} y={cy + 12} textAnchor="middle" className="pil-donut-unit">FCFA</text>
        <text x={cx} y={cy + 28} textAnchor="middle" className="pil-donut-sub">Consommé</text>
      </svg>
      <ul className="pil-donut-legend">
        {BUDGET_BREAKDOWN.map((item) => (
          <li key={item.label}>
            <i style={{ background: item.color }} />
            <span>{item.label}</span>
            <b>{item.percent}%</b>
          </li>
        ))}
      </ul>
    </div>
  )
}

function CircularProgress({ value }: { value: number }) {
  const r = 15, c = 2 * Math.PI * r
  const color = value >= 90 ? '#16a34a' : value >= 60 ? '#7c3aed' : value >= 40 ? '#f59e0b' : '#dc2626'
  return (
    <svg width="38" height="38" viewBox="0 0 38 38" className="pil-ring">
      <circle cx="19" cy="19" r={r} fill="none" stroke="#e5e0f5" strokeWidth="4" />
      <circle
        cx="19" cy="19" r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c - (value / 100) * c} transform="rotate(-90 19 19)"
      />
      <text x="19" y="23" textAnchor="middle" className="pil-ring-text">{value}%</text>
    </svg>
  )
}

const KPIS = [
  { icon: <Briefcase size={18} />, tone: 'purple', label: 'PROJETS ACTIFS', value: '96', sub: '75,00% du total' },
  { icon: <TrendingUp size={18} />, tone: 'green', label: 'AVANCEMENT GLOBAL', value: '68%', sub: '+ 8% vs période précédente', bar: 68, barColor: '#16a34a' },
  { icon: <Users size={18} />, tone: 'blue', label: 'EHS CONSOMMÉS', value: '1 746,50 EHS', sub: 'Sur 2 560,00 EHS prévus', bar: 68, barColor: '#3b82f6' },
  { icon: <Clock size={18} />, tone: 'orange', label: 'EHS RESTANTS', value: '813,50 EHS', sub: 'À consommer', bar: 32, barColor: '#f59e0b' },
  { icon: <Hourglass size={18} />, tone: 'slate', label: 'DURÉE RESTANTE', value: '80 jours', sub: 'Sur 245 jours prévus', bar: 33, barColor: '#4c3a8f' },
]

export default function PilotagePage() {
  const [search, setSearch] = useState('')
  const [chef, setChef] = useState('Tous')
  const [client, setClient] = useState('Tous')
  const [statut, setStatut] = useState('Tous')
  const [division, setDivision] = useState('Toutes')
  const [priorite, setPriorite] = useState('Toutes')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)
  const [exportOpen, setExportOpen] = useState(false)
  const [autoSync, setAutoSync] = useState(true)

  const filtered = useMemo(() => ALL_PROJECTS.filter((p) => {
    if (chef !== 'Tous' && p.chef !== chef) return false
    if (client !== 'Tous' && p.client !== client) return false
    if (statut !== 'Tous' && p.statut !== statut) return false
    if (division !== 'Toutes' && p.division !== division) return false
    if (priorite !== 'Toutes' && p.priorite !== priorite) return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      if (!p.name.toLowerCase().includes(q) && !p.code.toLowerCase().includes(q) && !p.client.toLowerCase().includes(q)) return false
    }
    return true
  }), [chef, client, statut, division, priorite, search])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const paginated = filtered.slice((currentPage - 1) * pageSize, (currentPage - 1) * pageSize + pageSize)

  const resetFilters = () => {
    setSearch(''); setChef('Tous'); setClient('Tous'); setStatut('Tous'); setDivision('Toutes'); setPriorite('Toutes'); setPage(1)
  }

  return (
    <section className="pil-page">
      <div className="pil-toolbar">
        <button type="button" className="pil-daterange"><Calendar size={14} />01/05/2025 → 31/12/2025</button>
        <button type="button" className="pil-btn-outline"><SlidersHorizontal size={14} />Filtres avancés</button>
        <div className="pil-export-wrap">
          <button type="button" className="pil-btn-primary" onClick={() => setExportOpen((open) => !open)}>
            <Download size={14} />Exporter<ChevronDown size={12} />
          </button>
          {exportOpen && (
            <ul className="pil-export-menu" onMouseLeave={() => setExportOpen(false)}>
              <li><button type="button" onClick={() => setExportOpen(false)}>Exporter en PDF</button></li>
              <li><button type="button" onClick={() => setExportOpen(false)}>Exporter en Excel</button></li>
              <li><button type="button" onClick={() => setExportOpen(false)}>Exporter en CSV</button></li>
            </ul>
          )}
        </div>
      </div>

      <div className="pil-kpis">
        {KPIS.map((kpi) => (
          <article key={kpi.label} className={`pil-kpi pil-kpi-${kpi.tone}`}>
            <div className="pil-kpi-head">
              <span className="pil-kpi-icon">{kpi.icon}</span>
              <span>{kpi.label}</span>
            </div>
            <strong>{kpi.value}</strong>
            <small>{kpi.sub}</small>
            {kpi.bar !== undefined && <div className="pil-kpi-bar"><i style={{ width: `${kpi.bar}%`, background: kpi.barColor }} /></div>}
          </article>
        ))}
      </div>

      <div className="pil-charts">
        <div className="pil-panel">
          <div className="pil-panel-head"><h3>Consommation EHS par mois</h3></div>
          <ul className="pil-legend">
            <li><i style={{ background: '#c4b5fd' }} />EHS prévus</li>
            <li><i style={{ background: '#6d28d9' }} />EHS consommés</li>
            <li><i className="pil-legend-line" />Taux de consommation</li>
          </ul>
          <EhsMonthChart />
        </div>
        <div className="pil-panel">
          <div className="pil-panel-head"><h3>Évolution de l'avancement global</h3></div>
          <ProgressLineChart />
        </div>
        <div className="pil-panel">
          <div className="pil-panel-head"><h3>Répartition du budget consommé</h3></div>
          <BudgetDonutChart />
        </div>
      </div>

      <div className="pil-filters">
        <label>Chef de projet
          <select value={chef} onChange={(event) => { setChef(event.target.value); setPage(1) }}>
            <option>Tous</option>
            {CHEF_OPTIONS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label>Client
          <select value={client} onChange={(event) => { setClient(event.target.value); setPage(1) }}>
            <option>Tous</option>
            {CLIENT_OPTIONS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label>Statut
          <select value={statut} onChange={(event) => { setStatut(event.target.value); setPage(1) }}>
            <option>Tous</option>
            {STATUT_OPTIONS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label>Division
          <select value={division} onChange={(event) => { setDivision(event.target.value); setPage(1) }}>
            <option>Toutes</option>
            {DIVISIONS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </label>
        <label>Priorité
          <select value={priorite} onChange={(event) => { setPriorite(event.target.value); setPage(1) }}>
            <option>Toutes</option>
            {PRIORITES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <label className="pil-search">
          <Search size={14} />
          <input placeholder="Rechercher un projet..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} />
        </label>
        <button type="button" className="pil-reset" onClick={resetFilters}><RotateCcw size={14} />Réinitialiser</button>
      </div>

      <div className="pil-table-panel">
        <div className="pil-table-head"><h3>Liste des projets ({filtered.length})</h3></div>
        <div className="pil-table-wrap">
          <table className="pil-table">
            <thead>
              <tr>
                <th rowSpan={2}>Code projet</th>
                <th rowSpan={2}>Nom du projet</th>
                <th rowSpan={2}>Client</th>
                <th rowSpan={2}>Chef de projet</th>
                <th rowSpan={2}>Début</th>
                <th rowSpan={2}>Fin</th>
                <th rowSpan={2}>Statut</th>
                <th colSpan={3}>Total EHS</th>
                <th colSpan={3}>Total Monétaire (FCFA)</th>
                <th colSpan={3}>Durée (jours)</th>
                <th colSpan={3}>Progression</th>
                <th rowSpan={2}>Avancement global</th>
                <th rowSpan={2}>Statut global</th>
                <th rowSpan={2}></th>
              </tr>
              <tr>
                <th>Prévu</th><th>Consommé</th><th>Restant</th>
                <th>Budget prévu</th><th>Consommé</th><th>Restant</th>
                <th>Prévue</th><th>Écoulée</th><th>Restante</th>
                <th>Temporelle</th><th>EHS</th><th>Monétaire</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((p) => (
                <tr key={p.code}>
                  <td className="pil-code">{p.code}</td>
                  <td className="pil-name">{p.name}</td>
                  <td>{p.client}</td>
                  <td>{p.chef}</td>
                  <td>{p.debut}</td>
                  <td>{p.fin}</td>
                  <td><span className={`pil-pill pil-pill-${statutClass(p.statut)}`}>{p.statut}</span></td>
                  <td>{fmtEhs(p.ehsPrevu)}</td>
                  <td>{fmtEhs(p.ehsConsomme)}</td>
                  <td>{fmtEhs(p.ehsRestant)}</td>
                  <td>{fmtInt(p.budgetPrevu)}</td>
                  <td>{fmtInt(p.budgetConsomme)}</td>
                  <td>{fmtInt(p.budgetRestant)}</td>
                  <td>{p.dureePrevue}</td>
                  <td>{p.dureeEcoulee}</td>
                  <td>{p.dureeRestante}</td>
                  <td>{p.progTemporelle}%</td>
                  <td>{p.progEhs}%</td>
                  <td>{p.progMonetaire}%</td>
                  <td><CircularProgress value={p.avancementGlobal} /></td>
                  <td><span className={`pil-status-global pil-status-${statutGlobalClass(p.statutGlobal)}`}><i />{p.statutGlobal}</span></td>
                  <td><button type="button" className="pil-row-action" aria-label="Actions"><MoreVertical size={14} /></button></td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr><td colSpan={20} className="pil-empty">Aucun projet ne correspond à ces filtres.</td></tr>
              )}
            </tbody>
          </table>
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

      <div className="pil-sync-bar">
        <span><RefreshCw size={13} />Dernière synchronisation : 20/05/2025 à 16:20</span>
        <button type="button" className={`pil-toggle ${autoSync ? 'is-on' : ''}`} onClick={() => setAutoSync((v) => !v)}>
          <i /><span>Mise à jour automatique {autoSync ? 'activée' : 'désactivée'}</span>
        </button>
      </div>
    </section>
  )
}
