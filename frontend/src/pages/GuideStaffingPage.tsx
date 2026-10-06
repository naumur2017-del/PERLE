import {
  ArrowRight, CheckCircle2, ClipboardList, Clock3, Flag, Hourglass, Info, ListChecks,
  MessageCircle, PlayCircle, ShieldCheck, UserCheck, Users,
} from 'lucide-react'
import './GuideStaffingPage.css'
import { ActeursGrille, FluxChronologie } from './GuideModulePage'
import { WORKFLOW_STAFFING } from './guidesWorkflow'

const CYCLE = [
  {
    acteur: 'Pilotage / Contrôle de gestion', page: 'Staffing des équipes', icon: ClipboardList, tone: 'purple',
    action: 'Attribue une tâche du catalogue à une équipe',
    detail: "Choisit la ligne budgétaire, l'échéance et la priorité, puis l'envoie à l'équipe destinataire pour validation.",
  },
  {
    acteur: 'Manager', page: 'Nouveau staffing', icon: UserCheck, tone: 'blue',
    action: 'Accepte la tâche puis staffe son équipe',
    detail: "Répartit la tâche entre un ou plusieurs collaborateurs (de son équipe ou d'une autre, en renfort), avec des heures et des instructions.",
  },
  {
    acteur: 'Employé(s)', page: 'Exécuté staffing', icon: PlayCircle, tone: 'green',
    action: 'Démarre, exécute puis termine sa part',
    detail: 'Démarre la tâche (ou la décline), peut la mettre en pause et la reprendre, puis la marque Terminée une fois son travail fini.',
  },
  {
    acteur: 'Système', page: '—', icon: Hourglass, tone: 'orange',
    action: 'La tâche passe automatiquement « En attente »',
    detail: "Dès que TOUTES les personnes staffées ont terminé leur exécution, la tâche bascule seule dans cette rubrique — sans action de personne : c'est un signal, pas encore une décision.",
  },
  {
    acteur: 'Manager', page: 'Suivi des staffings', icon: Flag, tone: 'orange',
    action: 'Valide la tâche',
    detail: 'Vérifie le travail de son équipe puis clique « Valider » : la tâche passe « En revue » et devient visible au Pilotage pour clôture.',
  },
  {
    acteur: 'Pilotage / Contrôle de gestion', page: 'Staffing des équipes', icon: ShieldCheck, tone: 'purple',
    action: 'Clôture définitivement la tâche',
    detail: "Bascule son statut en « Terminée » via le sélecteur En cours / En revue / Terminée. Ce changement s'applique instantanément partout : Nouveau staffing, Suivi des staffings et Exécuté staffing (manager et employés) passent tous à « Terminée » — et personne ne peut plus revenir en arrière manuellement.",
  },
]

const STATUTS = [
  { icon: Clock3, tone: 'blue', label: 'En cours', sub: "Au moins une personne staffée n'a pas encore terminé son exécution." },
  { icon: Hourglass, tone: 'orange', label: 'En attente', sub: 'Tout le monde a terminé — calculé automatiquement, en attente de validation par le manager.' },
  { icon: Flag, tone: 'purple', label: 'En revue', sub: 'Le manager a validé — la tâche est soumise au Pilotage pour clôture.' },
  { icon: CheckCircle2, tone: 'green', label: 'Terminée', sub: 'Le Pilotage a clôturé la tâche — verrouillée pour tout le système, plus aucun changement manuel possible.' },
]

