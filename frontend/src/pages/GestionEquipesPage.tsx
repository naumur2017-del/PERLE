import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download, Eye, FileText,
  Info, Network, Pencil, Plus, RotateCcw, Search, Users, Users2, X, MoreVertical,
} from 'lucide-react'
import { ColumnsMenu, useColumnVisibility, type ColumnDef } from '../components/ColumnsMenu'
import { fetchEmployees, fetchTeams, updateEmployee, type Employee, type StatutEmploye, type Team } from '../api/employees'
import { ApiError } from '../api/client'
import './GestionEquipesPage.css'

const errorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    const payload = error.payload as Record<string, unknown> | null
    if (payload && typeof payload === 'object') {
      const firstValue = Object.values(payload)[0]
      if (typeof firstValue === 'string') return firstValue
      if (Array.isArray(firstValue) && typeof firstValue[0] === 'string') return firstValue[0]
    }
    return 'La requête a échoué.'
  }
  return 'Impossible de contacter le serveur.'
}

type StatutLabel = 'Actif' | 'Inactif' | 'En congé'

interface Employe {
  id: number
  displayId: string
  nom: string
  email: string
  initiales: string
  couleur: string
  statut: StatutLabel
  statutValue: StatutEmploye
  fonction: string
  manager: string
  telephone: string
  matricule: string
  dateEmbauche: string
  role: 'Manager' | 'Membre'
  equipeNom: string
  grade: number
  cniDocument: string | null
  autrePieceDocument: string | null
  cvDocument: string | null
  contratDocument: string | null
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
    statutValue: employee.statut,
    fonction: employee.fonction || 'Non renseignée',
    manager: team?.manager ? `${team.manager.first_name} ${team.manager.last_name}` : '—',
    telephone: employee.phone || 'Non renseigné',
    matricule: employee.matricule || 'Non renseigné',
    dateEmbauche: formatDate(employee.date_embauche),
    role: isManager ? 'Manager' : 'Membre',
    equipeNom: employee.team?.name ?? 'Non affecté',
    grade: employee.grade,
    cniDocument: employee.cni_document,
    autrePieceDocument: employee.autre_piece_document,
    cvDocument: employee.cv_document,
    contratDocument: employee.contrat_document,
  }
}

const statutClass = (statut: StatutLabel) => {
  if (statut === 'Actif') return 'actif'
  if (statut === 'En congé') return 'conge'
  return 'inactif'
}

type EmployeColumnId = 'id' | 'employe' | 'statut' | 'equipe' | 'fonction' | 'grade' | 'dateEmbauche'

const EMPLOYE_COLUMNS: ColumnDef<EmployeColumnId>[] = [
  { id: 'id', label: 'ID Employé' },
  { id: 'employe', label: 'Employé' },
  { id: 'statut', label: 'Statut' },
  { id: 'equipe', label: 'Équipe' },
  { id: 'fonction', label: 'Fonction' },
  { id: 'grade', label: 'Grade' },
  { id: 'dateEmbauche', label: "Date d'embauche" },
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
  grade: { render: (e) => <span className="ge-grade-pill">{`G${e.grade}`}</span> },
  dateEmbauche: { render: (e) => e.dateEmbauche },
}

