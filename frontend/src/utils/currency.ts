import { getSession } from '../auth/session'

/* Devise dynamique de l'organisation (ISO 4217, ex. « XAF », « EUR »), dérivée du pays choisi à
 * l'inscription (voir Organisation.currency_code / CountrySelect). Remplace le FCFA auparavant
 * figé dans le code : `Intl.NumberFormat` localise nativement le symbole/format, y compris
 * « 123 456 FCFA » pour XAF — donc aucun changement visuel pour les organisations existantes. */

export const DEFAULT_CURRENCY = 'XAF'

/* Lit la devise de la session courante (mise à jour à la connexion/inscription et à chaque
 * rechargement de `me` — voir App.tsx). Zéro coût réseau : simple lecture locale. */
export function getCurrencyCode(): string {
  return getSession()?.currencyCode || DEFAULT_CURRENCY
}

export function formatMontant(value: number, currencyCode?: string, options?: Intl.NumberFormatOptions): string {
  const code = currencyCode || getCurrencyCode()
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency', currency: code, maximumFractionDigits: 0, ...options,
    }).format(value)
  } catch {
    return `${value.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} ${code}`
  }
}

/* Le seul suffixe (« FCFA », « € »…) sans le montant — utile pour les libellés de colonnes ou de
 * champs qui affichent la devise séparément du nombre. */
export function currencySuffix(currencyCode?: string): string {
  const formatted = formatMontant(0, currencyCode)
  return formatted.replace(/[\d\s,.-]/g, '').trim()
}
