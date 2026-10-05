import {
  ArrowRight, Banknote, CalendarCheck, CheckCircle2, Clock3, FileText, Info, LayoutDashboard,
  ListChecks, Send, ShieldCheck, Thermometer, User, UserCheck, Wallet,
} from 'lucide-react'
import './GuideSalariePage.css'

const SECTIONS = [
  {
    icon: LayoutDashboard, tone: 'purple', label: 'Tableau de bord',
    points: [
      'Résumé du mois en cours : EHS consommés, temps travaillé, tâches terminées, projets actifs.',
      'Salaire de base et prime de performance, avec un lien direct vers Rémunération pour le détail.',
      'Solde de congés, demandes en attente, sanctions et avances approuvées en un coup d’œil.',
    ],
  },
  {
    icon: Banknote, tone: 'green', label: 'Rémunération',
    points: [
      'Salaire de base = votre grade × la valeur du point de grade (Paramètres de l’organisation).',
      'Prime de performance = votre note moyenne sur la période × le taux configuré par l’organisation.',
      'Déductions (charges sociales, impôt), sanctions et primes/ajustements réellement enregistrés pour vous.',
    ],
  },
  {
    icon: FileText, tone: 'orange', label: 'Demandes',
    points: [
      'Déposez une demande de congé ou d’avance sur salaire, et suivez son statut.',
      'Chaque demande de congé désigne obligatoirement un collègue qui reprend vos tâches pendant votre absence.',
      'Le solde de congés (acquis / pris / restant) par type de congé est affiché en temps réel.',
    ],
  },
  {
    icon: User, tone: 'blue', label: 'Mon profil',
    points: [
      'Informations personnelles et professionnelles, modifiables en partie (photo, autres informations).',
      'Documents officiels : CNI, CV et autres pièces à téléverser vous-même ; le contrat de travail est déposé par les Ressources.',
      'Les informations sensibles (banque, contact d’urgence…) restent visibles de vous seul et des Ressources Humaines.',
    ],
  },
  {
    icon: ListChecks, tone: 'gray', label: 'Activités',
    points: [
      'Cet espace est en cours de construction et sera bientôt disponible.',
      'En attendant, votre activité (tâches, EHS, temps travaillé) reste visible dans le Tableau de bord.',
    ],
  },
]

const CONGE_CYCLE = [
  {
    acteur: 'Salarié', icon: Send, tone: 'blue',
    action: 'Dépose une demande de congé',
    detail: "Choisit le type de congé, les dates (ou rien si le type est défini par l'entreprise), et désigne obligatoirement un collègue qui reprendra ses tâches pendant son absence.",
  },
  {
    acteur: 'Système', icon: Clock3, tone: 'orange',
    action: 'La demande reste « En attente »',
    detail: "Jusqu'à la décision d'un admin/directeur — ou, si les dates sont connues, l'approbation automatique après 3 jours sans réponse.",
  },
  {
    acteur: 'Admin / Directeur', icon: ShieldCheck, tone: 'purple',
    action: 'Approuve ou refuse',
    detail: "Si approuvée : le salarié passe « En congé », et le collègue désigné est notifié qu'il devient responsable des tâches pendant l'absence.",
  },
  {
    acteur: 'Salarié (retour)', icon: CalendarCheck, tone: 'green',
    action: 'Confirme sa disponibilité ou termine son congé',
    detail: "À la date de fin, confirme sa disponibilité (surtout utile pour un manager — sinon le Pilotage est alerté). Peut aussi reprendre le service par anticipation via « Terminer mon congé ».",
  },
]

const STATUTS = [
  { icon: CheckCircle2, tone: 'green', label: 'Actif', sub: 'En poste, staffable normalement sur des tâches.' },
  { icon: Clock3, tone: 'orange', label: 'En congé', sub: 'Congé approuvé en cours, ou congé maladie déclaré — redevient Actif à la reprise.' },
  { icon: Thermometer, tone: 'red', label: 'Inactif', sub: "Compte désactivé par l'administration — hors de la demande de congé/avance." },
]

