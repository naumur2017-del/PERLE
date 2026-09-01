import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  Check, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Copy, Download, Eye, EyeOff, FileText,
  History, Inbox, Info, Network, Pencil, Plus, RotateCcw, Search, Share2, Users, Users2, X, MoreVertical,
} from 'lucide-react'
import { ColumnsMenu, useColumnVisibility, type ColumnDef } from '../components/ColumnsMenu'
import { createEmployee, editEmployee, fetchEmployees, fetchTeams, updateEmployee, type Employee, type StatutEmploye, type Team } from '../api/employees'
import { ApiError } from '../api/client'
import CountrySelect from '../components/CountrySelect'
import RegionSelect from '../components/RegionSelect'
import PhoneInput from '../components/PhoneInput'
import DatePicker from '../components/DatePicker'
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

interface GradeHistoryRow {
  id: number
  date: string
  ancien: number | null
  nouveau: number
  par: string
}

interface AffectationHistoryRow {
  id: number
  date: string
  ancienne: string
  nouvelle: string
  par: string
}

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
  gradeHistory: GradeHistoryRow[]
  affectationHistory: AffectationHistoryRow[]
}

const STATUT_LABELS: Record<StatutEmploye, StatutLabel> = { actif: 'Actif', conge: 'En congé', inactif: 'Inactif' }
const AVATAR_COLORS = ['#4338ca', '#16a34a', '#f59e0b', '#db2777', '#0ea5e9', '#dc2626', '#0d9488', '#a855f7', '#6b7280', '#ea580c']

