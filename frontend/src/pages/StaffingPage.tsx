import { useMemo, useState } from 'react'
import {
  Calendar, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Inbox,
  Info, PlayCircle, Plus, RotateCcw, Search, SlidersHorizontal, UserX, Users, X,
} from 'lucide-react'
import './StaffingPage.css'

interface Affectation {
  id: string
  collaborateur: string
  collaborateurProfil: string
  heures: number
  staffeLe: string
}

interface TacheWrike {
  id: string
  projet: string
  tache: string
  equipe: string
  priorite: 'Haute' | 'Moyenne' | 'Basse'
  creeLe: string
  echeance: string
  ligneBudgetaire: string
  ehsPrevu: number
  affectations: Affectation[]
}

const COLLABORATEURS = [
  { nom: 'Ibrahim Mbouombouo', profil: 'Comptable Senior', equipe: 'BO1 - Back Office 1' },
  { nom: 'Belomo Edwige', profil: 'Analyste Financier', equipe: 'BO1 - Back Office 1' },
  { nom: 'Essogo Erine', profil: 'Analyste Financier', equipe: 'BO1 - Back Office 1' },
  { nom: 'Pamella Guebediang', profil: 'Contrôleur de gestion', equipe: 'MO1 - Middle Office 1' },
  { nom: 'Herman Tsaffock', profil: 'Analyste Financier', equipe: 'MO1 - Middle Office 1' },
  { nom: 'Mbarga Thibaut', profil: 'Opérateur ERP', equipe: 'OP1 - Opérations 1' },
  { nom: 'Théodore Bessala', profil: 'Chef de projet', equipe: 'PI1 - Pilotage 1' },
  { nom: 'Brayan Ebongue', profil: 'Développeur Senior', equipe: 'IT1 - Développement 1' },
]

const TACHES_INITIAL: TacheWrike[] = [
  { id: 'WRK-1442', projet: 'ERP Academy', tache: 'Cartographie des processus', equipe: 'MO1 - Middle Office 1', priorite: 'Moyenne', creeLe: '02/05/2025', echeance: '18/05/2025', ligneBudgetaire: 'Consultation externe', ehsPrevu: 12, affectations: [] },
  { id: 'WRK-1443', projet: 'Mission Audit Interne', tache: 'Revue des contrôles internes', equipe: 'BO1 - Back Office 1', priorite: 'Haute', creeLe: '03/05/2025', echeance: '22/05/2025', ligneBudgetaire: 'Déplacement terrain', ehsPrevu: 20, affectations: [] },
  { id: 'WRK-1444', projet: 'Digitalisation RH', tache: 'Paramétrage du SIRH', equipe: 'IT1 - Développement 1', priorite: 'Basse', creeLe: '04/05/2025', echeance: '28/05/2025', ligneBudgetaire: 'Formation équipe', ehsPrevu: 8, affectations: [] },
  { id: 'WRK-1445', projet: 'Étude de faisabilité usine', tache: 'Analyse des coûts', equipe: 'PI1 - Pilotage 1', priorite: 'Moyenne', creeLe: '05/05/2025', echeance: '02/06/2025', ligneBudgetaire: 'Achat matériel', ehsPrevu: 15, affectations: [] },
  { id: 'WRK-1446', projet: 'ERP Academy', tache: "Tests d'intégration module RH", equipe: 'IT1 - Développement 1', priorite: 'Haute', creeLe: '06/05/2025', echeance: '10/06/2025', ligneBudgetaire: 'Support technique', ehsPrevu: 10, affectations: [] },
]

const PRIORITE_CLASS: Record<TacheWrike['priorite'], string> = { Haute: 'haute', Moyenne: 'moyenne', Basse: 'basse' }

const fmtEhs = (value: number) => value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function initiales(nom: string) {
  return nom.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
}

