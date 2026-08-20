import { Fragment, useMemo, useState } from 'react'
import {
  ArrowUpDown, ChevronDown, ChevronRight, ChevronsLeft, ChevronsRight, ChevronLeft, MoreVertical,
  Network, Plus, Search, UserPlus, Users, Users2, X,
} from 'lucide-react'
import './GestionEquipesPage.css'
import './EquipesPage.css'

type StatutMembre = 'Actif' | 'Inactif'

interface MembreEquipe {
  matricule: string
  employe: string
  initiales: string
  couleur: string
  fonction: string
  role: string
  statut: StatutMembre
}

interface Manager {
  nom: string
  initiales: string
  couleur: string
}

interface Equipe {
  code: string
  nom: string
  manager: Manager | null
  membres: MembreEquipe[]
}

const membre = (matricule: string, employe: string, initiales: string, couleur: string, fonction: string, role: string, statut: StatutMembre): MembreEquipe => (
  { matricule, employe, initiales, couleur, fonction, role, statut }
)

const EQUIPES_INITIAL: Equipe[] = [
  {
    code: 'EQ-001',
    nom: 'Pilotage',
    manager: { nom: 'Ajara Lamare', initiales: 'AL', couleur: '#8b5cf6' },
    membres: [
      membre('EMP-001', 'Ajara Lamare', 'AL', '#8b5cf6', 'Chef de pilotage', 'Manager', 'Actif'),
      membre('EMP-011', 'Mbouombouo Ibrahim', 'IM', '#16a34a', 'Contrôleur de gestion', 'Membre', 'Actif'),
      membre('EMP-014', 'Guebediang Pamella', 'PG', '#f59e0b', 'Contrôleur de gestion', 'Membre', 'Actif'),
      membre('EMP-018', 'Bella Gamaliel Fabrice', 'BG', '#0d9488', 'Agent back office', 'Membre', 'Actif'),
      membre('EMP-022', 'Nyanné Kédé Jezabel', 'NJ', '#a855f7', 'Agent back office', 'Membre', 'Actif'),
      membre('EMP-030', 'Essogo Jacques', 'EJ', '#6b7280', 'Trésorier', 'Membre', 'Inactif'),
    ],
  },
  {
    code: 'EQ-002',
    nom: 'Ressources',
    manager: { nom: 'Théodore Bessala', initiales: 'TB', couleur: '#0ea5e9' },
    membres: [
      membre('EMP-021', 'Théodore Bessala', 'TB', '#0ea5e9', 'Responsable Ressources', 'Manager', 'Actif'),
      membre('EMP-034', 'Belomo Edwige', 'BE', '#db2777', 'Agent Ressource', 'Membre', 'Actif'),
      membre('EMP-041', 'Essogo Erine', 'EE', '#4338ca', 'Comptable', 'Membre', 'Actif'),
      membre('EMP-047', 'Fokou Alain', 'FA', '#0d9488', 'Agent Ressource', 'Membre', 'Actif'),
      membre('EMP-052', 'Herman Tsaffack', 'HT', '#dc2626', 'Maintenancier & Réseau', 'Membre', 'Actif'),
      membre('EMP-063', 'Mbarga Thibaut', 'MT', '#f59e0b', 'Agent de Liaison', 'Membre', 'Actif'),
      membre('EMP-071', 'Assabe Zainabou', 'AZ', '#0ea5e9', 'Assistante RH', 'Membre', 'Actif'),
      membre('EMP-078', 'Ngono Mireille', 'NM', '#ea580c', 'Chargée de recrutement', 'Membre', 'Actif'),
    ],
  },
  {
    code: 'EQ-003',
    nom: 'Front Office',
    manager: null,
    membres: [
      membre('EMP-101', 'Foka Solange', 'FS', '#16a34a', 'Agent front office', 'Membre', 'Actif'),
      membre('EMP-102', 'Ndongo Patrick', 'NP', '#0ea5e9', 'Agent front office', 'Membre', 'Actif'),
      membre('EMP-103', 'Atangana Carole', 'AC', '#a855f7', 'Agent front office', 'Membre', 'Actif'),
      membre('EMP-104', 'Biya Junior', 'BJ', '#f59e0b', 'Agent front office', 'Membre', 'Actif'),
      membre('EMP-105', 'Talla Vanessa', 'TV', '#6b7280', 'Agent front office', 'Membre', 'Inactif'),
    ],
  },
  {
    code: 'EQ-004',
    nom: 'Informatique',
    manager: { nom: 'Herman Tsaffack', initiales: 'HT', couleur: '#7c3aed' },
    membres: [
      membre('EMP-058', 'Herman Tsaffack', 'HT', '#7c3aed', 'Responsable Informatique', 'Manager', 'Actif'),
      membre('EMP-066', 'Ebongue Brayan', 'EB', '#16a34a', 'Développeur Senior', 'Membre', 'Actif'),
      membre('EMP-074', 'Nguemako Steve', 'NS', '#0ea5e9', 'Administrateur Système', 'Membre', 'Actif'),
      membre('EMP-081', 'Owona Larissa', 'OL', '#db2777', 'Support Technique', 'Membre', 'Actif'),
    ],
  },
]

