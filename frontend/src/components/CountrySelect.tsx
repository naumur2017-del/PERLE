import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { flagIconClass, getCountries, type CountryOption } from '../utils/geo'
import 'flag-icons/css/flag-icons.min.css'
import './CountrySelect.css'

interface CountrySelectProps {
  /** Nom du champ « pays » lisible (ex. « country », « pays ») : deux champs cachés sont rendus
   * pour s'intégrer à un formulaire natif basé sur FormData — `${name}` (nom du pays) et
   * `${name}_code` (code ISO à 2 lettres). */
  name: string
  /** Si fourni, un 3e champ caché `${currencyName}` est rendu avec la devise ISO 4217 du pays choisi. */
  currencyName?: string
  value?: string | null
  onChange?: (country: CountryOption | null) => void
  required?: boolean
  placeholder?: string
  label?: string
}

export default function CountrySelect({ name, currencyName, value, onChange, required, placeholder = 'Sélectionner un pays…', label }: CountrySelectProps) {
  const [countries, setCountries] = useState<CountryOption[]>([])
  const [selected, setSelected] = useState<CountryOption | null>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapRef = useRef<HTMLLabelElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    getCountries().then((list) => {
      if (cancelled) return
      setCountries(list)
      if (value) {
        const found = list.find((c) => c.isoCode === value)
        if (found) setSelected(found)
      }
    })
    return () => { cancelled = true }
  }, [value])

  useEffect(() => {
    if (!open) return
    const handleClick = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets the search field when the panel opens, in response to a user action (open), not derived from render
    if (open) { setQuery(''); window.setTimeout(() => searchRef.current?.focus(), 0) }
  }, [open])

  const filtered = query.trim()
    ? countries.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()))
    : countries

  const handleSelect = (country: CountryOption) => {
    setSelected(country)
    setOpen(false)
    onChange?.(country)
  }

  return (
    <label className="country-select-field" ref={wrapRef}>
      {label && <span>{label}</span>}
      <div className="country-select">
        <button type="button" className="country-select-trigger" onClick={() => setOpen((o) => !o)}>
          {selected ? (
            <span className="country-select-current">
              <span className={flagIconClass(selected.isoCode)} />
              <span>{selected.name}</span>
            </span>
          ) : (
            <span className="country-select-placeholder">{placeholder}</span>
          )}
          <ChevronDown size={14} className={`country-select-chevron${open ? ' is-open' : ''}`} />
        </button>

        {open && (
          <div className="country-select-panel" role="listbox">
            <div className="country-select-search">
              <Search size={13} />
              <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un pays…" />
            </div>
            <div className="country-select-list">
              {filtered.length === 0 && <p className="country-select-empty">Aucun pays trouvé.</p>}
              {filtered.map((country) => (
                <button
                  type="button" key={country.isoCode} role="option" aria-selected={selected?.isoCode === country.isoCode}
                  className={`country-select-option${selected?.isoCode === country.isoCode ? ' is-selected' : ''}`}
                  onClick={() => handleSelect(country)}
                >
                  <span className={flagIconClass(country.isoCode)} />
                  <span>{country.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* `type="hidden"` est exclu de la validation native du formulaire (required n'aurait
            aucun effet) : on garde ce champ comme un vrai input visuellement masqué pour que le
            navigateur bloque bien la soumission tant qu'aucun pays n'est choisi. */}
        <input className="country-select-required-input" name={name} value={selected?.name ?? ''} required={required} readOnly tabIndex={-1} aria-hidden="true" />
        <input type="hidden" name={`${name}_code`} value={selected?.isoCode ?? ''} />
        {currencyName && <input type="hidden" name={currencyName} value={selected?.currency ?? ''} />}
      </div>
    </label>
  )
}
