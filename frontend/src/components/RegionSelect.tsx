import { useEffect, useState } from 'react'
import { getStatesOfCountry, type RegionOption } from '../utils/geo'

interface RegionSelectProps {
  /** Nom du champ (ex. « city », « ville ») — rendu comme un <select> natif classique, donc
   * compatible avec FormData sans champ caché supplémentaire. */
  name: string
  countryCode: string | null
  value?: string
  /** Pour un formulaire contrôlé (état React) plutôt que soumis via FormData natif. */
  onChange?: (regionName: string) => void
  required?: boolean
  label?: string
  className?: string
}

export default function RegionSelect({ name, countryCode, value, onChange, required, label, className }: RegionSelectProps) {
  const [regions, setRegions] = useState<RegionOption[]>([])
  const [loading, setLoading] = useState(false)
  // Contrôlé : les régions arrivent de façon asynchrone, un <select> non contrôlé ne
  // rattraperait pas correctement une valeur initiale (ex. en édition) une fois la liste chargée.
  const [current, setCurrent] = useState(value ?? '')

  // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs local controlled state from the `value` prop (e.g. editing an employee with a pre-existing region)
  useEffect(() => { setCurrent(value ?? '') }, [value])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clears stale regions when the country changes/is cleared, not derived from render
    if (!countryCode) { setRegions([]); return }
    let cancelled = false
    setLoading(true)
    getStatesOfCountry(countryCode)
      .then((list) => { if (!cancelled) setRegions(list) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [countryCode])

  const content = (
    <select name={name} required={required} disabled={!countryCode || loading} value={current} onChange={(e) => { setCurrent(e.target.value); onChange?.(e.target.value) }}>
      <option value="">
        {!countryCode ? 'Choisissez un pays d’abord' : loading ? 'Chargement…' : regions.length === 0 ? 'Aucune région disponible' : 'Sélectionner une région'}
      </option>
      {regions.map((r) => <option key={r.isoCode} value={r.name}>{r.name}</option>)}
      {current && !regions.some((r) => r.name === current) && <option value={current}>{current}</option>}
    </select>
  )

  if (!label) return content
  return <label className={className}><span>{label}</span>{content}</label>
}
