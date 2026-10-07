import { useEffect, useState, type ReactNode } from 'react'
import {
  BadgeCheck, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronUp,
  CircleDot, Info, Pencil, Receipt, RotateCcw, Save, Search, ShieldCheck, Trash2, Wallet,
} from 'lucide-react'
import { ColumnsMenu, useColumnVisibility, type ColumnDef } from '../components/ColumnsMenu'
import { currencySuffix } from '../utils/currency'
import DatePicker from '../components/DatePicker'
import ExportButtons from '../components/ExportButtons'
import type { TableauExport } from '../utils/exportTableau'
import { fetchProjects, type Project } from '../api/projects'
import { createPaiement, updatePaiement, deletePaiement, fetchPaiements, paiementDate, paiementError, type Paiement } from '../api/paiements'
import { fetchComptes, type CompteTresorerie } from '../api/tresorerie'
import { getSession } from '../auth/session'
import { can } from '../auth/permissions'
import './TresoreriePage.css'

interface Brouillon {
  id: number
  numero: string
  dateCreation: string
  projet: string
  ligneBudgetaire: string
  compte: string
  fournisseur: string
  mercurial: string
  montant: number
  devise: string
  statut: string
  dateMaj: string
}

const TYPES_DEPENSE_OPTIONS = ['Transversal', 'Non Transversal']

const fmtMontant = (value: number) => value.toLocaleString('fr-FR')

const HISTORIQUE_PILL: Record<Paiement['statut'], string> = {
  brouillon: 'brouillon', attente: 'attente', valide: 'pret', execute: 'paye', refuse: 'refuse',
}

// Étape suivante / dernière décision, lisible par l'auteur de la demande.
function suiviPaiement(record: Paiement): string {
  if (record.statut === 'attente') return 'En attente de la validation de la Direction'
  if (record.statut === 'valide') return `Validé par ${record.valide_par_nom || 'la Direction'} le ${paiementDate(record.valide_le)} — en attente d’exécution par les Ressources`
  if (record.statut === 'refuse') return `Refusé par ${record.valide_par_nom || 'la Direction'} le ${paiementDate(record.valide_le)} — Motif : ${record.motif_refus || '—'}`
  if (record.statut === 'execute') return `Exécuté par ${record.execute_par_nom || 'les Ressources'} le ${paiementDate(record.decided_at)}${record.mode_paiement ? ` (${record.mode_paiement})` : ''}`
  return ''
}

const statutClass = (statut: string) => {
  if (statut === 'Payé' || statut.startsWith('Exécuté')) return 'paye'
  if (statut === 'Prête à payer') return 'pret'
  if (statut === 'Refusé') return 'refuse'
  if (statut === 'Correction demandée') return 'correction'
  if (statut === 'Brouillon') return 'brouillon'
  return 'attente'
}

const emptyForm = {
  typeDepense: '', projet: '', ligneBudgetaire: '', fournisseur: '', compte: '', montant: '', dateDepense: '',
  objet: '', commentaires: '', code: '', justificatif: null as File | null,
}
type FormState = typeof emptyForm

type BrouillonColumnId = 'numero' | 'dateCreation' | 'projet' | 'ligneBudgetaire' | 'compte' | 'fournisseur' | 'mercurial' | 'montant' | 'devise' | 'statut' | 'dateMaj'

const BROUILLON_COLUMNS: ColumnDef<BrouillonColumnId>[] = [
  { id: 'numero', label: 'N° demande' },
  { id: 'dateCreation', label: 'Date de création' },
  { id: 'projet', label: 'Projet' },
  { id: 'ligneBudgetaire', label: 'Ligne budgétaire' },
  { id: 'compte', label: 'Compte à débiter' },
  { id: 'fournisseur', label: 'Fournisseur / Bénéficiaire' },
  { id: 'mercurial', label: 'Mercurial' },
  { id: 'montant', label: `Montant (${currencySuffix()})` },
  { id: 'devise', label: 'Devise' },
  { id: 'statut', label: 'Statut' },
  { id: 'dateMaj', label: 'Dernière mise à jour' },
]

