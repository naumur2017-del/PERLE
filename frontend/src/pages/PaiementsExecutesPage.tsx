import { useState } from 'react'
import {
  BadgeCheck, CheckCircle2, ChevronLeft, ChevronRight, Download, MoreVertical, Paperclip,
  Receipt, RotateCcw, Search, Target, Wallet,
} from 'lucide-react'
import './PaiementsExecutesPage.css'

interface PaiementExecute {
  reference: string
  projet: string
  codeActivite?: string
  libelle: string
  compteDebiteur: string
  beneficiaire: string
  beneficiaireSub?: string
  montant: number
  datePaiement: string
  initiePar: string
  validationDirection: string
  validationRessources: string
}

const PAIEMENTS: PaiementExecute[] = [
  { reference: 'TP-2025-0012', projet: 'PADESCE', codeActivite: 'PAD-AC-126', libelle: 'Achat matériel informatique', compteDebiteur: 'BGFI Bank (Compte 001)', beneficiaire: 'SMI SARL', montant: 2450000, datePaiement: '12/05/2025', initiePar: 'Ajara Lamare', validationDirection: '12/06/2025', validationRessources: '12/06/2025' },
  { reference: 'TP-2025-0011', projet: 'PANSFI', codeActivite: 'PAN-FO-052', libelle: 'Subvention projet microcrédit', compteDebiteur: 'Caisse Principale (CP)', beneficiaire: 'Ibrahim Mbouombouo', beneficiaireSub: 'Matricule : NAU-0057', montant: 350000, datePaiement: '10/05/2025', initiePar: 'Théodore Bessala', validationDirection: '10/06/2025', validationRessources: '10/06/2025' },
  { reference: 'TP-2025-0010', projet: 'CGA', libelle: 'Achat matériel de bureau', compteDebiteur: 'BGFI Bank (Compte 001)', beneficiaire: 'Alpha Fournitures', montant: 85000, datePaiement: '08/05/2025', initiePar: 'Ajara Lamare', validationDirection: '08/05/2025', validationRessources: '08/05/2025' },
  { reference: 'TP-2025-0009', projet: 'MIDER', libelle: 'Frais de mission supervision', compteDebiteur: 'Compte Mobile Money (OM - 6798...)', beneficiaire: 'Abdoulaye Diallo', beneficiaireSub: 'Matricule : NAU-0102', montant: 75000, datePaiement: '05/05/2025', initiePar: 'Pamella Guebediang', validationDirection: '01/06/2025', validationRessources: '05/06/2025' },
  { reference: 'TP-2025-0008', projet: 'BAC OFFICE', libelle: 'Impression de documents', compteDebiteur: 'BGFI Bank (Compte 001)', beneficiaire: 'Imprimerie Moderne', montant: 54000, datePaiement: '03/05/2025', initiePar: 'Théodore Bessala', validationDirection: '03/05/2025', validationRessources: '03/05/2025' },
  { reference: 'TP-2025-0007', projet: 'PANSFI', codeActivite: 'PAN-COM-009', libelle: 'Frais de communication', compteDebiteur: 'Caisse Principale (CP)', beneficiaire: 'Orange Cameroun', montant: 120000, datePaiement: '02/05/2025', initiePar: 'Ajara Lamare', validationDirection: '02/05/2025', validationRessources: '02/06/2025' },
  { reference: 'TP-2025-0006', projet: 'CARAVEL', libelle: 'Marketing digital', compteDebiteur: 'BGFI Bank (Compte 001)', beneficiaire: 'Digital Media', montant: 200000, datePaiement: '28/04/2025', initiePar: 'Pamella Guebediang', validationDirection: '27/04/2025', validationRessources: '28/04/2025' },
]

const TOTAL_PAIEMENTS = 152

const REPARTITION_BENEFICIAIRE = [
  { label: 'Employés', value: 82, color: '#6b46c1' },
  { label: 'Prestataires', value: 43, color: '#3b82f6' },
  { label: 'Fournisseurs', value: 18, color: '#16a34a' },
  { label: 'Autres', value: 9, color: '#f59e0b' },
]

const STATUT_PAIEMENTS = [
  { label: 'Payés', percent: 82, count: 125, tone: 'good' },
  { label: 'En cours d’exécution', percent: 8, count: 12, tone: 'info' },
  { label: 'En attente de validation', percent: 5, count: 8, tone: 'warn' },
  { label: 'Refusés', percent: 3, count: 4, tone: 'bad' },
  { label: 'Annulés', percent: 2, count: 3, tone: 'neutral' },
]

const PAIEMENTS_PAR_MOIS = [
  { label: 'Jan', value: 3 },
  { label: 'Fév', value: 5 },
  { label: 'Mars', value: 8 },
  { label: 'Avr', value: 7 },
  { label: 'Mai', value: 12 },
  { label: 'Juin', value: 10 },
  { label: 'Juil', value: 14 },
  { label: 'Août', value: 13 },
  { label: 'Sept', value: 16 },
  { label: 'Oct', value: 15 },
  { label: 'Nov', value: 18 },
  { label: 'Déc', value: 17 },
]

