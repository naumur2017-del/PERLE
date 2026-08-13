import { useMemo, useState } from 'react'
import {
  ArrowDownRight, ArrowUpRight, BadgeCheck, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Download, Eye, FileBarChart, Receipt, Search, Target, Wallet, X,
} from 'lucide-react'
import './RapportsFinanciersPage.css'

type Sens = 'entree' | 'sortie'

interface Operation {
  reference: string
  date: string
  heure: string
  initiateur: string
  initiateurRole: string
  beneficiaire: string
  montant: number
  sens: Sens
  compteDebiteurCode: string
  compteDebiteurNom: string
  compteDebiteurSub: string
  compteCrediteurCode: string
  compteCrediteurNom: string
  compteCrediteurSub: string
  typeOperation: string
  statut: string
}

const OPERATIONS: Operation[] = [
  { reference: 'OP-2025-0156', date: '15/06/2025', heure: '10:32', initiateur: 'Ajara Lamare', initiateurRole: 'Manager MO1', beneficiaire: 'Hôtel Mont Fébé', montant: 485000, sens: 'sortie', compteDebiteurCode: '521100', compteDebiteurNom: 'Banque BICEC', compteDebiteurSub: 'Compte principal', compteCrediteurCode: '401100', compteCrediteurNom: 'Fournisseurs', compteCrediteurSub: 'Fournisseurs locaux', typeOperation: 'Virement fournisseur', statut: 'Exécuté' },
  { reference: 'OP-2025-0155', date: '14/06/2025', heure: '15:45', initiateur: 'Ibrahim Mbouombou', initiateurRole: 'Contrôleur de gestion', beneficiaire: 'NAUMUR SARL', montant: 2350000, sens: 'sortie', compteDebiteurCode: '521100', compteDebiteurNom: 'Banque BICEC', compteDebiteurSub: 'Compte principal', compteCrediteurCode: '401100', compteCrediteurNom: 'Fournisseurs', compteCrediteurSub: 'Fournisseurs locaux', typeOperation: 'Virement fournisseur', statut: 'Exécuté' },
  { reference: 'OP-2025-0154', date: '13/06/2025', heure: '09:18', initiateur: 'Pamella Guebediang', initiateurRole: 'Contrôleur de gestion', beneficiaire: 'TOTAL Energies', montant: 320000, sens: 'sortie', compteDebiteurCode: '521100', compteDebiteurNom: 'Banque BICEC', compteDebiteurSub: 'Compte principal', compteCrediteurCode: '401200', compteCrediteurNom: 'Prestataires', compteCrediteurSub: 'Prestataires', typeOperation: 'Règlement facture', statut: 'Exécuté' },
  { reference: 'OP-2025-0153', date: '12/06/2025', heure: '11:05', initiateur: 'Sophie Ndongo', initiateurRole: 'Assistante comptable', beneficiaire: 'BICEC', montant: 5000000, sens: 'entree', compteDebiteurCode: '521100', compteDebiteurNom: 'Banque BICEC', compteDebiteurSub: 'Compte principal', compteCrediteurCode: '701100', compteCrediteurNom: 'Produits projets', compteCrediteurSub: 'Produits d’activités', typeOperation: 'Encaissement projet', statut: 'Exécuté' },
  { reference: 'OP-2025-0152', date: '11/06/2025', heure: '14:20', initiateur: 'Essogo Erine', initiateurRole: 'Comptable', beneficiaire: 'Africa IT Solutions', montant: 1750000, sens: 'sortie', compteDebiteurCode: '521100', compteDebiteurNom: 'Banque BICEC', compteDebiteurSub: 'Compte principal', compteCrediteurCode: '401100', compteCrediteurNom: 'Fournisseurs', compteCrediteurSub: 'Fournisseurs locaux', typeOperation: 'Virement fournisseur', statut: 'Exécuté' },
  { reference: 'OP-2025-0151', date: '10/06/2025', heure: '16:10', initiateur: 'Théodore Bessala', initiateurRole: 'Responsable RH', beneficiaire: 'CNPS', montant: 250000, sens: 'entree', compteDebiteurCode: '521100', compteDebiteurNom: 'Banque BICEC', compteDebiteurSub: 'Compte principal', compteCrediteurCode: '752000', compteCrediteurNom: 'Remboursements', compteCrediteurSub: 'Remboursements divers', typeOperation: 'Remboursement reçu', statut: 'Exécuté' },
  { reference: 'OP-2025-0150', date: '09/06/2025', heure: '12:30', initiateur: 'Ajara Lamare', initiateurRole: 'Manager MO1', beneficiaire: 'IPAY', montant: 320000, sens: 'sortie', compteDebiteurCode: '521100', compteDebiteurNom: 'Banque BICEC', compteDebiteurSub: 'Compte principal', compteCrediteurCode: '401100', compteCrediteurNom: 'Fournisseurs', compteCrediteurSub: 'Fournisseurs locaux', typeOperation: 'Virement fournisseur', statut: 'Exécuté' },
  { reference: 'OP-2025-0149', date: '06/06/2025', heure: '10:15', initiateur: 'Ajara Lamare', initiateurRole: 'Manager MO1', beneficiaire: 'PADSCE', montant: 8900000, sens: 'entree', compteDebiteurCode: '521100', compteDebiteurNom: 'Banque BICEC', compteDebiteurSub: 'Compte principal', compteCrediteurCode: '701100', compteCrediteurNom: 'Produits projets', compteCrediteurSub: 'Produits d’activités', typeOperation: 'Financement projet', statut: 'Exécuté' },
  { reference: 'OP-2025-0148', date: '05/06/2025', heure: '09:40', initiateur: 'Essogo Erine', initiateurRole: 'Comptable', beneficiaire: 'Fournitures Bureau Plus', montant: 125000, sens: 'sortie', compteDebiteurCode: '521100', compteDebiteurNom: 'Banque BICEC', compteDebiteurSub: 'Compte principal', compteCrediteurCode: '401200', compteCrediteurNom: 'Prestataires', compteCrediteurSub: 'Prestataires', typeOperation: 'Achat fournitures', statut: 'Exécuté' },
  { reference: 'OP-2025-0147', date: '04/06/2025', heure: '11:22', initiateur: 'Ibrahim Mbouombou', initiateurRole: 'Contrôleur de gestion', beneficiaire: 'Remboursement avance', montant: 250000, sens: 'entree', compteDebiteurCode: '521100', compteDebiteurNom: 'Banque BICEC', compteDebiteurSub: 'Compte principal', compteCrediteurCode: '752000', compteCrediteurNom: 'Remboursements', compteCrediteurSub: 'Remboursements divers', typeOperation: 'Remboursement avance', statut: 'Exécuté' },
]

