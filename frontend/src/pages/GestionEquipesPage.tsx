import type { ReactNode } from 'react'; import ModulePage from './ModulePage'; import './GestionEquipesPage.css'
export default function GestionEquipesPage({icon}:{icon:ReactNode}) { return <ModulePage icon={icon} title="Gestion des équipes" description="Gérez les collaborateurs, les grades et les compétences." /> }
