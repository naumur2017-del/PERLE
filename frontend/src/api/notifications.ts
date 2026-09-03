import { apiGet } from './client'

export interface UnreadTaskEntry {
  id: number
  code: string
  nom: string
  last_message_at: string
}

export interface UnreadConversationEntry {
  id: number
  nom: string
  last_message_at: string
}

/** Résumé des fils de discussion (tâches + conversations directes) contenant au moins un message
 * non lu par l'utilisateur connecté — alimente la cloche de notifications (avec assez de détail
 * pour lister et renvoyer vers CHAQUE fil non lu individuellement) et les voyants « non lu » des
 * boutons de discussion. `total` = nombre de fils avec au moins un message non lu (pas un compte
 * de messages), volontairement simple pour un badge. */
export interface UnreadSummary {
  unread_task_ids: number[]
  unread_conversation_ids: number[]
  unread_tasks: UnreadTaskEntry[]
  unread_conversations: UnreadConversationEntry[]
  total: number
}

export const fetchUnreadSummary = () => apiGet<UnreadSummary>('/messages/unread-summary/')
