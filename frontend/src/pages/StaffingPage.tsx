import { useState } from 'react'
import './StaffingPage.css'

const staffingTasks = [
  ['Étude de faisabilité', 'PRJ.001 · ERP Academy', 'E', 'Haute', 'Ajara Lamare', 'Ajara Lamare', 'EMP-PI-001', '10/05/2025', '20/05/2025', 'En cours', '65%', '03:25:10'],
  ['Conception détaillée', 'PRJ.001 · ERP Academy', 'D', 'Moyenne', 'Ajara Lamare', 'Herman Tsaffock', 'EMP-IT-004', '08/05/2025', '25/05/2025', 'En pause', '40%', '01:15:30'],
  ['Développement module', 'PRJ.002 · Mobile App', 'E', 'Haute', 'Ajara Lamare', 'Belomo Edwige', 'EMP-RH-003', '12/05/2025', '05/06/2025', 'En cours', '20%', '02:10:45'],
  ['Tests et recette', 'PRJ.002 · Mobile App', 'D', 'Basse', 'Ajara Lamare', 'Essogo Eric', 'EMP-ACC-002', '20/05/2025', '10/06/2025', 'À venir', '0%', '00:00:00'],
  ['Formation utilisateurs', 'PRJ.003 · CRM', 'E', 'Moyenne', 'Ajara Lamare', 'Théodore Bessala', 'EMP-RES-001', '22/05/2025', '30/05/2025', 'En cours', '10%', '00:35:20'],
]

