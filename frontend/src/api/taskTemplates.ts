import { apiDelete, apiGet, apiPatch, apiPost } from './client'

export interface TaskTemplate {
  id: number
  code: string
  nom: string
  description: string
  actif: boolean
  created_at: string
}

export const fetchTaskTemplates = () => apiGet<TaskTemplate[]>('/task-templates/')

export const createTaskTemplate = (data: { nom: string; description?: string }) =>
  apiPost<TaskTemplate>('/task-templates/', data)

export const updateTaskTemplate = (id: number, data: Partial<{ nom: string; description: string; actif: boolean }>) =>
  apiPatch<TaskTemplate>(`/task-templates/${id}/`, data)

export const deleteTaskTemplate = (id: number) => apiDelete(`/task-templates/${id}/`)
