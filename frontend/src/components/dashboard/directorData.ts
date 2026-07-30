// Jeux de données de démonstration du tableau de bord de direction (directeur =
// administrateur d'une entreprise cliente de PERLE). Montants en milliers de FCFA
// sauf mention contraire.

export type DirPeriod = 'month' | 'quarter' | 'year'

export const DIR_PERIOD_LABELS: Record<DirPeriod, string> = {
  month: 'Mois en cours',
  quarter: 'Trimestre en cours',
  year: 'Exercice 2026',
}

/** Palette du tableau de bord de direction, alignée sur le violet PERLE. */
export const DIR_COLORS = {
  primary: '#6b46c1',
  primaryLight: '#a78bfa',
  teal: '#0e8f9e',
  green: '#12864a',
  amber: '#c98a12',
  orange: '#b4620f',
  red: '#c9271b',
  slate: '#6b7194',
}

export const DIR_PALETTE = [DIR_COLORS.primary, DIR_COLORS.primaryLight, DIR_COLORS.teal, DIR_COLORS.green, DIR_COLORS.amber, DIR_COLORS.slate]

/** Formate un montant exprimé en milliers de FCFA. */
export const formatFcfa = (thousands: number) =>
  thousands >= 1000
    ? `${(thousands / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M FCFA`
    : `${thousands.toLocaleString('fr-FR')} k FCFA`

const MONTHS = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.']

/** Nombre de points affichés selon la période : 4 semaines, 3 mois ou 12 mois. */
export const dirBuckets = (period: DirPeriod): string[] =>
  period === 'month' ? ['S27', 'S28', 'S29', 'S30']
    : period === 'quarter' ? MONTHS.slice(4, 7)
      : MONTHS.slice(0, 7)

// --- 1. Performance financière ---------------------------------------------

export interface FinancePoint { label: string; revenue: number; costs: number }

const FINANCE_YEAR: [number, number][] = [
  [58200, 44100], [61400, 46800], [72500, 54200], [68900, 53100],
  [79300, 58700], [83600, 62400], [62100, 47900],
]

export function financeSeries(period: DirPeriod): FinancePoint[] {
  const labels = dirBuckets(period)
  const source = period === 'year' ? FINANCE_YEAR
    : period === 'quarter' ? FINANCE_YEAR.slice(4, 7)
      : [[16800, 12900], [18200, 13600], [15100, 11800], [12000, 9600]] as [number, number][]
  return labels.map((label, index) => ({ label, revenue: source[index][0], costs: source[index][1] }))
}

export const marginPercent = (point: FinancePoint) => ((point.revenue - point.costs) / point.revenue) * 100

// --- 2. Portefeuille de projets --------------------------------------------

export interface Project {
  code: string
  name: string
  manager: string
  progress: number
  budgetUsed: number
  budget: number
  margin: number
  status: 'En cours' | 'À surveiller' | 'En retard' | 'Terminé'
  deadline: string
}

export const projects: Project[] = [
  { code: 'PRJ.001', name: 'ERP Academy — refonte', manager: 'A. LAMARE', progress: 78, budgetUsed: 96400, budget: 124000, margin: 24.1, status: 'En cours', deadline: '30/09/2026' },
  { code: 'PRJ.002', name: 'Application mobile phase 2', manager: 'H. TSAFFOCK', progress: 62, budgetUsed: 71800, budget: 98000, margin: 19.7, status: 'En cours', deadline: '15/10/2026' },
  { code: 'PRJ.003', name: 'Déploiement régional CRM', manager: 'J. EKOUMA', progress: 45, budgetUsed: 68200, budget: 76000, margin: 8.4, status: 'À surveiller', deadline: '28/08/2026' },
  { code: 'PRJ.004', name: 'Programme qualité ISO', manager: 'M. NKOA', progress: 81, budgetUsed: 42100, budget: 54000, margin: 27.3, status: 'En cours', deadline: '12/09/2026' },
  { code: 'PRJ.005', name: 'Optimisation des opérations', manager: 'B. EDWIGE', progress: 34, budgetUsed: 51900, budget: 52500, margin: -2.1, status: 'En retard', deadline: '20/08/2026' },
  { code: 'PRJ.006', name: 'Infrastructure data center', manager: 'S. MBALLA', progress: 57, budgetUsed: 38600, budget: 61000, margin: 21.8, status: 'En cours', deadline: '05/11/2026' },
]

// --- 3. Répartition du budget ----------------------------------------------

export const budgetByNature = [
  { label: 'Tâches EHS (ressources)', value: 218400 },
  { label: 'Tâches monétaires (achats)', value: 142800 },
  { label: 'Charges transversales', value: 58600 },
  { label: 'Sous-traitance', value: 41200 },
  { label: 'Investissements', value: 24800 },
]

