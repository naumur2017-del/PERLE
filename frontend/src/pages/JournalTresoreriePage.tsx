import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ArrowDownToLine, ArrowLeftRight, ArrowUpRight, FileText, ListChecks, MoreVertical, RotateCcw,
  X,
} from 'lucide-react'
import { ColumnsMenu, useColumnVisibility, type ColumnDef } from '../components/ColumnsMenu'
import ExportButtons from '../components/ExportButtons'
import PeriodeSelector from '../components/PeriodeSelector'
import { currencySuffix } from '../utils/currency'
import KpiVisibilityToggle from '../components/KpiVisibilityToggle'
import { useKpiVisibility } from '../hooks/useKpiVisibility'
import { fetchMouvements, tresorerieError, type MouvementTresorerie } from '../api/tresorerie'
import { isoLocal, isoVersFr, periodeDepuisEtat, periodeEtatInitial, type PeriodeEtat } from '../utils/periodes'
import type { TableauExport } from '../utils/exportTableau'
import './JournalTresoreriePage.css'

type TypeOperation = 'Entrée' | 'Sortie' | 'Transfert'

interface OperationJournal {
  id: number
  reference: string
  date: string
  dateIso: string
  heure: string
  codeProjet: string
  libelle: string
  type: TypeOperation
  compte: string
  initiateur: string
  ordonnateur: string
  beneficiaire: string
  beneficiaireType: string
  montant: number
  justificatif: string | null
  executeur: string
}

const fmtMontant = (value: number) => value.toLocaleString('fr-FR')
const typeTone = (type: TypeOperation) => type === 'Entrée' ? 'green' : type === 'Sortie' ? 'red' : 'neutral'

// Chaque mouvement de « Comptes et opérations » (approvisionnement ou paiement exécuté) est une ligne du journal.
// Pour une entrée, le bénéficiaire est la structure elle-même ; pour une sortie, le fournisseur payé.
const toOperation = (mouvement: MouvementTresorerie): OperationJournal => {
  const date = new Date(mouvement.created_at)
  const isEntree = mouvement.type_mouvement === 'Entrée'
  return {
    id: mouvement.id,
    reference: mouvement.reference,
    date: date.toLocaleDateString('fr-FR'),
    dateIso: isoLocal(date),
    heure: date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    codeProjet: mouvement.projet_code || '—',
    libelle: mouvement.libelle,
    type: mouvement.type_mouvement,
    compte: mouvement.compte_nom,
    initiateur: mouvement.initiateur_nom || '—',
    ordonnateur: mouvement.initiateur_nom || '—',
    beneficiaire: mouvement.beneficiaire || '—',
    beneficiaireType: isEntree ? 'Structure' : 'Fournisseur',
    montant: mouvement.montant,
    justificatif: mouvement.justificatif_nom || null,
    executeur: mouvement.executeur_nom || '—',
  }
}

type JournalColumnId =
  | 'date' | 'reference' | 'codeProjet' | 'libelle' | 'type'
  | 'ordonnateur' | 'beneficiaire' | 'montant' | 'justificatif' | 'executeur'

const JOURNAL_COLUMNS: ColumnDef<JournalColumnId>[] = [
  { id: 'date', label: 'Date' },
  { id: 'reference', label: 'Référence' },
  { id: 'codeProjet', label: 'Code projet' },
  { id: 'libelle', label: "Libellé de l'opération" },
  { id: 'type', label: "Type d'opération" },
  { id: 'ordonnateur', label: 'Ordonnateur' },
  { id: 'beneficiaire', label: 'Bénéficiaire' },
  { id: 'montant', label: `Montant (${currencySuffix()})` },
  { id: 'justificatif', label: 'Justificatif' },
  { id: 'executeur', label: 'Exécuteur' },
]

// Colonnes du fichier exporté et imprimé : fixes, identiques à l'écran.
const COLONNES_EXPORT = ['Date', 'Heure', 'Référence', 'Code projet', 'Libellé', 'Type', 'Compte',
  'Ordonnateur', 'Bénéficiaire', 'Montant', 'Justificatif', 'Exécuteur']

