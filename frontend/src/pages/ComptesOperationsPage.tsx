import { useMemo, useState } from 'react'
import {
  ArrowDownCircle, ArrowUpCircle, BadgeCheck, Columns3, EyeOff, FileBarChart, GripVertical,
  Landmark, Plus, Receipt, RotateCcw, Search, Target, Wallet,
} from 'lucide-react'
import './ComptesOperationsPage.css'

interface CompteDef {
  id: string
  nom: string
  code: string
  sousLibelle: string
}

const COMPTES: CompteDef[] = [
  { id: 'BICEC', nom: 'BICEC', code: '521100', sousLibelle: 'Compte principal' },
  { id: 'AFR', nom: 'Afriland', code: '521200', sousLibelle: 'Compte principal' },
  { id: 'CAISSE', nom: 'Caisse principale', code: '530100', sousLibelle: 'Caisse' },
  { id: 'OM', nom: 'Orange Money', code: '555100', sousLibelle: 'OM' },
  { id: 'MOMO', nom: 'MTN MoMo', code: '555200', sousLibelle: 'MoMo' },
]

interface Mouvement {
  date: string
  operation: string
  detail?: string
  type: string
  projet: string
  justificatif: boolean
  initiateur: string
  executeur: string
  montants: Partial<Record<string, number>>
}

const MOUVEMENTS: Mouvement[] = [
  { date: '15/06/2025', operation: 'Paiement fournisseur', detail: 'Hôtel Mont Fébé', type: 'Paiement fournisseur', projet: 'CGA', justificatif: true, initiateur: 'Ajara Lamare', executeur: 'Théodore Bessala', montants: { BICEC: -485000 } },
  { date: '14/06/2025', operation: 'Approvisionnement caisse', type: 'Approvisionnement', projet: 'Général', justificatif: true, initiateur: 'Essogo Erine', executeur: 'Essogo Erine', montants: { BICEC: -300000, CAISSE: 300000 } },
  { date: '13/06/2025', operation: 'Encaissement client', detail: 'TOTAL Energies', type: 'Encaissement client', projet: 'PADESCE', justificatif: true, initiateur: 'Sophie Ndongo', executeur: 'Sophie Ndongo', montants: { BICEC: 5000000 } },
  { date: '12/06/2025', operation: 'Transfert BICEC → Afriland', type: 'Transfert interne', projet: 'Général', justificatif: false, initiateur: 'Ajara Lamare', executeur: 'Théodore Bessala', montants: { BICEC: -2000000, AFR: 2000000 } },
  { date: '11/06/2025', operation: 'Paiement partagé', detail: 'Fournisseur + frais', type: 'Paiement fournisseur', projet: 'PANSFI', justificatif: true, initiateur: 'Ibrahim Mbouombou', executeur: 'Théodore Bessala', montants: { BICEC: -300000, AFR: -100000, CAISSE: -85000 } },
  { date: '10/06/2025', operation: 'Règlement facture', detail: 'Prestataire', type: 'Règlement facture', projet: 'MIDER', justificatif: true, initiateur: 'Pamella Guebediang', executeur: 'Théodore Bessala', montants: { AFR: -750000 } },
  { date: '09/06/2025', operation: 'Retour avance mission', type: 'Retour avance', projet: 'PANSFI', justificatif: false, initiateur: 'Herman Tsaffack', executeur: 'Essogo Erine', montants: { CAISSE: 150000 } },
  { date: '08/06/2025', operation: 'Encaissement formation', detail: 'PERLE', type: 'Encaissement formation', projet: 'Général', justificatif: true, initiateur: 'Ajara Lamare', executeur: 'Sophie Ndongo', montants: { BICEC: 2350000, OM: 150000 } },
  { date: '07/06/2025', operation: 'Transfert Afriland → Caisse', type: 'Transfert interne', projet: 'Général', justificatif: false, initiateur: 'Ajara Lamare', executeur: 'Théodore Bessala', montants: { AFR: -500000, CAISSE: 500000 } },
  { date: '06/06/2025', operation: 'Paiement frais de mission', type: 'Paiement frais', projet: 'MIDER', justificatif: true, initiateur: 'Ibrahim Mbouombou', executeur: 'Théodore Bessala', montants: { CAISSE: -120000, MOMO: -120000 } },
]

