import { useMemo, useState } from 'react'
import {
  Archive, ArrowUpDown, Calendar, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Copy, Download, ListChecks, Pencil, Plus, Recycle, RotateCcw, Search, Trash2, TrendingUp, Upload,
} from 'lucide-react'
import { currencySuffix } from '../utils/currency'
import './MercurialesPage.css'

type Statut = 'Active' | 'Expirée' | 'Programmée'

interface Mercuriale {
  code: string
  designation: string
  categorie: string
  sousCategorie: string
  unite: string
  prix: number
  dateEffet: string
  dateFin: string | null
  statut: Statut
}

const MERCURIALES_INITIAL: Mercuriale[] = [
  { code: 'MER-001', designation: 'Impression A4 N&B', categorie: 'Fournitures de bureau', sousCategorie: 'Impression', unite: 'Page', prix: 50, dateEffet: '01/01/2026', dateFin: null, statut: 'Active' },
  { code: 'MER-002', designation: 'Impression A4 Couleur', categorie: 'Fournitures de bureau', sousCategorie: 'Impression', unite: 'Page', prix: 250, dateEffet: '01/01/2026', dateFin: null, statut: 'Active' },
  { code: 'MER-003', designation: 'Taxi urbain', categorie: 'Transport', sousCategorie: 'Transport terrestre', unite: 'Course', prix: 3000, dateEffet: '01/01/2026', dateFin: null, statut: 'Active' },
  { code: 'MER-004', designation: 'Ramette papier A4', categorie: 'Fournitures de bureau', sousCategorie: 'Papeterie', unite: 'Unité', prix: 4500, dateEffet: '01/06/2026', dateFin: '31/08/2026', statut: 'Active' },
  { code: 'MER-005', designation: 'Ramette papier A4', categorie: 'Fournitures de bureau', sousCategorie: 'Papeterie', unite: 'Unité', prix: 5000, dateEffet: '01/09/2026', dateFin: null, statut: 'Active' },
  { code: 'MER-006', designation: 'Carburant essence', categorie: 'Carburant', sousCategorie: 'Essence', unite: 'Litre', prix: 750, dateEffet: '01/02/2026', dateFin: '15/05/2026', statut: 'Expirée' },
  { code: 'MER-007', designation: 'Carburant essence', categorie: 'Carburant', sousCategorie: 'Essence', unite: 'Litre', prix: 800, dateEffet: '16/05/2026', dateFin: null, statut: 'Active' },
  { code: 'MER-008', designation: 'Location salle réunion', categorie: 'Prestations de services', sousCategorie: 'Location', unite: 'Heure', prix: 10000, dateEffet: '01/01/2026', dateFin: null, statut: 'Active' },
  { code: 'MER-009', designation: 'Frais de mission (Admin)', categorie: 'Frais de mission', sousCategorie: 'Indemnités', unite: 'Jour', prix: 15000, dateEffet: '01/01/2026', dateFin: null, statut: 'Active' },
  { code: 'MER-010', designation: 'Hébergement hôtel 3*', categorie: 'Prestations de services', sousCategorie: 'Hébergement', unite: 'Nuit', prix: 25000, dateEffet: '01/03/2026', dateFin: null, statut: 'Active' },
]

const TOTAL_MERCURIALES = 128
const KPIS = [
  { icon: ListChecks, tone: 'purple', label: 'Nombre total de mercuriales', value: String(TOTAL_MERCURIALES) },
  { icon: Recycle, tone: 'green', label: 'Mercuriales actives', value: '112' },
  { icon: Archive, tone: 'orange', label: 'Mercuriales expirées', value: '10' },
  { icon: TrendingUp, tone: 'blue', label: 'À venir (programmées)', value: '6' },
]

const fmtPrix = (value: number) => value.toLocaleString('fr-FR')
const statutTone = (statut: Statut) => statut === 'Active' ? 'green' : statut === 'Expirée' ? 'orange' : 'blue'

type SortKey = 'code' | 'designation' | 'unite' | 'prix' | 'dateEffet' | 'dateFin' | 'statut'
type SortDir = 'asc' | 'desc'

function parseDateFr(date: string | null) {
  if (!date) return 0
  const [jour, mois, annee] = date.split('/').map(Number)
  return new Date(annee, mois - 1, jour).getTime()
}

function SortHeader({ sortKey, label, activeKey, onSort }: { sortKey: SortKey; label: string; activeKey: SortKey; onSort: (key: SortKey) => void }) {
  return (
    <th>
      <button type="button" className="mer-sort-btn" onClick={() => onSort(sortKey)}>
        {label}<ArrowUpDown size={11} className={activeKey === sortKey ? 'is-active' : ''} />
      </button>
    </th>
  )
}