/* Vivier du personnel : dédupliqué par nom à partir des membres déjà affectés à une équipe,
   pour proposer les mêmes personnes comme manager ou membre lors de la création d'une équipe. */
const PERSONNEL_POOL: MembreEquipe[] = Array.from(
  EQUIPES_INITIAL.flatMap((e) => e.membres).reduce((map, m) => (map.has(m.employe) ? map : map.set(m.employe, m)), new Map<string, MembreEquipe>()).values(),
).sort((a, b) => a.employe.localeCompare(b.employe))

const nextCode = (equipes: Equipe[]) => {
  const maxNum = equipes.reduce((max, e) => {
    const num = Number(e.code.replace(/\D/g, ''))
    return Number.isFinite(num) && num > max ? num : max
  }, 0)
  return `EQ-${String(maxNum + 1).padStart(3, '0')}`
}

type SortKey = 'code' | 'nom' | 'manager' | 'membres' | 'membresActifs'
type SortDir = 'asc' | 'desc'

const nbActifs = (equipe: Equipe) => equipe.membres.filter((m) => m.statut === 'Actif').length

function SortHeader({ sortKey, label, activeKey, onSort }: { sortKey: SortKey; label: string; activeKey: SortKey; onSort: (key: SortKey) => void }) {
  return (
    <th>
      <button type="button" className="eq-sort-btn" onClick={() => onSort(sortKey)}>
        {label}<ArrowUpDown size={11} className={activeKey === sortKey ? 'is-active' : ''} />
      </button>
    </th>
  )
}

