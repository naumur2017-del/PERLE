import {
  ArrowRight, Bot, BookOpen, Briefcase, Clock, FileText, Headphones, Mail,
  MessageCircle, Network, Phone, Search, Settings, UserCheck, Users, Video, Wallet,
} from 'lucide-react'
import './CentreAssistancePage.css'

const ACTIONS = [
  { icon: Headphones, tone: 'purple', label: 'Ouvrir un ticket', sub: 'Besoin d’aide ? Créez une demande d’assistance.', cta: 'Créer un ticket', target: 'aide-tickets' },
  { icon: BookOpen, tone: 'blue', label: 'Consulter les guides', sub: 'Accédez à notre base de connaissances et aux guides d’utilisation.', cta: 'Voir les guides', target: 'aide-connaissances' },
  { icon: Video, tone: 'green', label: 'Tutoriels vidéo', sub: 'Découvrez des vidéos courtes pour maîtriser chaque module.', cta: 'Voir les tutoriels', target: 'aide-tutoriels' },
  { icon: Bot, tone: 'orange', label: 'Assistance IA', badge: 'Nouveau', sub: 'Posez votre question à PERLE AI et obtenez une réponse instantanée.', cta: 'Discuter avec l’IA', target: 'aide' },
  { icon: FileText, tone: 'pink', label: 'FAQ', sub: 'Consultez les questions fréquemment posées et leurs réponses.', cta: 'Voir la FAQ', target: 'aide-faq' },
]

interface Ticket_ {
  numero: string
  objet: string
  module: string
  moduleTone: string
  priorite: 'Haute' | 'Normale' | 'Basse'
  statut: 'En cours' | 'Résolu' | 'En attente'
  maj: string
}

const TICKETS: Ticket_[] = [
  { numero: '#1542', objet: 'Erreur lors de l’affectation d’un collaborateur', module: 'Staffing', moduleTone: 'blue', priorite: 'Haute', statut: 'En cours', maj: '05/08/2025 10:32' },
  { numero: '#1543', objet: 'Question sur le calcul des EHS', module: 'Pilotage des projets', moduleTone: 'blue', priorite: 'Normale', statut: 'Résolu', maj: '05/08/2025 09:15' },
  { numero: '#1541', objet: 'Impossible d’exporter un rapport', module: 'Trésorerie', moduleTone: 'green', priorite: 'Haute', statut: 'En cours', maj: '04/08/2025 16:45' },
  { numero: '#1539', objet: 'Ajout d’une nouvelle tâche dans l’architecture', module: 'Architecture', moduleTone: 'purple', priorite: 'Normale', statut: 'En attente', maj: '04/08/2025 11:20' },
  { numero: '#1538', objet: 'Accès module Salarié', module: 'Salarié', moduleTone: 'pink', priorite: 'Basse', statut: 'Résolu', maj: '03/08/2025 14:05' },
]

const CATEGORIES = [
  { icon: Briefcase, label: 'Pilotage des projets', count: 42 },
  { icon: Users, label: 'Staffing', count: 28 },
  { icon: Wallet, label: 'Trésorerie', count: 35 },
  { icon: UserCheck, label: 'Gestion des équipes', count: 31 },
  { icon: Network, label: 'Architecture des tâches', count: 24 },
  { icon: Settings, label: 'Paramètres', count: 18 },
]

const RESSOURCES_POPULAIRES = [
  'Guide de démarrage rapide',
  'Comment créer un projet ?',
  'Staffer un collaborateur sur une tâche',
  'Comprendre les EHS',
  'Exporter un rapport financier',
]

const priorieClass = (priorite: Ticket_['priorite']) => priorite === 'Haute' ? 'haute' : priorite === 'Normale' ? 'normale' : 'basse'
const statutClass = (statut: Ticket_['statut']) => statut === 'En cours' ? 'cours' : statut === 'Résolu' ? 'resolu' : 'attente'

