import { apiDelete, apiGet, apiPatch, apiPost } from './client'
import type { Task } from './tasks'

export type TaskExecutionStatut = 'a_demarrer' | 'en_cours' | 'en_pause' | 'terminee'
export type TaskExecutionAction = 'demarrer' | 'pause' | 'reprendre' | 'terminer' | 'decliner'

export interface TaskAssignment {
  id: number
  task: number
  user: number
  user_nom: string
  user_grade: number
  heures: number
  ehs_consomme: number
  montant_fcfa: number
  execution_statut: TaskExecutionStatut
  execution_statut_display: string
  demarree_le: string | null
  terminee_le: string | null
  /** Secondes confirmées de travail effectif (hors segment actif en cours) — voir
   * TaskAssignmentExecutionView. Pendant l'exécution (en_cours), le temps « live » réel est
   * `temps_travaille_secondes + (maintenant - demarree_le)`. */
  temps_travaille_secondes: number
  /** Évaluation par le manager, possible seulement une fois la tâche terminée. */
  note: number | null
  note_commentaire: string
  notee_le: string | null
  notee_par_nom: string | null
  created_by_nom: string | null
  created_at: string
  // Résumé de la tâche portée (une seule requête suffit à Exécuté staffing).
  task_code: string
  task_description: string
  template_nom: string
  template_code: string
  project_nom: string | null
  project_code: string | null
  equipe_nom: string
  equipe_code: string
  ligne_budgetaire_nom: string
  ligne_budgetaire_code: string
  echeance: string | null
  priorite_display: string
  task_created_by_nom: string | null
}

export const fetchTaskAssignments = (params?: { task?: number; user?: number }) => {
  const query = new URLSearchParams()
  if (params?.task) query.set('task', String(params.task))
  if (params?.user) query.set('user', String(params.user))
  const qs = query.toString()
  return apiGet<TaskAssignment[]>(`/task-assignments/${qs ? `?${qs}` : ''}`)
}

export const createTaskAssignment = (data: { task: number; user: number; heures: number }) =>
  apiPost<TaskAssignment>('/task-assignments/', data)

export const updateTaskAssignment = (id: number, data: { heures: number }) =>
  apiPatch<TaskAssignment>(`/task-assignments/${id}/`, data)

/** Réservé au manager de l'équipe (ou admin/directeur), seulement une fois la tâche terminée. */
export const rateTaskAssignment = (id: number, note: number, note_commentaire?: string) =>
  apiPatch<TaskAssignment>(`/task-assignments/${id}/`, { note, note_commentaire: note_commentaire ?? '' })

export const deleteTaskAssignment = (id: number) => apiDelete(`/task-assignments/${id}/`)

// Décliner renvoie la tâche (l'attribution est supprimée côté serveur) ; les autres actions
// renvoient l'attribution mise à jour — voir TaskAssignmentExecutionView.
export const executeTaskAssignmentAction = (id: number, action: TaskExecutionAction) =>
  apiPost<TaskAssignment | Task>(`/task-assignments/${id}/execution/`, { action })
