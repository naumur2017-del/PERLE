import { Fragment, useMemo, useState } from 'react'
import {
  ArrowUpDown, ChevronDown, ChevronRight, ChevronsLeft, ChevronsRight, ChevronLeft, MoreVertical,
  Network, Plus, Search, UserPlus, Users, Users2,
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

const EQUIPES: Equipe[] = [
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

const TOTAL_EQUIPES = EQUIPES.length
const MANAGERS = Array.from(new Set(EQUIPES.filter((e) => e.manager).map((e) => e.manager!.nom)))

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

export default function EquipesPage({ navigateTo }: { navigateTo: (page: string) => void }) {
  const [search, setSearch] = useState('')
  const [managerFiltre, setManagerFiltre] = useState('Tous')
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'code', dir: 'asc' })
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['EQ-002']))

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

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    const list = EQUIPES.filter((equipe) => (
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
  }, [search, managerFiltre, sort])

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
        <button type="button" className="ge-btn-primary"><Plus size={14} />Créer une équipe</button>
      </div>

      <div className="ge-filters">
        <label>Manager
          <select value={managerFiltre} onChange={(e) => setManagerFiltre(e.target.value)}>
            <option value="Tous">Tous les managers</option>
            {MANAGERS.map((nom) => <option key={nom} value={nom}>{nom}</option>)}
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
          <span>Affichage 1 à {filtered.length} sur {TOTAL_EQUIPES} équipes</span>
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
    </section>
  )
}