const TOP_BENEFICIAIRES = [
  { nom: 'UCCC Bwa', montant: 1000000 },
  { nom: 'SME SARL', montant: 850000 },
  { nom: 'Alpha Fournitures', montant: 525000 },
  { nom: 'Jean Dupont', montant: 370000 },
  { nom: 'Orange Cameroun', montant: 280000 },
]

const DERNIERS_PAIEMENTS = [
  { label: 'Paiement prestataire - UCCC Bwa', date: '14/05/2025', montant: 1000000 },
  { label: 'Frais de mission MIDER', date: '14/05/2025', montant: 75000 },
  { label: 'Achat police d’assurance', date: '13/05/2025', montant: 420000 },
  { label: 'Paiement formateur PADESCE', date: '12/05/2025', montant: 150000 },
  { label: 'Imprimerie Moderne', date: '12/05/2025', montant: 78000 },
]

const fmtMontant = (value: number) => value.toLocaleString('fr-FR')

function RepartitionDonut() {
  const total = REPARTITION_BENEFICIAIRE.reduce((sum, item) => sum + item.value, 0)
  const cx = 80, cy = 80, outer = 68, inner = 44
  const slices = REPARTITION_BENEFICIAIRE.reduce<{ label: string; value: number; color: string; path: string }[]>((acc, item) => {
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
    <div className="pe-donut-wrap">
      <svg viewBox="0 0 160 160" className="pe-donut-svg" role="img" aria-label="Répartition par type de bénéficiaire">
        {slices.map((slice) => <path key={slice.label} d={slice.path} fill={slice.color} />)}
        <text x={cx} y={cy - 4} textAnchor="middle" className="pe-donut-value">{total}</text>
        <text x={cx} y={cy + 13} textAnchor="middle" className="pe-donut-sub">paiements</text>
      </svg>
      <ul className="pe-donut-legend">
        {REPARTITION_BENEFICIAIRE.map((item) => (
          <li key={item.label}>
            <i style={{ background: item.color }} />
            <span>{item.label}</span>
            <b>{item.value} / {Math.round((item.value / total) * 100)}%</b>
          </li>
        ))}
      </ul>
    </div>
  )
}

function PaiementsChart() {
  const width = 620, height = 220, left = 34, right = 596, top = 20, bottom = 176
  const maxY = 20
  const step = (right - left) / (PAIEMENTS_PAR_MOIS.length - 1)
  const valueToY = (value: number) => bottom - (value / maxY) * (bottom - top)
  const points = PAIEMENTS_PAR_MOIS.map((entry, index) => ({ ...entry, x: left + index * step, y: valueToY(entry.value) }))
  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${bottom} L ${points[0].x} ${bottom} Z`
  const ticks = [0, 5, 10, 15, 20]

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="pe-chart-svg" role="img" aria-label="Paiements par mois">
      {ticks.map((tick) => {
        const y = valueToY(tick)
        return (
          <g key={tick}>
            <line x1={left} x2={right} y1={y} y2={y} className="pe-chart-grid" />
            <text x={left - 8} y={y + 3} className="pe-chart-axis" textAnchor="end">{tick === 0 ? '0' : `${tick}M`}</text>
          </g>
        )
      })}
      <path d={areaPath} className="pe-chart-area" />
      <path d={linePath} className="pe-chart-line" />
      {points.map((point) => (
        <g key={point.label}>
          <circle cx={point.x} cy={point.y} r={3.5} className="pe-chart-dot" />
          <text x={point.x} y={bottom + 16} className="pe-chart-axis" textAnchor="middle">{point.label}</text>
        </g>
      ))}
    </svg>
  )
}

export default function PaiementsExecutesPage({ navigateTo }: { navigateTo: (page: string) => void }) {
  const [search, setSearch] = useState('')

  return (
    <section className="pe-page">
      <nav className="pe-subtabs">
        <button onClick={() => navigateTo('tresorerie')}><Receipt size={14} />Demandes de paiement</button>
        <button className="active" onClick={() => navigateTo('tresorerie-paiements')}><BadgeCheck size={14} />Paiements exécutés</button>
        <button onClick={() => navigateTo('tresorerie-comptes')}><Wallet size={14} />Comptes et caisses</button>
        <button onClick={() => navigateTo('tresorerie-budgets')}><Target size={14} />Budgets</button>
        <button onClick={() => navigateTo('tresorerie-rapports')}><Receipt size={14} />Rapports financiers</button>
      </nav>

      <div className="pe-filters">
        <label>Projet<select defaultValue="Tous"><option>Tous les projets</option></select></label>
        <label>Comptes débiteurs<select defaultValue="Tous"><option>Tous les comptes</option></select></label>
        <label>Comptes créditeurs<select defaultValue="Tous"><option>Tous les comptes</option></select></label>
        <label>Type de paiement<select defaultValue="Tous"><option>Tous</option></select></label>
        <label>Période<select defaultValue="Mai"><option>Ce mois : Mai 2025</option></select></label>
        <label>Date début<input type="date" defaultValue="2025-05-01" /></label>
        <label>Date fin<input type="date" defaultValue="2025-05-31" /></label>
      </div>
      <div className="pe-filters">
        <label className="pe-search">
          <Search size={14} />
          <input placeholder="Rechercher un paiement (référence, libellé, bénéficiaire, n° chèque...)" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <button type="button" className="pe-reset" onClick={() => setSearch('')}><RotateCcw size={14} />Réinitialiser</button>
        <button type="button" className="pe-btn-primary"><Download size={14} />Exporter</button>
      </div>

      <div className="pe-main">
        <div className="pe-table-panel">
          <div className="pe-table-head"><h3>Liste des paiements exécutés</h3></div>
          <div className="pe-table-wrap">
            <table className="pe-table">
              <thead>
                <tr>
                  <th>Réf. paiement</th><th>Projet</th><th>Code activité</th><th>Compte débiteur</th>
                  <th>Bénéficiaire</th><th>Montant (FCFA)</th><th>Date paiement</th><th>Justificatif</th>
                  <th>Initié par</th><th>Valid. Direction</th><th>Valid. Ressources</th><th>Statut</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {PAIEMENTS.map((paiement) => (
                  <tr key={paiement.reference}>
                    <td className="pe-code">{paiement.reference}</td>
                    <td>{paiement.projet}</td>
                    <td className="pe-name">{paiement.codeActivite ? `${paiement.codeActivite} · ${paiement.libelle}` : paiement.libelle}</td>
                    <td>{paiement.compteDebiteur}</td>
                    <td>
                      <strong>{paiement.beneficiaire}</strong>
                      {paiement.beneficiaireSub && <small className="pe-sub">{paiement.beneficiaireSub}</small>}
                    </td>
                    <td className="pe-montant">{fmtMontant(paiement.montant)}</td>
                    <td>{paiement.datePaiement}</td>
                    <td><span className="pe-pieces"><Paperclip size={12} /></span></td>
                    <td>{paiement.initiePar}</td>
                    <td><span className="pe-valide">Validé <small>{paiement.validationDirection}</small></span></td>
                    <td><span className="pe-valide">Validé <small>{paiement.validationRessources}</small></span></td>
                    <td><span className="pe-pill">Payé</span></td>
                    <td><button type="button" className="pe-row-action" aria-label="Actions"><MoreVertical size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pe-table-foot">
            <span>Affichage de 1 à {PAIEMENTS.length} sur {TOTAL_PAIEMENTS} paiements exécutés</span>
            <nav className="pe-pagination" aria-label="Pagination">
              <button type="button" disabled><ChevronLeft size={14} /></button>
              <button type="button" className="is-active">1</button>
              <button type="button">2</button>
              <button type="button">3</button>
              <button type="button">4</button>
              <button type="button">5</button>
              <span className="pe-page-ellipsis">…</span>
              <button type="button">16</button>
              <button type="button"><ChevronRight size={14} /></button>
            </nav>
          </div>
        </div>

        <aside className="pe-side">
          <div className="pe-panel">
            <h3>Répartition par type de bénéficiaire</h3>
            <RepartitionDonut />
          </div>
          <div className="pe-panel">
            <h3>Statut des paiements</h3>
            <ul className="pe-bar-list">
              {STATUT_PAIEMENTS.map((row) => (
                <li key={row.label}>
                  <span className="pe-bar-label">{row.label}</span>
                  <span className="pe-bar-track"><i className={row.tone} style={{ width: `${row.percent}%` }} /></span>
                  <b>{row.percent}% ({row.count})</b>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      <div className="pe-bottom">
        <div className="pe-panel pe-chart-panel">
          <h3>Paiements par mois (2025)</h3>
          <PaiementsChart />
        </div>

        <div className="pe-panel">
          <h3>Top 5 bénéficiaires</h3>
          <ul className="pe-rank-list">
            {TOP_BENEFICIAIRES.map((row, index) => (
              <li key={row.nom}>
                <span className="pe-rank-num">{index + 1}</span>
                <div>
                  <span className="pe-rank-name">{row.nom}</span>
                  <span className="pe-rank-track"><i style={{ width: `${(row.montant / TOP_BENEFICIAIRES[0].montant) * 100}%` }} /></span>
                </div>
                <b>{fmtMontant(row.montant)}</b>
              </li>
            ))}
          </ul>
        </div>

        <div className="pe-panel">
          <h3>Derniers paiements exécutés</h3>
          <ul className="pe-recent-list">
            {DERNIERS_PAIEMENTS.map((item) => (
              <li key={item.label}>
                <CheckCircle2 size={15} />
                <div><strong>{item.label}</strong><small>{item.date}</small></div>
                <b>{fmtMontant(item.montant)} FCFA</b>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
