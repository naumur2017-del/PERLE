import { apiDelete, apiGet, apiPatch, apiPost } from './client'

export type DemandeStatut = 'attente' | 'approuvee' | 'refusee'
export type TypeConge = 'annuel' | 'exceptionnel' | 'maladie' | 'sans_solde'

export interface CongeDemande {
  id: number
  employee: number
  employee_nom: string
  employee_fonction: string
  type_conge: TypeConge
  date_debut: string
  date_fin: string
  duree: number
  motif: string
  statut: DemandeStatut
  cloture: boolean
  reviewed_by_nom: string | null
  reviewed_by_role: string | null
  reviewed_at: string | null
  created_at: string
}

export interface AvanceDemande {
  id: number
  employee: number
  employee_nom: string
  employee_fonction: string
  montant: number
  motif: string
  nombre_mois: number
  statut: DemandeStatut
  reviewed_by_nom: string | null
  reviewed_by_role: string | null
  reviewed_at: string | null
  created_at: string
}

export const fetchMyCongeDemandes = () => apiGet<CongeDemande[]>('/demandes/conges/')

export const createCongeDemande = (data: { type_conge: TypeConge; date_debut: string; date_fin: string; motif: string }) =>
  apiPost<CongeDemande>('/demandes/conges/', data)

export const deleteCongeDemande = (id: number) => apiDelete(`/demandes/conges/${id}/`)

export const endCongeDemande = (id: number) => apiPost<CongeDemande>(`/demandes/conges/${id}/end/`, {})

export const fetchMyAvanceDemandes = () => apiGet<AvanceDemande[]>('/demandes/avances/')

export const createAvanceDemande = (data: { montant: number; motif: string; nombre_mois: number }) =>
  apiPost<AvanceDemande>('/demandes/avances/', data)

export const deleteAvanceDemande = (id: number) => apiDelete(`/demandes/avances/${id}/`)

export const fetchOrganisationCongeDemandes = () => apiGet<CongeDemande[]>('/demandes/conges/organisation/')

export const reviewCongeDemande = (id: number, statut: 'approuvee' | 'refusee') =>
  apiPatch<CongeDemande>(`/demandes/conges/${id}/review/`, { statut })

export const fetchOrganisationAvanceDemandes = () => apiGet<AvanceDemande[]>('/demandes/avances/organisation/')

export const reviewAvanceDemande = (id: number, statut: 'approuvee' | 'refusee') =>
  apiPatch<AvanceDemande>(`/demandes/avances/${id}/review/`, { statut })
