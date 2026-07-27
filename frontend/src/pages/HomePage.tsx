import type { ReactNode } from 'react'
import './HomePage.css'

interface HomeModule { id: number; icon: ReactNode; title: string; description: string }

export default function HomePage({ modules, navigateTo }: { modules: HomeModule[]; navigateTo: (page: string) => void }) {
  const destinations = ['pilotage', 'creation', 'staffing', 'gestion', 'tresorerie', 'salarie', 'architecture']
  return <section className="modules-section home-page">
    <h2>Modules</h2>
    <div className="modules-grid">{modules.map((module) => <div key={module.id} className="module-card">
      <div className="module-icon">{module.icon}</div><h3>{module.title}</h3><p>{module.description}</p>
      <button className="acceder-btn" onClick={() => navigateTo(destinations[module.id - 1])}>Accéder →</button>
    </div>)}</div>
  </section>
}