const JOURNAL_CELL_DEFS: Record<JournalColumnId, { className?: string; render: (op: OperationJournal) => ReactNode }> = {
  date: { render: (op) => <><strong>{op.date}</strong><small className="jt-sub">{op.heure}</small></> },
  reference: { className: 'jt-code', render: (op) => op.reference },
  codeProjet: { render: (op) => op.codeProjet },
  libelle: { className: 'jt-name', render: (op) => op.libelle },
  type: { render: (op) => <span className={`jt-type jt-type-${typeTone(op.type)}`}>{op.type}</span> },
  ordonnateur: { render: (op) => op.ordonnateur },
  beneficiaire: { render: (op) => <><strong>{op.beneficiaire}</strong><small className="jt-sub">({op.beneficiaireType})</small></> },
  montant: { className: 'jt-montant-cell', render: (op) => <span className={`jt-montant jt-montant-${typeTone(op.type)}`}>{fmtMontant(op.montant)}</span> },
  justificatif: {
    render: (op) => op.justificatif
      ? <a className="jt-just-link" href="#" onClick={(e) => e.preventDefault()}><FileText size={13} />{op.justificatif}</a>
      : <span className="jt-empty">—</span>,
  },
  executeur: { render: (op) => op.executeur },
}

function OperationDetailModal({ operation, onClose }: { operation: OperationJournal; onClose: () => void }) {
  return (
    <div className="jt-modal-backdrop" onClick={onClose}>
      <div className="jt-modal" onClick={(event) => event.stopPropagation()}>
        <div className="jt-modal-head">
          <div>
            <h3>Détail de l'opération</h3>
            <span className="jt-modal-ref">{operation.reference}</span>
          </div>
          <button type="button" className="jt-modal-close" onClick={onClose} aria-label="Fermer"><X size={16} /></button>
        </div>

        <div className={`jt-modal-montant jt-modal-montant-${typeTone(operation.type)}`}>
          <span>{fmtMontant(operation.montant)} {currencySuffix()}</span>
          <small>{operation.type}</small>
        </div>

        <dl className="jt-modal-grid">
          <div><dt>Date</dt><dd>{operation.date} · {operation.heure}</dd></div>
          <div><dt>Code projet</dt><dd>{operation.codeProjet}</dd></div>
          <div className="jt-modal-full"><dt>Libellé</dt><dd>{operation.libelle}</dd></div>
          <div><dt>Compte</dt><dd>{operation.compte}</dd></div>
          <div><dt>Initiateur</dt><dd>{operation.initiateur}</dd></div>
          <div><dt>Ordonnateur</dt><dd>{operation.ordonnateur}</dd></div>
          <div><dt>Bénéficiaire</dt><dd>{operation.beneficiaire}<small>{operation.beneficiaireType}</small></dd></div>
          <div><dt>Justificatif</dt><dd>{operation.justificatif ?? '—'}</dd></div>
          <div><dt>Exécuteur</dt><dd>{operation.executeur}</dd></div>
        </dl>
      </div>
    </div>
  )
}

