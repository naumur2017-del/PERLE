import { apiDelete, apiGet, apiPatch, apiPost, apiPostUpload, apiUpload } from './client'

export type StatutEmploye = 'actif' | 'conge' | 'inactif'

export interface TeamSummary {
  id: number
  code: string
  name: string
}

export interface GradeHistoryEntry {
  id: number
  ancien_grade: number | null
  nouveau_grade: number
  changed_at: string
  changed_by: string | null
}

export interface AffectationHistoryEntry {
  id: number
  ancienne_equipe: TeamSummary | null
  nouvelle_equipe: TeamSummary | null
  changed_at: string
  changed_by: string | null
}

export interface Employee {
  id: number
  first_name: string
  last_name: string
  email: string
  phone: string
  fonction: string
  role: string
  matricule: string
  date_naissance: string | null
  pays: string
  pays_code: string
  ville: string
  statut: StatutEmploye
  grade: number
  is_active: boolean
  team: TeamSummary | null
  date_joined: string
  date_embauche: string | null
  profile_photo: string | null
  cni_document: string | null
  autre_piece_document: string | null
  cv_document: string | null
  contrat_document: string | null
  type_contrat: TypeContrat
  periode_essai: PeriodeEssai
  temps_travail: TempsTravail
  competences_principales: string
  competences_secondaires: string
  cnps: string
  contribuable: string
  banque: string
  compte_bancaire: string
  groupe_sanguin: string
  contact_urgence_nom: string
  contact_urgence_telephone: string
  assurance_sante: string
  grade_history: GradeHistoryEntry[]
  affectation_history: AffectationHistoryEntry[]
}

export interface TeamMember {
  id: number
  first_name: string
  last_name: string
  email: string
  fonction: string
  matricule: string
  statut: StatutEmploye
  grade: number
  is_manager: boolean
}

export interface Team {
  id: number
  code: string
  name: string
  manager: TeamMember | null
  members: TeamMember[]
  niveau: number
  /** Équipe de direction (hiérarchie) : cette équipe apparaît comme sous-équipe de `parent` sur
   * l'organigramme. Indépendant du niveau. */
  parent: number | null
  parent_code: string | null
  parent_name: string | null
  is_protected: boolean
  created_at: string
}

export const fetchEmployees = () => apiGet<Employee[]>('/employees/')

export const createEmployee = (data: FormData) => apiPostUpload<Employee>('/employees/', data)

export const updateEmployee = (id: number, data: { grade?: number; is_active?: boolean; statut?: StatutEmploye }) =>
  apiPatch<Employee>(`/employees/${id}/`, data)

export const editEmployee = (id: number, data: FormData) => apiUpload<Employee>(`/employees/${id}/edit/`, data)

export const fetchTeams = () => apiGet<Team[]>('/teams/')

export const createTeam = (code: string, name: string, managerId: number | null, parentId: number | null) =>
  apiPost<Team>('/teams/', { code, name, manager_id: managerId, parent: parentId })

export const updateTeam = (id: number, data: { name?: string; manager_id?: number | null; niveau?: number; parent?: number | null }) =>
  apiPatch<Team>(`/teams/${id}/`, data)

export const deleteTeam = (id: number) => apiDelete(`/teams/${id}/`)

export const addTeamMember = (teamId: number, userId: number) =>
  apiPost<Team>(`/teams/${teamId}/add-member/`, { user_id: userId })

export const removeTeamMember = (teamId: number, userId: number) =>
  apiPost<Team>(`/teams/${teamId}/remove-member/`, { user_id: userId })

export interface OrganisationSummary {
  id: number
  name: string
  email: string
  sector: string
  country: string
  country_code: string
  city: string
  currency_code: string
  members: number
}

export type TypeContrat = 'cdi' | 'cdd' | 'stage' | 'alternance' | 'consultant' | ''
export type PeriodeEssai = 'en_cours' | 'terminee' | ''
export type TempsTravail = 'temps_plein' | 'temps_partiel' | ''

export interface MeProfile {
  id: number
  email: string
  first_name: string
  last_name: string
  phone: string
  fonction: string
  matricule: string
  date_naissance: string | null
  pays: string
  pays_code: string
  ville: string
  statut: StatutEmploye
  grade: number
  role: string
  organisation: OrganisationSummary | null
  team: TeamSummary | null
  profile_photo: string | null
  cni_document: string | null
  autre_piece_document: string | null
  cv_document: string | null
  contrat_document: string | null
  date_joined: string
  departement: string | null
  responsable_hierarchique: string | null
  date_embauche: string | null
  type_contrat: TypeContrat
  periode_essai: PeriodeEssai
  temps_travail: TempsTravail
  anciennete: string | null
  competences_principales: string
  competences_secondaires: string
  cnps: string
  contribuable: string
  banque: string
  compte_bancaire: string
  groupe_sanguin: string
  contact_urgence_nom: string
  contact_urgence_telephone: string
  assurance_sante: string
}

export type MeProfileEditableFields = Pick<
  MeProfile,
  | 'email' | 'first_name' | 'last_name' | 'phone' | 'fonction' | 'matricule' | 'date_naissance' | 'pays' | 'pays_code' | 'ville'
  | 'date_embauche' | 'type_contrat' | 'periode_essai'
  | 'temps_travail' | 'competences_principales' | 'competences_secondaires'
  | 'cnps' | 'contribuable' | 'banque' | 'compte_bancaire' | 'groupe_sanguin'
  | 'contact_urgence_nom' | 'contact_urgence_telephone' | 'assurance_sante'
>

export type DocumentField = 'profile_photo' | 'cni_document' | 'autre_piece_document' | 'cv_document' | 'contrat_document'

export const fetchMe = () => apiGet<MeProfile>('/employees/me/')

export const updateMe = (data: Partial<MeProfileEditableFields>) => apiPatch<MeProfile>('/employees/me/', data)

export const uploadMyDocument = (field: DocumentField, file: File) => {
  const formData = new FormData()
  formData.append(field, file)
  return apiUpload<MeProfile>('/employees/me/', formData)
}