export default function StaffingPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks'>('overview')
  return <section className="staffing-page">
    <nav className="staffing-tabs"><button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>Vue d’ensemble</button><button className={activeTab === 'tasks' ? 'active' : ''} onClick={() => setActiveTab('tasks')}>Mes tâches</button><button>Équipe</button><button>Staffing global</button></nav>

    {activeTab === 'overview' ? <div className="staffing-dashboard">
      <main className="staffing-main">
        <div className="staffing-top-grid">
          <section className="staff-panel staffing-actions"><h2>Que souhaitez-vous faire ?</h2><p>Sélectionnez une action pour commencer.</p><div><button><i>♙</i><span><strong>Nouveau staffing</strong><small>Affecter un collaborateur à une tâche ou un projet.</small></span><b>→</b></button><button><i>▣</i><span><strong>Exécuter une tâche</strong><small>Démarrer, mettre en pause ou reprendre l’exécution d’une tâche.</small></span><b>→</b></button></div></section>
          <section className="staff-kpi-area"><label>Période : <select><option>Cette semaine</option></select></label><div className="staff-kpis"><article><i>♙</i><span>Tâches en cours</span><strong>28</strong><small className="up">↑ 12% <em>vs semaine dernière</em></small></article><article><i className="green">☑</i><span>Tâches terminées</span><strong>16</strong><small className="up">↑ 8% <em>vs semaine dernière</em></small></article><article><i className="red">▣</i><span>En retard</span><strong className="red-text">5</strong><small className="down">↑ 2% <em>vs semaine dernière</em></small></article><article><i>⠿</i><span>Heures travaillées</span><strong>163h 20m</strong><small className="up">↓ 5% <em>vs semaine dernière</em></small></article></div></section>
        </div>

        <section className="staff-panel alerts-panel"><h2>Alertes & notifications</h2><div className="alert-grid"><article className="available"><i>▣</i><div><strong>3 collaborateurs libres</strong><p>3 membres de votre département sont disponibles pour de nouvelles affectations.</p><button>Voir la liste →</button></div></article><article className="late"><i>▣</i><div><strong>2 tâches en retard</strong><p>2 tâches de votre département sont en retard de livraison.</p><button>Voir les tâches →</button></div></article><article className="deadline"><i>▣</i><div><strong>5 tâches arrivent à échéance</strong><p>5 tâches arrivent à échéance dans les 3 prochains jours.</p><button>Voir les tâches →</button></div></article><article><i>♙</i><div><strong>Nouveau collaborateur</strong><p>Assale Zainabou a rejoint votre département.</p><button>Voir le profil →</button></div></article></div></section>

        <section className="staff-panel tasks-panel"><div className="tasks-heading"><h2>Mes tâches en cours <b>5</b></h2><div><label>Filtrer par collaborateur <select><option>Tous les collaborateurs</option></select></label><button>▥ Colonnes</button><button>▽ Filtres</button><label className="task-search"><input placeholder="Rechercher une tâche..." />⌕</label></div></div><div className="staff-table-wrap"><table><thead><tr><th>Tâche</th><th>Projet</th><th>Type</th><th>Priorité</th><th>Assignée par</th><th>Attribuée à</th><th>Matricule</th><th>Début</th><th>Échéance</th><th>Statut</th><th>Progression</th><th>Temps</th><th>Action</th></tr></thead><tbody>{staffingTasks.map((row) => <tr key={row[0]}>{row.map((cell,index) => <td key={`${row[0]}-${index}`}>{index === 2 ? <span className={`staff-type ${cell === 'D' ? 'money' : ''}`}>{cell}</span> : index === 3 ? <span className={`priority ${cell.toLowerCase()}`}>{cell}</span> : index === 9 ? <span className={`task-status ${cell === 'En pause' ? 'paused' : cell === 'À venir' ? 'future' : ''}`}>{cell}</span> : index === 10 ? <div className="staff-progress"><span>{cell}</span><i><b style={{width:cell}} /></i></div> : index === 12 ? '⋮' : cell}</td>)}</tr>)}</tbody></table></div><div className="table-footer"><span>Légende : &nbsp; <b className="staff-type">E</b> Tâche EHS &nbsp; <b className="staff-type money">D</b> Tâche Monétaire</span><span>Afficher &nbsp;<select><option>10</option></select>&nbsp; 1 - 5 sur 5 &nbsp; ‹ &nbsp;<b>1</b>&nbsp; ›</span></div></section>
        <div className="staff-info">ⓘ <span><strong>Le pilotage et la direction ont une visibilité globale sur tous les staffings.</strong><small>Seul le pilotage reçoit des alertes sur les collaborateurs non staffés ou en retard sur leurs livrables.</small></span></div>
      </main>

      <aside className="staffing-side">
        <section className="staff-panel availability"><div><h2>Disponibilité de mon équipe</h2><button>Voir toute l’équipe →</button></div><strong>3 libres sur 10</strong><i><b /></i><p><span className="free">■ Libres (3)</span><span>■ Occupés (6)</span><span className="off">■ Indisponibles (1)</span></p></section>
        <section className="staff-panel history"><div><h2>Historique des tâches</h2><button>Voir tout →</button></div>{[['Conception UI/UX','PRJ.001 - ERP Academy','15/05/2025','02:30:15'],['Analyse des besoins','PRJ.001 - ERP Academy','12/05/2025','03:45:20'],['Spécifications techniques','PRJ.002 - Mobile App','10/05/2025','04:10:05']].map(([task,project,date,time]) => <article key={task}><div><strong>{task}</strong><span>{project}</span></div><b>Terminée</b><time>{date}<br/>{time}</time></article>)}</section>
        <section className="staff-panel hours"><div><h2>Temps total travaillé</h2><select><option>Cette semaine</option></select></div><strong>163h 20m</strong><div className="hours-chart">{[['28h',72],['32h',82],['30h',77],['26h',67],['24h',62],['15h',39],['8h',21]].map(([hours,height],i)=><span key={i}><b>{hours}</b><i style={{height:`${height}%`}}/><small>{['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'][i]}</small></span>)}</div></section>
        <section className="staff-panel shortcuts"><h2>Raccourcis</h2><div><button>▧ &nbsp; Rapport de staffing</button><button>▧ &nbsp; Export Excel</button></div></section>
      </aside>
    </div> : <MyTasksView />}
  </section>
}

