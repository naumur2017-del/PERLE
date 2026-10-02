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
  revue_override: '' | 'en_cours' | 'en_revue' | 'termine'
  assignments: TaskAssignment[]
  budget_ligne_montant: number | null
  budget_reste_fcfa: number | null
  actif: boolean
  created_by_nom: string | null
  created_at: string
}

// Catégorisation d'exécution d'une tâche staffée, utilisée par Nouveau staffing, Staffing des
// équipes, Exécuté staffing et Suivi des staffings (mêmes rubriques partout, ce dernier
// regroupant ses attributions par tâche) — le cycle complet d'une tâche :
//   en_cours    — au moins une personne staffée n'a pas encore terminé son exécution.
//   en_attente  — tout le monde a terminé (voir TaskAssignment.execution_statut) mais le manager
//                 n'a pas encore validé : calculé automatiquement, en attente d'action humaine.
//   en_revue    — le manager a validé (bouton de validation, Suivi des staffings) : la tâche est
//                 maintenant soumise à la Direction/au Pilotage pour clôture (Staffing des équipes).
//   termine     — la Direction/le Pilotage a clôturé la tâche (Staffing des équipes) : définitif
//                 pour tout le système (Exécuté staffing bascule alors de « En attente » à
//                 « Terminée », chez l'employé comme chez son manager).
// « en_revue » et « termine » ne sont JAMAIS atteints automatiquement : ce sont toujours des
// bascules manuelles explicites (Task.revue_override, voir TaskRevueOverrideView côté backend) —
// seul « en_attente » est calculé, pour qu'une tâche finie n'attende pas une action humaine avant
// de le signaler.
// Prennent une forme structurelle minimale (pas forcément un `Task` complet) pour être
// réutilisables sur un simple regroupement d'attributions, comme dans Suivi des staffings.
interface RevueStatutInput {
  revue_override: Task['revue_override']
  assignments: { execution_statut: TaskAssignment['execution_statut']; note: number | null }[]
}

export const isTaskFinished = (task: RevueStatutInput): boolean =>
  task.assignments.length > 0 && task.assignments.every((a) => a.execution_statut === 'terminee')

export type TaskRevueStatut = 'en_cours' | 'en_attente' | 'en_revue' | 'termine'

/** Rubrique d'exécution effective d'une tâche : la bascule manuelle (revue_override — posée par
 * le manager pour « en_revue », par la Direction/le Pilotage pour « en_cours »/« termine ») prime
 * toujours sur le calcul automatique — voir Task.revue_override et TaskRevueOverrideView côté
 * backend. */
export const taskRevueStatut = (task: RevueStatutInput): TaskRevueStatut => {
  if (task.revue_override) return task.revue_override
  return isTaskFinished(task) ? 'en_attente' : 'en_cours'
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

/** Bascule manuelle de la rubrique d'exécution — voir TaskRevueOverrideView. « en_revue » est
 * ouvert au manager de l'équipe destinataire ; « en_cours »/« termine » sont réservés à la
 * Direction/au Pilotage. S'applique pour tout le système dès l'appel. */
export const setTaskRevueOverride = (id: number, statut: 'en_cours' | 'en_revue' | 'termine') =>
  apiPost<Task>(`/tasks/${id}/revue-override/`, { statut })
