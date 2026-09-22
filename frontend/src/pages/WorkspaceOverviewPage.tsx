// Aperçu de l'espace : « Liste des projets » de l'organisation, au même format que Pilotage des
// projets (tableau avec lignes dépliables, voir PilotagePage.tsx) — déplier un projet révèle ses
// équipes, déplier une équipe révèle ses lignes budgétaires et ses tâches pour ce projet. Cliquer
// sur une ligne budgétaire met en évidence sa (ses) tâche(s) correspondante(s) dans le tableau
// Tâches (même ligne_budgetaire). Cliquer sur une tâche ouvre un nouvel onglet sur Staffing des
// équipes (?task=<id>), avec son détail complet déjà affiché — voir App.tsx (equipesFocusTaskId,
// initialisé depuis ce paramètre d'URL) et StaffingEquipesPage (TaskDetailModal).
import { Fragment, useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, ListChecks, Search, Wallet } from 'lucide-react'
import { fetchProjects, type Project } from '../api/projects'
import { fetchTasks, type Task } from '../api/tasks'
import { formatMontant } from '../utils/currency'
import './WorkspaceOverviewPage.css'

interface TeamSummary { id: number; code: string; nom: string }

const formatDate = (value: string | null) => value ? new Date(value).toLocaleDateString('fr-FR') : '—'
const teamKey = (projectId: number, teamId: number) => `${projectId}:${teamId}`

function teamsOfProject(project: Project): TeamSummary[] {
  const seen = new Map<number, TeamSummary>()
  project.lignes.forEach((l) => {
    if (l.equipe != null && !seen.has(l.equipe)) seen.set(l.equipe, { id: l.equipe, code: l.equipe_code, nom: l.equipe_nom })
  })
  return Array.from(seen.values()).sort((a, b) => a.code.localeCompare(b.code))
}