const PAGES = [
  {
    icon: ClipboardList, tone: 'purple', label: 'Staffing des équipes', role: 'Pilotage / Contrôle de gestion / Direction',
    points: [
      "Attribue les tâches du catalogue aux équipes (seule la fonction qui crée réellement une tâche).",
      "Sélecteur En cours / En revue / Terminée sur chaque tâche acceptée : peut basculer librement entre les deux premiers (même avant la validation du manager), à tout moment.",
      "Une fois « Terminée » posée, le sélecteur disparaît : la tâche est verrouillée, plus aucun changement manuel n'est possible — ni ici, ni ailleurs.",
      "Exporter : PDF, Excel ou CSV du staffing affiché (filtres appliqués ; si des tâches sont sélectionnées, seules celles-ci sont exportées). Imprimer : rapport A4 paysage identique au PDF.",
    ],
  },
  {
    icon: UserCheck, tone: 'blue', label: 'Nouveau staffing', role: 'Manager',
    points: [
      'Accepte ou refuse les tâches reçues du Pilotage (onglet À valider).',
      "Répartit une tâche acceptée entre ses collaborateurs ou un renfort d'une autre équipe (onglet Prête / En cours).",
      'Retrouve ses tâches En revue (en attente ou déjà validées) et Terminées.',
    ],
  },
  {
    icon: PlayCircle, tone: 'green', label: 'Exécuté staffing', role: 'Employé',
    points: [
      'Démarre, met en pause/reprend puis termine chaque tâche qui lui est attribuée.',
      "Onglet « En attente » : son travail est fini, en attente de validation puis de clôture.",
      'Onglet « Terminée » : uniquement une fois le Pilotage passé par Staffing des équipes.',
    ],
  },
  {
    icon: ListChecks, tone: 'orange', label: 'Suivi des staffings', role: 'Manager (vue de son équipe)',
    points: [
      'Une ligne par tâche, même répartie entre plusieurs personnes ou plusieurs équipes.',
      'Bouton « Valider » dès que la tâche passe « En attente » : l’envoie en revue au Pilotage.',
      'Permet aussi de noter chaque collaborateur une fois sa part terminée.',
    ],
  },
]

export default function GuideStaffingPage({ navigateTo }: { navigateTo: (page: string) => void }) {
  return (
    <section className="gst-page">
      <div className="gst-intro">
        <span className="gst-intro-icon"><Users size={22} /></span>
        <div>
          <h2>Guide — Staffing</h2>
          <p>Comment une tâche voyage du Pilotage jusqu'à sa clôture, en passant par le manager puis l'employé — et retour.</p>
        </div>
      </div>

      <section className="gst-panel">
        <h3><ArrowRight size={15} />Le cycle de vie complet d'une tâche</h3>
        <p className="gst-panel-sub">Six étapes, dans cet ordre, pour chaque tâche staffée — du Pilotage à la clôture définitive.</p>

        <ol className="gst-cycle">
          {CYCLE.map((step, index) => (
            <li key={step.action} className={`gst-cycle-step gst-tone-${step.tone}`}>
              <span className="gst-cycle-number">{index + 1}</span>
              <span className="gst-cycle-icon"><step.icon size={18} /></span>
              <div className="gst-cycle-body">
                <span className="gst-cycle-acteur">{step.acteur}{step.page !== '—' && <> · <em>{step.page}</em></>}</span>
                <strong>{step.action}</strong>
                <p>{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="gst-info-banner">
          <Info size={14} />
          <span>Une tâche « Terminée » est verrouillée : son statut ne peut plus être changé manuellement par personne, pas même le Pilotage. Seul un changement réel du staffing — un employé ajouté ou retiré — la rouvre automatiquement en « En cours », pour ne jamais rester figée sur un état périmé.</span>
        </div>
      </section>

      <section className="gst-panel">
        <h3><Flag size={15} />Les quatre statuts d'une tâche</h3>
        <div className="gst-statuts">
          {STATUTS.map((statut) => (
            <article key={statut.label} className={`gst-statut-card gst-tone-${statut.tone}`}>
              <span className="gst-statut-icon"><statut.icon size={17} /></span>
              <strong>{statut.label}</strong>
              <p>{statut.sub}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="gst-panel">
        <h3><ClipboardList size={15} />Les quatre pages du module Staffing</h3>
        <div className="gst-pages">
          {PAGES.map((page) => (
            <article key={page.label} className="gst-page-card">
              <div className="gst-page-card-head">
                <span className={`gst-page-icon gst-tone-${page.tone}`}><page.icon size={17} /></span>
                <div>
                  <strong>{page.label}</strong>
                  <small>{page.role}</small>
                </div>
              </div>
              <ul>
                {page.points.map((point) => <li key={point}>{point}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <div className="gst-footer-note">
        <MessageCircle size={14} />
        <span>À chaque étape, la même discussion de tâche (champs + historique + échanges) reste accessible à toutes les personnes engagées — manager, employés staffés et, une fois validée, le Pilotage.</span>
        <button type="button" className="gst-link-btn" onClick={() => navigateTo('guide')}>Retour au guide <ArrowRight size={13} /></button>
      </div>
      <section className="gst-panel">
        <h3>Qui intervient</h3>
        <ActeursGrille workflow={WORKFLOW_STAFFING} />
      </section>

      <section className="gst-panel">
        <h3>Le flux, étape par étape</h3>
        <FluxChronologie workflow={WORKFLOW_STAFFING} />
      </section>
    </section>
  )
}
