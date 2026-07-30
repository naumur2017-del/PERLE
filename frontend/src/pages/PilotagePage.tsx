import './PilotagePage.css'

export default function PilotagePage({ onCreateProject }: { onCreateProject: () => void }) {
  const projects = [['Transformation digitale','En cours','78%'],['Optimisation des opérations','En cours','62%'],['Déploiement régional','À surveiller','45%'],['Programme qualité','En cours','81%']]
  return <section className="pilotage-section pilotage-page">
    <div className="pilotage-heading"><div><span className="section-eyebrow">Tableau de bord</span><h2>Vue d’ensemble des projets</h2><p>Consultez rapidement la situation de votre portefeuille de projets.</p></div><button className="primary-action" onClick={onCreateProject}>Créer un projet</button></div>
    <div className="pilotage-stats"><article className="stat-card"><span>Projets actifs</span><strong>12</strong><small>3 projets prioritaires</small></article><article className="stat-card"><span>Avancement moyen</span><strong>68%</strong><small>+6% ce mois-ci</small></article><article className="stat-card"><span>Budget engagé</span><strong>74%</strong><small>Dans les objectifs</small></article></div>
    <div className="projects-panel"><div className="panel-heading"><h3>Projets récents</h3><button>Voir tous les projets</button></div>{projects.map(([name,status,progress]) => <div className="project-row" key={name}><div><strong>{name}</strong><span>Dernière mise à jour aujourd’hui</span></div><span className={`status-pill ${status === 'À surveiller' ? 'warning' : ''}`}>{status}</span><div className="progress-cell"><span>{progress}</span><div><i style={{width:progress}} /></div></div></div>)}</div>
  </section>
}
