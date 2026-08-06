import { useState } from 'react'
import {
  BadgeCheck, CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, CircleDot, Clock,
  Filter, Hourglass, MoreVertical, Paperclip, Plus, Receipt, RotateCcw, Search, Target, Wallet,
} from 'lucide-react'
import './TresoreriePage.css'

interface Validation {
  statut: string
  date?: string
  par?: string
}

interface DemandePaiement {
  reference: string
  projet: string
  codeActivite: string
  libelle: string
  compteDebiteur: string
  compteCrediteur: string
  compteCrediteurSub?: string
  montant: number
  justificatifs: number
  initiePar: string
  date: string
  validationDirection: Validation
  validationRessources: Validation
  statutPaiement: string
}

const DEMANDES: DemandePaiement[] = [
  { reference: 'PAY-2025-0184', projet: 'PADESCE', codeActivite: 'PAD-AC-126', libelle: 'Achat matériel informatique', compteDebiteur: 'BGFI Bank (Compte 009)', compteCrediteur: 'SMI SARL', montant: 2450000, justificatifs: 3, initiePar: 'Pamella G.', date: '30/05/2025', validationDirection: { statut: 'Validé', date: '30/05/2025', par: 'Ngando D.G.' }, validationRessources: { statut: 'En attente' }, statutPaiement: 'En attente Ressources' },
  { reference: 'PAY-2025-0183', projet: 'PANSFI', codeActivite: 'PAN-FO-052', libelle: 'Formation des formateurs', compteDebiteur: 'Caisse Principale (CP)', compteCrediteur: 'Ibrahim Patrice', compteCrediteurSub: 'Matricule : NAU-0057', montant: 350000, justificatifs: 2, initiePar: 'Herman T.', date: '29/05/2025', validationDirection: { statut: 'Validé', date: '28/05/2025', par: 'Ngando D.G.' }, validationRessources: { statut: 'En attente' }, statutPaiement: 'En attente Ressources' },
  { reference: 'PAY-2025-0182', projet: 'MIDER', codeActivite: 'MID-TR-010', libelle: 'Frais de déplacement mission terrain', compteDebiteur: 'Compte Mobile Money (OM - 6798...)', compteCrediteur: 'Maïa Patrice', compteCrediteurSub: 'Matricule : NAU-0101', montant: 120000, justificatifs: 2, initiePar: 'Maïa P.', date: '28/05/2025', validationDirection: { statut: 'Validé', date: '26/05/2025', par: 'Ngando D.G.' }, validationRessources: { statut: 'Prête à payer', par: 'Théodore B.' }, statutPaiement: 'Prête à payer' },
  { reference: 'PAY-2025-0181', projet: 'PILOTAGE', codeActivite: 'PIL-AD-021', libelle: 'Consulting externe', compteDebiteur: 'BGFI Bank (Compte 002)', compteCrediteur: 'Consult Plus SA', montant: 1800000, justificatifs: 4, initiePar: 'Ajara L.', date: '27/05/2025', validationDirection: { statut: 'Refusé', date: '27/05/2025', par: 'Ngando D.G.' }, validationRessources: { statut: '-' }, statutPaiement: 'Refusé' },
  { reference: 'PAY-2025-0180', projet: 'CARAVEL', codeActivite: 'CAR-MK-003', libelle: 'Achat fournitures marketing', compteDebiteur: 'Caisse Secondaire (CS)', compteCrediteur: 'Office Plus SA', montant: 275000, justificatifs: 1, initiePar: 'Maxwell E.', date: '26/05/2025', validationDirection: { statut: 'Validé', date: '26/05/2025', par: 'Ngando D.G.' }, validationRessources: { statut: 'Prête à payer', par: 'Théodore B.' }, statutPaiement: 'Prête à payer' },
  { reference: 'PAY-2025-0179', projet: 'BAC OFFICE', codeActivite: 'BAC-JU-007', libelle: 'Impression et reliure documents', compteDebiteur: 'Compte Bancaire UBA (Compte 003)', compteCrediteur: 'Imprimerie Moderne', montant: 95000, justificatifs: 1, initiePar: 'Julienne E.', date: '25/05/2025', validationDirection: { statut: 'Correction demandée', date: '25/05/2025', par: 'Ngando D.G.' }, validationRessources: { statut: '-' }, statutPaiement: 'Correction demandée' },
  { reference: 'PAY-2025-0178', projet: 'TRESORERIE', codeActivite: 'TRE-BA-015', libelle: 'Remboursement avance salariale', compteDebiteur: 'Caisse Principale (CP)', compteCrediteur: 'Pamella Guebediang', compteCrediteurSub: 'Matricule : NAU-0084', montant: 200000, justificatifs: 1, initiePar: 'Théodore B.', date: '23/05/2025', validationDirection: { statut: 'Validé', date: '25/05/2025', par: 'Théodore B.' }, validationRessources: { statut: 'Payé', date: '25/05/2025' }, statutPaiement: 'Payé' },
  { reference: 'PAY-2025-0177', projet: 'PANSFI', codeActivite: 'PAN-AC-011', libelle: 'Achat carburant véhicule', compteDebiteur: 'Compte Mobile Money (OM - 6912...)', compteCrediteur: 'Station Total Bastos', montant: 65000, justificatifs: 1, initiePar: 'Herman T.', date: '23/05/2025', validationDirection: { statut: 'Validé', date: '24/05/2025', par: 'Théodore B.' }, validationRessources: { statut: 'Payé', date: '24/05/2025' }, statutPaiement: 'Payé' },
]

