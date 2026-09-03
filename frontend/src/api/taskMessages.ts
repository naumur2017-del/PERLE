import { apiDelete, apiGet, apiPatch, apiPost, apiPostUpload } from './client'
import type { MessageAttachmentType } from './messageTypes'

/** Un message de l'espace de discussion partagé d'une tâche — un seul fil PAR TÂCHE, entre le
 * manager qui l'a attribuée et toutes les personnes qui y sont staffées. */
export interface TaskMessage {
  id: number
  task: number
  auteur: number | null
  auteur_nom: string | null
  contenu: string
  attachment: string | null
  attachment_type: MessageAttachmentType | ''
  created_at: string
  edited_at: string | null
}

export const fetchTaskMessages = (taskId: number) => apiGet<TaskMessage[]>(`/tasks/${taskId}/messages/`)

export const sendTaskMessage = (taskId: number, contenu: string, attachment?: File) => {
  const formData = new FormData()
  formData.append('contenu', contenu)
  if (attachment) formData.append('attachment', attachment)
  return apiPostUpload<TaskMessage>(`/tasks/${taskId}/messages/`, formData)
}

/** Réservé à l'auteur du message (voir TaskMessageDetailView). */
export const editTaskMessage = (messageId: number, contenu: string) =>
  apiPatch<TaskMessage>(`/task-messages/${messageId}/`, { contenu })

export const deleteTaskMessage = (messageId: number) => apiDelete(`/task-messages/${messageId}/`)

/** Marque le fil de discussion de la tâche comme lu par l'utilisateur connecté — fait
 * disparaître son voyant « non lu » (bouton Discussion, cloche de notifications). */
export const markTaskMessagesRead = (taskId: number) => apiPost<void>(`/tasks/${taskId}/messages/read/`, {})

/** Signale que je suis en train d'écrire sur le fil de la tâche (à appeler de façon throttlée,
 * voir MessageComposer) ; la lecture renvoie les autres personnes actuellement en train d'écrire
 * (TTL de quelques secondes côté serveur — pas d'état à nettoyer côté client). */
export const sendTaskTyping = (taskId: number) => apiPost<void>(`/tasks/${taskId}/messages/typing/`, {})
export const fetchTaskTyping = (taskId: number) => apiGet<{ typing: string[] }>(`/tasks/${taskId}/messages/typing/`)