export const budgetByDepartment = [
  { label: 'Ingénierie', value: 164200 },
  { label: 'Opérations', value: 118500 },
  { label: 'Commercial', value: 74300 },
  { label: 'Support', value: 68400 },
  { label: 'Direction', value: 60400 },
]

// --- 4. Trésorerie ----------------------------------------------------------

export interface CashPoint { label: string; inflow: number; outflow: number; balance: number }

export function cashSeries(period: DirPeriod): CashPoint[] {
  const finance = financeSeries(period)
  // Les encaissements suivent la facturation avec un décalage, d'où l'écart au CA.
  let balance = period === 'year' ? 62000 : 88000
  return finance.map((point, index) => {
    const inflow = Math.round(point.revenue * (index === 0 ? 0.78 : 0.92))
    const outflow = Math.round(point.costs * 1.04)
    balance += inflow - outflow
    return { label: point.label, inflow, outflow, balance }
  })
}

// --- 5. Charge et disponibilité des équipes ---------------------------------

export const teamLoad = [
  { label: 'Ingénierie', staffed: 14, available: 3, unavailable: 1 },
  { label: 'Opérations', staffed: 11, available: 2, unavailable: 2 },
  { label: 'Commercial', staffed: 6, available: 4, unavailable: 0 },
  { label: 'Support', staffed: 7, available: 1, unavailable: 1 },
  { label: 'Direction', staffed: 3, available: 0, unavailable: 0 },
]

export const headcount = teamLoad.reduce((sum, team) => sum + team.staffed + team.available + team.unavailable, 0)
export const occupancyRate = Math.round((teamLoad.reduce((sum, team) => sum + team.staffed, 0) / headcount) * 100)

// --- 6. Consommation EHS ----------------------------------------------------

export const ehs = {
  consumed: 18420,
  planned: 24600,
  byDepartment: [
    { label: 'Ingénierie', consumed: 8240, planned: 10200 },
    { label: 'Opérations', consumed: 5180, planned: 6800 },
    { label: 'Commercial', consumed: 2060, planned: 3400 },
    { label: 'Support', consumed: 2140, planned: 3000 },
    { label: 'Direction', consumed: 800, planned: 1200 },
  ],
}

export const ehsRate = Math.round((ehs.consumed / ehs.planned) * 100)

// --- 7. Livrables et échéances ----------------------------------------------

export interface DeliverablePoint { label: string; delivered: number; inProgress: number; late: number }

export function deliverableSeries(period: DirPeriod): DeliverablePoint[] {
  const labels = dirBuckets(period)
  const source = [[12, 6, 1], [15, 4, 2], [9, 8, 3], [17, 5, 1], [14, 7, 2], [19, 4, 0], [11, 6, 2]]
  return labels.map((label, index) => ({
    label,
    delivered: source[index % source.length][0],
    inProgress: source[index % source.length][1],
    late: source[index % source.length][2],
  }))
}

// --- Alertes de direction ---------------------------------------------------

export interface DirAlert {
  id: string
  level: 'high' | 'medium' | 'info'
  title: string
  detail: string
  target: string
}

export const dirAlerts: DirAlert[] = [
  { id: 'DA-11', level: 'high', title: 'Budget dépassé sur PRJ.005', detail: '98,9 % du budget consommé pour 34 % d’avancement. Marge négative de 2,1 %.', target: 'pilotage' },
  { id: 'DA-12', level: 'high', title: '2 projets en retard de livraison', detail: 'PRJ.005 et PRJ.003 dépassent leur échéance prévisionnelle de plus de 10 jours.', target: 'pilotage' },
  { id: 'DA-13', level: 'medium', title: 'Commercial sous-staffé à 60 %', detail: '4 collaborateurs disponibles sur 10 : capacité non affectée sur le trimestre.', target: 'staffing' },
  { id: 'DA-14', level: 'medium', title: 'Trésorerie sous le seuil de confort', detail: 'Le solde projeté passe sous 80 M FCFA en septembre si les encaissements glissent.', target: 'tresorerie' },
  { id: 'DA-15', level: 'info', title: '5 échéances dans les 15 jours', detail: 'Cinq jalons contractuels arrivent à terme avant le 15/08/2026.', target: 'pilotage' },
]

// --- Indicateurs de tête ----------------------------------------------------

export const dirKpi = {
  revenue: 486000,
  revenueDelta: 8.4,
  margin: 22.6,
  marginDelta: 1.2,
  activeProjects: 12,
  watchProjects: 3,
  occupancy: occupancyRate,
  headcount,
  cash: 96400,
  cashDelta: -4.2,
  lateTasks: 5,
  lateTasksDelta: -2,
}