const initiales = (first: string, last: string) => `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
const couleurPour = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length]

const formatDate = (iso: string | null) => {
  if (!iso) return 'Non renseignée'
  return new Date(iso).toLocaleDateString('fr-FR')
}

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })

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
    gradeHistory: employee.grade_history.map((entry) => ({
      id: entry.id,
      date: formatDateTime(entry.changed_at),
      ancien: entry.ancien_grade,
      nouveau: entry.nouveau_grade,
      par: entry.changed_by ?? 'Système',
    })),
    affectationHistory: employee.affectation_history.map((entry) => ({
      id: entry.id,
      date: formatDateTime(entry.changed_at),
      ancienne: entry.ancienne_equipe?.name ?? 'Non affecté',
      nouvelle: entry.nouvelle_equipe?.name ?? 'Non affecté',
      par: entry.changed_by ?? 'Système',
    })),
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
    <>
      <dl className="ge-info-grid">
        {rows.map(([label, value]) => (
          <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
        ))}
      </dl>

      <div className="ge-detail-section ge-detail-section-title-spaced">
        <h4><Info size={13} />Historique de grade</h4>
        {employe.gradeHistory.length === 0 ? (
          <p className="ge-detail-empty">Aucun changement de grade enregistré.</p>
        ) : (
          <div className="ge-detail-table-wrap">
            <table className="ge-detail-table">
              <thead>
                <tr><th>Date</th><th>Changement</th><th>Modifié par</th></tr>
              </thead>
              <tbody>
                {employe.gradeHistory.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.date}</td>
                    <td>{entry.ancien !== null ? `G${entry.ancien} → G${entry.nouveau}` : `G${entry.nouveau}`}</td>
                    <td>{entry.par}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

function AffectationsTab({ employe }: { employe: Employe }) {
  return (
    <>
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

      <div className="ge-detail-section ge-detail-section-title-spaced">
        <h4><Info size={13} />Historique des affectations</h4>
        {employe.affectationHistory.length === 0 ? (
          <p className="ge-detail-empty">Aucun changement d’affectation enregistré.</p>
        ) : (
          <div className="ge-detail-table-wrap">
            <table className="ge-detail-table">
              <thead>
                <tr><th>Date</th><th>Changement</th><th>Modifié par</th></tr>
              </thead>
              <tbody>
                {employe.affectationHistory.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.date}</td>
                    <td>{entry.ancienne} → {entry.nouvelle}</td>
                    <td>{entry.par}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
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

function RowActionsMenu({ onEdit, onEditStatut }: { onEdit: () => void; onEditStatut: () => void }) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const toggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPosition({ top: rect.bottom + 6, left: rect.right - 190 })
    }
    setOpen((value) => !value)
  }

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        ref={buttonRef}
        className="ge-row-action"
        aria-label="Plus d’actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
      >
        <MoreVertical size={13} />
      </button>
      {open && position && createPortal(
        <>
          <div className="ge-row-menu-backdrop" onClick={() => setOpen(false)} />
          <div className="ge-row-menu-list" role="menu" style={{ top: position.top, left: position.left }}>
            <button type="button" role="menuitem" onClick={() => { setOpen(false); onEdit() }}>
              <Pencil size={13} strokeWidth={2} />Modifier
            </button>
            <button type="button" role="menuitem" onClick={() => { setOpen(false); onEditStatut() }}>
              <Check size={13} strokeWidth={2} />Modifier le statut
            </button>
          </div>
        </>,
        document.body,
      )}
    </>
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

type CreateEmployeeForm = {
  first_name: string
  last_name: string
  email: string
  password: string
  phone: string
  fonction: string
  matricule: string
  date_naissance: string
  pays: string
  pays_code: string
  ville: string
  statut: StatutEmploye
  grade: string
  team_id: string
  date_embauche: string
  type_contrat: string
  periode_essai: string
  temps_travail: string
  competences_principales: string
  competences_secondaires: string
  cnps: string
  contribuable: string
  banque: string
  compte_bancaire: string
  groupe_sanguin: string
  contact_urgence_nom: string
  contact_urgence_telephone: string
  assurance_sante: string
}

type CreateEmployeeFiles = {
  profile_photo: File | null
  cni_document: File | null
  autre_piece_document: File | null
  cv_document: File | null
  contrat_document: File | null
}

type Credentials = { name: string; email: string; password: string }

const EMPTY_CREATE_FORM: CreateEmployeeForm = {
  first_name: '', last_name: '', email: '', password: '', phone: '', fonction: '', matricule: '',
  date_naissance: '', pays: '', pays_code: '', ville: '', statut: 'actif', grade: '0', team_id: '', date_embauche: '',
  type_contrat: '', periode_essai: '', temps_travail: '', competences_principales: '',
  competences_secondaires: '', cnps: '', contribuable: '', banque: '', compte_bancaire: '',
  groupe_sanguin: '', contact_urgence_nom: '', contact_urgence_telephone: '', assurance_sante: '',
}

const EMPTY_CREATE_FILES: CreateEmployeeFiles = {
  profile_photo: null, cni_document: null, autre_piece_document: null, cv_document: null, contrat_document: null,
}

const employeeToForm = (employee: Employee): CreateEmployeeForm => ({
  first_name: employee.first_name,
  last_name: employee.last_name,
  email: employee.email,
  password: '',
  phone: employee.phone,
  fonction: employee.fonction,
  matricule: employee.matricule,
  date_naissance: employee.date_naissance ?? '',
  pays: employee.pays,
  pays_code: employee.pays_code,
  ville: employee.ville,
  statut: employee.statut,
  grade: String(employee.grade),
  team_id: employee.team ? String(employee.team.id) : '',
  date_embauche: employee.date_embauche ?? '',
  type_contrat: employee.type_contrat,
  periode_essai: employee.periode_essai,
  temps_travail: employee.temps_travail,
  competences_principales: employee.competences_principales,
  competences_secondaires: employee.competences_secondaires,
  cnps: employee.cnps,
  contribuable: employee.contribuable,
  banque: employee.banque,
  compte_bancaire: employee.compte_bancaire,
  groupe_sanguin: employee.groupe_sanguin,
  contact_urgence_nom: employee.contact_urgence_nom,
  contact_urgence_telephone: employee.contact_urgence_telephone,
  assurance_sante: employee.assurance_sante,
})

function CreateEmployeeModal({ teams, employee, onClose, onCreated, onUpdated }: {
  teams: Team[]
  employee?: Employee | null
  onClose: () => void
  onCreated?: (employee: Employee, credentials: Credentials) => void
  onUpdated?: (employee: Employee) => void
}) {
  const isEdit = Boolean(employee)
  const [form, setForm] = useState<CreateEmployeeForm>(() => employee ? employeeToForm(employee) : EMPTY_CREATE_FORM)
  const [files, setFiles] = useState<CreateEmployeeFiles>(EMPTY_CREATE_FILES)
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (field: keyof CreateEmployeeForm) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((previous) => ({ ...previous, [field]: event.target.value }))
  }

  const handleDateChange = (field: keyof CreateEmployeeForm) => (value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }))
  }

  const handleFile = (field: keyof CreateEmployeeFiles) => (event: ChangeEvent<HTMLInputElement>) => {
    setFiles((previous) => ({ ...previous, [field]: event.target.files?.[0] ?? null }))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    const payload = new FormData()
    Object.entries(form).forEach(([key, value]) => {
      if (value !== '') payload.append(key, value)
    })
    Object.entries(files).forEach(([key, value]) => {
      if (value) payload.append(key, value)
    })

    try {
      if (isEdit && employee) {
        const updated = await editEmployee(employee.id, payload)
        onUpdated?.(updated)
      } else {
        const created = await createEmployee(payload)
        onCreated?.(created, {
          name: `${created.first_name} ${created.last_name}`,
          email: created.email,
          password: form.password,
        })
      }
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <div className="ge-modal-overlay" role="dialog" aria-modal="true" aria-label={isEdit ? 'Modifier un employé' : 'Ajouter un employé'} onMouseDown={() => { if (!saving) onClose() }}>
      <div className="ge-modal ge-create-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="ge-modal-head">
          <div>
            <h3>{isEdit ? 'Modifier un employé' : 'Ajouter un employé'}</h3>
            <p className="ge-modal-subtitle">{isEdit ? 'Mettez à jour son profil.' : 'Créez son profil et ses identifiants de connexion.'}</p>
          </div>
          <button type="button" className="ge-modal-close" onClick={onClose} aria-label="Fermer" disabled={saving}><X size={16} /></button>
        </div>

        <form className="ge-create-form" onSubmit={handleSubmit}>
          {error && <p className="ge-form-error">{error}</p>}

          <fieldset>
            <legend>Informations personnelles</legend>
            <div className="ge-form-grid">
              <label>Prénom *<input required value={form.first_name} onChange={handleChange('first_name')} /></label>
              <label>Nom *<input required value={form.last_name} onChange={handleChange('last_name')} /></label>
              <label>Email professionnel *<input required type="email" value={form.email} onChange={handleChange('email')} /></label>
              <label>{isEdit ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe *'}
                <span className="ge-password-field">
                  <input required={!isEdit} minLength={8} type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={form.password} onChange={handleChange('password')} />
                  <button type="button" aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} onClick={() => setShowPassword((value) => !value)}>
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </span>
              </label>
              <PhoneInput
                name="phone" label="Téléphone" countryCode={form.pays_code || null} value={form.phone}
                onChange={(v) => setForm((previous) => ({ ...previous, phone: v }))}
              />
              <label>Matricule<input value={form.matricule} onChange={handleChange('matricule')} /></label>
              <DatePicker label="Date de naissance" value={form.date_naissance} onChange={handleDateChange('date_naissance')} />
              <CountrySelect
                name="pays" label="Pays" value={form.pays_code || null}
                onChange={(c) => setForm((previous) => ({ ...previous, pays: c?.name ?? '', pays_code: c?.isoCode ?? '' }))}
              />
              <RegionSelect
                name="ville" label="Ville" countryCode={form.pays_code || null} value={form.ville}
                onChange={(v) => setForm((previous) => ({ ...previous, ville: v }))}
              />
              <label>Photo de profil<input type="file" accept="image/*" onChange={handleFile('profile_photo')} /></label>
            </div>
          </fieldset>

          <fieldset>
            <legend>Informations professionnelles</legend>
            <div className="ge-form-grid">
              <label>Poste / Fonction<input value={form.fonction} onChange={handleChange('fonction')} /></label>
              <label>Grade<input type="number" min="0" value={form.grade} onChange={handleChange('grade')} /></label>
              <label>Statut
                <select value={form.statut} onChange={handleChange('statut')}>
                  <option value="actif">Actif</option><option value="conge">En congé</option><option value="inactif">Inactif</option>
                </select>
              </label>
              <label>Équipe / Département
                <select value={form.team_id} onChange={handleChange('team_id')}>
                  <option value="">Non affecté</option>
                  {teams.map((team) => <option key={team.id} value={team.id}>{team.code} — {team.name}</option>)}
                </select>
              </label>
              <DatePicker label="Date d’embauche" value={form.date_embauche} onChange={handleDateChange('date_embauche')} />
              <label>Type de contrat
                <select value={form.type_contrat} onChange={handleChange('type_contrat')}>
                  <option value="">Non renseigné</option><option value="cdi">CDI</option><option value="cdd">CDD</option><option value="stage">Stage</option><option value="alternance">Alternance</option><option value="consultant">Consultant</option>
                </select>
              </label>
              <label>Période d’essai
                <select value={form.periode_essai} onChange={handleChange('periode_essai')}>
                  <option value="">Non renseignée</option><option value="en_cours">En cours</option><option value="terminee">Terminée</option>
                </select>
              </label>
              <label>Temps de travail
                <select value={form.temps_travail} onChange={handleChange('temps_travail')}>
                  <option value="">Non renseigné</option><option value="temps_plein">Temps plein</option><option value="temps_partiel">Temps partiel</option>
                </select>
              </label>
              <label className="ge-form-wide">Compétences principales<textarea rows={2} placeholder="Séparez les compétences par des virgules" value={form.competences_principales} onChange={handleChange('competences_principales')} /></label>
              <label className="ge-form-wide">Compétences secondaires<textarea rows={2} placeholder="Séparez les compétences par des virgules" value={form.competences_secondaires} onChange={handleChange('competences_secondaires')} /></label>
            </div>
          </fieldset>

          <fieldset>
            <legend>Documents officiels</legend>
            <div className="ge-form-grid">
              <label>CNI (JPG ou PNG)<input type="file" accept="image/*" onChange={handleFile('cni_document')} /></label>
              <label>Autre pièce d’identité<input type="file" accept="image/*" onChange={handleFile('autre_piece_document')} /></label>
              <label>CV (PDF)<input type="file" accept="application/pdf" onChange={handleFile('cv_document')} /></label>
              <label>Contrat de travail (PDF)<input type="file" accept="application/pdf" onChange={handleFile('contrat_document')} /></label>
            </div>
          </fieldset>

          <fieldset>
            <legend>Autres informations</legend>
            <div className="ge-form-grid">
              <label>N° CNPS<input value={form.cnps} onChange={handleChange('cnps')} /></label>
              <label>N° contribuable<input value={form.contribuable} onChange={handleChange('contribuable')} /></label>
              <label>Banque<input value={form.banque} onChange={handleChange('banque')} /></label>
              <label>N° compte bancaire<input value={form.compte_bancaire} onChange={handleChange('compte_bancaire')} /></label>
              <label>Groupe sanguin<input value={form.groupe_sanguin} onChange={handleChange('groupe_sanguin')} /></label>
              <label>Assurance santé<input value={form.assurance_sante} onChange={handleChange('assurance_sante')} /></label>
              <label>Contact d’urgence — Nom<input value={form.contact_urgence_nom} onChange={handleChange('contact_urgence_nom')} /></label>
              <label>Contact d’urgence — Téléphone<input value={form.contact_urgence_telephone} onChange={handleChange('contact_urgence_telephone')} /></label>
            </div>
          </fieldset>

          <div className="ge-modal-actions ge-create-actions">
            <button type="button" className="ge-btn-outline" onClick={onClose} disabled={saving}>Annuler</button>
            <button type="submit" className="ge-btn-primary" disabled={saving}>
              {isEdit ? <Pencil size={14} /> : <Plus size={14} />}
              {isEdit ? (saving ? 'Enregistrement…' : 'Enregistrer les modifications') : (saving ? 'Création…' : 'Créer l’employé')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CredentialsModal({ credentials, onClose }: { credentials: Credentials; onClose: () => void }) {
  const [notice, setNotice] = useState<string | null>(null)
  const text = `Vos identifiants de connexion PERLE\nNom : ${credentials.name}\nE-mail : ${credentials.email}\nMot de passe : ${credentials.password}`

  const writeToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      const copied = document.execCommand('copy')
      textarea.remove()
      return copied
    }
  }

  const copyCredentials = async () => {
    const copied = await writeToClipboard()
    setNotice(copied ? 'Identifiants copiés dans le presse-papiers.' : 'La copie automatique est indisponible. Sélectionnez les informations ci-dessous.')
  }

  const shareCredentials = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Identifiants PERLE', text })
        setNotice('Fenêtre de partage ouverte.')
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setNotice('Le partage n’a pas pu être ouvert.')
      }
      return
    }
    const copied = await writeToClipboard()
    setNotice(copied
      ? 'Le partage direct n’est pas disponible : les identifiants ont été copiés.'
      : 'Le partage direct et la copie automatique ne sont pas disponibles sur ce navigateur.')
  }

  return (
    <div className="ge-modal-overlay" role="dialog" aria-modal="true" aria-label="Identifiants de connexion">
      <div className="ge-modal ge-credentials-modal">
        <div className="ge-credentials-success"><Check size={22} /></div>
        <div className="ge-credentials-title">
          <h3>Employé créé avec succès</h3>
          <p>Transmettez ces identifiants à l’employé avant de fermer cette fenêtre.</p>
        </div>
        <dl className="ge-credentials-list">
          <div><dt>Nom</dt><dd>{credentials.name}</dd></div>
          <div><dt>E-mail</dt><dd>{credentials.email}</dd></div>
          <div><dt>Mot de passe</dt><dd>{credentials.password}</dd></div>
        </dl>
        <p className="ge-credentials-warning">Par sécurité, le mot de passe ne sera plus affiché après la fermeture.</p>
        {notice && <p className="ge-share-notice" role="status">{notice}</p>}
        <div className="ge-credentials-actions">
          <button type="button" className="ge-btn-outline" onClick={copyCredentials}><Copy size={14} />Copier</button>
          <button type="button" className="ge-btn-primary" onClick={shareCredentials}><Share2 size={14} />Partager</button>
        </div>
        <button type="button" className="ge-credentials-close" onClick={onClose}>Fermer</button>
      </div>
    </div>
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
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editEmployeeId, setEditEmployeeId] = useState<number | null>(null)
  const [credentials, setCredentials] = useState<Credentials | null>(null)
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
      setEmployees((prev) => prev.map((e) => e.id === id ? updated : e))
    })

  const gradeModalEmploye = employes.find((e) => e.id === gradeModalId) ?? null
  const statutModalEmploye = employes.find((e) => e.id === statutModalId) ?? null
  const employeeBeingEdited = employees.find((e) => e.id === editEmployeeId) ?? null

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

  const handleEmployeeCreated = (employee: Employee, createdCredentials: Credentials) => {
    setEmployees((previous) => [...previous, employee].sort((a, b) =>
      `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`, 'fr')
    ))
    setSelectedId(employee.id)
    setCreateModalOpen(false)
    setCredentials(createdCredentials)
  }

  const handleEmployeeUpdated = (employee: Employee) => {
    setEmployees((previous) => previous.map((e) => e.id === employee.id ? employee : e))
    setEditEmployeeId(null)
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
          <button type="button" className="ge-btn-primary" onClick={() => setCreateModalOpen(true)}><Plus size={14} />Ajouter un employé</button>
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
        <button type="button" className="ge-reset" onClick={() => navigateTo('gestion-historique')}><History size={14} />Historique</button>
        <button type="button" className="ge-reset" onClick={() => navigateTo('gestion-demandes')}><Inbox size={14} />Demandes</button>
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
                          <RowActionsMenu
                            onEdit={() => setEditEmployeeId(employe.id)}
                            onEditStatut={() => setStatutModalId(employe.id)}
                          />
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

      {createModalOpen && (
        <CreateEmployeeModal teams={teams} onClose={() => setCreateModalOpen(false)} onCreated={handleEmployeeCreated} />
      )}

      {employeeBeingEdited && (
        <CreateEmployeeModal
          teams={teams}
          employee={employeeBeingEdited}
          onClose={() => setEditEmployeeId(null)}
          onUpdated={handleEmployeeUpdated}
        />
      )}

      {credentials && <CredentialsModal credentials={credentials} onClose={() => setCredentials(null)} />}
    </section>
  )
}
