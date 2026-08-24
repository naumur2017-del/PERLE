import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Boxes, Briefcase, Calendar, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight,
  ClipboardList, Columns3, Download, Gauge, GripVertical, Hourglass, Info, MoreVertical,
  RotateCcw, Search, SlidersHorizontal, Users, Wallet,
} from 'lucide-react'
import './PilotagePage.css'

interface Project {
  code: string
  name: string
  client: string
  chef: string
  equipe: string
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
  progOperationnelle: number
  avancementGlobal: number
  statutGlobal: 'En bonne voie' | 'À surveiller' | 'Terminé' | 'En retard'
}

const CLIENTS = ['Cabinet Conseil X', 'Société ABC', 'Industries SA', 'Groupe ZETA', 'Holding MBDA', 'Ministère Y', 'Entreprise DEF', 'Client International', 'Banque Centrale', 'Groupe Atlantique', 'SARL Nova', 'Fondation Koré']
const CHEFS = ['Ajara Lamare', 'Herman Tsaffock', 'Pamela G.', 'Belomo Edwige', 'Ibrahim M.', 'Essogo Erine', 'Théodore Bessala', 'Brayan Ebongue', 'Nadine Fokou', 'Serge Amougou']
const EQUIPES = ['BO – Back Office', 'MO – Maîtrise d’œuvre', 'FO – Fonctions support', 'OP – Opérations', 'PI – Pilotage et amélioration', 'IT – Systèmes d’information', 'RES – Ressources']
const PRIORITES = ['Haute', 'Moyenne', 'Basse']
const NAME_BASES = [
  'ERP Academy', 'Mission Audit Interne', 'Étude de faisabilité usine', 'Digitalisation RH', 'Refonte SI Comptable',
  'Formation 200 Agents', 'Implémentation CRM', 'Étude marché RDC', 'Optimisation supply chain', 'Déploiement ERP filiale',
  'Migration cloud', 'Refonte site institutionnel', 'Audit sécurité SI', 'Programme qualité ISO', "Plan de formation cadres",
  "Étude d'impact environnemental", 'Modernisation réseau', 'Déploiement paie SIRH', 'Cartographie des risques', 'Refonte processus achats',
]

const AVATAR_COLORS = ['#6b46c1', '#3b82f6', '#16a34a', '#f59e0b', '#db2777', '#0d9488', '#4338ca', '#dc2626']

function hashName(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return hash
}

const avatarColor = (name: string) => AVATAR_COLORS[hashName(name) % AVATAR_COLORS.length]
const initials = (name: string) => name.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()

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

function parseFrDate(str: string): Date {
  const [d, m, y] = str.split('/').map(Number)
  return new Date(y, m - 1, d)
}

const dureeEnJours = (debut: string, fin: string) => Math.round((parseFrDate(fin).getTime() - parseFrDate(debut).getTime()) / 86400000)

const pctOf = (consomme: number, prevu: number) => prevu ? Math.round((consomme / prevu) * 100) : 0

type RiskLetter = 'A' | 'B' | 'C' | 'D'

function classifyRisk(pct: number): { letter: RiskLetter; label: string } {
  if (pct <= 25) return { letter: 'A', label: 'Faible' }
  if (pct <= 50) return { letter: 'B', label: 'Modérée' }
  if (pct <= 75) return { letter: 'C', label: 'Élevée' }
  return { letter: 'D', label: 'Critique' }
}

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
  const equipe = EQUIPES[Math.floor(rnd() * EQUIPES.length)]
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
  const progOperationnelle = Math.round(tauxBudget * 100)
  const avancementGlobal = Math.round(progTemporelle * 0.3 + progEhs * 0.35 + progOperationnelle * 0.35)

  const statut = statutFromProgress(dureeEcoulee, dureePrevue, avancementGlobal)
  const drift = progTemporelle - avancementGlobal
  const statutGlobal = statutGlobalFromDrift(statut, drift)

  const debutDate = addDays(new Date(2025, 0, 1), Math.floor(rnd() * 200))
  const finDate = addDays(debutDate, dureePrevue)

  return {
    code, name, client, chef, equipe, priorite,
    debut: fmtDate(debutDate), fin: fmtDate(finDate),
    statut, ehsPrevu, ehsConsomme, ehsRestant,
    budgetPrevu, budgetConsomme, budgetRestant,
    dureePrevue, dureeEcoulee, dureeRestante,
    progTemporelle, progEhs, progOperationnelle, avancementGlobal, statutGlobal,
  }
}

