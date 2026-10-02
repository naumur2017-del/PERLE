// Fenêtre de détail complet d'une tâche : tous ses champs (statut, manager, dates, description…)
// ainsi que son fil d'historique/discussion — chaque opération significative (envoi, décision,
// staffing, exécution…) y est mentionnée automatiquement (TaskMessage.est_systeme, voir backend
// _log_task_event), et on peut y joindre des fichiers comme dans n'importe quelle discussion de
// tâche (voir MessageComposer). Réutilise les classes globales arch-panel-view/arch-task-detail
// (StaffingEquipesPage.tsx) pour rester visuellement cohérent avec le panneau de détail existant.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp, History, Pencil, Users, X } from 'lucide-react'
import {
  deleteTaskMessage, editTaskMessage, fetchTaskMessages, fetchTaskTyping, markTaskMessagesRead,
  sendTaskMessage, sendTaskTyping, type TaskMessage,
} from '../api/taskMessages'
import { fetchMe } from '../api/employees'
import type { Task } from '../api/tasks'
import { ApiError } from '../api/client'
import { MessageBubble } from './chat/MessageBubble'
import { MessageComposer } from './chat/MessageComposer'
import { TypingIndicator } from './chat/TypingIndicator'
import { useTypingSignal } from '../hooks/useTypingSignal'
import './TaskDetailModal.css'

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

const formatDate = (value: string | null): string => value ? new Date(value).toLocaleDateString('fr-FR') : '—'

/** Jours restants avant l'échéance — pour l'affichage sous forme de badge (voir joursRestants
 * ci-dessous), pas un compteur d'exécution comme celui d'Exécuté staffing. */
function joursRestants(task: Task): { label: string; tone: 'ok' | 'warn' | 'danger' | 'muted' } | null {
  if (task.statut === 'refusee') return { label: 'Tâche refusée', tone: 'muted' }
  if (!task.echeance) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(task.echeance)
  due.setHours(0, 0, 0, 0)
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000)
  if (diffDays < 0) return { label: `En retard de ${Math.abs(diffDays)} j`, tone: 'danger' }
  if (diffDays === 0) return { label: 'Échéance aujourd’hui', tone: 'warn' }
  return { label: `${diffDays} j restant${diffDays > 1 ? 's' : ''}`, tone: diffDays <= 2 ? 'warn' : 'ok' }
}

const POLL_MS = 6000
const TYPING_POLL_MS = 2500