const TOTAL_OPERATIONS = 142
const PAGE_SIZE = 10
const TOTAL_PAGES = Math.ceil(TOTAL_OPERATIONS / PAGE_SIZE)

const TYPES_OPERATION = Array.from(new Set(OPERATIONS.map((op) => op.typeOperation)))
const PROJETS = ['PADESCE', 'PANSFI', 'MIDER', 'CGA', 'BAC OFFICE']
const STATUTS = ['Exécuté', 'En attente', 'Rejeté']

const fmtMontant = (value: number) => value.toLocaleString('fr-FR')

function OperationDetailModal({ operation, onClose }: { operation: Operation; onClose: () => void }) {
  return (
    <div className="rf-modal-backdrop" onClick={onClose}>
      <div className="rf-modal" onClick={(event) => event.stopPropagation()}>
        <div className="rf-modal-head">
          <div>
            <h3>Détail de l’opération</h3>
            <span className="rf-modal-ref">{operation.reference}</span>
          </div>
          <button type="button" className="rf-modal-close" onClick={onClose} aria-label="Fermer"><X size={16} /></button>
        </div>

        <div className={`rf-modal-montant rf-modal-montant-${operation.sens}`}>
          {operation.sens === 'sortie' ? <ArrowDownRight size={20} /> : <ArrowUpRight size={20} />}
          <span>{fmtMontant(operation.montant)} FCFA</span>
          <small>{operation.sens === 'sortie' ? 'Sortie' : 'Entrée'}</small>
        </div>

        <dl className="rf-modal-grid">
          <div><dt>Date</dt><dd>{operation.date} · {operation.heure}</dd></div>
          <div><dt>Statut</dt><dd><span className="rf-status-pill">{operation.statut}</span></dd></div>
          <div><dt>Initiateur</dt><dd>{operation.initiateur}<small>{operation.initiateurRole}</small></dd></div>
          <div><dt>Bénéficiaire</dt><dd>{operation.beneficiaire}</dd></div>
          <div><dt>Compte débiteur</dt><dd>{operation.compteDebiteurCode} - {operation.compteDebiteurNom}<small>{operation.compteDebiteurSub}</small></dd></div>
          <div><dt>Compte créditeur</dt><dd>{operation.compteCrediteurCode} - {operation.compteCrediteurNom}<small>{operation.compteCrediteurSub}</small></dd></div>
          <div><dt>Type d’opération</dt><dd>{operation.typeOperation}</dd></div>
        </dl>
      </div>
    </div>
  )
}

