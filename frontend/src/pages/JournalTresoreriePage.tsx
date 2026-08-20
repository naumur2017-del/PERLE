import { useMemo, useState, type ReactNode } from 'react'
import {
  ArrowDownToLine, ArrowLeftRight, ArrowUpRight, Calendar, ChevronDown, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Download, FileText, ListChecks, MoreVertical, Printer, RotateCcw,
  Search, X,
} from 'lucide-react'
import { ColumnsMenu, useColumnVisibility, type ColumnDef } from '../components/ColumnsMenu'
import './JournalTresoreriePage.css'

type TypeOperation = 'Entrée' | 'Sortie' | 'Transfert'

interface OperationJournal {
  reference: string
  date: string
  heure: string
  codeActivite: string
  codeProjet: string
  libelle: string
  type: TypeOperation
  compte: string
  initiateur: string
  ordonnateur: string
  beneficiaire: string
  beneficiaireType: string
  mercuriale: string | null
  mercurialeLibelle: string | null
  montant: number
  justificatif: string | null
  executeur: string
}

const OPERATIONS: OperationJournal[] = [
  { reference: 'OP-2025-00068', date: '30/06/2025', heure: '14:35', codeActivite: 'ACH-FOUR', codeProjet: 'PRJ-0012', libelle: 'Paiement facture fournitures de bureau', type: 'Sortie', compte: 'BICEC', initiateur: 'S. Traoré', ordonnateur: 'M. Traoré', beneficiaire: 'ETS Bureautique', beneficiaireType: 'Prestataire', mercuriale: 'FOUR-001', mercurialeLibelle: 'Fournitures de bureau', montant: 2450000, justificatif: 'fact_4587.pdf', executeur: 'S. Traoré' },
  { reference: 'OP-2025-00067', date: '30/06/2025', heure: '11:20', codeActivite: 'RH-SAL', codeProjet: 'PRJ-0005', libelle: 'Virement salaire mois de juin', type: 'Sortie', compte: 'BICEC', initiateur: 'A. Koné', ordonnateur: 'A. Koné', beneficiaire: 'Salariés', beneficiaireType: 'Employés', mercuriale: 'SAL-001', mercurialeLibelle: 'Salaires', montant: 45600000, justificatif: 'salaires_juin.pdf', executeur: 'A. Koné' },
  { reference: 'OP-2025-00066', date: '30/06/2025', heure: '09:15', codeActivite: 'VTE-SER', codeProjet: 'PRJ-0003', libelle: 'Encaissement facture client PROJET B', type: 'Entrée', compte: 'BICEC', initiateur: 'M. Diarra', ordonnateur: 'M. Diarra', beneficiaire: 'Client PROJET B', beneficiaireType: 'Client', mercuriale: 'PREST-002', mercurialeLibelle: 'Prestation de service', montant: 18750000, justificatif: 'enc_8745.pdf', executeur: 'M. Diarra' },
  { reference: 'OP-2025-00065', date: '29/06/2025', heure: '16:40', codeActivite: 'TRF-INT', codeProjet: 'PRJ-INT', libelle: 'Transfert vers caisse petite caisse', type: 'Transfert', compte: 'Caisse principale', initiateur: 'S. Traoré', ordonnateur: 'S. Traoré', beneficiaire: 'Caisse principale', beneficiaireType: 'Interne', mercuriale: null, mercurialeLibelle: null, montant: 1500000, justificatif: 'transfert_012.pdf', executeur: 'S. Traoré' },
  { reference: 'OP-2025-00064', date: '29/06/2025', heure: '10:05', codeActivite: 'DEP-CAR', codeProjet: 'PRJ-0008', libelle: 'Achat carburant véhicule mission', type: 'Sortie', compte: 'Caisse principale', initiateur: 'Y. Coulibaly', ordonnateur: 'Y. Coulibaly', beneficiaire: 'Station Total', beneficiaireType: 'Prestataire', mercuriale: 'CARB-001', mercurialeLibelle: 'Carburant', montant: 350000, justificatif: 'carburant_056.pdf', executeur: 'Y. Coulibaly' },
  { reference: 'OP-2025-00063', date: '28/06/2025', heure: '15:22', codeActivite: 'BAN-INT', codeProjet: 'PRJ-INT', libelle: 'Intérêts bancaires crédités', type: 'Entrée', compte: 'BICEC', initiateur: 'Banque', ordonnateur: 'Banque', beneficiaire: 'Banque', beneficiaireType: 'Banque', mercuriale: null, mercurialeLibelle: null, montant: 125000, justificatif: 'interets_juin.pdf', executeur: 'Banque' },
  { reference: 'OP-2025-00062', date: '27/06/2025', heure: '14:11', codeActivite: 'DEP-LOY', codeProjet: 'PRJ-0001', libelle: 'Paiement loyer bureau', type: 'Sortie', compte: 'Afriland', initiateur: 'A. Koné', ordonnateur: 'A. Koné', beneficiaire: 'Immobilière du Lac', beneficiaireType: 'Prestataire', mercuriale: 'LOY-001', mercurialeLibelle: 'Loyer bureaux', montant: 3200000, justificatif: 'loyer_juin.pdf', executeur: 'A. Koné' },
]