function CreateEquipeModal({ code, onClose, onCreate }: { code: string; onClose: () => void; onCreate: (equipe: Equipe) => void }) {
  const [nom, setNom] = useState('')
  const [managerNom, setManagerNom] = useState('')
  const [membres, setMembres] = useState<MembreEquipe[]>([])

  const disponibles = PERSONNEL_POOL.filter((p) => !membres.some((m) => m.employe === p.employe))

  const addMembre = (nomChoisi: string) => {
    const personne = PERSONNEL_POOL.find((p) => p.employe === nomChoisi)
    if (!personne) return
    setMembres((current) => [...current, personne])
  }

  const removeMembre = (employe: string) => {
    setMembres((current) => current.filter((m) => m.employe !== employe))
    if (managerNom === employe) setManagerNom('')
  }

  const chooseManager = (nomChoisi: string) => {
    setManagerNom(nomChoisi)
    if (nomChoisi && !membres.some((m) => m.employe === nomChoisi)) addMembre(nomChoisi)
  }

  const canCreate = nom.trim() !== ''

  const handleSubmit = () => {
    if (!canCreate) return
    const manager = managerNom ? PERSONNEL_POOL.find((p) => p.employe === managerNom) ?? null : null
    const membresFinal = membres.map((m) => ({
      ...m,
      role: manager && m.employe === manager.employe ? 'Manager' : 'Membre',
      statut: 'Actif' as StatutMembre,
    }))

    onCreate({
      code,
      nom: nom.trim(),
      manager: manager ? { nom: manager.employe, initiales: manager.initiales, couleur: manager.couleur } : null,
      membres: membresFinal,
    })
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

        <label className="eq-modal-field">Nom de l'équipe *
          <input autoFocus placeholder="Ex. Support Client" value={nom} onChange={(event) => setNom(event.target.value)} />
        </label>

        <label className="eq-modal-field">Manager
          <select value={managerNom} onChange={(event) => chooseManager(event.target.value)}>
            <option value="">Non assigné</option>
            {PERSONNEL_POOL.map((p) => <option key={p.matricule} value={p.employe}>{p.employe} — {p.fonction}</option>)}
          </select>
        </label>

        <label className="eq-modal-field">Ajouter un membre
          <select value="" onChange={(event) => addMembre(event.target.value)} disabled={disponibles.length === 0}>
            <option value="">{disponibles.length === 0 ? 'Tous les employés sont déjà membres' : 'Sélectionner un employé...'}</option>
            {disponibles.map((p) => <option key={p.matricule} value={p.employe}>{p.employe} — {p.fonction}</option>)}
          </select>
        </label>

        <div className="eq-modal-field">
          <div className="eq-modal-members-head">
            <span>Membres de l'équipe</span>
            <span className="eq-modal-members-count">{membres.length} sélectionné(s)</span>
          </div>
          {membres.length === 0 ? (
            <p className="eq-modal-member-empty">Aucun membre pour le moment. Ajoutez-en via la liste ci-dessus.</p>
          ) : (
            <ul className="eq-modal-member-list">
              {membres.map((m) => (
                <li className="eq-modal-member-row" key={m.matricule}>
                  <span className="eq-avatar" style={{ background: m.couleur }}>{m.initiales}</span>
                  <div><strong>{m.employe}</strong><small>{m.fonction}</small></div>
                  {managerNom === m.employe && <span className="eq-modal-member-manager-tag">Manager</span>}
                  <button type="button" className="eq-modal-member-remove" aria-label={`Retirer ${m.employe}`} onClick={() => removeMembre(m.employe)}><X size={13} /></button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="eq-modal-actions">
          <button type="button" className="eq-modal-cancel" onClick={onClose}>Annuler</button>
          <button type="button" className="eq-modal-submit" disabled={!canCreate} onClick={handleSubmit}>Créer l'équipe</button>
        </div>
      </div>
    </div>
  )
}

export default function EquipesPage({ navigateTo }: { navigateTo: (page: string) => void }) {
  const [equipes, setEquipes] = useState<Equipe[]>(EQUIPES_INITIAL)
  const [search, setSearch] = useState('')
  const [managerFiltre, setManagerFiltre] = useState('Tous')
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'code', dir: 'asc' })
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['EQ-002']))
  const [showCreateModal, setShowCreateModal] = useState(false)

  const managers = useMemo(() => Array.from(new Set(equipes.filter((e) => e.manager).map((e) => e.manager!.nom))), [equipes])

  const toggleSort = (key: SortKey) => {
    setSort((current) => current.key === key ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })
  }

  const toggleExpand = (code: string) => {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  const handleCreateEquipe = (equipe: Equipe) => {
    setEquipes((current) => [...current, equipe])
    setExpanded((current) => new Set(current).add(equipe.code))
    setShowCreateModal(false)
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    const list = equipes.filter((equipe) => (
      (managerFiltre === 'Tous' || equipe.manager?.nom === managerFiltre || (managerFiltre === 'Non assigné' && !equipe.manager))
      && (query === '' || equipe.nom.toLowerCase().includes(query) || equipe.code.toLowerCase().includes(query))
    ))

    const sorted = [...list].sort((a, b) => {
      let cmp: number
      if (sort.key === 'membres') cmp = a.membres.length - b.membres.length
      else if (sort.key === 'membresActifs') cmp = nbActifs(a) - nbActifs(b)
      else if (sort.key === 'manager') cmp = (a.manager?.nom ?? '').localeCompare(b.manager?.nom ?? '')
      else cmp = a[sort.key].localeCompare(b[sort.key])
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
                const isExpanded = expanded.has(equipe.code)
                const actifs = nbActifs(equipe)
                return (
                  <Fragment key={equipe.code}>
                    <tr className={`eq-row ${isExpanded ? 'is-expanded' : ''}`} onClick={() => toggleExpand(equipe.code)}>
                      <td className="eq-col-expand">
                        <button type="button" className="eq-expand-btn" aria-label={isExpanded ? 'Réduire' : 'Développer'} onClick={(e) => { e.stopPropagation(); toggleExpand(equipe.code) }}>
                          {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                        </button>
                      </td>
                      <td className="eq-code">{equipe.code}</td>
                      <td className="eq-name">{equipe.nom}</td>
                      <td>
                        {equipe.manager ? (
                          <div className="eq-manager-cell">
                            <span className="eq-manager-avatar" style={{ background: equipe.manager.couleur }}>{equipe.manager.initiales}</span>
                            <span className="eq-manager-name">{equipe.manager.nom}</span>
                          </div>
                        ) : (
                          <div className="eq-manager-cell">
                            <span className="eq-manager-avatar is-unassigned">—</span>
                            <span className="eq-manager-name is-unassigned">Non assigné</span>
                          </div>
                        )}
                      </td>
                      <td className="eq-count">{equipe.membres.length}</td>
                      <td className={`eq-count ${actifs < equipe.membres.length ? 'eq-count-warn' : ''}`}>{actifs}</td>
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
                              <button type="button" className="eq-add-member-btn"><UserPlus size={13} />Ajouter un membre</button>
                            </div>
                            <div className="eq-members-table-wrap">
                              <table className="eq-members-table">
                                <thead>
                                  <tr>
                                    <th>Matricule</th><th>Employé</th><th>Fonction</th><th>Rôle dans l'équipe</th><th>Statut</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {equipe.membres.map((m) => (
                                    <tr key={m.matricule}>
                                      <td className="eq-matricule">{m.matricule}</td>
                                      <td>
                                        <div className="eq-employe-cell">
                                          <span className="eq-avatar" style={{ background: m.couleur }}>{m.initiales}</span>
                                          <strong>{m.employe}</strong>
                                        </div>
                                      </td>
                                      <td>{m.fonction}</td>
                                      <td><span className={`eq-role-pill ${m.role === 'Membre' ? 'eq-role-pill-muted' : ''}`}>{m.role}</span></td>
                                      <td><span className={`eq-pill ${m.statut === 'Actif' ? 'eq-pill-actif' : 'eq-pill-inactif'}`}>{m.statut}</span></td>
                                    </tr>
                                  ))}
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

      {showCreateModal && (
        <CreateEquipeModal
          code={nextCode(equipes)}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateEquipe}
        />
      )}
    </section>
  )
}
