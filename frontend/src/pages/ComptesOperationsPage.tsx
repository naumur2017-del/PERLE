import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  ArrowDownCircle, ArrowUpCircle, Columns3, EyeOff, GripVertical,
  Landmark, Plus, RotateCcw, Search, Wallet, X,
} from 'lucide-react'
import { currencySuffix } from '../utils/currency'
import KpiVisibilityToggle from '../components/KpiVisibilityToggle'
import { useKpiVisibility } from '../hooks/useKpiVisibility'
import { getSession } from '../auth/session'
import ExportButtons from '../components/ExportButtons'
import PeriodeSelector from '../components/PeriodeSelector'
import type { TableauExport } from '../utils/exportTableau'
import { isoLocal, isoVersFr, periodeDepuisEtat, periodeEtatInitial, type PeriodeEtat } from '../utils/periodes'
import { can } from '../auth/permissions'
import {
  createCompte, fetchComptes, fetchMouvements, rapprovisionnerCompte, tresorerieError,
  type CompteTresorerie, type MouvementTresorerie, type RapprovisionnementForm,
} from '../api/tresorerie'
import './ComptesOperationsPage.css'

// Colonnes masquées par défaut ; les colonnes « compte » sont générées à partir des comptes créés.
const COLONNES_MASQUEES_PAR_DEFAUT: Record<string, boolean> = { justificatif: true, initiateur: true, executeur: true }

const fmtMontant = (value: number) => value.toLocaleString('fr-FR')
const fmtDate = (value: string) => new Date(value).toLocaleDateString('fr-FR')
const montantSigne = (mouvement: MouvementTresorerie) => (mouvement.type_mouvement === 'Entrée' ? mouvement.montant : -mouvement.montant)
const projetDe = (mouvement: MouvementTresorerie) => mouvement.projet_code || 'Général'

async function chargerDonnees() {
  return Promise.all([fetchComptes(), fetchMouvements()])
}

function MontantCell({ value }: { value?: number }) {
  if (value === undefined) return <td className="co-cell-empty">—</td>
  return <td className={value >= 0 ? 'co-montant co-montant-pos' : 'co-montant co-montant-neg'}>{fmtMontant(value)}</td>
}