const TOTAL_OPERATIONS = 68
const KPIS = [
  { icon: ArrowDownToLine, tone: 'blue', label: 'Total entrées', value: '125 450 000 FCFA' },
  { icon: ArrowUpRight, tone: 'red', label: 'Total sorties', value: '87 320 000 FCFA' },
  { icon: ArrowLeftRight, tone: 'green', label: 'Total transferts', value: '18 750 000 FCFA' },
  { icon: ListChecks, tone: 'purple', label: "Nombre d'opérations", value: String(TOTAL_OPERATIONS) },
]

const fmtMontant = (value: number) => value.toLocaleString('fr-FR')
const typeTone = (type: TypeOperation) => type === 'Entrée' ? 'green' : type === 'Sortie' ? 'red' : 'neutral'

type JournalColumnId =
  | 'date' | 'reference' | 'codeActivite' | 'codeProjet' | 'libelle' | 'type'
  | 'ordonnateur' | 'beneficiaire' | 'mercuriale' | 'montant' | 'justificatif' | 'executeur'

const JOURNAL_COLUMNS: ColumnDef<JournalColumnId>[] = [
  { id: 'date', label: 'Date' },
  { id: 'reference', label: 'Référence' },
  { id: 'codeActivite', label: 'Code activité' },
  { id: 'codeProjet', label: 'Code projet' },
  { id: 'libelle', label: "Libellé de l'opération" },
  { id: 'type', label: "Type d'opération" },
  { id: 'ordonnateur', label: 'Ordonnateur' },
  { id: 'beneficiaire', label: 'Bénéficiaire' },
  { id: 'mercuriale', label: 'Mercuriale' },
  { id: 'montant', label: 'Montant (FCFA)' },
  { id: 'justificatif', label: 'Justificatif' },
  { id: 'executeur', label: 'Exécuteur' },
]

const JOURNAL_CELL_DEFS: Record<JournalColumnId, { className?: string; render: (op: OperationJournal) => ReactNode }> = {
  date: { render: (op) => <><strong>{op.date}</strong><small className="jt-sub">{op.heure}</small></> },
  reference: { className: 'jt-code', render: (op) => op.reference },
  codeActivite: { render: (op) => op.codeActivite },
  codeProjet: { render: (op) => op.codeProjet },
  libelle: { className: 'jt-name', render: (op) => op.libelle },
  type: { render: (op) => <span className={`jt-type jt-type-${typeTone(op.type)}`}>{op.type}</span> },
  ordonnateur: { render: (op) => op.ordonnateur },
  beneficiaire: { render: (op) => <><strong>{op.beneficiaire}</strong><small className="jt-sub">({op.beneficiaireType})</small></> },
  mercuriale: {
    render: (op) => op.mercuriale
      ? <><strong>{op.mercuriale}</strong><small className="jt-sub">{op.mercurialeLibelle}</small></>
      : <span className="jt-empty">—</span>,
  },
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
          <span>{fmtMontant(operation.montant)} FCFA</span>
          <small>{operation.type}</small>
        </div>

        <dl className="jt-modal-grid">
          <div><dt>Date</dt><dd>{operation.date} · {operation.heure}</dd></div>
          <div><dt>Code activité</dt><dd>{operation.codeActivite}</dd></div>
          <div><dt>Code projet</dt><dd>{operation.codeProjet}</dd></div>
          <div className="jt-modal-full"><dt>Libellé</dt><dd>{operation.libelle}</dd></div>
          <div><dt>Compte</dt><dd>{operation.compte}</dd></div>
          <div><dt>Initiateur</dt><dd>{operation.initiateur}</dd></div>
          <div><dt>Ordonnateur</dt><dd>{operation.ordonnateur}</dd></div>
          <div><dt>Bénéficiaire</dt><dd>{operation.beneficiaire}<small>{operation.beneficiaireType}</small></dd></div>
          <div><dt>Mercuriale</dt><dd>{operation.mercuriale ? `${operation.mercuriale} — ${operation.mercurialeLibelle}` : '—'}</dd></div>
          <div><dt>Justificatif</dt><dd>{operation.justificatif ?? '—'}</dd></div>
          <div><dt>Exécuteur</dt><dd>{operation.executeur}</dd></div>
        </dl>
      </div>
    </div>
  )
}

