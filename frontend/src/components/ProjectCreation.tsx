import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  createProject, createProjectLigne, deleteProjectLigne, fetchProject, fetchProjects, updateProject,
  updateProjectLigne,
  type Project, type ProjectFormValues, type ProjectLigne, type ProjectStatut, type TypeMontant,
} from '../api/projects'
import { fetchLignesBudgetaires, type LigneBudgetaire } from '../api/architectureMonetaire'
import { fetchTaskTemplates, type TaskTemplate } from '../api/taskTemplates'
import { fetchTeams, type Team } from '../api/employees'
import { fetchOrganisationEhs, fetchOrganisationRemuneration } from '../api/organisation'
import { ApiError } from '../api/client'
import { currencySuffix, formatMontant } from '../utils/currency'
import DatePicker from './DatePicker'

const errorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    const payload = error.payload as Record<string, unknown> | null
    if (payload && typeof payload === 'object') {
      const firstValue = Object.values(payload)[0]
      if (typeof firstValue === 'string') return firstValue
      if (Array.isArray(firstValue) && typeof firstValue[0] === 'string') return firstValue[0]
    }
    return 'La requête a échoué.'
  }
  return 'Impossible de contacter le serveur.'
}

const fmtFcfa = (n: number) => formatMontant(n)
const fmtPercent = (n: number) => `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
const fmtDate = (value: string | null) => {
  if (!value) return '-'
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

/** Code — nom de la ligne, quel que soit son référentiel d'origine (voir ProjectLigne.type_ligne
 * côté backend) : Architecture monétaire ('M') ou catalogue de l'Architecture des tâches ('E'). */
const ligneLabel = (ligne: ProjectLigne) => ligne.type_ligne === 'E'
  ? `${ligne.task_template_code} — ${ligne.task_template_nom}`
  : `${ligne.ligne_budgetaire_code} — ${ligne.ligne_budgetaire_nom}`

const emptyForm = () => ({
  nom: '', client: '', description: '',
  montant: 0, typeMontant: 'HT' as TypeMontant, margePct: 40, chargesPct: 12, tvaPct: 0, irPct: 0,
  dateDebut: '', dateFin: '', reserveAmount: 0,
})

export default function ProjectCreation({ onCancel }: { onCancel: () => void }) {
  const [pageTab, setPageTab] = useState<'nouveau' | 'brouillon' | 'historique'>('nouveau')
  const [step, setStep] = useState(1)

  const [projectId, setProjectId] = useState<number | null>(null)
  const [projectCode, setProjectCode] = useState<string | null>(null)
  const initial = emptyForm()
  const [projectName, setProjectName] = useState(initial.nom)
  const [clientName, setClientName] = useState(initial.client)
  const [projectDescription, setProjectDescription] = useState(initial.description)
  const [montant, setMontant] = useState(initial.montant)
  const [typeMontant, setTypeMontant] = useState<TypeMontant>(initial.typeMontant)
  const [margePct, setMargePct] = useState(initial.margePct)
  const [chargesPct, setChargesPct] = useState(initial.chargesPct)
  const [tvaPct, setTvaPct] = useState(initial.tvaPct)
  const [irPct, setIrPct] = useState(initial.irPct)
  const [dateDebut, setDateDebut] = useState(initial.dateDebut)
  const [dateFin, setDateFin] = useState(initial.dateFin)
  const [reserveAmount, setReserveAmount] = useState(initial.reserveAmount)
  const [lignes, setLignes] = useState<ProjectLigne[]>([])
  const tempIdRef = useRef(0)

  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [saveMenuOpen, setSaveMenuOpen] = useState(false)

  const [drafts, setDrafts] = useState<Project[]>([])
  const [historique, setHistorique] = useState<Project[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)

  const [teams, setTeams] = useState<Team[]>([])
  const [catalogue, setCatalogue] = useState<LigneBudgetaire[]>([])
  const [templateCatalogue, setTemplateCatalogue] = useState<TaskTemplate[]>([])
  // Taux réel configuré dans Paramètres > EHS — 150 n'est qu'un repli avant le chargement (même
  // défaut que le modèle Organisation côté backend), jamais une valeur figée en dur.
  const [ehsRate, setEhsRate] = useState(150)
  // Taux de TVA standard de l'organisation (Paramètres > Rémunération), pré-rempli automatiquement
  // selon son pays à l'inscription — valeur de départ du champ TVA (%) d'un nouveau projet, sans
  // écraser un brouillon déjà chargé (voir openDraft) ni une valeur déjà saisie par l'utilisateur.
  const [defaultTvaPct, setDefaultTvaPct] = useState(0)

  useEffect(() => {
    Promise.all([fetchTeams(), fetchLignesBudgetaires(), fetchTaskTemplates(), fetchOrganisationEhs(), fetchOrganisationRemuneration()])
      .then(([teamsData, lignesData, templatesData, ehsData, remunerationData]) => {
        setTeams(teamsData)
        setCatalogue(lignesData.filter((l) => l.actif))
        setTemplateCatalogue(templatesData.filter((t) => t.actif))
        setEhsRate(ehsData.taux_ehs_fcfa)
        setDefaultTvaPct(remunerationData.taux_tva_pct)
        setTvaPct((current) => current === 0 ? remunerationData.taux_tva_pct : current)
      })
      .catch(() => {})
  }, [])

  const loadList = (statut: ProjectStatut) => {
    setListLoading(true); setListError(null)
    fetchProjects(statut)
      .then(statut === 'brouillon' ? setDrafts : setHistorique)
      .catch(() => setListError(statut === 'brouillon' ? 'Impossible de charger les brouillons.' : 'Impossible de charger l’historique.'))
      .finally(() => setListLoading(false))
  }

  const changeTab = (tab: 'nouveau' | 'brouillon' | 'historique') => {
    setPageTab(tab)
    if (tab === 'brouillon') loadList('brouillon')
    else if (tab === 'historique') loadList('definitif')
  }

  const resetForm = () => {
    const blank = emptyForm()
    setProjectId(null); setProjectCode(null)
    setProjectName(blank.nom); setClientName(blank.client); setProjectDescription(blank.description)
    setMontant(blank.montant); setTypeMontant(blank.typeMontant); setMargePct(blank.margePct)
    setChargesPct(blank.chargesPct); setTvaPct(defaultTvaPct); setIrPct(blank.irPct)
    setDateDebut(blank.dateDebut); setDateFin(blank.dateFin); setReserveAmount(blank.reserveAmount)
    setLignes([]); setFormError(null)
  }

  const openDraft = (draft: Project) => {
    setProjectId(draft.id)
    setProjectCode(draft.code)
    setProjectName(draft.nom)
    setClientName(draft.client)
    setProjectDescription(draft.description)
    setMontant(draft.montant)
    setTypeMontant(draft.type_montant)
    setMargePct(draft.marge_pct)
    setChargesPct(draft.charges_transversales_pct)
    setTvaPct(draft.tva_pct)
    setIrPct(draft.ir_pct)
    setReserveAmount(draft.reserve_montant)
    setDateDebut(draft.date_debut ?? '')
    setDateFin(draft.date_fin ?? '')
    setLignes(draft.lignes)
    setFormError(null)
    changeTab('nouveau')
  }

  const cancelDraftEdit = () => { resetForm(); changeTab('brouillon') }

  const margeMontant = montant * margePct / 100
  const chargesMontant = montant * chargesPct / 100
  const tvaMontant = montant * tvaPct / 100
  const irMontant = montant * irPct / 100
  // TTC : montant − TVA − marge − charges transversales. HT : montant − IR − marge − charges
  // transversales — les deux taxes ne se soustraient jamais ensemble, selon le type de montant saisi.
  const taxeDeductible = typeMontant === 'TTC' ? tvaMontant : irMontant
  const budgetExecution = montant - taxeDeductible - margeMontant - chargesMontant
  const equivalentEhs = budgetExecution > 0 ? budgetExecution / ehsRate : 0

  const coutsLignesBudgetaires = lignes.reduce((sum, l) => sum + l.montant, 0)
  const reste = budgetExecution - coutsLignesBudgetaires - reserveAmount
  const coutsPercent = budgetExecution > 0 ? (coutsLignesBudgetaires / budgetExecution) * 100 : 0
  const restePercent = budgetExecution > 0 ? (reste / budgetExecution) * 100 : 0

  const dureeDays = dateDebut && dateFin
    ? Math.max(0, Math.round((new Date(dateFin).getTime() - new Date(dateDebut).getTime()) / 86400000) + 1)
    : null

  const reserveActive = reserveAmount > 0

  const goToChargesStep = () => setStep(2)

  const addLigne = async (values: { type_ligne: 'M' | 'E'; ligne_budgetaire?: number | null; task_template?: number | null; montant: number; date_debut: string; date_fin: string }) => {
    const payload = {
      type_ligne: values.type_ligne,
      ligne_budgetaire: values.type_ligne === 'M' ? values.ligne_budgetaire ?? null : null,
      task_template: values.type_ligne === 'E' ? values.task_template ?? null : null,
      montant: values.montant,
      date_debut: values.date_debut || null, date_fin: values.date_fin || null,
    }
    if (projectId) {
      const created = await createProjectLigne(projectId, payload)
      setLignes((prev) => [...prev, created])
    } else {
      tempIdRef.current -= 1
      let pending: ProjectLigne
      if (values.type_ligne === 'M') {
        const source = catalogue.find((l) => l.id === values.ligne_budgetaire)
        pending = {
          id: tempIdRef.current, code: `PRJ.${String(lignes.length + 1).padStart(3, '0')}`,
          type_ligne: 'M',
          ligne_budgetaire: values.ligne_budgetaire ?? null,
          ligne_budgetaire_nom: source?.nom ?? '', ligne_budgetaire_code: source?.code ?? '',
          ligne_budgetaire_declinaison: source?.declinaison ?? '', ligne_budgetaire_montant_prevu: source?.montant_prevu ?? null,
          task_template: null, task_template_nom: '', task_template_code: '',
          equipe: source?.equipe ?? null, equipe_nom: source?.equipe_nom ?? '', equipe_code: source?.equipe_code ?? '',
          montant: values.montant, montant_consomme_fcfa: 0, montant_reste_fcfa: values.montant, ehs_equivalent: null,
          date_debut: values.date_debut || null, date_fin: values.date_fin || null,
          is_transversale: false, montant_auto: false, created_at: '',
        }
      } else {
        const source = templateCatalogue.find((t) => t.id === values.task_template)
        pending = {
          id: tempIdRef.current, code: `PRJ.${String(lignes.length + 1).padStart(3, '0')}`,
          type_ligne: 'E',
          ligne_budgetaire: null, ligne_budgetaire_nom: '', ligne_budgetaire_code: '',
          ligne_budgetaire_declinaison: '', ligne_budgetaire_montant_prevu: null,
          task_template: values.task_template ?? null, task_template_nom: source?.nom ?? '', task_template_code: source?.code ?? '',
          equipe: source?.equipe ?? null, equipe_nom: source?.equipe_nom ?? '', equipe_code: source?.equipe_code ?? '',
          montant: values.montant, montant_consomme_fcfa: 0, montant_reste_fcfa: values.montant,
          ehs_equivalent: ehsRate ? values.montant / ehsRate : null,
          date_debut: values.date_debut || null, date_fin: values.date_fin || null,
          is_transversale: false, montant_auto: false, created_at: '',
        }
      }
      setLignes((prev) => [...prev, pending])
    }
  }

  const removeLigne = async (ligne: ProjectLigne) => {
    // La ligne transversale (Ressources, 10 %) est attribuée d'office et ne se retire pas.
    if (ligne.is_transversale) return
    if (projectId && ligne.id > 0) {
      await deleteProjectLigne(projectId, ligne.id)
    }
    setLignes((prev) => prev.filter((l) => l.id !== ligne.id))
  }

  const updateLigne = async (ligne: ProjectLigne, values: { montant: number; date_debut: string; date_fin: string }) => {
    const payload = { montant: values.montant, date_debut: values.date_debut || null, date_fin: values.date_fin || null }
    if (projectId && ligne.id > 0) {
      const updated = await updateProjectLigne(projectId, ligne.id, payload)
      setLignes((prev) => prev.map((l) => l.id === ligne.id ? updated : l))
    } else {
      setLignes((prev) => prev.map((l) => l.id === ligne.id
        ? { ...l, montant: values.montant, montant_reste_fcfa: values.montant - l.montant_consomme_fcfa, date_debut: payload.date_debut, date_fin: payload.date_fin }
        : l))
    }
  }

  const addReserveLine = () => {
    if (reste + reserveAmount <= 0) return
    setReserveAmount(reste + reserveAmount)
  }

  const removeReserveLine = () => setReserveAmount(0)

  const saveProject = async (mode: ProjectStatut) => {
    setSaveMenuOpen(false)
    setFormError(null)
    if (!projectName.trim()) { setFormError('Le nom du projet est requis.'); return }
    setSaving(true)
    try {
      const payload: ProjectFormValues = {
        nom: projectName.trim(), client: clientName.trim(), description: projectDescription,
        montant, type_montant: typeMontant, marge_pct: margePct, charges_transversales_pct: chargesPct,
        tva_pct: tvaPct, ir_pct: irPct, reserve_montant: reserveAmount,
        date_debut: dateDebut || null, date_fin: dateFin || null, statut: mode,
      }
      let currentId = projectId
      if (currentId === null) {
        const created = await createProject(payload)
        currentId = created.id
        setProjectId(created.id)
        setProjectCode(created.code)
        // Les lignes ajoutées avant la toute première sauvegarde n'existaient qu'en local :
        // on les persiste maintenant que le projet a un identifiant réel.
        for (const pending of lignes) {
          await createProjectLigne(created.id, {
            type_ligne: pending.type_ligne,
            ligne_budgetaire: pending.ligne_budgetaire, task_template: pending.task_template,
            montant: pending.montant,
            date_debut: pending.date_debut, date_fin: pending.date_fin,
          })
        }
      } else {
        await updateProject(currentId, payload)
      }
      const fresh = await fetchProject(currentId)
      setLignes(fresh.lignes)
      setProjectCode(fresh.code)
      window.alert(mode === 'brouillon' ? 'Le projet a été enregistré dans le brouillon.' : 'Le projet a été enregistré définitivement.')
      if (mode === 'definitif') {
        resetForm()
        changeTab('historique')
      }
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (step !== 2) return
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && setStep(1)
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [step])

  const equipesDistinctes = new Set(lignes.map((l) => l.equipe)).size
  const totalMontant = lignes.reduce((sum, l) => sum + l.montant, 0)

  return (
    <>
    <section className="creation-page" aria-hidden={step === 2}>
      <nav className="creation-page-tabs">
        <button className={pageTab === 'nouveau' ? 'active' : ''} onClick={() => changeTab('nouveau')}>Créer un nouveau projet</button>
        <button className={pageTab === 'brouillon' ? 'active' : ''} onClick={() => changeTab('brouillon')}>Brouillon</button>
        <button className={pageTab === 'historique' ? 'active' : ''} onClick={() => changeTab('historique')}>Historique</button>
      </nav>

      {pageTab === 'historique' && (
        listLoading ? <div className="creation-empty-panel"><p>Chargement…</p></div>
        : listError ? <div className="creation-empty-panel"><p>{listError}</p></div>
        : historique.length === 0 ? (
          <div className="creation-empty-panel"><p>Aucun historique de projet disponible pour le moment.</p></div>
        ) : (
          <div className="draft-panel">
            <table className="draft-table">
              <thead><tr><th>Code</th><th>Nom du projet</th><th>Client</th><th>Montant</th><th>Budget d’exécution</th><th>Enregistré le</th></tr></thead>
              <tbody>
                {historique.map((project) => (
                  <tr key={project.id}>
                    <td className="draft-code"><button type="button" className="draft-code-link" onClick={() => openDraft(project)}>{project.code}</button></td>
                    <td className="draft-name">{project.nom}</td>
                    <td>{project.client || 'Client non renseigné'}</td>
                    <td>{fmtFcfa(project.montant)} <small>({project.type_montant})</small></td>
                    <td>{fmtFcfa(project.budget_execution)}</td>
                    <td>{new Date(project.updated_at).toLocaleDateString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {pageTab === 'brouillon' && (
        listLoading ? <div className="creation-empty-panel"><p>Chargement…</p></div>
        : listError ? <div className="creation-empty-panel"><p>{listError}</p></div>
        : drafts.length === 0 ? (
          <div className="creation-empty-panel"><p>Aucun projet enregistré dans le brouillon pour le moment.</p></div>
        ) : (
          <div className="draft-panel">
            <table className="draft-table">
              <thead><tr><th>Code</th><th>Nom du projet</th><th>Client</th><th>Montant</th><th>Budget d’exécution</th><th>Enregistré le</th></tr></thead>
              <tbody>
                {drafts.map((draft) => (
                  <tr key={draft.id}>
                    <td className="draft-code"><button type="button" className="draft-code-link" onClick={() => openDraft(draft)}>{draft.code}</button></td>
                    <td className="draft-name">{draft.nom}</td>
                    <td>{draft.client || 'Client non renseigné'}</td>
                    <td>{fmtFcfa(draft.montant)} <small>({draft.type_montant})</small></td>
                    <td>{fmtFcfa(draft.budget_execution)}</td>
                    <td>{new Date(draft.updated_at).toLocaleDateString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {pageTab === 'nouveau' && projectId && (
        <div className="draft-edit-banner">
          <span>Modification du projet <strong>{projectCode}</strong></span>
          <button type="button" onClick={cancelDraftEdit}>Retour au brouillon</button>
        </div>
      )}

      {pageTab === 'nouveau' && <div className="creation-layout">
        <aside className="creation-form-card">
          <div className="creation-steps">
            <div className="creation-step active"><b>1</b><span><strong>Informations générales</strong><small>Détails du projet</small></span></div>
            <div className="step-line" />
            <div className="creation-step"><b>2</b><span><strong>Charges et planification</strong><small>Sélection des charges</small></span></div>
          </div>

          <div className="form-heading"><strong>Étape 1 : Informations générales du projet</strong><span>Renseignez les informations de base de votre projet.</span></div>
          {formError && <p className="form-error">{formError}</p>}
          <label className="field full"><span>Nom du projet <em>*</em></span><input value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Ex. Déploiement du système ERP" /></label>
          <label className="field full project-text-field"><span>Nom du client <em>*</em></span><input value={clientName} onChange={(event) => setClientName(event.target.value)} /></label>
          <label className="field full project-text-field"><span>Description du projet</span><textarea value={projectDescription} onChange={(event) => setProjectDescription(event.target.value)} rows={4} /></label>
          <div className="form-grid three">
            <label className="field"><span>Montant {typeMontant} du projet <em>*</em></span><div className="input-suffix"><input type="number" min={0} value={montant} onChange={(event) => setMontant(Number(event.target.value))} /><i>{currencySuffix()}</i></div></label>
            <label className="field"><span>Type de montant <em>*</em></span><select value={typeMontant} onChange={(event) => setTypeMontant(event.target.value as TypeMontant)}><option value="HT">HT</option><option value="TTC">TTC</option></select></label>
            <label className="field"><span>Marge (%) <em>*</em></span><div className="input-suffix"><input type="number" min={0} max={100} value={margePct} onChange={(event) => setMargePct(Number(event.target.value))} /><i>%</i></div></label>
            <label className="field"><span>Charges transversales (%) <em>*</em></span><div className="input-suffix"><input type="number" min={0} max={100} value={chargesPct} onChange={(event) => setChargesPct(Number(event.target.value))} /><i>%</i></div><small>Entre 10% et 15%</small></label>
            <label className="field"><span>TVA (%)</span><div className="input-suffix"><input type="number" min={0} max={100} value={tvaPct} onChange={(event) => setTvaPct(Number(event.target.value))} /><i>%</i></div><small>Saisir le taux de TVA si le montant est en TTC</small></label>
            <label className="field"><span>IR (%)</span><div className="input-suffix"><input type="number" min={0} max={100} value={irPct} onChange={(event) => setIrPct(Number(event.target.value))} /><i>%</i></div><small>Saisir le taux d’IR à soustraire si applicable</small></label>
          </div>

          <div className="auto-summary">
            <h3>▣ &nbsp; Récapitulatif automatique</h3>
            <dl>
              <div><dt>Montant {typeMontant}</dt><dd>{fmtFcfa(montant)}</dd></div>
              <div><dt>{typeMontant === 'TTC' ? `TVA (${tvaPct}%)` : `IR (${irPct}%)`}</dt><dd className="cyan">- {fmtFcfa(taxeDeductible)}</dd></div>
              <div><dt>Marge ({margePct}%)</dt><dd className="blue">- {fmtFcfa(margeMontant)}</dd></div>
              <div><dt>Charges transversales ({chargesPct}%)</dt><dd className="orange">- {fmtFcfa(chargesMontant)}</dd></div>
            </dl>
            <div className="execution-total"><span>Budget d’exécution</span><strong>{fmtFcfa(budgetExecution)}</strong><small>{fmtFcfa(montant)} − {fmtFcfa(taxeDeductible)} − {fmtFcfa(margeMontant)} − {fmtFcfa(chargesMontant)}</small></div>
          </div>

          <div className="form-grid two dates">
            <DatePicker label={<>Date de début du projet <em>*</em></>} className="field" value={dateDebut} onChange={setDateDebut} />
            <DatePicker label={<>Date de fin du projet <em>*</em></>} className="field" value={dateFin} min={dateDebut || undefined} onChange={setDateFin} />
          </div>
          {dureeDays !== null && <div className="duration-note">◷ &nbsp; La durée totale du projet est de <strong>{dureeDays} jours.</strong></div>}
          <div className="field unexpected-field">
            <span>Réserve</span>
            {reserveActive ? (
              <button type="button" className="reserve-button is-active" onClick={removeReserveLine}>
                ✕ Désélectionner la Réserve ({fmtFcfa(reserveAmount)})
              </button>
            ) : (
              <button type="button" className="reserve-button" onClick={addReserveLine} disabled={reste <= 0}>
                {reste > 0 ? `＋ Affecter le reste en Réserve (${fmtFcfa(reste)})` : '✓ Budget entièrement affecté'}
              </button>
            )}
          </div>
          <div className="form-actions project-form-actions">
            <button className="secondary-action" onClick={() => (projectId ? cancelDraftEdit() : onCancel())}>Annuler</button>
            <button className="primary-action" onClick={goToChargesStep}>Définir les lignes budgétaires</button>
            <div className="save-project-wrap">
              <button type="button" className="save-project" disabled={saving} onClick={() => setSaveMenuOpen((open) => !open)}>{saving ? 'Enregistrement…' : 'Enregistrer le projet ▾'}</button>
              {saveMenuOpen && (
                <ul className="save-project-menu" onMouseLeave={() => setSaveMenuOpen(false)}>
                  <li><button type="button" onClick={() => saveProject('brouillon')}>Enregistrer dans le brouillon</button></li>
                  <li><button type="button" onClick={() => saveProject('definitif')}>Enregistrer définitivement le projet</button></li>
                </ul>
              )}
            </div>
          </div>
        </aside>

        <div className="creation-overview">
          <div className="overview-heading"><h3>Aperçu et récapitulatif du projet</h3><p>Les résultats sont calculés automatiquement en temps réel.</p></div>
          <div className="financial-cards">
            <article className="financial-card green"><span>Montant {typeMontant}</span><strong>{fmtFcfa(montant)}</strong><small>100,00%</small></article>
            <article className="financial-card purple"><span>Marge ({margePct}%)</span><strong>{fmtFcfa(margeMontant)}</strong><small>{fmtPercent(margePct)}</small></article>
            <article className="financial-card orange"><span>Charges transversales ({chargesPct}%)</span><strong>{fmtFcfa(chargesMontant)}</strong><small>{fmtPercent(chargesPct)}</small></article>
            <article className="financial-card blue"><span>Budget d’exécution</span><strong>{fmtFcfa(budgetExecution)}</strong><small>{fmtPercent(montant > 0 ? (budgetExecution / montant) * 100 : 0)}</small></article>
            <article className="financial-card cyan"><span>TVA ({tvaPct}%)</span><strong>{fmtFcfa(tvaMontant)}</strong><small>{fmtPercent(tvaPct)}</small></article>
            <article className="financial-card cyan"><span>IR ({irPct}%)</span><strong>{fmtFcfa(irMontant)}</strong><small>{fmtPercent(irPct)}</small></article>
          </div>

          <div className="budget-strip">
            <div><span>Reste disponible (après coûts des lignes budgétaires et réserve)</span><strong>{fmtFcfa(reste)}</strong><small>{fmtPercent(restePercent)} du budget d’exécution</small></div>
            <div className="budget-progress"><i style={{ width: `${Math.min(100, Math.max(0, coutsPercent))}%` }} /></div>
            <div><span>Coûts des lignes budgétaires (HT)</span><strong className="danger">{fmtFcfa(coutsLignesBudgetaires)}</strong><small>{fmtPercent(coutsPercent)} du budget d’exécution</small></div>
            <div><span>Équivalent EHS</span><strong>{equivalentEhs.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong><small>{fmtFcfa(budgetExecution)} ÷ {ehsRate}</small></div>
          </div>

          <div className="task-table-wrap">
            <table className="task-table">
              <thead><tr><th>Code</th><th>Type</th><th>Équipe</th><th>Ligne</th><th>Déclinaison</th><th>{`Montant (${currencySuffix()})`}</th><th>Début</th><th>Fin</th></tr></thead>
              <tbody>
                {lignes.map((ligne) => (
                  <tr key={ligne.id}>
                    <td>{ligne.code}</td>
                    <td><span className={`ligne-type-tag ligne-type-${ligne.type_ligne.toLowerCase()}`}>{ligne.type_ligne}</span></td>
                    <td>{ligne.equipe_code}</td>
                    <td>
                      {ligneLabel(ligne)}
                      {ligne.is_transversale && <span className="creation-transversale-tag"> · transversale 10 %</span>}
                      {ligne.type_ligne === 'E' && ligne.ehs_equivalent !== null && (
                        <span className="creation-transversale-tag"> · {ligne.ehs_equivalent.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} EHS</span>
                      )}
                    </td>
                    <td>{ligne.type_ligne === 'E' ? '-' : (ligne.ligne_budgetaire_declinaison || '-')}</td>
                    <td>{ligne.montant.toLocaleString('fr-FR')}</td>
                    <td>{fmtDate(ligne.date_debut)}</td>
                    <td>{fmtDate(ligne.date_fin)}</td>
                  </tr>
                ))}
                {lignes.length === 0 && (
                  <tr><td colSpan={8} className="creation-empty-row">Aucune ligne budgétaire pour le moment. Cliquez sur « Définir les lignes budgétaires ».</td></tr>
                )}
              </tbody>
              <tfoot><tr><td colSpan={5}>Total</td><td>{totalMontant.toLocaleString('fr-FR')}</td><td colSpan={2} /></tr></tfoot>
            </table>
          </div>

          <div className="task-totals">
            <article><span>Nombre de lignes budgétaires</span><strong>{lignes.length}</strong></article>
            <article className="purple"><span>Équipes impliquées</span><strong>{equipesDistinctes}</strong></article>
            <article className="green"><span>Total attribué (HT)</span><strong>{fmtFcfa(totalMontant)}</strong></article>
            <article><span>Réserve</span><strong>{fmtFcfa(reserveAmount)}</strong></article>
          </div>
        </div>
      </div>}
    </section>
    {step === 2 && <div className="charges-overlay" role="dialog" aria-modal="true" aria-label="Charges et planification" onMouseDown={() => setStep(1)}>
      <div className="charges-overlay-content" onMouseDown={(event) => event.stopPropagation()}>
        <ProjectChargesStep
          lignes={lignes} teams={teams} catalogue={catalogue} templateCatalogue={templateCatalogue} ehsRate={ehsRate}
          projectDateDebut={dateDebut} projectDateFin={dateFin} resteProjet={reste}
          onAddLigne={addLigne} onRemoveLigne={removeLigne} onUpdateLigne={updateLigne} onClose={() => setStep(1)}
        />
      </div>
    </div>}
    </>
  )
}

function ProjectChargesStep({ lignes, teams, catalogue, templateCatalogue, ehsRate, projectDateDebut, projectDateFin, resteProjet, onAddLigne, onRemoveLigne, onUpdateLigne, onClose }: {
  lignes: ProjectLigne[]
  teams: Team[]
  catalogue: LigneBudgetaire[]
  templateCatalogue: TaskTemplate[]
  ehsRate: number
  projectDateDebut: string
  projectDateFin: string
  resteProjet: number
  onAddLigne: (values: { type_ligne: 'M' | 'E'; ligne_budgetaire?: number | null; task_template?: number | null; montant: number; date_debut: string; date_fin: string }) => Promise<void>
  onRemoveLigne: (ligne: ProjectLigne) => Promise<void>
  onUpdateLigne: (ligne: ProjectLigne, values: { montant: number; date_debut: string; date_fin: string }) => Promise<void>
  onClose: () => void
}) {
  return <section className="charges-step-card">
    <div className="creation-steps charges-steps">
      <div className="creation-step"><b>1</b><span><strong>Informations générales</strong><small>Détails du projet</small></span></div>
      <div className="step-line" />
      <div className="creation-step active"><b>2</b><span><strong>Charges et planification</strong><small>Sélection des charges</small></span></div>
    </div>

    <div className="charges-heading"><h2>Étape 2 : Lignes budgétaires liées au projet</h2><p>ⓘ &nbsp; Chaque équipe a son propre tableau. Le sélecteur de ligne budgétaire de chaque équipe n’affiche que les lignes du référentiel qui lui sont attribuées.</p><p>ⓘ &nbsp; La ligne « Charges transversales » de l’équipe Ressources est ajoutée automatiquement à hauteur de 10 % du montant du projet ; elle apparaît une fois le projet enregistré.</p></div>

    <div className={`budget-restant-banner${resteProjet < 0 ? ' is-negative' : ''}`}>
      <span>Budget restant du projet</span>
      <strong>{fmtFcfa(resteProjet)}</strong>
    </div>

    <div className="charge-groups">
      {teams.map((team) => (
        <TeamChargeGroup
          key={team.id}
          team={team}
          hasCatalogueLignes={catalogue.some((l) => l.equipe === team.id) || templateCatalogue.some((t) => t.equipe === team.id)}
          availableLignes={catalogue.filter((l) => l.equipe === team.id && !l.is_transversale && !lignes.some((pl) => pl.ligne_budgetaire === l.id))}
          availableTemplates={templateCatalogue.filter((t) => t.equipe === team.id && !lignes.some((pl) => pl.task_template === t.id))}
          ehsRate={ehsRate}
          attributedLignes={lignes.filter((l) => l.equipe === team.id)}
          projectDateDebut={projectDateDebut}
          projectDateFin={projectDateFin}
          resteProjet={resteProjet}
          onAdd={onAddLigne}
          onRemove={onRemoveLigne}
          onUpdate={onUpdateLigne}
        />
      ))}
      {teams.length === 0 && (
        <p className="creation-empty-panel">Aucune équipe n’est définie pour votre organisation.</p>
      )}
    </div>

    <div className="charges-actions">
      <button type="button" className="save-project" style={{ marginLeft: 'auto' }} onClick={onClose}>Retour aux informations générales</button>
    </div>
  </section>
}

function TeamChargeGroup({ team, hasCatalogueLignes, availableLignes, availableTemplates, ehsRate, attributedLignes, projectDateDebut, projectDateFin, resteProjet, onAdd, onRemove, onUpdate }: {
  team: Team
  hasCatalogueLignes: boolean
  availableLignes: LigneBudgetaire[]
  availableTemplates: TaskTemplate[]
  ehsRate: number
  attributedLignes: ProjectLigne[]
  projectDateDebut: string
  projectDateFin: string
  resteProjet: number
  onAdd: (values: { type_ligne: 'M' | 'E'; ligne_budgetaire?: number | null; task_template?: number | null; montant: number; date_debut: string; date_fin: string }) => Promise<void>
  onRemove: (ligne: ProjectLigne) => Promise<void>
  onUpdate: (ligne: ProjectLigne, values: { montant: number; date_debut: string; date_fin: string }) => Promise<void>
}) {
  const [open, setOpen] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [typeLigne, setTypeLigne] = useState<'M' | 'E'>('M')
  const [ligneId, setLigneId] = useState<number | null>(null)
  const [templateId, setTemplateId] = useState<number | null>(null)
  const [montant, setMontant] = useState('')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [editingLigne, setEditingLigne] = useState<ProjectLigne | null>(null)
  const [editMontant, setEditMontant] = useState('')
  const [editDateDebut, setEditDateDebut] = useState('')
  const [editDateFin, setEditDateFin] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  const changeType = (next: 'M' | 'E') => { setTypeLigne(next); setLigneId(null); setTemplateId(null) }

  const selectedLigne = availableLignes.find((l) => l.id === ligneId) ?? null
  const selectedTemplate = availableTemplates.find((t) => t.id === templateId) ?? null
  const montantPrevu = selectedLigne?.montant_prevu ?? null
  const montantNumber = Number(montant) || 0
  const depassePrevu = typeLigne === 'M' && montantPrevu !== null && montantNumber > montantPrevu
  const depasseReste = montantNumber > resteProjet
  const ehsApercu = ehsRate ? montantNumber / ehsRate : 0
  const canSave = typeLigne === 'M'
    ? ligneId !== null && montantNumber > 0 && !depassePrevu && !depasseReste
    : templateId !== null && montantNumber > 0 && !depasseReste
  const periodeAlignee = !!projectDateDebut && !!projectDateFin && dateDebut === projectDateDebut && dateFin === projectDateFin

  const alignerSurProjet = () => { setDateDebut(projectDateDebut); setDateFin(projectDateFin) }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      await onAdd({
        type_ligne: typeLigne,
        ligne_budgetaire: typeLigne === 'M' ? ligneId : null,
        task_template: typeLigne === 'E' ? templateId : null,
        montant: montantNumber, date_debut: dateDebut, date_fin: dateFin,
      })
      setLigneId(null); setTemplateId(null); setMontant(''); setDateDebut(''); setDateFin(''); setShowForm(false)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (ligne: ProjectLigne) => {
    const nom = ligne.type_ligne === 'E' ? ligne.task_template_nom : ligne.ligne_budgetaire_nom
    if (!window.confirm(`Retirer la ligne « ${nom} » de ce projet ?`)) return
    setRemovingId(ligne.id)
    setError(null)
    try {
      await onRemove(ligne)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setRemovingId(null)
    }
  }

  const startEdit = (ligne: ProjectLigne) => {
    setOpenMenuId(null)
    setEditingLigne(ligne)
    setEditMontant(String(ligne.montant))
    setEditDateDebut(ligne.date_debut ?? '')
    setEditDateFin(ligne.date_fin ?? '')
  }

  const cancelEdit = () => setEditingLigne(null)

  const handleUpdate = async (event: FormEvent) => {
    event.preventDefault()
    if (!editingLigne) return
    const montantValue = Number(editMontant) || 0
    if (montantValue <= 0) return
    setEditSaving(true)
    setError(null)
    try {
      await onUpdate(editingLigne, { montant: montantValue, date_debut: editDateDebut, date_fin: editDateFin })
      setEditingLigne(null)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setEditSaving(false)
    }
  }

  return (
    <article className={`charge-group ${open ? 'open' : ''}`}>
      <button type="button" className="charge-group-title" onClick={() => setOpen((o) => !o)}>
        <span>{team.code} — {team.name}</span>
        <b>{open ? '⌃' : '⌄'}</b>
      </button>
      {open && (
        <div className="charge-group-content">
          {error && <p className="form-error">{error}</p>}
          <div className="charge-table-wrap">
            <table>
              <thead><tr><th>Code</th><th>Type</th><th>Ligne</th><th>Déclinaison</th><th>{`Montant (${currencySuffix()})`}</th><th>Début</th><th>Fin</th><th>Action</th></tr></thead>
              <tbody>
                {attributedLignes.map((ligne) => ligne.id === editingLigne?.id ? (
                  <tr key={ligne.id} className="charge-row-editing">
                    <td>{ligne.code}</td>
                    <td><span className={`ligne-type-tag ligne-type-${ligne.type_ligne.toLowerCase()}`}>{ligne.type_ligne}</span></td>
                    <td>
                      {ligneLabel(ligne)}
                      {ligne.is_transversale && <span className="creation-transversale-tag"> · transversale 10 %</span>}
                    </td>
                    <td>{ligne.type_ligne === 'E' ? '-' : (ligne.ligne_budgetaire_declinaison || '-')}</td>
                    <td><input type="number" min={0} value={editMontant} onChange={(event) => setEditMontant(event.target.value)} /></td>
                    <td colSpan={2}>
                      <div className="charge-edit-dates">
                        <DatePicker value={editDateDebut} onChange={setEditDateDebut} />
                        <DatePicker value={editDateFin} min={editDateDebut || undefined} onChange={setEditDateFin} />
                      </div>
                    </td>
                    <td className="charge-edit-actions">
                      <button type="button" className="secondary-action" onClick={cancelEdit} disabled={editSaving}>Annuler</button>
                      <button type="button" className="add-charge" onClick={handleUpdate} disabled={editSaving || (Number(editMontant) || 0) <= 0}>
                        {editSaving ? 'Enregistrement…' : 'Enregistrer'}
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={ligne.id}>
                    <td>{ligne.code}</td>
                    <td><span className={`ligne-type-tag ligne-type-${ligne.type_ligne.toLowerCase()}`}>{ligne.type_ligne}</span></td>
                    <td>
                      {ligneLabel(ligne)}
                      {ligne.is_transversale && <span className="creation-transversale-tag"> · transversale 10 %</span>}
                      {ligne.type_ligne === 'E' && ligne.ehs_equivalent !== null && (
                        <span className="creation-transversale-tag"> · {ligne.ehs_equivalent.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} EHS</span>
                      )}
                    </td>
                    <td>{ligne.type_ligne === 'E' ? '-' : (ligne.ligne_budgetaire_declinaison || '-')}</td>
                    <td>{ligne.montant.toLocaleString('fr-FR')}</td>
                    <td>{fmtDate(ligne.date_debut)}</td>
                    <td>{fmtDate(ligne.date_fin)}</td>
                    <td className="charge-options-cell">
                      <button
                        type="button" className="charge-options-btn" aria-label="Options de la ligne" aria-haspopup="menu"
                        aria-expanded={openMenuId === ligne.id}
                        onClick={() => setOpenMenuId((current) => current === ligne.id ? null : ligne.id)}
                      >⋮</button>
                      {openMenuId === ligne.id && (
                        <ul className="charge-options-menu" role="menu" onMouseLeave={() => setOpenMenuId(null)}>
                          <li><button type="button" role="menuitem" onClick={() => startEdit(ligne)}>✎ Modifier</button></li>
                          {!ligne.is_transversale && (
                            <li>
                              <button type="button" role="menuitem" className="danger" disabled={removingId === ligne.id} onClick={() => { setOpenMenuId(null); handleRemove(ligne) }}>
                                ⌫ Supprimer
                              </button>
                            </li>
                          )}
                        </ul>
                      )}
                    </td>
                  </tr>
                ))}
                {attributedLignes.length === 0 && (
                  <tr><td colSpan={8} className="creation-empty-row">Aucune ligne attribuée pour cette équipe.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {showForm ? (
            <form className="charge-add-form" onSubmit={handleSubmit}>
              <div className="ligne-type-toggle" role="group" aria-label="Référentiel de la ligne">
                <button type="button" className={typeLigne === 'M' ? 'is-active' : ''} onClick={() => changeType('M')}>M — Monétaire</button>
                <button type="button" className={typeLigne === 'E' ? 'is-active' : ''} onClick={() => changeType('E')}>E — EHS</button>
              </div>
              {typeLigne === 'M' ? (
                <div className="form-grid three">
                  <label className="field"><span>Ligne budgétaire <em>*</em></span>
                    <select value={ligneId ?? ''} onChange={(event) => setLigneId(event.target.value === '' ? null : Number(event.target.value))}>
                      <option value="">{availableLignes.length === 0 ? 'Aucune ligne disponible' : 'Sélectionner une ligne'}</option>
                      {availableLignes.map((l) => <option key={l.id} value={l.id}>{l.code} — {l.nom} ({l.equipe_code})</option>)}
                    </select>
                  </label>
                  <label className="field"><span>{`Montant à consommer (${currencySuffix()}) `}<em>*</em></span><input type="number" min={0} value={montant} onChange={(event) => setMontant(event.target.value)} /></label>
                </div>
              ) : (
                <div className="form-grid three">
                  <label className="field"><span>Élément du catalogue de tâches <em>*</em></span>
                    <select value={templateId ?? ''} onChange={(event) => setTemplateId(event.target.value === '' ? null : Number(event.target.value))}>
                      <option value="">{availableTemplates.length === 0 ? 'Aucun élément disponible' : 'Sélectionner un élément'}</option>
                      {availableTemplates.map((t) => <option key={t.id} value={t.id}>{t.code} — {t.nom} ({t.equipe_code})</option>)}
                    </select>
                  </label>
                  <label className="field"><span>{`Montant à consommer (${currencySuffix()}) `}<em>*</em></span><input type="number" min={0} value={montant} onChange={(event) => setMontant(event.target.value)} /></label>
                </div>
              )}
              <p className={`charge-hint${depasseReste ? ' charge-hint-danger' : ''}`}>
                Budget restant du projet : {formatMontant(resteProjet)}{depasseReste ? ' — ce montant le dépasse.' : '.'}
              </p>
              {typeLigne === 'M' && selectedLigne && (
                <p className={`charge-hint${depassePrevu ? ' charge-hint-danger' : ''}`}>
                  {montantPrevu !== null
                    ? `Prévu pour cette ligne dans ce projet : ${formatMontant(montantPrevu)}${depassePrevu ? ' — ce montant le dépasse.' : '.'}`
                    : 'Aucun plafond défini pour cette ligne.'}
                </p>
              )}
              {typeLigne === 'E' && selectedTemplate && montantNumber > 0 && (
                <p className="charge-hint">
                  Équivalent EHS : {ehsApercu.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} (aucun plafond pour une ligne du catalogue de tâches).
                </p>
              )}
              <div className="form-grid three">
                <DatePicker label="Date de début" className="field" value={dateDebut} onChange={setDateDebut} />
                <DatePicker label="Date de fin" className="field" value={dateFin} min={dateDebut || undefined} onChange={setDateFin} />
                <label className="field"><span>&nbsp;</span>
                  <button
                    type="button"
                    className={`align-period-btn${periodeAlignee ? ' is-active' : ''}`}
                    onClick={alignerSurProjet}
                    disabled={!projectDateDebut || !projectDateFin}
                    title={!projectDateDebut || !projectDateFin ? 'Renseignez d’abord les dates du projet à l’étape 1' : undefined}
                  >
                    ⇥ Aligner sur la période du projet
                  </button>
                </label>
              </div>
              <div className="charges-actions">
                <button type="button" className="secondary-action" onClick={() => setShowForm(false)}>Annuler</button>
                <button type="submit" className="add-charge" disabled={!canSave || saving}>{saving ? 'Ajout…' : '＋ Attribuer la ligne'}</button>
              </div>
            </form>
          ) : (
            <>
              <button type="button" className="add-charge" onClick={() => setShowForm(true)} disabled={availableLignes.length === 0 && availableTemplates.length === 0}>
                ＋ &nbsp; Ajouter une ligne à l’équipe
              </button>
              {availableLignes.length === 0 && availableTemplates.length === 0 && (
                <p className="charge-hint">
                  {hasCatalogueLignes
                    ? 'Toutes les lignes de cette équipe sont déjà attribuées à ce projet.'
                    : 'Aucune ligne n’est encore attribuée à cette équipe dans l’Architecture monétaire ou l’Architecture des tâches.'}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </article>
  )
}
