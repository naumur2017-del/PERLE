// Accès direct à une tâche (fiche + historique/discussion) pour quiconque y est concerné —
// son manager, les personnes staffées dessus, la Direction et le Pilotage — sans donner accès
// au reste de Staffing des équipes (attribution, KPIs…), réservé à la Direction/au Pilotage.
// Atteint via /staffing/equipes?task=<id> (voir App.tsx) quand l'utilisateur n'a pas
// config:view ; sinon c'est StaffingEquipesPage qui affiche ce même TaskDetailModal.
import { useEffect, useState } from 'react'
import { fetchTask, type Task } from '../api/tasks'
import { ApiError } from '../api/client'
import TaskDetailModal from '../components/TaskDetailModal'
import './TaskDiscussionPage.css'

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

export default function TaskDiscussionPage({ taskId, navigateTo }: { taskId: number; navigateTo: (page: string) => void }) {
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

  if (loading) return <section className="tdp-page"><p className="tdp-empty">Chargement…</p></section>

  if (loadError || !task) {
    return (
      <section className="tdp-page">
        <p className="tdp-empty">{loadError ?? 'Cette tâche n’existe pas ou plus.'}</p>
      </section>
    )
  }

  return (
    <section className="tdp-page">
      <TaskDetailModal task={task} onClose={() => navigateTo('accueil')} />
    </section>
  )
}
