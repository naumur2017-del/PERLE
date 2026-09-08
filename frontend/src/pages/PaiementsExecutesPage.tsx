import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import {
  BadgeCheck, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  CircleDot, FileText, Info, MoreVertical, Paperclip, Receipt, Search, Upload, Wallet, X,
} from 'lucide-react'
import { ColumnsMenu, useColumnVisibility, type ColumnDef } from '../components/ColumnsMenu'
import { currencySuffix } from '../utils/currency'
import { fetchPaiements, decidePaiement, downloadJustificatif, paiementDate, paiementError, type Paiement } from '../api/paiements'
import { getSession } from '../auth/session'
import DatePicker from '../components/DatePicker'
import './PaiementsExecutesPage.css'

interface PaiementAExecuter {
  id: number
  numero: string
  echeance: string
  demandeCode: string
  projet: string
  ligneBudgetaire: string
  fournisseur: string
  mercurial: string
  montant: number
  devise: string
  modePaiement: string
  justificatifNom: string
  justificatifTaille: string
  statut: string
}

const fmtMontant = (value: number) => value.toLocaleString('fr-FR')

const statutClass = (statut: string) => {
  if (statut === 'Refusé') return 'refuse'
  if (statut.startsWith('Exécuté')) return 'execute'
  return 'attente'
}

type PaiementColumnId =
  | 'numero' | 'echeance' | 'demandeCode' | 'projet' | 'ligneBudgetaire' | 'fournisseur'
  | 'mercurial' | 'montant' | 'devise' | 'modePaiement' | 'justificatif' | 'statut'

const PAIEMENT_COLUMNS: ColumnDef<PaiementColumnId>[] = [
  { id: 'numero', label: 'N° paiement' },
  { id: 'echeance', label: 'Date d’échéance' },
  { id: 'demandeCode', label: 'Demande de paiement' },
  { id: 'projet', label: 'Projet' },
  { id: 'ligneBudgetaire', label: 'Ligne budgétaire' },
  { id: 'fournisseur', label: 'Fournisseur / Bénéficiaire' },
  { id: 'mercurial', label: 'Mercurial' },
  { id: 'montant', label: `Montant (${currencySuffix()})` },
  { id: 'devise', label: 'Devise' },
  { id: 'modePaiement', label: 'Mode de paiement' },
  { id: 'justificatif', label: 'Justificatif' },
  { id: 'statut', label: 'Statut' },
]

const PAIEMENT_CELL_DEFS: Record<PaiementColumnId, { className?: string; render: (p: PaiementAExecuter) => ReactNode }> = {
  numero: { className: 'pe-code', render: (p) => p.numero },
  echeance: { className: 'pe-echeance', render: (p) => p.echeance },
  demandeCode: { className: 'pe-code', render: (p) => p.demandeCode },
  projet: { render: (p) => p.projet },
  ligneBudgetaire: { className: 'pe-name', render: (p) => p.ligneBudgetaire },
  fournisseur: { render: (p) => p.fournisseur },
  mercurial: { render: (p) => p.mercurial },
  montant: { className: 'pe-montant', render: (p) => fmtMontant(p.montant) },
  devise: { render: (p) => p.devise },
  modePaiement: { render: (p) => p.modePaiement },
  justificatif: {
    render: (p) => (
      <span className="pe-justificatif">
        <FileText size={14} />
        <span><strong>{p.justificatifNom}</strong><small>{p.justificatifTaille}</small></span>
      </span>
    ),
  },
  statut: { render: (p) => <span className={`pe-pill pe-pill-${statutClass(p.statut)}`}>{p.statut}</span> },
}

