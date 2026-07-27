import type { ReactNode } from 'react'; import ModulePage from './ModulePage'; import './SalariePage.css'
export default function SalariePage({icon}:{icon:ReactNode}) { return <ModulePage icon={icon} title="Salarié" description="Consultez et gérez les informations liées aux salariés." /> }
