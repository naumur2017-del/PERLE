import { useState } from 'react'
import './HomePage.css'
import HomeDashboard from './HomeDashboard'
import ManagerDashboard from './ManagerDashboard'
import { useI18n } from '../i18n/I18nContext'
import type { Session } from '../auth/session'

/* L'accueil ne présente plus de grille de « Modules » (la navigation latérale suffit) :
   il affiche directement le tableau de bord adapté au profil de l'utilisateur.
   - directeur                → tableau de bord de direction
   - manager d'une équipe      → tableau de bord manager
   - directeur ET manager      → deux onglets
   - salarié sans équipe gérée → simple message de bienvenue */
export default function HomePage({ session, navigateTo }: { session: Session; navigateTo: (page: string) => void }) {
  const { t } = useI18n()
  const isDirector = session.role === 'directeur'
  const managesTeam = (session.managedTeams ?? []).length > 0
  const [tab, setTab] = useState<'direction' | 'manager'>('direction')

  if (isDirector && managesTeam) {
    return <div className="home-page home-dashboards">
      <div className="dsh-segmented home-dash-tabs" role="tablist" aria-label="Choix du tableau de bord">
        <button type="button" role="tab" aria-selected={tab === 'direction'}
          className={tab === 'direction' ? 'is-active' : ''} onClick={() => setTab('direction')}>
          {t('Tableau de bord de direction')}
        </button>
        <button type="button" role="tab" aria-selected={tab === 'manager'}
          className={tab === 'manager' ? 'is-active' : ''} onClick={() => setTab('manager')}>
          {t('Tableau de bord manager')}
        </button>
      </div>
      {tab === 'direction'
        ? <HomeDashboard navigateTo={navigateTo} />
        : <ManagerDashboard session={session} navigateTo={navigateTo} />}
    </div>
  }

  if (isDirector) return <div className="home-page"><HomeDashboard navigateTo={navigateTo} /></div>
  if (managesTeam) return <div className="home-page"><ManagerDashboard session={session} navigateTo={navigateTo} /></div>

  return <HomeWelcome firstName={session.firstName} navigateTo={navigateTo} />
}

const WELCOME_SHORTCUTS: { page: string; title: string; description: string }[] = [
  { page: 'salarie', title: 'Mon espace salarié', description: 'Fiches de paie, congés, avances et rémunérations.' },
  { page: 'staffing-execute', title: 'Mes tâches', description: 'Suivez et exécutez les tâches sur lesquelles vous êtes staffé.' },
  { page: 'messagerie', title: 'Messagerie', description: 'Échangez avec vos collègues et vos équipes.' },
  { page: 'aide', title: 'Centre d’assistance', description: 'Guides, FAQ et contact du support PERLE.' },
]

function HomeWelcome({ firstName, navigateTo }: { firstName: string; navigateTo: (page: string) => void }) {
  const { t } = useI18n()
  return <section className="home-welcome home-page">
    <div className="home-welcome-intro">
      <span className="home-welcome-eyebrow">PERLE</span>
      <h2>{t('Bonjour')} {firstName}</h2>
      <p>{t('Bienvenue dans PERLE, votre système de pilotage intégré.')}</p>
    </div>
    <div className="home-welcome-grid">
      {WELCOME_SHORTCUTS.map((shortcut) => <button
        key={shortcut.page}
        type="button"
        className="home-welcome-card"
        onClick={() => navigateTo(shortcut.page)}
      >
        <h3>{t(shortcut.title)}</h3>
        <p>{t(shortcut.description)}</p>
        <span className="acceder-btn">{t('Accéder')} →</span>
      </button>)}
    </div>
  </section>
}
