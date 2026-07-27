import type { ReactNode } from 'react'; import ModulePage from './ModulePage'; import './DeconnexionPage.css'
export default function DeconnexionPage({icon}:{icon:ReactNode}) { return <ModulePage icon={icon} title="Déconnexion" description="Quittez votre session PERLE en toute sécurité." /> }
