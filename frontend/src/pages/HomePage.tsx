import { useState } from 'react'
import './HomePage.css'
import HomeDashboard from './HomeDashboard'
import ManagerDashboard from './ManagerDashboard'
import EmployeeDashboard from './EmployeeDashboard'
import { useI18n } from '../i18n/I18nContext'
import type { Session } from '../auth/session'

/* L'accueil ne présente plus de grille de « Modules » (la navigation latérale suffit) :
   il affiche directement le(s) tableau(x) de bord adapté(s) au profil de l'utilisateur, chacun
   personnalisé à ses propres données (jamais un simple message générique).
   - salarié (y compris un manager ou un directeur) → « Mon espace », ses tâches/EHS/congés/rémunération
   - manager d'une équipe      → en plus, « Tableau de bord manager » (son équipe + le suivi de chaque membre)
   - directeur                 → en plus, « Tableau de bord de direction »
   Plusieurs onglets apparaissent dès que plusieurs de ces profils s'appliquent au même utilisateur. */
export default function HomePage({ session, navigateTo }: { session: Session; navigateTo: (page: string) => void }) {
  const { t } = useI18n()
  const isDirector = session.role === 'directeur'
  const managesTeam = (session.managedTeams ?? []).length > 0

  const availableTabs = [
    ...(isDirector ? [{ id: 'direction' as const, label: 'Tableau de bord de direction' }] : []),
    ...(managesTeam ? [{ id: 'manager' as const, label: 'Tableau de bord manager' }] : []),
    { id: 'employee' as const, label: 'Mon espace' },
  ]
  const [tab, setTab] = useState<'direction' | 'manager' | 'employee'>(availableTabs[0].id)

  const content = tab === 'direction' ? <HomeDashboard navigateTo={navigateTo} />
    : tab === 'manager' ? <ManagerDashboard session={session} navigateTo={navigateTo} />
    : <EmployeeDashboard session={session} navigateTo={navigateTo} />

  if (availableTabs.length === 1) return <div className="home-page">{content}</div>

  return <div className="home-page home-dashboards">
    <div className="dsh-segmented home-dash-tabs" role="tablist" aria-label="Choix du tableau de bord">
      {availableTabs.map((item) => (
        <button
          key={item.id} type="button" role="tab" aria-selected={tab === item.id}
          className={tab === item.id ? 'is-active' : ''} onClick={() => setTab(item.id)}
        >{t(item.label)}</button>
      ))}
    </div>
    {content}
  </div>
}

