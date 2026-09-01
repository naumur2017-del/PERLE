import { apiDelete, apiGet, apiPatch, apiPost } from './client'

export interface LigneBudgetaire {
  id: number
  code: string
  nom: string
  niveau: 1 | 2 | 3
  parent: number | null
  equipe: number
  equipe_nom: string
  equipe_code: string
  declinaison: string
  montant_prevu: number | null
  actif: boolean
  created_at: string
}

export const fetchLignesBudgetaires = () => apiGet<LigneBudgetaire[]>('/architecture-monetaire/lignes/')

export const createLigneBudgetaire = (data: { code: string; nom: string; equipe: number; declinaison?: string; montant_prevu?: number | null; parent?: number | null }) =>
  apiPost<LigneBudgetaire>('/architecture-monetaire/lignes/', data)

export const updateLigneBudgetaire = (id: number, data: Partial<{ nom: string; equipe: number; declinaison: string; montant_prevu: number | null; actif: boolean }>) =>
  apiPatch<LigneBudgetaire>(`/architecture-monetaire/lignes/${id}/`, data)

export const deleteLigneBudgetaire = (id: number) => apiDelete(`/architecture-monetaire/lignes/${id}/`)
