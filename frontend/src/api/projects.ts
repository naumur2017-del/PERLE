import { apiDelete, apiGet, apiPatch, apiPost } from './client'

export type ProjectStatut = 'brouillon' | 'definitif'
export type TypeMontant = 'HT' | 'TTC'

export interface ProjectLigne {
  id: number
  code: string
  ligne_budgetaire: number
  ligne_budgetaire_nom: string
  ligne_budgetaire_code: string
  ligne_budgetaire_declinaison: string
  ligne_budgetaire_montant_prevu: number | null
  equipe: number
  equipe_nom: string
  equipe_code: string
  montant: number
  date_debut: string | null
  date_fin: string | null
  created_at: string
}

export interface Project {
  id: number
  code: string
  nom: string
  client: string
  description: string
  montant: number
  type_montant: TypeMontant
  marge_pct: number
  charges_transversales_pct: number
  tva_pct: number
  ir_pct: number
  reserve_montant: number
  date_debut: string | null
  date_fin: string | null
  statut: ProjectStatut
  created_by_nom: string | null
  created_at: string
  updated_at: string
  lignes: ProjectLigne[]
  montant_marge: number
  montant_charges: number
  montant_tva: number
  montant_ir: number
  budget_execution: number
}

export interface ProjectFormValues {
  nom: string
  client?: string
  description?: string
  montant: number
  type_montant: TypeMontant
  marge_pct: number
  charges_transversales_pct: number
  tva_pct: number
  ir_pct: number
  reserve_montant?: number
  date_debut?: string | null
  date_fin?: string | null
  statut: ProjectStatut
}

export const fetchProjects = (statut?: ProjectStatut) =>
  apiGet<Project[]>(`/projects/${statut ? `?statut=${statut}` : ''}`)

export const fetchProject = (id: number) => apiGet<Project>(`/projects/${id}/`)

export const createProject = (data: ProjectFormValues) => apiPost<Project>('/projects/', data)

export const updateProject = (id: number, data: Partial<ProjectFormValues>) =>
  apiPatch<Project>(`/projects/${id}/`, data)

export const deleteProject = (id: number) => apiDelete(`/projects/${id}/`)

export interface ProjectLigneFormValues {
  ligne_budgetaire: number
  montant: number
  date_debut?: string | null
  date_fin?: string | null
}

export const createProjectLigne = (projectId: number, data: ProjectLigneFormValues) =>
  apiPost<ProjectLigne>(`/projects/${projectId}/lignes/`, data)

export const deleteProjectLigne = (projectId: number, ligneId: number) =>
  apiDelete(`/projects/${projectId}/lignes/${ligneId}/`)
