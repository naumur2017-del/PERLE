import { apiDelete, apiGet, apiPatch, apiPost } from './client'

export interface Task {
  id: number
  code: string
  template: number
  template_nom: string
  template_code: string
  template_description: string
  equipe: number
  equipe_nom: string
  equipe_code: string
  equipe_manager_nom: string | null
  assignee: number | null
  assignee_nom: string | null
  project_ligne: number
  project_id: number
  project_nom: string
  project_code: string
  ligne_budgetaire_nom: string
  ligne_budgetaire_code: string
  montant: number
  heures: number
  lancee: boolean
  lancee_le: string | null
  actif: boolean
  created_by_nom: string | null
  created_at: string
}

export interface TaskFormValues {
  template: number
  project_ligne: number
  heures: number
  assignee?: number | null
}

export const fetchTasks = (params?: { equipe?: number; assignee?: number; staffing?: boolean }) => {
  const query = new URLSearchParams()
  if (params?.equipe) query.set('equipe', String(params.equipe))
  if (params?.assignee) query.set('assignee', String(params.assignee))
  if (params?.staffing) query.set('staffing', '1')
  const qs = query.toString()
  return apiGet<Task[]>(`/tasks/${qs ? `?${qs}` : ''}`)
}

export const createTask = (data: TaskFormValues) => apiPost<Task>('/tasks/', data)

export const updateTask = (id: number, data: Partial<TaskFormValues & { actif: boolean }>) =>
  apiPatch<Task>(`/tasks/${id}/`, data)

export const deleteTask = (id: number) => apiDelete(`/tasks/${id}/`)

export const launchTask = (id: number) => apiPost<Task>(`/tasks/${id}/lancer/`, {})
