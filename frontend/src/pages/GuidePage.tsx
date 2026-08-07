import {
  ArrowRight, BookOpen, Briefcase, ChevronRight, Compass, FileText, Headphones, Network,
  PlayCircle, Search, Settings, Star, Users, Video, Wallet,
} from 'lucide-react'
import './GuidePage.css'

const ETAPES = [
  { numero: 1, icon: PlayCircle, tone: 'blue', label: 'Présentation de PERLE', sub: 'Découvrez l’objectif et les avantages.' },
  { numero: 2, icon: Compass, tone: 'indigo', label: 'Navigation dans PERLE', sub: 'Familiarisez-vous avec l’interface.' },
  { numero: 3, icon: FileText, tone: 'green', label: 'Votre premier projet', sub: 'Créez et paramétrez un projet.' },
  { numero: 4, icon: Users, tone: 'orange', label: 'Collaboration', sub: 'Travaillez avec votre équipe et suivez les tâches.' },
  { numero: 5, icon: BookOpen, tone: 'pink', label: 'Suivi et reporting', sub: 'Suivez l’avancement et analysez vos données.' },
]

const MODULES = [
  { icon: Briefcase, tone: 'purple', label: 'Pilotage des projets', sub: 'Apprenez à planifier, suivre et piloter vos projets.', guides: 15, tutoriels: 8, target: 'guide-pilotage' },
  { icon: Users, tone: 'blue', label: 'Staffing', sub: 'Apprenez à affecter les ressources et gérer la charge.', guides: 10, tutoriels: 6, target: 'guide-staffing' },
  { icon: Users, tone: 'green', label: 'Gestion des équipes', sub: 'Gérez les équipes, les rôles et les accès.', guides: 12, tutoriels: 7, target: 'guide-gestion' },
  { icon: Wallet, tone: 'orange', label: 'Trésorerie', sub: 'Suivez les encaissements, décaissements et budgets.', guides: 14, tutoriels: 6, target: 'guide-tresorerie' },
  { icon: Users, tone: 'pink', label: 'Salarié', sub: 'Consultez vos fiches de paie et informations personnelles.', guides: 8, tutoriels: 3, target: 'guide-salarie' },
  { icon: Network, tone: 'indigo', label: 'Architecture des tâches', sub: 'Comprenez l’arborescence et l’organisation des tâches.', guides: 9, tutoriels: 4, target: 'guide-architecture' },
  { icon: Settings, tone: 'teal', label: 'Paramètres', sub: 'Personnalisez PERLE selon les besoins de votre organisation.', guides: 11, tutoriels: 5, target: 'guide-parametres' },
]

const RESSOURCES = [
  { icon: PlayCircle, label: 'Vidéos de formation', sub: 'Apprenez en vidéo' },
  { icon: FileText, label: 'Guides PDF', sub: 'Téléchargez nos guides complets' },
  { icon: Briefcase, label: 'Cas pratiques', sub: 'Exemples concrets d’utilisation' },
  { icon: Star, label: 'Bonnes pratiques', sub: 'Conseils pour bien utiliser PERLE' },
]

const MISES_A_JOUR = [
  { label: 'Nouveautés PERLE v2.3.0', time: 'Il y a 2 jours' },
  { label: 'Guide Trésorerie - Mise à jour des budgets', time: 'Il y a 5 jours' },
  { label: 'Nouveau guide : Architecture des tâches', time: 'Il y a 1 semaine' },
]

export default function GuidePage({ navigateTo }: { navigateTo: (page: string) => void }) {
  return (
    <section className="gd-page">
      <label className="gd-search">
        <Search size={15} />
        <input placeholder="Rechercher un guide, une fonctionnalité..." />
      </label>

      <div className="gd-body">
        <div className="gd-content">
          <section className="gd-panel">
            <div className="gd-panel-head">
              <div><h3>Commencer ici</h3><p>Découvrez les bases de PERLE en quelques étapes.</p></div>
              <button type="button" className="gd-link-btn">Voir tout le parcours <ArrowRight size={13} /></button>
            </div>
            <div className="gd-steps">
              {ETAPES.map((etape) => (
                <article key={etape.label} className={`gd-step gd-tone-${etape.tone}`}>
                  <span className="gd-step-number">{etape.numero}</span>
                  <span className="gd-step-icon"><etape.icon size={18} /></span>
                  <strong>{etape.label}</strong>
                  <small>{etape.sub}</small>
                </article>
              ))}
            </div>
          </section>

          <section className="gd-panel">
            <h3>Guides par module</h3>
            <div className="gd-modules">
              {MODULES.map((module) => (
                <article key={module.label} className="gd-module-card">
                  <span className={`gd-module-icon gd-tone-${module.tone}`}><module.icon size={18} /></span>
                  <strong>{module.label}</strong>
                  <p>{module.sub}</p>
                  <small>{module.guides} guides · {module.tutoriels} tutoriels vidéo</small>
                  <button type="button" className="gd-open-guide" onClick={() => navigateTo(module.target)}>Ouvrir le guide <ArrowRight size={12} /></button>
                </article>
              ))}
            </div>
          </section>

          <section className="gd-video-banner">
            <span className="gd-video-icon"><Video size={22} /></span>
            <div>
              <h3>Apprenez à votre rythme avec nos tutoriels vidéo</h3>
              <p>Des vidéos courtes et pratiques pour maîtriser chaque fonctionnalité de PERLE.</p>
              <button type="button" className="gd-btn-primary" onClick={() => navigateTo('aide-tutoriels')}>Voir tous les tutoriels</button>
            </div>
          </section>
        </div>

        <aside className="gd-side">
          <div className="gd-panel">
            <h3>Ressources d’apprentissage</h3>
            <ul className="gd-resource-list">
              {RESSOURCES.map((ressource) => (
                <li key={ressource.label}>
                  <span className="gd-resource-icon"><ressource.icon size={15} /></span>
                  <div><strong>{ressource.label}</strong><small>{ressource.sub}</small></div>
                  <ChevronRight size={14} />
                </li>
              ))}
            </ul>
          </div>

          <div className="gd-panel gd-help-card">
            <h3>Besoin d’aide ?</h3>
            <p>Vous ne trouvez pas ce que vous cherchez ? Notre équipe support est là pour vous aider.</p>
            <button type="button" className="gd-btn-outline" onClick={() => navigateTo('aide')}><Headphones size={14} />Aller au centre d’assistance</button>
          </div>

          <div className="gd-panel">
            <h3>Dernières mises à jour</h3>
            <ul className="gd-updates-list">
              {MISES_A_JOUR.map((item) => (
                <li key={item.label}>
                  <FileText size={14} />
                  <div><span>{item.label}</span><small>{item.time}</small></div>
                </li>
              ))}
            </ul>
            <button type="button" className="gd-link-btn">Voir toutes les mises à jour <ArrowRight size={13} /></button>
          </div>
        </aside>
      </div>
    </section>
  )
}