const BROUILLON_CELL_DEFS: Record<BrouillonColumnId, { className?: string; render: (b: Brouillon) => ReactNode }> = {
  numero: { className: 'tr-code', render: (b) => b.numero },
  dateCreation: { render: (b) => b.dateCreation },
  projet: { render: (b) => b.projet },
  ligneBudgetaire: { className: 'tr-name', render: (b) => b.ligneBudgetaire },
  compte: { render: (b) => b.compte },
  fournisseur: { render: (b) => b.fournisseur },
  mercurial: { render: (b) => b.mercurial },
  montant: { className: 'tr-montant', render: (b) => fmtMontant(b.montant) },
  devise: { render: (b) => b.devise },
  statut: { render: (b) => <span className={`tr-pill tr-pill-${statutClass(b.statut)}`}>{b.statut}</span> },
  dateMaj: { render: (b) => b.dateMaj },
}

export default function TresoreriePage({ navigateTo, prefillCode, onPrefillConsumed }: {
  navigateTo: (page: string) => void
  // Code d'une demande d'avance à reporter automatiquement dans le champ Code (voir
  // DemandesEmployesPage, clic sur une demande d'avance approuvée).
  prefillCode?: string | null
  onPrefillConsumed?: () => void
}) {
  // Les ordonnances sont établies par les Ressources ; les autres profils consultent l'historique.
  const canCreate = can(getSession(), 'tresorerie:ordonnances')
  const [innerTab, setInnerTab] = useState<'nouveau' | 'historique'>(canCreate ? 'nouveau' : 'historique')
  const [form, setForm] = useState<FormState>(emptyForm)
  const [search, setSearch] = useState('')
  const [records, setRecords] = useState<Paiement[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [comptes, setComptes] = useState<CompteTresorerie[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [projectFilter, setProjectFilter] = useState('')
  const [lineFilter, setLineFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  useEffect(() => {
    let active = true
    Promise.all([fetchPaiements(), fetchProjects(), fetchComptes()]).then(([payments, availableProjects, availableComptes]) => {
      if (active) { setRecords(payments); setProjects(availableProjects); setComptes(availableComptes) }
    }).catch((err: unknown) => { if (active) setError(paiementError(err)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!prefillCode || !canCreate) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- réagit à une demande de navigation externe (prefillCode), pas dérivé du rendu
    setInnerTab('nouveau')
    setForm((current) => ({ ...current, code: prefillCode }))
    onPrefillConsumed?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ne doit réagir qu'à prefillCode
  }, [prefillCode])

  // Une demande de paiement ne se rattache qu'à une ligne monétaire (DemandePaiement.ligne_budgetaire,
  // FK vers LigneBudgetaire) : les lignes EHS ('E', catalogue de tâches) d'un projet n'ont pas leur place ici.
  const lignes = (projects.find((project) => String(project.id) === form.projet)?.lignes ?? []).filter((ligne) => ligne.type_ligne === 'M')
  const drafts: Brouillon[] = records.filter((record) => record.statut === 'brouillon')
    .filter((record) => (!projectFilter || String(record.projet) === projectFilter)
      && (!lineFilter || String(record.ligne_budgetaire) === lineFilter)
      && (!dateFrom || record.created_at.slice(0, 10) >= dateFrom)
      && (!dateTo || record.created_at.slice(0, 10) <= dateTo))
    .map((record) => ({
      id: record.id, numero: record.numero, dateCreation: paiementDate(record.created_at),
      projet: record.projet_nom || '—', ligneBudgetaire: record.ligne_budgetaire_nom || '—',
      compte: record.compte_nom || '—', fournisseur: record.fournisseur || '—', mercurial: '—', montant: record.montant,
      devise: record.devise, statut: record.statut_libelle, dateMaj: paiementDate(record.updated_at),
    }))
  // Historique : l'auteur suit l'évolution de sa demande (soumise → validée/refusée → exécutée).
  const historique = records.filter((record) => record.statut !== 'brouillon').map((record) => ({
    reference: record.numero, projet: record.projet_nom, libelle: record.objet, montant: record.montant,
    initiePar: record.initie_par, date: paiementDate(record.created_at), statut: record.statut_libelle,
    pill: HISTORIQUE_PILL[record.statut], suivi: suiviPaiement(record),
  }))
  const { hiddenColumns, toggleColumn, visibleColumns } = useColumnVisibility(BROUILLON_COLUMNS)
  const [draftSectionOpen, setDraftSectionOpen] = useState(true)

  const updateField = (field: keyof FormState, value: string) => setForm((current) => ({
    ...current,
    [field]: value,
    ...(field === 'projet' ? { ligneBudgetaire: '' } : {}),
    // Une dépense transversale n'est rattachée à aucun projet ni ligne budgétaire précis (même
    // logique qu'une tâche transversale ailleurs dans l'application) — on efface tout de suite
    // une sélection déjà faite plutôt que de la laisser incohérente avec le nouveau type choisi.
    ...(field === 'typeDepense' && value === 'Transversal' ? { projet: '', ligneBudgetaire: '' } : {}),
  }))
  const updateFile = (file: File | null) => setForm((current) => ({ ...current, justificatif: file }))
  const isTransversal = form.typeDepense === 'Transversal'
  const resetForm = () => { setForm(emptyForm); setEditingId(null) }

  const save = async (statut: 'brouillon' | 'attente') => {
    if (busy || loading) return
    setError(''); setMessage(''); setBusy(true)
    try {
      const data = {
        projet: form.projet ? Number(form.projet) : null,
        ligne_budgetaire: form.ligneBudgetaire ? Number(form.ligneBudgetaire) : null,
        fournisseur: form.fournisseur.trim(), type_depense: form.typeDepense,
        montant: Number(form.montant) || 0, date_depense: form.dateDepense || null,
        objet: form.objet.trim(), commentaires: form.commentaires, statut,
        compte: form.compte ? Number(form.compte) : null,
        reference_demande: form.code.trim(), justificatif: form.justificatif,
      }
      const saved = editingId === null ? await createPaiement(data) : await updatePaiement(editingId, data)
      setRecords((current) => [saved, ...current.filter((record) => record.id !== saved.id)])
      resetForm()
      setMessage(statut === 'brouillon' ? 'Brouillon enregistré.' : 'Demande soumise : elle est transmise à la Direction pour validation. Suivez son évolution dans l’Historique.')
    } catch (err) { setError(paiementError(err)) }
    finally { setBusy(false) }
  }
  const editDraft = (id: number) => {
    const record = records.find((item) => item.id === id)
    if (!record) return
    setEditingId(id)
    setForm({ projet: record.projet ? String(record.projet) : '', ligneBudgetaire: record.ligne_budgetaire ? String(record.ligne_budgetaire) : '',
      compte: record.compte ? String(record.compte) : '',
      fournisseur: record.fournisseur, typeDepense: record.type_depense, montant: String(record.montant),
      dateDepense: record.date_depense ?? '', objet: record.objet, commentaires: record.commentaires,
      code: record.reference_demande, justificatif: null })
    setMessage(''); setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const removeDraft = async (id: number) => {
    if (busy) return
    setBusy(true); setError(''); setMessage('')
    try {
      await deletePaiement(id)
      setRecords((current) => current.filter((record) => record.id !== id))
      if (editingId === id) resetForm()
      setMessage('Brouillon supprimé.')
    } catch (err) { setError(paiementError(err)) }
    finally { setBusy(false) }
  }

  const filteredBrouillons = drafts.filter((brouillon) => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return brouillon.numero.toLowerCase().includes(q)
      || brouillon.projet.toLowerCase().includes(q)
      || brouillon.fournisseur.toLowerCase().includes(q)
      || brouillon.ligneBudgetaire.toLowerCase().includes(q)
  })

  const tableauBrouillons = (): TableauExport => ({
    nom: 'brouillons-paiements',
    titre: 'Brouillons de demandes de paiement',
    colonnes: ['N° demande', 'Date de création', 'Projet', 'Ligne budgétaire', 'Compte à débiter', 'Fournisseur / Bénéficiaire', 'Montant', 'Devise', 'Statut', 'Dernière mise à jour'],
    lignes: filteredBrouillons.map((b) => [
      b.numero, b.dateCreation, b.projet, b.ligneBudgetaire, b.compte, b.fournisseur, fmtMontant(b.montant), b.devise, b.statut, b.dateMaj,
    ]),
  })

  return (
    <section className="tr-page">
      {loading && <p role="status">Chargement des demandes…</p>}
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <nav className="tr-subtabs">
        <button className="active" onClick={() => navigateTo('tresorerie')}><Receipt size={14} />Ordonnances des paiements</button>
        <button onClick={() => navigateTo('tresorerie-validation')}><ShieldCheck size={14} />Validation des paiements</button>
        <button onClick={() => navigateTo('tresorerie-paiements')}><BadgeCheck size={14} />Exécutions des paiements</button>
        <button onClick={() => navigateTo('tresorerie-comptes')}><Wallet size={14} />Comptes et opérations</button>
        <button onClick={() => navigateTo('tresorerie-rapports')}><CircleDot size={14} />Journal de la trésorerie</button>
      </nav>

      <nav className="tr-request-tabs">
        {canCreate && <button className={innerTab === 'nouveau' ? 'active' : ''} onClick={() => setInnerTab('nouveau')}>Nouvelle demande</button>}
        <button className={innerTab === 'historique' ? 'active' : ''} onClick={() => setInnerTab('historique')}>Historique</button>
      </nav>

      {canCreate && innerTab === 'nouveau' && (
        <>
          <div className="tr-request-card">
            <div className="tr-request-heading">
              <h2>{editingId ? 'Modifier le brouillon' : 'Nouvelle demande de paiement'}</h2>
              <p>Remplissez les informations ci-dessous pour soumettre une demande de paiement.</p>
            </div>

            <div className="tr-request-grid four">
              <label>Type de dépense <em>*</em>
                <select value={form.typeDepense} onChange={(event) => updateField('typeDepense', event.target.value)}>
                  <option value="">Sélectionner un type de dépense</option>
                  {TYPES_DEPENSE_OPTIONS.map((type) => <option key={type}>{type}</option>)}
                </select>
              </label>
              <label>Projet {!isTransversal && <em>*</em>}
                <select value={form.projet} disabled={isTransversal} onChange={(event) => updateField('projet', event.target.value)}>
                  <option value="">{isTransversal ? 'Non applicable (dépense transversale)' : 'Sélectionner un projet'}</option>
                  {projects.map((projet) => <option key={projet.id} value={projet.id}>{projet.nom}</option>)}
                </select>
              </label>
              <label>Ligne budgétaire {!isTransversal && <em>*</em>}
                <select value={form.ligneBudgetaire} disabled={isTransversal} onChange={(event) => updateField('ligneBudgetaire', event.target.value)}>
                  <option value="">{isTransversal ? 'Non applicable (dépense transversale)' : 'Sélectionner une ligne budgétaire'}</option>
                  {lignes.map((ligne) => <option key={ligne.id} value={ligne.ligne_budgetaire as number}>{ligne.ligne_budgetaire_code} — {ligne.ligne_budgetaire_nom}</option>)}
                </select>
              </label>
              <label>Fournisseur / Bénéficiaire <em>*</em>
                <input value={form.fournisseur} maxLength={255} onChange={(event) => updateField('fournisseur', event.target.value)} placeholder="Nom du fournisseur ou bénéficiaire" />
              </label>
            </div>
            {isTransversal && (
              <p className="tr-hint">Une dépense transversale n'est rattachée à aucun projet ni ligne budgétaire en particulier.</p>
            )}

            <div className="tr-request-grid four">
              <label>{`Montant demandé (${currencySuffix()}) `}<em>*</em>
                <input type="number" min="0" value={form.montant} onChange={(event) => updateField('montant', event.target.value)} placeholder="0" />
              </label>
              <label>Devise
                <input value={currencySuffix()} readOnly />
              </label>
              <label>Compte à débiter <em>*</em>
                <select value={form.compte} onChange={(event) => updateField('compte', event.target.value)}>
                  <option value="">Sélectionner un compte</option>
                  {comptes.map((compte) => <option key={compte.id} value={compte.id}>{compte.nom} ({compte.code}) — solde {fmtMontant(compte.solde_actuel)}</option>)}
                </select>
              </label>
              <DatePicker label={<>Date de la dépense <em>*</em></>} value={form.dateDepense} onChange={(v) => updateField('dateDepense', v)} />
            </div>
            {comptes.length === 0 && !loading && (
              <p className="tr-hint">Aucun compte de trésorerie n'existe encore : créez-le dans Comptes et opérations avant de soumettre une demande.</p>
            )}

            <div className="tr-request-grid two">
              <label>Code
                <input
                  value={form.code} maxLength={30} placeholder="Ex. AV-2026-001"
                  onChange={(event) => updateField('code', event.target.value)}
                />
              </label>
              <label>Justificatif (image ou PDF)
                <input
                  type="file" accept="image/*,.pdf"
                  onChange={(event) => updateFile(event.target.files?.[0] ?? null)}
                />
                {form.justificatif && <small className="tr-file-name">{form.justificatif.name}</small>}
              </label>
            </div>
            <p className="tr-hint">
              Le code se remplit automatiquement lorsque cette demande provient d'une avance sur salaire approuvée
              (voir Gestion des équipes › Demandes des employés).
            </p>

            <div className="tr-request-grid two">
              <label>Objet / Description de la demande <em>*</em>
                <textarea rows={4} value={form.objet} onChange={(event) => updateField('objet', event.target.value)} placeholder="Décrivez l'objet de la demande et toute information utile..." />
              </label>
              <label className="tr-textarea-counted">Commentaires (optionnel)
                <textarea rows={4} maxLength={500} value={form.commentaires} onChange={(event) => updateField('commentaires', event.target.value)} placeholder="Commentaires supplémentaires..." />
                <span className="tr-char-count">{form.commentaires.length}/500</span>
              </label>
            </div>

            <div className="tr-request-actions">
              <button type="button" className="tr-reset" disabled={busy} onClick={resetForm}><RotateCcw size={14} />Réinitialiser</button>
              <button type="button" className="tr-reset" disabled={busy || loading} onClick={() => void save('brouillon')}><Save size={14} />Enregistrer le brouillon</button>
              <button type="button" className="tr-btn-primary" disabled={busy || loading} onClick={() => void save('attente')}>Soumettre la demande</button>
            </div>
          </div>

          <div className="tr-draft-panel">
            <div className="tr-draft-head">
              <div className="tr-draft-head-title">
                <h3>Brouillon (demandes non soumises)</h3>
                <Info size={13} />
              </div>
              <button
                type="button"
                className="tr-draft-toggle"
                onClick={() => setDraftSectionOpen((open) => !open)}
                aria-expanded={draftSectionOpen}
                aria-label={draftSectionOpen ? 'Masquer les brouillons' : 'Afficher les brouillons'}
              >
                {draftSectionOpen ? <><ChevronUp size={14} />Masquer</> : <><ChevronDown size={14} />Afficher</>}
              </button>
            </div>

            {draftSectionOpen && (
              <>
                <div className="tr-filters">
                  <DatePicker label="Depuis le" value={dateFrom} onChange={setDateFrom} />
                  <DatePicker label="Jusqu'au" value={dateTo} min={dateFrom || undefined} onChange={setDateTo} />
                  <label>Projet
                    <select value={projectFilter} onChange={(event) => { setProjectFilter(event.target.value); setLineFilter('') }}><option value="">Tous les projets</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.nom}</option>)}</select>
                  </label>
                  <label>Ligne budgétaire
                    <select value={lineFilter} onChange={(event) => setLineFilter(event.target.value)}><option value="">Toutes les lignes</option>{[...new Map(projects.filter((project) => !projectFilter || String(project.id) === projectFilter).flatMap((project) => project.lignes).filter((line) => line.type_ligne === 'M').map((line) => [line.ligne_budgetaire, line])).values()].map((line) => <option key={line.ligne_budgetaire} value={line.ligne_budgetaire as number}>{line.ligne_budgetaire_nom}</option>)}</select>
                  </label>
                  <label className="tr-search">
                    <Search size={14} />
                    <input placeholder="Rechercher une demande..." value={search} onChange={(event) => setSearch(event.target.value)} />
                  </label>
                  <ColumnsMenu columns={BROUILLON_COLUMNS} hiddenColumns={hiddenColumns} onToggle={toggleColumn} buttonClassName="tr-reset" />
                  <ExportButtons tableau={tableauBrouillons()} disabled={filteredBrouillons.length === 0} className="tr-btn-primary" />
                </div>

                <div className="tr-table-panel">
                  <div className="tr-table-wrap">
                    <table className="tr-table">
                      <thead>
                        <tr>
                          {visibleColumns.map((c) => <th key={c.id}>{c.label}</th>)}
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBrouillons.map((brouillon) => (
                          <tr key={brouillon.numero}>
                            {visibleColumns.map((c) => {
                              const def = BROUILLON_CELL_DEFS[c.id]
                              return <td key={c.id} className={def.className}>{def.render(brouillon)}</td>
                            })}
                            <td>
                              <div className="tr-draft-actions">
                                <button type="button" className="tr-row-action" aria-label="Modifier" disabled={busy} onClick={() => editDraft(brouillon.id)}><Pencil size={13} /></button>
                                <button type="button" className="tr-row-action danger" aria-label="Supprimer" disabled={busy} onClick={() => void removeDraft(brouillon.id)}><Trash2 size={13} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredBrouillons.length === 0 && (
                          <tr><td colSpan={visibleColumns.length + 1} className="tr-empty">Aucun brouillon ne correspond à cette recherche.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="tr-table-foot">
                    <span>Affichage de {filteredBrouillons.length === 0 ? 0 : 1} à {filteredBrouillons.length} sur {filteredBrouillons.length} brouillons</span>
                    <nav className="tr-pagination" aria-label="Pagination">
                      <button type="button" disabled><ChevronsLeft size={14} /></button>
                      <button type="button" disabled><ChevronLeft size={14} /></button>
                      <button type="button" className="is-active">1</button>
                      <button type="button" disabled><ChevronRight size={14} /></button>
                      <button type="button" disabled><ChevronsRight size={14} /></button>
                    </nav>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {innerTab === 'historique' && (
        <div className="tr-table-panel">
          <div className="tr-table-wrap">
            <table className="tr-table">
              <thead>
                <tr><th>Référence</th><th>Projet</th><th>Libellé</th><th>{`Montant (${currencySuffix()})`}</th><th>Initié par</th><th>Date</th><th>Statut</th><th>Suivi</th></tr>
              </thead>
              <tbody>
                {historique.length === 0 && <tr><td colSpan={8} className="tr-empty">{loading ? 'Chargement…' : 'Aucune demande soumise.'}</td></tr>}
                {historique.map((entry) => (
                  <tr key={entry.reference}>
                    <td className="tr-code">{entry.reference}</td>
                    <td>{entry.projet}</td>
                    <td className="tr-name">{entry.libelle}</td>
                    <td className="tr-montant">{fmtMontant(entry.montant)}</td>
                    <td>{entry.initiePar}</td>
                    <td>{entry.date}</td>
                    <td><span className={`tr-pill tr-pill-${entry.pill}`}>{entry.statut}</span></td>
                    <td className="tr-suivi">{entry.suivi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}
