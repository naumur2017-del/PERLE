import { useEffect, useState } from 'react'
import './App.css'
import sampleHeader from './assets/sample header.png'
import AnimatedLogo from './components/AnimatedLogo'
import SplashScreen from './components/SplashScreen'

interface Module {
  id: number
  icon: string
  title: string
  description: string
}

function App() {
  const [activeNav, setActiveNav] = useState('accueil')
  const [splashVisible, setSplashVisible] = useState(true)
  const [splashFading, setSplashFading] = useState(false)

  useEffect(() => {
    const fadeTimer = setTimeout(() => setSplashFading(true), 2500)
    const hideTimer = setTimeout(() => setSplashVisible(false), 3000)
    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(hideTimer)
    }
  }, [])

  const navItems = [
    { id: 'accueil', label: 'Accueil', icon: '🏠' },
    { id: 'pilotage', label: 'Pilotage des projets', icon: '📊' },
    { id: 'creation', label: 'Création de projet', icon: '➕' },
    { id: 'staffing', label: 'Staffing', icon: '👥' },
    { id: 'gestion', label: 'Gestion des équipes', icon: '👤' },
    { id: 'tresorerie', label: 'Trésorerie', icon: '🏦' },
    { id: 'salarie', label: 'Salarié', icon: '👨' },
    { id: 'architecture', label: 'Architecture', icon: '🏢' },
    { id: 'parametres', label: 'Paramètres', icon: '⚙️' },
    { id: 'deconnexion', label: 'Déconnexion', icon: '🚪' },
  ]

  const modules: Module[] = [
    {
      id: 1,
      icon: '📊',
      title: 'Pilotage des projets',
      description: 'Vue globale de l\'ensemble des projets, activités et indicateurs de performance. Consolidez, fonctionnez et réorganisez les lignes.'
    },
    {
      id: 2,
      icon: '📁',
      title: 'Création de projet',
      description: 'Créer de nouveaux projets et consulter leur Projet Plan initial (paramètres financiers, activités, lignes budgétaires...).'
    },
    {
      id: 3,
      icon: '👥',
      title: 'Staffing',
      description: 'Affecter les collaborateurs aux lignes budgétaires, ouvrir les staffings en cours de l\'historique des allocations.'
    },
    {
      id: 4,
      icon: '👤',
      title: 'Gestion des équipes',
      description: 'Gérer les équipes, collaborateurs, grades et compétences EHS. Suivre l\'évolution des équipes et des compétences.'
    },
    {
      id: 5,
      icon: '🏦',
      title: 'Trésorerie',
      description: 'Ordonner et suivre les paiements, transferts et flux financiers. Validation, exécution et suivi par la trésorerie.'
    },
    {
      id: 6,
      icon: '👨',
      title: 'Salarié',
      description: 'Consulter vos fiches de paie, demander des avances, poser des congés et suivre vos EHS et rémunérations.'
    },
    {
      id: 7,
      icon: '🏢',
      title: 'Architecture',
      description: 'Gérer les référentiels : architecture des tâches et architecture monétaire (types de dépenses, recettes, transferts...).'
    },
  ]

  return (
    <>
      {splashVisible && <SplashScreen fadingOut={splashFading} />}
      <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">
              <AnimatedLogo size={40} animate gradientId="sidebar-logo-gradient" />
            </span>
            <div className="logo-text">
              <h3>PERLE</h3>
              <p>Pilotage par les EHS</p>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeNav === item.id ? 'active' : ''}`}
              onClick={() => setActiveNav(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Header with Hero Section */}
        <header className="app-header">
          {/* Hero Section */}
          <section className="hero-section">
            {/* Hero Top with Controls */}
            <div className="hero-top-controls">
              <button className="team-button">
                <span>Équipe de pilotage</span>
                <span className="dropdown-icon">▼</span>
              </button>
              <div className="hero-actions">
                <button className="notification-btn">🔔</button>
                <div className="user-profile">
                  <span className="avatar">EP</span>
                  <div className="user-info">
                    <span className="user-name">Équipe Pilotage</span>
                    <button className="profile-dropdown">▼</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="hero-content">
              <div className="hero-text">
                <h1>Accueil</h1>
                <p>Bienvenue dans PERLE, votre système de pilotage intégré.</p>
              </div>
              <img src={sampleHeader} alt="Header Sample" className="hero-image" />
            </div>
            <div className="hero-background"></div>
          </section>
        </header>

        {/* Modules Section */}
        <section className="modules-section">
          <h2>Modules</h2>
          <div className="modules-grid">
            {modules.map((module) => (
              <div key={module.id} className="module-card">
                <div className="module-icon">{module.icon}</div>
                <h3>{module.title}</h3>
                <p>{module.description}</p>
                <button className="acceder-btn">Accéder →</button>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="app-footer">
          <p>PERLE - Pilotage par les EHS | © 2024 NAUMUR</p>
        </footer>
      </main>
      </div>
    </>
  )
}

export default App
