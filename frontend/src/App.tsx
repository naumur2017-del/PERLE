import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type UIEvent } from 'react'
import { ChevronDown, ChevronUp, Eye, MessageSquareWarning, Pause, Play, Timer } from 'lucide-react'
import './App.css'
import sampleHeader from './assets/sample header.png'
import AnimatedLogo from './components/AnimatedLogo'
import SplashScreen from './components/SplashScreen'
import HomePage from './pages/HomePage'
import PilotagePage, { type PilotageFocusTarget } from './pages/PilotagePage'
import ControleTachesPage from './pages/ControleTachesPage'
import PerformanceStaffingPage from './pages/PerformanceStaffingPage'
import ExecuteStaffingPage from './pages/ExecuteStaffingPage'
import PaiementsExecutesPage from './pages/PaiementsExecutesPage'
import ComptesOperationsPage from './pages/ComptesOperationsPage'
import JournalTresoreriePage from './pages/JournalTresoreriePage'
import MercurialesPage from './pages/MercurialesPage'
import GuidePage from './pages/GuidePage'
import CentreAssistancePage from './pages/CentreAssistancePage'
import CreationProjetPage from './pages/CreationProjetPage'
import StaffingPage from './pages/StaffingPage'
import SuiviStaffingPage from './pages/SuiviStaffingPage'
import MessagingPage from './pages/MessagingPage'
import GestionEquipesPage from './pages/GestionEquipesPage'
import HistoriqueEmployesPage from './pages/HistoriqueEmployesPage'
import DemandesEmployesPage from './pages/DemandesEmployesPage'
import OrganigrammePage from './pages/OrganigrammePage'
import EquipesPage from './pages/EquipesPage'
import TresoreriePage from './pages/TresoreriePage'
import SalariePage from './pages/SalariePage'
import ArchitectureMonetairePage from './pages/ArchitectureMonetairePage'
import ArchitecturePage from './pages/ArchitecturePage'
import ParametresPage from './pages/ParametresPage'
import ModulePage from './pages/ModulePage'
import LoginScreen from './components/LoginScreen'
import AdminDashboardPage from './pages/AdminDashboardPage'
import { clearSession, getSession, saveSession, type Session } from './auth/session'
import { executeTaskAssignmentAction, fetchTaskAssignments, type TaskAssignment } from './api/taskAssignments'
import { fetchMe, sendHeartbeat } from './api/employees'
import TaskMessagesModal from './components/TaskMessagesModal'
import { useUnreadMessages } from './hooks/useUnreadMessages'

interface Module {
  id: number
  icon: ReactNode
  title: string
  description: string
}

