import { useState } from 'react'
import { Check, FileText, Pencil, Trash2, X } from 'lucide-react'
import type { ChatMessageLike } from '../../api/messageTypes'
import './MessageBubble.css'

const fmtHeure = (iso: string) => new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
const initiales = (nom: string) => nom.trim().split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase()

interface MessageBubbleProps {
  message: ChatMessageLike
  mine: boolean
  showAuthor: boolean
  /** Brève mise en évidence à l'arrivée sur ce message précis (ex. depuis la cloche de
   * notifications) — purement visuel, ne change rien au contenu. */
  highlighted?: boolean
  /** Modification/suppression réservées à l'auteur — absents (donc masqués) pour les messages des
   * autres. L'appelant fait l'appel API réel ; la bulle ne gère que l'interaction. */
  onEdit?: (contenu: string) => Promise<void>
  onDelete?: () => Promise<void>
}

export function MessageBubble({ message, mine, showAuthor, highlighted, onEdit, onDelete }: MessageBubbleProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(message.contenu)
  const [saving, setSaving] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const kind = message.attachment_type || null

  const startEdit = () => { setDraft(message.contenu); setEditing(true); setError(null) }
  const cancelEdit = () => { setEditing(false); setError(null) }

  const saveEdit = async () => {
    const contenu = draft.trim()
    if (!contenu || !onEdit) return
    setSaving(true)
    setError(null)
    try {
      await onEdit(contenu)
      setEditing(false)
    } catch {
      setError('Impossible de modifier ce message.')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!onDelete) return
    setSaving(true)
    try {
      await onDelete()
    } catch {
      setError('Impossible de supprimer ce message.')
      setSaving(false)
      setConfirmingDelete(false)
    }
  }

  return (
    <div className={`chat-msg ${mine ? 'chat-msg-mine' : ''} ${highlighted ? 'chat-msg-highlight' : ''}`}>
      {!mine && <span className="chat-msg-avatar">{initiales(message.auteur_nom ?? '?')}</span>}
      <div className="chat-msg-bubble">
        {!mine && showAuthor && <strong className="chat-msg-author">{message.auteur_nom ?? 'Utilisateur supprimé'}</strong>}

        {message.attachment && kind === 'image' && (
          <a href={message.attachment} target="_blank" rel="noopener noreferrer" className="chat-msg-attachment chat-msg-image-link">
            <img src={message.attachment} alt="Pièce jointe" className="chat-msg-image" />
          </a>
        )}
        {message.attachment && kind === 'video' && (
          <video src={message.attachment} controls className="chat-msg-attachment chat-msg-video" />
        )}
        {message.attachment && kind === 'audio' && (
          <audio src={message.attachment} controls className="chat-msg-attachment chat-msg-audio" />
        )}
        {message.attachment && kind === 'fichier' && (
          <a href={message.attachment} target="_blank" rel="noopener noreferrer" className="chat-msg-attachment chat-msg-file">
            <FileText size={16} />Pièce jointe
          </a>
        )}

        {editing ? (
          <div className="chat-msg-edit">
            <textarea rows={2} value={draft} onChange={(event) => setDraft(event.target.value)} disabled={saving} autoFocus />
            {error && <p className="chat-msg-edit-error">{error}</p>}
            <div className="chat-msg-edit-actions">
              <button type="button" onClick={cancelEdit} disabled={saving} aria-label="Annuler"><X size={13} /></button>
              <button type="button" onClick={() => void saveEdit()} disabled={saving || !draft.trim()} aria-label="Enregistrer"><Check size={13} /></button>
            </div>
          </div>
        ) : (
          <>
            {message.contenu && <p>{message.contenu}</p>}
            <span className="chat-msg-time">
              {fmtHeure(message.created_at)}
              {message.edited_at && <em className="chat-msg-edited"> · modifié</em>}
            </span>
          </>
        )}

        {mine && !editing && (onEdit || onDelete) && (
          <div className="chat-msg-actions">
            {onEdit && <button type="button" onClick={startEdit} aria-label="Modifier" title="Modifier"><Pencil size={12} /></button>}
            {onDelete && (
              confirmingDelete ? (
                <span className="chat-msg-confirm-delete">
                  Supprimer ?
                  <button type="button" onClick={() => void confirmDelete()} disabled={saving} aria-label="Confirmer la suppression"><Check size={12} /></button>
                  <button type="button" onClick={() => setConfirmingDelete(false)} disabled={saving} aria-label="Annuler la suppression"><X size={12} /></button>
                </span>
              ) : (
                <button type="button" onClick={() => setConfirmingDelete(true)} aria-label="Supprimer" title="Supprimer"><Trash2 size={12} /></button>
              )
            )}
          </div>
        )}
      </div>
    </div>
  )
}