export default function TaskDetailModal({ task, onClose, onEdit, onRead }: {
  task: Task
  onClose: () => void
  onEdit?: () => void
  /** Appelé une fois le fil marqué comme lu, pour que l'appelant efface immédiatement son propre
   * voyant « non lu » (cloche de notifications, bouton Discussion…) sans attendre le prochain
   * sondage. */
  onRead?: (taskId: number) => void
}) {
  const [messages, setMessages] = useState<TaskMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [typingNames, setTypingNames] = useState<string[]>([])
  const [myId, setMyId] = useState<number | null>(null)
  const [showMoreFields, setShowMoreFields] = useState(false)
  // Le dernier message reçu (pas de moi) est brièvement mis en évidence à l'ouverture — le
  // message entrant qu'on venait chercher en cliquant depuis la cloche de notifications.
  const [highlightId, setHighlightId] = useState<number | null>(null)
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
      fetchTaskMessages(task.id)
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
    markTaskMessagesRead(task.id).then(() => { if (!cancelled) onRead?.(task.id) }).catch(() => {})
    const interval = window.setInterval(() => load(true), POLL_MS)
    return () => { cancelled = true; window.clearInterval(interval) }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ne doit se relancer que si on ouvre une autre tâche ; onRead est stable pour l'appelant
  }, [task.id])

  useEffect(() => {
    let cancelled = false
    const poll = () => fetchTaskTyping(task.id).then((data) => { if (!cancelled) setTypingNames(data.typing) }).catch(() => {})
    poll()
    const interval = window.setInterval(poll, TYPING_POLL_MS)
    return () => { cancelled = true; window.clearInterval(interval) }
  }, [task.id])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  const triggerTyping = useTypingSignal(() => sendTaskTyping(task.id))

  const handleSend = async (contenu: string, attachment?: File) => {
    const created = await sendTaskMessage(task.id, contenu, attachment)
    setMessages((current) => [...current, created])
  }

  const handleEditMessage = async (id: number, contenu: string) => {
    const updated = await editTaskMessage(id, contenu)
    setMessages((current) => current.map((m) => m.id === id ? updated : m))
  }

  const handleDeleteMessage = async (id: number) => {
    await deleteTaskMessage(id)
    setMessages((current) => current.filter((m) => m.id !== id))
  }

  const restant = joursRestants(task)

  // Personnes qu'on peut taguer avec « @ » dans cette discussion — celles qui sont engagées sur
  // la tâche (voir _task_participants côté backend, qui notifie la bonne personne à la détection
  // d'une mention) : staffées, manager destinataire, et qui l'a créée.
  const mentionCandidates = Array.from(new Set([
    ...task.assignments.map((a) => a.user_nom),
    ...(task.equipe_manager_nom ? [task.equipe_manager_nom] : []),
    ...(task.created_by_nom ? [task.created_by_nom] : []),
  ]))

  const primaryFields: { label: string; value: ReactNode }[] = [
    { label: 'Statut', value: <span className={`arch-pill arch-pill-${task.statut}`}>{task.statut_display}</span> },
    { label: 'Manager destinataire', value: task.equipe_manager_nom ?? 'Aucun manager défini' },
    { label: 'Échéance', value: formatDate(task.echeance) },
    { label: 'Jours restants', value: restant ? <span className={`tdm-jours-restants tdm-jours-${restant.tone}`}>{restant.label}</span> : '—' },
    { label: 'Priorité', value: task.priorite_display },
  ]
  const secondaryFields: { label: string; value: ReactNode }[] = [
    { label: 'Projet / Nature', value: task.project_nom ? `${task.project_code} — ${task.project_nom}` : 'Transversale (aucun projet)' },
    { label: 'Équipe destinataire', value: `${task.equipe_code} — ${task.equipe_nom}` },
    { label: 'Ligne budgétaire', value: `${task.ligne_budgetaire_code} — ${task.ligne_budgetaire_nom}` },
    { label: 'Sous-ligne', value: task.ligne_budgetaire_declinaison || '—' },
    { label: 'Date de début', value: formatDate(task.date_debut) },
    { label: 'Créée par', value: task.created_by_nom ?? '—' },
  ]

  return (
    <div className="ge-modal-overlay" role="dialog" aria-modal="true" aria-label="Détail de la tâche" onMouseDown={onClose}>
      <div className="ge-modal tdm-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="tdm-topbar">
          <span className="tdm-code-chip">{task.code}</span>
          <div className="tdm-head-actions">
            {onEdit && <button type="button" className="ge-btn-outline" onClick={onEdit}><Pencil size={13} />Modifier</button>}
            <button type="button" className="ge-modal-close" onClick={onClose} aria-label="Fermer"><X size={16} /></button>
          </div>
        </div>

        <div className="tdm-body">
          <div className="tdm-fixed">
            <div className="tdm-head">
              <h2 className="tdm-title">{task.template_nom || 'Détail de la tâche'}</h2>
              <div className="tdm-crumbs">
                <span className="tdm-crumb">{task.project_code ?? 'Transversale'}</span>
                <span className="tdm-crumb-sep">/</span>
                <span className="tdm-crumb">{task.equipe_code} — {task.equipe_nom}</span>
              </div>
            </div>

            <div className="tdm-fieldrow">
              {primaryFields.map((f) => (
                <div className="tdm-field-card" key={f.label}>
                  <span className="tdm-field-label">{f.label}</span>
                  <span className="tdm-field-value">{f.value}</span>
                </div>
              ))}
              {showMoreFields && secondaryFields.map((f) => (
                <div className="tdm-field-card" key={f.label}>
                  <span className="tdm-field-label">{f.label}</span>
                  <span className="tdm-field-value">{f.value}</span>
                </div>
              ))}
              <button type="button" className="tdm-more-btn" onClick={() => setShowMoreFields((s) => !s)}>
                {showMoreFields ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                {showMoreFields ? 'Moins' : 'Plus'}
              </button>
            </div>

            {task.description && (
              <div className="tdm-description">
                <p>{task.description}</p>
              </div>
            )}

            <div className="tdm-assignments">
              <h4 className="tdm-assignments-head"><Users size={14} />Qui a été staffé ({task.assignments.length})</h4>
              {task.assignments.length === 0 ? (
                <p className="tm-empty">Personne n’est encore staffé sur cette tâche.</p>
              ) : (
                <ul className="tdm-assignment-list">
                  {task.assignments.map((a) => (
                    <li key={a.id}>
                      <span className="tdm-assignment-nom">{a.user_nom}</span>
                      <span className="tdm-assignment-meta">{a.heures} h · grade {a.user_grade} · {a.execution_statut_display}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="tdm-thread">
            <h4 className="tdm-thread-head"><History size={14} />Historique et discussion</h4>

            {loading ? (
              <p className="tm-empty">Chargement…</p>
            ) : loadError ? (
              <p className="tm-empty">{loadError}</p>
            ) : (
              <div className="tm-list tdm-list" ref={listRef}>
                {messages.length === 0 && (
                  <p className="tm-empty">Aucun événement pour l’instant.</p>
                )}
                {messages.map((m) => {
                  if (m.est_systeme) {
                    return (
                      <p key={m.id} className="tdm-system-entry">
                        <span>{m.auteur_nom ?? 'Quelqu’un'}</span> {m.contenu}
                        <time>{new Date(m.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</time>
                      </p>
                    )
                  }
                  const mine = m.auteur !== null && m.auteur === myId
                  return (
                    <MessageBubble
                      key={m.id} message={m} mine={mine} showAuthor
                      highlighted={m.id === highlightId}
                      onEdit={mine ? (contenu) => handleEditMessage(m.id, contenu) : undefined}
                      onDelete={mine ? () => handleDeleteMessage(m.id) : undefined}
                      mentionCandidates={mentionCandidates}
                    />
                  )
                })}
              </div>
            )}

            <TypingIndicator names={typingNames} />
            <MessageComposer
              onSend={handleSend} onTyping={triggerTyping}
              placeholder="Ajouter un commentaire ou un fichier concernant cette tâche… (@ pour mentionner quelqu’un)"
              mentionCandidates={mentionCandidates}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
