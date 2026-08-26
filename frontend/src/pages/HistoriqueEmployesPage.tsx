import { useEffect, useMemo, useState } from 'react'
import { Search, TrendingUp, Users2 } from 'lucide-react'
import { fetchEmployees, type Employee } from '../api/employees'
import './HistoriqueEmployesPage.css'

type Tab = 'grades' | 'affectations'

interface HistoryRow {
  id: string
  employeeName: string
  dateSort: string
  date: string
  changement: string
  par: string
}

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })

const buildGradeRows = (employees: Employee[]): HistoryRow[] =>
  employees
    .flatMap((employee) => employee.grade_history.map((entry) => ({
      id: `g-${entry.id}`,
      employeeName: `${employee.first_name} ${employee.last_name}`,
      dateSort: entry.changed_at,
      date: formatDateTime(entry.changed_at),
      changement: entry.ancien_grade !== null ? `G${entry.ancien_grade} → G${entry.nouveau_grade}` : `G${entry.nouveau_grade}`,
      par: entry.changed_by ?? 'Système',
    })))
    .sort((a, b) => b.dateSort.localeCompare(a.dateSort))

const buildAffectationRows = (employees: Employee[]): HistoryRow[] =>
  employees
    .flatMap((employee) => employee.affectation_history.map((entry) => ({
      id: `a-${entry.id}`,
      employeeName: `${employee.first_name} ${employee.last_name}`,
      dateSort: entry.changed_at,
      date: formatDateTime(entry.changed_at),
      changement: `${entry.ancienne_equipe?.name ?? 'Non affecté'} → ${entry.nouvelle_equipe?.name ?? 'Non affecté'}`,
      par: entry.changed_by ?? 'Système',
    })))
    .sort((a, b) => b.dateSort.localeCompare(a.dateSort))

export default function HistoriqueEmployesPage({ navigateTo }: { navigateTo: (page: string) => void }) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('grades')
  const [search, setSearch] = useState('')

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

  const query = search.trim().toLowerCase()
  const rows = (tab === 'grades' ? gradeRows : affectationRows)
    .filter((row) => !query || row.employeeName.toLowerCase().includes(query))

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
          <Search size={14} />
          <input placeholder="Rechercher un employé..." value={search} onChange={(event) => setSearch(event.target.value)} />
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
                <tr><th>Employé</th><th>Date</th><th>Changement</th><th>Modifié par</th></tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.employeeName}</td>
                    <td>{row.date}</td>
                    <td>{row.changement}</td>
                    <td>{row.par}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={4} className="ge-detail-empty">Aucun historique {tab === 'grades' ? 'de grade' : 'd’affectation'} pour le moment.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}