function NouveauCompteModal({ onClose, onSaved }: { onClose: () => void; onSaved: (message: string) => Promise<void> }) {
  const [form, setForm] = useState({ nom: '', code: '', sousLibelle: '', soldeInitial: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError('')
    try {
      await createCompte({
        nom: form.nom.trim(), code: form.code.trim(), sous_libelle: form.sousLibelle.trim(),
        solde_initial: Number(form.soldeInitial) || 0,
      })
      await onSaved(`Compte « ${form.nom.trim()} » créé.`)
      onClose()
    } catch (err) { setError(tresorerieError(err)) }
    finally { setBusy(false) }
  }

  return (
    <div className="co-modal-backdrop" onClick={onClose}>
      <form className="co-modal" onClick={(event) => event.stopPropagation()} onSubmit={submit}>
        <div className="co-modal-head">
          <div>
            <h3>Nouveau compte</h3>
            <p>Banque, caisse ou mobile money. Le solde initial est le montant disponible à l'ouverture.</p>
          </div>
          <button type="button" className="co-modal-close" onClick={onClose} aria-label="Fermer"><X size={16} /></button>
        </div>
        <div className="co-modal-body">
          <label>Nom du compte <em>*</em>
            <input required maxLength={200} value={form.nom} onChange={(event) => setForm({ ...form, nom: event.target.value })} placeholder="Ex. BICEC" />
          </label>
          <label>Code <em>*</em>
            <input required maxLength={30} value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder="Ex. 521100" />
          </label>
          <label>Sous-libellé
            <input maxLength={100} value={form.sousLibelle} onChange={(event) => setForm({ ...form, sousLibelle: event.target.value })} placeholder="Ex. Compte principal" />
          </label>
          <label>{`Solde initial (${currencySuffix()})`}
            <input type="number" min="0" step="0.01" value={form.soldeInitial} onChange={(event) => setForm({ ...form, soldeInitial: event.target.value })} placeholder="0" />
          </label>
        </div>
        {error && <p role="alert" className="co-form-error">{error}</p>}
        <div className="co-modal-actions">
          <button type="button" className="co-btn-outline" onClick={onClose}>Annuler</button>
          <button type="submit" className="co-btn-primary" disabled={busy}>Créer le compte</button>
        </div>
      </form>
    </div>
  )
}

function RapprovisionnementModal({ comptes, compteInitial, onClose, onSaved }: {
  comptes: CompteTresorerie[]
  compteInitial: number | null
  onClose: () => void
  onSaved: (message: string) => Promise<void>
}) {
  const [form, setForm] = useState({ compte: String(compteInitial ?? comptes[0]?.id ?? ''), montant: '', libelle: '', source: '' })
  const [justificatif, setJustificatif] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError('')
    const data: RapprovisionnementForm = {
      montant: Number(form.montant), libelle: form.libelle.trim(), source: form.source.trim(), justificatif,
    }
    try {
      await rapprovisionnerCompte(Number(form.compte), data)
      const compte = comptes.find((item) => String(item.id) === form.compte)
      await onSaved(`${fmtMontant(data.montant)} ${currencySuffix()} ajoutés sur ${compte?.nom ?? 'le compte'}.`)
      onClose()
    } catch (err) { setError(tresorerieError(err)) }
    finally { setBusy(false) }
  }

  return (
    <div className="co-modal-backdrop" onClick={onClose}>
      <form className="co-modal" onClick={(event) => event.stopPropagation()} onSubmit={submit}>
        <div className="co-modal-head">
          <div>
            <h3>Rapprovisionner un compte</h3>
            <p>Enregistre une entrée d'argent sur le compte choisi. Elle apparaît dans le journal de la trésorerie.</p>
          </div>
          <button type="button" className="co-modal-close" onClick={onClose} aria-label="Fermer"><X size={16} /></button>
        </div>
        <div className="co-modal-body">
          <label>Compte à approvisionner <em>*</em>
            <select required value={form.compte} onChange={(event) => setForm({ ...form, compte: event.target.value })}>
              {comptes.map((compte) => <option key={compte.id} value={compte.id}>{compte.nom} ({compte.code}) — solde {fmtMontant(compte.solde_actuel)}</option>)}
            </select>
          </label>
          <label>{`Montant (${currencySuffix()})`} <em>*</em>
            <input required type="number" min="0.01" step="0.01" value={form.montant} onChange={(event) => setForm({ ...form, montant: event.target.value })} placeholder="0" />
          </label>
          <label>Libellé <em>*</em>
            <input required maxLength={255} value={form.libelle} onChange={(event) => setForm({ ...form, libelle: event.target.value })} placeholder="Ex. Apport de trésorerie du siège" />
          </label>
          <label>Origine des fonds
            <input maxLength={255} value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })} placeholder="Ex. Siège, bailleur, client…" />
          </label>
          <label>Justificatif (optionnel)
            <input type="file" accept="image/*,.pdf,.doc,.docx" onChange={(event) => setJustificatif(event.target.files?.[0] ?? null)} />
          </label>
        </div>
        {error && <p role="alert" className="co-form-error">{error}</p>}
        <div className="co-modal-actions">
          <button type="button" className="co-btn-outline" onClick={onClose}>Annuler</button>
          <button type="submit" className="co-btn-primary" disabled={busy}>Rapprovisionner</button>
        </div>
      </form>
    </div>
  )
}

