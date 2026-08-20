import { type Dispatch, type SetStateAction, useMemo, useState } from 'react'
import {
  Activity, AlertTriangle, Calendar, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Inbox,
  Info, Pause, Plus, RotateCcw, Search, SlidersHorizontal, UserCheck, UserX, Users, X,
} from 'lucide-react'
import {
  type Affectation, COLLABORATEURS, type TacheWrike,
  STATUT_AFFECTATION_CLASS, STATUT_AFFECTATION_LABEL, fmtHeures, initiales,
} from '../data/staffing'
import './StaffingPage.css'

const PRIORITE_CLASS: Record<TacheWrike['priorite'], string> = { Haute: 'haute', Moyenne: 'moyenne', Basse: 'basse' }

type Tab = 'prete' | 'staffee'

const DEBUT_JOURNEE_MINUTES = 8 * 60
const FIN_JOURNEE_MINUTES = 17 * 60 + 30

function calculerHeureFin(heures: number) {
  const total = DEBUT_JOURNEE_MINUTES + Math.round(heures * 60)
  const h = Math.floor(total / 60) % 24
  const m = total % 60
  return { total, label: `${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}` }
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

interface StaffingPageProps {
  navigateTo: (page: string) => void
  taches: TacheWrike[]
  setTaches: Dispatch<SetStateAction<TacheWrike[]>>
}

export default function StaffingPage({ navigateTo, taches, setTaches }: StaffingPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>('prete')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const [filterProjet, setFilterProjet] = useState('Tous')
  const [filterEquipe, setFilterEquipe] = useState('Toutes')
  const [filterLigne, setFilterLigne] = useState('Toutes')
  const [filterPriorite, setFilterPriorite] = useState('Toutes')
  const [search, setSearch] = useState('')

  const [formHeures, setFormHeures] = useState('')
  const [formCollaborateur, setFormCollaborateur] = useState('')
  const [pauseAutorisee, setPauseAutorisee] = useState(false)

  const projets = useMemo(() => Array.from(new Set(taches.map((t) => t.projet))), [taches])
  const equipes = useMemo(() => Array.from(new Set(taches.map((t) => t.equipe))), [taches])
  const lignesBudget = useMemo(() => Array.from(new Set(taches.map((t) => t.ligneBudgetaire))), [taches])

  const selected = taches.find((t) => t.id === selectedId) ?? null

  const handleSelect = (tache: TacheWrike) => {
    setSelectedId(tache.id)
    setFormHeures('')
    setFormCollaborateur('')
    setPauseAutorisee(false)
  }

  const closePanel = () => {
    setSelectedId(null)
    setFormHeures('')
    setFormCollaborateur('')
    setPauseAutorisee(false)
  }

  const countPrete = taches.filter((t) => t.affectations.length === 0).length
  const countStaffee = taches.filter((t) => t.affectations.length > 0).length

  const filtered = taches.filter((t) => (
    (activeTab === 'prete' ? t.affectations.length === 0 : t.affectations.length > 0)
    && (filterProjet === 'Tous' || t.projet === filterProjet)
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
  const heureFin = !Number.isNaN(heuresNum) && heuresNum > 0 ? calculerHeureFin(heuresNum) : null
  const depasseHeuresSup = heureFin !== null && heureFin.total > FIN_JOURNEE_MINUTES
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
      statut: 'en-attente',
      pauseAutorisee,
    }
    setTaches((list) => list.map((t) => t.id === selected.id ? { ...t, affectations: [...t.affectations, nouvelleAffectation] } : t))
    setFormHeures('')
    setFormCollaborateur('')
    setPauseAutorisee(false)
  }

  const totalStaffings = taches.reduce((sum, t) => sum + t.affectations.length, 0)

  const KPIS = [
    { icon: Inbox, tone: 'blue', label: 'Tâches reçues de Wrike', value: String(taches.length), sub: 'Total des tâches' },
    { icon: UserX, tone: 'orange', label: 'Prêtes à staffer', value: String(countPrete), sub: "En attente d'un collaborateur" },
    { icon: CheckCircle2, tone: 'green', label: 'Déjà staffées', value: String(countStaffee), sub: 'Au moins un collaborateur' },
    { icon: Activity, tone: 'indigo', label: 'Staffings réalisés', value: String(totalStaffings), sub: 'Affectations effectuées' },
    { icon: Users, tone: 'purple', label: 'Collaborateurs disponibles', value: String(COLLABORATEURS.length), sub: 'Dans votre équipe' },
  ]

  return (
    <section className="ns-page">
      <nav className="ns-subtabs">
        <button className="active" onClick={() => navigateTo('staffing')}><UserCheck size={14} />Nouveau staffing</button>
        <button onClick={() => navigateTo('staffing-suivi')}><Activity size={14} />Suivi des staffings</button>
      </nav>

      <div className="ns-title-row">
        <div>
          <h1>Nouveau staffing <Info size={15} className="ns-title-info" /></h1>
          <p>Attribuez un ou plusieurs collaborateurs aux tâches prêtes à staffer.</p>
        </div>
        <button type="button" className="ns-btn-outline" onClick={() => navigateTo('staffing-execute')}>Voir l'exécuté staffing</button>
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

      <div className={`ns-layout ${selected ? 'has-detail' : ''}`}>
        <div className="ns-main">
          <nav className="ns-tabs">
            <button className={activeTab === 'prete' ? 'active' : ''} onClick={() => { setActiveTab('prete'); closePanel() }}>
              Prêtes à staffer <span className="ns-tab-count">{countPrete}</span>
            </button>
            <button className={activeTab === 'staffee' ? 'active' : ''} onClick={() => { setActiveTab('staffee'); closePanel() }}>
              Déjà staffées <span className="ns-tab-count">{countStaffee}</span>
            </button>
          </nav>

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
            {activeTab === 'prete'
              ? <span>Ces tâches ont déjà leur ligne budgétaire définie mais n'ont encore aucun collaborateur staffé.</span>
              : <span>Ces tâches ont déjà au moins un collaborateur staffé. Vous pouvez toujours en attribuer d'autres : une tâche peut être staffée par plusieurs personnes.</span>}
          </div>

          <section className="ns-table-panel">
            <div className="ns-table-head">
              <h3>{activeTab === 'prete' ? 'Tâches prêtes à staffer' : 'Tâches déjà staffées'} <span className="ns-count-badge">{filtered.length}</span></h3>
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
                      <td>{fmtHeures(tache.ehsPrevu)} EHS</td>
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

        {selected && (
          <aside className="ns-detail">
            <div className="ns-detail-head-row">
              <h3>Détail de la tâche sélectionnée</h3>
              <button type="button" className="ns-detail-close" onClick={closePanel} aria-label="Fermer"><X size={16} /></button>
            </div>

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
                <div><dt>EHS prévus tâche</dt><dd>{fmtHeures(selected.ehsPrevu)} EHS</dd></div>
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
                          <b>{fmtHeures(affectation.heures)} h</b>
                          <span className={`ns-statut ns-statut-${STATUT_AFFECTATION_CLASS[affectation.statut]}`}>{STATUT_AFFECTATION_LABEL[affectation.statut]}</span>
                          {affectation.pauseAutorisee && <span className="ns-pause-pill"><Pause size={10} />Pause autorisée</span>}
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

                <button
                  type="button"
                  className={`ns-pause-toggle ${pauseAutorisee ? 'active' : ''}`}
                  onClick={() => setPauseAutorisee((v) => !v)}
                >
                  <Pause size={13} />
                  {pauseAutorisee ? 'Pause autorisée pour ce staffing' : 'Autoriser la pause'}
                </button>

                {heureFin && (
                  <div className={`ns-heurefin-box ${depasseHeuresSup ? 'warn' : ''}`}>
                    <Clock3 size={13} />
                    <span>Heure de fin estimée (début à 08h00) : <b>{heureFin.label}</b></span>
                  </div>
                )}

                {depasseHeuresSup && (
                  <div className="ns-overtime-warning">
                    <AlertTriangle size={15} />
                    <div>
                      <strong>Heures supplémentaires</strong>
                      <p>Cette tâche amène le collaborateur au-delà de 17h30, il devra faire des heures supplémentaires.</p>
                    </div>
                  </div>
                )}

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
          </aside>
        )}
      </div>
    </section>
  )
}
