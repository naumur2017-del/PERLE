import { apiDelete, apiGet, apiPatch, apiPost } from './client'
import type { TaskAssignment } from './taskAssignments'

export type TaskPriorite = 'haute' | 'moyenne' | 'basse'
export type TaskStatut = 'envoyee' | 'acceptee' | 'refusee'

export interface Task {
  id: number
  code: string
  template: number | null
  template_nom: string
  template_code: string
  template_details: string
  template_priorite_defaut: TaskPriorite
  description: string
  project: number | null
  project_nom: string | null
  project_code: string | null
  ligne_budgetaire: number
  ligne_budgetaire_nom: string
  ligne_budgetaire_code: string
  /** Déclinaison de la ligne budgétaire choisie (« Sous-ligne ») — voir LigneBudgetaire.declinaison. */
  ligne_budgetaire_declinaison: string
  equipe: number
  equipe_nom: string
  equipe_code: string
  equipe_manager_nom: string | null
  date_debut: string | null
  echeance: string | null
  priorite: TaskPriorite
  priorite_display: string
  statut: TaskStatut
  statut_display: string
  statut_decide_le: string | null
  /** Bascule manuelle de rubrique (voir TaskRevueOverrideView) : vide tant qu'aucun override
   * n'a été posé, sinon prime sur le calcul automatique — voir taskRevueStatut. */
  revue_override: '' | 'en_cours' | 'termine'
  assignments: TaskAssignment[]
  budget_ligne_montant: number | null
  budget_reste_fcfa: number | null
  actif: boolean
  created_by_nom: string | null
  created_at: string
}

// Catégorisation d'exécution d'une tâche staffée, utilisée par Nouveau staffing (onglets En
// revue/Terminées) et Staffing des équipes (mêmes rubriques) : une tâche est « terminée »
// (finished) dès que tout le monde qui y est staffé a fini son exécution (voir
// TaskAssignment.execution_statut), puis « revue » (reviewed) une fois que chacun a été noté par
// son manager ou, depuis Staffing des équipes, par la Direction/le Pilotage (voir
// TaskAssignment.note) — ce même champ, lu partout, rend la revue authentique pour tout le
// système dès qu'elle est faite à un seul endroit.
export const isTaskFinished = (task: Task): boolean =>
  task.assignments.length > 0 && task.assignments.every((a) => a.execution_statut === 'terminee')
export const isTaskReviewed = (task: Task): boolean => task.assignments.every((a) => a.note != null)

export type TaskRevueStatut = 'en_cours' | 'en_revue' | 'termine'

/** Rubrique d'exécution effective d'une tâche : la bascule manuelle (revue_override, posée
 * depuis Staffing des équipes par la Direction/le Pilotage) prime toujours sur le calcul
 * automatique — voir Task.revue_override et TaskRevueOverrideView côté backend. */
export const taskRevueStatut = (task: Task): TaskRevueStatut => {
  if (task.revue_override) return task.revue_override
  if (!isTaskFinished(task)) return 'en_cours'
  return isTaskReviewed(task) ? 'termine' : 'en_revue'
}

export interface TaskFormValues {
  template?: number | null
  description?: string
  project?: number | null
  ligne_budgetaire: number
  date_debut?: string | null
  echeance: string
  priorite: TaskPriorite
}

export const fetchTask = (id: number) => apiGet<Task>(`/tasks/${id}/`)

export const fetchTasks = (params?: { equipe?: number; assignee?: number; staffing?: boolean; aValider?: boolean }) => {
  const query = new URLSearchParams()
  if (params?.equipe) query.set('equipe', String(params.equipe))
  if (params?.assignee) query.set('assignee', String(params.assignee))
  if (params?.staffing) query.set('staffing', '1')
  if (params?.aValider) query.set('a_valider', '1')
  const qs = query.toString()
  return apiGet<Task[]>(`/tasks/${qs ? `?${qs}` : ''}`)
}

export const createTask = (data: TaskFormValues) => apiPost<Task>('/tasks/', data)

export const updateTask = (id: number, data: Partial<TaskFormValues & { actif: boolean }>) =>
  apiPatch<Task>(`/tasks/${id}/`, data)

export const deleteTask = (id: number) => apiDelete(`/tasks/${id}/`)

export const decideTask = (id: number, decision: 'acceptee' | 'refusee') =>
  apiPost<Task>(`/tasks/${id}/decision/`, { decision })

/** Bascule manuelle de la rubrique d'exécution (En cours / Terminée), réservée à la Direction/au
 * Pilotage — voir TaskRevueOverrideView. S'applique pour tout le système dès l'appel. */
export const setTaskRevueOverride = (id: number, statut: 'en_cours' | 'termine') =>
  apiPost<Task>(`/tasks/${id}/revue-override/`, { statut })
