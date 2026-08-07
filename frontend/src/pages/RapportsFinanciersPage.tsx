import { useState } from 'react'
import {
  ArrowDownCircle, ArrowUpCircle, BadgeCheck, CalendarRange, Clock, Download, Eye, FileBarChart,
  FileText, Info, Landmark, List, MoreVertical, PieChart, PlayCircle, Receipt, RotateCcw, Scale,
  Target, TrendingUp, Wallet,
} from 'lucide-react'
import './RapportsFinanciersPage.css'

interface Rapport {
  numero: number
  intitule: string
  type: string
  typeTone: string
  periode: string
  projetCompte: string
  dateGeneration: string
  generePar: string
  format: 'PDF' | 'Excel'
}

const RAPPORTS: Rapport[] = [
  { numero: 1, intitule: 'Rapport financier mensuel - Juillet 2025', type: 'Mensuel', typeTone: 'blue', periode: '01/07/2025 - 31/07/2025', projetCompte: 'Tous les projets', dateGeneration: '04/08/2025 10:15', generePar: 'Ajara Lamare', format: 'PDF' },
  { numero: 2, intitule: 'Rapport financier mensuel - Juin 2025', type: 'Mensuel', typeTone: 'blue', periode: '01/06/2025 - 30/06/2025', projetCompte: 'Tous les projets', dateGeneration: '01/07/2025 09:20', generePar: 'Théodore Bessala', format: 'PDF' },
  { numero: 3, intitule: 'Rapport financier par projet - PADESCE', type: 'Par projet', typeTone: 'green', periode: '01/01/2025 - 30/06/2025', projetCompte: 'PADESCE', dateGeneration: '30/06/2025 15:45', generePar: 'Pamella Guebediang', format: 'PDF' },
  { numero: 4, intitule: 'Rapport financier par compte bancaire', type: 'Par compte', typeTone: 'indigo', periode: '01/01/2025 - 30/06/2025', projetCompte: 'BGFI Bank - CP', dateGeneration: '30/06/2025 15:40', generePar: 'Pamella Guebediang', format: 'Excel' },
  { numero: 5, intitule: 'Rapport des flux de trésorerie', type: 'Flux de trésorerie', typeTone: 'cyan', periode: '01/04/2025 - 30/06/2025', projetCompte: 'Tous les projets', dateGeneration: '30/06/2025 14:10', generePar: 'Ajara Lamare', format: 'PDF' },
  { numero: 6, intitule: 'Rapport financier trimestriel - T2 2025', type: 'Trimestriel', typeTone: 'orange', periode: '01/04/2025 - 30/06/2025', projetCompte: 'Tous les projets', dateGeneration: '05/07/2025 11:05', generePar: 'Théodore Bessala', format: 'PDF' },
  { numero: 7, intitule: 'Rapport financier annuel - 2024', type: 'Annuel', typeTone: 'red', periode: '01/01/2024 - 31/12/2024', projetCompte: 'Tous les projets', dateGeneration: '15/01/2025 10:30', generePar: 'Ajara Lamare', format: 'PDF' },
  { numero: 8, intitule: 'Rapport des encaissements détaillés', type: 'Détaillé', typeTone: 'gray', periode: '01/01/2025 - 04/08/2025', projetCompte: 'Tous les projets', dateGeneration: '04/08/2025 09:00', generePar: 'Pamella Guebediang', format: 'Excel' },
]

const KPIS = [
  { icon: ArrowDownCircle, tone: 'green', label: 'Total encaissements', value: '125 450 000', sub: '↑ 14,5% vs période précédente' },
  { icon: ArrowUpCircle, tone: 'red', label: 'Total décaissements', value: '98 320 000', sub: '↑ 8,2% vs période précédente' },
  { icon: Scale, tone: 'blue', label: 'Solde net de la période', value: '27 130 000', sub: '↑ 33,1% vs période précédente' },
  { icon: Wallet, tone: 'orange', label: 'Solde final des comptes', value: '85 370 000', sub: 'Mise à jour : 04/08/2025 11:30' },
]

const REPARTITION_FLUX = [
  { label: 'Encaissements', value: 125450000, color: '#16a34a' },
  { label: 'Décaissements', value: 98320000, color: '#3b82f6' },
]

const FLUX_PAR_MOIS = [
  { label: 'Jan', encaissements: 12, decaissements: 9 },
  { label: 'Fév', encaissements: 14, decaissements: 10 },
  { label: 'Mars', encaissements: 16, decaissements: 12 },
  { label: 'Avr', encaissements: 15, decaissements: 13 },
  { label: 'Mai', encaissements: 18, decaissements: 14 },
  { label: 'Juin', encaissements: 20, decaissements: 15 },
  { label: 'Juil', encaissements: 17, decaissements: 13 },
  { label: 'Août', encaissements: 13, decaissements: 12 },
]