export default function ComptesOperationsPage({ navigateTo }: { navigateTo: (page: string) => void }) {
  const { visible: showKpis, toggle: toggleKpis } = useKpiVisibility('co-kpis-hidden')
  const [comptes, setComptes] = useState<CompteTresorerie[]>([])
  const [mouvements, setMouvements] = useState<MouvementTresorerie[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [modal, setModal] = useState<'nouveau' | 'rapprovisionner' | null>(null)
  const [search, setSearch] = useState('')
  const [periodeEtat, setPeriodeEtat] = useState<PeriodeEtat>(() => periodeEtatInitial())
  const periode = useMemo(() => periodeDepuisEtat(periodeEtat), [periodeEtat])
  const [projetFiltre, setProjetFiltre] = useState('Tous')
  const [typeFiltre, setTypeFiltre] = useState('Tous')
  const [sensFiltre, setSensFiltre] = useState<'Toutes' | 'Entrées' | 'Sorties'>('Toutes')
  const [pageSize, setPageSize] = useState(10)
  const [detailsVisibles, setDetailsVisibles] = useState(true)
  const [colonnesOpen, setColonnesOpen] = useState(false)
  const [colonnesMasquees, setColonnesMasquees] = useState<Record<string, boolean>>(COLONNES_MASQUEES_PAR_DEFAUT)
  const [compteSoldeInitial, setCompteSoldeInitial] = useState<number | null>(null)
  const canManage = can(getSession(), 'tresorerie:manage_comptes')

  useEffect(() => {
    let active = true
    chargerDonnees().then(([availableComptes, availableMouvements]) => {
      if (active) { setComptes(availableComptes); setMouvements(availableMouvements) }
    }).catch((err: unknown) => { if (active) setError(tresorerieError(err)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const rafraichir = async (confirmation: string) => {
    const [availableComptes, availableMouvements] = await chargerDonnees()
    setComptes(availableComptes); setMouvements(availableMouvements)
    setError(''); setMessage(confirmation)
  }

  const colonnes = useMemo(() => [
    { id: 'date', label: 'Date' },
    { id: 'operation', label: 'Opération' },
    { id: 'justificatif', label: 'Justificatif' },
    { id: 'initiateur', label: 'Initiateur' },
    { id: 'executeur', label: 'Exécuteur' },
    ...comptes.map((compte) => ({ id: `compte:${compte.id}`, label: `${compte.nom} (${compte.code})` })),
    { id: 'total', label: 'Total mouvement' },
  ], [comptes])

  const projets = useMemo(() => Array.from(new Set(mouvements.map(projetDe))), [mouvements])
  const natures = useMemo(() => Array.from(new Set(mouvements.map((mouvement) => mouvement.nature))), [mouvements])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return mouvements.filter((mouvement) => {
      const matchesQuery = !query
        || mouvement.libelle.toLowerCase().includes(query)
        || mouvement.beneficiaire.toLowerCase().includes(query)
        || mouvement.initiateur_nom.toLowerCase().includes(query)
      const matchesProjet = projetFiltre === 'Tous' || projetDe(mouvement) === projetFiltre
      const matchesType = typeFiltre === 'Tous' || mouvement.nature === typeFiltre
      const matchesSens = sensFiltre === 'Toutes' || (sensFiltre === 'Entrées' ? mouvement.type_mouvement === 'Entrée' : mouvement.type_mouvement === 'Sortie')
      const dateIso = isoLocal(new Date(mouvement.created_at))
      const matchesPeriode = dateIso >= periode.debut && dateIso <= periode.fin
      return matchesQuery && matchesProjet && matchesType && matchesSens && matchesPeriode
    })
  }, [mouvements, search, projetFiltre, typeFiltre, sensFiltre, periode])

  const visibles = filtered.slice(0, pageSize)

  const totaux = useMemo(() => {
    const parCompte = new Map<number, { entrees: number; sorties: number }>()
    for (const compte of comptes) parCompte.set(compte.id, { entrees: 0, sorties: 0 })
    let totalEntrees = 0
    let totalSorties = 0
    for (const mouvement of filtered) {
      const signe = montantSigne(mouvement)
      if (signe >= 0) totalEntrees += signe; else totalSorties += signe
      const ligne = parCompte.get(mouvement.compte)
      if (ligne) { if (signe >= 0) ligne.entrees += signe; else ligne.sorties += signe }
    }
    return { parCompte, totalEntrees, totalSorties }
  }, [comptes, filtered])

  const soldeTotal = comptes.reduce((sum, compte) => sum + compte.solde_actuel, 0)
  const entreesPeriode = mouvements.filter((m) => m.type_mouvement === 'Entrée').reduce((sum, m) => sum + m.montant, 0)
  const sortiesPeriode = mouvements.filter((m) => m.type_mouvement === 'Sortie').reduce((sum, m) => sum + m.montant, 0)
  const kpis = [
    { icon: Landmark, tone: 'purple', label: 'Solde total disponible', value: `${fmtMontant(soldeTotal)} ${currencySuffix()}` },
    { icon: Wallet, tone: 'green', label: 'Comptes actifs', value: String(comptes.length) },
    { icon: ArrowUpCircle, tone: 'green', label: 'Entrées période', value: `${fmtMontant(entreesPeriode)} ${currencySuffix()}` },
    { icon: ArrowDownCircle, tone: 'red', label: 'Sorties période', value: `${fmtMontant(sortiesPeriode)} ${currencySuffix()}` },
  ]

  const compteSoldeInitialDef = comptes.find((compte) => compte.id === compteSoldeInitial) ?? comptes[0]

  const isColonneVisible = (id: string) => !colonnesMasquees[id]
  const toggleColonne = (id: string) => setColonnesMasquees((current) => ({ ...current, [id]: !current[id] }))
  const resetColonnes = () => setColonnesMasquees(COLONNES_MASQUEES_PAR_DEFAUT)

  const resetFiltres = () => {
    setSearch('')
    setProjetFiltre('Tous')
    setTypeFiltre('Tous')
    setSensFiltre('Toutes')
    setPageSize(10)
  }

  const tableau: TableauExport = {
    nom: `comptes-operations_${periode.debut}_${periode.fin}`,
    titre: 'Comptes et opérations',
    periode: `${periode.libelle} — du ${isoVersFr(periode.debut)} au ${isoVersFr(periode.fin)}`,
    kpis: [
      ['Total entrées', fmtMontant(totaux.totalEntrees)],
      ['Total sorties', fmtMontant(totaux.totalSorties)],
      ['Solde net de la période', fmtMontant(totaux.totalEntrees + totaux.totalSorties)],
    ],
    colonnes: ['Date', 'Opération', 'Justificatif', 'Initiateur', 'Exécuteur', ...comptes.map((c) => `${c.nom} (${c.code})`), 'Total mouvement'],
    lignes: filtered.map((m) => [
      fmtDate(m.created_at), m.libelle, m.justificatif_nom ? 'Oui' : '—', m.initiateur_nom || '—', m.executeur_nom || '—',
      ...comptes.map((c) => (m.compte === c.id ? fmtMontant(montantSigne(m)) : '—')),
      fmtMontant(montantSigne(m)),
    ]),
  }

  return (
    <section className="co-page">
      <div className="co-title-row">
        <div>
          <h1>Comptes et opérations</h1>
          <p>Suivez tous les mouvements financiers par compte. Les montants négatifs (–) indiquent des sorties d'argent.</p>
          <button type="button" className="co-link-btn" onClick={() => navigateTo('tresorerie-rapports')}>Voir le journal de la trésorerie</button>
        </div>
        <div className="co-toolbar">
          <KpiVisibilityToggle visible={showKpis} onToggle={toggleKpis} />
          <ExportButtons tableau={tableau} disabled={loading} className="co-btn-outline" />
        </div>
      </div>

      {error && <p role="alert" className="co-message co-message-error">{error}</p>}
      {message && <p role="status" className="co-message">{message}</p>}
      {loading && <p role="status" className="co-message">Chargement des comptes…</p>}

      {canManage && (
        <div className="co-actions-row">
          <button type="button" className="co-btn-outline" onClick={() => setModal('rapprovisionner')} disabled={comptes.length === 0}>
            <Wallet size={14} />Rapprovisionner un compte
          </button>
          <button type="button" className="co-btn-primary" onClick={() => setModal('nouveau')}><Plus size={14} />Nouveau compte</button>
        </div>
      )}

      {showKpis && (
      <div className="co-kpis">
        {kpis.map((kpi) => (
          <article key={kpi.label} className={`co-kpi co-kpi-${kpi.tone}`}>
            <div>
              <span>{kpi.label}</span>
              <strong>{kpi.value}</strong>
            </div>
            <span className="co-kpi-icon"><kpi.icon size={18} /></span>
          </article>
        ))}
      </div>
      )}

      {comptes.length === 0 && !loading ? (
        <article className="co-empty-accounts">
          <Wallet size={18} />
          <div>
            <strong>Aucun compte de trésorerie</strong>
            <p>{canManage ? 'Créez le premier compte (banque, caisse ou mobile money) pour commencer à suivre les opérations.' : 'Un directeur ou un administrateur doit créer les comptes de trésorerie.'}</p>
          </div>
        </article>
      ) : (
      <article className="co-solde-initial">
        <span className="co-solde-initial-icon"><Wallet size={18} /></span>
        <div className="co-solde-initial-body">
          <span className="co-solde-initial-label">Solde initial</span>
          <select
            className="co-solde-initial-select"
            value={compteSoldeInitialDef?.id ?? ''}
            onChange={(event) => setCompteSoldeInitial(Number(event.target.value))}
          >
            {comptes.map((compte) => <option key={compte.id} value={compte.id}>{compte.nom}</option>)}
          </select>
          <span className="co-solde-initial-meta">{compteSoldeInitialDef?.code} - {compteSoldeInitialDef?.sous_libelle || 'Sans sous-libellé'}</span>
        </div>
        <strong className="co-solde-initial-value">{fmtMontant(compteSoldeInitialDef?.solde_initial ?? 0)} {currencySuffix()}</strong>
      </article>
      )}

      <div className="co-period-row">
        <PeriodeSelector etat={periodeEtat} onChange={setPeriodeEtat} libelle={periode.libelle} />
      </div>
      <div className="co-filters">
        <label>Projet
          <select value={projetFiltre} onChange={(event) => setProjetFiltre(event.target.value)}>
            <option value="Tous">Tous les projets</option>
            {projets.map((projet) => <option key={projet} value={projet}>{projet}</option>)}
          </select>
        </label>
        <label>Type d’opération
          <select value={typeFiltre} onChange={(event) => setTypeFiltre(event.target.value)}>
            <option value="Tous">Tous les types</option>
            {natures.map((nature) => <option key={nature} value={nature}>{nature}</option>)}
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
                {colonnes.map((colonne) => (
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

      <div className="co-table-toolbar">
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
                {comptes.map((compte) => isColonneVisible(`compte:${compte.id}`) && (
                  <th key={compte.id} className="co-col-compte">
                    <strong>{compte.nom}</strong>
                    <small>{compte.code} - {compte.sous_libelle}</small>
                  </th>
                ))}
                {isColonneVisible('total') && <th>Total mouvement</th>}
              </tr>
            </thead>
            <tbody>
              {visibles.map((mouvement) => (
                <tr key={mouvement.id}>
                  <td className="co-col-handle"><GripVertical size={13} /></td>
                  {isColonneVisible('date') && <td>{fmtDate(mouvement.created_at)}</td>}
                  {isColonneVisible('operation') && (
                    <td className="co-name">
                      <strong>{mouvement.libelle}</strong>
                      {detailsVisibles && <small>{mouvement.beneficiaire ? `${mouvement.beneficiaire} · ` : ''}{mouvement.reference}</small>}
                    </td>
                  )}
                  {isColonneVisible('justificatif') && <td>{mouvement.justificatif_nom ? <span className="co-just-pill">Oui</span> : <span className="co-cell-empty">—</span>}</td>}
                  {isColonneVisible('initiateur') && <td>{mouvement.initiateur_nom || '—'}</td>}
                  {isColonneVisible('executeur') && <td>{mouvement.executeur_nom || '—'}</td>}
                  {comptes.map((compte) => isColonneVisible(`compte:${compte.id}`) && (
                    <MontantCell key={compte.id} value={mouvement.compte === compte.id ? montantSigne(mouvement) : undefined} />
                  ))}
                  {isColonneVisible('total') && <MontantCell value={montantSigne(mouvement)} />}
                </tr>
              ))}
              {visibles.length === 0 && (
                <tr><td className="co-empty" colSpan={colonnes.length + 1}>{mouvements.length === 0 ? 'Aucune opération enregistrée pour le moment.' : 'Aucune opération ne correspond à votre recherche.'}</td></tr>
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
                {comptes.map((compte) => isColonneVisible(`compte:${compte.id}`) && (
                  <td key={compte.id} className="co-montant co-montant-pos">{fmtMontant(totaux.parCompte.get(compte.id)?.entrees ?? 0)}</td>
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
                {comptes.map((compte) => isColonneVisible(`compte:${compte.id}`) && (
                  <td key={compte.id} className="co-montant co-montant-neg">{fmtMontant(totaux.parCompte.get(compte.id)?.sorties ?? 0)}</td>
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
                {comptes.map((compte) => isColonneVisible(`compte:${compte.id}`) && (
                  <td key={compte.id} className="co-montant">{fmtMontant(compte.solde_actuel)}</td>
                ))}
                {isColonneVisible('total') && <td className="co-montant">{fmtMontant(soldeTotal)}</td>}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {modal === 'nouveau' && <NouveauCompteModal onClose={() => setModal(null)} onSaved={rafraichir} />}
      {modal === 'rapprovisionner' && (
        <RapprovisionnementModal
          comptes={comptes}
          compteInitial={compteSoldeInitialDef?.id ?? null}
          onClose={() => setModal(null)}
          onSaved={rafraichir}
        />
      )}
    </section>
  )
}
