import { useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import {
  BadgeCheck, Calendar, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  CircleDot, FileText, Info, MoreVertical, Paperclip, Receipt, Search, Upload, Wallet, X,
} from 'lucide-react'
import { ColumnsMenu, useColumnVisibility, type ColumnDef } from '../components/ColumnsMenu'
import './PaiementsExecutesPage.css'

interface PaiementAExecuter {
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

const PAIEMENTS_A_EXECUTER_INITIAL: PaiementAExecuter[] = [
  { numero: 'PAY-2025-167', echeance: '15/06/2025', demandeCode: 'DP-2025-085', projet: 'PADESCE', ligneBudgetaire: 'LBG-12 – Frais de mission', fournisseur: 'Hôtel Mont Fébé', mercurial: 'MER-2025-00156', montant: 485000, devise: 'FCFA', modePaiement: 'Virement bancaire', justificatifNom: 'Facture.pdf', justificatifTaille: '245 Ko', statut: 'En attente d’exécution' },
  { numero: 'PAY-2025-166', echeance: '14/06/2025', demandeCode: 'DP-2025-096', projet: 'Digitalisation AN', ligneBudgetaire: 'LBG-05 – Développement logiciel', fournisseur: 'NAUMUR SARL', mercurial: 'MER-2025-00155', montant: 2350000, devise: 'FCFA', modePaiement: 'Virement bancaire', justificatifNom: 'Reçu.pdf', justificatifTaille: '180 Ko', statut: 'En attente d’exécution' },
  { numero: 'PAY-2025-165', echeance: '13/06/2025', demandeCode: 'DP-2025-093', projet: 'PERLE', ligneBudgetaire: 'LBG-01 – Frais généraux', fournisseur: 'TOTAL Energies', mercurial: 'MER-2025-00154', montant: 320000, devise: 'FCFA', modePaiement: 'Virement bancaire', justificatifNom: 'Facture.jpg', justificatifTaille: '320 Ko', statut: 'En attente d’exécution' },
  { numero: 'PAY-2025-164', echeance: '12/06/2025', demandeCode: 'DP-2025-098', projet: 'Caravel', ligneBudgetaire: 'LBG-08 – Communication', fournisseur: 'Orange Cameroun', mercurial: 'MER-2025-00153', montant: 150000, devise: 'FCFA', modePaiement: 'Mobile Money', justificatifNom: 'Reçu.jpg', justificatifTaille: '200 Ko', statut: 'En attente d’exécution' },
  { numero: 'PAY-2025-163', echeance: '11/06/2025', demandeCode: 'DP-2025-091', projet: 'IPAY', ligneBudgetaire: 'LBG-09 – Matériel informatique', fournisseur: 'Africa IT Solutions', mercurial: 'MER-2025-00152', montant: 1750000, devise: 'FCFA', modePaiement: 'Virement bancaire', justificatifNom: 'Rapport.pdf', justificatifTaille: '560 Ko', statut: 'En attente d’exécution' },
]

const TOTAL_A_EXECUTER = 18

interface HistoriqueExecution {
  reference: string
  projet: string
  libelle: string
  beneficiaire: string
  montant: number
  date: string
  statut: string
}

const HISTORIQUE: HistoriqueExecution[] = [
  { reference: 'TP-2025-0012', projet: 'PADESCE', libelle: 'Achat matériel informatique', beneficiaire: 'SMI SARL', montant: 2450000, date: '12/05/2025', statut: 'Exécuté (Accepté)' },
  { reference: 'TP-2025-0011', projet: 'PANSFI', libelle: 'Subvention projet microcrédit', beneficiaire: 'Ibrahim Mbouombouo', montant: 350000, date: '10/05/2025', statut: 'Exécuté (Accepté)' },
  { reference: 'TP-2025-0010', projet: 'CGA', libelle: 'Achat matériel de bureau', beneficiaire: 'Alpha Fournitures', montant: 85000, date: '08/05/2025', statut: 'Exécuté (Accepté)' },
  { reference: 'TP-2025-0009', projet: 'MIDER', libelle: 'Frais de mission supervision', beneficiaire: 'Abdoulaye Diallo', montant: 75000, date: '05/05/2025', statut: 'Exécuté (Accepté)' },
  { reference: 'TP-2025-0008', projet: 'BAC OFFICE', libelle: 'Impression de documents', beneficiaire: 'Imprimerie Moderne', montant: 54000, date: '03/05/2025', statut: 'Refusé' },
]

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
  { id: 'montant', label: 'Montant (FCFA)' },
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

function JustificatifModal({ paiement, onClose, onDecision }: {
  paiement: PaiementAExecuter
  onClose: () => void
  onDecision: (decision: 'accepte' | 'refuse') => void
}) {
  const [commentaire, setCommentaire] = useState('')
  const [fichier, setFichier] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const hasJustificatif = commentaire.trim() !== '' || fichier !== null

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFichier(event.target.files?.[0] ?? null)
  }

  return (
    <div className="pe-modal-overlay" role="dialog" aria-modal="true" aria-label="Justificatif du paiement" onMouseDown={onClose}>
      <div className="pe-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="pe-modal-head">
          <div>
            <h3>Justificatif</h3>
            <p>{paiement.numero} · {paiement.fournisseur} · {fmtMontant(paiement.montant)} {paiement.devise}</p>
          </div>
          <button type="button" className="pe-modal-close" onClick={onClose} aria-label="Fermer"><X size={16} /></button>
        </div>

        <label className="pe-modal-field">Commentaire / description
          <textarea rows={4} value={commentaire} onChange={(event) => setCommentaire(event.target.value)} placeholder="Ajouter un commentaire justifiant l'exécution..." />
        </label>

        <div className="pe-modal-upload">
          <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx" className="pe-hidden-input" onChange={handleFileChange} />
          <button type="button" className="pe-modal-upload-btn" onClick={() => fileInputRef.current?.click()}>
            <Upload size={14} />Joindre une image ou un document
          </button>
          {fichier && <span className="pe-modal-file"><Paperclip size={12} />{fichier.name}</span>}
        </div>

        {hasJustificatif && (
          <div className="pe-modal-actions">
            <button type="button" className="pe-modal-refuse" onClick={() => onDecision('refuse')}>Refuser</button>
            <button type="button" className="pe-modal-accept" onClick={() => onDecision('accepte')}>Accepter</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function PaiementsExecutesPage({ navigateTo, onNotify }: { navigateTo: (page: string) => void; onNotify: (message: string) => void }) {
  const [innerTab, setInnerTab] = useState<'nouveau' | 'historique'>('nouveau')
  const [paiements, setPaiements] = useState<PaiementAExecuter[]>(PAIEMENTS_A_EXECUTER_INITIAL)
  const [search, setSearch] = useState('')
  const [activeNumero, setActiveNumero] = useState<string | null>(null)
  const { hiddenColumns, toggleColumn, visibleColumns } = useColumnVisibility(PAIEMENT_COLUMNS)

  const activePaiement = paiements.find((paiement) => paiement.numero === activeNumero) ?? null

  const filtered = paiements.filter((paiement) => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return paiement.numero.toLowerCase().includes(q)
      || paiement.projet.toLowerCase().includes(q)
      || paiement.fournisseur.toLowerCase().includes(q)
      || paiement.demandeCode.toLowerCase().includes(q)
  })

  const handleDecision = (decision: 'accepte' | 'refuse') => {
    if (!activePaiement) return
    setPaiements((current) => current.map((paiement) => paiement.numero === activePaiement.numero
      ? { ...paiement, statut: decision === 'accepte' ? 'Exécuté (Accepté)' : 'Refusé' }
      : paiement))
    onNotify(decision === 'accepte'
      ? `Paiement ${activePaiement.numero} (${activePaiement.fournisseur}) accepté et exécuté.`
      : `Paiement ${activePaiement.numero} (${activePaiement.fournisseur}) refusé.`)
    setActiveNumero(null)
  }

  return (
    <section className="pe-page">
      <nav className="pe-subtabs">
        <button onClick={() => navigateTo('tresorerie')}><Receipt size={14} />Demandes de paiement</button>
        <button className="active" onClick={() => navigateTo('tresorerie-paiements')}><BadgeCheck size={14} />Paiements exécutés</button>
        <button onClick={() => navigateTo('tresorerie-comptes')}><Wallet size={14} />Comptes et caisses</button>
        <button onClick={() => navigateTo('tresorerie-rapports')}><CircleDot size={14} />Rapports financiers</button>
      </nav>

      <nav className="pe-request-tabs">
        <button className={innerTab === 'nouveau' ? 'active' : ''} onClick={() => setInnerTab('nouveau')}>Nouvelle exécution</button>
        <button className={innerTab === 'historique' ? 'active' : ''} onClick={() => setInnerTab('historique')}>Historique</button>
      </nav>

      {innerTab === 'nouveau' && (
        <>
          <div className="pe-exec-heading">
            <h2>Nouvelle exécution (paiements à exécuter) <Info size={13} /></h2>
            <p>Liste des paiements validés en attente d’exécution.</p>
          </div>

          <div className="pe-filters">
            <label>Période
              <span className="pe-daterange"><Calendar size={14} />01/05/2025 → 31/12/2025</span>
            </label>
            <label>Projet<select defaultValue="Tous"><option>Tous les projets</option></select></label>
            <label>Ligne budgétaire<select defaultValue="Toutes"><option>Toutes les lignes</option></select></label>
            <label>Fournisseur / Bénéficiaire<select defaultValue="Tous"><option>Tous les fournisseurs</option></select></label>
            <label>Mode de paiement<select defaultValue="Tous"><option>Tous les modes</option></select></label>
            <label className="pe-search">
              <Search size={14} />
              <input placeholder="Rechercher un paiement..." value={search} onChange={(event) => setSearch(event.target.value)} />
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
                  {filtered.map((paiement) => (
                    <tr key={paiement.numero}>
                      {visibleColumns.map((c) => {
                        const def = PAIEMENT_CELL_DEFS[c.id]
                        return <td key={c.id} className={def.className}>{def.render(paiement)}</td>
                      })}
                      <td>
                        <button type="button" className="pe-row-action" aria-label="Actions" onClick={() => setActiveNumero(paiement.numero)}>
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
              <span>Affichage de {filtered.length === 0 ? 0 : 1} à {filtered.length} sur {TOTAL_A_EXECUTER} paiements à exécuter</span>
              <div className="pe-table-foot-right">
                <label className="pe-page-size">
                  <select defaultValue={10}>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </label>
                <nav className="pe-pagination" aria-label="Pagination">
                  <button type="button" disabled><ChevronsLeft size={14} /></button>
                  <button type="button" disabled><ChevronLeft size={14} /></button>
                  <button type="button" className="is-active">1</button>
                  <button type="button">2</button>
                  <button type="button"><ChevronRight size={14} /></button>
                  <button type="button"><ChevronsRight size={14} /></button>
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
                <tr><th>Référence</th><th>Projet</th><th>Libellé</th><th>Bénéficiaire</th><th>Montant (FCFA)</th><th>Date</th><th>Statut</th></tr>
              </thead>
              <tbody>
                {HISTORIQUE.map((entry) => (
                  <tr key={entry.reference}>
                    <td className="pe-code">{entry.reference}</td>
                    <td>{entry.projet}</td>
                    <td className="pe-name">{entry.libelle}</td>
                    <td>{entry.beneficiaire}</td>
                    <td className="pe-montant">{fmtMontant(entry.montant)}</td>
                    <td>{entry.date}</td>
                    <td><span className={`pe-pill pe-pill-${statutClass(entry.statut)}`}>{entry.statut}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activePaiement && (
        <JustificatifModal paiement={activePaiement} onClose={() => setActiveNumero(null)} onDecision={handleDecision} />
      )}
    </section>
  )
}