function CollaborateurSelect({ equipe, value, onChange, exclude }: {
  equipe: string
  value: string
  onChange: (nom: string) => void
  exclude?: string[]
}) {
  const [showAll, setShowAll] = useState(false)
  const disponibles = COLLABORATEURS.filter((c) => !exclude?.includes(c.nom))
  const membresEquipe = disponibles.filter((c) => c.equipe === equipe)
  const membresHorsEquipe = disponibles.filter((c) => c.equipe !== equipe)

  return (
    <div className="ns-collab-select">
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Sélectionner un collaborateur</option>
        <optgroup label="Membres de l'équipe">
          {membresEquipe.map((c) => <option key={c.nom} value={c.nom}>{c.nom} — {c.profil}</option>)}
        </optgroup>
        {showAll && (
          <optgroup label="Hors équipe">
            {membresHorsEquipe.map((c) => <option key={c.nom} value={c.nom}>{c.nom} — {c.profil}</option>)}
          </optgroup>
        )}
      </select>
      <button
        type="button"
        className={`ns-collab-plus ${showAll ? 'active' : ''}`}
        title="Afficher les collaborateurs hors équipe"
        onClick={() => setShowAll((s) => !s)}
      >
        <Plus size={14} />
      </button>
    </div>
  )
}

export default function StaffingPage({ navigateTo }: { navigateTo: (page: string) => void }) {
  const [taches, setTaches] = useState<TacheWrike[]>(TACHES_INITIAL)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const [filterProjet, setFilterProjet] = useState('Tous')
  const [filterEquipe, setFilterEquipe] = useState('Toutes')
  const [filterLigne, setFilterLigne] = useState('Toutes')
  const [filterPriorite, setFilterPriorite] = useState('Toutes')
  const [search, setSearch] = useState('')

  const [formHeures, setFormHeures] = useState('')
  const [formCollaborateur, setFormCollaborateur] = useState('')

  const projets = useMemo(() => Array.from(new Set(taches.map((t) => t.projet))), [taches])
  const equipes = useMemo(() => Array.from(new Set(taches.map((t) => t.equipe))), [taches])
  const lignesBudget = useMemo(() => Array.from(new Set(taches.map((t) => t.ligneBudgetaire))), [taches])

  const selected = taches.find((t) => t.id === selectedId) ?? null

  const handleSelect = (tache: TacheWrike) => {
    setSelectedId(tache.id)
    setFormHeures('')
    setFormCollaborateur('')
  }

  const closePanel = () => {
    setSelectedId(null)
    setFormHeures('')
    setFormCollaborateur('')
  }

  const filtered = taches.filter((t) => (
    (filterProjet === 'Tous' || t.projet === filterProjet)
    && (filterEquipe === 'Toutes' || t.equipe === filterEquipe)
    && (filterLigne === 'Toutes' || t.ligneBudgetaire === filterLigne)
    && (filterPriorite === 'Toutes' || t.priorite === filterPriorite)
    && (search.trim() === '' || `${t.id} ${t.tache} ${t.projet}`.toLowerCase().includes(search.trim().toLowerCase()))
  ))

  const resetFiltres = () => {
    setFilterProjet('Tous'); setFilterEquipe('Toutes'); setFilterLigne('Toutes')
    setFilterPriorite('Toutes'); setSearch('')
  }

  const heuresNum = parseFloat(formHeures.replace(',', '.'))
  const staffingValide = formCollaborateur !== '' && !Number.isNaN(heuresNum) && heuresNum > 0

  const todayStr = () => new Date().toLocaleDateString('fr-FR')

  const handleEnregistrerStaffing = () => {
    if (!selected || !staffingValide) return
    const profil = COLLABORATEURS.find((c) => c.nom === formCollaborateur)?.profil ?? ''
    const nouvelleAffectation: Affectation = {
      id: `${selected.id}-${selected.affectations.length}-${Date.now()}`,
      collaborateur: formCollaborateur,
      collaborateurProfil: profil,
      heures: heuresNum,
      staffeLe: todayStr(),
    }
    setTaches((list) => list.map((t) => t.id === selected.id ? { ...t, affectations: [...t.affectations, nouvelleAffectation] } : t))
    setFormHeures('')
    setFormCollaborateur('')
  }

  const totalStaffings = taches.reduce((sum, t) => sum + t.affectations.length, 0)
  const tachesSansStaffing = taches.filter((t) => t.affectations.length === 0).length

  const KPIS = [
    { icon: Inbox, tone: 'blue', label: 'Tâches prêtes à staffer', value: String(taches.length), sub: 'Total des tâches' },
    { icon: UserX, tone: 'orange', label: 'Tâches sans staffing', value: String(tachesSansStaffing), sub: "En attente d'un collaborateur" },
    { icon: CheckCircle2, tone: 'green', label: 'Staffings réalisés', value: String(totalStaffings), sub: 'Affectations effectuées' },
    { icon: Users, tone: 'purple', label: 'Collaborateurs disponibles', value: String(COLLABORATEURS.length), sub: 'Dans votre équipe' },
  ]

  return (
    <section className="ns-page">
      <div className="ns-title-row">
        <div>
          <h1>Nouveau staffing <Info size={15} className="ns-title-info" /></h1>
          <p>Attribuez un ou plusieurs collaborateurs aux tâches prêtes à staffer.</p>
        </div>
        <button type="button" className="ns-btn-outline" onClick={() => navigateTo('staffing-execute')}><PlayCircle size={14} />Voir l'exécuté staffing</button>
      </div>

      <div className="ns-toolbar">
        <button type="button" className="ns-daterange"><Calendar size={14} />01/05/2025 → 31/12/2025</button>
        <button type="button" className="ns-btn-outline"><SlidersHorizontal size={14} />Filtres avancés</button>
      </div>

      <div className="ns-kpis">
        {KPIS.map((kpi) => (
          <article key={kpi.label} className={`ns-kpi ns-kpi-${kpi.tone}`}>
            <span className="ns-kpi-icon"><kpi.icon size={17} /></span>
            <div>
              <span className="ns-kpi-label">{kpi.label}</span>
              <strong>{kpi.value}</strong>
              <small>{kpi.sub}</small>
            </div>
          </article>
        ))}
      </div>

      <div className="ns-layout">
        <div className="ns-main">
          <div className="ns-filters">
            <label>Projet
              <select value={filterProjet} onChange={(e) => setFilterProjet(e.target.value)}>
                <option>Tous</option>
                {projets.map((p) => <option key={p}>{p}</option>)}
              </select>
            </label>
            <label>Équipe
              <select value={filterEquipe} onChange={(e) => setFilterEquipe(e.target.value)}>
                <option>Toutes</option>
                {equipes.map((e) => <option key={e}>{e}</option>)}
              </select>
            </label>
            <label>Ligne budgétaire
              <select value={filterLigne} onChange={(e) => setFilterLigne(e.target.value)}>
                <option>Toutes</option>
                {lignesBudget.map((l) => <option key={l}>{l}</option>)}
              </select>
            </label>
            <label>Priorité
              <select value={filterPriorite} onChange={(e) => setFilterPriorite(e.target.value)}>
                <option>Toutes</option>
                <option>Haute</option><option>Moyenne</option><option>Basse</option>
              </select>
            </label>
            <label className="ns-search">
              <Search size={14} />
              <input placeholder="Rechercher une tâche, un projet..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </label>
            <button type="button" className="ns-reset" onClick={resetFiltres}><RotateCcw size={14} />Réinitialiser</button>
          </div>

          <div className="ns-info-banner">
            <Info size={14} />
            <span>Ces tâches ont déjà leur ligne budgétaire définie. Attribuez-leur un ou plusieurs collaborateurs : une tâche peut être staffée par plusieurs personnes.</span>
          </div>

          <section className="ns-table-panel">
            <div className="ns-table-head">
              <h3>Tâches prêtes à staffer <span className="ns-count-badge">{filtered.length}</span></h3>
              <div className="ns-table-head-actions">
                <label>Afficher<select defaultValue={10}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select></label>
                <span>1-{filtered.length} sur {filtered.length}</span>
                <button type="button" disabled><ChevronLeft size={14} /></button>
                <button type="button" disabled><ChevronRight size={14} /></button>
              </div>
            </div>
            <div className="ns-table-wrap">
              <table className="ns-table">
                <thead>
                  <tr>
                    <th>Wrike</th><th>Projet</th><th>Tâche</th><th>Équipe</th><th>Ligne budgétaire</th>
                    <th>EHS prévus tâche</th><th>Échéance</th><th>Collaborateurs staffés</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={9} className="ns-empty">Aucune tâche ne correspond à ces filtres.</td></tr>
                  )}
                  {filtered.map((tache) => (
                    <tr key={tache.id} className={selectedId === tache.id ? 'ns-row-selected' : ''} onClick={() => handleSelect(tache)}>
                      <td className="ns-code">{tache.id}</td>
                      <td>{tache.projet}</td>
                      <td className="ns-name">{tache.tache}</td>
                      <td>{tache.equipe}</td>
                      <td>{tache.ligneBudgetaire}</td>
                      <td>{fmtEhs(tache.ehsPrevu)} EHS</td>
                      <td>{tache.echeance}</td>
                      <td>
                        {tache.affectations.length === 0 ? (
                          <span className="ns-pill-warn">Aucun</span>
                        ) : (
                          <span className="ns-statut ns-statut-green">{tache.affectations.length} collaborateur{tache.affectations.length > 1 ? 's' : ''}</span>
                        )}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button type="button" className="ns-action-btn" onClick={() => handleSelect(tache)}>Staffer</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="ns-detail">
          <div className="ns-detail-head-row">
            <h3>Détail de la tâche sélectionnée</h3>
            {selected && <button type="button" className="ns-detail-close" onClick={closePanel} aria-label="Fermer"><X size={16} /></button>}
          </div>
          {!selected && (
            <div className="ns-detail-empty">
              <Inbox size={26} />
              <p>Sélectionnez une tâche dans la liste pour la staffer.</p>
            </div>
          )}

          {selected && (
            <>
              <div className="ns-detail-head">
                <span className="ns-detail-check ns-statut-blue"><CheckCircle2 size={14} /></span>
                <strong>{selected.id}</strong>
                <span className="ns-detail-badge">Reçue de Wrike</span>
              </div>

              <dl className="ns-detail-info">
                <div><dt>Projet</dt><dd>{selected.projet}</dd></div>
                <div><dt>Tâche</dt><dd>{selected.tache}</dd></div>
                <div><dt>Équipe</dt><dd>{selected.equipe}</dd></div>
                <div><dt>Ligne budgétaire</dt><dd>{selected.ligneBudgetaire}</dd></div>
                <div><dt>EHS prévus tâche</dt><dd>{fmtEhs(selected.ehsPrevu)} EHS</dd></div>
                <div><dt>Créée le</dt><dd>{selected.creeLe}</dd></div>
                <div><dt>Échéance</dt><dd className="ns-echeance">{selected.echeance}</dd></div>
                <div><dt>Priorité</dt><dd><span className={`ns-priorite ns-priorite-${PRIORITE_CLASS[selected.priorite]}`}>{selected.priorite}</span></dd></div>
              </dl>

              <div className="ns-detail-section">
                <h4>Collaborateurs staffés</h4>
                {selected.affectations.length === 0 ? (
                  <p className="ns-staff-empty">Aucun collaborateur staffé pour le moment sur cette tâche.</p>
                ) : (
                  <ul className="ns-affectations-list">
                    {selected.affectations.map((affectation) => (
                      <li key={affectation.id}>
                        <span className="ns-employee">
                          <span className="ns-employee-dot">{initiales(affectation.collaborateur)}</span>
                          <span><strong>{affectation.collaborateur}</strong><small>{affectation.collaborateurProfil}</small></span>
                        </span>
                        <span className="ns-affectation-meta">
                          <b>{fmtEhs(affectation.heures)} h</b>
                          <small><Clock3 size={11} />{affectation.staffeLe}</small>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="ns-detail-section">
                <h4>Nouveau staffing</h4>
                <label className="ns-detail-field">
                  Nombre d'heures attribuées au staffing *
                  <div className="ns-ehs-input">
                    <input
                      type="number"
                      min={0}
                      step="0.5"
                      value={formHeures}
                      onChange={(e) => setFormHeures(e.target.value)}
                    />
                    <span>heures</span>
                  </div>
                </label>
                <label className="ns-detail-field">
                  Attribuer à *
                  <CollaborateurSelect
                    equipe={selected.equipe}
                    value={formCollaborateur}
                    onChange={setFormCollaborateur}
                    exclude={selected.affectations.map((a) => a.collaborateur)}
                  />
                </label>
                <div className="ns-detail-actions">
                  <button type="button" className="ns-btn-primary" disabled={!staffingValide} onClick={handleEnregistrerStaffing}>Enregistrer le staffing</button>
                </div>
              </div>
            </>
          )}
        </aside>
      </div>
    </section>
  )
}
