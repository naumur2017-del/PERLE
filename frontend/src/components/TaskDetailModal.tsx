// Fenêtre de détail complet d'une tâche : tous ses champs (statut, manager, dates, description…)
// ainsi que son fil d'historique/discussion — chaque opération significative (envoi, décision,
// staffing, exécution…) y est mentionnée automatiquement (TaskMessage.est_systeme, voir backend
// _log_task_event), et on peut y joindre des fichiers comme dans n'importe quelle discussion de
// tâche (voir MessageComposer). Réutilise les classes globales arch-panel-view/arch-task-detail
// (StaffingEquipesPage.tsx) pour rester visuellement cohérent avec le panneau de détail existant.
import { useEffect, useRef, useState } from 'react'
import { History, X } from 'lucide-react'
import {
  fetchTaskMessages, fetchTaskTyping, sendTaskMessage, sendTaskTyping, type TaskMessage,
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

const POLL_MS = 6000
const TYPING_POLL_MS = 2500

export default function TaskDetailModal({ task, onClose, onOpenFull }: { task: Task; onClose: () => void; onOpenFull?: () => void }) {
  const [messages, setMessages] = useState<TaskMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [typingNames, setTypingNames] = useState<string[]>([])
  const [myId, setMyId] = useState<number | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchMe().then((me) => setMyId(me.id)).catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = (silent: boolean) => {
      if (!silent) setLoading(true)
      fetchTaskMessages(task.id)
        .then((data) => { if (!cancelled) { setMessages(data); setLoadError(null) } })
        .catch((err) => { if (!cancelled && !silent) setLoadError(errorMessage(err)) })
        .finally(() => { if (!cancelled && !silent) setLoading(false) })
    }
    load(false)
    const interval = window.setInterval(() => load(true), POLL_MS)
    return () => { cancelled = true; window.clearInterval(interval) }
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

  return (
    <div className="ge-modal-overlay" role="dialog" aria-modal="true" aria-label="Détail de la tâche" onMouseDown={onClose}>
      <div className="ge-modal tdm-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="ge-modal-head">
          <h3>DÉTAIL DE LA TÂCHE</h3>
          <div className="tdm-head-actions">
            {onOpenFull && <button type="button" className="ge-btn-outline" onClick={onOpenFull}>Ouvrir dans Staffing des équipes</button>}
            <button type="button" className="ge-modal-close" onClick={onClose} aria-label="Fermer"><X size={16} /></button>
          </div>
        </div>

        <div className="tdm-body">
          <div className="arch-panel-view tdm-fields">
            <div className="arch-panel-view-head">
              <strong>{task.code}</strong>
              <span className={`arch-pill arch-pill-${task.statut}`}>{task.statut_display}</span>
            </div>
            <h4>{task.template_nom || 'Détail de la tâche'}</h4>
            {task.description && <p className="arch-task-detail-desc">{task.description}</p>}
            <dl className="arch-task-detail">
              <div><dt>Projet / Nature</dt><dd>{task.project_nom ? `${task.project_code} — ${task.project_nom}` : 'Transversale (aucun projet)'}</dd></div>
              <div><dt>Équipe destinataire</dt><dd>{task.equipe_code} — {task.equipe_nom}</dd></div>
              <div><dt>Manager destinataire</dt><dd>{task.equipe_manager_nom ?? 'Aucun manager défini'}</dd></div>
              <div><dt>Ligne budgétaire</dt><dd>{task.ligne_budgetaire_code} — {task.ligne_budgetaire_nom}</dd></div>
              <div><dt>Sous-ligne</dt><dd>{task.ligne_budgetaire_declinaison || '—'}</dd></div>
              <div><dt>Date de début</dt><dd>{formatDate(task.date_debut)}</dd></div>
              <div><dt>Échéance</dt><dd>{formatDate(task.echeance)}</dd></div>
              <div><dt>Priorité</dt><dd>{task.priorite_display}</dd></div>
              <div><dt>Créée par</dt><dd>{task.created_by_nom ?? '—'}</dd></div>
            </dl>
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
                {messages.map((m) => m.est_systeme ? (
                  <p key={m.id} className="tdm-system-entry">
                    <span>{m.auteur_nom ?? 'Quelqu’un'}</span> {m.contenu}
                    <time>{new Date(m.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</time>
                  </p>
                ) : (
                  <MessageBubble key={m.id} message={m} mine={m.auteur !== null && m.auteur === myId} showAuthor />
                ))}
              </div>
            )}

            <TypingIndicator names={typingNames} />
            <MessageComposer onSend={handleSend} onTyping={triggerTyping} placeholder="Ajouter un commentaire ou un fichier concernant cette tâche…" />
          </div>
        </div>
      </div>
    </div>
  )
}
