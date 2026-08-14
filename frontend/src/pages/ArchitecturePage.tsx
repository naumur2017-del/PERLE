import { useState, type ReactNode } from 'react'
import {
  Building2, CalendarClock, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Download,
  File, Folder, FolderKanban, FolderOpen, ListChecks, Pencil, Plus, Search, SlidersHorizontal,
  Trash2, Upload, UserCheck, Users,
} from 'lucide-react'
import { ColumnsMenu, useColumnVisibility, type ColumnDef } from '../components/ColumnsMenu'
import './ArchitecturePage.css'

interface CelluleNode {
  code: string
  label: string
  count: number
  children?: CelluleNode[]
}

const ARBORESCENCE: CelluleNode[] = [
  { code: 'DG', label: 'Direction générale', count: 23 },
  { code: 'DI', label: 'Direction Cameroun', count: 15 },
  {
    code: 'PI', label: 'Département Pilotage', count: 196,
    children: [
      { code: 'PIA', label: 'Pilotage opérationnel', count: 51 },
      {
        code: 'PIB', label: 'Pilotage de la gestion', count: 92,
        children: [
          { code: 'PIB1', label: 'Gestion de portefeuille de projets', count: 18 },
          {
            code: 'PIB2', label: 'Suivi des projets et tâches', count: 24,
            children: [
              { code: 'PIB21', label: 'Suivi des projets', count: 8 },
              { code: 'PIB22', label: 'Suivi des tâches', count: 9 },
              { code: 'PIB23', label: 'Reporting et tableau de bord', count: 7 },
            ],
          },
          { code: 'PIB3', label: 'Gestion des ressources', count: 15 },
        ],
      },
      { code: 'PIC', label: 'Pilotage méthodologique', count: 80 },
    ],
  },
  { code: 'BO', label: 'Back Office', count: 128 },
  { code: 'MO', label: 'Middle Office', count: 41 },
  { code: 'RE', label: 'Ressources', count: 67 },
  { code: 'FO', label: 'Front Office', count: 24 },
  { code: 'IT', label: 'Informatique', count: 10 },
]

interface Tache {
  code: string
  nom: string
  details: string
}

const TACHES: Tache[] = [
  { code: 'PIB221', nom: 'Planification du suivi des tâches', details: 'Définir la méthode et le calendrier de suivi des tâches.' },
  { code: 'PIB222', nom: 'Collecte des données d’avancement', details: 'Collecter les informations d’avancement auprès des responsables et des outils de suivi.' },
  { code: 'PIB223', nom: 'Mise à jour des statuts', details: 'Actualiser les statuts d’avancement des tâches dans l’outil de pilotage.' },
  { code: 'PIB224', nom: 'Suivi des échéances', details: 'Contrôler les dates d’échéance et identifier les écarts.' },
  { code: 'PIB225', nom: 'Détection des retards', details: 'Identifier les tâches en retard et analyser les causes.' },
  { code: 'PIB226', nom: 'Analyse des causes des retards', details: 'Analyser les causes profondes des retards constatés.' },
  { code: 'PIB227', nom: 'Escalade des points bloquants', details: 'Escalader les points bloquants aux niveaux appropriés.' },
  { code: 'PIB228', nom: 'Mise à jour du plan d’actions', details: 'Mettre à jour et suivre le plan d’actions associé aux retards.' },
  { code: 'PIB229', nom: 'Reporting hebdomadaire des tâches', details: 'Produire et diffuser le reporting hebdomadaire des tâches.' },
]

const SELECTED_CELLULE = 'PI - Département Pilotage'
const SELECTED_EQUIPE = 'PIB - Pilotage de la gestion'
const SELECTED_ACTIVITE = 'PIB22 - Suivi des tâches'
const SELECTED_NIVEAU = 5