const TOTAL_DEMANDES = 184

const KPIS = [
  { icon: Receipt, tone: 'purple', label: 'Total demandes', value: '184', sub: 'Toutes demandes' },
  { icon: Hourglass, tone: 'orange', label: 'En attente Direction', value: '28', sub: '15,2%' },
  { icon: Clock, tone: 'blue', label: 'En attente Ressources', value: '34', sub: '18,5%' },
  { icon: CheckCircle2, tone: 'green', label: 'Validées (Ressources)', value: '61', sub: '33,2%' },
  { icon: Wallet, tone: 'violet', label: 'Prêtes à payer', value: '24', sub: '13,0%' },
  { icon: BadgeCheck, tone: 'indigo', label: 'Payées', value: '35', sub: '19,0%' },
]

const REPARTITION = [
  { label: 'En attente Direction', value: 28, color: '#f59e0b' },
  { label: 'En attente Ressources', value: 34, color: '#3b82f6' },
  { label: 'Prêtes à payer', value: 24, color: '#8b5cf6' },
  { label: 'Payées', value: 35, color: '#16a34a' },
  { label: 'Refusées', value: 22, color: '#dc2626' },
  { label: 'Correction demandée', value: 18, color: '#eab308' },
  { label: 'Brouillon', value: 23, color: '#9ca3af' },
]

const RESUME_FINANCIER = [
  { label: 'Montant total demandes', value: 98450000 },
  { label: 'Montant validé (Ressources)', value: 62750000 },
  { label: 'Montant payé', value: 35870000 },
  { label: 'Montant en attente', value: 26600000 },
]

const CIRCUIT = [
  { label: 'Création de la demande', sub: 'Initiateur', tone: 'purple' },
  { label: 'Validation de la Direction', sub: 'Autorisation de la dépense', tone: 'orange' },
  { label: 'Validation Ressources', sub: 'Contrôle et conformité', tone: 'blue' },
  { label: 'Exécution du paiement', sub: 'Réalisation du paiement', tone: 'green' },
  { label: 'Paiement confirmé', sub: 'Archivage', tone: 'slate' },
]

const fmtMontant = (value: number) => value.toLocaleString('fr-FR')

const statutPaiementClass = (statut: string) => {
  if (statut === 'Payé') return 'paye'
  if (statut === 'Prête à payer') return 'pret'
  if (statut === 'Refusé') return 'refuse'
  if (statut === 'Correction demandée') return 'correction'
  return 'attente'
}

const validationClass = (statut: string) => {
  if (statut === 'Validé' || statut === 'Payé' || statut === 'Prête à payer') return 'ok'
  if (statut === 'Refusé') return 'ko'
  if (statut === 'Correction demandée') return 'warn'
  return 'pending'
}

function ValidationCell({ validation }: { validation: Validation }) {
  if (validation.statut === '-') return <span className="tr-validation-empty">-</span>
  return (
    <div className={`tr-validation ${validationClass(validation.statut)}`}>
      <span className="tr-validation-statut">{validation.statut}</span>
      {(validation.date || validation.par) && (
        <small>{validation.date}{validation.date && validation.par ? ' ' : ''}{validation.par}</small>
      )}
    </div>
  )
}

