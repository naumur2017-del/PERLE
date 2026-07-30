import { useEffect, useState } from 'react'

const initialTasks = [
  ['PRJ.001', 'Étude de faisabilité', 'E', '15,00', '0', '15,00', 'Ajara Lamare', 'Herman Tsaffock', '06/05/2025', '15/05/2025'],
  ['PRJ.002', 'Conception détaillée', 'E', '31,00', '0', '31,00', 'Ajara Lamare', 'Belomo Edwige', '16/05/2025', '15/06/2025'],
  ['PRJ.003', 'Achat matériel', 'D', '0', '6 000 000', '15,00', 'Herman Tsaffock', 'Essogo Eric', '01/06/2025', '30/07/2025'],
  ['PRJ.004', 'Développement', 'E', '60,00', '0', '60,00', 'Ajara Lamare', 'Theodore Bessala', '01/07/2025', '30/09/2025'],
  ['PRJ.005', 'Tests et recette', 'E', '45,00', '0', '45,00', 'Ajara Lamare', 'Herman Tsaffock', '01/10/2025', '15/11/2025'],
  ['PRJ.006', 'Formation utilisateurs', 'D', '0', '1 200 000', '8,00', 'Theodore Bessala', 'Belomo Edwige', '05/11/2025', '30/11/2025'],
  ['PRJ.007', 'Mise en production', 'E', '15,00', '1 000 000', '6,67', 'Ajara Lamare', 'Belomo Edwige', '01/12/2025', '15/12/2025'],
]