const KPIS = [
  { icon: ListChecks, tone: 'purple', label: 'Tâches totales', value: '504', sub: '100% du référentiel' },
  { icon: Building2, tone: 'indigo', label: 'Cellules', value: '8', sub: '' },
  { icon: Users, tone: 'violet', label: 'Équipes', value: '20', sub: '' },
  { icon: Folder, tone: 'orange', label: 'Activités', value: '49', sub: '' },
  { icon: CheckCircle2, tone: 'green', label: 'Tâches actives', value: '478', sub: '94,84%' },
  { icon: CalendarClock, tone: 'indigo', label: 'Dernière mise à jour', value: '20/05/2025 16:20', sub: 'Par Ajara Lamare' },
]

const MODULES_LIES = [
  { icon: FolderKanban, label: 'Création de projet' },
  { icon: ListChecks, label: 'Pilotage des projets' },
  { icon: UserCheck, label: 'Staffing' },
]

type TacheColumnId = 'code' | 'nom' | 'cellule' | 'equipe' | 'activite' | 'niveau' | 'details'

const TACHE_COLUMNS: ColumnDef<TacheColumnId>[] = [
  { id: 'code', label: 'Code' },
  { id: 'nom', label: 'Nom de la tâche' },
  { id: 'cellule', label: 'Cellule / Division' },
  { id: 'equipe', label: 'Équipe' },
  { id: 'activite', label: 'Activité' },
  { id: 'niveau', label: 'Niveau' },
  { id: 'details', label: 'Détails de la tâche' },
]

const TACHE_CELL_DEFS: Record<TacheColumnId, { className?: string; render: (t: Tache) => ReactNode }> = {
  code: { className: 'arch-code', render: (t) => t.code },
  nom: { className: 'arch-name', render: (t) => t.nom },
  cellule: { render: () => SELECTED_CELLULE },
  equipe: { render: () => SELECTED_EQUIPE },
  activite: { render: () => SELECTED_ACTIVITE },
  niveau: { render: () => SELECTED_NIVEAU },
  details: { className: 'arch-details', render: (t) => t.details },
}

function findNode(nodes: CelluleNode[], code: string): CelluleNode | undefined {
  for (const node of nodes) {
    if (node.code === code) return node
    if (node.children) {
      const found = findNode(node.children, code)
      if (found) return found
    }
  }
  return undefined
}

