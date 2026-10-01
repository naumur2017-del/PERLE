// Ouvre la fiche complète d'une tâche (TaskDetailModal — champs + historique/discussion) à
// partir de son seul id, en la récupérant d'abord : utilisé partout où on ne dispose que d'un
// identifiant de tâche (notification, bouton « Discussion » depuis une attribution) et où l'on
// veut malgré tout le même espace de discussion unique que Staffing des équipes, plutôt qu'une
// fenêtre de messages distincte.
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { fetchTask, type Task } from '../api/tasks'
import { ApiError } from '../api/client'
import TaskDetailModal from './TaskDetailModal'

const errorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    if (error.status === 404) return 'Cette tâche n’existe pas ou plus.'
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

export default function TaskDetailByIdModal({ taskId, onClose, onEdit, onRead }: {
  taskId: number
  onClose: () => void
  onEdit?: (task: Task) => void
  onRead?: (taskId: number) => void
}) {
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchTask(taskId)
      .then((data) => { if (!cancelled) setTask(data) })
      .catch((err) => { if (!cancelled) setLoadError(errorMessage(err)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [taskId])

  if (loading || loadError || !task) {
    return (
      <div className="ge-modal-overlay" role="dialog" aria-modal="true" aria-label="Discussion de la tâche" onMouseDown={onClose}>
        <div className="ge-modal param-modal" onMouseDown={(event) => event.stopPropagation()}>
          <div className="ge-modal-head">
            <h3>Discussion de la tâche</h3>
            <button type="button" className="ge-modal-close" onClick={onClose} aria-label="Fermer"><X size={16} /></button>
          </div>
          <p className="tm-empty">{loading ? 'Chargement…' : (loadError ?? 'Cette tâche n’existe pas ou plus.')}</p>
        </div>
      </div>
    )
  }

  return <TaskDetailModal task={task} onClose={onClose} onEdit={onEdit ? () => onEdit(task) : undefined} onRead={onRead} />
}
