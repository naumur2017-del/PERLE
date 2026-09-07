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

/** Valeur en FCFA d'un point de grade — sert à calculer le salaire de base d'un salarié
 * (Salarié > Rémunération) : salaire_de_base = grade du salarié × ce taux. */
export interface OrganisationGrade {
  taux_grade_fcfa: number
}

export const fetchOrganisationGrade = () => apiGet<OrganisationGrade>('/organisations/grade/')

export const updateOrganisationGrade = (taux_grade_fcfa: number) =>
  apiPatch<OrganisationGrade>('/organisations/grade/', { taux_grade_fcfa })

/** Taux utilisés pour calculer la prime de performance (note moyenne × taux) et les déductions
 * (charges sociales, impôt sur le revenu) affichées dans Salarié > Rémunération — des taux que
 * l'organisation configure elle-même, pas un barème fiscal officiel. */
export interface OrganisationRemuneration {
  taux_prime_performance_fcfa: number
  taux_charges_sociales_pct: number
  taux_impot_revenu_pct: number
}

export const fetchOrganisationRemuneration = () => apiGet<OrganisationRemuneration>('/organisations/remuneration/')

export const updateOrganisationRemuneration = (data: Partial<OrganisationRemuneration>) =>
  apiPatch<OrganisationRemuneration>('/organisations/remuneration/', data)