function CelluleTree({ nodes, depth, expanded, onToggle, selected, onSelect }: {
  nodes: CelluleNode[]
  depth: number
  expanded: Set<string>
  onToggle: (code: string) => void
  selected: string
  onSelect: (code: string) => void
}) {
  return (
    <ul className="arch-tree">
      {nodes.map((node) => {
        const hasChildren = !!node.children?.length
        const isExpanded = expanded.has(node.code)
        const isSelected = selected === node.code
        return (
          <li key={node.code}>
            <div
              className={`arch-tree-row ${isSelected ? 'selected' : ''}`}
              style={{ paddingLeft: 10 + depth * 16 }}
              onClick={() => onSelect(node.code)}
            >
              {hasChildren ? (
                <button
                  type="button"
                  className="arch-tree-toggle"
                  onClick={(event) => { event.stopPropagation(); onToggle(node.code) }}
                  aria-label={isExpanded ? 'Réduire' : 'Développer'}
                >
                  {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </button>
              ) : <span className="arch-tree-toggle-spacer" />}
              <span className="arch-tree-node-icon">
                {hasChildren ? (isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />) : <File size={13} />}
              </span>
              <span className="arch-tree-code">{node.code}</span>
              <span className="arch-tree-label">- {node.label}</span>
              <span className="arch-tree-count">{node.count}</span>
            </div>
            {hasChildren && isExpanded && (
              <CelluleTree nodes={node.children!} depth={depth + 1} expanded={expanded} onToggle={onToggle} selected={selected} onSelect={onSelect} />
            )}
          </li>
        )
      })}
    </ul>
  )
}

export default function ArchitecturePage() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['PI', 'PIB', 'PIB2']))
  const [selected, setSelected] = useState('PIB22')
  const [search, setSearch] = useState('')
  const { hiddenColumns, toggleColumn, visibleColumns } = useColumnVisibility(TACHE_COLUMNS)

  const toggleNode = (code: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  const selectNode = (code: string) => {
    setSelected(code)
    const node = findNode(ARBORESCENCE, code)
    if (node?.children?.length) {
      setExpanded((prev) => new Set(prev).add(code))
    }
  }

  return (
    <section className="arch-page">
      <div className="arch-modules-banner">
        <span className="arch-modules-icon"><FolderKanban size={14} /></span>
        <span>Ce référentiel alimente les modules :</span>
        <div className="arch-modules-list">
          {MODULES_LIES.map((module) => (
            <span key={module.label} className="arch-module-chip"><module.icon size={12} />{module.label}</span>
          ))}
        </div>
      </div>

      <div className="arch-kpis">
        {KPIS.map((kpi) => (
          <article key={kpi.label} className={`arch-kpi arch-kpi-${kpi.tone}`}>
            <span className="arch-kpi-icon"><kpi.icon size={17} /></span>
            <div>
              <strong>{kpi.value}</strong>
              <span>{kpi.label}</span>
              {kpi.sub && <small>{kpi.sub}</small>}
            </div>
          </article>
        ))}
      </div>

      <div className="arch-main">
        <div className="arch-tree-panel">
          <h3>Arborescence des cellules</h3>
          <label className="arch-tree-search">
            <Search size={13} />
            <input placeholder="Rechercher une cellule, équipe..." value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
          <div className="arch-tree-wrap">
            <CelluleTree nodes={ARBORESCENCE} depth={0} expanded={expanded} onToggle={toggleNode} selected={selected} onSelect={selectNode} />
          </div>
        </div>

        <div className="arch-content">
          <h3>Liste des tâches</h3>
          <div className="arch-filters">
            <label>Division / Cellule<select defaultValue="Toutes"><option>Toutes</option></select></label>
            <label>Équipe<select defaultValue="Toutes"><option>Toutes</option></select></label>
            <label>Activité<select defaultValue="Toutes"><option>Toutes</option></select></label>
            <label>Niveau<select defaultValue="Tous"><option>Tous</option></select></label>
            <label className="arch-search">
              <Search size={13} />
              <input placeholder="Rechercher un code ou un nom de tâche..." />
            </label>
            <button type="button" className="arch-btn-outline"><SlidersHorizontal size={13} />Filtres avancés</button>
          </div>

          <div className="arch-toolbar">
            <button type="button" className="arch-btn-primary"><Plus size={14} />Nouvelle tâche</button>
            <button type="button" className="arch-btn-outline"><Upload size={14} />Importer l’architecture</button>
            <button type="button" className="arch-btn-outline"><Download size={14} />Exporter l’architecture</button>
            <ColumnsMenu columns={TACHE_COLUMNS} hiddenColumns={hiddenColumns} onToggle={toggleColumn} buttonClassName="arch-btn-outline" />
          </div>

          <div className="arch-table-panel">
            <div className="arch-table-wrap">
              <table className="arch-table">
                <thead>
                  <tr>
                    {visibleColumns.map((c) => <th key={c.id}>{c.label}</th>)}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {TACHES.map((tache) => (
                    <tr key={tache.code}>
                      {visibleColumns.map((c) => {
                        const def = TACHE_CELL_DEFS[c.id]
                        return <td key={c.id} className={def.className}>{def.render(tache)}</td>
                      })}
                      <td>
                        <div className="arch-actions">
                          <button type="button" className="arch-row-action" aria-label="Modifier"><Pencil size={13} /></button>
                          <button type="button" className="arch-row-action danger" aria-label="Supprimer"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="arch-table-foot">
              <span>Affichage de 1 à {TACHES.length} sur 504 tâches</span>
              <nav className="arch-pagination" aria-label="Pagination">
                <button type="button" disabled><ChevronLeft size={13} /></button>
                <button type="button" className="is-active">1</button>
                <button type="button">2</button>
                <button type="button">3</button>
                <button type="button">4</button>
                <button type="button">5</button>
                <span className="arch-page-ellipsis">…</span>
                <button type="button">51</button>
                <button type="button"><ChevronRight size={13} /></button>
              </nav>
              <label className="arch-page-size">Lignes par page
                <select defaultValue={10}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select>
              </label>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
