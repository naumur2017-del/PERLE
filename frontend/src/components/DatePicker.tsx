import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import './DatePicker.css'

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const pad2 = (n: number) => String(n).padStart(2, '0')
const toIso = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
const fromIso = (iso: string): Date | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Grille de 42 cases (6 semaines, lundi en premier) pour couvrir n'importe quel mois d'un seul tenant. */
function buildMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const startOffset = (first.getDay() + 6) % 7
  const gridStart = new Date(year, month, 1 - startOffset)
  return Array.from({ length: 42 }, (_, i) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i))
}

interface DatePickerProps {
  /** Nom du champ — rendu comme un vrai input (visuellement masqué) portant la date ISO, pour
   * s'intégrer à un formulaire natif basé sur FormData (comme CountrySelect/PhoneInput). */
  name?: string
  /** Date ISO (« 2026-12-25 ») pour un usage contrôlé ; sans `onChange`, sert de valeur initiale
   * pour un formulaire natif. */
  value?: string
  onChange?: (iso: string) => void
  min?: string
  max?: string
  required?: boolean
  placeholder?: string
  label?: ReactNode
  className?: string
}

/** Sélecteur de date façon Google Calendar : déclencheur affichant la date choisie, panneau
 * mensuel animé (navigation, aujourd'hui, jours désactivés hors min/max) — remplace
 * `<input type="date">` dont le rendu natif ne peut pas être personnalisé. */
export default function DatePicker({ name, value, onChange, min, max, required, placeholder, label, className }: DatePickerProps) {
  const today = useMemo(() => new Date(), [])
  const [internalValue, setInternalValue] = useState(value ?? '')
  const [open, setOpen] = useState(false)
  const [slideDir, setSlideDir] = useState<'next' | 'prev' | 'none'>('none')
  const wrapRef = useRef<HTMLDivElement>(null)

  const current = value !== undefined ? value : internalValue
  const selectedDate = useMemo(() => fromIso(current), [current])
  const minDate = useMemo(() => (min ? fromIso(min) : null), [min])
  const maxDate = useMemo(() => (max ? fromIso(max) : null), [max])

  const [viewYear, setViewYear] = useState(selectedDate?.getFullYear() ?? today.getFullYear())
  const [viewMonth, setViewMonth] = useState(selectedDate?.getMonth() ?? today.getMonth())

  // À l'ouverture, recentre la grille sur le mois de la date déjà choisie (ou aujourd'hui).
  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- recentre la vue en réponse à l'ouverture du panneau, pas dérivé du rendu
    setSlideDir('none')
    setViewYear(selectedDate?.getFullYear() ?? today.getFullYear())
    setViewMonth(selectedDate?.getMonth() ?? today.getMonth())
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ne doit réagir qu'à l'ouverture, pas à chaque frappe/sélection
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleClick = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

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

  const isDisabled = (date: Date) => (minDate !== null && date < minDate) || (maxDate !== null && date > maxDate)

  const select = (date: Date) => {
    if (isDisabled(date)) return
    const iso = toIso(date)
    setInternalValue(iso)
    onChange?.(iso)
    setOpen(false)
  }

  const displayLabel = selectedDate
    ? selectedDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  const content = (
    <div className="date-picker" ref={wrapRef}>
      <button type="button" className="date-picker-trigger" onClick={() => setOpen((o) => !o)}>
        <CalendarDays size={15} className="date-picker-trigger-icon" />
        {displayLabel
          ? <span className="date-picker-current">{displayLabel}</span>
          : <span className="date-picker-placeholder">{placeholder ?? 'jj/mm/aaaa'}</span>}
      </button>

      {open && (
        <div className="date-picker-panel" role="dialog">
          <div className="date-picker-panel-head">
            <button type="button" className="date-picker-nav-btn" aria-label="Mois précédent" onClick={() => changeMonth(-1)}><ChevronLeft size={14} /></button>
            <span className="date-picker-month-label">{monthLabel}</span>
            <button type="button" className="date-picker-nav-btn" aria-label="Mois suivant" onClick={() => changeMonth(1)}><ChevronRight size={14} /></button>
          </div>

          <div className="date-picker-weekdays">
            {WEEKDAY_LABELS.map((d) => <span key={d}>{d}</span>)}
          </div>

          <div className={`date-picker-grid dir-${slideDir}`} key={`${viewYear}-${viewMonth}`}>
            {grid.map((date, index) => {
              const iso = toIso(date)
              const inMonth = date.getMonth() === viewMonth
              const isToday = iso === toIso(today)
              const isSelected = current === iso
              const disabled = isDisabled(date)
              return (
                <button
                  type="button" key={iso}
                  className={`date-picker-day${inMonth ? '' : ' is-outside'}${isToday ? ' is-today' : ''}${isSelected ? ' is-selected' : ''}`}
                  style={{ animationDelay: `${Math.min(index * 5, 180)}ms` }}
                  onClick={() => select(date)}
                  disabled={disabled}
                  tabIndex={inMonth ? 0 : -1}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>

          <button type="button" className="date-picker-today-btn" onClick={goToday}>Aujourd’hui</button>
        </div>
      )}

      {/* `type="hidden"` est exclu de la validation native — champ visuellement masqué mais réel
          pour que `required` fonctionne dans un formulaire soumis via FormData. */}
      {name && <input className="date-picker-required-input" name={name} value={current} required={required} readOnly tabIndex={-1} aria-hidden="true" />}
    </div>
  )

  if (!label) return content
  return <label className={className ?? 'date-picker-field'}><span>{label}</span>{content}</label>
}
