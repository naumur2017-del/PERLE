import { apiDelete, apiGet, apiPatch, apiPost } from './client'

export interface PublicHoliday {
  id: number
  nom: string
  date: string
  recurrente_annuelle: boolean
  created_by_nom: string | null
  created_at: string
}

export const fetchPublicHolidays = () => apiGet<PublicHoliday[]>('/parametres/jours-feries/')

export const createPublicHoliday = (data: { nom: string; date: string; recurrente_annuelle: boolean }) =>
  apiPost<PublicHoliday>('/parametres/jours-feries/', data)

export const updatePublicHoliday = (id: number, data: Partial<{ nom: string; date: string; recurrente_annuelle: boolean }>) =>
  apiPatch<PublicHoliday>(`/parametres/jours-feries/${id}/`, data)

export const deletePublicHoliday = (id: number) => apiDelete(`/parametres/jours-feries/${id}/`)
