import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import {
  deleteTaskMessage, editTaskMessage, fetchTaskMessages, fetchTaskTyping, markTaskMessagesRead,
  sendTaskMessage, sendTaskTyping, type TaskMessage,
} from '../api/taskMessages'
import { fetchMe } from '../api/employees'
import { ApiError } from '../api/client'
import { MessageBubble } from './chat/MessageBubble'
import { MessageComposer } from './chat/MessageComposer'
import { TypingIndicator } from './chat/TypingIndicator'
import { useTypingSignal } from '../hooks/useTypingSignal'
import './TaskMessagesModal.css'

const errorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    const payload = error.payload as Record<string, unknown> | null
    if (payload && typeof payload === 'object') {
      const firstValue = Object.values(payload)[0]
      if (typeof firstValue === 'string') return firstValue
      if (Array.isArray(firstValue) && typeof firstValue[0] === 'string') return firstValue[0]
    }
    return 'La requête a échoué.'
  }
  return 'Impossible de contacter le serveur.'
}

// Rafraîchissement léger pendant que la discussion est ouverte, pour que les messages des autres
// personnes engagées sur la tâche apparaissent sans avoir à rouvrir la fenêtre — pas de websocket
// dans ce projet, un polling discret suffit pour un fil de discussion par tâche.
const POLL_MS = 6000
const TYPING_POLL_MS = 2500

interface TaskMessagesModalProps {
  taskId: number
  title: string
  subtitle?: string
  onClose: () => void
  /** Appelé une fois le fil marqué comme lu, pour que la page parente efface immédiatement le
   * voyant « non lu » de son bouton Discussion sans attendre le prochain sondage. */
  onRead?: (taskId: number) => void
}

export default function TaskMessagesModal({ taskId, title, subtitle, onClose, onRead }: TaskMessagesModalProps) {
  const [messages, setMessages] = useState<TaskMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [typingNames, setTypingNames] = useState<string[]>([])
  // Le dernier message reçu (pas de moi) est brièvement mis en évidence à l'ouverture — c'est
  // « le message entrant » qu'on venait chercher en cliquant depuis la cloche de notifications.
  const [highlightId, setHighlightId] = useState<number | null>(null)
  // Comparaison par id (pas par nom affiché) pour distinguer mes propres messages, robuste même
  // si deux personnes de l'organisation portent le même nom — l'accès au fil lui-même est de
  // toute façon déjà vérifié côté serveur, ceci n'est qu'un détail de présentation.
  const [myId, setMyId] = useState<number | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const highlightedRef = useRef(false)

  useEffect(() => {
    fetchMe().then((me) => setMyId(me.id)).catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false
    highlightedRef.current = false
    const load = (silent: boolean) => {
      if (!silent) setLoading(true)
      fetchTaskMessages(taskId)
        .then((data) => {
          if (cancelled) return
          setMessages(data)
          setLoadError(null)
          if (!highlightedRef.current) {
            highlightedRef.current = true
            const lastIncoming = [...data].reverse().find((m) => m.auteur !== null)
            if (lastIncoming) setHighlightId(lastIncoming.id)
          }
        })
        .catch((err) => { if (!cancelled && !silent) setLoadError(errorMessage(err)) })
        .finally(() => { if (!cancelled && !silent) setLoading(false) })
    }
    load(false)
    markTaskMessagesRead(taskId).then(() => { if (!cancelled) onRead?.(taskId) }).catch(() => {})
    const interval = window.setInterval(() => load(true), POLL_MS)
    return () => { cancelled = true; window.clearInterval(interval) }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ne doit se relancer que si on ouvre une autre tâche ; onRead est stable pour l'appelant
  }, [taskId])

  useEffect(() => {
    let cancelled = false
    const poll = () => fetchTaskTyping(taskId).then((data) => { if (!cancelled) setTypingNames(data.typing) }).catch(() => {})
    poll()
    const interval = window.setInterval(poll, TYPING_POLL_MS)
    return () => { cancelled = true; window.clearInterval(interval) }
  }, [taskId])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  const triggerTyping = useTypingSignal(() => sendTaskTyping(taskId))

  const handleSend = async (contenu: string, attachment?: File) => {
    const created = await sendTaskMessage(taskId, contenu, attachment)
    setMessages((current) => [...current, created])
  }

  const handleEdit = async (id: number, contenu: string) => {
    const updated = await editTaskMessage(id, contenu)
    setMessages((current) => current.map((m) => m.id === id ? updated : m))
  }

  const handleDelete = async (id: number) => {
    await deleteTaskMessage(id)
    setMessages((current) => current.filter((m) => m.id !== id))
  }

  return (
    <div className="ge-modal-overlay" role="dialog" aria-modal="true" aria-label="Discussion de la tâche" onMouseDown={onClose}>
      <div className="ge-modal tm-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="ge-modal-head">
          <div>
            <h3>Discussion</h3>
            <p className="ge-modal-subtitle">{title}{subtitle ? ` · ${subtitle}` : ''}</p>
          </div>
          <button type="button" className="ge-modal-close" onClick={onClose} aria-label="Fermer"><X size={16} /></button>
        </div>

        {loading ? (
          <p className="tm-empty">Chargement…</p>
        ) : loadError ? (
          <p className="tm-empty">{loadError}</p>
        ) : (
          <div className="tm-list" ref={listRef}>
            {messages.length === 0 && (
              <p className="tm-empty">Aucun message pour l'instant. Écrivez le premier — tout le monde engagé sur cette tâche le verra.</p>
            )}
            {messages.map((m) => {
              const mine = m.auteur !== null && m.auteur === myId
              return (
                <MessageBubble
                  key={m.id}
                  message={m}
                  mine={mine}
                  showAuthor
                  highlighted={m.id === highlightId}
                  onEdit={mine ? (contenu) => handleEdit(m.id, contenu) : undefined}
                  onDelete={mine ? () => handleDelete(m.id) : undefined}
                />
              )
            })}
          </div>
        )}

        <TypingIndicator names={typingNames} />
        <MessageComposer onSend={handleSend} onTyping={triggerTyping} placeholder="Écrire un message à toutes les personnes engagées sur cette tâche..." />
      </div>
    </div>
  )
}
