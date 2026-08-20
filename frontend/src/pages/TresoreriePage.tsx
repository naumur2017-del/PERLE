import { useState, type ReactNode } from 'react'
import {
  BadgeCheck, Calendar, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronUp,
  CircleDot, Download, Info, Pencil, Receipt, RotateCcw, Save, Search, Trash2, Wallet,
} from 'lucide-react'
import { ColumnsMenu, useColumnVisibility, type ColumnDef } from '../components/ColumnsMenu'
import './TresoreriePage.css'

interface Brouillon {
  numero: string
  dateCreation: string
  projet: string
  ligneBudgetaire: string
  fournisseur: string
  mercurial: string
  montant: number
  devise: string
  statut: string
  dateMaj: string
}

const BROUILLONS: Brouillon[] = [
  { numero: 'DP-2025-096', dateCreation: '11/06/2025', projet: 'Digitalisation AN', ligneBudgetaire: 'LBG-05 – Développement logiciel', fournisseur: 'NAUMUR SARL', mercurial: 'MER-2025-00156', montant: 2350000, devise: 'FCFA', statut: 'Brouillon', dateMaj: '11/06/2025' },
  { numero: 'DP-2025-095', dateCreation: '10/06/2025', projet: 'PADESCE', ligneBudgetaire: 'LBG-12 – Frais de mission', fournisseur: 'Hôtel Mont Fébé', mercurial: 'MER-2025-00155', montant: 485000, devise: 'FCFA', statut: 'Brouillon', dateMaj: '10/06/2025' },
  { numero: 'DP-2025-094', dateCreation: '09/06/2025', projet: 'Caravel', ligneBudgetaire: 'LBG-08 – Communication', fournisseur: 'Orange Cameroun', mercurial: 'MER-2025-00154', montant: 150000, devise: 'FCFA', statut: 'Brouillon', dateMaj: '09/06/2025' },
  { numero: 'DP-2025-093', dateCreation: '09/06/2025', projet: 'PERLE', ligneBudgetaire: 'LBG-01 – Frais généraux', fournisseur: 'TOTAL Energies', mercurial: 'MER-2025-00153', montant: 320000, devise: 'FCFA', statut: 'Brouillon', dateMaj: '09/06/2025' },
  { numero: 'DP-2025-092', dateCreation: '08/06/2025', projet: 'IPAY', ligneBudgetaire: 'LBG-09 – Matériel informatique', fournisseur: 'Africa IT Solutions', mercurial: 'MER-2025-00152', montant: 1750000, devise: 'FCFA', statut: 'Brouillon', dateMaj: '08/06/2025' },
]

interface HistoriqueEntry {
  reference: string
  projet: string
  libelle: string
  montant: number
  initiePar: string
  date: string
  statut: string
}

const HISTORIQUE: HistoriqueEntry[] = [
  { reference: 'PAY-2025-0178', projet: 'TRESORERIE', libelle: 'Remboursement avance salariale', montant: 200000, initiePar: 'Théodore B.', date: '23/05/2025', statut: 'Payé' },
  { reference: 'PAY-2025-0177', projet: 'PANSFI', libelle: 'Achat carburant véhicule', montant: 65000, initiePar: 'Herman T.', date: '23/05/2025', statut: 'Payé' },
  { reference: 'PAY-2025-0182', projet: 'MIDER', libelle: 'Frais de déplacement mission terrain', montant: 120000, initiePar: 'Maïa P.', date: '28/05/2025', statut: 'Prête à payer' },
  { reference: 'PAY-2025-0181', projet: 'PILOTAGE', libelle: 'Consulting externe', montant: 1800000, initiePar: 'Ajara L.', date: '27/05/2025', statut: 'Refusé' },
  { reference: 'PAY-2025-0179', projet: 'BAC OFFICE', libelle: 'Impression et reliure documents', montant: 95000, initiePar: 'Julienne E.', date: '25/05/2025', statut: 'Correction demandée' },
]

const PROJETS_OPTIONS = ['Digitalisation AN', 'PADESCE', 'Caravel', 'PERLE', 'IPAY', 'PANSFI', 'MIDER', 'PILOTAGE']
const LIGNES_OPTIONS = ['LBG-01 – Frais généraux', 'LBG-05 – Développement logiciel', 'LBG-08 – Communication', 'LBG-09 – Matériel informatique', 'LBG-12 – Frais de mission']
const FOURNISSEURS_OPTIONS = ['NAUMUR SARL', 'Hôtel Mont Fébé', 'Orange Cameroun', 'TOTAL Energies', 'Africa IT Solutions']
const TYPES_DEPENSE_OPTIONS = ['Transversal', 'Non Transversal']

const fmtMontant = (value: number) => value.toLocaleString('fr-FR')

