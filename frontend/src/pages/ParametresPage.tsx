import type { ReactNode } from 'react'; import ModulePage from './ModulePage'; import './ParametresPage.css'
export default function ParametresPage({icon}:{icon:ReactNode}) { return <ModulePage icon={icon} title="Paramètres" description="Configurez les préférences et les paramètres de PERLE." /> }
