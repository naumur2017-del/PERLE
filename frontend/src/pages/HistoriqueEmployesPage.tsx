import { useEffect, useMemo, useState } from 'react'
import { TrendingUp, Users2 } from 'lucide-react'
import { fetchEmployees, type Employee } from '../api/employees'
import './HistoriqueEmployesPage.css'

type Tab = 'grades' | 'affectations'

interface HistoryRow {
  id: string
  employeeId: number
  employeeName: string
  dateSort: string
  dateDebut: string
  dateFin: string | null
  changement: string
  par: string
}

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })

/** Ni GradeHistory ni AffectationHistory ne stockent de date de fin : chaque entrée n'est qu'un
 * horodatage ponctuel (changed_at). On reconstitue la période « début → fin » de chaque étape en
 * chaînant les entrées d'un même employé, triées chronologiquement : la fin d'une étape est le
 * début du changement suivant — la toute dernière reste sans fin (« En cours »), car c'est la
 * situation actuelle de l'employé, pas encore close par un nouveau changement. */
function buildRows<T extends { id: number; changed_at: string; changed_by: string | null }>(
  employees: Employee[],
  getHistory: (employee: Employee) => T[],
  prefix: string,
  describe: (entry: T) => string,
): HistoryRow[] {
  const rows: HistoryRow[] = []
  for (const employee of employees) {
    const sorted = [...getHistory(employee)].sort((a, b) => a.changed_at.localeCompare(b.changed_at))
    sorted.forEach((entry, index) => {
      const next = sorted[index + 1]
      rows.push({
        id: `${prefix}-${entry.id}`,
        employeeId: employee.id,
        employeeName: `${employee.first_name} ${employee.last_name}`,
        dateSort: entry.changed_at,
        dateDebut: formatDateTime(entry.changed_at),
        dateFin: next ? formatDateTime(next.changed_at) : null,
        changement: describe(entry),
        par: entry.changed_by ?? 'Système',
      })
    })
  }
  return rows.sort((a, b) => b.dateSort.localeCompare(a.dateSort))
}

const buildGradeRows = (employees: Employee[]): HistoryRow[] =>
  buildRows(employees, (e) => e.grade_history, 'g', (entry) =>
    entry.ancien_grade !== null ? `G${entry.ancien_grade} → G${entry.nouveau_grade}` : `G${entry.nouveau_grade}`)

const buildAffectationRows = (employees: Employee[]): HistoryRow[] =>
  buildRows(employees, (e) => e.affectation_history, 'a', (entry) =>
    `${entry.ancienne_equipe?.name ?? 'Non affecté'} → ${entry.nouvelle_equipe?.name ?? 'Non affecté'}`)

export default function HistoriqueEmployesPage({ navigateTo }: { navigateTo: (page: string) => void }) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('grades')
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>('tous')

  useEffect(() => {
    let cancelled = false
    fetchEmployees()
      .then((data) => { if (!cancelled) setEmployees(data) })
      .catch(() => { if (!cancelled) setLoadError('Impossible de charger l’historique des employés.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const gradeRows = useMemo(() => buildGradeRows(employees), [employees])
  const affectationRows = useMemo(() => buildAffectationRows(employees), [employees])

  const employeesTries = useMemo(
    () => [...employees].sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)),
    [employees],
  )

  const rows = (tab === 'grades' ? gradeRows : affectationRows)
    .filter((row) => filterEmployeeId === 'tous' || row.employeeId === Number(filterEmployeeId))

  return (
    <section className="ge-page">
      <div className="ge-header-row">
        <nav className="ge-subtabs">
          <button className={tab === 'grades' ? 'active' : ''} onClick={() => setTab('grades')}>
            <TrendingUp size={14} />Historique des grades
          </button>
          <button className={tab === 'affectations' ? 'active' : ''} onClick={() => setTab('affectations')}>
            <Users2 size={14} />Historique des affectations
          </button>
        </nav>
        <div className="ge-header-actions">
          <button type="button" className="ge-btn-outline" onClick={() => navigateTo('gestion')}>Retour aux employés</button>
        </div>
      </div>

      <div className="ge-filters">
        <label className="ge-search">
          <select value={filterEmployeeId} onChange={(event) => setFilterEmployeeId(event.target.value)}>
            <option value="tous">Tous les employés</option>
            {employeesTries.map((employee) => (
              <option key={employee.id} value={employee.id}>{employee.first_name} {employee.last_name}</option>
            ))}
          </select>
        </label>
      </div>

      {loading && <p className="ge-detail-empty">Chargement de l’historique…</p>}
      {loadError && <p className="ge-detail-empty">{loadError}</p>}

      {!loading && !loadError && (
        <div className="ge-table-panel">
          <div className="ge-table-head">
            <h3>{tab === 'grades' ? 'Historique des grades' : 'Historique des affectations'} ({rows.length})</h3>
          </div>
          <div className="ge-table-wrap">
            <table className="ge-table">
              <thead>
                <tr><th>Employé</th><th>Date de début</th><th>Date de fin</th><th>Changement</th><th>Modifié par</th></tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.employeeName}</td>
                    <td>{row.dateDebut}</td>
                    <td>{row.dateFin ?? <span className="ge-en-cours">En cours</span>}</td>
                    <td>{row.changement}</td>
                    <td>{row.par}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={5} className="ge-detail-empty">Aucun historique {tab === 'grades' ? 'de grade' : 'd’affectation'} pour le moment.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}
