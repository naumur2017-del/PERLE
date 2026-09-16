import { useEffect, useState } from 'react'
import { getCitiesOfRegion } from '../utils/geo'

interface CitySelectProps {
  /** Nom du champ — rendu comme un <select> natif classique, donc compatible avec FormData sans
   * champ caché supplémentaire. Dépend de la région choisie (voir RegionSelect) comme celle-ci
   * dépend du pays : Lieu de résidence = Ville, Région, Pays. */
  name: string
  countryCode: string | null
  regionName: string | null
  value?: string
  /** Pour un formulaire contrôlé (état React) plutôt que soumis via FormData natif. */
  onChange?: (cityName: string) => void
  required?: boolean
  label?: string
  className?: string
}

export default function CitySelect({ name, countryCode, regionName, value, onChange, required, label, className }: CitySelectProps) {
  const [cities, setCities] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  // Contrôlé : les villes arrivent de façon asynchrone, un <select> non contrôlé ne rattraperait
  // pas correctement une valeur initiale (ex. en édition) une fois la liste chargée.
  const [current, setCurrent] = useState(value ?? '')

  // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs local controlled state from the `value` prop (e.g. editing an employee with a pre-existing city)
  useEffect(() => { setCurrent(value ?? '') }, [value])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clears stale cities when le pays/la région change/est vidé, pas dérivé du rendu
    if (!countryCode || !regionName) { setCities([]); return }
    let cancelled = false
    setLoading(true)
    getCitiesOfRegion(countryCode, regionName)
      .then((list) => { if (!cancelled) setCities(list) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [countryCode, regionName])

  const disabled = !countryCode || !regionName || loading
  const content = (
    <select name={name} required={required} disabled={disabled} value={current} onChange={(e) => { setCurrent(e.target.value); onChange?.(e.target.value) }}>
      <option value="">
        {!countryCode ? 'Choisissez un pays d’abord' : !regionName ? 'Choisissez une région d’abord' : loading ? 'Chargement…' : cities.length === 0 ? 'Aucune ville disponible' : 'Sélectionner une ville'}
      </option>
      {cities.map((city) => <option key={city} value={city}>{city}</option>)}
      {current && !cities.includes(current) && <option value={current}>{current}</option>}
    </select>
  )

  if (!label) return content
  return <label className={className}><span>{label}</span>{content}</label>
}
