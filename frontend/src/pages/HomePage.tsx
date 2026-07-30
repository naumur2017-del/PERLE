import type { ReactNode } from 'react'
import './HomePage.css'
import HomeDashboard from './HomeDashboard'
import { useI18n } from '../i18n/I18nContext'

interface HomeModule { id: number; icon: ReactNode; title: string; description: string }

export default function HomePage({ modules, navigateTo }: { modules: HomeModule[]; navigateTo: (page: string) => void }) {
  const { t } = useI18n()
  const destinations = ['pilotage', 'creation', 'staffing', 'gestion', 'tresorerie', 'salarie', 'architecture']
  return <>
    <section className="modules-section home-page">
    <h2>{t('Modules')}</h2>
    <div className="modules-grid">{modules.map((module) => <div
      key={module.id}
      className="module-card clickable-module-card"
      role="link"
      tabIndex={0}
      onClick={() => navigateTo(destinations[module.id - 1])}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          navigateTo(destinations[module.id - 1])
        }
      }}
    >
      <div className="module-icon">{module.icon}</div><h3>{t(module.title)}</h3><p>{t(module.description)}</p>
      <span className="acceder-btn">{t('Accéder')} →</span>
    </div>)}</div>
    </section>

    {/* Tableau de bord de direction : la suite de l’accueil du workspace directeur. */}
    <HomeDashboard navigateTo={navigateTo} />
  </>
}
