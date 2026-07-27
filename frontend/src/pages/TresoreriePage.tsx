import type { ReactNode } from 'react'; import ModulePage from './ModulePage'; import './TresoreriePage.css'
export default function TresoreriePage({icon}:{icon:ReactNode}) { return <ModulePage icon={icon} title="Trésorerie" description="Suivez les paiements, transferts et flux financiers." /> }