export default function JournalTresoreriePage({ navigateTo }: { navigateTo: (page: string) => void }) {
  const [operations, setOperations] = useState<OperationJournal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [periodeEtat, setPeriodeEtat] = useState<PeriodeEtat>(() => periodeEtatInitial())
  const [filterCompte, setFilterCompte] = useState('Tous')
  const [filterType, setFilterType] = useState('Toutes')
  const [filterInitiateur, setFilterInitiateur] = useState('Tous')
  const [filterBeneficiaire, setFilterBeneficiaire] = useState('Tous')
  const [filterOrdonnateur, setFilterOrdonnateur] = useState('Tous')
  const [reference, setReference] = useState('')
  const [libelleQuery, setLibelleQuery] = useState('')
  const [selected, setSelected] = useState<OperationJournal | null>(null)
  const { hiddenColumns, toggleColumn, visibleColumns } = useColumnVisibility(JOURNAL_COLUMNS)
  const { visible: showKpis, toggle: toggleKpis } = useKpiVisibility('jt-kpis-hidden')

  useEffect(() => {
    let active = true
    fetchMouvements().then((mouvements) => {
      if (active) setOperations(mouvements.map(toOperation))
    }).catch((err: unknown) => { if (active) setError(tresorerieError(err)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const periode = useMemo(() => periodeDepuisEtat(periodeEtat), [periodeEtat])

  const comptes = useMemo(() => Array.from(new Set(operations.map((op) => op.compte))), [operations])
  const initiateurs = useMemo(() => Array.from(new Set(operations.map((op) => op.initiateur))), [operations])
  const beneficiaires = useMemo(() => Array.from(new Set(operations.map((op) => op.beneficiaire))), [operations])
  const ordonnateurs = useMemo(() => Array.from(new Set(operations.map((op) => op.ordonnateur))), [operations])

  // Période d'abord : tableau, KPI et export portent sur les mêmes lignes.
  const filtered = useMemo(() => operations.filter((op) => (
    op.dateIso >= periode.debut && op.dateIso <= periode.fin
    && (filterCompte === 'Tous' || op.compte === filterCompte)
    && (filterType === 'Toutes' || op.type === filterType)
    && (filterInitiateur === 'Tous' || op.initiateur === filterInitiateur)
    && (filterBeneficiaire === 'Tous' || op.beneficiaire === filterBeneficiaire)
    && (filterOrdonnateur === 'Tous' || op.ordonnateur === filterOrdonnateur)
    && (reference.trim() === '' || op.reference.toLowerCase().includes(reference.trim().toLowerCase()))
    && (libelleQuery.trim() === '' || op.libelle.toLowerCase().includes(libelleQuery.trim().toLowerCase()))
  )), [operations, periode, filterCompte, filterType, filterInitiateur, filterBeneficiaire, filterOrdonnateur, reference, libelleQuery])

  const sommeType = (type: TypeOperation) => filtered.filter((op) => op.type === type).reduce((sum, op) => sum + op.montant, 0)
  const kpis = [
    { icon: ArrowDownToLine, tone: 'blue', label: 'Total entrées', value: `${fmtMontant(sommeType('Entrée'))} ${currencySuffix()}` },
    { icon: ArrowUpRight, tone: 'red', label: 'Total sorties', value: `${fmtMontant(sommeType('Sortie'))} ${currencySuffix()}` },
    { icon: ArrowLeftRight, tone: 'green', label: 'Total transferts', value: `${fmtMontant(sommeType('Transfert'))} ${currencySuffix()}` },
    { icon: ListChecks, tone: 'purple', label: "Nombre d'opérations", value: String(filtered.length) },
  ]

  const tableau: TableauExport = {
    nom: `journal-tresorerie_${periode.debut}_${periode.fin}`,
    titre: 'Journal de la trésorerie',
    periode: `${periode.libelle} — du ${isoVersFr(periode.debut)} au ${isoVersFr(periode.fin)}`,
    kpis: kpis.map((kpi) => [kpi.label, kpi.value]),
    colonnes: COLONNES_EXPORT,
    lignes: filtered.map((op) => [
      op.date, op.heure, op.reference, op.codeProjet, op.libelle, op.type, op.compte, op.ordonnateur,
      op.beneficiaire, fmtMontant(op.montant), op.justificatif ?? '—', op.executeur,
    ]),
  }

  const resetFiltres = () => {
    setFilterCompte('Tous'); setFilterType('Toutes'); setFilterInitiateur('Tous')
    setFilterBeneficiaire('Tous'); setFilterOrdonnateur('Tous')
    setReference(''); setLibelleQuery('')
  }

  return (
    <section className="jt-page">
      <div className="jt-title-row">
        <div>
          <h1>Journal de la trésorerie</h1>
          <p>Enregistrement chronologique de toutes les opérations de trésorerie (entrées, sorties et transferts).</p>
          <button type="button" className="jt-link-btn" onClick={() => navigateTo('tresorerie')}>Voir les ordonnances des paiements</button>
        </div>
        <div className="jt-toolbar">
          <KpiVisibilityToggle visible={showKpis} onToggle={toggleKpis} />
          <ColumnsMenu columns={JOURNAL_COLUMNS} hiddenColumns={hiddenColumns} onToggle={toggleColumn} buttonClassName="jt-btn-outline" />
          <ExportButtons tableau={tableau} disabled={loading} className="jt-btn-outline" />
        </div>
      </div>

      {error && <p role="alert" className="jt-message jt-message-error">{error}</p>}
      {loading && <p role="status" className="jt-message">Chargement du journal…</p>}

      <div className="jt-period">
        <PeriodeSelector etat={periodeEtat} onChange={setPeriodeEtat} libelle={periode.libelle} />
      </div>

      <div className="jt-filters">
        <label>Compte
          <select value={filterCompte} onChange={(e) => setFilterCompte(e.target.value)}>
            <option>Tous</option>
            {comptes.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label>Type d'opération
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option>Toutes</option>
            <option>Entrée</option><option>Sortie</option><option>Transfert</option>
          </select>
        </label>
        <label>Initiateur
          <select value={filterInitiateur} onChange={(e) => setFilterInitiateur(e.target.value)}>
            <option>Tous</option>
            {initiateurs.map((i) => <option key={i}>{i}</option>)}
          </select>
        </label>
        <label>Bénéficiaire
          <select value={filterBeneficiaire} onChange={(e) => setFilterBeneficiaire(e.target.value)}>
            <option>Tous</option>
            {beneficiaires.map((b) => <option key={b}>{b}</option>)}
          </select>
        </label>
        <label>Référence
          <input placeholder="Rechercher une référence" value={reference} onChange={(e) => setReference(e.target.value)} />
        </label>
        <label>Libellé / Mot-clé
          <input placeholder="Rechercher dans le libellé" value={libelleQuery} onChange={(e) => setLibelleQuery(e.target.value)} />
        </label>
        <label>Ordonnateur
          <select value={filterOrdonnateur} onChange={(e) => setFilterOrdonnateur(e.target.value)}>
            <option>Tous</option>
            {ordonnateurs.map((o) => <option key={o}>{o}</option>)}
          </select>
        </label>
        <div className="jt-filters-actions">
          <button type="button" className="jt-btn-outline" onClick={resetFiltres}><RotateCcw size={14} />Réinitialiser</button>
        </div>
      </div>

      {showKpis && (
      <div className="jt-kpis">
        {kpis.map((kpi) => (
          <article key={kpi.label} className={`jt-kpi jt-kpi-${kpi.tone}`}>
            <span className="jt-kpi-icon"><kpi.icon size={18} /></span>
            <div>
              <span>{kpi.label}</span>
              <strong>{kpi.value}</strong>
            </div>
          </article>
        ))}
      </div>
      )}

      <section className="jt-table-panel">
        <div className="jt-table-wrap">
          <table className="jt-table">
            <thead>
              <tr>
                {visibleColumns.map((c) => <th key={c.id}>{c.label}</th>)}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={visibleColumns.length + 1} className="jt-empty-row">{operations.length === 0 && !loading ? 'Aucune opération enregistrée pour le moment.' : 'Aucune opération sur cette période ne correspond à ces filtres.'}</td></tr>
              )}
              {filtered.map((op) => (
                <tr key={op.id}>
                  {visibleColumns.map((c) => {
                    const def = JOURNAL_CELL_DEFS[c.id]
                    return <td key={c.id} className={def.className}>{def.render(op)}</td>
                  })}
                  <td>
                    <button type="button" className="jt-row-action" aria-label="Actions" onClick={() => setSelected(op)}>
                      <MoreVertical size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="jt-table-foot">
          <span>{filtered.length} opération{filtered.length > 1 ? 's' : ''} sur la période{filtered.length !== operations.length ? ` (sur ${operations.length} au total)` : ''}</span>
        </div>
      </section>

      {selected && <OperationDetailModal operation={selected} onClose={() => setSelected(null)} />}
    </section>
  )
}
