// Accès aux endpoints d'agrégation des tableaux de bord de l'accueil
// (voir backend/accounts/dashboard.py).

import { apiGet } from './client'
import type { TeamSummary } from '../auth/session'

export type DashPeriod = 'month' | 'quarter' | 'year'

export interface FinancePoint { label: string; revenue: number; costs: number }
export interface CashPoint { label: string; inflow: number; outflow: number; balance: number }
export interface DeliverablePoint { label: string; delivered: number; in_progress: number; late: number }
export interface LabelValue { label: string; value: number }

export interface DashAlert {
  id: string
  level: 'high' | 'medium' | 'info'
  title: string
  detail: string
  target: string
}

export interface DirectionProject {
  code: string
  name: string
  manager: string
  progress: number
  budget_used: number
  budget: number
  margin: number
  status: string
  deadline: string
}

export interface DirectionDashboard {
  period: DashPeriod
  currency_code: string
  generated_at: string
  kpi: {
    revenue: number; revenue_delta: number
    margin: number; margin_delta: number
    active_projects: number; watch_projects: number
    occupancy: number; headcount: number
    cash: number; cash_delta: number
    late_tasks: number; late_tasks_delta: number
  }
  finance: FinancePoint[]
  cash: CashPoint[]
  budget_by_nature: LabelValue[]
  budget_by_department: LabelValue[]
  projects: DirectionProject[]
  team_load: { label: string; staffed: number; available: number; unavailable: number }[]
  ehs: { consumed: number; planned: number; by_department: { label: string; consumed: number; planned: number }[] }
  deliverables: DeliverablePoint[]
  alerts: DashAlert[]
}

export interface ManagerMember {
  id: number
  name: string
  fonction: string
  grade: number
  statut: string
  active_tasks: number
  hours: number
  avg_note: number | null
}

export interface ManagerProject {
  code: string
  name: string
  tasks_total: number
  tasks_done: number
  progress: number
  status: string
  last_activity: string
}

export interface ManagerDashboard {
  teams: TeamSummary[]
  team: TeamSummary
  currency_code: string
  period: DashPeriod
  generated_at: string
  kpi: {
    members: number; members_available: number
    active_tasks: number; late_tasks: number
    tasks_done_30d: number; avg_note: number | null
    hours_in_progress: number; projects_active: number
  }
  members: ManagerMember[]
  task_status: LabelValue[]
  task_validation: LabelValue[]
  tasks_trend: { label: string; done: number; created: number }[]
  projects: ManagerProject[]
  ehs: { consumed: number; by_month: LabelValue[] }
  workload: { label: string; hours: number; capacity: number }[]
  alerts: DashAlert[]
}

export const fetchDirectionDashboard = (period: DashPeriod): Promise<DirectionDashboard> =>
  apiGet<DirectionDashboard>(`/dashboard/direction/?period=${period}`)

export const fetchManagerDashboard = (period: DashPeriod, teamId?: number): Promise<ManagerDashboard> =>
  apiGet<ManagerDashboard>(`/dashboard/manager/?period=${period}${teamId ? `&team=${teamId}` : ''}`)
