import type { ReactNode } from 'react'; import ModulePage from './ModulePage'; import './ArchitecturePage.css'
export default function ArchitecturePage({icon}:{icon:ReactNode}) { return <ModulePage icon={icon} title="Architecture" description="Gérez les référentiels et les architectures de tâches." /> }
