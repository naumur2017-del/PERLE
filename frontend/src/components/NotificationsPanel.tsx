// Fenêtre « toutes les alertes » ouverte depuis la cloche de l'en-tête — remplace l'ancien petit
// menu déroulant par une présentation large, groupée par catégorie, pour qu'on distingue au
// premier coup d'œil messages de tâches, conversations et notifications système.
import { BellOff, CheckCircle2, ClipboardCheck, MessageCircle, MessagesSquare, TriangleAlert, UserCog, Wallet, X } from 'lucide-react'
import type { SystemNotification } from '../api/notifications'
import type { UnreadConversationEntry, UnreadTaskEntry } from '../api/notifications'
import './NotificationsPanel.css'

export interface LocalAlert { id: string; message: string; date: string }

const fmtRelative = (iso: string): string => {
  const date = new Date(iso)
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.round(diffMs / 60000)
  if (diffMin < 1) return 'à l’instant'
  if (diffMin < 60) return `il y a ${diffMin} min`
  const diffH = Math.round(diffMin / 60)
  if (diffH < 24) return `il y a ${diffH} h`
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

/** Icône/teinte selon la cible de la notification système — purement cosmétique, pour repérer
 * d'un coup d'œil le type d'événement (voir Notification.cible_type côté backend). */
function systemNotificationIcon(cibleType: string) {
  if (cibleType === 'task_mention') return <MessageCircle size={16} />
  if (cibleType === 'task' || cibleType === 'task_envoyee') return <ClipboardCheck size={16} />
  if (cibleType === 'grade_demande') return <UserCog size={16} />
  if (cibleType.startsWith('paiement') || cibleType === 'mouvement') return <Wallet size={16} />
  return <CheckCircle2 size={16} />
}

export default function NotificationsPanel({
  onClose, unreadTasks, unreadConversations, systemNotifications, localAlerts,
  onOpenTask, onOpenConversation, onOpenSystemNotification,
}: {
  onClose: () => void
  unreadTasks: UnreadTaskEntry[]
  unreadConversations: UnreadConversationEntry[]
  systemNotifications: SystemNotification[]
  localAlerts: LocalAlert[]
  onOpenTask: (taskId: number) => void
  onOpenConversation: (conversationId: number) => void
  onOpenSystemNotification: (notification: SystemNotification) => void
}) {
  const isEmpty = unreadTasks.length === 0 && unreadConversations.length === 0
    && systemNotifications.length === 0 && localAlerts.length === 0

  return (
    <div className="np-overlay" role="dialog" aria-modal="true" aria-label="Notifications" onMouseDown={onClose}>
      <div className="np-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="np-head">
          <h3>Notifications</h3>
          <button type="button" className="np-close" onClick={onClose} aria-label="Fermer"><X size={16} /></button>
        </div>

        <div className="np-body">
          {isEmpty ? (
            <div className="np-empty">
              <BellOff size={34} />
              <strong>Tout est à jour</strong>
              <p>Vous n'avez aucune notification en attente pour l'instant.</p>
            </div>
          ) : (
            <>
              {unreadTasks.length > 0 && (
                <section className="np-section">
                  <h4><MessageCircle size={13} />Discussions de tâches ({unreadTasks.length})</h4>
                  <ul>
                    {unreadTasks.map((task) => (
                      <li key={`task-${task.id}`} className="np-row np-row-link" onClick={() => onOpenTask(task.id)}>
                        <span className="np-row-icon np-row-icon-purple"><MessageCircle size={16} /></span>
                        <div className="np-row-main">
                          <strong>{task.code} — {task.nom}</strong>
                          <span>Nouveau message dans la discussion de cette tâche</span>
                        </div>
                        <time>{fmtRelative(task.last_message_at)}</time>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {unreadConversations.length > 0 && (
                <section className="np-section">
                  <h4><MessagesSquare size={13} />Conversations ({unreadConversations.length})</h4>
                  <ul>
                    {unreadConversations.map((conversation) => (
                      <li key={`conv-${conversation.id}`} className="np-row np-row-link" onClick={() => onOpenConversation(conversation.id)}>
                        <span className="np-row-icon np-row-icon-blue"><MessagesSquare size={16} /></span>
                        <div className="np-row-main">
                          <strong>{conversation.nom}</strong>
                          <span>Nouveau message reçu</span>
                        </div>
                        <time>{fmtRelative(conversation.last_message_at)}</time>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {systemNotifications.length > 0 && (
                <section className="np-section">
                  <h4><CheckCircle2 size={13} />Notifications système ({systemNotifications.length})</h4>
                  <ul>
                    {systemNotifications.map((notification) => (
                      <li
                        key={`sys-${notification.id}`}
                        className={`np-row np-row-link ${notification.lue ? 'np-row-read' : ''}`}
                        onClick={() => onOpenSystemNotification(notification)}
                      >
                        <span className="np-row-icon np-row-icon-orange">{systemNotificationIcon(notification.cible_type)}</span>
                        <div className="np-row-main">
                          <strong>{notification.message}</strong>
                        </div>
                        <time>{fmtRelative(notification.created_at)}</time>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {localAlerts.length > 0 && (
                <section className="np-section">
                  <h4><TriangleAlert size={13} />Alertes ({localAlerts.length})</h4>
                  <ul>
                    {localAlerts.map((alert) => (
                      <li key={alert.id} className="np-row">
                        <span className="np-row-icon np-row-icon-red"><TriangleAlert size={16} /></span>
                        <div className="np-row-main">
                          <strong>{alert.message}</strong>
                        </div>
                        <time>{alert.date}</time>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
