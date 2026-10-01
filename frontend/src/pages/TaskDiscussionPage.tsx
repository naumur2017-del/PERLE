// Accès direct à une tâche (fiche + historique/discussion) pour quiconque y est concerné —
// son manager, les personnes staffées dessus, la Direction et le Pilotage — sans donner accès
// au reste de Staffing des équipes (attribution, KPIs…), réservé à la Direction/au Pilotage.
// Atteint via /staffing/equipes?task=<id> (voir App.tsx) quand l'utilisateur n'a pas
// config:view ; sinon c'est StaffingEquipesPage qui affiche ce même TaskDetailModal — un seul
// espace de discussion de tâche, partagé par toutes ces entrées (voir TaskDetailByIdModal).
import TaskDetailByIdModal from '../components/TaskDetailByIdModal'
import './TaskDiscussionPage.css'

export default function TaskDiscussionPage({ taskId, navigateTo }: { taskId: number; navigateTo: (page: string) => void }) {
  return (
    <section className="tdp-page">
      <TaskDetailByIdModal taskId={taskId} onClose={() => navigateTo('accueil')} />
    </section>
  )
}
