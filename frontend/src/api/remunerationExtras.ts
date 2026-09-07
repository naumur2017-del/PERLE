import { apiDelete, apiGet, apiPost } from './client'

export type SanctionType = 'retard' | 'demande_explication' | 'rappel_ordre' | 'autre'

/** Sanction disciplinaire réellement enregistrée pour un salarié (Salarié > Rémunération,
 * Gestion des équipes) — voir backend Sanction. Créée uniquement par un admin/directeur. */
export interface Sanction {
  id: number
  employee: number
  employee_nom: string
  type_sanction: SanctionType
  type_sanction_display: string
  motif: string
  montant: number
  date: string
  created_by_nom: string | null
  created_at: string
}

/** Sans ?employee, renvoie les siennes (salarié) ou celles de toute l'organisation (admin/directeur). */
export const fetchSanctions = (employeeId?: number) => {
  const qs = employeeId ? `?employee=${employeeId}` : ''
  return apiGet<Sanction[]>(`/sanctions/${qs}`)
}

export const createSanction = (data: { employee: number; type_sanction: SanctionType; motif: string; montant: number; date: string }) =>
  apiPost<Sanction>('/sanctions/', data)

export const deleteSanction = (id: number) => apiDelete(`/sanctions/${id}/`)

/** Prime/ajustement manuel réellement accordé à un salarié (ex. « prime de rattrapage ») — voir
 * backend PrimeAjustement. Créé uniquement par un admin/directeur. */
export interface PrimeAjustement {
  id: number
  employee: number
  employee_nom: string
  motif: string
  montant: number
  date: string
  created_by_nom: string | null
  created_at: string
}

export const fetchPrimesAjustement = (employeeId?: number) => {
  const qs = employeeId ? `?employee=${employeeId}` : ''
  return apiGet<PrimeAjustement[]>(`/primes-ajustement/${qs}`)
}

export const createPrimeAjustement = (data: { employee: number; motif: string; montant: number; date: string }) =>
  apiPost<PrimeAjustement>('/primes-ajustement/', data)

export const deletePrimeAjustement = (id: number) => apiDelete(`/primes-ajustement/${id}/`)