const statutClass = (statut: string) => {
  if (statut === 'Payé') return 'paye'
  if (statut === 'Prête à payer') return 'pret'
  if (statut === 'Refusé') return 'refuse'
  if (statut === 'Correction demandée') return 'correction'
  if (statut === 'Brouillon') return 'brouillon'
  return 'attente'
}

const emptyForm = { projet: '', ligneBudgetaire: '', fournisseur: '', typeDepense: '', montant: '', dateDepense: '', objet: '', commentaires: '' }
type FormState = typeof emptyForm

type BrouillonColumnId = 'numero' | 'dateCreation' | 'projet' | 'ligneBudgetaire' | 'fournisseur' | 'mercurial' | 'montant' | 'devise' | 'statut' | 'dateMaj'

const BROUILLON_COLUMNS: ColumnDef<BrouillonColumnId>[] = [
  { id: 'numero', label: 'N° demande' },
  { id: 'dateCreation', label: 'Date de création' },
  { id: 'projet', label: 'Projet' },
  { id: 'ligneBudgetaire', label: 'Ligne budgétaire' },
  { id: 'fournisseur', label: 'Fournisseur / Bénéficiaire' },
  { id: 'mercurial', label: 'Mercurial' },
  { id: 'montant', label: 'Montant (FCFA)' },
  { id: 'devise', label: 'Devise' },
  { id: 'statut', label: 'Statut' },
  { id: 'dateMaj', label: 'Dernière mise à jour' },
]

const BROUILLON_CELL_DEFS: Record<BrouillonColumnId, { className?: string; render: (b: Brouillon) => ReactNode }> = {
  numero: { className: 'tr-code', render: (b) => b.numero },
  dateCreation: { render: (b) => b.dateCreation },
  projet: { render: (b) => b.projet },
  ligneBudgetaire: { className: 'tr-name', render: (b) => b.ligneBudgetaire },
  fournisseur: { render: (b) => b.fournisseur },
  mercurial: { render: (b) => b.mercurial },
  montant: { className: 'tr-montant', render: (b) => fmtMontant(b.montant) },
  devise: { render: (b) => b.devise },
  statut: { render: (b) => <span className={`tr-pill tr-pill-${statutClass(b.statut)}`}>{b.statut}</span> },
  dateMaj: { render: (b) => b.dateMaj },
}