export default function MercurialesPage({ navigateTo }: { navigateTo: (page: string) => void }) {
  const [mercuriales, setMercuriales] = useState<Mercuriale[]>(MERCURIALES_INITIAL)
  const [filterCategorie, setFilterCategorie] = useState('Toutes')
  const [filterSousCategorie, setFilterSousCategorie] = useState('Toutes')
  const [filterUnite, setFilterUnite] = useState('Toutes')
  const [filterStatut, setFilterStatut] = useState('Tous')
  const [refQuery, setRefQuery] = useState('')
  const [designationQuery, setDesignationQuery] = useState('')
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'code', dir: 'asc' })
  const [exportOpen, setExportOpen] = useState(false)

  const categories = useMemo(() => Array.from(new Set(MERCURIALES_INITIAL.map((m) => m.categorie))), [])
  const sousCategories = useMemo(() => Array.from(new Set(MERCURIALES_INITIAL.map((m) => m.sousCategorie))), [])
  const unites = useMemo(() => Array.from(new Set(MERCURIALES_INITIAL.map((m) => m.unite))), [])

  const toggleSort = (key: SortKey) => {
    setSort((current) => current.key === key ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })
  }

  const filtered = useMemo(() => {
    const list = mercuriales.filter((m) => (
      (filterCategorie === 'Toutes' || m.categorie === filterCategorie)
      && (filterSousCategorie === 'Toutes' || m.sousCategorie === filterSousCategorie)
      && (filterUnite === 'Toutes' || m.unite === filterUnite)
      && (filterStatut === 'Tous' || m.statut === filterStatut)
      && (refQuery.trim() === '' || m.code.toLowerCase().includes(refQuery.trim().toLowerCase()))
      && (designationQuery.trim() === '' || m.designation.toLowerCase().includes(designationQuery.trim().toLowerCase()))
    ))

    const sorted = [...list].sort((a, b) => {
      let cmp: number
      if (sort.key === 'prix') cmp = a.prix - b.prix
      else if (sort.key === 'dateEffet') cmp = parseDateFr(a.dateEffet) - parseDateFr(b.dateEffet)
      else if (sort.key === 'dateFin') cmp = parseDateFr(a.dateFin) - parseDateFr(b.dateFin)
      else cmp = a[sort.key].localeCompare(b[sort.key])
      return sort.dir === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [mercuriales, filterCategorie, filterSousCategorie, filterUnite, filterStatut, refQuery, designationQuery, sort])

  const resetFiltres = () => {
    setFilterCategorie('Toutes'); setFilterSousCategorie('Toutes'); setFilterUnite('Toutes')
    setFilterStatut('Tous'); setRefQuery(''); setDesignationQuery('')
  }

  const handleSupprimer = (code: string) => {
    setMercuriales((list) => list.filter((m) => m.code !== code))
  }

  return (
    <section className="mer-page">
      <div className="mer-title-row">
        <div>
          <h1>Mercuriales</h1>
          <p>Gestion des mercuriales (prix de référence) utilisées pour le contrôle des dépenses de trésorerie.</p>
          <button type="button" className="mer-link-btn" onClick={() => navigateTo('tresorerie-rapports')}>Voir le journal de la trésorerie</button>
        </div>
        <div className="mer-toolbar">
          <button type="button" className="mer-btn-outline"><Upload size={14} />Importer</button>
          <div className="mer-export-wrap">
            <button type="button" className="mer-btn-outline" onClick={() => setExportOpen((o) => !o)}>
              <Download size={14} />Exporter<ChevronDown size={12} />
            </button>
            {exportOpen && (
              <ul className="mer-export-menu" onMouseLeave={() => setExportOpen(false)}>
                <li><button type="button" onClick={() => setExportOpen(false)}>Exporter en PDF</button></li>
                <li><button type="button" onClick={() => setExportOpen(false)}>Exporter en Excel</button></li>
                <li><button type="button" onClick={() => setExportOpen(false)}>Exporter en CSV</button></li>
              </ul>
            )}
          </div>
          <button type="button" className="mer-btn-primary"><Plus size={14} />Nouvelle mercuriale</button>
        </div>
      </div>

      <div className="mer-filters">
        <label>Catégorie
          <select value={filterCategorie} onChange={(e) => setFilterCategorie(e.target.value)}>
            <option>Toutes</option>
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label>Sous-catégorie
          <select value={filterSousCategorie} onChange={(e) => setFilterSousCategorie(e.target.value)}>
            <option>Toutes</option>
            {sousCategories.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label>Unité
          <select value={filterUnite} onChange={(e) => setFilterUnite(e.target.value)}>
            <option>Toutes</option>
            {unites.map((u) => <option key={u}>{u}</option>)}
          </select>
        </label>
        <label>Statut
          <select value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)}>
            <option>Tous</option>
            <option>Active</option><option>Expirée</option><option>Programmée</option>
          </select>
        </label>
        <label>Période d'effet
          <button type="button" className="mer-daterange"><Calendar size={14} />01/06/2025 → 30/06/2025</button>
        </label>
        <label>Référence / Code
          <input placeholder="Rechercher un code" value={refQuery} onChange={(e) => setRefQuery(e.target.value)} />
        </label>
        <label>Désignation
          <input placeholder="Rechercher une désignation" value={designationQuery} onChange={(e) => setDesignationQuery(e.target.value)} />
        </label>
        <div className="mer-filters-actions">
          <button type="button" className="mer-btn-outline" onClick={resetFiltres}><RotateCcw size={14} />Réinitialiser</button>
          <button type="button" className="mer-btn-primary"><Search size={14} />Rechercher</button>
        </div>
      </div>

      <div className="mer-kpis">
        {KPIS.map((kpi) => (
          <article key={kpi.label} className={`mer-kpi mer-kpi-${kpi.tone}`}>
            <span className="mer-kpi-icon"><kpi.icon size={18} /></span>
            <div>
              <span>{kpi.label}</span>
              <strong>{kpi.value}</strong>
            </div>
          </article>
        ))}
      </div>

      <section className="mer-table-panel">
        <div className="mer-table-wrap">
          <table className="mer-table">
            <thead>
              <tr>
                <SortHeader sortKey="code" label="Code" activeKey={sort.key} onSort={toggleSort} />
                <SortHeader sortKey="designation" label="Désignation" activeKey={sort.key} onSort={toggleSort} />
                <th>Catégorie</th>
                <th>Sous-catégorie</th>
                <SortHeader sortKey="unite" label="Unité" activeKey={sort.key} onSort={toggleSort} />
                <SortHeader sortKey="prix" label={`Prix de référence (${currencySuffix()})`} activeKey={sort.key} onSort={toggleSort} />
                <SortHeader sortKey="dateEffet" label="Date d'effet" activeKey={sort.key} onSort={toggleSort} />
                <SortHeader sortKey="dateFin" label="Date de fin" activeKey={sort.key} onSort={toggleSort} />
                <SortHeader sortKey="statut" label="Statut" activeKey={sort.key} onSort={toggleSort} />
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="mer-empty-row">Aucune mercuriale ne correspond à ces filtres.</td></tr>
              )}
              {filtered.map((m) => (
                <tr key={m.code}>
                  <td className="mer-code">{m.code}</td>
                  <td className="mer-name">{m.designation}</td>
                  <td>{m.categorie}</td>
                  <td>{m.sousCategorie}</td>
                  <td>{m.unite}</td>
                  <td className="mer-prix">{fmtPrix(m.prix)}</td>
                  <td>{m.dateEffet}</td>
                  <td>{m.dateFin ?? <span className="mer-empty">—</span>}</td>
                  <td><span className={`mer-statut mer-statut-${statutTone(m.statut)}`}>{m.statut}</span></td>
                  <td>
                    <div className="mer-row-actions">
                      <button type="button" className="mer-icon-btn" aria-label="Modifier"><Pencil size={13} /></button>
                      <button type="button" className="mer-icon-btn" aria-label="Dupliquer"><Copy size={13} /></button>
                      <button type="button" className="mer-icon-btn danger" aria-label="Supprimer" onClick={() => handleSupprimer(m.code)}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mer-table-foot">
          <span>Affichage 1 à {filtered.length} sur {TOTAL_MERCURIALES} mercuriales</span>
          <div className="mer-table-foot-right">
            <nav className="mer-pagination" aria-label="Pagination">
              <button type="button" disabled><ChevronsLeft size={14} /></button>
              <button type="button" disabled><ChevronLeft size={14} /></button>
              <button type="button" className="is-active">1</button>
              <button type="button">2</button>
              <button type="button">3</button>
              <button type="button">4</button>
              <button type="button">5</button>
              <button type="button"><ChevronRight size={14} /></button>
              <button type="button"><ChevronsRight size={14} /></button>
            </nav>
            <label className="mer-page-size">
              <select defaultValue={10}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select>
              / page
            </label>
          </div>
        </div>
      </section>
    </section>
  )
}