export default function RapportsFinanciersPage({ navigateTo }: { navigateTo: (page: string) => void }) {
  const [search, setSearch] = useState('')
  const [typeFiltre, setTypeFiltre] = useState('Tous')
  const [statutFiltre, setStatutFiltre] = useState('Tous')
  const [selected, setSelected] = useState<Operation | null>(null)

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return OPERATIONS.filter((op) => {
      const matchesQuery = !query
        || op.reference.toLowerCase().includes(query)
        || op.initiateur.toLowerCase().includes(query)
        || op.beneficiaire.toLowerCase().includes(query)
        || op.typeOperation.toLowerCase().includes(query)
      const matchesType = typeFiltre === 'Tous' || op.typeOperation === typeFiltre
      const matchesStatut = statutFiltre === 'Tous' || op.statut === statutFiltre
      return matchesQuery && matchesType && matchesStatut
    })
  }, [search, typeFiltre, statutFiltre])

  const isFiltered = search.trim() !== '' || typeFiltre !== 'Tous' || statutFiltre !== 'Tous'

  return (
    <section className="rf-page">
      <nav className="rf-subtabs">
        <button onClick={() => navigateTo('tresorerie')}><Receipt size={14} />Demandes de paiement</button>
        <button onClick={() => navigateTo('tresorerie-paiements')}><BadgeCheck size={14} />Paiements exécutés</button>
        <button onClick={() => navigateTo('tresorerie-comptes')}><Wallet size={14} />Comptes et caisses</button>
        <button onClick={() => navigateTo('tresorerie-budgets')}><Target size={14} />Budgets</button>
        <button className="active" onClick={() => navigateTo('tresorerie-rapports')}><FileBarChart size={14} />Rapports financiers</button>
      </nav>

      <section className="rf-table-panel">
        <div className="rf-list-head">
          <div>
            <h3>Liste des opérations</h3>
            <p>Consultez toutes les opérations financières (entrées et sorties) enregistrées sur les comptes.</p>
          </div>
          <button type="button" className="rf-btn-outline"><Download size={14} />Exporter</button>
        </div>

        <div className="rf-op-filters">
          <label>Période<div className="rf-daterange">01/05/2025 → 31/12/2025</div></label>
          <label>Type d’opération
            <select value={typeFiltre} onChange={(event) => setTypeFiltre(event.target.value)}>
              <option value="Tous">Tous les types</option>
              {TYPES_OPERATION.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <label>Projet
            <select defaultValue="Tous">
              <option value="Tous">Tous les projets</option>
              {PROJETS.map((projet) => <option key={projet} value={projet}>{projet}</option>)}
            </select>
          </label>
          <label>Statut
            <select value={statutFiltre} onChange={(event) => setStatutFiltre(event.target.value)}>
              <option value="Tous">Tous les statuts</option>
              {STATUTS.map((statut) => <option key={statut} value={statut}>{statut}</option>)}
            </select>
          </label>
          <label className="rf-search">
            <Search size={14} />
            <input placeholder="Rechercher une opération..." value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
        </div>

        <div className="rf-table-wrap">
          <table className="rf-table rf-op-table">
            <thead>
              <tr>
                <th>Date</th><th>Initiateur</th><th>Bénéficiaire</th><th>Montant (FCFA)</th>
                <th>Compte débiteur</th><th>Compte créditeur</th><th>Type d’opération</th>
                <th>Statut</th><th>Référence</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((op) => (
                <tr key={op.reference}>
                  <td>
                    <strong>{op.date}</strong>
                    <small className="rf-sub">{op.heure}</small>
                  </td>
                  <td>
                    <strong>{op.initiateur}</strong>
                    <small className="rf-sub">{op.initiateurRole}</small>
                  </td>
                  <td className="rf-name">{op.beneficiaire}</td>
                  <td>
                    <div className={`rf-op-montant rf-op-montant-${op.sens}`}>
                      {op.sens === 'sortie' ? <ArrowDownRight size={13} /> : <ArrowUpRight size={13} />}
                      {fmtMontant(op.montant)}
                    </div>
                    <small className="rf-sub">{op.sens === 'sortie' ? 'Sortie' : 'Entrée'}</small>
                  </td>
                  <td>
                    <strong>{op.compteDebiteurCode} - {op.compteDebiteurNom}</strong>
                    <small className="rf-sub">{op.compteDebiteurSub}</small>
                  </td>
                  <td>
                    <strong>{op.compteCrediteurCode} - {op.compteCrediteurNom}</strong>
                    <small className="rf-sub">{op.compteCrediteurSub}</small>
                  </td>
                  <td>
                    <span className={`rf-type-op rf-type-op-${op.sens}`}>
                      {op.sens === 'sortie' ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
                      {op.typeOperation}
                    </span>
                  </td>
                  <td><span className="rf-status-pill">{op.statut}</span></td>
                  <td className="rf-code">{op.reference}</td>
                  <td>
                    <button type="button" className="rf-row-action" aria-label="Voir le détail" onClick={() => setSelected(op)}>
                      <Eye size={13} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="rf-empty">Aucune opération ne correspond à votre recherche.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rf-table-foot">
          <span>
            {isFiltered
              ? `${filtered.length} opération${filtered.length > 1 ? 's' : ''} trouvée${filtered.length > 1 ? 's' : ''}`
              : `Affichage de 1 à ${OPERATIONS.length} sur ${TOTAL_OPERATIONS} opérations`}
          </span>
          <div className="rf-table-foot-right">
            <label className="rf-page-size">
              <select defaultValue="10">
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
            </label>
            <nav className="rf-pagination" aria-label="Pagination">
              <button type="button" disabled><ChevronsLeft size={14} /></button>
              <button type="button" disabled><ChevronLeft size={14} /></button>
              <button type="button" className="is-active">1</button>
              <button type="button">2</button>
              <button type="button">3</button>
              <button type="button">4</button>
              <button type="button">5</button>
              <span className="rf-page-ellipsis">…</span>
              <button type="button">{TOTAL_PAGES}</button>
              <button type="button"><ChevronRight size={14} /></button>
              <button type="button"><ChevronsRight size={14} /></button>
            </nav>
          </div>
        </div>
      </section>

      {selected && <OperationDetailModal operation={selected} onClose={() => setSelected(null)} />}
    </section>
  )
}