const TYPES_RAPPORTS = [
  { icon: FileText, tone: 'blue', label: 'Rapport mensuel', sub: 'Synthèse des encaissements et décaissements par mois.' },
  { icon: PieChart, tone: 'green', label: 'Rapport par projet', sub: 'Analyse financière détaillée par projet.' },
  { icon: Landmark, tone: 'purple', label: 'Rapport par compte', sub: 'Situation financière par compte ou caisse.' },
  { icon: TrendingUp, tone: 'cyan', label: 'Flux de trésorerie', sub: 'Analyse des flux de trésorerie sur une période.' },
  { icon: CalendarRange, tone: 'red', label: 'Rapport trimestriel / annuel', sub: 'Synthèse globale trimestrielle ou annuelle.' },
  { icon: List, tone: 'gray', label: 'Rapport détaillé', sub: 'Détails de toutes les transactions par type d’opération.' },
]

const fmtMontant = (value: number) => value.toLocaleString('fr-FR')

function RepartitionDonut() {
  const total = REPARTITION_FLUX.reduce((sum, item) => sum + item.value, 0)
  const cx = 80, cy = 80, outer = 68, inner = 44
  const slices = REPARTITION_FLUX.reduce<{ label: string; value: number; color: string; path: string }[]>((acc, item) => {
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
    <div className="rf-donut-wrap">
      <svg viewBox="0 0 160 160" className="rf-donut-svg" role="img" aria-label="Répartition des flux">
        {slices.map((slice) => <path key={slice.label} d={slice.path} fill={slice.color} />)}
        <text x={cx} y={cy - 6} textAnchor="middle" className="rf-donut-value">{fmtMontant(total)}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" className="rf-donut-sub">FCFA</text>
      </svg>
      <ul className="rf-donut-legend">
        {REPARTITION_FLUX.map((item) => (
          <li key={item.label}>
            <i style={{ background: item.color }} />
            <span>{item.label}</span>
            <b>{fmtMontant(item.value)} ({Math.round((item.value / total) * 100)}%)</b>
          </li>
        ))}
      </ul>
    </div>
  )
}

function FluxParMoisChart() {
  const width = 260, height = 170, left = 26, right = 250, top = 10, bottom = 140
  const maxY = 40
  const slot = (right - left) / FLUX_PAR_MOIS.length
  const barWidth = Math.min(9, slot * 0.32)
  const y = (value: number) => bottom - (value / maxY) * (bottom - top)
  const ticks = [0, 20, 40]

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="rf-bar-svg" role="img" aria-label="Flux par mois">
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={left} x2={right} y1={y(tick)} y2={y(tick)} className="rf-bar-grid" />
          <text x={left - 6} y={y(tick) + 3} className="rf-bar-axis" textAnchor="end">{tick === 0 ? '0' : `${tick}M`}</text>
        </g>
      ))}
      {FLUX_PAR_MOIS.map((entry, index) => {
        const x = left + slot * index
        return (
          <g key={entry.label}>
            <rect x={x + slot / 2 - barWidth - 1.5} y={y(entry.encaissements)} width={barWidth} height={bottom - y(entry.encaissements)} fill="#16a34a" rx="1.5" />
            <rect x={x + slot / 2 + 1.5} y={y(entry.decaissements)} width={barWidth} height={bottom - y(entry.decaissements)} fill="#3b82f6" rx="1.5" />
            <text x={x + slot / 2} y={height - 2} className="rf-bar-axis" textAnchor="middle">{entry.label}</text>
          </g>
        )
      })}
    </svg>
  )
}

