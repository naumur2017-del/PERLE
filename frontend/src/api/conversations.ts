import { apiDelete, apiGet, apiPatch, apiPost, apiPostUpload } from './client'
import type { MessageAttachmentType } from './messageTypes'

/** Un message d'une conversation directe (Messagerie) — texte et/ou pièce jointe. */
export interface DirectMessage {
  id: number
  conversation: number
  auteur: number | null
  auteur_nom: string | null
  contenu: string
  attachment: string | null
  attachment_type: MessageAttachmentType | ''
  created_at: string
  edited_at: string | null
}

export interface ConversationParticipant {
  id: number
  nom: string
  fonction: string
  profile_photo: string | null
  is_online: boolean
}

/** Résumé d'une conversation (1:1 ou groupe) pour la liste de la page Messagerie. */
export interface ConversationSummary {
  id: number
  is_group: boolean
  nom: string
  /** Nom du groupe, ou nom de l'autre participant pour un 1:1 — toujours prêt à afficher. */
  display_nom: string
  /** Uniquement pour un 1:1 — null pour un groupe (voir `participants` dans ce cas). */
  other_user: ConversationParticipant | null
  participants: ConversationParticipant[]
  last_message: {
    contenu: string
    attachment_type: MessageAttachmentType | null
    auteur_id: number | null
    created_at: string
  } | null
  unread: boolean
  created_at: string
}

export const fetchConversations = () => apiGet<ConversationSummary[]>('/conversations/')

/** Récupère (ou crée) la conversation 1:1 avec un autre membre de l'organisation. */
export const startConversation = (userId: number) => apiPost<ConversationSummary>('/conversations/start/', { user: userId })

/** Crée une discussion de groupe — `memberIds` doit contenir au moins deux autres membres. */
export const createGroupConversation = (nom: string, memberIds: number[]) =>
  apiPost<ConversationSummary>('/conversations/group/', { nom, member_ids: memberIds })

export const fetchConversationMessages = (conversationId: number) =>
  apiGet<DirectMessage[]>(`/conversations/${conversationId}/messages/`)

export const sendConversationMessage = (conversationId: number, contenu: string, attachment?: File) => {
  const formData = new FormData()
  formData.append('contenu', contenu)
  if (attachment) formData.append('attachment', attachment)
  return apiPostUpload<DirectMessage>(`/conversations/${conversationId}/messages/`, formData)
}

/** Réservé à l'auteur du message (voir DirectMessageDetailView). */
export const editConversationMessage = (messageId: number, contenu: string) =>
  apiPatch<DirectMessage>(`/direct-messages/${messageId}/`, { contenu })

export const deleteConversationMessage = (messageId: number) => apiDelete(`/direct-messages/${messageId}/`)

export const markConversationRead = (conversationId: number) => apiPost<void>(`/conversations/${conversationId}/read/`, {})

/** Même principe que sendTaskTyping/fetchTaskTyping, pour une conversation directe. */
export const sendConversationTyping = (conversationId: number) => apiPost<void>(`/conversations/${conversationId}/typing/`, {})
export const fetchConversationTyping = (conversationId: number) => apiGet<{ typing: string[] }>(`/conversations/${conversationId}/typing/`)