export default function TresoreriePage({ navigateTo }: { navigateTo: (page: string) => void }) {
  const [innerTab, setInnerTab] = useState<'nouveau' | 'historique'>('nouveau')
  const [form, setForm] = useState<FormState>(emptyForm)
  const [search, setSearch] = useState('')
  const [drafts, setDrafts] = useState<Brouillon[]>(BROUILLONS)
  const { hiddenColumns, toggleColumn, visibleColumns } = useColumnVisibility(BROUILLON_COLUMNS)
  const [draftSectionOpen, setDraftSectionOpen] = useState(true)

  const updateField = (field: keyof FormState, value: string) => setForm((current) => ({ ...current, [field]: value }))
  const resetForm = () => setForm(emptyForm)

  const submitDemande = () => {
    if (!form.projet || !form.ligneBudgetaire || !form.fournisseur || !form.typeDepense || !form.montant || !form.dateDepense || !form.objet) {
      window.alert('Veuillez renseigner tous les champs obligatoires (*).')
      return
    }
    window.alert('La demande de paiement a été soumise avec succès.')
    resetForm()
  }

  const saveDraft = () => {
    const today = new Date().toLocaleDateString('fr-FR')
    const newDraft: Brouillon = {
      numero: `DP-2025-${String(97 + drafts.length).padStart(3, '0')}`,
      dateCreation: today,
      projet: form.projet || '-',
      ligneBudgetaire: form.ligneBudgetaire || '-',
      fournisseur: form.fournisseur || '-',
      mercurial: '-',
      montant: Number(form.montant) || 0,
      devise: 'FCFA',
      statut: 'Brouillon',
      dateMaj: today,
    }
    setDrafts((current) => [newDraft, ...current])
    window.alert('La demande a été enregistrée dans le brouillon.')
    resetForm()
  }

  const filteredBrouillons = drafts.filter((brouillon) => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return brouillon.numero.toLowerCase().includes(q)
      || brouillon.projet.toLowerCase().includes(q)
      || brouillon.fournisseur.toLowerCase().includes(q)
      || brouillon.ligneBudgetaire.toLowerCase().includes(q)
  })

  return (
    <section className="tr-page">
      <nav className="tr-subtabs">
        <button className="active" onClick={() => navigateTo('tresorerie')}><Receipt size={14} />Ordonnances des paiements</button>
        <button onClick={() => navigateTo('tresorerie-paiements')}><BadgeCheck size={14} />Exécutions des paiements</button>
        <button onClick={() => navigateTo('tresorerie-comptes')}><Wallet size={14} />Comptes et opérations</button>
        <button onClick={() => navigateTo('tresorerie-rapports')}><CircleDot size={14} />Journal de la trésorerie</button>
      </nav>

      <nav className="tr-request-tabs">
        <button className={innerTab === 'nouveau' ? 'active' : ''} onClick={() => setInnerTab('nouveau')}>Nouvelle demande</button>
        <button className={innerTab === 'historique' ? 'active' : ''} onClick={() => setInnerTab('historique')}>Historique</button>
      </nav>

      {innerTab === 'nouveau' && (
        <>
          <div className="tr-request-card">
            <div className="tr-request-heading">
              <h2>Nouvelle demande de paiement</h2>
              <p>Remplissez les informations ci-dessous pour soumettre une demande de paiement.</p>
            </div>

            <div className="tr-request-grid four">
              <label>Projet <em>*</em>
                <select value={form.projet} onChange={(event) => updateField('projet', event.target.value)}>
                  <option value="">Sélectionner un projet</option>
                  {PROJETS_OPTIONS.map((projet) => <option key={projet}>{projet}</option>)}
                </select>
              </label>
              <label>Ligne budgétaire <em>*</em>
                <select value={form.ligneBudgetaire} onChange={(event) => updateField('ligneBudgetaire', event.target.value)}>
                  <option value="">Sélectionner une ligne budgétaire</option>
                  {LIGNES_OPTIONS.map((ligne) => <option key={ligne}>{ligne}</option>)}
                </select>
              </label>
              <label>Fournisseur / Bénéficiaire <em>*</em>
                <select value={form.fournisseur} onChange={(event) => updateField('fournisseur', event.target.value)}>
                  <option value="">Sélectionner un fournisseur</option>
                  {FOURNISSEURS_OPTIONS.map((fournisseur) => <option key={fournisseur}>{fournisseur}</option>)}
                </select>
              </label>
              <label>Type de dépense <em>*</em>
                <select value={form.typeDepense} onChange={(event) => updateField('typeDepense', event.target.value)}>
                  <option value="">Sélectionner un type de dépense</option>
                  {TYPES_DEPENSE_OPTIONS.map((type) => <option key={type}>{type}</option>)}
                </select>
              </label>
            </div>

            <div className="tr-request-grid three">
              <label>Montant demandé (FCFA) <em>*</em>
                <input type="number" min="0" value={form.montant} onChange={(event) => updateField('montant', event.target.value)} placeholder="0" />
              </label>
              <label>Devise
                <input value="FCFA" readOnly />
              </label>
              <label>Date de la dépense <em>*</em>
                <input type="date" value={form.dateDepense} onChange={(event) => updateField('dateDepense', event.target.value)} />
              </label>
            </div>

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
              <button type="button" className="tr-reset" onClick={resetForm}><RotateCcw size={14} />Réinitialiser</button>
              <button type="button" className="tr-reset" onClick={saveDraft}><Save size={14} />Enregistrer le brouillon</button>
              <button type="button" className="tr-btn-primary" onClick={submitDemande}>Soumettre la demande</button>
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
                  <label>Période
                    <span className="tr-daterange"><Calendar size={14} />01/05/2025 → 31/12/2025</span>
                  </label>
                  <label>Projet
                    <select defaultValue="Tous"><option>Tous les projets</option></select>
                  </label>
                  <label>Ligne budgétaire
                    <select defaultValue="Toutes"><option>Toutes les lignes</option></select>
                  </label>
                  <label className="tr-search">
                    <Search size={14} />
                    <input placeholder="Rechercher une demande..." value={search} onChange={(event) => setSearch(event.target.value)} />
                  </label>
                  <ColumnsMenu columns={BROUILLON_COLUMNS} hiddenColumns={hiddenColumns} onToggle={toggleColumn} buttonClassName="tr-reset" />
                  <button type="button" className="tr-btn-primary"><Download size={14} />Exporter</button>
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
                                <button type="button" className="tr-row-action" aria-label="Modifier"><Pencil size={13} /></button>
                                <button type="button" className="tr-row-action danger" aria-label="Supprimer"><Trash2 size={13} /></button>
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
                <tr><th>Référence</th><th>Projet</th><th>Libellé</th><th>Montant (FCFA)</th><th>Initié par</th><th>Date</th><th>Statut</th></tr>
              </thead>
              <tbody>
                {HISTORIQUE.map((entry) => (
                  <tr key={entry.reference}>
                    <td className="tr-code">{entry.reference}</td>
                    <td>{entry.projet}</td>
                    <td className="tr-name">{entry.libelle}</td>
                    <td className="tr-montant">{fmtMontant(entry.montant)}</td>
                    <td>{entry.initiePar}</td>
                    <td>{entry.date}</td>
                    <td><span className={`tr-pill tr-pill-${statutClass(entry.statut)}`}>{entry.statut}</span></td>
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
