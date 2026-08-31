import { apiGet, apiPatch } from './client'

export interface OrganisationLevels {
  team_levels_count: number
}

export const fetchOrganisationLevels = () => apiGet<OrganisationLevels>('/organisations/levels/')

export const updateOrganisationLevels = (team_levels_count: number) =>
  apiPatch<OrganisationLevels>('/organisations/levels/', { team_levels_count })

export interface OrganisationEhs {
  taux_ehs_fcfa: number
}

export const fetchOrganisationEhs = () => apiGet<OrganisationEhs>('/organisations/ehs/')

export const updateOrganisationEhs = (taux_ehs_fcfa: number) =>
  apiPatch<OrganisationEhs>('/organisations/ehs/', { taux_ehs_fcfa })