const pageConfig: Record<string, { path: string; title: string; description: string }> = {
  accueil: { path: '/', title: 'Accueil', description: 'Bienvenue dans PERLE, votre système de pilotage intégré.' },
  messagerie: { path: '/messagerie', title: 'Messagerie', description: "Discutez avec n'importe quel membre de votre organisation." },
  pilotage: { path: '/pilotage', title: 'Pilotage des projets et gestion budgétaire', description: 'Vue globale des projets : budget, coûts, EHS, durées et avancement.' },
  'controle-taches': { path: '/pilotage/controle-taches', title: 'Contrôle des tâches', description: "Suivez l'avancement et la conformité des tâches EHS et monétaires de vos projets." },
  'controle-execution': { path: '/pilotage/controle-execution', title: 'Performance & Staffing', description: 'Suivez la performance de vos équipes et la mobilisation des ressources.' },
  creation: { path: '/creation-projet', title: 'Création de projet', description: 'Créez et planifiez un nouveau projet.' },
  staffing: { path: '/staffing', title: 'Nouveau staffing', description: 'Affectez les bonnes ressources aux bonnes tâches et suivez la planification en temps réel.' },
  'staffing-suivi': { path: '/staffing/suivi', title: 'Suivi des staffings', description: "Suivez l'évolution des staffing réalisés et leur statut." },
  'staffing-execute': { path: '/staffing/execute', title: 'Exécuté staffing', description: "Suivez l'exécution des tâches déjà staffées et l'avancement des collaborateurs affectés." },
  gestion: { path: '/gestion-equipes', title: 'Gestion des équipes', description: 'Suivre et gérer les collaborateurs, leurs grades et leurs affectations.' },
  'gestion-equipes': { path: '/gestion-equipes/equipes', title: 'Équipes', description: 'Consultez et organisez les équipes de l’entreprise.' },
  'gestion-organigramme': { path: '/gestion-equipes/organigramme', title: 'Organigramme', description: 'Visualisez la hiérarchie et les rattachements de l’entreprise.' },
  'gestion-historique': { path: '/gestion-equipes/historique', title: 'Historique des employés', description: 'Consultez l’historique des changements de grade et d’affectation de tous les employés.' },
  'gestion-demandes': { path: '/gestion-equipes/demandes', title: 'Demandes des employés', description: 'Consultez et traitez les demandes de congé et d’avance sur salaire de tous les employés.' },
  tresorerie: { path: '/tresorerie', title: 'Ordonnances des paiements', description: 'Gestion des paiements et suivi des validations.' },
  'tresorerie-paiements': { path: '/tresorerie/paiements-executes', title: 'Exécutions des paiements', description: 'Consultez l’historique des paiements déjà exécutés et leurs justificatifs.' },
  'tresorerie-comptes': { path: '/tresorerie/comptes-operations', title: 'Comptes et opérations', description: "Suivez tous les mouvements financiers par compte. Les montants négatifs (–) indiquent des sorties d'argent." },
  'tresorerie-rapports': { path: '/tresorerie/journal', title: 'Journal de la trésorerie', description: "Enregistrement chronologique de toutes les opérations de trésorerie (entrées, sorties et transferts)." },
  'tresorerie-mercuriales': { path: '/tresorerie/mercuriales', title: 'Mercuriales', description: 'Gestion des mercuriales (prix de référence) utilisées pour le contrôle des dépenses de trésorerie.' },
  salarie: { path: '/salarie', title: 'Salarié', description: 'Consultez et gérez les informations liées aux salariés.' },
  architecture: { path: '/architecture', title: 'Architecture des tâches', description: 'Référentiel central des tâches et activités de l’entreprise.' },
  'architecture-monetaire': { path: '/architecture-monetaire', title: 'Architecture monétaire', description: 'Référentiel des lignes budgétaires de l’organisation classées par équipe et niveau.' },
  aide: { path: '/aide', title: 'Help / Centre d’assistance', description: 'Nous sommes là pour vous aider à utiliser PERLE efficacement.' },
  'aide-faq': { path: '/aide/faq', title: 'FAQ', description: 'Consultez les questions fréquemment posées et leurs réponses.' },
  'aide-connaissances': { path: '/aide/base-de-connaissances', title: 'Base de connaissances', description: 'Parcourez tous les articles de la base de connaissances PERLE.' },
  'aide-tutoriels': { path: '/aide/tutoriels-video', title: 'Tutoriels vidéo', description: 'Découvrez des vidéos courtes pour maîtriser chaque module.' },
  'aide-contact': { path: '/aide/contacter-le-support', title: 'Contacter le support', description: 'Joignez notre équipe support par téléphone, WhatsApp ou email.' },
  'aide-bug': { path: '/aide/signaler-un-bug', title: 'Signaler un bug', description: 'Signalez un problème rencontré dans PERLE.' },
  'aide-amelioration': { path: '/aide/proposer-une-amelioration', title: 'Proposer une amélioration', description: 'Partagez vos idées pour améliorer PERLE.' },
  'aide-tickets': { path: '/aide/mes-tickets', title: 'Mes tickets', description: 'Consultez l’historique de vos demandes d’assistance.' },
  guide: { path: '/guide-utilisation', title: 'Guide d’utilisation', description: 'Apprenez à utiliser PERLE efficacement grâce à nos guides pas à pas.' },
  'guide-pilotage': { path: '/guide-utilisation/pilotage-des-projets', title: 'Guide - Pilotage des projets', description: 'Apprenez à planifier, suivre et piloter vos projets.' },
  'guide-staffing': { path: '/guide-utilisation/staffing', title: 'Guide - Staffing', description: 'Apprenez à affecter les ressources et gérer la charge.' },
  'guide-gestion': { path: '/guide-utilisation/gestion-des-equipes', title: 'Guide - Gestion des équipes', description: 'Gérez les équipes, les rôles et les accès.' },
  'guide-tresorerie': { path: '/guide-utilisation/tresorerie', title: 'Guide - Trésorerie', description: 'Suivez les encaissements, décaissements et budgets.' },
  'guide-salarie': { path: '/guide-utilisation/salarie', title: 'Guide - Salarié', description: 'Consultez vos fiches de paie et informations personnelles.' },
  'guide-architecture': { path: '/guide-utilisation/architecture', title: 'Guide - Architecture des tâches', description: 'Comprenez l’arborescence et l’organisation des tâches.' },
  'guide-parametres': { path: '/guide-utilisation/parametres', title: 'Guide - Paramètres', description: 'Personnalisez PERLE selon les besoins de votre organisation.' },
  parametres: { path: '/parametres', title: 'Paramètres', description: 'Configurez les préférences et les paramètres de PERLE.' },
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

interface AppNotification {
  id: string
  message: string
  date: string
}

const initials = (label: string) => label.trim().split(/\s+/).map((word) => word[0]).slice(0, 2).join('').toUpperCase()

const fmtTimer = (totalSeconds: number) => {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function App() {
  const getPageFromPath = () => {
    return Object.entries(pageConfig).find(([, page]) => page.path === window.location.pathname)?.[0] ?? 'accueil'
  }

  const [session, setSession] = useState<Session | null>(getSession)
  const [activeNav, setActiveNav] = useState(getPageFromPath)
  const [openNavGroups, setOpenNavGroups] = useState<Record<string, boolean>>({ pilotage: true })
  const [splashVisible, setSplashVisible] = useState(true)
  const [splashFading, setSplashFading] = useState(false)
  const [headerCollapse, setHeaderCollapse] = useState(0)
  /* Repliée ou non, la barre latérale garde son état d’une visite à l’autre. */
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('perle-sidebar-collapsed') === '1')
  // Source unique de vérité pour « mes » attributions de tâches (celles de l'utilisateur connecté) :
  // le minuteur flottant et Exécuté staffing lisent et écrivent tous les deux ici, pour ne jamais
  // pouvoir diverger l'un de l'autre (ex. une pause faite depuis le minuteur qui ne se refléterait
  // pas dans le tableau d'Exécuté staffing, ou inversement).
  const [myAssignments, setMyAssignments] = useState<TaskAssignment[]>([])
  const [myAssignmentsLoading, setMyAssignmentsLoading] = useState(true)
  const [myAssignmentsError, setMyAssignmentsError] = useState<string | null>(null)
  const [taskTimersCollapsed, setTaskTimersCollapsed] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [pilotageFocus, setPilotageFocus] = useState<PilotageFocusTarget | null>(null)
  const [executeFocusCode, setExecuteFocusCode] = useState<string | null>(null)
  const mainContentRef = useRef<HTMLElement>(null)

  const addNotification = (message: string) => {
    setNotifications((current) => [{ id: `ntf-${Date.now()}-${current.length}`, message, date: new Date().toLocaleString('fr-FR') }, ...current])
  }

  // Cloche de notifications : reflète les vrais messages non lus (tâches + conversations
  // directes), sondés en tâche de fond — jamais une valeur locale qui pourrait diverger de la
  // base de données.
  const {
    total: unreadTotal, unreadConversationIds, unreadTasks, unreadConversations,
    markTaskReadLocally: markBellTaskReadLocally, markConversationReadLocally: markBellConversationReadLocally,
  } = useUnreadMessages()
  const prevUnreadTotalRef = useRef(0)
  const [bellRinging, setBellRinging] = useState(false)
  useEffect(() => {
    const increased = unreadTotal > prevUnreadTotalRef.current
    prevUnreadTotalRef.current = unreadTotal
    if (!increased) return
    setBellRinging(true)
    const timeoutId = window.setTimeout(() => setBellRinging(false), 700)
    return () => window.clearTimeout(timeoutId)
  }, [unreadTotal])

  // Battement de cœur léger tant qu'une session est active — alimente uniquement le statut « en
  // ligne » de la Messagerie (voir sendHeartbeat), aucun autre effet de bord.
  useEffect(() => {
    if (!session) return
    sendHeartbeat().catch(() => {})
    const interval = window.setInterval(() => { sendHeartbeat().catch(() => {}) }, 30000)
    return () => window.clearInterval(interval)
  }, [session])

  // Clic sur un message de tâche non lu dans la cloche : ouvre directement son fil, sans
  // dépendre de la page actuellement affichée (une tâche notifiée n'est pas forcément dans « mes »
  // attributions — ex. un manager notifié pour une tâche qu'il a créée sans y être lui-même staffé).
  const [notificationTaskModal, setNotificationTaskModal] = useState<{ id: number; title: string } | null>(null)
  // Clic sur une conversation non lue dans la cloche : ouvre directement la Messagerie sur cette
  // conversation précise (1:1 ou groupe).
  const [messagingFocusConversationId, setMessagingFocusConversationId] = useState<number | null>(null)

  // Écriture partagée : que la mise à jour vienne du minuteur flottant ou d'Exécuté staffing, elle
  // passe toujours par ici, donc les deux affichages restent forcément synchronisés.
  const applyAssignmentUpdate = (updated: TaskAssignment) => {
    setMyAssignments((current) => current.map((a) => a.id === updated.id ? updated : a))
  }
  const removeMyAssignment = (id: number) => {
    setMyAssignments((current) => current.filter((a) => a.id !== id))
  }

  // Ce que le minuteur flottant affiche : uniquement les tâches en cours/en pause, dérivées de la
  // même source unique que le tableau d'Exécuté staffing.
  const activeAssignments = useMemo(
    () => myAssignments.filter((a) => a.execution_statut === 'en_cours' || a.execution_statut === 'en_pause'),
    [myAssignments],
  )

  // Le minuteur flottant peut lui-même mettre en pause/reprendre — appelle la même action réelle
  // qu'Exécuté staffing (executeTaskAssignmentAction) et écrit dans la même source partagée, pour
  // ne jamais juste faire semblant ni diverger du tableau.
  const [timerActing, setTimerActing] = useState<number | null>(null)
  const pauseOrResumeFromWidget = async (assignment: TaskAssignment) => {
    if (timerActing) return
    setTimerActing(assignment.id)
    const running = assignment.execution_statut === 'en_cours'
    try {
      const result = await executeTaskAssignmentAction(assignment.id, running ? 'pause' : 'reprendre')
      if ('temps_travaille_secondes' in result) {
        applyAssignmentUpdate(result)
      }
    } catch {
      addNotification(`Impossible de ${running ? 'mettre en pause' : 'reprendre'} « ${assignment.template_nom} ». Réessayez depuis Exécuté staffing.`)
    } finally {
      setTimerActing(null)
    }
  }

  // Charge « mes » attributions au login et à chaque changement de session (nouvel onglet, Chrome
  // relancé, simple rechargement) — c'est la même liste que consomme Exécuté staffing, et si une
  // tâche était en cours/en pause côté serveur, le minuteur flottant la fait réapparaître
  // automatiquement : il n'est qu'un affichage, la vraie source est toujours la base de données.
  useEffect(() => {
    if (!session) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- réagit à une déconnexion (session devenue null), un événement externe, pas dérivé du rendu
      setMyAssignments([])
      setMyAssignmentsLoading(false)
      return
    }
    let cancelled = false
    setMyAssignmentsLoading(true)
    setMyAssignmentsError(null)
    fetchMe()
      .then((me) => fetchTaskAssignments({ user: me.id }))
      .then((assignments) => {
        if (cancelled) return
        setMyAssignments(assignments)
      })
      .catch(() => {
        if (!cancelled) setMyAssignmentsError('Impossible de charger vos tâches à exécuter.')
      })
      .finally(() => {
        if (!cancelled) setMyAssignmentsLoading(false)
      })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ne doit se relancer qu'à la connexion (nouveau token), pas à chaque changement de session
  }, [session?.token])

  // Ne fait vivre que l'affichage (le temps réel reste dérivé de temps_travaille_secondes + segment
  // actif) : pas de compteur local qui pourrait diverger de ce qui est enregistré en base.
  const [timerNowMs, setTimerNowMs] = useState(() => Date.now())
  useEffect(() => {
    if (activeAssignments.length === 0) return
    const intervalId = window.setInterval(() => setTimerNowMs(Date.now()), 1000)
    return () => window.clearInterval(intervalId)
  }, [activeAssignments.length])

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('perle-sidebar-collapsed', next ? '1' : '0')
      return next
    })
  }

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

  const openLigneBudgetaire = (projetCode: string, ligneCode: string) => {
    setPilotageFocus({ projetCode, ligneCode })
    navigateTo('pilotage')
  }

  const handleLogin = (nextSession: Session) => {
    setSession(nextSession)
    setActiveNav('accueil')
    if (window.location.pathname !== '/') window.history.pushState({}, '', '/')
  }

  const handleLogout = () => {
    clearSession()
    setSession(null)
    setActiveNav('accueil')
    if (window.location.pathname !== '/') window.history.pushState({}, '', '/')
  }

  const updateSession = (patch: Partial<Session>) => {
    setSession((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...patch }
      saveSession(next)
      return next
    })
  }

  const icons = {
    accueil: <AppIcon><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" /><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></AppIcon>,
    messagerie: <AppIcon><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></AppIcon>,
    pilotage: <AppIcon><path d="M5 21v-6" /><path d="M12 21V9" /><path d="M19 21V3" /></AppIcon>,
    creation: <AppIcon><path d="M12 10v6" /><path d="M9 13h6" /><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" /></AppIcon>,
    staffing: <AppIcon><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><path d="M16 3.128a4 4 0 0 1 0 7.744" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><circle cx="9" cy="7" r="4" /></AppIcon>,
    gestion: <AppIcon><path d="m11 17 2 2a1 1 0 1 0 3-3" /><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4" /><path d="m21 3 1 11h-2" /><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" /><path d="M3 4h8" /></AppIcon>,
    tresorerie: <AppIcon><path d="M10 18v-7" /><path d="M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z" /><path d="M14 18v-7" /><path d="M18 18v-7" /><path d="M3 22h18" /><path d="M6 18v-7" /></AppIcon>,
    salarie: <AppIcon><path d="M15 13a3 3 0 1 0-6 0" /><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" /><circle cx="12" cy="8" r="2" /></AppIcon>,
    architecture: <AppIcon><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5V19A9 3 0 0 0 21 19V5" /><path d="M3 12A9 3 0 0 0 21 12" /></AppIcon>,
    architectureMonetaire: <AppIcon><line x1="3" y1="22" x2="21" y2="22" /><line x1="6" y1="18" x2="6" y2="11" /><line x1="10" y1="18" x2="10" y2="11" /><line x1="14" y1="18" x2="14" y2="11" /><line x1="18" y1="18" x2="18" y2="11" /><polygon points="12 2 20 7 4 7" /></AppIcon>,
    parametres: <AppIcon><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" /><circle cx="12" cy="12" r="3" /></AppIcon>,
    deconnexion: <AppIcon><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /></AppIcon>,
    aide: <AppIcon><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></AppIcon>,
    guide: <AppIcon><path d="M12 7v14" /><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" /></AppIcon>,
  }

  const navItems: { id: string; label: string; icon: ReactNode; children?: { id: string; label: string }[] }[] = [
    { id: 'accueil', label: 'Accueil', icon: icons.accueil },
    { id: 'messagerie', label: 'Messagerie', icon: icons.messagerie },
    {
      id: 'pilotage', label: 'Pilotage des projets', icon: icons.pilotage,
      children: [
        { id: 'pilotage', label: 'Pilotage des projets et gestion budgétaire' },
        { id: 'controle-taches', label: 'Contrôle des tâches' },
        { id: 'controle-execution', label: 'Performance & Staffing' },
      ],
    },
    { id: 'creation', label: 'Création de projet', icon: icons.creation },
    {
      id: 'staffing', label: 'Staffing', icon: icons.staffing,
      children: [
        { id: 'staffing', label: 'Nouveau staffing' },
        { id: 'staffing-execute', label: 'Exécuté staffing' },
      ],
    },
    {
      id: 'gestion', label: 'Gestion des équipes', icon: icons.gestion,
      children: [
        { id: 'gestion', label: 'Employés' },
        { id: 'gestion-equipes', label: 'Équipes' },
        { id: 'gestion-organigramme', label: 'Organigramme' },
        { id: 'gestion-historique', label: 'Historique' },
        { id: 'gestion-demandes', label: 'Demandes' },
      ],
    },
    {
      id: 'tresorerie', label: 'Trésorerie', icon: icons.tresorerie,
      children: [
        { id: 'tresorerie', label: 'Ordonnances des paiements' },
        { id: 'tresorerie-paiements', label: 'Exécutions des paiements' },
        { id: 'tresorerie-comptes', label: 'Comptes et opérations' },
        { id: 'tresorerie-rapports', label: 'Journal de la trésorerie' },
        { id: 'tresorerie-mercuriales', label: 'Mercuriales' },
      ],
    },
    { id: 'salarie', label: 'Salarié', icon: icons.salarie },
    { id: 'architecture', label: 'Architecture des tâches', icon: icons.architecture },
    { id: 'architecture-monetaire', label: 'Architecture monétaire', icon: icons.architectureMonetaire },
    {
      id: 'aide', label: 'Help', icon: icons.aide,
      children: [
        { id: 'aide', label: 'Centre d’assistance' },
        { id: 'aide-faq', label: 'FAQ' },
        { id: 'aide-connaissances', label: 'Base de connaissances' },
        { id: 'aide-tutoriels', label: 'Tutoriels vidéo' },
        { id: 'aide-contact', label: 'Contacter le support' },
        { id: 'aide-bug', label: 'Signaler un bug' },
        { id: 'aide-amelioration', label: 'Proposer une amélioration' },
        { id: 'aide-tickets', label: 'Mes tickets' },
      ],
    },
    {
      id: 'guide', label: 'Guide d’utilisation', icon: icons.guide,
      children: [
        { id: 'guide', label: 'Introduction' },
        { id: 'guide-pilotage', label: 'Pilotage des projets' },
        { id: 'guide-staffing', label: 'Staffing' },
        { id: 'guide-gestion', label: 'Gestion des équipes' },
        { id: 'guide-tresorerie', label: 'Trésorerie' },
        { id: 'guide-salarie', label: 'Salarié' },
        { id: 'guide-architecture', label: 'Architecture' },
        { id: 'guide-parametres', label: 'Paramètres' },
      ],
    },
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
  const parentNavGroup = navItems.find((item) => item.children?.some((child) => child.id === activeNav))

  const renderPage = () => {
    switch (activeNav) {
      case 'messagerie': return (
        <MessagingPage
          focusConversationId={messagingFocusConversationId}
          onFocusConsumed={() => setMessagingFocusConversationId(null)}
        />
      )
      case 'pilotage': return <PilotagePage navigateTo={navigateTo} focusTarget={pilotageFocus} onFocusConsumed={() => setPilotageFocus(null)} />
      case 'controle-taches': return <ControleTachesPage navigateTo={navigateTo} onOpenLigneBudgetaire={openLigneBudgetaire} />
      case 'controle-execution': return <PerformanceStaffingPage navigateTo={navigateTo} />
      case 'creation': return <CreationProjetPage onCancel={() => navigateTo('pilotage')} />
      case 'staffing': return <StaffingPage navigateTo={navigateTo} />
      case 'staffing-suivi': return <SuiviStaffingPage navigateTo={navigateTo} />
      case 'staffing-execute': return (
        <ExecuteStaffingPage
          navigateTo={navigateTo}
          assignments={myAssignments}
          loading={myAssignmentsLoading}
          loadError={myAssignmentsError}
          onAssignmentUpdate={applyAssignmentUpdate}
          onAssignmentRemove={removeMyAssignment}
          focusCode={executeFocusCode}
          onFocusConsumed={() => setExecuteFocusCode(null)}
        />
      )
      case 'gestion': return <GestionEquipesPage navigateTo={navigateTo} />
      case 'gestion-equipes': return <EquipesPage navigateTo={navigateTo} />
      case 'gestion-organigramme': return <OrganigrammePage navigateTo={navigateTo} session={session!} />
      case 'gestion-historique': return <HistoriqueEmployesPage navigateTo={navigateTo} />
      case 'gestion-demandes': return <DemandesEmployesPage navigateTo={navigateTo} />
      case 'tresorerie': return <TresoreriePage navigateTo={navigateTo} />
      case 'tresorerie-paiements': return <PaiementsExecutesPage navigateTo={navigateTo} onNotify={addNotification} />
      case 'tresorerie-comptes': return <ComptesOperationsPage navigateTo={navigateTo} />
      case 'tresorerie-rapports': return <JournalTresoreriePage navigateTo={navigateTo} />
      case 'tresorerie-mercuriales': return <MercurialesPage navigateTo={navigateTo} />
      case 'salarie': return <SalariePage session={session!} onSessionUpdate={updateSession} />
      case 'architecture': return <ArchitecturePage />
      case 'architecture-monetaire': return <ArchitectureMonetairePage />
      case 'aide': return <CentreAssistancePage navigateTo={navigateTo} />
      case 'aide-faq': return <ModulePage title={pageConfig['aide-faq'].title} description={pageConfig['aide-faq'].description} icon={icons.aide} />
      case 'aide-connaissances': return <ModulePage title={pageConfig['aide-connaissances'].title} description={pageConfig['aide-connaissances'].description} icon={icons.aide} />
      case 'aide-tutoriels': return <ModulePage title={pageConfig['aide-tutoriels'].title} description={pageConfig['aide-tutoriels'].description} icon={icons.aide} />
      case 'aide-contact': return <ModulePage title={pageConfig['aide-contact'].title} description={pageConfig['aide-contact'].description} icon={icons.aide} />
      case 'aide-bug': return <ModulePage title={pageConfig['aide-bug'].title} description={pageConfig['aide-bug'].description} icon={icons.aide} />
      case 'aide-amelioration': return <ModulePage title={pageConfig['aide-amelioration'].title} description={pageConfig['aide-amelioration'].description} icon={icons.aide} />
      case 'aide-tickets': return <ModulePage title={pageConfig['aide-tickets'].title} description={pageConfig['aide-tickets'].description} icon={icons.aide} />
      case 'guide': return <GuidePage navigateTo={navigateTo} />
      case 'guide-pilotage': return <ModulePage title={pageConfig['guide-pilotage'].title} description={pageConfig['guide-pilotage'].description} icon={icons.guide} />
      case 'guide-staffing': return <ModulePage title={pageConfig['guide-staffing'].title} description={pageConfig['guide-staffing'].description} icon={icons.guide} />
      case 'guide-gestion': return <ModulePage title={pageConfig['guide-gestion'].title} description={pageConfig['guide-gestion'].description} icon={icons.guide} />
      case 'guide-tresorerie': return <ModulePage title={pageConfig['guide-tresorerie'].title} description={pageConfig['guide-tresorerie'].description} icon={icons.guide} />
      case 'guide-salarie': return <ModulePage title={pageConfig['guide-salarie'].title} description={pageConfig['guide-salarie'].description} icon={icons.guide} />
      case 'guide-architecture': return <ModulePage title={pageConfig['guide-architecture'].title} description={pageConfig['guide-architecture'].description} icon={icons.guide} />
      case 'guide-parametres': return <ModulePage title={pageConfig['guide-parametres'].title} description={pageConfig['guide-parametres'].description} icon={icons.guide} />
      case 'parametres': return <ParametresPage />
      default: return <HomePage modules={modules} navigateTo={navigateTo} />
    }
  }

  if (!session) {
    return (
      <>
        {splashVisible && <SplashScreen fadingOut={splashFading} />}
        <LoginScreen onLogin={handleLogin} />
      </>
    )
  }

  if (session.role === 'admin') {
    return (
      <>
        {splashVisible && <SplashScreen fadingOut={splashFading} />}
        <AdminDashboardPage onLogout={handleLogout} />
      </>
    )
  }

  /* Compte organisation (directeur) : la fonction saisie à l'inscription reste affichée.
     Autres salariés : leur équipe prime sur leur fonction, tant qu'ils y sont affectés. */
  const navProfileLabel = session.role === 'directeur'
    ? (session.fonction || 'Équipe Pilotage')
    : (session.team?.name || session.fonction || 'Équipe Pilotage')

  return (
    <>
      {splashVisible && <SplashScreen fadingOut={splashFading} />}
      <div className="app-container">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarCollapsed ? 'is-collapsed' : ''}`}>
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

        <button
          type="button"
          className="sidebar-toggle"
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? 'Déployer la barre latérale' : 'Réduire la barre latérale'}
          title={sidebarCollapsed ? 'Déployer la barre latérale' : 'Réduire la barre latérale'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d={sidebarCollapsed ? 'm9 6 6 6-6 6' : 'm15 6-6 6 6 6'} />
          </svg>
        </button>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            if (!item.children) {
              return (
                <button
                  key={item.id}
                  className={`nav-item ${activeNav === item.id ? 'active' : ''}`}
                  onClick={() => item.id === 'deconnexion' ? handleLogout() : navigateTo(item.id)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                  {item.id === 'messagerie' && unreadConversationIds.size > 0 && (
                    <span className="nav-badge">{unreadConversationIds.size}</span>
                  )}
                </button>
              )
            }

            const isGroupActive = item.children.some((child) => child.id === activeNav)
            const isOpen = openNavGroups[item.id] ?? false

            return (
              <div key={item.id} className="nav-group">
                <button
                  className={`nav-item ${isGroupActive ? 'active' : ''}`}
                  onClick={() => {
                    navigateTo(item.children![0].id)
                    setOpenNavGroups((groups) => ({ ...groups, [item.id]: true }))
                  }}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                  <span
                    className={`nav-chevron ${isOpen ? 'is-open' : ''}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      setOpenNavGroups((groups) => ({ ...groups, [item.id]: !isOpen }))
                    }}
                  >
                    ▾
                  </span>
                </button>
                {isOpen && (
                  <div className="nav-subnav">
                    {item.children.map((child) => (
                      <button
                        key={child.id}
                        className={`nav-subitem ${activeNav === child.id ? 'active' : ''}`}
                        onClick={() => navigateTo(child.id)}
                      >
                        {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
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
              {!isHomePage && parentNavGroup && parentNavGroup.id !== activeNav && <>
                <span>›</span>
                <button onClick={() => navigateTo(parentNavGroup.id)}>{parentNavGroup.label}</button>
              </>}
              {!isHomePage && <>
                <span>›</span>
                <button onClick={() => navigateTo(activeNav)}>{pageTitle}</button>
              </>}
            </nav>
            {/* Hero Top with Controls */}
            <div className="hero-top-controls">
              <button className="team-button">
                <span>{session.firstName}</span>
                <span className="dropdown-icon">▼</span>
              </button>
              <div className="hero-actions">
                <div className="notification-wrapper">
                  <button
                    className={`notification-btn ${bellRinging ? 'is-ringing' : ''}`}
                    onClick={() => setNotificationsOpen((open) => !open)}
                    aria-label="Notifications"
                  >
                    <MessageSquareWarning size={20} />
                    {(notifications.length + unreadTotal) > 0 && <span className="notification-badge">{notifications.length + unreadTotal}</span>}
                  </button>
                  {notificationsOpen && (
                    <ul className="notification-dropdown" onMouseLeave={() => setNotificationsOpen(false)}>
                      {unreadTasks.map((task) => (
                        <li
                          key={`task-${task.id}`}
                          className="notification-link"
                          onClick={() => { setNotificationTaskModal({ id: task.id, title: `${task.code} — ${task.nom}` }); setNotificationsOpen(false) }}
                        >
                          <span>💬 Nouveau message — {task.code} · {task.nom}</span>
                        </li>
                      ))}
                      {unreadConversations.map((conversation) => (
                        <li
                          key={`conv-${conversation.id}`}
                          className="notification-link"
                          onClick={() => { setMessagingFocusConversationId(conversation.id); markBellConversationReadLocally(conversation.id); navigateTo('messagerie'); setNotificationsOpen(false) }}
                        >
                          <span>💬 Nouveau message de {conversation.nom}</span>
                        </li>
                      ))}
                      {notifications.length === 0 && unreadTotal === 0 ? (
                        <li className="notification-empty">Aucune notification</li>
                      ) : notifications.map((notification) => (
                        <li key={notification.id}>
                          <span>{notification.message}</span>
                          <small>{notification.date}</small>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="user-profile">
                  <span className="avatar">{initials(navProfileLabel)}</span>
                  <div className="user-info">
                    <span className="user-name">{navProfileLabel}</span>
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

      {activeAssignments.length > 0 && (
        taskTimersCollapsed ? (
          <button
            type="button"
            className="task-timer-collapsed"
            onClick={() => setTaskTimersCollapsed(false)}
            title="Afficher les minuteurs en cours"
            aria-label="Afficher les minuteurs en cours"
          >
            <Timer size={18} />
            {activeAssignments.length > 1 && <span className="task-timer-collapsed-badge">{activeAssignments.length}</span>}
            <ChevronUp size={14} />
          </button>
        ) : (
          <div className="task-timer-stack">
            <button
              type="button"
              className="task-timer-stack-collapse"
              onClick={() => setTaskTimersCollapsed(true)}
              title="Réduire"
              aria-label="Réduire les minuteurs"
            >
              <ChevronDown size={14} />
            </button>
            {activeAssignments.map((assignment) => {
              const running = assignment.execution_statut === 'en_cours'
              // Dérivé en direct depuis la dernière valeur confirmée par le serveur — jamais un
              // compteur local qui pourrait diverger de ce qui est réellement enregistré en base.
              const liveSeconds = assignment.temps_travaille_secondes
                + (running && assignment.demarree_le ? Math.max(0, (timerNowMs - new Date(assignment.demarree_le).getTime()) / 1000) : 0)
              return (
                <div key={assignment.id} className={`task-timer-widget ${running ? '' : 'is-paused'}`}>
                  <span className="task-timer-widget-icon"><Timer size={16} /></span>
                  <div className="task-timer-widget-info">
                    <strong>{assignment.template_nom}</strong>
                    <span>{assignment.task_code}</span>
                  </div>
                  <div className="task-timer-widget-time">{fmtTimer(Math.floor(liveSeconds))}</div>
                  <button
                    type="button"
                    className="task-timer-widget-pause"
                    title={running ? 'Mettre en pause' : 'Reprendre'}
                    aria-label={running ? 'Mettre en pause' : 'Reprendre'}
                    disabled={timerActing === assignment.id}
                    onClick={() => pauseOrResumeFromWidget(assignment)}
                  >
                    {running ? <Pause size={13} /> : <Play size={13} />}
                  </button>
                  <button
                    type="button"
                    className="task-timer-widget-stop"
                    title="Gérer depuis Exécuté staffing"
                    onClick={() => { setExecuteFocusCode(assignment.task_code); navigateTo('staffing-execute') }}
                  >
                    <Eye size={12} />Voir
                  </button>
                </div>
              )
            })}
          </div>
        )
      )}

      {notificationTaskModal && (
        <TaskMessagesModal
          taskId={notificationTaskModal.id}
          title={notificationTaskModal.title}
          onClose={() => setNotificationTaskModal(null)}
          onRead={() => markBellTaskReadLocally(notificationTaskModal.id)}
        />
      )}
    </>
  )
}

export default App