export default function GuideSalariePage({ navigateTo }: { navigateTo: (page: string) => void }) {
  return (
    <section className="gsa-page">
      <div className="gsa-intro">
        <span className="gsa-intro-icon"><User size={22} /></span>
        <div>
          <h2>Guide — Salarié</h2>
          <p>Votre espace personnel : activité, rémunération, demandes de congé/avance, et profil.</p>
        </div>
      </div>

      <section className="gsa-panel">
        <h3><LayoutDashboard size={15} />Les cinq espaces de la page Salarié</h3>
        <div className="gsa-sections">
          {SECTIONS.map((section) => (
            <article key={section.label} className="gsa-section-card">
              <div className="gsa-section-head">
                <span className={`gsa-section-icon gsa-tone-${section.tone}`}><section.icon size={17} /></span>
                <strong>{section.label}</strong>
              </div>
              <ul>
                {section.points.map((point) => <li key={point}>{point}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="gsa-panel">
        <h3><ArrowRight size={15} />Le cycle d'une demande de congé</h3>
        <p className="gsa-panel-sub">Du dépôt à la reprise du travail.</p>

        <ol className="gsa-cycle">
          {CONGE_CYCLE.map((step, index) => (
            <li key={step.action} className={`gsa-cycle-step gsa-tone-${step.tone}`}>
              <span className="gsa-cycle-number">{index + 1}</span>
              <span className="gsa-cycle-icon"><step.icon size={18} /></span>
              <div className="gsa-cycle-body">
                <span className="gsa-cycle-acteur">{step.acteur}</span>
                <strong>{step.action}</strong>
                <p>{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="gsa-info-banner">
          <Thermometer size={14} />
          <span>Cas particulier du congé maladie : il met immédiatement le salarié « En congé » dès la déclaration, sans date de fin — il reste ouvert jusqu'à ce que la reprise du travail soit déclarée.</span>
        </div>
      </section>

      <section className="gsa-panel">
        <h3><Wallet size={15} />Le cycle d'une demande d'avance sur salaire</h3>
        <p className="gsa-panel-sub">Plus simple : pas de dates, pas de délégation — juste un montant et un remboursement proposé.</p>
        <div className="gsa-cycle-simple">
          <div className="gsa-cycle-simple-step">
            <Send size={16} /><strong>Dépôt</strong>
            <p>Montant demandé et étalement du remboursement (1, 2, 3 ou 6 salaires).</p>
          </div>
          <ArrowRight size={16} className="gsa-cycle-arrow" />
          <div className="gsa-cycle-simple-step">
            <Clock3 size={16} /><strong>En attente</strong>
            <p>Jusqu'à la décision, ou approbation automatique après 3 jours.</p>
          </div>
          <ArrowRight size={16} className="gsa-cycle-arrow" />
          <div className="gsa-cycle-simple-step">
            <UserCheck size={16} /><strong>Décision</strong>
            <p>Approuvée ou refusée par un admin/directeur — le salarié est notifié.</p>
          </div>
        </div>
        <div className="gsa-info-banner">
          <Info size={14} />
          <span>Une demande encore « En attente » peut être retirée à tout moment par le salarié. Une fois une décision prise, elle ne peut plus être annulée.</span>
        </div>
      </section>

      <section className="gsa-panel">
        <h3><UserCheck size={15} />Les trois statuts d'un salarié</h3>
        <div className="gsa-statuts">
          {STATUTS.map((statut) => (
            <article key={statut.label} className={`gsa-statut-card gsa-tone-${statut.tone}`}>
              <span className="gsa-statut-icon"><statut.icon size={17} /></span>
              <strong>{statut.label}</strong>
              <p>{statut.sub}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="gsa-footer-note">
        <Info size={14} />
        <span>Vos congés, avances et modifications de profil sont réservés à vous seul — vos collègues ne voient jamais vos informations personnelles ou financières.</span>
        <button type="button" className="gsa-link-btn" onClick={() => navigateTo('guide')}>Retour au guide <ArrowRight size={13} /></button>
      </div>
    </section>
  )
}
