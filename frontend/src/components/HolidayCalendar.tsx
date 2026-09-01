import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Pencil, Plus, Trash2, X } from 'lucide-react'
import { ApiError } from '../api/client'
import type { PublicHoliday } from '../api/publicHolidays'
import './HolidayCalendar.css'

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

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

const pad2 = (n: number) => String(n).padStart(2, '0')
const toIso = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

/** Grille de 42 cases (6 semaines, lundi en premier) pour couvrir n'importe quel mois d'un seul tenant. */
function buildMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const startOffset = (first.getDay() + 6) % 7
  const gridStart = new Date(year, month, 1 - startOffset)
  return Array.from({ length: 42 }, (_, i) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i))
}

type PanelMode = 'detail' | 'edit' | 'create'

interface HolidayCalendarProps {
  holidays: PublicHoliday[]
  onCreate: (values: { nom: string; date: string; recurrente_annuelle: boolean }) => Promise<void>
  onUpdate: (id: number, values: Partial<{ nom: string; date: string; recurrente_annuelle: boolean }>) => Promise<void>
  onDelete: (holiday: PublicHoliday) => Promise<void>
}

export default function HolidayCalendar({ holidays, onCreate, onUpdate, onDelete }: HolidayCalendarProps) {
  const today = useMemo(() => new Date(), [])
  const todayIso = useMemo(() => toIso(today), [today])

  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [slideDir, setSlideDir] = useState<'next' | 'prev' | 'none'>('none')

  const [activeDate, setActiveDate] = useState<string | null>(null)
  const [mode, setMode] = useState<PanelMode>('create')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formNom, setFormNom] = useState('')
  const [formRecurrente, setFormRecurrente] = useState(true)
  const [saving, setSaving] = useState(false)
  const [panelError, setPanelError] = useState<string | null>(null)

  const holidaysByDate = useMemo(() => {
    const map = new Map<string, PublicHoliday[]>()
    for (const h of holidays) {
      const list = map.get(h.date)
      if (list) list.push(h)
      else map.set(h.date, [h])
    }
    return map
  }, [holidays])

  const grid = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth])
  const monthLabel = useMemo(
    () => new Date(viewYear, viewMonth, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
    [viewYear, viewMonth],
  )

  const changeMonth = (delta: 1 | -1) => {
    setSlideDir(delta > 0 ? 'next' : 'prev')
    const next = new Date(viewYear, viewMonth + delta, 1)
    setViewYear(next.getFullYear())
    setViewMonth(next.getMonth())
  }

  const goToday = () => {
    setSlideDir(viewYear === today.getFullYear() && viewMonth === today.getMonth() ? 'none' : (viewYear * 12 + viewMonth < today.getFullYear() * 12 + today.getMonth() ? 'next' : 'prev'))
    setViewYear(today.getFullYear())
    setViewMonth(today.getMonth())
  }

  const closePanel = () => {
    setActiveDate(null)
    setPanelError(null)
  }

  const openDay = (iso: string) => {
    if (activeDate === iso) { closePanel(); return }
    setActiveDate(iso)
    setPanelError(null)
    const existing = holidaysByDate.get(iso)
    if (existing && existing.length > 0) {
      setMode('detail')
    } else {
      setMode('create')
      setFormNom('')
      setFormRecurrente(true)
    }
  }

  const startCreate = () => {
    setMode('create')
    setFormNom('')
    setFormRecurrente(true)
    setPanelError(null)
  }

  const startEdit = (holiday: PublicHoliday) => {
    setMode('edit')
    setEditingId(holiday.id)
    setFormNom(holiday.nom)
    setFormRecurrente(holiday.recurrente_annuelle)
    setPanelError(null)
  }

  const backToDetail = () => {
    setMode('detail')
    setPanelError(null)
  }

  const submitCreate = async () => {
    if (!activeDate || !formNom.trim()) return
    setSaving(true)
    setPanelError(null)
    try {
      await onCreate({ nom: formNom.trim(), date: activeDate, recurrente_annuelle: formRecurrente })
      setMode('detail')
    } catch (err) {
      setPanelError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const submitEdit = async () => {
    if (editingId === null || !formNom.trim()) return
    setSaving(true)
    setPanelError(null)
    try {
      await onUpdate(editingId, { nom: formNom.trim(), recurrente_annuelle: formRecurrente })
      setMode('detail')
    } catch (err) {
      setPanelError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (holiday: PublicHoliday) => {
    setPanelError(null)
    try {
      await onDelete(holiday)
      // Le passage en mode création (si plus aucun jour férié ce jour-là) se fait via l'effet
      // ci-dessous, réactif aux données réelles — pas ici, car `onDelete` se résout normalement
      // même si l'admin annule la confirmation native, sans que la suppression ait eu lieu.
    } catch (err) {
      setPanelError(errorMessage(err))
    }
  }

  // Bascule automatiquement en création si le jour actif n'a plus aucun jour férié (ex. après
  // une suppression réussie) — réagit aux données à jour plutôt qu'à une supposition optimiste.
  useEffect(() => {
    if (!activeDate || mode !== 'detail') return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- bascule en réaction à une suppression externe (données), pas dérivée du rendu
    if ((holidaysByDate.get(activeDate) ?? []).length === 0) startCreate()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ne doit réagir qu'aux données/au jour actif, pas à `mode` (qu'il modifie lui-même) ni à `startCreate`
  }, [holidaysByDate, activeDate])

  const activeHolidays = activeDate ? (holidaysByDate.get(activeDate) ?? []) : []
  const activeDateLabel = activeDate
    ? new Date(`${activeDate}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  return (
    <div className="hc">
      <div className="hc-toolbar">
        <div className="hc-toolbar-nav">
          <button type="button" className="hc-nav-btn" aria-label="Mois précédent" onClick={() => changeMonth(-1)}><ChevronLeft size={16} /></button>
          <h3 className="hc-month-label">{monthLabel}</h3>
          <button type="button" className="hc-nav-btn" aria-label="Mois suivant" onClick={() => changeMonth(1)}><ChevronRight size={16} /></button>
        </div>
        <button type="button" className="ge-btn-outline hc-today-btn" onClick={goToday}><CalendarDays size={13} />Aujourd’hui</button>
      </div>

      <div className="hc-weekdays">
        {WEEKDAY_LABELS.map((d) => <span key={d}>{d}</span>)}
      </div>

      <div className={`hc-grid dir-${slideDir}`} key={`${viewYear}-${viewMonth}`}>
        {grid.map((date, index) => {
          const iso = toIso(date)
          const inMonth = date.getMonth() === viewMonth
          const isToday = iso === todayIso
          const dayHolidays = holidaysByDate.get(iso) ?? []
          const hasAuto = dayHolidays.some((h) => h.source === 'auto')
          const hasManuel = dayHolidays.some((h) => h.source === 'manuel')
          return (
            <button
              type="button" key={iso}
              className={`hc-day${inMonth ? '' : ' is-outside'}${isToday ? ' is-today' : ''}${dayHolidays.length > 0 ? ' has-holiday' : ''}${activeDate === iso ? ' is-active' : ''}`}
              style={{ animationDelay: `${Math.min(index * 6, 220)}ms` }}
              onClick={() => openDay(iso)}
              disabled={!inMonth}
              tabIndex={inMonth ? 0 : -1}
            >
              <span className="hc-day-number">{date.getDate()}</span>
              {dayHolidays.length > 0 && (
                <span className="hc-day-chip">
                  <span className={`hc-day-dot${hasAuto ? ' dot-auto' : ''}${hasManuel ? ' dot-manuel' : ''}`} />
                  <span className="hc-day-chip-label">{dayHolidays[0].nom}</span>
                </span>
              )}
              {dayHolidays.length > 1 && <span className="hc-day-more">+{dayHolidays.length - 1}</span>}
            </button>
          )
        })}
      </div>

      <div className="hc-legend">
        <span><i className="hc-day-dot dot-auto" /> Importé automatiquement</span>
        <span><i className="hc-day-dot dot-manuel" /> Ajouté manuellement</span>
      </div>

      {activeDate && (
        <div className="hc-panel-overlay" onMouseDown={closePanel}>
          <div className="hc-panel" onMouseDown={(event) => event.stopPropagation()}>
            <div className="hc-panel-head">
              <div>
                <span className="hc-panel-eyebrow">Jour férié</span>
                <h3>{activeDateLabel}</h3>
              </div>
              <button type="button" className="hc-panel-close" aria-label="Fermer" onClick={closePanel}><X size={16} /></button>
            </div>

            <div className="hc-panel-body" key={mode + (editingId ?? '')}>
              {panelError && <p className="ge-form-error">{panelError}</p>}

              {mode === 'detail' && (
                <>
                  <ul className="hc-holiday-list">
                    {activeHolidays.map((holiday) => (
                      <li key={holiday.id} className="hc-holiday-card">
                        <div className="hc-holiday-card-main">
                          <strong>{holiday.nom}</strong>
                          <div className="hc-holiday-card-meta">
                            <span className={`ge-pill ${holiday.source === 'auto' ? 'ge-pill-actif' : 'ge-pill-inactif'}`}>{holiday.source === 'auto' ? 'Auto' : 'Manuel'}</span>
                            <span>{holiday.recurrente_annuelle ? 'Chaque année' : 'Cette année seulement'}</span>
                          </div>
                        </div>
                        <div className="hc-holiday-card-actions">
                          <button type="button" className="ge-row-action" aria-label="Modifier" title="Modifier" onClick={() => startEdit(holiday)}><Pencil size={13} /></button>
                          <button type="button" className="ge-row-action ge-row-action-danger" aria-label="Supprimer" title="Supprimer" onClick={() => handleDelete(holiday)}><Trash2 size={13} /></button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <button type="button" className="hc-add-more-btn" onClick={startCreate}><Plus size={13} />Ajouter un autre jour férié à cette date</button>
                </>
              )}

              {(mode === 'create' || mode === 'edit') && (
                <div className="hc-form">
                  <label className="param-field">Nom du jour férié *
                    <input autoFocus value={formNom} placeholder="Ex. Fête du Travail" onChange={(event) => setFormNom(event.target.value)} />
                  </label>
                  <label className="param-checkbox-field">
                    <input type="checkbox" checked={formRecurrente} onChange={(event) => setFormRecurrente(event.target.checked)} />
                    Se répète chaque année à la même date
                  </label>
                  <div className="hc-form-actions">
                    {mode === 'edit' && <button type="button" className="ge-btn-outline" onClick={backToDetail} disabled={saving}>Annuler</button>}
                    {mode === 'create' && activeHolidays.length > 0 && <button type="button" className="ge-btn-outline" onClick={backToDetail} disabled={saving}>Annuler</button>}
                    <button
                      type="button" className="ge-btn-primary" disabled={saving || !formNom.trim()}
                      onClick={mode === 'edit' ? submitEdit : submitCreate}
                    >
                      {saving ? 'Enregistrement…' : 'Enregistrer'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
