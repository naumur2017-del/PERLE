const tasks = [
  ['PRJ.001', 'Étude de faisabilité', 'E', '15,00', '0', '15,00', 'Ajara Lamare', 'Herman Tsaffock', '06/05/2025', '15/05/2025'],
  ['PRJ.002', 'Conception détaillée', 'E', '31,00', '0', '31,00', 'Ajara Lamare', 'Belomo Edwige', '16/05/2025', '15/06/2025'],
  ['PRJ.003', 'Achat matériel', 'D', '0', '6 000 000', '15,00', 'Herman Tsaffock', 'Essogo Eric', '01/06/2025', '30/07/2025'],
  ['PRJ.004', 'Développement', 'E', '60,00', '0', '60,00', 'Ajara Lamare', 'Theodore Bessala', '01/07/2025', '30/09/2025'],
  ['PRJ.005', 'Tests et recette', 'E', '45,00', '0', '45,00', 'Ajara Lamare', 'Herman Tsaffock', '01/10/2025', '15/11/2025'],
  ['PRJ.006', 'Formation utilisateurs', 'D', '0', '1 200 000', '8,00', 'Theodore Bessala', 'Belomo Edwige', '05/11/2025', '30/11/2025'],
  ['PRJ.007', 'Mise en production', 'E', '15,00', '1 000 000', '6,67', 'Ajara Lamare', 'Belomo Edwige', '01/12/2025', '15/12/2025'],
]

export default function ProjectCreation() {
  return (
    <section className="creation-page">
      <div className="creation-layout">
        <aside className="creation-form-card">
          <div className="creation-steps">
            <div className="creation-step active"><b>1</b><span><strong>Informations générales</strong><small>Détails du projet</small></span></div>
            <div className="step-line" />
            <div className="creation-step"><b>2</b><span><strong>Charges et planification</strong><small>Sélection des charges</small></span></div>
          </div>

          <div className="form-heading"><strong>Étape 1 : Informations générales du projet</strong><span>Renseignez les informations de base de votre projet.</span></div>
          <label className="field full"><span>Nom du projet <em>*</em></span><input value="Projet d’étude et de mise en œuvre du système ERP" readOnly /></label>
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
          <div className="form-actions"><button className="secondary-action">Annuler</button><button className="primary-action">Suivant &nbsp;→</button></div>
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

          <div className="task-table-wrap"><table className="task-table"><thead><tr><th>Code</th><th>Action</th><th>Nom de la tâche</th><th>Type</th><th>EHS</th><th>Monétaire (FCFA)</th><th>Équivalent EHS</th><th>Assignée par</th><th>Attribuée à</th><th>Début</th><th>Fin</th></tr></thead><tbody>{tasks.map((task) => <tr key={task[0]}>{task.map((cell, index) => <td key={`${task[0]}-${index}`}>{index === 1 ? <button className="select-action">Sélectionner⌄</button> : index === 3 ? <span className={`task-type ${cell === 'D' ? 'money' : ''}`}>{cell}</span> : cell}</td>)}</tr>)}</tbody><tfoot><tr><td colSpan={4}>Total</td><td>166,00</td><td>8 200 000</td><td>180,67</td><td colSpan={4} /></tr></tfoot></table></div>

          <div className="task-totals"><article><span>Nombre de tâches</span><strong>7</strong></article><article className="green"><span>Tâches de type E (EHS)</span><strong>5 (71,43%)</strong></article><article className="purple"><span>Tâches de type D (Monétaire)</span><strong>2 (28,57%)</strong></article><article><span>Total EHS</span><strong>166,00</strong></article><article><span>Total Monétaire (HT)</span><strong>8 200 000 FCFA</strong></article><button className="edit-project">✎ &nbsp; Modifier le projet</button></div>
        </div>
      </div>
    </section>
  )
}
