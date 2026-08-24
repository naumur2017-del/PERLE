import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  ArrowUpDown, ChevronDown, ChevronRight, ChevronsLeft, ChevronsRight, ChevronLeft, MoreVertical,
  Network, Plus, Search, UserPlus, Users, Users2, X,
} from 'lucide-react'
import { addTeamMember, createTeam, fetchEmployees, fetchTeams, removeTeamMember, type Employee, type Team, type TeamMember } from '../api/employees'
import { ApiError } from '../api/client'
import './GestionEquipesPage.css'
import './EquipesPage.css'

const AVATAR_COLORS = ['#4338ca', '#16a34a', '#f59e0b', '#db2777', '#0ea5e9', '#dc2626', '#0d9488', '#a855f7', '#6b7280', '#ea580c']
const initiales = (first: string, last: string) => `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
const couleurPour = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length]
const nomComplet = (person: { first_name: string; last_name: string }) => `${person.first_name} ${person.last_name}`

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

type SortKey = 'code' | 'nom' | 'manager' | 'membres' | 'membresActifs'
type SortDir = 'asc' | 'desc'

const nbActifs = (equipe: Team) => equipe.members.filter((m) => m.statut === 'actif').length

function SortHeader({ sortKey, label, activeKey, onSort }: { sortKey: SortKey; label: string; activeKey: SortKey; onSort: (key: SortKey) => void }) {
  return (
    <th>
      <button type="button" className="eq-sort-btn" onClick={() => onSort(sortKey)}>
        {label}<ArrowUpDown size={11} className={activeKey === sortKey ? 'is-active' : ''} />
      </button>
    </th>
  )
}

function CreateEquipeModal({ employees, onClose, onCreate }: { employees: Employee[]; onClose: () => void; onCreate: (nom: string, managerId: number | null, memberIds: number[]) => Promise<void> }) {
  const [nom, setNom] = useState('')
  const [managerId, setManagerId] = useState<number | null>(null)
  const [memberIds, setMemberIds] = useState<number[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const disponibles = employees.filter((e) => !memberIds.includes(e.id))
  const members = employees.filter((e) => memberIds.includes(e.id))

  const addMembre = (id: number) => {
    if (!Number.isNaN(id)) setMemberIds((current) => [...current, id])
  }

  const removeMembre = (id: number) => {
    setMemberIds((current) => current.filter((memberId) => memberId !== id))
    if (managerId === id) setManagerId(null)
  }

  const chooseManager = (id: number | null) => {
    setManagerId(id)
    if (id !== null && !memberIds.includes(id)) addMembre(id)
  }

  const canCreate = nom.trim() !== '' && !submitting

  const handleSubmit = async () => {
    if (!canCreate) return
    setSubmitting(true)
    setError(null)
    try {
      await onCreate(nom.trim(), managerId, memberIds.filter((id) => id !== managerId))
    } catch (err) {
      setError(errorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <div className="eq-modal-overlay" role="dialog" aria-modal="true" aria-label="Créer une équipe" onMouseDown={onClose}>
      <div className="eq-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="eq-modal-head">
          <div>
            <h3>Créer une équipe</h3>
            <p>Définissez son nom, son manager et ses membres.</p>
          </div>
          <button type="button" className="eq-modal-close" onClick={onClose} aria-label="Fermer"><X size={16} /></button>
        </div>

        {error && <p className="form-error">{error}</p>}

        <label className="eq-modal-field">Nom de l'équipe *
          <input autoFocus placeholder="Ex. Support Client" value={nom} onChange={(event) => setNom(event.target.value)} />
        </label>

        <label className="eq-modal-field">Manager
          <select value={managerId ?? ''} onChange={(event) => chooseManager(event.target.value ? Number(event.target.value) : null)}>
            <option value="">Non assigné</option>
            {employees.map((p) => <option key={p.id} value={p.id}>{nomComplet(p)} — {p.fonction || 'Sans fonction'}</option>)}
          </select>
        </label>

        <label className="eq-modal-field">Ajouter un membre
          <select value="" onChange={(event) => addMembre(Number(event.target.value))} disabled={disponibles.length === 0}>
            <option value="">{disponibles.length === 0 ? 'Tous les employés sont déjà membres' : 'Sélectionner un employé...'}</option>
            {disponibles.map((p) => <option key={p.id} value={p.id}>{nomComplet(p)} — {p.fonction || 'Sans fonction'}</option>)}
          </select>
        </label>

        <div className="eq-modal-field">
          <div className="eq-modal-members-head">
            <span>Membres de l'équipe</span>
            <span className="eq-modal-members-count">{members.length} sélectionné(s)</span>
          </div>
          {members.length === 0 ? (
            <p className="eq-modal-member-empty">Aucun membre pour le moment. Ajoutez-en via la liste ci-dessus.</p>
          ) : (
            <ul className="eq-modal-member-list">
              {members.map((m) => (
                <li className="eq-modal-member-row" key={m.id}>
                  <span className="eq-avatar" style={{ background: couleurPour(m.id) }}>{initiales(m.first_name, m.last_name)}</span>
                  <div><strong>{nomComplet(m)}</strong><small>{m.fonction || 'Sans fonction'}</small></div>
                  {managerId === m.id && <span className="eq-modal-member-manager-tag">Manager</span>}
                  <button type="button" className="eq-modal-member-remove" aria-label={`Retirer ${nomComplet(m)}`} onClick={() => removeMembre(m.id)}><X size={13} /></button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="eq-modal-actions">
          <button type="button" className="eq-modal-cancel" onClick={onClose}>Annuler</button>
          <button type="button" className="eq-modal-submit" disabled={!canCreate} onClick={handleSubmit}>{submitting ? 'Création…' : "Créer l'équipe"}</button>
        </div>
      </div>
    </div>
  )
}

function AddMemberPicker({ employees, onAdd, onCancel }: { employees: Employee[]; onAdd: (id: number) => void; onCancel: () => void }) {
  return (
    <div className="eq-add-member-picker">
      <select autoFocus defaultValue="" onChange={(event) => { if (event.target.value) onAdd(Number(event.target.value)) }}>
        <option value="">{employees.length === 0 ? 'Aucun employé disponible' : 'Sélectionner un employé...'}</option>
        {employees.map((e) => <option key={e.id} value={e.id}>{nomComplet(e)} — {e.fonction || 'Sans fonction'}</option>)}
      </select>
      <button type="button" className="eq-modal-cancel" onClick={onCancel}>Annuler</button>
    </div>
  )
}

export default function EquipesPage({ navigateTo }: { navigateTo: (page: string) => void }) {
  const [equipes, setEquipes] = useState<Team[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [managerFiltre, setManagerFiltre] = useState('Tous')
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'code', dir: 'asc' })
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [addingMemberFor, setAddingMemberFor] = useState<number | null>(null)

  const loadData = () => Promise.all([fetchTeams(), fetchEmployees()]).then(([teamsData, employeesData]) => {
    setEquipes(teamsData)
    setEmployees(employeesData)
  })

  useEffect(() => {
    let cancelled = false
    loadData()
      .catch(() => { if (!cancelled) setLoadError('Impossible de charger les équipes.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const managers = useMemo(() => Array.from(new Set(equipes.filter((e) => e.manager).map((e) => nomComplet(e.manager as TeamMember)))), [equipes])

  const toggleSort = (key: SortKey) => {
    setSort((current) => current.key === key ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })
  }

  const toggleExpand = (id: number) => {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleCreateEquipe = async (nom: string, managerId: number | null, memberIds: number[]) => {
    const team = await createTeam(nom, managerId)
    for (const memberId of memberIds) {
      await addTeamMember(team.id, memberId)
    }
    await loadData()
    setExpanded((current) => new Set(current).add(team.id))
    setShowCreateModal(false)
  }

  const handleAddMember = async (teamId: number, userId: number) => {
    await addTeamMember(teamId, userId)
    setAddingMemberFor(null)
    await loadData()
  }

  const handleRemoveMember = async (teamId: number, userId: number) => {
    await removeTeamMember(teamId, userId)
    await loadData()
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    const list = equipes.filter((equipe) => (
      (managerFiltre === 'Tous' || (equipe.manager && nomComplet(equipe.manager) === managerFiltre) || (managerFiltre === 'Non assigné' && !equipe.manager))
      && (query === '' || equipe.name.toLowerCase().includes(query) || equipe.code.toLowerCase().includes(query))
    ))

    const sorted = [...list].sort((a, b) => {
      let cmp: number
      if (sort.key === 'membres') cmp = a.members.length - b.members.length
      else if (sort.key === 'membresActifs') cmp = nbActifs(a) - nbActifs(b)
      else if (sort.key === 'manager') cmp = (a.manager ? nomComplet(a.manager) : '').localeCompare(b.manager ? nomComplet(b.manager) : '')
      else if (sort.key === 'nom') cmp = a.name.localeCompare(b.name)
      else cmp = a.code.localeCompare(b.code)
      return sort.dir === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [equipes, search, managerFiltre, sort])

  return (
    <section className="ge-page">
      <nav className="ge-subtabs">
        <button onClick={() => navigateTo('gestion')}><Users size={14} />Employés</button>
        <button className="active" onClick={() => navigateTo('gestion-equipes')}><Users2 size={14} />Équipes</button>
        <button onClick={() => navigateTo('gestion-organigramme')}><Network size={14} />Organigramme</button>
      </nav>

      <div className="eq-title-row">
        <div className="eq-title-left">
          <span className="eq-title-icon"><Users2 size={20} /></span>
          <div>
            <h1>Équipes</h1>
            <p>Création et gestion des équipes de l'organisation.</p>
          </div>
        </div>
        <button type="button" className="ge-btn-primary" onClick={() => setShowCreateModal(true)}><Plus size={14} />Créer une équipe</button>
      </div>

      <div className="ge-filters">
        <label>Manager
          <select value={managerFiltre} onChange={(e) => setManagerFiltre(e.target.value)}>
            <option value="Tous">Tous les managers</option>
            {managers.map((nom) => <option key={nom} value={nom}>{nom}</option>)}
            <option value="Non assigné">Non assigné</option>
          </select>
        </label>
        <label className="ge-search">
          <Search size={14} />
          <input placeholder="Rechercher une équipe..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
      </div>

      {loading && <p className="ge-detail-empty">Chargement des équipes…</p>}
      {loadError && <p className="ge-detail-empty">{loadError}</p>}

      {!loading && !loadError && (
        <div className="eq-table-panel">
          <div className="eq-table-wrap">
            <table className="eq-table">
              <thead>
                <tr>
                  <th className="eq-col-expand"></th>
                  <SortHeader sortKey="code" label="Code" activeKey={sort.key} onSort={toggleSort} />
                  <SortHeader sortKey="nom" label="Nom d'équipe" activeKey={sort.key} onSort={toggleSort} />
                  <SortHeader sortKey="manager" label="Manager" activeKey={sort.key} onSort={toggleSort} />
                  <SortHeader sortKey="membres" label="Membres" activeKey={sort.key} onSort={toggleSort} />
                  <SortHeader sortKey="membresActifs" label="Membres actifs" activeKey={sort.key} onSort={toggleSort} />
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="eq-empty-row">Aucune équipe ne correspond à votre recherche.</td></tr>
                )}
                {filtered.map((equipe) => {
                  const isExpanded = expanded.has(equipe.id)
                  const actifs = nbActifs(equipe)
                  const disponibles = employees.filter((e) => e.team?.id !== equipe.id)
                  return (
                    <Fragment key={equipe.id}>
                      <tr className={`eq-row ${isExpanded ? 'is-expanded' : ''}`} onClick={() => toggleExpand(equipe.id)}>
                        <td className="eq-col-expand">
                          <button type="button" className="eq-expand-btn" aria-label={isExpanded ? 'Réduire' : 'Développer'} onClick={(e) => { e.stopPropagation(); toggleExpand(equipe.id) }}>
                            {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                          </button>
                        </td>
                        <td className="eq-code">{equipe.code}</td>
                        <td className="eq-name">{equipe.name}</td>
                        <td>
                          {equipe.manager ? (
                            <div className="eq-manager-cell">
                              <span className="eq-manager-avatar" style={{ background: couleurPour(equipe.manager.id) }}>{initiales(equipe.manager.first_name, equipe.manager.last_name)}</span>
                              <span className="eq-manager-name">{nomComplet(equipe.manager)}</span>
                            </div>
                          ) : (
                            <div className="eq-manager-cell">
                              <span className="eq-manager-avatar is-unassigned">—</span>
                              <span className="eq-manager-name is-unassigned">Non assigné</span>
                            </div>
                          )}
                        </td>
                        <td className="eq-count">{equipe.members.length}</td>
                        <td className={`eq-count ${actifs < equipe.members.length ? 'eq-count-warn' : ''}`}>{actifs}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="eq-row-actions">
                            <button type="button" className="eq-row-action" aria-label="Autres actions" title="Autres actions"><MoreVertical size={14} /></button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="eq-detail-row">
                          <td colSpan={7}>
                            <div className="eq-detail-panel">
                              <div className="eq-detail-panel-head">
                                <span className="eq-detail-panel-title"><Users2 size={14} />Membres de l'équipe</span>
                                {addingMemberFor === equipe.id ? (
                                  <AddMemberPicker
                                    employees={disponibles}
                                    onAdd={(userId) => handleAddMember(equipe.id, userId)}
                                    onCancel={() => setAddingMemberFor(null)}
                                  />
                                ) : (
                                  <button type="button" className="eq-add-member-btn" onClick={() => setAddingMemberFor(equipe.id)}><UserPlus size={13} />Ajouter un membre</button>
                                )}
                              </div>
                              <div className="eq-members-table-wrap">
                                <table className="eq-members-table">
                                  <thead>
                                    <tr>
                                      <th>Matricule</th><th>Employé</th><th>Fonction</th><th>Rôle dans l'équipe</th><th>Statut</th><th></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {equipe.members.map((m) => (
                                      <tr key={m.id}>
                                        <td className="eq-matricule">{m.matricule || '—'}</td>
                                        <td>
                                          <div className="eq-employe-cell">
                                            <span className="eq-avatar" style={{ background: couleurPour(m.id) }}>{initiales(m.first_name, m.last_name)}</span>
                                            <strong>{nomComplet(m)}</strong>
                                          </div>
                                        </td>
                                        <td>{m.fonction || 'Sans fonction'}</td>
                                        <td><span className={`eq-role-pill ${!m.is_manager ? 'eq-role-pill-muted' : ''}`}>{m.is_manager ? 'Manager' : 'Membre'}</span></td>
                                        <td><span className={`eq-pill ${m.statut === 'actif' ? 'eq-pill-actif' : 'eq-pill-inactif'}`}>{m.statut === 'actif' ? 'Actif' : m.statut === 'conge' ? 'En congé' : 'Inactif'}</span></td>
                                        <td>
                                          <button type="button" className="eq-row-action" aria-label={`Retirer ${nomComplet(m)}`} onClick={() => handleRemoveMember(equipe.id, m.id)}><X size={13} /></button>
                                        </td>
                                      </tr>
                                    ))}
                                    {equipe.members.length === 0 && (
                                      <tr><td colSpan={6} className="eq-empty-row">Aucun membre pour le moment.</td></tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="eq-table-foot">
            <span>Affichage 1 à {filtered.length} sur {equipes.length} équipes</span>
            <div className="eq-table-foot-right">
              <label className="eq-page-size">
                <select defaultValue="10"><option value="10">10 / page</option><option value="25">25 / page</option><option value="50">50 / page</option></select>
              </label>
              <nav className="eq-pagination" aria-label="Pagination">
                <button type="button" disabled><ChevronsLeft size={14} /></button>
                <button type="button" disabled><ChevronLeft size={14} /></button>
                <button type="button" className="is-active">1</button>
                <button type="button" disabled><ChevronRight size={14} /></button>
                <button type="button" disabled><ChevronsRight size={14} /></button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <CreateEquipeModal
          employees={employees}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateEquipe}
        />
      )}
    </section>
  )
}
