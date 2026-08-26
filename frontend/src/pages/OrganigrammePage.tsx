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

function TeamBranch({ team, allTeams }: { team: Team; allTeams: Team[] }) {
  const orderedMembers = [...team.members].sort((a, b) => Number(b.is_manager) - Number(a.is_manager))
  const children = allTeams.filter((candidate) => candidate.parent?.id === team.id)

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

      {children.length > 0 && (
        <>
          <div className="og-connector" />
          <div className="og-branches">
            {children.map((child) => <TeamBranch key={child.id} team={child} allTeams={allTeams} />)}
          </div>
        </>
      )}
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
  const rootTeams = useMemo(() => teams.filter((team) => !team.parent), [teams])

  return (
    <section className="og-page">
      {loading && <p className="og-empty-state">Chargement de l’organigramme…</p>}
      {loadError && <p className="og-empty-state">{loadError}</p>}

      {!loading && !loadError && (
        <div className="og-chart">
          <div className="og-node-root">
            <div className="og-card og-card-root"><Building2 size={16} strokeWidth={2} />{session.organisationName}</div>
          </div>
          <div className="og-connector" />

          <div className="og-branches">
            {rootTeams.map((team) => <TeamBranch key={team.id} team={team} allTeams={teams} />)}

            {unassigned.length > 0 && (
              <div className="og-branch">
                <div className="og-card og-card-team og-card-unassigned"><UserX size={13} strokeWidth={2} />Non affectés</div>
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
            )}
          </div>

          {teams.length === 0 && unassigned.length === 0 && (
            <p className="og-empty-state">Aucun employé pour le moment.</p>
          )}
        </div>
      )}
    </section>
  )
}