function MyTasksView() {
  const myTasks = [
    ['Conception détaillée de l’application mobile','PRJ.0021','Mobile App Phase 2','D','Haute','08/05/2025','25/05/2025','40%','En pause','01:15:30'],
    ['Développement du module d’authentification','PRJ.0021','Mobile App Phase 2','E','Haute','10/05/2025','30/05/2025','65%','En cours','03:25:10'],
    ['Tests et recette utilisateur','PRJ.0022','ERP Academy Refonte','E','Moyenne','12/05/2025','20/05/2025','20%','En cours','02:10:45'],
  ]
  return <div className="my-tasks-view">
    <nav className="my-tasks-tabs"><button className="active">Mes tâches</button><button>Mes temps</button><button>Historique</button></nav>
    <div className="my-task-kpis">
      <article><i>♨</i><span>Tâches en cours</span><strong>3</strong><small>75% de ma charge</small><b><em style={{width:'75%'}} /></b></article>
      <article><i className="green">✓</i><span>Tâches terminées</span><strong>12</strong><small>Ce mois</small><p>↑ 20% <em>vs mois dernier</em></p></article>
      <article><i className="orange">◷</i><span>En pause</span><strong>1</strong><small>Reprise prévue aujourd’hui</small><button>Reprendre</button></article>
      <article><i className="red">◷</i><span>En retard</span><strong>0</strong><small>Bravo ! Aucune tâche en retard</small><p>Aucun retard</p></article>
      <article><i>⠿</i><span>Temps travaillé</span><strong>24h 35m</strong><small>Cette semaine</small><p>↑ 12% <em>vs semaine dernière</em></p></article>
    </div>

    <div className="my-tasks-layout">
      <main>
        <section className="staff-panel my-task-list"><div className="my-task-heading"><h2>Mes tâches en cours <b>3</b></h2><div><label>Filtrer par : <select><option>Toutes</option></select></label><button>▥ Colonnes⌄</button></div></div><div className="my-task-table-wrap"><table><thead><tr><th>Tâche</th><th>Projet</th><th>Type</th><th>Priorité</th><th>Assignée par</th><th>Début</th><th>Échéance</th><th>Progression</th><th>Statut</th><th>Temps</th><th>Action</th></tr></thead><tbody>{myTasks.map((task)=><tr key={task[1]}><td><strong>{task[0]}</strong><small>{task[1]}</small></td><td>{task[2]}</td><td><span className={`staff-type ${task[3]==='D'?'money':''}`}>{task[3]}</span></td><td><span className={`priority ${task[4].toLowerCase()}`}>{task[4]}</span></td><td><span className="person-dot">AL</span> Ajara Lamare<small>Manager</small></td><td>{task[5]}</td><td>{task[6]}</td><td><div className="staff-progress"><span>{task[7]}</span><i><b style={{width:task[7]}} /></i></div></td><td><span className={`task-status ${task[8]==='En pause'?'paused':''}`}>{task[8]}</span></td><td><strong>{task[9]}</strong></td><td>⏯ &nbsp; ⋮</td></tr>)}</tbody></table></div><div className="table-footer"><span>Affichage 1 - 3 sur 3 tâches</span><span>‹ &nbsp;<b>1</b>&nbsp; ›</span></div><div className="my-task-legend">Légende : &nbsp; <b className="staff-type">E</b> Tâche EHS (consomme des ressources) &nbsp; <b className="staff-type money">D</b> Tâche Monétaire (consomme de la monnaie)</div></section>
        <section className="time-guide"><div className="time-illustration">◷<span>▶</span></div><div><h2>Gérez votre temps efficacement</h2><p>Utilisez le chronomètre pour suivre précisément le temps passé sur chaque tâche.<br/>Vous pouvez mettre en pause et reprendre à tout moment.</p><div className="time-benefits"><span>◷ <b>Suivi en temps réel</b><small>Chronométrez vos tâches</small></span><span>▣ <b>Pause et reprise</b><small>Gardez votre progression</small></span><span>▤ <b>Historique complet</b><small>Consultez vos activités</small></span><span>☑ <b>Rapports personnels</b><small>Analysez votre productivité</small></span></div></div><aside>💡 <b>Astuce :</b> N’oubliez pas de mettre en pause vos tâches lorsque vous êtes interrompu pour des réunions ou d’autres activités.</aside></section>
      </main>

      <aside className="my-tasks-side">
        <section className="staff-panel execution-card"><div><h2>Exécution de la tâche</h2><span>En cours</span></div><strong>Développement du module d’authentification</strong><p>PRJ.0021 · Mobile App Phase 2 &nbsp; <b className="staff-type">E</b></p><div className="execution-metrics"><span><strong>03:25:10</strong><small>Temps total travaillé</small></span><i/><span className="progress-ring"><b>65%</b><small>Progression</small></span></div><div className="execution-actions"><button>▷ &nbsp; Reprendre</button><button>▯ &nbsp; Mettre en pause</button></div><aside>♨ &nbsp; Dernière pause : Aujourd’hui à 10:30<br/><b>Durée de la pause : 00:15:20</b></aside></section>
        <section className="staff-panel completed-tasks"><div><h2>Dernières tâches terminées</h2><button>Voir tout</button></div>{[['Analyse des besoins utilisateurs','08/05/2025','02:45:12'],['Rédaction des spécifications','04/05/2025','03:10:05'],['Correction des anomalies','01/05/2025','01:20:30'],['Documentation technique','28/04/2025','02:05:45']].map(([name,date,time])=><article key={name}><i>✓</i><span><strong>{name}</strong><small>PRJ.00{Math.ceil(Math.random()*9)} · Mobile App Phase 2</small></span><time>{date}<br/>{time}</time></article>)}<button className="history-button">Voir tout l’historique</button></section>
      </aside>
    </div>
  </div>
}