function JustificatifModal({ paiement, onClose, onDecision, busy, error }: {
  paiement: PaiementAExecuter
  onClose: () => void
  onDecision: (decision: 'accepte' | 'refuse', commentaire: string, fichier: File | null, mode: string) => void
  busy: boolean
  error: string
}) {
  const [commentaire, setCommentaire] = useState('')
  const [mode, setMode] = useState(paiement.modePaiement === '—' ? '' : paiement.modePaiement)
  const [fichier, setFichier] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const hasJustificatif = commentaire.trim() !== '' || fichier !== null

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFichier(event.target.files?.[0] ?? null)
  }

  return (
    <div className="pe-modal-overlay" role="dialog" aria-modal="true" aria-label="Justificatif du paiement" onMouseDown={() => { if (!busy) onClose() }}>
      <div className="pe-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="pe-modal-head">
          <div>
            <h3>Justificatif</h3>
            <p>{paiement.numero} · {paiement.fournisseur} · {fmtMontant(paiement.montant)} {paiement.devise}</p>
          </div>
          <button type="button" className="pe-modal-close" disabled={busy} onClick={onClose} aria-label="Fermer"><X size={16} /></button>
        </div>

        {error && <p role="alert">{error}</p>}
        <label className="pe-modal-field">Mode de paiement
          <select value={mode} onChange={(event) => setMode(event.target.value)} disabled={busy}>
            <option value="">Sélectionner un mode de paiement</option>
            {['Virement bancaire', 'Mobile Money', 'Espèces', 'Chèque'].map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="pe-modal-field">Commentaire / description
          <textarea rows={4} value={commentaire} onChange={(event) => setCommentaire(event.target.value)} placeholder="Ajouter un commentaire justifiant l'exécution..." />
        </label>

        <div className="pe-modal-upload">
          <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx" className="pe-hidden-input" onChange={handleFileChange} />
          <button type="button" className="pe-modal-upload-btn" onClick={() => fileInputRef.current?.click()}>
            <Upload size={14} />Joindre une image ou un document
          </button>
          {fichier && <span className="pe-modal-file"><Paperclip size={12} />{fichier.name}</span>}
        </div>

        {hasJustificatif && (
          <div className="pe-modal-actions">
            <button type="button" className="pe-modal-refuse" disabled={busy} onClick={() => onDecision('refuse', commentaire, fichier, mode)}>Refuser</button>
            <button type="button" className="pe-modal-accept" disabled={busy || !mode} onClick={() => onDecision('accepte', commentaire, fichier, mode)}>Accepter</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function PaiementsExecutesPage({ navigateTo, onNotify }: { navigateTo: (page: string) => void; onNotify: (message: string) => void }) {
  const [innerTab, setInnerTab] = useState<'nouveau' | 'historique'>('nouveau')
  const [records, setRecords] = useState<Paiement[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [decisionError, setDecisionError] = useState('')
  const [filters, setFilters] = useState({ projet: '', ligneBudgetaire: '', fournisseur: '', modePaiement: '', from: '', to: '' })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const canDecide = ['admin', 'directeur'].includes(getSession()?.role ?? '')
  useEffect(() => {
    let active = true
    fetchPaiements().then((data) => { if (active) setRecords(data) })
      .catch((err: unknown) => { if (active) setError(paiementError(err)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  const paiements: PaiementAExecuter[] = records.filter((record) => record.statut === 'attente').map((record) => ({
    id: record.id, numero: record.paiement_numero, echeance: paiementDate(record.date_depense), demandeCode: record.numero,
    projet: record.projet_nom, ligneBudgetaire: record.ligne_budgetaire_nom, fournisseur: record.fournisseur,
    mercurial: '—', montant: record.montant, devise: record.devise, modePaiement: record.mode_paiement || '—',
    justificatifNom: record.justificatif_nom || '—', justificatifTaille: '', statut: record.statut_libelle,
  }))
  const historique = records.filter((record) => record.statut === 'execute' || record.statut === 'refuse').map((record) => ({
    record, reference: record.paiement_numero, projet: record.projet_nom, libelle: record.objet, beneficiaire: record.fournisseur,
    montant: record.montant, date: paiementDate(record.decided_at), statut: record.statut_libelle,
  }))
  const [search, setSearch] = useState('')
  const [activeNumero, setActiveNumero] = useState<string | null>(null)
  const { hiddenColumns, toggleColumn, visibleColumns } = useColumnVisibility(PAIEMENT_COLUMNS)

  const activePaiement = paiements.find((paiement) => paiement.numero === activeNumero) ?? null

  const filtered = paiements.filter((paiement) => {
    for (const key of ['projet', 'ligneBudgetaire', 'fournisseur', 'modePaiement'] as const) {
      if (filters[key] && paiement[key] !== filters[key]) return false
    }
    const date = records.find((record) => record.id === paiement.id)?.date_depense ?? ''
    if ((filters.from && date < filters.from) || (filters.to && date > filters.to)) return false
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return paiement.numero.toLowerCase().includes(q)
      || paiement.projet.toLowerCase().includes(q)
      || paiement.fournisseur.toLowerCase().includes(q)
      || paiement.demandeCode.toLowerCase().includes(q)
  })

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const visiblePaiements = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const updateFilter = (key: keyof typeof filters, value: string) => { setFilters((current) => ({ ...current, [key]: value })); setPage(1) }
  const handleDecision = async (decision: 'accepte' | 'refuse', commentaire: string, fichier: File | null, mode: string) => {
    if (!activePaiement || busy) return
    setBusy(true); setDecisionError('')
    try {
      const saved = await decidePaiement(activePaiement.id, decision, commentaire, fichier, mode)
      setRecords((current) => current.map((record) => record.id === saved.id ? saved : record))
      onNotify(`Paiement ${saved.paiement_numero} : ${saved.statut_libelle}.`)
      setActiveNumero(null)
    } catch (err) { setDecisionError(paiementError(err)) }
    finally { setBusy(false) }
  }
  const download = async (record: Paiement) => {
    try { await downloadJustificatif(record) }
    catch (err) { setError(paiementError(err)) }
  }

  return (
    <section className="pe-page">
      {loading && <p role="status">Chargement des paiements…</p>}
      {error && <p role="alert">{error}</p>}
      <nav className="pe-subtabs">
        <button onClick={() => navigateTo('tresorerie')}><Receipt size={14} />Ordonnances des paiements</button>
        <button className="active" onClick={() => navigateTo('tresorerie-paiements')}><BadgeCheck size={14} />Exécutions des paiements</button>
        <button onClick={() => navigateTo('tresorerie-comptes')}><Wallet size={14} />Comptes et opérations</button>
        <button onClick={() => navigateTo('tresorerie-rapports')}><CircleDot size={14} />Journal de la trésorerie</button>
      </nav>

      <nav className="pe-request-tabs">
        <button className={innerTab === 'nouveau' ? 'active' : ''} onClick={() => setInnerTab('nouveau')}>Nouvelle exécution</button>
        <button className={innerTab === 'historique' ? 'active' : ''} onClick={() => setInnerTab('historique')}>Historique</button>
      </nav>

      {innerTab === 'nouveau' && (
        <>
          <div className="pe-exec-heading">
            <h2>Nouvelle exécution (paiements à exécuter) <Info size={13} /></h2>
            <p>Liste des demandes soumises en attente d’exécution.</p>
          </div>

          <div className="pe-filters">
            <DatePicker label="Depuis le" value={filters.from} onChange={(v) => updateFilter('from', v)} />
            <DatePicker label="Jusqu'au" value={filters.to} min={filters.from || undefined} onChange={(v) => updateFilter('to', v)} />
            <label>Projet<select value={filters.projet} onChange={(event) => updateFilter('projet', event.target.value)}><option value="">Tous les projets</option>{[...new Set(paiements.map((item) => item.projet))].map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>Ligne budgétaire<select value={filters.ligneBudgetaire} onChange={(event) => updateFilter('ligneBudgetaire', event.target.value)}><option value="">Toutes les lignes</option>{[...new Set(paiements.map((item) => item.ligneBudgetaire))].map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>Fournisseur / Bénéficiaire<select value={filters.fournisseur} onChange={(event) => updateFilter('fournisseur', event.target.value)}><option value="">Tous les fournisseurs</option>{[...new Set(paiements.map((item) => item.fournisseur))].map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>Mode de paiement<select value={filters.modePaiement} onChange={(event) => updateFilter('modePaiement', event.target.value)}><option value="">Tous les modes</option>{[...new Set(paiements.map((item) => item.modePaiement))].map((value) => <option key={value}>{value}</option>)}</select></label>
            <label className="pe-search">
              <Search size={14} />
              <input placeholder="Rechercher un paiement..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} />
            </label>
            <ColumnsMenu columns={PAIEMENT_COLUMNS} hiddenColumns={hiddenColumns} onToggle={toggleColumn} />
          </div>

          <div className="pe-table-panel">
            <div className="pe-table-wrap">
              <table className="pe-table">
                <thead>
                  <tr>
                    {visibleColumns.map((c) => <th key={c.id}>{c.label}</th>)}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePaiements.map((paiement) => (
                    <tr key={paiement.numero}>
                      {visibleColumns.map((c) => {
                        const def = PAIEMENT_CELL_DEFS[c.id]
                        return <td key={c.id} className={def.className}>{def.render(paiement)}</td>
                      })}
                      <td>
                        <button type="button" className="pe-row-action" aria-label="Décider de l’exécution" disabled={!canDecide} title={canDecide ? 'Décider de l’exécution' : 'Réservé aux administrateurs et directeurs'} onClick={() => { setDecisionError(''); setActiveNumero(paiement.numero) }}>
                          <MoreVertical size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={visibleColumns.length + 1} className="pe-empty">Aucun paiement ne correspond à cette recherche.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="pe-table-foot">
              <span>Affichage de {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} à {Math.min(currentPage * pageSize, filtered.length)} sur {filtered.length} paiements à exécuter</span>
              <div className="pe-table-foot-right">
                <label className="pe-page-size">
                  <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1) }}>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </label>
                <nav className="pe-pagination" aria-label="Pagination">
                  <button type="button" disabled={currentPage === 1} onClick={() => setPage(1)}><ChevronsLeft size={14} /></button>
                  <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={14} /></button>
                  <button type="button" className="is-active">{currentPage}</button>
                  <button type="button" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}><ChevronRight size={14} /></button>
                  <button type="button" disabled={currentPage === pageCount} onClick={() => setPage(pageCount)}><ChevronsRight size={14} /></button>
                </nav>
              </div>
            </div>
          </div>
        </>
      )}

      {innerTab === 'historique' && (
        <div className="pe-table-panel">
          <div className="pe-table-wrap">
            <table className="pe-table">
              <thead>
                <tr><th>Référence</th><th>Projet</th><th>Libellé</th><th>Bénéficiaire</th><th>{`Montant (${currencySuffix()})`}</th><th>Date</th><th>Statut</th><th>Justificatif / commentaire</th></tr>
              </thead>
              <tbody>
                {historique.length === 0 && <tr><td colSpan={8} className="pe-empty">{loading ? 'Chargement…' : 'Aucune exécution enregistrée.'}</td></tr>}
                {historique.map((entry) => (
                  <tr key={entry.reference}>
                    <td className="pe-code">{entry.reference}</td>
                    <td>{entry.projet}</td>
                    <td className="pe-name">{entry.libelle}</td>
                    <td>{entry.beneficiaire}</td>
                    <td className="pe-montant">{fmtMontant(entry.montant)}</td>
                    <td>{entry.date}</td>
                    <td><span className={`pe-pill pe-pill-${statutClass(entry.statut)}`}>{entry.statut}</span></td>
                    <td>{entry.record.commentaire_execution}{entry.record.justificatif_nom && <button type="button" onClick={() => void download(entry.record)}><FileText size={14} />{entry.record.justificatif_nom}</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activePaiement && (
        <JustificatifModal paiement={activePaiement} onClose={() => setActiveNumero(null)} onDecision={handleDecision} busy={busy} error={decisionError} />
      )}
    </section>
  )
}
