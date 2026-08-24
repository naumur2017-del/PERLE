import { apiGet, apiPost } from './client'

export type StatutEmploye = 'actif' | 'conge' | 'inactif'

export interface TeamSummary {
  id: number
  code: string
  name: string
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
  ville: string
  statut: StatutEmploye
  team: TeamSummary | null
  date_joined: string
}

export interface TeamMember {
  id: number
  first_name: string
  last_name: string
  email: string
  fonction: string
  matricule: string
  statut: StatutEmploye
  is_manager: boolean
}

export interface Team {
  id: number
  code: string
  name: string
  manager: TeamMember | null
  members: TeamMember[]
  created_at: string
}

export const fetchEmployees = () => apiGet<Employee[]>('/employees/')

export const fetchTeams = () => apiGet<Team[]>('/teams/')

export const createTeam = (name: string, managerId: number | null) =>
  apiPost<Team>('/teams/', managerId ? { name, manager_id: managerId } : { name })

export const addTeamMember = (teamId: number, userId: number) =>
  apiPost<Team>(`/teams/${teamId}/add-member/`, { user_id: userId })

export const removeTeamMember = (teamId: number, userId: number) =>
  apiPost<Team>(`/teams/${teamId}/remove-member/`, { user_id: userId })