function InfosGeneralesTab({ employe }: { employe: Employe }) {
  const rows: [string, string][] = [
    ['Fonction', employe.fonction],
    ['Manager', employe.manager],
    ['Matricule', employe.matricule],
    ['Grade', `G${employe.grade}`],
    ['Date d’embauche', employe.dateEmbauche],
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

function Lightbox({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return createPortal(
    <div className="ge-lightbox-overlay" onClick={onClose}>
      <div className={`ge-lightbox${wide ? ' ge-lightbox-wide' : ''}`} onClick={(event) => event.stopPropagation()}>
        <div className="ge-lightbox-head">
          <h3>{title}</h3>
          <button type="button" aria-label="Fermer l’aperçu" onClick={onClose}><X size={16} strokeWidth={2} /></button>
        </div>
        <div className="ge-lightbox-body">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

type EmployeeDocField = 'cniDocument' | 'autrePieceDocument' | 'cvDocument' | 'contratDocument'

const EMPLOYEE_DOC_META: { field: EmployeeDocField; title: string; kind: 'image' | 'pdf' }[] = [
  { field: 'cniDocument', title: 'Carte Nationale d’Identité (CNI)', kind: 'image' },
  { field: 'autrePieceDocument', title: 'Autres pièces d’identité', kind: 'image' },
  { field: 'cvDocument', title: 'CV', kind: 'pdf' },
  { field: 'contratDocument', title: 'Contrat de travail', kind: 'pdf' },
]

function DocumentsTab({ employe }: { employe: Employe }) {
  const [openField, setOpenField] = useState<EmployeeDocField | null>(null)
  const openDoc = EMPLOYEE_DOC_META.find((doc) => doc.field === openField) ?? null
  const openUrl = openField ? employe[openField] : null

  return (
    <>
      <ul className="ge-doc-list">
        {EMPLOYEE_DOC_META.map((doc) => {
          const url = employe[doc.field]
          return (
            <li key={doc.field}>
              <span className="ge-doc-icon"><FileText size={14} /></span>
              <div>
                <strong>{doc.title}</strong>
                <small>{url ? 'Document disponible' : `Aucun document pour ${employe.nom}`}</small>
              </div>
              {url && (
                <button type="button" className="ge-doc-view-btn" onClick={() => setOpenField(doc.field)}>
                  <Eye size={13} strokeWidth={2} />Voir
                </button>
              )}
            </li>
          )
        })}
      </ul>

      {openDoc && openUrl && (
        <Lightbox title={openDoc.title} onClose={() => setOpenField(null)} wide={openDoc.kind === 'pdf'}>
          {openDoc.kind === 'image'
            ? <img src={openUrl} alt={openDoc.title} className="ge-lightbox-image" />
            : <iframe src={openUrl} title={openDoc.title} className="ge-pdf-frame" />}
        </Lightbox>
      )}
    </>
  )
}

function GradeModal({ employe, onClose, onSave }: { employe: Employe; onClose: () => void; onSave: (grade: number) => Promise<void> }) {
  const [grade, setGrade] = useState(employe.grade)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await onSave(grade)
      onClose()
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <div className="ge-modal-overlay" role="dialog" aria-modal="true" aria-label="Modifier le grade" onMouseDown={onClose}>
      <div className="ge-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="ge-modal-head">
          <h3>Modifier le grade</h3>
          <button type="button" className="ge-modal-close" onClick={onClose} aria-label="Fermer"><X size={16} /></button>
        </div>
        <p className="ge-modal-employee">{employe.nom}</p>
        {error && <p className="ge-form-error">{error}</p>}
        <div className="ge-grade-stepper">
          <button type="button" onClick={() => setGrade((g) => Math.max(0, g - 1))} disabled={grade <= 0} aria-label="Diminuer le grade">−</button>
          <span className="ge-grade-stepper-value">{`G${grade}`}</span>
          <button type="button" onClick={() => setGrade((g) => g + 1)} aria-label="Augmenter le grade">+</button>
        </div>
        <div className="ge-modal-actions">
          <button type="button" className="ge-btn-outline" onClick={onClose} disabled={saving}>Annuler</button>
          <button type="button" className="ge-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </div>
    </div>
  )
}

const STATUT_MENU_OPTIONS: { value: StatutEmploye; label: string }[] = [
  { value: 'actif', label: 'Actif' },
  { value: 'conge', label: 'Congés' },
  { value: 'inactif', label: 'Inactif' },
]

function StatutModal({ employe, onClose, onSave }: { employe: Employe; onClose: () => void; onSave: (statut: StatutEmploye) => Promise<void> }) {
  const [saving, setSaving] = useState<StatutEmploye | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSelect = async (statut: StatutEmploye) => {
    setSaving(statut)
    setError(null)
    try {
      await onSave(statut)
      onClose()
    } catch (err) {
      setError(errorMessage(err))
      setSaving(null)
    }
  }

  return (
    <div className="ge-modal-overlay" role="dialog" aria-modal="true" aria-label="Modifier le statut" onMouseDown={onClose}>
      <div className="ge-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="ge-modal-head">
          <h3>Modifier le statut</h3>
          <button type="button" className="ge-modal-close" onClick={onClose} aria-label="Fermer"><X size={16} /></button>
        </div>
        <p className="ge-modal-employee">{employe.nom}</p>
        {error && <p className="ge-form-error">{error}</p>}
        <div className="ge-statut-options">
          {STATUT_MENU_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={option.value === employe.statutValue ? 'is-selected' : ''}
              disabled={saving !== null}
              onClick={() => handleSelect(option.value)}
            >
              {saving === option.value ? 'Enregistrement…' : option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
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
  const [gradeModalId, setGradeModalId] = useState<number | null>(null)
  const [statutModalId, setStatutModalId] = useState<number | null>(null)
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

  const applyEmployeeUpdate = (id: number, data: { grade?: number; statut?: StatutEmploye }) =>
    updateEmployee(id, data).then((updated) => {
      setEmployees((prev) => prev.map((e) => e.id === id ? { ...e, grade: updated.grade, statut: updated.statut } : e))
    })

  const gradeModalEmploye = employes.find((e) => e.id === gradeModalId) ?? null
  const statutModalEmploye = employes.find((e) => e.id === statutModalId) ?? null

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
                          <button type="button" className="ge-row-action" aria-label="Modifier le grade" title="Modifier le grade" onClick={() => setGradeModalId(employe.id)}><Pencil size={13} /></button>
                          <button type="button" className="ge-row-action" aria-label="Modifier le statut" title="Modifier le statut" onClick={() => setStatutModalId(employe.id)}><MoreVertical size={13} /></button>
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

      {gradeModalEmploye && (
        <GradeModal
          employe={gradeModalEmploye}
          onClose={() => setGradeModalId(null)}
          onSave={(grade) => applyEmployeeUpdate(gradeModalEmploye.id, { grade })}
        />
      )}

      {statutModalEmploye && (
        <StatutModal
          employe={statutModalEmploye}
          onClose={() => setStatutModalId(null)}
          onSave={(statut) => applyEmployeeUpdate(statutModalEmploye.id, { statut })}
        />
      )}
    </section>
  )
}
