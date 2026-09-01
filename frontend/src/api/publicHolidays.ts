import { apiDelete, apiGet, apiPatch, apiPost } from './client'

export type PublicHolidaySource = 'auto' | 'manuel'

export interface PublicHoliday {
  id: number
  nom: string
  date: string
  recurrente_annuelle: boolean
  source: PublicHolidaySource
  created_by_nom: string | null
  created_at: string
}

export interface PublicHolidaySyncResult {
  created: number
  holidays: PublicHoliday[]
}

export const fetchPublicHolidays = () => apiGet<PublicHoliday[]>('/parametres/jours-feries/')

export const createPublicHoliday = (data: { nom: string; date: string; recurrente_annuelle: boolean }) =>
  apiPost<PublicHoliday>('/parametres/jours-feries/', data)

export const updatePublicHoliday = (id: number, data: Partial<{ nom: string; date: string; recurrente_annuelle: boolean }>) =>
  apiPatch<PublicHoliday>(`/parametres/jours-feries/${id}/`, data)

export const deletePublicHoliday = (id: number) => apiDelete(`/parametres/jours-feries/${id}/`)

/** Importe automatiquement les jours fériés officiels du pays de l'organisation (à la manière
 * de Google Calendar) — additif et rejouable sans risque de doublon. */
export const syncPublicHolidays = () => apiPost<PublicHolidaySyncResult>('/parametres/jours-feries/sync/', {})
