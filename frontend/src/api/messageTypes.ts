/** Type de pièce jointe d'un message (TaskMessage ou DirectMessage) — toujours dérivé côté
 * serveur du fichier envoyé, jamais choisi par le client. Partagé entre les deux API de
 * messagerie (tâche et conversation directe) pour rester strictement identique. */
export type MessageAttachmentType = 'image' | 'video' | 'audio' | 'fichier'

/** Forme commune à TaskMessage et DirectMessage, suffisante pour l'affichage — permet à
 * MessageBubble/MessageComposer d'être partagés entre la discussion de tâche et la Messagerie. */
export interface ChatMessageLike {
  id: number
  auteur: number | null
  auteur_nom: string | null
  contenu: string
  attachment: string | null
  attachment_type: MessageAttachmentType | ''
  created_at: string
  edited_at: string | null
}