export default function CentreAssistancePage({ navigateTo }: { navigateTo: (page: string) => void }) {
  return (
    <section className="ca-page">
      <label className="ca-search">
        <Search size={15} />
        <input placeholder="Rechercher une question, un guide, une fonctionnalité..." />
      </label>

      <div className="ca-actions">
        {ACTIONS.map((action) => (
          <article key={action.label} className="ca-action-card">
            <span className={`ca-action-icon ca-tone-${action.tone}`}><action.icon size={22} /></span>
            <div className="ca-action-title"><strong>{action.label}</strong>{action.badge && <span className="ca-badge-new">{action.badge}</span>}</div>
            <p>{action.sub}</p>
            <button type="button" className="ca-btn-outline" onClick={() => navigateTo(action.target)}>{action.cta}</button>
          </article>
        ))}
      </div>

      <div className="ca-body">
        <div className="ca-content">
          <section className="ca-panel">
            <div className="ca-panel-head">
              <h3>Mes tickets récents</h3>
              <button type="button" className="ca-link-btn" onClick={() => navigateTo('aide-tickets')}>Voir tous mes tickets <ArrowRight size={13} /></button>
            </div>
            <div className="ca-table-wrap">
              <table className="ca-table">
                <thead>
                  <tr><th>N° Ticket</th><th>Objet</th><th>Module concerné</th><th>Priorité</th><th>Statut</th><th>Dernière mise à jour</th></tr>
                </thead>
                <tbody>
                  {TICKETS.map((ticket) => (
                    <tr key={ticket.numero}>
                      <td className="ca-code">{ticket.numero}</td>
                      <td className="ca-name">{ticket.objet}</td>
                      <td><span className={`ca-module-badge ca-tone-${ticket.moduleTone}`}>{ticket.module}</span></td>
                      <td><span className={`ca-priorite ca-priorite-${priorieClass(ticket.priorite)}`}>{ticket.priorite}</span></td>
                      <td><span className={`ca-statut ca-statut-${statutClass(ticket.statut)}`}>{ticket.statut}</span></td>
                      <td className="ca-maj">{ticket.maj}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="ca-panel">
            <div className="ca-panel-head">
              <h3>Parcourir la base de connaissances</h3>
              <button type="button" className="ca-link-btn" onClick={() => navigateTo('aide-connaissances')}>Voir toutes les catégories <ArrowRight size={13} /></button>
            </div>
            <div className="ca-categories">
              {CATEGORIES.map((categorie) => (
                <article key={categorie.label} className="ca-category-card" onClick={() => navigateTo('aide-connaissances')}>
                  <span className="ca-category-icon"><categorie.icon size={18} /></span>
                  <strong>{categorie.label}</strong>
                  <small>{categorie.count} articles</small>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="ca-side">
          <div className="ca-panel">
            <h3>Contactez le support</h3>
            <ul className="ca-contact-list">
              <li><span className="ca-contact-icon"><Phone size={14} /></span><div><strong>Téléphone</strong><span>+237 6 95 55 44 33</span></div></li>
              <li><span className="ca-contact-icon"><MessageCircle size={14} /></span><div><strong>WhatsApp</strong><span>+237 6 95 55 44 33</span></div></li>
              <li><span className="ca-contact-icon"><Mail size={14} /></span><div><strong>Email</strong><span>support@perle-ehs.com</span></div></li>
              <li><span className="ca-contact-icon"><Clock size={14} /></span><div><strong>Horaires d’ouverture</strong><span>Lun - Ven : 08h00 - 17h00</span></div></li>
            </ul>
            <div className="ca-contact-stats">
              <div><span>Temps moyen de réponse</span><b>2h 15 min</b></div>
              <div><span>Version actuelle de PERLE</span><b>v2.3.0</b></div>
            </div>
          </div>

          <div className="ca-panel">
            <h3>Ressources populaires</h3>
            <ul className="ca-popular-list">
              {RESSOURCES_POPULAIRES.map((ressource) => (
                <li key={ressource} onClick={() => navigateTo('aide-connaissances')}><FileText size={13} />{ressource}</li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </section>
  )
}
