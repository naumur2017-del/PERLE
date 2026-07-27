import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type UIEvent } from 'react'
import './App.css'
import sampleHeader from './assets/sample header.png'
import AnimatedLogo from './components/AnimatedLogo'
import SplashScreen from './components/SplashScreen'
import HomePage from './pages/HomePage'
import PilotagePage from './pages/PilotagePage'
import CreationProjetPage from './pages/CreationProjetPage'
import StaffingPage from './pages/StaffingPage'
import GestionEquipesPage from './pages/GestionEquipesPage'
import TresoreriePage from './pages/TresoreriePage'
import SalariePage from './pages/SalariePage'
import ArchitecturePage from './pages/ArchitecturePage'
import ParametresPage from './pages/ParametresPage'
import DeconnexionPage from './pages/DeconnexionPage'

interface Module {
  id: number
  icon: ReactNode
  title: string
  description: string
}

const pageConfig: Record<string, { path: string; title: string; description: string }> = {
  accueil: { path: '/', title: 'Accueil', description: 'Bienvenue dans PERLE, votre système de pilotage intégré.' },
  pilotage: { path: '/pilotage', title: 'Pilotage des projets', description: 'Suivez vos projets, leurs indicateurs et leur avancement.' },
  creation: { path: '/creation-projet', title: 'Création de projet', description: 'Créez et planifiez un nouveau projet.' },
  staffing: { path: '/staffing', title: 'Staffing', description: 'Affectez les collaborateurs et suivez les allocations des équipes.' },
  gestion: { path: '/gestion-equipes', title: 'Gestion des équipes', description: 'Gérez les collaborateurs, les grades et les compétences.' },
  tresorerie: { path: '/tresorerie', title: 'Trésorerie', description: 'Suivez les paiements, transferts et flux financiers.' },
  salarie: { path: '/salarie', title: 'Salarié', description: 'Consultez et gérez les informations liées aux salariés.' },
  architecture: { path: '/architecture', title: 'Architecture', description: 'Gérez les référentiels et les architectures de tâches.' },
  parametres: { path: '/parametres', title: 'Paramètres', description: 'Configurez les préférences et les paramètres de PERLE.' },
  deconnexion: { path: '/deconnexion', title: 'Déconnexion', description: 'Quittez votre session PERLE en toute sécurité.' },
}

function AppIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#ffffff"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