const FIXED_PROJECTS: Project[] = [
  { code: 'PRJ.001', name: 'ERP Academy', client: 'Cabinet Conseil X', chef: 'Ajara Lamare', equipe: 'IT – Systèmes d’information', priorite: 'Haute', debut: '01/05/2025', fin: '31/12/2025', statut: 'En cours', ehsPrevu: 256, ehsConsomme: 174.5, ehsRestant: 81.5, budgetPrevu: 125000000, budgetConsomme: 85430000, budgetRestant: 39570000, dureePrevue: 245, dureeEcoulee: 165, dureeRestante: 80, progTemporelle: 67, progEhs: 68, progOperationnelle: 62, avancementGlobal: 68, statutGlobal: 'En bonne voie' },
  { code: 'PRJ.002', name: 'Mission Audit Interne', client: 'Société ABC', chef: 'Herman Tsaffock', equipe: 'PI – Pilotage et amélioration', priorite: 'Moyenne', debut: '15/03/2025', fin: '15/07/2025', statut: 'En cours', ehsPrevu: 110, ehsConsomme: 72.4, ehsRestant: 37.6, budgetPrevu: 55000000, budgetConsomme: 36100000, budgetRestant: 18900000, dureePrevue: 123, dureeEcoulee: 88, dureeRestante: 35, progTemporelle: 72, progEhs: 66, progOperationnelle: 58, avancementGlobal: 67, statutGlobal: 'À surveiller' },
  { code: 'PRJ.003', name: 'Étude de faisabilité usine', client: 'Industries SA', chef: 'Pamela G.', equipe: 'OP – Opérations', priorite: 'Haute', debut: '10/04/2025', fin: '10/08/2025', statut: 'En cours', ehsPrevu: 95, ehsConsomme: 60, ehsRestant: 35, budgetPrevu: 40000000, budgetConsomme: 22800000, budgetRestant: 17200000, dureePrevue: 123, dureeEcoulee: 67, dureeRestante: 56, progTemporelle: 49, progEhs: 57, progOperationnelle: 45, avancementGlobal: 54, statutGlobal: 'À surveiller' },
  { code: 'PRJ.004', name: 'Digitalisation RH', client: 'Groupe ZETA', chef: 'Belomo Edwige', equipe: 'FO – Fonctions support', priorite: 'Moyenne', debut: '05/02/2025', fin: '05/06/2025', statut: 'Terminé', ehsPrevu: 80, ehsConsomme: 76, ehsRestant: 4, budgetPrevu: 58700000, budgetConsomme: 58700000, budgetRestant: 1300000, dureePrevue: 120, dureeEcoulee: 120, dureeRestante: 0, progTemporelle: 100, progEhs: 95, progOperationnelle: 100, avancementGlobal: 99, statutGlobal: 'Terminé' },
  { code: 'PRJ.005', name: 'Refonte SI Comptable', client: 'Holding MBDA', chef: 'Ibrahim M.', equipe: 'BO – Back Office', priorite: 'Haute', debut: '20/03/2025', fin: '20/09/2025', statut: 'En cours', ehsPrevu: 160, ehsConsomme: 89.1, ehsRestant: 70.9, budgetPrevu: 90000000, budgetConsomme: 42600000, budgetRestant: 47400000, dureePrevue: 185, dureeEcoulee: 95, dureeRestante: 90, progTemporelle: 51, progEhs: 47, progOperationnelle: 40, avancementGlobal: 48, statutGlobal: 'À surveiller' },
  { code: 'PRJ.006', name: 'Formation 200 Agents', client: 'Ministère Y', chef: 'Essogo Erine', equipe: 'RES – Ressources', priorite: 'Basse', debut: '01/05/2025', fin: '30/11/2025', statut: 'En cours', ehsPrevu: 130, ehsConsomme: 46.8, ehsRestant: 63.2, budgetPrevu: 40000000, budgetConsomme: 18400000, budgetRestant: 21600000, dureePrevue: 214, dureeEcoulee: 61, dureeRestante: 153, progTemporelle: 28, progEhs: 36, progOperationnelle: 30, avancementGlobal: 40, statutGlobal: 'En retard' },
  { code: 'PRJ.007', name: 'Implémentation CRM', client: 'Entreprise DEF', chef: 'Théodore Bessala', equipe: 'MO – Maîtrise d’œuvre', priorite: 'Moyenne', debut: '18/01/2025', fin: '18/05/2025', statut: 'Terminé', ehsPrevu: 60, ehsConsomme: 60, ehsRestant: 0, budgetPrevu: 35000000, budgetConsomme: 34200000, budgetRestant: 800000, dureePrevue: 120, dureeEcoulee: 120, dureeRestante: 0, progTemporelle: 100, progEhs: 100, progOperationnelle: 98, avancementGlobal: 100, statutGlobal: 'Terminé' },
  { code: 'PRJ.008', name: 'Étude marché RDC', client: 'Client International', chef: 'Brayan Ebongue', equipe: 'OP – Opérations', priorite: 'Basse', debut: '12/05/2025', fin: '12/10/2025', statut: 'En retard', ehsPrevu: 50, ehsConsomme: 11, ehsRestant: 39, budgetPrevu: 18000000, budgetConsomme: 6400000, budgetRestant: 11600000, dureePrevue: 155, dureeEcoulee: 23, dureeRestante: 132, progTemporelle: 15, progEhs: 36, progOperationnelle: 22, avancementGlobal: 29, statutGlobal: 'En retard' },
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

const statutGlobalClass = (s: Project['statutGlobal']) => s === 'En bonne voie' ? 'bonne-voie' : s === 'À surveiller' ? 'surveiller' : s === 'Terminé' ? 'termine' : 'retard'

function getPageList(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '...', current - 1, current, current + 1, '...', total]
}