export default function RapportsFinanciersPage({ navigateTo }: { navigateTo: (page: string) => void }) {
  const [projet, setProjet] = useState('Tous')

  return (
    <section className="rf-page">
      <nav className="rf-subtabs">
        <button onClick={() => navigateTo('tresorerie')}><Receipt size={14} />Demandes de paiement</button>
        <button onClick={() => navigateTo('tresorerie-paiements')}><BadgeCheck size={14} />Paiements exécutés</button>
        <button onClick={() => navigateTo('tresorerie-comptes')}><Wallet size={14} />Comptes et caisses</button>
        <button onClick={() => navigateTo('tresorerie-budgets')}><Target size={14} />Budgets</button>
        <button className="active" onClick={() => navigateTo('tresorerie-rapports')}><FileBarChart size={14} />Rapports financiers</button>
      </nav>

      <div className="rf-filters-panel">
        <h3>Filtres de recherche</h3>
        <div className="rf-filters">
          <label>Période<div className="rf-daterange">01/01/2025 → 04/08/2025</div></label>
          <label>Projet
            <select value={projet} onChange={(event) => setProjet(event.target.value)}>
              <option value="Tous">Tous les projets</option>
            </select>
          </label>
          <label>Type de rapport<select defaultValue="Tous"><option>Tous les types</option></select></label>
          <label>Compte / Caisse<select defaultValue="Tous"><option>Tous les comptes</option></select></label>
          <label>Statut<select defaultValue="Tous"><option>Tous</option></select></label>
        </div>
        <div className="rf-filters">
          <label>Regrouper par<select defaultValue="Mois"><option>Mois</option><option>Trimestre</option><option>Année</option></select></label>
          <label>Format d’export<div className="rf-export-format"><span>PDF</span><Download size={13} /></div></label>
          <div className="rf-filters-actions">
            <button type="button" className="rf-btn-outline"><RotateCcw size={14} />Réinitialiser</button>
            <button type="button" className="rf-btn-primary"><PlayCircle size={14} />Générer le rapport</button>
          </div>
        </div>
      </div>

      <div className="rf-body">
        <div className="rf-content">
          <div className="rf-kpis">
            {KPIS.map((kpi) => (
              <article key={kpi.label} className={`rf-kpi rf-kpi-${kpi.tone}`}>
                <span className="rf-kpi-icon"><kpi.icon size={20} /></span>
                <div>
                  <strong>{kpi.value} <small>FCFA</small></strong>
                  <span>{kpi.label}</span>
                  <small>{kpi.sub}</small>
                </div>
              </article>
            ))}
          </div>

          <section className="rf-table-panel">
            <div className="rf-table-head"><h3>Liste des rapports financiers</h3></div>
            <div className="rf-table-wrap">
              <table className="rf-table">
                <thead>
                  <tr>
                    <th>N°</th><th>Intitulé du rapport</th><th>Type de rapport</th><th>Période couverte</th>
                    <th>Projet / Compte</th><th>Date de génération</th><th>Généré par</th><th>Format</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {RAPPORTS.map((rapport) => (
                    <tr key={rapport.numero}>
                      <td>{rapport.numero}</td>
                      <td className="rf-name">{rapport.intitule}</td>
                      <td><span className={`rf-type rf-type-${rapport.typeTone}`}>{rapport.type}</span></td>
                      <td>{rapport.periode}</td>
                      <td>{rapport.projetCompte}</td>
                      <td>{rapport.dateGeneration}</td>
                      <td>{rapport.generePar}</td>
                      <td><span className={`rf-format ${rapport.format === 'PDF' ? 'pdf' : 'excel'}`}>{rapport.format}</span></td>
                      <td>
                        <div className="rf-actions">
                          <button type="button" className="rf-row-action" aria-label="Voir"><Eye size={13} /></button>
                          <button type="button" className="rf-row-action" aria-label="Télécharger"><Download size={13} /></button>
                          <button type="button" className="rf-row-action" aria-label="Actions"><MoreVertical size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rf-table-foot">
              <span>Affichage de 1 à {RAPPORTS.length} sur {RAPPORTS.length} rapports</span>
              <nav className="rf-pagination" aria-label="Pagination">
                <button type="button" disabled>«</button>
                <button type="button" disabled>‹</button>
                <button type="button" className="is-active">1</button>
                <button type="button" disabled>›</button>
                <button type="button" disabled>»</button>
              </nav>
            </div>
          </section>

          <section className="rf-types-panel">
            <h3>Types de rapports disponibles</h3>
            <div className="rf-types-grid">
              {TYPES_RAPPORTS.map((type) => (
                <article key={type.label} className={`rf-type-card rf-type-card-${type.tone}`}>
                  <span className="rf-type-card-icon"><type.icon size={18} /></span>
                  <strong>{type.label}</strong>
                  <small>{type.sub}</small>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="rf-side">
          <div className="rf-panel">
            <h3>Répartition des flux</h3>
            <RepartitionDonut />
          </div>

          <div className="rf-panel">
            <h3>Flux par mois (FCFA)</h3>
            <div className="rf-bar-legend">
              <span><i className="green" />Encaissements</span>
              <span><i className="blue" />Décaissements</span>
            </div>
            <FluxParMoisChart />
          </div>

          <div className="rf-panel">
            <h3>Informations</h3>
            <ul className="rf-info-list">
              <li><Info size={14} /><span>Les rapports sont générés à partir des données validées.</span></li>
              <li><BadgeCheck size={14} /><span>Les montants sont exprimés en FCFA.</span></li>
              <li><Clock size={14} /><span>Dernière mise à jour des données : 04/08/2025 11:30</span></li>
            </ul>
          </div>
        </aside>
      </div>
    </section>
  )
}