export default function WorkspaceOverviewPage({ navigateTo }: {
  navigateTo: (page: string) => void
}) {
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // Lignes dépliées, comme Pilotage des projets (voir PilotagePage.tsx, expandedRows/toggleExpand) :
  // un projet ouvert révèle ses équipes, une équipe ouverte révèle ses lignes budgétaires et tâches.
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set())
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set())
  // Ligne budgétaire cliquée dans le tableau « Lignes budgétaires » : met en évidence sa (ses)
  // tâche(s) correspondante(s) (même LigneBudgetaire) dans le tableau « Tâches » voisin.
  const [highlightedLigneBudgetaireId, setHighlightedLigneBudgetaireId] = useState<number | null>(null)

  const openTaskTab = (taskId: number) => window.open(`/staffing/equipes?task=${taskId}`, '_blank', 'noopener,noreferrer')

  useEffect(() => {
    Promise.all([fetchProjects(), fetchTasks()])
      .then(([projectsData, tasksData]) => { setProjects(projectsData); setTasks(tasksData) })
      .catch(() => setLoadError('Impossible de charger l’aperçu de l’espace.'))
      .finally(() => setLoading(false))
  }, [])

  const toggleProject = (id: number) => setExpandedProjects((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })
  const toggleTeam = (key: string) => setExpandedTeams((prev) => {
    const next = new Set(prev)
    if (next.has(key)) next.delete(key); else next.add(key)
    return next
  })

  const query = search.trim().toLowerCase()
  const filteredProjects = projects.filter((p) => !query
    || p.nom.toLowerCase().includes(query) || p.code.toLowerCase().includes(query) || p.client.toLowerCase().includes(query))

  return (
    <section className="ovw-page">
      <div className="ovw-title-row">
        <div>
          <h1>Aperçu de l’espace</h1>
          <p>Parcourez les projets de l’organisation, leurs équipes, lignes budgétaires et tâches.</p>
        </div>
        <button type="button" className="ge-btn-outline" onClick={() => navigateTo('pilotage')}>Voir Pilotage des projets</button>
      </div>

      <label className="ovw-search">
        <Search size={14} />
        <input placeholder="Rechercher un projet, un client…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </label>

      {loading ? <p className="ovw-empty">Chargement…</p> : loadError ? <p className="ovw-empty ovw-error">{loadError}</p> : (
        <div className="ovw-table-panel">
          <div className="ovw-table-head"><h3>Liste des projets ({filteredProjects.length})</h3></div>
          <div className="ovw-table-wrap">
            <table className="ovw-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Code</th><th>Nom du projet</th><th>Client</th><th>Statut</th>
                  <th>Équipes</th><th>Budget d’exécution</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((project) => {
                  const teams = teamsOfProject(project)
                  const isProjectOpen = expandedProjects.has(project.id)
                  return (
                    <Fragment key={project.id}>
                      <tr className={isProjectOpen ? 'ovw-row-expanded' : undefined}>
                        <td className="ovw-expand-toggle">
                          <button type="button" className="ovw-chevron-btn" onClick={() => toggleProject(project.id)}
                            aria-label={isProjectOpen ? 'Réduire le projet' : 'Développer le projet'} aria-expanded={isProjectOpen}>
                            {isProjectOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        </td>
                        <td className="ovw-code">{project.code}</td>
                        <td className="ovw-name">{project.nom}</td>
                        <td>{project.client || 'Client non renseigné'}</td>
                        <td><span className={`ovw-pill ovw-pill-${project.statut}`}>{project.statut === 'definitif' ? 'Définitif' : 'Brouillon'}</span></td>
                        <td>{teams.length}</td>
                        <td>{formatMontant(project.budget_execution)}</td>
                      </tr>

                      {isProjectOpen && (
                        <tr className="ovw-expand-row">
                          <td colSpan={7} className="ovw-expand-cell">
                            {teams.length === 0 ? (
                              <p className="ovw-empty">Aucune équipe rattachée à ce projet pour le moment.</p>
                            ) : (
                              <table className="ovw-subtable">
                                <thead>
                                  <tr><th></th><th>Équipe</th><th>Lignes budgétaires</th><th>Tâches</th></tr>
                                </thead>
                                <tbody>
                                  {teams.map((team) => {
                                    const key = teamKey(project.id, team.id)
                                    const isTeamOpen = expandedTeams.has(key)
                                    const lignesEquipe = project.lignes.filter((l) => l.equipe === team.id)
                                    const tachesEquipe = tasks.filter((t) => t.project === project.id && t.equipe === team.id)
                                    return (
                                      <Fragment key={key}>
                                        <tr className={isTeamOpen ? 'ovw-row-expanded' : undefined}>
                                          <td className="ovw-expand-toggle">
                                            <button type="button" className="ovw-chevron-btn" onClick={() => toggleTeam(key)}
                                              aria-label={isTeamOpen ? 'Réduire l’équipe' : 'Développer l’équipe'} aria-expanded={isTeamOpen}>
                                              {isTeamOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                            </button>
                                          </td>
                                          <td className="ovw-name">{team.code} — {team.nom}</td>
                                          <td>{lignesEquipe.length}</td>
                                          <td>{tachesEquipe.length}</td>
                                        </tr>

                                        {isTeamOpen && (
                                          <tr className="ovw-expand-row">
                                            <td colSpan={4} className="ovw-expand-cell">
                                              <div className="ovw-detail-grid">
                                                <section className="ovw-panel">
                                                  <h3><Wallet size={15} />Lignes budgétaires</h3>
                                                  {lignesEquipe.length === 0 ? <p className="ovw-empty">Aucune ligne budgétaire pour cette équipe sur ce projet.</p> : (
                                                    <div className="ovw-table-wrap">
                                                      <table className="ovw-table ovw-table-plain">
                                                        <thead><tr><th>Code</th><th>Ligne</th><th>Montant</th><th>Consommé</th></tr></thead>
                                                        <tbody>
                                                          {lignesEquipe.map((ligne) => {
                                                            const isSelected = ligne.ligne_budgetaire != null && ligne.ligne_budgetaire === highlightedLigneBudgetaireId
                                                            return (
                                                              <tr key={ligne.id} className={`ovw-row-clickable ${isSelected ? 'ovw-row-selected' : ''}`} tabIndex={0} role="button"
                                                                aria-label={`Voir la tâche correspondant à la ligne ${ligne.code}`} aria-pressed={isSelected}
                                                                onClick={() => setHighlightedLigneBudgetaireId((current) => current === ligne.ligne_budgetaire ? null : ligne.ligne_budgetaire)}
                                                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setHighlightedLigneBudgetaireId((current) => current === ligne.ligne_budgetaire ? null : ligne.ligne_budgetaire) } }}
                                                              >
                                                                <td>{ligne.code}</td>
                                                                <td>{ligne.type_ligne === 'E' ? ligne.task_template_nom : ligne.ligne_budgetaire_nom}</td>
                                                                <td>{formatMontant(ligne.montant)}</td>
                                                                <td>{formatMontant(ligne.montant_consomme_fcfa)}</td>
                                                              </tr>
                                                            )
                                                          })}
                                                        </tbody>
                                                      </table>
                                                    </div>
                                                  )}
                                                </section>

                                                <section className="ovw-panel">
                                                  <h3><ListChecks size={15} />Tâches</h3>
                                                  {tachesEquipe.length === 0 ? <p className="ovw-empty">Aucune tâche pour cette équipe sur ce projet.</p> : (
                                                    <div className="ovw-table-wrap">
                                                      <table className="ovw-table ovw-table-plain">
                                                        <thead><tr><th>Code</th><th>Tâche</th><th>Échéance</th><th>Statut</th></tr></thead>
                                                        <tbody>
                                                          {tachesEquipe.map((task) => {
                                                            const isHighlighted = task.ligne_budgetaire === highlightedLigneBudgetaireId
                                                            return (
                                                              <tr key={task.id} className={`ovw-row-clickable ${isHighlighted ? 'ovw-row-highlighted' : ''}`} tabIndex={0} role="button"
                                                                aria-label={`Ouvrir la tâche ${task.code} dans un nouvel onglet`}
                                                                onClick={() => openTaskTab(task.id)}
                                                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openTaskTab(task.id) } }}
                                                              >
                                                                <td>{task.code}</td>
                                                                <td>{task.template_nom}</td>
                                                                <td>{formatDate(task.echeance)}</td>
                                                                <td><span className={`ovw-pill ovw-pill-statut-${task.statut}`}>{task.statut_display}</span></td>
                                                              </tr>
                                                            )
                                                          })}
                                                        </tbody>
                                                      </table>
                                                    </div>
                                                  )}
                                                </section>
                                              </div>
                                            </td>
                                          </tr>
                                        )}
                                      </Fragment>
                                    )
                                  })}
                                </tbody>
                              </table>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
                {filteredProjects.length === 0 && (
                  <tr><td colSpan={7} className="ovw-empty">Aucun projet ne correspond à cette recherche.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}
