import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react'
import {
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download, Eye, FileText,
  Info, Network, Pencil, Plus, RotateCcw, Search, UploadCloud, Users, Users2, X, MoreVertical,
} from 'lucide-react'
import { ColumnsMenu, useColumnVisibility, type ColumnDef } from '../components/ColumnsMenu'
import { fetchEmployees, fetchTeams, type Employee, type StatutEmploye, type Team } from '../api/employees'
import './GestionEquipesPage.css'

type StatutLabel = 'Actif' | 'Inactif' | 'En congé'

interface Employe {
  id: number
  displayId: string
  nom: string
  email: string
  initiales: string
  couleur: string
  statut: StatutLabel
  fonction: string
  manager: string
  telephone: string
  matricule: string
  dateEntree: string
  role: 'Manager' | 'Membre'
  equipeNom: string
}

const STATUT_LABELS: Record<StatutEmploye, StatutLabel> = { actif: 'Actif', conge: 'En congé', inactif: 'Inactif' }
const AVATAR_COLORS = ['#4338ca', '#16a34a', '#f59e0b', '#db2777', '#0ea5e9', '#dc2626', '#0d9488', '#a855f7', '#6b7280', '#ea580c']

const initiales = (first: string, last: string) => `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
const couleurPour = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length]

const formatDate = (iso: string | null) => {
  if (!iso) return 'Non renseignée'
  return new Date(iso).toLocaleDateString('fr-FR')
}

const toEmploye = (employee: Employee, teams: Team[]): Employe => {
  const team = teams.find((t) => t.id === employee.team?.id)
  const isManager = team?.manager?.id === employee.id
  return {
    id: employee.id,
    displayId: `EMP-${String(employee.id).padStart(4, '0')}`,
    nom: `${employee.first_name} ${employee.last_name}`,
    email: employee.email,
    initiales: initiales(employee.first_name, employee.last_name),
    couleur: couleurPour(employee.id),
    statut: STATUT_LABELS[employee.statut],
    fonction: employee.fonction || 'Non renseignée',
    manager: team?.manager ? `${team.manager.first_name} ${team.manager.last_name}` : '—',
    telephone: employee.phone || 'Non renseigné',
    matricule: employee.matricule || 'Non renseigné',
    dateEntree: formatDate(employee.date_joined),
    role: isManager ? 'Manager' : 'Membre',
    equipeNom: employee.team?.name ?? 'Non affecté',
  }
}

const statutClass = (statut: StatutLabel) => {
  if (statut === 'Actif') return 'actif'
  if (statut === 'En congé') return 'conge'
  return 'inactif'
}

type EmployeColumnId = 'id' | 'employe' | 'statut' | 'equipe' | 'fonction' | 'dateEntree'

const EMPLOYE_COLUMNS: ColumnDef<EmployeColumnId>[] = [
  { id: 'id', label: 'ID Employé' },
  { id: 'employe', label: 'Employé' },
  { id: 'statut', label: 'Statut' },
  { id: 'equipe', label: 'Équipe' },
  { id: 'fonction', label: 'Fonction' },
  { id: 'dateEntree', label: "Date d'entrée" },
]

const EMPLOYE_CELL_DEFS: Record<EmployeColumnId, { className?: string; render: (e: Employe) => ReactNode }> = {
  id: { className: 'ge-code', render: (e) => e.displayId },
  employe: {
    render: (e) => (
      <div className="ge-employe-cell">
        <span className="ge-avatar" style={{ background: e.couleur }}>{e.initiales}</span>
        <div>
          <strong>{e.nom}</strong>
          <small>{e.email}</small>
        </div>
      </div>
    ),
  },
  statut: { render: (e) => <span className={`ge-pill ge-pill-${statutClass(e.statut)}`}>{e.statut}</span> },
  equipe: { render: (e) => e.equipeNom },
  fonction: { render: (e) => e.fonction },
  dateEntree: { render: (e) => e.dateEntree },
}

function InfosGeneralesTab({ employe }: { employe: Employe }) {
  const rows: [string, string][] = [
    ['Fonction', employe.fonction],
    ['Manager', employe.manager],
    ['Matricule', employe.matricule],
    ["Date d’entrée", employe.dateEntree],
    ['Téléphone', employe.telephone],
    ['Email', employe.email],
  ]
  return (
    <dl className="ge-info-grid">
      {rows.map(([label, value]) => (
        <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
      ))}
    </dl>
  )
}

function AffectationsTab({ employe }: { employe: Employe }) {
  return (
    <div className="ge-detail-section">
      <h4><Info size={13} />Affectation actuelle</h4>
      <div className="ge-detail-table-wrap">
        <table className="ge-detail-table">
          <thead>
            <tr><th>Équipe</th><th>Rôle</th><th>Statut</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>{employe.equipeNom}</td>
              <td><span className={`ge-grade-pill ${employe.role === 'Membre' ? 'ge-grade-pill-muted' : ''}`}>{employe.role}</span></td>
              <td><span className={`ge-pill ge-pill-${statutClass(employe.statut)}`}>{employe.statut}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

type DocKey = 'cv' | 'cni' | 'contrat'

const DOC_TYPES: { key: DocKey; label: string }[] = [
  { key: 'cv', label: 'CV' },
  { key: 'cni', label: 'CNI / Carte d’identité' },
  { key: 'contrat', label: 'Contrat de travail' },
]

function DocumentsTab({ employe }: { employe: Employe }) {
  const [files, setFiles] = useState<Record<DocKey, File | null>>({ cv: null, cni: null, contrat: null })

  const handleUpload = (key: DocKey, event: ChangeEvent<HTMLInputElement>) => {
    setFiles((prev) => ({ ...prev, [key]: event.target.files?.[0] ?? null }))
  }

  return (
    <ul className="ge-doc-list">
      {DOC_TYPES.map((doc) => {
        const file = files[doc.key]
        return (
          <li key={doc.key}>
            <span className="ge-doc-icon"><FileText size={14} /></span>
            <div>
              <strong>{doc.label}</strong>
              <small>{file ? file.name : `Aucun fichier pour ${employe.nom}`}</small>
            </div>
            <label className="ge-doc-upload-btn">
              <UploadCloud size={13} />{file ? 'Remplacer' : 'Téléverser'}
              <input type="file" className="ge-hidden-input" onChange={(event) => handleUpload(doc.key, event)} />
            </label>
          </li>
        )
      })}
    </ul>
  )
}

function DetailEmploye({ employe, onClose }: { employe: Employe; onClose: () => void }) {
  const [tab, setTab] = useState<'infos' | 'affectations' | 'documents'>('affectations')

  return (
    <aside className="ge-detail-panel">
      <div className="ge-detail-head">
        <span>Détail employé</span>
        <button type="button" className="ge-detail-close" onClick={onClose} aria-label="Fermer"><X size={15} /></button>
      </div>

      <div className="ge-detail-identity">
        <span className="ge-avatar ge-avatar-lg" style={{ background: employe.couleur }}>{employe.initiales}</span>
        <div>
          <div className="ge-detail-name-row">
            <strong>{employe.nom}</strong>
            <span className={`ge-pill ge-pill-${statutClass(employe.statut)}`}>{employe.statut}</span>
          </div>
          <span className="ge-detail-id">ID : {employe.displayId}</span>
          <span className="ge-detail-email">{employe.email}</span>
        </div>
      </div>

      <nav className="ge-detail-tabs">
        <button className={tab === 'infos' ? 'active' : ''} onClick={() => setTab('infos')}>Infos générales</button>
        <button className={tab === 'affectations' ? 'active' : ''} onClick={() => setTab('affectations')}>Affectation</button>
        <button className={tab === 'documents' ? 'active' : ''} onClick={() => setTab('documents')}>Documents</button>
      </nav>

      <div className="ge-detail-body">
        {tab === 'infos' && <InfosGeneralesTab employe={employe} />}
        {tab === 'affectations' && <AffectationsTab employe={employe} />}
        {tab === 'documents' && <DocumentsTab employe={employe} />}
      </div>
    </aside>
  )
}

export default function GestionEquipesPage({ navigateTo }: { navigateTo: (page: string) => void }) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [statutFiltre, setStatutFiltre] = useState('Tous')
  const [equipeFiltre, setEquipeFiltre] = useState('Tous')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const { hiddenColumns, toggleColumn, visibleColumns } = useColumnVisibility(EMPLOYE_COLUMNS)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchEmployees(), fetchTeams()])
      .then(([employeesData, teamsData]) => {
        if (cancelled) return
        setEmployees(employeesData)
        setTeams(teamsData)
        setSelectedId(employeesData[0]?.id ?? null)
      })
      .catch(() => { if (!cancelled) setLoadError('Impossible de charger les employés.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const employes = useMemo(() => employees.map((e) => toEmploye(e, teams)), [employees, teams])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return employes.filter((employe) => {
      const matchesQuery = !query
        || employe.nom.toLowerCase().includes(query)
        || employe.displayId.toLowerCase().includes(query)
        || employe.email.toLowerCase().includes(query)
      const matchesStatut = statutFiltre === 'Tous' || employe.statut === statutFiltre
      const matchesEquipe = equipeFiltre === 'Tous' || employe.equipeNom === equipeFiltre
      return matchesQuery && matchesStatut && matchesEquipe
    })
  }, [employes, search, statutFiltre, equipeFiltre])

  const isFiltered = search.trim() !== '' || statutFiltre !== 'Tous' || equipeFiltre !== 'Tous'
  const selected = employes.find((employe) => employe.id === selectedId) ?? null

  const kpis = [
    { icon: Users, tone: 'purple', label: 'Total employés', value: String(employes.length), sub: 'Dans l’organisation' },
    { icon: Users2, tone: 'pink', label: 'Employés actifs', value: String(employes.filter((e) => e.statut === 'Actif').length), sub: 'Statut actif' },
    { icon: Users2, tone: 'blue', label: 'Équipes', value: String(teams.length), sub: 'Dans l’organisation' },
  ]

  const resetFilters = () => {
    setSearch('')
    setStatutFiltre('Tous')
    setEquipeFiltre('Tous')
  }

  return (
    <section className="ge-page">
      <div className="ge-header-row">
        <nav className="ge-subtabs">
          <button className="active" onClick={() => navigateTo('gestion')}><Users size={14} />Employés</button>
          <button onClick={() => navigateTo('gestion-equipes')}><Users2 size={14} />Équipes</button>
          <button onClick={() => navigateTo('gestion-organigramme')}><Network size={14} />Organigramme</button>
        </nav>
        <div className="ge-header-actions">
          <button type="button" className="ge-btn-outline"><Download size={14} />Exporter</button>
        </div>
      </div>

      <div className="ge-kpis">
        {kpis.map((kpi) => (
          <article key={kpi.label} className={`ge-kpi ge-kpi-${kpi.tone}`}>
            <span className="ge-kpi-icon"><kpi.icon size={18} /></span>
            <div>
              <strong>{kpi.value}</strong>
              <span>{kpi.label}</span>
              <small>{kpi.sub}</small>
            </div>
          </article>
        ))}
      </div>

      <div className="ge-filters">
        <label className="ge-search">
          <Search size={14} />
          <input placeholder="Rechercher un employé (nom, ID, email...)" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
      </div>
      <div className="ge-filters">
        <label>Statut
          <select value={statutFiltre} onChange={(event) => setStatutFiltre(event.target.value)}>
            <option value="Tous">Tous les statuts</option>
            <option value="Actif">Actif</option>
            <option value="En congé">En congé</option>
            <option value="Inactif">Inactif</option>
          </select>
        </label>
        <label>Équipe
          <select value={equipeFiltre} onChange={(event) => setEquipeFiltre(event.target.value)}>
            <option value="Tous">Toutes les équipes</option>
            {teams.map((equipe) => <option key={equipe.id} value={equipe.name}>{equipe.name}</option>)}
          </select>
        </label>
        <button type="button" className="ge-reset" onClick={resetFilters}><RotateCcw size={14} />Réinitialiser</button>
      </div>

      {loading && <p className="ge-detail-empty">Chargement des employés…</p>}
      {loadError && <p className="ge-detail-empty">{loadError}</p>}

      {!loading && !loadError && (
        <div className={`ge-main ${selected ? '' : 'ge-main-full'}`}>
          <div className="ge-table-panel">
            <div className="ge-table-head">
              <h3>Liste des employés ({filtered.length})</h3>
              <ColumnsMenu columns={EMPLOYE_COLUMNS} hiddenColumns={hiddenColumns} onToggle={toggleColumn} />
            </div>
            <div className="ge-table-wrap">
              <table className="ge-table">
                <thead>
                  <tr>
                    {visibleColumns.map((c) => <th key={c.id}>{c.label}</th>)}
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((employe) => (
                    <tr
                      key={employe.id}
                      className={employe.id === selectedId ? 'is-selected' : ''}
                      onClick={() => setSelectedId(employe.id)}
                    >
                      {visibleColumns.map((c) => {
                        const def = EMPLOYE_CELL_DEFS[c.id]
                        return <td key={c.id} className={def.className}>{def.render(employe)}</td>
                      })}
                      <td onClick={(event) => event.stopPropagation()}>
                        <div className="ge-actions">
                          <button type="button" className="ge-row-action" aria-label="Voir le détail" onClick={() => setSelectedId(employe.id)}><Eye size={13} /></button>
                          <button type="button" className="ge-row-action" aria-label="Modifier" title="Modifier"><Pencil size={13} /></button>
                          <button type="button" className="ge-row-action" aria-label="Actions" title="Autres actions"><MoreVertical size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={visibleColumns.length + 1} className="ge-detail-empty">Aucun employé ne correspond à votre recherche.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="ge-table-foot">
              <span>
                {isFiltered
                  ? `${filtered.length} employé${filtered.length > 1 ? 's' : ''} trouvé${filtered.length > 1 ? 's' : ''}`
                  : `${employes.length} employé${employes.length > 1 ? 's' : ''} au total`}
              </span>
              <div className="ge-table-foot-right">
                <label className="ge-page-size">
                  <select defaultValue="10"><option value="10">10</option><option value="25">25</option><option value="50">50</option></select>
                </label>
                <nav className="ge-pagination" aria-label="Pagination">
                  <button type="button" disabled><ChevronsLeft size={14} /></button>
                  <button type="button" disabled><ChevronLeft size={14} /></button>
                  <button type="button" className="is-active">1</button>
                  <button type="button" disabled><ChevronRight size={14} /></button>
                  <button type="button" disabled><ChevronsRight size={14} /></button>
                </nav>
              </div>
            </div>
          </div>

          {selected && <DetailEmploye key={selected.id} employe={selected} onClose={() => setSelectedId(null)} />}
        </div>
      )}

      <div className="ge-legend-info">
        <Info size={14} />
        <span>Un employé apparaît ici dès qu’il crée un compte ou rejoint votre organisation.</span>
      </div>

      {!loading && !loadError && !selected && employes.length > 0 && (
        <button type="button" className="ge-reopen-detail" onClick={() => setSelectedId(employes[0].id)}>
          <Plus size={14} />Afficher le détail d’un employé
        </button>
      )}
    </section>
  )
}
