import { apiDelete, apiGet, apiPatch, apiPost } from './client'

export type DemandeStatut = 'attente' | 'approuvee' | 'refusee'
export type CongeUnite = 'mois' | 'annee'
export type CongeModePeriode = 'employe' | 'entreprise'
export type CongeCategorie = 'standard' | 'maladie' | 'technique'

export interface CongeType {
  id: number
  nom: string
  categorie: CongeCategorie
  description: string
  jours_alloues: number | null
  unite: CongeUnite | null
  mode_periode: CongeModePeriode | null
  actif: boolean
}

export interface CongeDemande {
  id: number
  employee: number
  employee_nom: string
  employee_fonction: string
  type_conge: number
  type_conge_detail: CongeType
  date_debut: string | null
  date_fin: string | null
  duree: number
  demi_journee_debut: boolean
  demi_journee_fin: boolean
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

export interface CongeSolde {
  type_conge: CongeType
  jours_acquis: number
  jours_pris: number
  solde: number
}

export interface FermetureTechnique {
  id: number
  date_debut: string
  date_fin: string
  description: string
  equipes_exceptees: number[]
  employes_exceptes: number[]
  created_at: string
}

// --- Politiques de congé (Paramètres) ---

export const fetchCongeTypes = () => apiGet<CongeType[]>('/parametres/conges-types/')

export const createCongeType = (data: { nom: string; jours_alloues: number; unite: CongeUnite; mode_periode: CongeModePeriode }) =>
  apiPost<CongeType>('/parametres/conges-types/', data)

export const updateCongeType = (id: number, data: Partial<{ nom: string; jours_alloues: number; unite: CongeUnite; mode_periode: CongeModePeriode; actif: boolean }>) =>
  apiPatch<CongeType>(`/parametres/conges-types/${id}/`, data)

export const deleteCongeType = (id: number) => apiDelete(`/parametres/conges-types/${id}/`)

// --- Demandes de congé ---

export const fetchMyCongeDemandes = () => apiGet<CongeDemande[]>('/demandes/conges/')

export const createCongeDemande = (data: {
  type_conge: number
  date_debut?: string
  date_fin?: string
  motif: string
  demi_journee_debut?: boolean
  demi_journee_fin?: boolean
}) => apiPost<CongeDemande>('/demandes/conges/', data)

export const deleteCongeDemande = (id: number) => apiDelete(`/demandes/conges/${id}/`)

export const endCongeDemande = (id: number) => apiPost<CongeDemande>(`/demandes/conges/${id}/end/`, {})

export const fetchCongeSolde = () => apiGet<CongeSolde[]>('/demandes/conges/solde/')

export const fetchOrganisationCongeDemandes = () => apiGet<CongeDemande[]>('/demandes/conges/organisation/')

export const reviewCongeDemande = (id: number, statut: 'approuvee' | 'refusee', dates?: { date_debut: string; date_fin: string }) =>
  apiPatch<CongeDemande>(`/demandes/conges/${id}/review/`, { statut, ...dates })

// --- Demandes d'avance ---

export const fetchMyAvanceDemandes = () => apiGet<AvanceDemande[]>('/demandes/avances/')

export const createAvanceDemande = (data: { montant: number; motif: string; nombre_mois: number }) =>
  apiPost<AvanceDemande>('/demandes/avances/', data)

export const deleteAvanceDemande = (id: number) => apiDelete(`/demandes/avances/${id}/`)

export const fetchOrganisationAvanceDemandes = () => apiGet<AvanceDemande[]>('/demandes/avances/organisation/')

export const reviewAvanceDemande = (id: number, statut: 'approuvee' | 'refusee') =>
  apiPatch<AvanceDemande>(`/demandes/avances/${id}/review/`, { statut })

// --- Congé Technique (fermetures collectives) ---

export const fetchFermeturesTechniques = () => apiGet<FermetureTechnique[]>('/demandes/conges-techniques/')

export const createFermetureTechnique = (data: {
  date_debut: string
  date_fin: string
  description?: string
  equipes_exceptees: number[]
  employes_exceptes: number[]
}) => apiPost<FermetureTechnique>('/demandes/conges-techniques/', data)

export const deleteFermetureTechnique = (id: number) => apiDelete(`/demandes/conges-techniques/${id}/`)
