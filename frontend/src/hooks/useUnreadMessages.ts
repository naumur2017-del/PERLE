import { useCallback, useEffect, useState } from 'react'
import { fetchUnreadSummary, type UnreadConversationEntry, type UnreadTaskEntry } from '../api/notifications'

// Pas de websocket dans ce projet : un sondage discret suffit pour que les voyants « non lu »
// (cloche, boutons de discussion des tâches, liste Messagerie) restent à jour sans intervention.
const POLL_MS = 20000

/** Fils de discussion (tâches + conversations directes) contenant au moins un message non lu par
 * l'utilisateur connecté — recalculé côté serveur à chaque appel (voir UnreadMessagesSummaryView),
 * jamais un état local qui pourrait diverger. Chaque page qui en a besoin en garde sa propre
 * instance (même convention que le reste de l'app : chaque page charge ses propres données). */
export function useUnreadMessages() {
  const [unreadTaskIds, setUnreadTaskIds] = useState<Set<number>>(new Set())
  const [unreadConversationIds, setUnreadConversationIds] = useState<Set<number>>(new Set())
  // Détail (code/nom de tâche, nom de conversation) — utilisé par la cloche pour lister et
  // renvoyer vers CHAQUE fil non lu individuellement, pas seulement un total agrégé.
  const [unreadTasks, setUnreadTasks] = useState<UnreadTaskEntry[]>([])
  const [unreadConversations, setUnreadConversations] = useState<UnreadConversationEntry[]>([])
  const [total, setTotal] = useState(0)

  const refresh = useCallback(() => {
    fetchUnreadSummary()
      .then((data) => {
        setUnreadTaskIds(new Set(data.unread_task_ids))
        setUnreadConversationIds(new Set(data.unread_conversation_ids))
        setUnreadTasks(data.unread_tasks)
        setUnreadConversations(data.unread_conversations)
        setTotal(data.total)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    refresh()
    const interval = window.setInterval(refresh, POLL_MS)
    return () => window.clearInterval(interval)
  }, [refresh])

  // Efface immédiatement un voyant dès que la personne ouvre le fil correspondant, sans attendre
  // le prochain sondage (qui confirmera, côté serveur, que c'est bien marqué lu).
  const markTaskReadLocally = useCallback((taskId: number) => {
    setUnreadTaskIds((current) => {
      if (!current.has(taskId)) return current
      const next = new Set(current)
      next.delete(taskId)
      return next
    })
    setUnreadTasks((current) => current.filter((t) => t.id !== taskId))
  }, [])

  const markConversationReadLocally = useCallback((conversationId: number) => {
    setUnreadConversationIds((current) => {
      if (!current.has(conversationId)) return current
      const next = new Set(current)
      next.delete(conversationId)
      return next
    })
    setUnreadConversations((current) => current.filter((c) => c.id !== conversationId))
  }, [])

  return {
    unreadTaskIds, unreadConversationIds, unreadTasks, unreadConversations, total,
    refresh, markTaskReadLocally, markConversationReadLocally,
  }
}