interface BudgetLine {
  code: string
  name: string
  intitule: string
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

const BUDGET_LINE_DEFS = [
  { code: 'BL-01', name: 'Ressources humaines', intitule: 'Charges de personnel affecté au projet' },
  { code: 'BL-02', name: 'Déplacements terrain', intitule: 'Frais de mission et déplacements sur site' },
  { code: 'BL-03', name: 'Acquisition matériel', intitule: "Achat d'équipements et de matériel technique" },
  { code: 'BL-04', name: 'Sous-traitance', intitule: 'Prestations sous-traitées à des tiers' },
  { code: 'BL-05', name: 'Autres charges', intitule: 'Charges diverses non affectées' },
]
const BUDGET_LINE_WEIGHTS = [0.40, 0.15, 0.12, 0.20, 0.13]

function buildBudgetLines(project: Project): BudgetLine[] {
  const rnd = mulberry32(hashName(project.code))
  const tauxEhsBase = project.ehsPrevu ? project.ehsConsomme / project.ehsPrevu : 0
  const tauxBudgetBase = project.budgetPrevu ? project.budgetConsomme / project.budgetPrevu : 0
  let ehsAccum = 0
  let budgetAccum = 0

  return BUDGET_LINE_DEFS.map(({ code, name, intitule }, index) => {
    const isLast = index === BUDGET_LINE_DEFS.length - 1
    const weight = BUDGET_LINE_WEIGHTS[index]

    const ehsPrevu = isLast
      ? Math.round((project.ehsPrevu - ehsAccum) * 100) / 100
      : Math.round(project.ehsPrevu * weight * 100) / 100
    ehsAccum += ehsPrevu

    const budgetPrevu = isLast
      ? Math.max(0, Math.round((project.budgetPrevu - budgetAccum) / 10000) * 10000)
      : Math.round((project.budgetPrevu * weight) / 10000) * 10000
    budgetAccum += budgetPrevu

    const tauxEhs = Math.min(1, Math.max(0, tauxEhsBase + (rnd() - 0.5) * 0.2))
    const ehsConsomme = Math.round(ehsPrevu * tauxEhs * 100) / 100
    const ehsRestant = Math.round((ehsPrevu - ehsConsomme) * 100) / 100

    const tauxBudget = Math.min(1, Math.max(0, tauxBudgetBase + (rnd() - 0.5) * 0.2))
    const budgetConsomme = Math.round((budgetPrevu * tauxBudget) / 1000) * 1000
    const budgetRestant = Math.max(0, budgetPrevu - budgetConsomme)

    const progTemporelle = Math.min(100, Math.max(0, Math.round(project.progTemporelle + (rnd() - 0.5) * 20)))
    const progEhs = ehsPrevu ? Math.round((ehsConsomme / ehsPrevu) * 100) : 0
    const progOperationnelle = Math.min(100, Math.max(0, Math.round(project.progOperationnelle + (rnd() - 0.5) * 20)))

    return { code, name, intitule, ehsPrevu, ehsConsomme, ehsRestant, budgetPrevu, budgetConsomme, budgetRestant, progTemporelle, progEhs, progOperationnelle }
  })
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="pil-mini-bar">
      <div className="pil-mini-bar-track"><span style={{ width: `${value}%`, background: color }} /></div>
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
  | 'code' | 'name' | 'client' | 'chef' | 'equipe' | 'debut' | 'fin' | 'duree'
  | 'ehsPrevu' | 'ehsConsomme' | 'ehsRestant' | 'ehsPct'
  | 'budgetPrevu' | 'budgetConsomme' | 'budgetRestant' | 'budgetPct'
  | 'eqEhsPrevu' | 'eqEhsConsomme' | 'eqEhsRestant' | 'eqEhsPct'
  | 'progTemporelle' | 'progEhs' | 'progOperationnelle'
  | 'statutRisque' | 'statutGlobal'

const COLUMNS: { id: ColumnId; label: string; group?: string }[] = [
  { id: 'code', label: 'Code projet' },
  { id: 'name', label: 'Nom du projet' },
  { id: 'client', label: 'Client' },
  { id: 'chef', label: 'Chef de projet' },
  { id: 'equipe', label: 'Équipe' },
  { id: 'debut', label: 'Début' },
  { id: 'fin', label: 'Fin' },
  { id: 'duree', label: 'Durée' },
  { id: 'ehsPrevu', label: 'Prévu', group: 'Total EHS' },
  { id: 'ehsConsomme', label: 'Consommé', group: 'Total EHS' },
  { id: 'ehsRestant', label: 'Restant', group: 'Total EHS' },
  { id: 'ehsPct', label: '%', group: 'Total EHS' },
  { id: 'budgetPrevu', label: 'Prévu', group: 'Total Monétaire (FCFA)' },
  { id: 'budgetConsomme', label: 'Consommé', group: 'Total Monétaire (FCFA)' },
  { id: 'budgetRestant', label: 'Restant', group: 'Total Monétaire (FCFA)' },
  { id: 'budgetPct', label: '%', group: 'Total Monétaire (FCFA)' },
  { id: 'eqEhsPrevu', label: 'Prévu', group: 'Équivalent EHS' },
  { id: 'eqEhsConsomme', label: 'Consommé', group: 'Équivalent EHS' },
  { id: 'eqEhsRestant', label: 'Restant', group: 'Équivalent EHS' },
  { id: 'eqEhsPct', label: '%', group: 'Équivalent EHS' },
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
  chef: {
    render: (p) => (
      <div className="pil-chef-cell">
        <span className="pil-avatar" style={{ background: avatarColor(p.chef) }}>{initials(p.chef)}</span>
        {p.chef}
      </div>
    ),
  },
  equipe: { render: (p) => p.equipe },
  debut: { render: (p) => p.debut },
  fin: { render: (p) => p.fin },
  duree: { render: (p) => `${dureeEnJours(p.debut, p.fin)} jours` },
  ehsPrevu: { render: (p) => fmtEhs(p.ehsPrevu) },
  ehsConsomme: { render: (p) => fmtEhs(p.ehsConsomme) },
  ehsRestant: { render: (p) => fmtEhs(p.ehsRestant) },
  ehsPct: { render: (p) => <PctCell consomme={p.ehsConsomme} prevu={p.ehsPrevu} /> },
  budgetPrevu: { render: (p) => fmtInt(p.budgetPrevu) },
  budgetConsomme: { render: (p) => fmtInt(p.budgetConsomme) },
  budgetRestant: { render: (p) => fmtInt(p.budgetRestant) },
  budgetPct: { render: (p) => <PctCell consomme={p.budgetConsomme} prevu={p.budgetPrevu} /> },
  eqEhsPrevu: { render: (p) => fmtEhs(p.ehsPrevu) },
  eqEhsConsomme: { render: (p) => fmtEhs(p.ehsConsomme) },
  eqEhsRestant: { render: (p) => fmtEhs(p.ehsRestant) },
  eqEhsPct: { render: (p) => <PctCell consomme={p.ehsConsomme} prevu={p.ehsPrevu} /> },
  progTemporelle: { render: (p) => <ProgressBar value={p.progTemporelle} color="#3b82f6" /> },
  progEhs: { render: (p) => <ProgressBar value={p.progEhs} color="#16a34a" /> },
  progOperationnelle: { render: (p) => <ProgressBar value={p.progOperationnelle} color="#6b46c1" /> },
  statutRisque: {
    render: (p) => (
      <div className="pil-risk-cell">
        <RiskBadge letter={classifyRisk(pctOf(p.ehsConsomme, p.ehsPrevu)).letter} />
        <RiskBadge letter={classifyRisk(pctOf(p.budgetConsomme, p.budgetPrevu)).letter} />
        <RiskBadge letter={classifyRisk(pctOf(p.ehsConsomme, p.ehsPrevu)).letter} />
      </div>
    ),
  },
  statutGlobal: {
    render: (p) => (
      <span className={`pil-status-global pil-status-${statutGlobalClass(p.statutGlobal)}`}><i />{p.statutGlobal}</span>
    ),
  },
}

const KPIS = [
  { icon: <Briefcase size={18} />, tone: 'purple', label: 'PROJETS ACTIFS', value: '96', sub: '75,00% du total', pct: 75, bar: 75, barColor: '#6b46c1' },
  { icon: <Users size={18} />, tone: 'blue', label: 'EHS CONSOMMÉS', value: '1 746,50 EHS', sub: 'Sur 2 560,00 EHS prévus', pct: 68, bar: 68, barColor: '#3b82f6' },
  { icon: <Boxes size={18} />, tone: 'teal', label: 'ÉQUIVALENCE EHS CONSOMMÉ', value: '1 324,60 EHS', sub: 'Sur 1 950,00 EHS prévus', pct: 68, bar: 68, barColor: '#0d9488' },
  { icon: <Wallet size={18} />, tone: 'green', label: 'MONTANTS CONSOMMÉS', value: '682 400 000 FCFA', sub: 'Sur 980 000 000 FCFA prévus', pct: 70, bar: 70, barColor: '#16a34a' },
  { icon: <Hourglass size={18} />, tone: 'slate', label: 'DURÉE CONSOMMÉE', value: '165 jours', sub: 'Sur 245 jours prévus', pct: 67, bar: 67, barColor: '#4c3a8f' },
  { icon: <Gauge size={18} />, tone: 'indigo', label: 'PROGRESSION OPÉRATIONNELLE', value: '62%', sub: 'Taux global opérationnel', pct: 62, bar: 62, barColor: '#4338ca' },
]

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
  const [search, setSearch] = useState('')
  const [chef, setChef] = useState('Tous')
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
    if (!focusTarget) return
    const idx = ALL_PROJECTS.findIndex((p) => p.code === focusTarget.projetCode)
    if (idx === -1) { onFocusConsumed?.(); return }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets local filters in response to an external navigation command (focusTarget), not derived from render
    setSearch(''); setChef('Tous'); setClient('Tous'); setStatut('Tous'); setEquipe('Toutes')
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
  }, [focusTarget])

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

  const filtered = useMemo(() => ALL_PROJECTS.filter((p) => {
    if (chef !== 'Tous' && p.chef !== chef) return false
    if (client !== 'Tous' && p.client !== client) return false
    if (statut !== 'Tous' && p.statut !== statut) return false
    if (equipe !== 'Toutes' && p.equipe !== equipe) return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      if (!p.name.toLowerCase().includes(q) && !p.code.toLowerCase().includes(q) && !p.client.toLowerCase().includes(q)) return false
    }
    return true
  }), [chef, client, statut, equipe, search])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const paginated = filtered.slice((currentPage - 1) * pageSize, (currentPage - 1) * pageSize + pageSize)

  const resetFilters = () => {
    setSearch(''); setChef('Tous'); setClient('Tous'); setStatut('Tous'); setEquipe('Toutes'); setPage(1)
  }

  return (
    <section className="pil-page">
      <nav className="pil-subtabs">
        <button className="active" onClick={() => navigateTo('pilotage')}><ClipboardList size={14} />Pilotage des projets et gestion budgétaire</button>
        <button onClick={() => navigateTo('controle-taches')}><CheckCircle2 size={14} />Contrôle des tâches</button>
        <button onClick={() => navigateTo('controle-execution')}><Gauge size={14} />Performance & Staffing</button>
      </nav>

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
              <span className="pil-kpi-pct">{kpi.pct}%</span>
            </div>
            <strong>{kpi.value}</strong>
            <small>{kpi.sub}</small>
            {kpi.bar !== undefined && <div className="pil-kpi-bar"><i style={{ width: `${kpi.bar}%`, background: kpi.barColor }} /></div>}
          </article>
        ))}
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
        <label>Équipe
          <select value={equipe} onChange={(event) => { setEquipe(event.target.value); setPage(1) }}>
            <option>Toutes</option>
            {EQUIPES.map((e) => <option key={e}>{e}</option>)}
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
                      <td><button type="button" className="pil-row-action" aria-label="Actions"><MoreVertical size={14} /></button></td>
                    </tr>
                    {isExpanded && (
                      <tr className="pil-expand-row">
                        <td colSpan={totalColSpan} className="pil-expand-cell">
                          <div className="pil-budget-lines">
                            <table className="pil-subtable">
                              <thead>
                                <tr>
                                  <th colSpan={3}>Lignes budgétaires</th>
                                  <th colSpan={3}>Total EHS</th>
                                  <th colSpan={3}>Total Monétaire (FCFA)</th>
                                  <th colSpan={3}>Équivalent EHS</th>
                                  <th colSpan={3}>Progression</th>
                                  <th rowSpan={2}>Actions</th>
                                </tr>
                                <tr>
                                  <th>Code</th><th>Nom Standard</th><th>Intitulé</th>
                                  <th>Prévu</th><th>Consommé</th><th>Restant</th>
                                  <th>Prévu</th><th>Consommé</th><th>Restant</th>
                                  <th>Prévu</th><th>Consommé</th><th>Restant</th>
                                  <th>Temporelle</th><th>Équivalent EHS</th><th>Opérationnelle</th>
                                </tr>
                              </thead>
                              <tbody>
                                {buildBudgetLines(p).map((line) => (
                                  <tr
                                    key={line.code}
                                    id={`pil-ligne-${p.code}-${line.code}`}
                                    className={highlightedLigne === `${p.code}:${line.code}` ? 'pil-line-highlight' : undefined}
                                  >
                                    <td className="pil-line-code">{line.code}</td>
                                    <td className="pil-line-name"><GripVertical size={12} className="pil-drag-handle" />{line.name}</td>
                                    <td className="pil-line-intitule">{line.intitule}</td>
                                    <td>{fmtEhs(line.ehsPrevu)}</td>
                                    <td>{fmtEhs(line.ehsConsomme)}</td>
                                    <td>{fmtEhs(line.ehsRestant)}</td>
                                    <td>{fmtInt(line.budgetPrevu)}</td>
                                    <td>{fmtInt(line.budgetConsomme)}</td>
                                    <td>{fmtInt(line.budgetRestant)}</td>
                                    <td>{fmtEhs(line.ehsPrevu)}</td>
                                    <td>{fmtEhs(line.ehsConsomme)}</td>
                                    <td>{fmtEhs(line.ehsRestant)}</td>
                                    <td><ProgressBar value={line.progTemporelle} color="#3b82f6" /></td>
                                    <td><ProgressBar value={line.progEhs} color="#16a34a" /></td>
                                    <td><ProgressBar value={line.progOperationnelle} color="#6b46c1" /></td>
                                    <td><button type="button" className="pil-row-action" aria-label="Actions"><MoreVertical size={14} /></button></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
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
            <strong>Logique de calcul du Statut :</strong> pour les colonnes Total EHS, Total Monétaire (FCFA) et Équivalent EHS, le taux <b>Consommé / Prévu</b> détermine un niveau de risque —
            {' '}<b>0 à 25 % = Faible (A)</b>, <b>26 à 50 % = Modérée (B)</b>, <b>51 à 75 % = Élevée (C)</b>, <b>76 % et plus = Critique (D)</b>.
            {' '}La colonne <b>Statut</b> reprend ces trois lettres, dans l'ordre EHS, Monétaire puis Équivalent EHS, pour donner une vue synthétique du niveau de risque du projet.
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
    </section>
  )
}
