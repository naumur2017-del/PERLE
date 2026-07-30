import ProjectCreation from '../components/ProjectCreation'
import './CreationProjetPage.css'
export default function CreationProjetPage({ onCancel }: { onCancel: () => void }) { return <div className="creation-project-page"><ProjectCreation onCancel={onCancel} /></div> }