const KPIS = [
  { icon: Landmark, tone: 'purple', label: 'Solde total disponible', value: '18 475 320 FCFA' },
  { icon: Wallet, tone: 'green', label: 'Comptes actifs', value: String(COMPTES.length) },
  { icon: ArrowUpCircle, tone: 'green', label: 'Entrées période', value: '36 845 200 FCFA' },
  { icon: ArrowDownCircle, tone: 'red', label: 'Sorties période', value: '18 369 880 FCFA' },
]

const PROJETS = Array.from(new Set(MOUVEMENTS.map((m) => m.projet)))
const TYPES_OPERATION = Array.from(new Set(MOUVEMENTS.map((m) => m.type)))

type ColonneId = 'date' | 'operation' | 'justificatif' | 'initiateur' | 'executeur' | `compte:${string}` | 'total'

const COLONNES: { id: ColonneId; label: string }[] = [
  { id: 'date', label: 'Date' },
  { id: 'operation', label: 'Opération' },
  { id: 'justificatif', label: 'Justificatif' },
  { id: 'initiateur', label: 'Initiateur' },
  { id: 'executeur', label: 'Exécuteur' },
  ...COMPTES.map((compte) => ({ id: `compte:${compte.id}` as ColonneId, label: `${compte.nom} (${compte.code})` })),
  { id: 'total', label: 'Total mouvement' },
]

const COLONNES_PAR_DEFAUT: Record<ColonneId, boolean> = COLONNES.reduce((acc, colonne) => {
  acc[colonne.id] = colonne.id !== 'justificatif' && colonne.id !== 'initiateur' && colonne.id !== 'executeur'
  return acc
}, {} as Record<ColonneId, boolean>)

const fmtMontant = (value: number) => value.toLocaleString('fr-FR')

const totalMouvement = (montants: Partial<Record<string, number>>) =>
  Object.values(montants).reduce<number>((sum, value) => sum + (value ?? 0), 0)

function MontantCell({ value }: { value?: number }) {
  if (value === undefined) return <td className="co-cell-empty">—</td>
  return <td className={value >= 0 ? 'co-montant co-montant-pos' : 'co-montant co-montant-neg'}>{fmtMontant(value)}</td>
}

