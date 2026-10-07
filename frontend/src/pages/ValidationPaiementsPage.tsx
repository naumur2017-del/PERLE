import { useEffect, useState } from 'react'
import { BadgeCheck, CircleDot, FileText, Info, Receipt, Search, ShieldCheck, Wallet, X } from 'lucide-react'
import { currencySuffix } from '../utils/currency'
import { downloadJustificatif, fetchPaiements, paiementDate, paiementError, validerPaiement, type Paiement } from '../api/paiements'
import { getSession } from '../auth/session'
import { can } from '../auth/permissions'
import './PaiementsExecutesPage.css'
import './ValidationPaiementsPage.css'

const fmtMontant = (value: number) => value.toLocaleString('fr-FR')

const DECISION_PILL: Partial<Record<Paiement['statut'], string>> = { valide: 'valide', execute: 'execute', refuse: 'refuse' }

// Refus : la raison est obligatoire — elle est transmise à l'auteur de la demande (alerte et historique).
function RefusModal({ paiement, onClose, onConfirm, busy, error }: {
  paiement: Paiement
  onClose: () => void
  onConfirm: (motif: string) => void
  busy: boolean
  error: string
}) {
  const [motif, setMotif] = useState('')
  return (
    <div className="pe-modal-overlay" role="dialog" aria-modal="true" aria-label="Refuser l’ordonnance" onMouseDown={() => { if (!busy) onClose() }}>
      <div className="pe-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="pe-modal-head">
          <div>
            <h3>Refuser l’ordonnance</h3>
            <p>{paiement.numero} · {paiement.fournisseur} · {fmtMontant(paiement.montant)} {paiement.devise}</p>
          </div>
          <button type="button" className="pe-modal-close" disabled={busy} onClick={onClose} aria-label="Fermer"><X size={16} /></button>
        </div>
        {error && <p role="alert">{error}</p>}
        <label className="pe-modal-field">Raison du refus
          <textarea rows={4} autoFocus value={motif} onChange={(event) => setMotif(event.target.value)} placeholder="Expliquez brièvement pourquoi cette demande est refusée…" />
        </label>
        <div className="pe-modal-actions">
          <button type="button" className="pe-modal-accept" disabled={busy} onClick={onClose}>Annuler</button>
          <button type="button" className="pe-modal-refuse" disabled={busy || !motif.trim()} onClick={() => onConfirm(motif.trim())}>
            {busy ? 'Refus…' : 'Confirmer le refus'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ValidationPaiementsPage({ navigateTo, onNotify }: { navigateTo: (page: string) => void; onNotify: (message: string) => void }) {
  const [innerTab, setInnerTab] = useState<'avalider' | 'historique'>('avalider')
  const [records, setRecords] = useState<Paiement[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [refusError, setRefusError] = useState('')
  const [search, setSearch] = useState('')
  const [refusId, setRefusId] = useState<number | null>(null)
  const canValidate = can(getSession(), 'tresorerie:validation')

  useEffect(() => {
    let active = true
    fetchPaiements().then((data) => { if (active) setRecords(data) })
      .catch((err: unknown) => { if (active) setError(paiementError(err)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const q = search.trim().toLowerCase()
  const correspond = (record: Paiement) => !q || [record.numero, record.objet, record.fournisseur, record.projet_nom, record.initie_par]
    .some((value) => value.toLowerCase().includes(q))
  const aValider = records.filter((record) => record.statut === 'attente' && correspond(record))
  const decisions = records.filter((record) => record.valide_le && correspond(record))
    .sort((a, b) => (b.valide_le ?? '').localeCompare(a.valide_le ?? ''))
  const refusPaiement = records.find((record) => record.id === refusId) ?? null

  const decider = async (record: Paiement, decision: 'accepte' | 'refuse', motif = '') => {
    if (busyId !== null) return
    setBusyId(record.id); setError(''); setRefusError('')
    try {
      const saved = await validerPaiement(record.id, decision, motif)
      setRecords((current) => current.map((item) => item.id === saved.id ? saved : item))
      setRefusId(null)
      onNotify(decision === 'accepte'
        ? `Ordonnance ${saved.numero} validée : elle passe en exécution chez les Ressources.`
        : `Ordonnance ${saved.numero} refusée.`)
    } catch (err) {
      if (decision === 'refuse') setRefusError(paiementError(err))
      else setError(paiementError(err))
    } finally { setBusyId(null) }
  }

  const download = async (record: Paiement) => {
    try { await downloadJustificatif(record) }
    catch (err) { setError(paiementError(err)) }
  }

  return (
    <section className="pe-page">
      {loading && <p role="status">Chargement des ordonnances…</p>}
      {error && <p role="alert">{error}</p>}
      <nav className="pe-subtabs">
        <button onClick={() => navigateTo('tresorerie')}><Receipt size={14} />Ordonnances des paiements</button>
        <button className="active" onClick={() => navigateTo('tresorerie-validation')}><ShieldCheck size={14} />Validation des paiements</button>
        <button onClick={() => navigateTo('tresorerie-paiements')}><BadgeCheck size={14} />Exécutions des paiements</button>
        <button onClick={() => navigateTo('tresorerie-comptes')}><Wallet size={14} />Comptes et opérations</button>
        <button onClick={() => navigateTo('tresorerie-rapports')}><CircleDot size={14} />Journal de la trésorerie</button>
      </nav>

      <nav className="pe-request-tabs">
        <button className={innerTab === 'avalider' ? 'active' : ''} onClick={() => setInnerTab('avalider')}>À valider ({records.filter((r) => r.statut === 'attente').length})</button>
        <button className={innerTab === 'historique' ? 'active' : ''} onClick={() => setInnerTab('historique')}>Historique</button>
      </nav>

      <div className="pe-exec-heading">
        <h2>{innerTab === 'avalider' ? 'Ordonnances à valider' : 'Décisions de la Direction'} <Info size={13} /></h2>
        <p>{innerTab === 'avalider'
          ? 'Ordonnances soumises par les managers et les Ressources. Une fois acceptées, elles passent en exécution chez les Ressources ; un refus doit être motivé.'
          : 'Ordonnances acceptées ou refusées, avec leur suite.'}</p>
      </div>

      <div className="pe-filters">
        <label className="pe-search">
          <Search size={14} />
          <input placeholder="Rechercher une ordonnance..." value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
      </div>

      {innerTab === 'avalider' && (
        <div className="pe-table-panel">
          <div className="pe-table-wrap">
            <table className="pe-table">
              <thead>
                <tr>
                  <th>N° demande</th><th>Soumise le</th><th>Initié par</th><th>Projet</th><th>Ligne budgétaire</th>
                  <th>Fournisseur / Bénéficiaire</th><th>Objet</th><th>{`Montant (${currencySuffix()})`}</th><th>Compte</th><th>Pièce</th><th>Décision</th>
                </tr>
              </thead>
              <tbody>
                {aValider.length === 0 && (
                  <tr><td colSpan={11} className="pe-empty">{loading ? 'Chargement…' : 'Aucune ordonnance en attente de validation.'}</td></tr>
                )}
                {aValider.map((record) => (
                  <tr key={record.id}>
                    <td className="pe-code">{record.numero}</td>
                    <td>{paiementDate(record.updated_at)}</td>
                    <td>{record.initie_par || '—'}</td>
                    <td>{record.projet_nom || 'Transversal'}</td>
                    <td className="pe-name">{record.ligne_budgetaire_nom || '—'}</td>
                    <td>{record.fournisseur}</td>
                    <td className="pe-name">{record.objet}</td>
                    <td className="pe-montant">{fmtMontant(record.montant)}</td>
                    <td>{record.compte_nom || '—'}</td>
                    <td>{record.justificatif_nom
                      ? <button type="button" className="pe-row-action" title={record.justificatif_nom} onClick={() => void download(record)}><FileText size={14} /></button>
                      : '—'}</td>
                    <td>
                      <div className="vp-row-buttons">
                        <button type="button" className="vp-btn-accept" disabled={!canValidate || busyId !== null} title={canValidate ? undefined : 'Réservé à la Direction'} onClick={() => void decider(record, 'accepte')}>
                          {busyId === record.id && refusId === null ? '…' : 'Accepter'}
                        </button>
                        <button type="button" className="vp-btn-refuse" disabled={!canValidate || busyId !== null} title={canValidate ? undefined : 'Réservé à la Direction'} onClick={() => { setRefusError(''); setRefusId(record.id) }}>
                          Refuser
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {innerTab === 'historique' && (
        <div className="pe-table-panel">
          <div className="pe-table-wrap">
            <table className="pe-table">
              <thead>
                <tr>
                  <th>N° demande</th><th>Objet</th><th>{`Montant (${currencySuffix()})`}</th><th>Initié par</th>
                  <th>Décision le</th><th>Par</th><th>Statut</th><th>Motif du refus</th>
                </tr>
              </thead>
              <tbody>
                {decisions.length === 0 && <tr><td colSpan={8} className="pe-empty">{loading ? 'Chargement…' : 'Aucune décision enregistrée.'}</td></tr>}
                {decisions.map((record) => (
                  <tr key={record.id}>
                    <td className="pe-code">{record.numero}</td>
                    <td className="pe-name">{record.objet}</td>
                    <td className="pe-montant">{fmtMontant(record.montant)}</td>
                    <td>{record.initie_par || '—'}</td>
                    <td>{paiementDate(record.valide_le)}</td>
                    <td>{record.valide_par_nom || '—'}</td>
                    <td><span className={`pe-pill pe-pill-${DECISION_PILL[record.statut] ?? 'attente'}`}>{record.statut_libelle}</span></td>
                    <td className="vp-motif">{record.motif_refus || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {refusPaiement && (
        <RefusModal
          paiement={refusPaiement}
          onClose={() => setRefusId(null)}
          onConfirm={(motif) => void decider(refusPaiement, 'refuse', motif)}
          busy={busyId !== null}
          error={refusError}
        />
      )}
    </section>
  )
}
