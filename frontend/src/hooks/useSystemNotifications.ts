import { useCallback, useEffect, useState } from 'react'
import { fetchNotifications, markNotificationsRead, type SystemNotification } from '../api/notifications'

// Même sondage discret que useUnreadMessages (pas de websocket dans ce projet).
const POLL_MS = 20000

/** Notifications système persistées de l'utilisateur connecté (ex. décision sur une demande de
 * congé/avance, voir backend Notification / _notify) — alimente la cloche, en plus des fils de
 * discussion non lus (voir useUnreadMessages). */
export function useSystemNotifications() {
  const [notifications, setNotifications] = useState<SystemNotification[]>([])

  const refresh = useCallback(() => {
    fetchNotifications().then(setNotifications).catch(() => {})
  }, [])

  useEffect(() => {
    refresh()
    const interval = window.setInterval(refresh, POLL_MS)
    return () => window.clearInterval(interval)
  }, [refresh])

  const unreadCount = notifications.filter((n) => !n.lue).length

  // Efface immédiatement le voyant à l'ouverture de la cloche, sans attendre le prochain sondage
  // (qui confirmera, côté serveur, que c'est bien marqué lu).
  const markAllReadLocally = useCallback(() => {
    setNotifications((current) => current.some((n) => !n.lue) ? current.map((n) => ({ ...n, lue: true })) : current)
    markNotificationsRead().catch(() => {})
  }, [])

  return { notifications, unreadCount, markAllReadLocally }
}