function RepartitionDonut() {
  const total = REPARTITION.reduce((sum, item) => sum + item.value, 0)
  const cx = 80, cy = 80, outer = 68, inner = 44
  const slices = REPARTITION.reduce<{ label: string; value: number; color: string; path: string }[]>((acc, item) => {
    const from = acc.length > 0 ? acc.reduce((sum, s) => sum + s.value, 0) / total : 0
    const to = from + item.value / total
    const point = (ratio: number, r: number) => {
      const angle = -Math.PI / 2 + ratio * Math.PI * 2
      return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as const
    }
    const [x1, y1] = point(from, outer)
    const [x2, y2] = point(to, outer)
    const [xi2, yi2] = point(to, inner)
    const [xi1, yi1] = point(from, inner)
    const large = to - from > 0.5 ? 1 : 0
    acc.push({ ...item, path: `M ${x1} ${y1} A ${outer} ${outer} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${inner} ${inner} 0 ${large} 0 ${xi1} ${yi1} Z` })
    return acc
  }, [])

  return (
    <div className="tr-donut-wrap">
      <svg viewBox="0 0 160 160" className="tr-donut-svg" role="img" aria-label="Répartition des demandes par statut">
        {slices.map((slice) => <path key={slice.label} d={slice.path} fill={slice.color} />)}
        <text x={cx} y={cy - 4} textAnchor="middle" className="tr-donut-value">{total}</text>
        <text x={cx} y={cy + 13} textAnchor="middle" className="tr-donut-sub">Total</text>
      </svg>
      <ul className="tr-donut-legend">
        {REPARTITION.map((item) => (
          <li key={item.label}>
            <i style={{ background: item.color }} />
            <span>{item.label}</span>
            <b>{item.value} ({((item.value / total) * 100).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%)</b>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function TresoreriePage({ navigateTo }: { navigateTo: (page: string) => void }) {
  const [search, setSearch] = useState('')

  return (
    <section className="tr-page">
      <div className="tr-header-row">
        <nav className="tr-subtabs">
          <button className="active" onClick={() => navigateTo('tresorerie')}><Receipt size={14} />Demandes de paiement</button>
          <button onClick={() => navigateTo('tresorerie-paiements')}><BadgeCheck size={14} />Paiements exécutés</button>
          <button onClick={() => navigateTo('tresorerie-comptes')}><Wallet size={14} />Comptes et caisses</button>
          <button onClick={() => navigateTo('tresorerie-budgets')}><Target size={14} />Budgets</button>
          <button onClick={() => navigateTo('tresorerie-rapports')}><CircleDot size={14} />Rapports financiers</button>
        </nav>
        <button type="button" className="tr-btn-primary"><Plus size={14} />Nouvelle demande de paiement</button>
      </div>

      <div className="tr-top">
        <div className="tr-kpis">
          {KPIS.map((kpi) => (
            <article key={kpi.label} className={`tr-kpi tr-kpi-${kpi.tone}`}>
              <span className="tr-kpi-icon"><kpi.icon size={16} /></span>
              <div>
                <strong>{kpi.value}</strong>
                <span>{kpi.label}</span>
                <small>{kpi.sub}</small>
              </div>
            </article>
          ))}
        </div>
        <div className="tr-gauge-card">
          <svg width="100" height="100" viewBox="0 0 100 100" className="tr-gauge">
            <circle cx="50" cy="50" r="42" fill="none" stroke="#efeafb" strokeWidth="9" />
            <circle cx="50" cy="50" r="42" fill="none" stroke="#16a34a" strokeWidth="9" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 42} strokeDashoffset={2 * Math.PI * 42 * (1 - 0.72)} transform="rotate(-90 50 50)" />
            <text x="50" y="56" textAnchor="middle" className="tr-gauge-text">72%</text>
          </svg>
          <strong>Taux d’exécution des paiements</strong>
          <small>Objectif : 80%</small>
        </div>
      </div>

      <div className="tr-filters">
        <label>Projet<select defaultValue="Tous"><option>Tous les projets</option></select></label>
        <label>Code activité<select defaultValue="Tous"><option>Tous les codes</option></select></label>
        <label>Initié par<select defaultValue="Tous"><option>Tous les collaborateurs</option></select></label>
        <label>Compte débiteur<select defaultValue="Tous"><option>Tous les comptes</option></select></label>
        <label>Compte créditeur<select defaultValue="Tous"><option>Tous les comptes / Employés</option></select></label>
        <label>Statut paiement<select defaultValue="Tous"><option>Tous les statuts</option></select></label>
      </div>
      <div className="tr-filters">
        <label>Date de début<input type="date" defaultValue="2025-01-01" /></label>
        <label>Date de fin<input type="date" defaultValue="2025-05-31" /></label>
        <label className="tr-search">
          <Search size={14} />
          <input placeholder="Rechercher (référence, libellé, bénéficiaire...)" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <button type="button" className="tr-reset" onClick={() => setSearch('')}><RotateCcw size={14} />Réinitialiser</button>
        <button type="button" className="tr-btn-primary"><Filter size={14} />Filtrer</button>
      </div>

      <div className="tr-main">
        <div className="tr-table-panel">
          <div className="tr-table-wrap">
            <table className="tr-table">
              <thead>
                <tr>
                  <th>Référence</th><th>Projet</th><th>Code activité</th><th>Libellé</th>
                  <th>Compte débiteur</th><th>Compte créditeur</th><th>Montant</th><th>Justificatif</th>
                  <th>Initié par</th><th>Date</th><th>Validation Direction</th><th>Validation Ressources</th>
                  <th>Statut paiement</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {DEMANDES.map((demande) => (
                  <tr key={demande.reference}>
                    <td className="tr-code">{demande.reference}</td>
                    <td>{demande.projet}</td>
                    <td>{demande.codeActivite}</td>
                    <td className="tr-name">{demande.libelle}</td>
                    <td>{demande.compteDebiteur}</td>
                    <td>
                      <strong>{demande.compteCrediteur}</strong>
                      {demande.compteCrediteurSub && <small className="tr-sub">{demande.compteCrediteurSub}</small>}
                    </td>
                    <td className="tr-montant">{fmtMontant(demande.montant)}</td>
                    <td><span className="tr-pieces"><Paperclip size={12} />{demande.justificatifs}</span></td>
                    <td>{demande.initiePar}</td>
                    <td>{demande.date}</td>
                    <td><ValidationCell validation={demande.validationDirection} /></td>
                    <td><ValidationCell validation={demande.validationRessources} /></td>
                    <td><span className={`tr-pill tr-pill-${statutPaiementClass(demande.statutPaiement)}`}>{demande.statutPaiement}</span></td>
                    <td><button type="button" className="tr-row-action" aria-label="Actions"><MoreVertical size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="tr-table-foot">
            <span>Affichage de 1 à {DEMANDES.length} sur {TOTAL_DEMANDES} demandes</span>
            <nav className="tr-pagination" aria-label="Pagination">
              <button type="button" disabled><ChevronLeft size={14} /></button>
              <button type="button" className="is-active">1</button>
              <button type="button">2</button>
              <button type="button">3</button>
              <button type="button">4</button>
              <button type="button">5</button>
              <span className="tr-page-ellipsis">…</span>
              <button type="button">19</button>
              <button type="button"><ChevronRight size={14} /></button>
            </nav>
          </div>
        </div>

        <aside className="tr-side">
          <div className="tr-panel">
            <h3>Répartition par statut</h3>
            <RepartitionDonut />
          </div>

          <div className="tr-panel">
            <h3>Résumé financier (FCFA)</h3>
            <ul className="tr-resume">
              {RESUME_FINANCIER.map((item) => (
                <li key={item.label}><span>{item.label}</span><b>{fmtMontant(item.value)}</b></li>
              ))}
            </ul>
          </div>

          <div className="tr-panel">
            <h3>Circuit de validation</h3>
            <ul className="tr-circuit">
              {CIRCUIT.map((step, index) => (
                <li key={step.label}>
                  <span className={`tr-circuit-dot ${step.tone}`}><CalendarClock size={12} /></span>
                  <div><strong>{step.label}</strong><small>{step.sub}</small></div>
                  {index < CIRCUIT.length - 1 && <span className="tr-circuit-line" />}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </section>
  )
}
