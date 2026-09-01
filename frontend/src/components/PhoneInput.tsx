import { useEffect, useRef, useState } from 'react'
import { formatPhonecode, getCountryByCode } from '../utils/geo'
import './PhoneInput.css'

interface PhoneInputProps {
  /** Nom du champ — rendu comme un vrai input (visuellement masqué) portant la valeur complète
   * « +237 690000000 », pour s'intégrer à un formulaire natif basé sur FormData. */
  name: string
  countryCode: string | null
  value?: string
  /** Pour un formulaire contrôlé (état React) plutôt que soumis via FormData natif. */
  onChange?: (fullValue: string) => void
  required?: boolean
  placeholder?: string
  label?: string
  className?: string
}

/** Numéro de téléphone préfixé par l'indicatif du pays choisi (ex. « +237 »), qui se met à jour
 * automatiquement quand `countryCode` change — cohérent avec CountrySelect/RegionSelect. */
export default function PhoneInput({ name, countryCode, value, onChange, required, placeholder, label, className }: PhoneInputProps) {
  const [phonecode, setPhonecode] = useState('')
  const [local, setLocal] = useState('')
  const didInit = useRef(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- réinitialise l'indicatif quand le pays est effacé, en réponse à un changement externe (countryCode), pas dérivé du rendu
    if (!countryCode) { setPhonecode(''); return }
    let cancelled = false
    getCountryByCode(countryCode).then((c) => {
      if (!cancelled) setPhonecode(c ? formatPhonecode(c.phonecode) : '')
    })
    return () => { cancelled = true }
  }, [countryCode])

  // N'extraire la partie locale de `value` qu'une seule fois (à l'ouverture d'un profil existant),
  // en attendant que l'indicatif soit chargé pour ne pas le dupliquer visuellement.
  useEffect(() => {
    if (didInit.current) return
    if (countryCode && !phonecode) return
    if (value) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- initialisation unique depuis une valeur externe (édition d'un profil existant), pas dérivée du rendu
      setLocal(phonecode && value.startsWith(phonecode) ? value.slice(phonecode.length).trim() : value)
    }
    didInit.current = true
  }, [value, phonecode, countryCode])

  // Répercute un changement d'indicatif (nouveau pays choisi) sur la valeur combinée déjà saisie.
  useEffect(() => {
    if (!didInit.current) return
    onChange?.(phonecode ? `${phonecode} ${local}`.trim() : local)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ne doit réagir qu'au changement d'indicatif, pas à chaque frappe locale
  }, [phonecode])

  const fullValue = phonecode ? `${phonecode} ${local}`.trim() : local

  const handleLocalChange = (next: string) => {
    setLocal(next)
    onChange?.(phonecode ? `${phonecode} ${next}`.trim() : next)
  }

  const content = (
    <div className="phone-input">
      <span className="phone-input-code" aria-hidden="true">{phonecode || '+···'}</span>
      <input
        type="tel" value={local} placeholder={placeholder ?? '6 90 00 00 00'}
        onChange={(event) => handleLocalChange(event.target.value)}
      />
      {/* `type="hidden"` est exclu de la validation native — champ visuellement masqué mais réel
          pour que `required` fonctionne dans un formulaire soumis via FormData. */}
      <input className="phone-input-required-input" name={name} value={fullValue} required={required} readOnly tabIndex={-1} aria-hidden="true" />
    </div>
  )

  if (!label) return content
  return <label className={className ?? 'phone-input-field'}><span>{label}</span>{content}</label>
}