export default function ProjectCreation({ onCancel }: { onCancel: () => void }) {
  const [step, setStep] = useState(1)
  const [projectName, setProjectName] = useState('Projet d’étude et de mise en œuvre du système ERP')
  const [clientName, setClientName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [unexpectedAmount, setUnexpectedAmount] = useState('0')
  const [projectTasks, setProjectTasks] = useState(initialTasks)

  const goToChargesStep = () => {
    if (Number(unexpectedAmount) < 0) {
      window.alert('La valeur du champ Imprévu ne peut pas être négative.')
      return
    }
    setStep(2)
  }

  const saveTaskToProject = () => {
    setProjectTasks((currentTasks) => [
      ...currentTasks,
      [`PRJ.${String(currentTasks.length + 1).padStart(3, '0')}`, 'Allocation des ressources', 'E', '12,00', '0', '12,00', 'Équipe Pilotage', 'Ressources', '01/11/2026', '08/11/2026'],
    ])
    setStep(1)
  }

  const saveProject = () => window.alert('Le projet a été enregistré.')

  useEffect(() => {
    if (step !== 2) return
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && setStep(1)
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [step])

  return (
    <>
    <section className="creation-page" aria-hidden={step === 2}>
      <div className="creation-layout">
        <aside className="creation-form-card">
          <div className="creation-steps">
            <div className="creation-step active"><b>1</b><span><strong>Informations générales</strong><small>Détails du projet</small></span></div>
            <div className="step-line" />
            <div className="creation-step"><b>2</b><span><strong>Charges et planification</strong><small>Sélection des charges</small></span></div>
          </div>

          <div className="form-heading"><strong>Étape 1 : Informations générales du projet</strong><span>Renseignez les informations de base de votre projet.</span></div>
          <label className="field full"><span>Nom du projet <em>*</em></span><input value={projectName} onChange={(event) => setProjectName(event.target.value)} /></label>
          <label className="field full project-text-field"><span>Nom du client <em>*</em></span><input value={clientName} onChange={(event) => setClientName(event.target.value)} /></label>
          <label className="field full project-text-field"><span>Description du projet</span><textarea value={projectDescription} onChange={(event) => setProjectDescription(event.target.value)} rows={4} /></label>
          <div className="form-grid three">
            <label className="field"><span>Montant HT du projet <em>*</em></span><div className="input-suffix"><input value="80 000 000" readOnly /><i>FCFA</i></div></label>
            <label className="field"><span>Type de montant <em>*</em></span><select defaultValue="HT"><option>HT</option><option>TTC</option></select></label>
            <label className="field"><span>Marge (%) <em>*</em></span><div className="input-suffix"><input value="40" readOnly /><i>%</i></div></label>
            <label className="field"><span>Charges transversales (%) <em>*</em></span><div className="input-suffix"><input value="12" readOnly /><i>%</i></div><small>Entre 10% et 15%</small></label>
            <label className="field"><span>TVA (%)</span><div className="input-suffix"><input value="0" readOnly /><i>%</i></div><small>Saisir le taux de TVA si le montant est en TTC</small></label>
          </div>

          <div className="auto-summary">
            <h3>▣ &nbsp; Récapitulatif automatique</h3>
            <dl><div><dt>Montant HT</dt><dd>80 000 000 FCFA</dd></div><div><dt>Marge (40%)</dt><dd className="blue">- 32 000 000 FCFA</dd></div><div><dt>Charges transversales (12%)</dt><dd className="orange">- 9 600 000 FCFA</dd></div></dl>
            <div className="execution-total"><span>Budget d’exécution</span><strong>38 400 000 FCFA</strong><small>80 000 000 − 32 000 000 − 9 600 000</small></div>
          </div>

          <div className="form-grid two dates">
            <label className="field"><span>Date de début du projet <em>*</em></span><input type="date" defaultValue="2025-05-01" /></label>
            <label className="field"><span>Date de fin du projet <em>*</em></span><input type="date" defaultValue="2025-12-31" /></label>
          </div>
          <div className="duration-note">◷ &nbsp; La durée totale du projet est de <strong>245 jours.</strong></div>
          <label className="field unexpected-field"><span>Imprévu (FCFA)</span><input type="number" min="0" value={unexpectedAmount} onChange={(event) => setUnexpectedAmount(event.target.value)} onInvalid={(event) => event.currentTarget.setCustomValidity('Veuillez saisir une valeur positive ou égale à zéro.')} onInput={(event) => event.currentTarget.setCustomValidity('')} /></label>
          <div className="form-actions project-form-actions"><button className="secondary-action" onClick={onCancel}>Annuler</button><button className="primary-action" onClick={goToChargesStep}>Configurer les Tâches</button><button className="save-project" onClick={saveProject}>Enregistrer le projet</button></div>
        </aside>

        <div className="creation-overview">
          <div className="overview-heading"><h3>Aperçu et récapitulatif du projet</h3><p>Les résultats sont calculés automatiquement en temps réel.</p></div>
          <div className="financial-cards">
            <article className="financial-card green"><span>Montant HT</span><strong>80 000 000 FCFA</strong><small>100,00%</small></article>
            <article className="financial-card purple"><span>Marge (40%)</span><strong>32 000 000 FCFA</strong><small>40,00%</small></article>
            <article className="financial-card orange"><span>Charges transversales (12%)</span><strong>9 600 000 FCFA</strong><small>12,00%</small></article>
            <article className="financial-card blue"><span>Budget d’exécution</span><strong>38 400 000 FCFA</strong><small>48,00%</small></article>
            <article className="financial-card cyan"><span>TVA (0%)</span><strong>0 FCFA</strong><small>0,00%</small></article>
          </div>

          <div className="budget-strip">
            <div><span>Reste disponible (après coûts des tâches)</span><strong>9 300 000 FCFA</strong><small>24,22% du budget d’exécution</small></div>
            <div className="budget-progress"><i /></div>
            <div><span>Coûts des tâches (HT)</span><strong className="danger">29 100 000 FCFA</strong><small>75,78% du budget d’exécution</small></div>
            <div><span>Total utilisé (HT)</span><strong className="danger">29 100 000 FCFA</strong><small>75,78% du budget d’exécution</small></div>
          </div>

          <div className="task-toolbar"><div><button>◉ &nbsp; Masquer / Afficher colonnes</button><button>▽ &nbsp; Filtres</button><button>↶ &nbsp; Réinitialiser</button></div><label>Type de tâche<select><option>Tous</option></select></label><button className="excel-button">▣ &nbsp; Export Excel</button></div>

          <div className="task-table-wrap"><table className="task-table"><thead><tr><th>Code</th><th>Nom de la tâche</th><th>Type</th><th>EHS</th><th>Monétaire (FCFA)</th><th>Équivalent EHS</th><th>Assignée par</th><th>Attribuée à</th><th>Début</th><th>Fin</th></tr></thead><tbody>{projectTasks.map((task) => <tr key={task[0]}><td>{task[0]}</td><td>{task[1]}</td><td><span className={`task-type ${task[2] === 'D' ? 'money' : ''}`}>{task[2]}</span></td><td>{task[3]}</td><td>{task[4]}</td><td>{task[5]}</td><td>{task[6]}</td><td>{task[7]}</td><td>{task[8]}</td><td>{task[9]}</td></tr>)}</tbody><tfoot><tr><td colSpan={3}>Total</td><td>166,00</td><td>8 200 000</td><td>180,67</td><td colSpan={4} /></tr></tfoot></table></div>

          <div className="task-totals"><article><span>Nombre de tâches</span><strong>{projectTasks.length}</strong></article><article className="green"><span>Tâches de type E (EHS)</span><strong>5 (71,43%)</strong></article><article className="purple"><span>Tâches de type D (Monétaire)</span><strong>2 (28,57%)</strong></article><article><span>Total EHS</span><strong>166,00</strong></article><article><span>Total Monétaire (HT)</span><strong>8 200 000 FCFA</strong></article></div>
        </div>
      </div>
    </section>
    {step === 2 && <div className="charges-overlay" role="dialog" aria-modal="true" aria-label="Charges et planification" onMouseDown={() => setStep(1)}>
      <div className="charges-overlay-content" onMouseDown={(event) => event.stopPropagation()}>
        <ProjectChargesStep onSaveTasks={saveTaskToProject} />
      </div>
    </div>}
    </>
  )
}

function ProjectChargesStep({ onSaveTasks }: { onSaveTasks: () => void }) {
  const [openGroups, setOpenGroups] = useState(['bo', 'mo'])
  const groups = [
    { id: 'bo', icon: '▣', title: 'BO – Back Office', task: ['BO101', 'Rédaction du livrable', 'BO', 'E', '18', '0', '18', '05/09/2025', '18/09/2025', '10j'] },
    { id: 'mo', icon: '♙', title: 'MO – Maîtrise d’œuvre', task: ['MO204', 'Descente terrain', 'MO', 'E', '24', '0', '24', '10/10/2026', '24/10/2026', '11j'] },
    { id: 'fo', icon: '♙', title: 'FO – Fonctions support' },
    { id: 'op', icon: '⚙', title: 'OP – Opérations' },
    { id: 'pi', icon: '⚒', title: 'PI – Pilotage et amélioration' },
    { id: 'it', icon: '♙', title: 'IT – Systèmes d’information' },
    { id: 'res', icon: '♜', title: 'RES – Ressources', task: ['RES301', 'Allocation des ressources', 'RES', 'E', '12', '0', '12', '01/11/2026', '08/11/2026', '6j'] },
  ]
  const toggleGroup = (id: string) => setOpenGroups((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])

  return <section className="charges-step-card">
    <div className="creation-steps charges-steps">
      <div className="creation-step"><b>1</b><span><strong>Informations générales</strong><small>Détails du projet</small></span></div>
      <div className="step-line" />
      <div className="creation-step active"><b>2</b><span><strong>Charges et planification</strong><small>Sélection des charges</small></span></div>
    </div>

    <div className="charges-heading"><h2>Étape 2 : Tâches liées au projet</h2><p>ⓘ &nbsp; Les tâches sont alimentées par le module <strong>Architecture des tâches.</strong></p></div>

    <div className="charge-groups">{groups.map((group) => {
      const isOpen = openGroups.includes(group.id)
      return <article className={`charge-group ${isOpen ? 'open' : ''}`} key={group.id}>
        <button className="charge-group-title" onClick={() => toggleGroup(group.id)}><span>{group.icon} &nbsp; {group.title}</span><b>{isOpen ? '⌃' : '⌄'}</b></button>
        {isOpen && group.task && <div className="charge-group-content">
          <div className="charge-table-wrap"><table><thead><tr><th>Code de la tâche</th><th>Nom de la tâche</th><th>Division / Cellule</th><th>Type</th><th>EHS</th><th>Monétaire (FCFA)</th><th>Éq. EHS</th><th>Date de début</th><th>Date de fin</th><th>Durée</th><th>CRUD</th></tr></thead><tbody><tr>{group.task.map((cell, index) => <td key={index}>{index === 3 ? <span className="task-type">{cell}</span> : index === 9 ? <><strong>{cell}</strong><small>jours ouvrés</small></> : cell}</td>)}<td><div className="task-crud"><button title="Consulter" onClick={() => window.alert(`Consultation de ${group.task?.[1]}`)}>◉</button><button title="Modifier" onClick={() => window.alert(`Modification de ${group.task?.[1]}`)}>✎</button><button className="delete" title="Supprimer" onClick={() => window.confirm(`Supprimer la tâche ${group.task?.[1]} ?`)}>⌫</button></div></td></tr></tbody></table></div>
          <button className="add-charge" onClick={() => window.alert(`Ajouter une tâche dans ${group.title}`)}>＋ &nbsp; Ajouter une tâche/charge</button>
        </div>}
      </article>
    })}</div>

    <div className="charge-legend">ⓘ &nbsp; <b>E</b> = consomme les EHS &nbsp;&nbsp; | &nbsp;&nbsp; <b>D</b> = consomme directement de la monnaie</div>
    <div className="charges-actions single-action"><button className="save-project" onClick={onSaveTasks}>Enregistrer les Tâches</button></div>
  </section>
}