function App() {
  const getPageFromPath = () => {
    return Object.entries(pageConfig).find(([, page]) => page.path === window.location.pathname)?.[0] ?? 'accueil'
  }

  const [activeNav, setActiveNav] = useState(getPageFromPath)
  const [splashVisible, setSplashVisible] = useState(true)
  const [splashFading, setSplashFading] = useState(false)
  const [headerCollapse, setHeaderCollapse] = useState(0)
  const mainContentRef = useRef<HTMLElement>(null)

  const handleMainScroll = (event: UIEvent<HTMLElement>) => {
    setHeaderCollapse(Math.min(event.currentTarget.scrollTop / 110, 1))
  }

  const headerStyle = {
    '--header-collapse': headerCollapse,
  } as CSSProperties

  useEffect(() => {
    const fadeTimer = setTimeout(() => setSplashFading(true), 5000)
    const hideTimer = setTimeout(() => setSplashVisible(false), 5500)
    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(hideTimer)
    }
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      setActiveNav(getPageFromPath())
      mainContentRef.current?.scrollTo({ top: 0 })
      setHeaderCollapse(0)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigateTo = (page: string) => {
    setActiveNav(page)
    mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    setHeaderCollapse(0)

    if (pageConfig[page]) {
      const path = pageConfig[page].path
      if (window.location.pathname !== path) window.history.pushState({}, '', path)
    }
  }

  const icons = {
    accueil: <AppIcon><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" /><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></AppIcon>,
    pilotage: <AppIcon><path d="M5 21v-6" /><path d="M12 21V9" /><path d="M19 21V3" /></AppIcon>,
    creation: <AppIcon><path d="M12 10v6" /><path d="M9 13h6" /><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" /></AppIcon>,
    staffing: <AppIcon><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><path d="M16 3.128a4 4 0 0 1 0 7.744" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><circle cx="9" cy="7" r="4" /></AppIcon>,
    gestion: <AppIcon><path d="m11 17 2 2a1 1 0 1 0 3-3" /><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4" /><path d="m21 3 1 11h-2" /><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" /><path d="M3 4h8" /></AppIcon>,
    tresorerie: <AppIcon><path d="M10 18v-7" /><path d="M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z" /><path d="M14 18v-7" /><path d="M18 18v-7" /><path d="M3 22h18" /><path d="M6 18v-7" /></AppIcon>,
    salarie: <AppIcon><path d="M15 13a3 3 0 1 0-6 0" /><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" /><circle cx="12" cy="8" r="2" /></AppIcon>,
    architecture: <AppIcon><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5V19A9 3 0 0 0 21 19V5" /><path d="M3 12A9 3 0 0 0 21 12" /></AppIcon>,
    parametres: <AppIcon><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" /><circle cx="12" cy="12" r="3" /></AppIcon>,
    deconnexion: <AppIcon><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /></AppIcon>,
  }

  const navItems = [
    { id: 'accueil', label: 'Accueil', icon: icons.accueil },
    { id: 'pilotage', label: 'Pilotage des projets', icon: icons.pilotage },
    { id: 'creation', label: 'Création de projet', icon: icons.creation },
    { id: 'staffing', label: 'Staffing', icon: icons.staffing },
    { id: 'gestion', label: 'Gestion des équipes', icon: icons.gestion },
    { id: 'tresorerie', label: 'Trésorerie', icon: icons.tresorerie },
    { id: 'salarie', label: 'Salarié', icon: icons.salarie },
    { id: 'architecture', label: 'Architecture', icon: icons.architecture },
    { id: 'parametres', label: 'Paramètres', icon: icons.parametres },
    { id: 'deconnexion', label: 'Déconnexion', icon: icons.deconnexion },
  ]

  const modules: Module[] = [
    {
      id: 1,
      icon: icons.pilotage,
      title: 'Pilotage des projets',
      description: 'Vue globale de l\'ensemble des projets, activités et indicateurs de performance. Consolidez, fonctionnez et réorganisez les lignes.'
    },
    {
      id: 2,
      icon: icons.creation,
      title: 'Création de projet',
      description: 'Créer de nouveaux projets et consulter leur Projet Plan initial (paramètres financiers, activités, lignes budgétaires...).'
    },
    {
      id: 3,
      icon: icons.staffing,
      title: 'Staffing',
      description: 'Affecter les collaborateurs aux lignes budgétaires, ouvrir les staffings en cours de l\'historique des allocations.'
    },
    {
      id: 4,
      icon: icons.gestion,
      title: 'Gestion des équipes',
      description: 'Gérer les équipes, collaborateurs, grades et compétences EHS. Suivre l\'évolution des équipes et des compétences.'
    },
    {
      id: 5,
      icon: icons.tresorerie,
      title: 'Trésorerie',
      description: 'Ordonner et suivre les paiements, transferts et flux financiers. Validation, exécution et suivi par la trésorerie.'
    },
    {
      id: 6,
      icon: icons.salarie,
      title: 'Salarié',
      description: 'Consulter vos fiches de paie, demander des avances, poser des congés et suivre vos EHS et rémunérations.'
    },
    {
      id: 7,
      icon: icons.architecture,
      title: 'Architecture',
      description: 'Gérer les référentiels : architecture des tâches et architecture monétaire (types de dépenses, recettes, transferts...).'
    },
  ]

  const isHomePage = activeNav === 'accueil'
  const currentPage = pageConfig[activeNav] ?? pageConfig.accueil
  const pageTitle = currentPage.title
  const pageDescription = currentPage.description

  const renderPage = () => {
    switch (activeNav) {
      case 'pilotage': return <PilotagePage />
      case 'creation': return <CreationProjetPage />
      case 'staffing': return <StaffingPage />
      case 'gestion': return <GestionEquipesPage icon={icons.gestion} />
      case 'tresorerie': return <TresoreriePage icon={icons.tresorerie} />
      case 'salarie': return <SalariePage icon={icons.salarie} />
      case 'architecture': return <ArchitecturePage icon={icons.architecture} />
      case 'parametres': return <ParametresPage icon={icons.parametres} />
      case 'deconnexion': return <DeconnexionPage icon={icons.deconnexion} />
      default: return <HomePage modules={modules} navigateTo={navigateTo} />
    }
  }

  return (
    <>
      {splashVisible && <SplashScreen fadingOut={splashFading} />}
      <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo" onClick={() => navigateTo('accueil')}>
            <span className="logo-icon">
              <AnimatedLogo size={40} animate uid="sidebar-logo" />
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
              onClick={() => navigateTo(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main ref={mainContentRef} className="main-content" onScroll={handleMainScroll}>
        <header
          className={`app-header ${headerCollapse > 0.85 ? 'is-collapsed' : ''}`}
          style={headerStyle}
        >
          {/* Hero Section */}
          <section className="hero-section">
            <nav className="hero-breadcrumb" aria-label="Fil d’Ariane">
              <button onClick={() => navigateTo('accueil')}>Accueil</button>
              {!isHomePage && <>
                <span>›</span>
                <button onClick={() => navigateTo(activeNav)}>{pageTitle}</button>
              </>}
            </nav>
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
                <h1>{pageTitle}</h1>
                <p>{pageDescription}</p>
              </div>
              <img src={sampleHeader} alt="Header Sample" className="hero-image" />
            </div>
            <div className="hero-background"></div>
          </section>
        </header>

        {renderPage()}

        {/* Footer */}
        <footer className="app-footer">
          <p>PERLE - Pilotage par les EHS | © {new Date().getFullYear()} NAUMUR</p>
        </footer>
      </main>
      </div>
    </>
  )
}

export default App