export default function JournalTresoreriePage({ navigateTo }: { navigateTo: (page: string) => void }) {
  const [filterCompte, setFilterCompte] = useState('Tous')
  const [filterType, setFilterType] = useState('Toutes')
  const [filterInitiateur, setFilterInitiateur] = useState('Tous')
  const [filterBeneficiaire, setFilterBeneficiaire] = useState('Tous')
  const [filterMercuriale, setFilterMercuriale] = useState('Toutes')
  const [filterOrdonnateur, setFilterOrdonnateur] = useState('Tous')
  const [reference, setReference] = useState('')
  const [libelleQuery, setLibelleQuery] = useState('')
  const [exportOpen, setExportOpen] = useState(false)
  const [selected, setSelected] = useState<OperationJournal | null>(null)
  const { hiddenColumns, toggleColumn, visibleColumns } = useColumnVisibility(JOURNAL_COLUMNS)

  const comptes = useMemo(() => Array.from(new Set(OPERATIONS.map((op) => op.compte))), [])
  const initiateurs = useMemo(() => Array.from(new Set(OPERATIONS.map((op) => op.initiateur))), [])
  const beneficiaires = useMemo(() => Array.from(new Set(OPERATIONS.map((op) => op.beneficiaire))), [])
  const mercuriales = useMemo(() => Array.from(new Set(OPERATIONS.map((op) => op.mercuriale).filter((m): m is string => m !== null))), [])
  const ordonnateurs = useMemo(() => Array.from(new Set(OPERATIONS.map((op) => op.ordonnateur))), [])

  const filtered = useMemo(() => OPERATIONS.filter((op) => (
    (filterCompte === 'Tous' || op.compte === filterCompte)
    && (filterType === 'Toutes' || op.type === filterType)
    && (filterInitiateur === 'Tous' || op.initiateur === filterInitiateur)
    && (filterBeneficiaire === 'Tous' || op.beneficiaire === filterBeneficiaire)
    && (filterMercuriale === 'Toutes' || op.mercuriale === filterMercuriale)
    && (filterOrdonnateur === 'Tous' || op.ordonnateur === filterOrdonnateur)
    && (reference.trim() === '' || op.reference.toLowerCase().includes(reference.trim().toLowerCase()))
    && (libelleQuery.trim() === '' || op.libelle.toLowerCase().includes(libelleQuery.trim().toLowerCase()))
  )), [filterCompte, filterType, filterInitiateur, filterBeneficiaire, filterMercuriale, filterOrdonnateur, reference, libelleQuery])

  const resetFiltres = () => {
    setFilterCompte('Tous'); setFilterType('Toutes'); setFilterInitiateur('Tous')
    setFilterBeneficiaire('Tous'); setFilterMercuriale('Toutes'); setFilterOrdonnateur('Tous')
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
          <ColumnsMenu columns={JOURNAL_COLUMNS} hiddenColumns={hiddenColumns} onToggle={toggleColumn} buttonClassName="jt-btn-outline" />
          <div className="jt-export-wrap">
            <button type="button" className="jt-btn-outline" onClick={() => setExportOpen((o) => !o)}>
              <Download size={14} />Exporter<ChevronDown size={12} />
            </button>
            {exportOpen && (
              <ul className="jt-export-menu" onMouseLeave={() => setExportOpen(false)}>
                <li><button type="button" onClick={() => setExportOpen(false)}>Exporter en PDF</button></li>
                <li><button type="button" onClick={() => setExportOpen(false)}>Exporter en Excel</button></li>
                <li><button type="button" onClick={() => setExportOpen(false)}>Exporter en CSV</button></li>
              </ul>
            )}
          </div>
          <button type="button" className="jt-btn-outline" onClick={() => window.print()}><Printer size={14} />Imprimer</button>
        </div>
      </div>

      <div className="jt-filters">
        <label>Période
          <button type="button" className="jt-daterange"><Calendar size={14} />01/06/2025 - 30/06/2025</button>
        </label>
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
        <label>Mercuriale
          <select value={filterMercuriale} onChange={(e) => setFilterMercuriale(e.target.value)}>
            <option>Toutes</option>
            {mercuriales.map((m) => <option key={m}>{m}</option>)}
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
          <button type="button" className="jt-btn-primary"><Search size={14} />Rechercher</button>
        </div>
      </div>

      <div className="jt-kpis">
        {KPIS.map((kpi) => (
          <article key={kpi.label} className={`jt-kpi jt-kpi-${kpi.tone}`}>
            <span className="jt-kpi-icon"><kpi.icon size={18} /></span>
            <div>
              <span>{kpi.label}</span>
              <strong>{kpi.value}</strong>
            </div>
          </article>
        ))}
      </div>

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
                <tr><td colSpan={visibleColumns.length + 1} className="jt-empty-row">Aucune opération ne correspond à ces filtres.</td></tr>
              )}
              {filtered.map((op) => (
                <tr key={op.reference}>
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
          <span>Affichage 1 à {Math.min(20, TOTAL_OPERATIONS)} sur {TOTAL_OPERATIONS} opérations</span>
          <div className="jt-table-foot-right">
            <nav className="jt-pagination" aria-label="Pagination">
              <button type="button" disabled><ChevronsLeft size={14} /></button>
              <button type="button" disabled><ChevronLeft size={14} /></button>
              <button type="button" className="is-active">1</button>
              <button type="button">2</button>
              <button type="button">3</button>
              <button type="button">4</button>
              <button type="button"><ChevronRight size={14} /></button>
              <button type="button"><ChevronsRight size={14} /></button>
            </nav>
            <label className="jt-page-size">
              <select defaultValue={20}><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select>
              / page
            </label>
          </div>
        </div>
      </section>

      {selected && <OperationDetailModal operation={selected} onClose={() => setSelected(null)} />}
    </section>
  )
}
