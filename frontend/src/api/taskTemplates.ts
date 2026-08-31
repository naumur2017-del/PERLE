import { apiDelete, apiGet, apiPatch, apiPost } from './client'

export type TaskTemplateType = 'dossier' | 'tache_elementaire'
export type TaskTemplateFrequence = 'ponctuelle' | 'recurrente'
export type TaskTemplateDeclenchement = 'manuel' | 'automatique'
export type TaskTemplatePriorite = 'haute' | 'moyenne' | 'basse'

export interface TaskTemplate {
  id: number
  code: string
  nom: string
  parent: number | null
  parent_nom: string | null
  parent_code: string | null
  niveau: number
  equipe: number | null
  equipe_nom: string | null
  equipe_code: string | null
  type_element: TaskTemplateType
  type_element_display: string
  attribuable: boolean
  recurrente: boolean
  details: string
  explication: string
  frequence: TaskTemplateFrequence
  frequence_display: string
  mode_declenchement: TaskTemplateDeclenchement
  mode_declenchement_display: string
  priorite_defaut: TaskTemplatePriorite
  priorite_defaut_display: string
  duree_estimee_heures: number | null
  actif: boolean
  created_by_nom: string | null
  created_at: string
  updated_by_nom: string | null
  updated_at: string
  enfants_count: number
  attributions_count: number
}

export interface TaskTemplateFormValues {
  code: string
  nom: string
  parent?: number | null
  equipe?: number | null
  type_element: TaskTemplateType
  attribuable?: boolean
  recurrente?: boolean
  details?: string
  explication?: string
  frequence?: TaskTemplateFrequence
  mode_declenchement?: TaskTemplateDeclenchement
  priorite_defaut?: TaskTemplatePriorite
  duree_estimee_heures?: number | null
  actif?: boolean
}

export const fetchTaskTemplates = () => apiGet<TaskTemplate[]>('/task-templates/')

export const createTaskTemplate = (data: TaskTemplateFormValues) => apiPost<TaskTemplate>('/task-templates/', data)

export const updateTaskTemplate = (id: number, data: Partial<TaskTemplateFormValues>) =>
  apiPatch<TaskTemplate>(`/task-templates/${id}/`, data)

export const deleteTaskTemplate = (id: number) => apiDelete(`/task-templates/${id}/`)
