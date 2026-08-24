import { apiGet } from '../api/client'

export type Organisation = {
  id: number
  name: string
  email: string
  sector: string
  city: string
  members: number
}

/** Recherche une organisation par nom ou par e-mail auprès de l’API. */
export function searchOrganisations(query: string): Promise<Organisation[]> {
  const term = query.trim()
  if (!term) return Promise.resolve([])
  return apiGet<Organisation[]>(`/organisations/search/?q=${encodeURIComponent(term)}`)
}
