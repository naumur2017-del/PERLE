import { useState, type FormEvent, type ReactNode } from 'react'
import './ArchitecturePage.css'

interface ArchitectureTask {
  id: number
  name: string
  description: string
}

const storageKey = 'perle-architecture-tasks'

const loadTasks = (): ArchitectureTask[] => {
  try {
    const savedTasks = localStorage.getItem(storageKey)
    return savedTasks ? JSON.parse(savedTasks) : []
  } catch {
    return []
  }
}

export default function ArchitecturePage({ icon }: { icon: ReactNode }) {
  const [isCreating, setIsCreating] = useState(false)
  const [taskName, setTaskName] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [tasks, setTasks] = useState<ArchitectureTask[]>(loadTasks)

  const finishTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const newTask = {
      id: Date.now(),
      name: taskName.trim(),
      description: taskDescription.trim(),
    }
    const updatedTasks = [...tasks, newTask]
    setTasks(updatedTasks)
    localStorage.setItem(storageKey, JSON.stringify(updatedTasks))
    setTaskName('')
    setTaskDescription('')
    setIsCreating(false)
  }

  return (
    <section className="architecture-page">
      <div className="architecture-heading">
        <div className="architecture-title">
          <span className="architecture-icon">{icon}</span>
          <div><span className="section-eyebrow">Architecture</span><h2>Architecture des Tâches</h2><p>Créez et consultez les tâches disponibles pour vos projets.</p></div>
        </div>
        {!isCreating && <button className="create-task-button" onClick={() => setIsCreating(true)}>Création de Tâches</button>}
      </div>

      {isCreating && <form className="task-creation-card" onSubmit={finishTask}>
        <div><h3>Création de Tâche</h3><p>Renseignez les informations de la nouvelle tâche.</p></div>
        <label><span>Nom de la Tâche <em>*</em></span><input value={taskName} onChange={(event) => setTaskName(event.target.value)} required autoFocus /></label>
        <label><span>Description <em>*</em></span><textarea value={taskDescription} onChange={(event) => setTaskDescription(event.target.value)} required rows={5} /></label>
        <div className="task-creation-actions"><button type="submit">Terminer</button></div>
      </form>}

      <div className="architecture-task-list">
        <div className="task-list-heading"><div><h3>Liste des Tâches</h3><p>{tasks.length} tâche{tasks.length !== 1 ? 's' : ''} enregistrée{tasks.length !== 1 ? 's' : ''}</p></div></div>
        {tasks.length === 0
          ? <div className="empty-task-list">Aucune tâche enregistrée.</div>
          : <div className="task-list-grid">{tasks.map((task) => <article key={task.id}><strong>{task.name}</strong><p>{task.description}</p></article>)}</div>}
      </div>
    </section>
  )
}
