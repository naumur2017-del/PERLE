import { apiDelete, apiGet, apiPatch, apiPost } from './client'
import type { TaskAssignment } from './taskAssignments'

export type TaskPriorite = 'haute' | 'moyenne' | 'basse'
export type TaskStatut = 'envoyee' | 'acceptee' | 'refusee'

export interface Task {
  id: number
  code: string
  template: number
  template_nom: string
  template_code: string
  template_details: string
  template_priorite_defaut: TaskPriorite
  description: string
  project: number | null
  project_nom: string | null
  project_code: string | null
  ligne_budgetaire: number
  ligne_budgetaire_nom: string
  ligne_budgetaire_code: string
  equipe: number
  equipe_nom: string
  equipe_code: string
  equipe_manager_nom: string | null
  echeance: string | null
  priorite: TaskPriorite
  priorite_display: string
  statut: TaskStatut
  statut_display: string
  statut_decide_le: string | null
  assignments: TaskAssignment[]
  budget_ligne_montant: number | null
  budget_reste_fcfa: number | null
  actif: boolean
  created_by_nom: string | null
  created_at: string
}

export interface TaskFormValues {
  template: number
  description?: string
  project?: number | null
  ligne_budgetaire: number
  echeance: string
  priorite: TaskPriorite
}

export const fetchTask = (id: number) => apiGet<Task>(`/tasks/${id}/`)

export const fetchTasks = (params?: { equipe?: number; assignee?: number; staffing?: boolean; aValider?: boolean }) => {
  const query = new URLSearchParams()
  if (params?.equipe) query.set('equipe', String(params.equipe))
  if (params?.assignee) query.set('assignee', String(params.assignee))
  if (params?.staffing) query.set('staffing', '1')
  if (params?.aValider) query.set('a_valider', '1')
  const qs = query.toString()
  return apiGet<Task[]>(`/tasks/${qs ? `?${qs}` : ''}`)
}

export const createTask = (data: TaskFormValues) => apiPost<Task>('/tasks/', data)

export const updateTask = (id: number, data: Partial<TaskFormValues & { actif: boolean }>) =>
  apiPatch<Task>(`/tasks/${id}/`, data)

export const deleteTask = (id: number) => apiDelete(`/tasks/${id}/`)

export const decideTask = (id: number, decision: 'acceptee' | 'refusee') =>
  apiPost<Task>(`/tasks/${id}/decision/`, { decision })