export default function ComptesOperationsPage({ navigateTo }: { navigateTo: (page: string) => void }) {
  const [search, setSearch] = useState('')
  const [projetFiltre, setProjetFiltre] = useState('Tous')
  const [typeFiltre, setTypeFiltre] = useState('Tous')
  const [sensFiltre, setSensFiltre] = useState<'Toutes' | 'Entrées' | 'Sorties'>('Toutes')
  const [pageSize, setPageSize] = useState(10)
  const [detailsVisibles, setDetailsVisibles] = useState(true)
  const [colonnesOpen, setColonnesOpen] = useState(false)
  const [colonnesVisibles, setColonnesVisibles] = useState<Record<ColonneId, boolean>>(COLONNES_PAR_DEFAUT)

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return MOUVEMENTS.filter((mouvement) => {
      const matchesQuery = !query
        || mouvement.operation.toLowerCase().includes(query)
        || (mouvement.detail?.toLowerCase().includes(query) ?? false)
        || mouvement.initiateur.toLowerCase().includes(query)
      const matchesProjet = projetFiltre === 'Tous' || mouvement.projet === projetFiltre
      const matchesType = typeFiltre === 'Tous' || mouvement.type === typeFiltre
      const total = totalMouvement(mouvement.montants)
      const matchesSens = sensFiltre === 'Toutes' || (sensFiltre === 'Entrées' ? total >= 0 : total < 0)
      return matchesQuery && matchesProjet && matchesType && matchesSens
    })
  }, [search, projetFiltre, typeFiltre, sensFiltre])

  const visibles = filtered.slice(0, pageSize)

  const totaux = useMemo(() => {
    const entrees: Record<string, number> = {}
    const sorties: Record<string, number> = {}
    let totalEntrees = 0
    let totalSorties = 0
    for (const compte of COMPTES) {
      entrees[compte.id] = 0
      sorties[compte.id] = 0
    }
    for (const mouvement of filtered) {
      const total = totalMouvement(mouvement.montants)
      if (total >= 0) totalEntrees += total; else totalSorties += total
      for (const compte of COMPTES) {
        const montant = mouvement.montants[compte.id]
        if (montant === undefined) continue
        if (montant >= 0) entrees[compte.id] += montant; else sorties[compte.id] += montant
      }
    }
    return { entrees, sorties, totalEntrees, totalSorties }
  }, [filtered])

  const isColonneVisible = (id: ColonneId) => colonnesVisibles[id]
  const toggleColonne = (id: ColonneId) => setColonnesVisibles((current) => ({ ...current, [id]: !current[id] }))
  const resetColonnes = () => setColonnesVisibles(COLONNES_PAR_DEFAUT)

  const resetFiltres = () => {
    setSearch('')
    setProjetFiltre('Tous')
    setTypeFiltre('Tous')
    setSensFiltre('Toutes')
    setPageSize(10)
  }

  return (
    <section className="co-page">
      <nav className="co-subtabs">
        <button onClick={() => navigateTo('tresorerie')}><Receipt size={14} />Demandes de paiement</button>
        <button onClick={() => navigateTo('tresorerie-paiements')}><BadgeCheck size={14} />Paiements exécutés</button>
        <button onClick={() => navigateTo('tresorerie-comptes')}><Wallet size={14} />Comptes et caisses</button>
        <button onClick={() => navigateTo('tresorerie-budgets')}><Target size={14} />Budgets</button>
        <button onClick={() => navigateTo('tresorerie-rapports')}><FileBarChart size={14} />Rapports financiers</button>
        <button className="active" onClick={() => navigateTo('tresorerie-operations')}><Landmark size={14} />Comptes et opérations</button>
      </nav>

      <div className="co-top">
        <div className="co-kpis">
          {KPIS.map((kpi) => (
            <article key={kpi.label} className={`co-kpi co-kpi-${kpi.tone}`}>
              <div>
                <span>{kpi.label}</span>
                <strong>{kpi.value}</strong>
              </div>
              <span className="co-kpi-icon"><kpi.icon size={18} /></span>
            </article>
          ))}
        </div>
        <button type="button" className="co-btn-primary" onClick={() => navigateTo('tresorerie-comptes')}><Plus size={14} />Nouveau compte</button>
      </div>

      <div className="co-filters">
        <label>Projet
          <select value={projetFiltre} onChange={(event) => setProjetFiltre(event.target.value)}>
            <option value="Tous">Tous les projets</option>
            {PROJETS.map((projet) => <option key={projet} value={projet}>{projet}</option>)}
          </select>
        </label>
        <label>Type d’opération
          <select value={typeFiltre} onChange={(event) => setTypeFiltre(event.target.value)}>
            <option value="Tous">Tous les types</option>
            {TYPES_OPERATION.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>
        <label>Entrée / Sortie
          <select value={sensFiltre} onChange={(event) => setSensFiltre(event.target.value as typeof sensFiltre)}>
            <option value="Toutes">Toutes</option>
            <option value="Entrées">Entrées</option>
            <option value="Sorties">Sorties</option>
          </select>
        </label>
        <label className="co-search">
          <Search size={14} />
          <input placeholder="Rechercher une opération..." value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <div className="co-colonnes-wrap">
          <button type="button" className="co-btn-outline" onClick={() => setColonnesOpen((open) => !open)}>
            <Columns3 size={14} />Colonnes
          </button>
          {colonnesOpen && (
            <div className="co-colonnes-popover">
              <h4>Gérer les colonnes</h4>
              <p>Cochez les colonnes à afficher dans le tableau.</p>
              <ul>
                {COLONNES.map((colonne) => (
                  <li key={colonne.id}>
                    <label>
                      <input type="checkbox" checked={isColonneVisible(colonne.id)} onChange={() => toggleColonne(colonne.id)} />
                      {colonne.label}
                    </label>
                  </li>
                ))}
              </ul>
              <button type="button" className="co-colonnes-reset" onClick={resetColonnes}><RotateCcw size={12} />Réinitialiser</button>
            </div>
          )}
        </div>
      </div>

      <div className="co-toolbar">
        <label className="co-page-size">Afficher
          <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          lignes
        </label>
        <div className="co-toolbar-actions">
          <button type="button" className={`co-btn-outline ${detailsVisibles ? 'is-active' : ''}`} onClick={() => setDetailsVisibles((value) => !value)}>
            <EyeOff size={14} />Masquer / afficher les détails
          </button>
          <button type="button" className="co-btn-outline" onClick={resetFiltres}><RotateCcw size={14} />Réinitialiser</button>
        </div>
      </div>

      <div className="co-table-panel">
        <div className="co-table-wrap">
          <table className="co-table">
            <thead>
              <tr>
                <th className="co-col-handle"></th>
                {isColonneVisible('date') && <th>Date</th>}
                {isColonneVisible('operation') && <th>Opération</th>}
                {isColonneVisible('justificatif') && <th>Justificatif</th>}
                {isColonneVisible('initiateur') && <th>Initiateur</th>}
                {isColonneVisible('executeur') && <th>Exécuteur</th>}
                {COMPTES.map((compte) => isColonneVisible(`compte:${compte.id}` as ColonneId) && (
                  <th key={compte.id} className="co-col-compte">
                    <strong>{compte.nom}</strong>
                    <small>{compte.code} - {compte.sousLibelle}</small>
                  </th>
                ))}
                {isColonneVisible('total') && <th>Total mouvement</th>}
              </tr>
            </thead>
            <tbody>
              {visibles.map((mouvement, index) => (
                <tr key={`${mouvement.date}-${index}`}>
                  <td className="co-col-handle"><GripVertical size={13} /></td>
                  {isColonneVisible('date') && <td>{mouvement.date}</td>}
                  {isColonneVisible('operation') && (
                    <td className="co-name">
                      <strong>{mouvement.operation}</strong>
                      {detailsVisibles && mouvement.detail && <small>{mouvement.detail}</small>}
                    </td>
                  )}
                  {isColonneVisible('justificatif') && <td>{mouvement.justificatif ? <span className="co-just-pill">Oui</span> : <span className="co-cell-empty">—</span>}</td>}
                  {isColonneVisible('initiateur') && <td>{mouvement.initiateur}</td>}
                  {isColonneVisible('executeur') && <td>{mouvement.executeur}</td>}
                  {COMPTES.map((compte) => isColonneVisible(`compte:${compte.id}` as ColonneId) && (
                    <MontantCell key={compte.id} value={mouvement.montants[compte.id]} />
                  ))}
                  {isColonneVisible('total') && <MontantCell value={totalMouvement(mouvement.montants)} />}
                </tr>
              ))}
              {visibles.length === 0 && (
                <tr><td className="co-empty" colSpan={COLONNES.length + 1}>Aucune opération ne correspond à votre recherche.</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr className="co-total-row">
                <td className="co-col-handle"></td>
                {isColonneVisible('date') && <td></td>}
                {isColonneVisible('operation') && <td className="co-name">Total entrées</td>}
                {isColonneVisible('justificatif') && <td></td>}
                {isColonneVisible('initiateur') && <td></td>}
                {isColonneVisible('executeur') && <td></td>}
                {COMPTES.map((compte) => isColonneVisible(`compte:${compte.id}` as ColonneId) && (
                  <td key={compte.id} className="co-montant co-montant-pos">{fmtMontant(totaux.entrees[compte.id])}</td>
                ))}
                {isColonneVisible('total') && <td className="co-montant co-montant-pos">{fmtMontant(totaux.totalEntrees)}</td>}
              </tr>
              <tr className="co-total-row">
                <td className="co-col-handle"></td>
                {isColonneVisible('date') && <td></td>}
                {isColonneVisible('operation') && <td className="co-name">Total sorties</td>}
                {isColonneVisible('justificatif') && <td></td>}
                {isColonneVisible('initiateur') && <td></td>}
                {isColonneVisible('executeur') && <td></td>}
                {COMPTES.map((compte) => isColonneVisible(`compte:${compte.id}` as ColonneId) && (
                  <td key={compte.id} className="co-montant co-montant-neg">{fmtMontant(totaux.sorties[compte.id])}</td>
                ))}
                {isColonneVisible('total') && <td className="co-montant co-montant-neg">{fmtMontant(totaux.totalSorties)}</td>}
              </tr>
              <tr className="co-total-row co-solde-row">
                <td className="co-col-handle"></td>
                {isColonneVisible('date') && <td></td>}
                {isColonneVisible('operation') && <td className="co-name">Solde actuel</td>}
                {isColonneVisible('justificatif') && <td></td>}
                {isColonneVisible('initiateur') && <td></td>}
                {isColonneVisible('executeur') && <td></td>}
                {COMPTES.map((compte) => isColonneVisible(`compte:${compte.id}` as ColonneId) && (
                  <td key={compte.id} className="co-montant">{fmtMontant(totaux.entrees[compte.id] + totaux.sorties[compte.id])}</td>
                ))}
                {isColonneVisible('total') && <td className="co-montant">{fmtMontant(totaux.totalEntrees + totaux.totalSorties)}</td>}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </section>
  )
}
