import { useEffect, useMemo, useState } from 'react'
import { Building2, Crown, Lock, UserX } from 'lucide-react'
import { fetchEmployees, fetchTeams, type Employee, type Team, type TeamMember } from '../api/employees'
import type { Session } from '../auth/session'
import './OrganigrammePage.css'

const AVATAR_COLORS = ['#4338ca', '#16a34a', '#f59e0b', '#db2777', '#0ea5e9', '#dc2626', '#0d9488', '#a855f7', '#6b7280', '#ea580c']
const initiales = (first: string, last: string) => `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
const couleurPour = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length]

const STATUT_LABELS: Record<TeamMember['statut'], string> = { actif: 'Actif', conge: 'En congé', inactif: 'Inactif' }
const STATUT_CLASS: Record<TeamMember['statut'], string> = { actif: 'og-pill-actif', conge: 'og-pill-conge', inactif: 'og-pill-inactif' }

function MemberCard({ member }: { member: TeamMember }) {
  return (
    <div className={`og-card og-card-member ${member.is_manager ? 'is-manager' : ''}`}>
      <span className="og-avatar" style={{ background: couleurPour(member.id) }}>{initiales(member.first_name, member.last_name)}</span>
      <div className="og-member-info">
        <strong>{member.first_name} {member.last_name}{member.is_manager && <Crown size={12} strokeWidth={2} className="og-manager-icon" />}</strong>
        <small>{member.fonction || 'Fonction non renseignée'}</small>
      </div>
      <span className={`og-pill ${STATUT_CLASS[member.statut]}`}>{STATUT_LABELS[member.statut]}</span>
    </div>
  )
}

function TeamCard({ team }: { team: Team }) {
  const orderedMembers = [...team.members].sort((a, b) => Number(b.is_manager) - Number(a.is_manager))
  return (
    <div className="og-branch">
      <div className={`og-card og-card-team ${team.is_protected ? 'is-protected' : ''}`}>
        <strong>{team.code}{team.is_protected && <Lock size={10} strokeWidth={2} className="og-protected-icon" />}</strong>
        <span>{team.name}</span>
      </div>
      <div className="og-branch-members">
        {orderedMembers.length > 0
          ? orderedMembers.map((member) => <MemberCard key={member.id} member={member} />)
          : <p className="og-empty-hint">Aucun membre</p>}
      </div>
    </div>
  )
}

export default function OrganigrammePage({ session }: { navigateTo: (page: string) => void; session: Session }) {
  const [teams, setTeams] = useState<Team[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchTeams(), fetchEmployees()])
      .then(([teamsData, employeesData]) => {
        if (cancelled) return
        setTeams(teamsData)
        setEmployees(employeesData)
      })
      .catch(() => { if (!cancelled) setLoadError('Impossible de charger l’organigramme.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const unassigned = useMemo(() => employees.filter((employee) => !employee.team), [employees])

  /* Chaque niveau d'équipe forme une ligne de l'organigramme : les équipes qui partagent
     un niveau apparaissent côte à côte sur cette même ligne, triées par niveau croissant. */
  const levels = useMemo(() => {
    const byNiveau = new Map<number, Team[]>()
    for (const team of teams) {
      const bucket = byNiveau.get(team.niveau) ?? []
      bucket.push(team)
      byNiveau.set(team.niveau, bucket)
    }
    return Array.from(byNiveau.entries()).sort(([a], [b]) => a - b)
  }, [teams])

  const isEmpty = !loading && !loadError && levels.length === 0 && unassigned.length === 0

  return (
    <section className="og-page">
      <div className="og-legend">
        <span className="og-legend-item"><span className="og-legend-swatch og-legend-manager" /><Crown size={11} strokeWidth={2.5} />Manager d'équipe</span>
        <span className="og-legend-item"><Lock size={11} strokeWidth={2.5} />Équipe protégée</span>
        <span className="og-legend-item"><span className="og-legend-swatch og-legend-actif" />Actif</span>
        <span className="og-legend-item"><span className="og-legend-swatch og-legend-conge" />En congé</span>
        <span className="og-legend-item"><span className="og-legend-swatch og-legend-inactif" />Inactif</span>
      </div>

      {loading && <p className="og-empty-state">Chargement de l’organigramme…</p>}
      {loadError && <p className="og-empty-state">{loadError}</p>}
      {isEmpty && <p className="og-empty-state">Aucun employé pour le moment.</p>}

      {!loading && !loadError && !isEmpty && (
        <div className="og-chart">
          <div className="og-tree">
            <div className="og-tree-root">
              <div className="og-card og-card-root"><Building2 size={16} strokeWidth={2} />{session.organisationName}</div>
            </div>

            {levels.map(([niveau, teamsInLevel]) => (
              <div className="og-tree-level" key={niveau}>
                <div className="og-tree-connector"><span className="og-level-tag">Niveau {niveau}</span></div>
                <div className="og-branches">
                  {teamsInLevel.map((team) => <TeamCard key={team.id} team={team} />)}
                </div>
              </div>
            ))}

            {unassigned.length > 0 && (
              <div className="og-tree-level">
                <div className="og-tree-connector"><span className="og-level-tag og-level-tag-muted"><UserX size={11} strokeWidth={2} />Non affectés</span></div>
                <div className="og-branches">
                  <div className="og-branch">
                    <div className="og-branch-members">
                      {unassigned.map((employee) => (
                        <MemberCard
                          key={employee.id}
                          member={{
                            id: employee.id,
                            first_name: employee.first_name,
                            last_name: employee.last_name,
                            email: employee.email,
                            fonction: employee.fonction,
                            matricule: employee.matricule,
                            statut: employee.statut,
                            is_manager: false,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
