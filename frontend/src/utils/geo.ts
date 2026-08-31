export interface CountryOption {
  isoCode: string
  name: string
  phonecode: string
  flag: string
  currency: string
}

export interface RegionOption {
  isoCode: string
  name: string
}

let cache: typeof import('country-state-city') | null = null
const load = async () => {
  if (!cache) cache = await import('country-state-city')
  return cache
}

/* Classe CSS `flag-icons` (drapeau SVG) pour un code ISO à 2 lettres, ex. « CM » -> « fi-cm ». */
export const flagIconClass = (isoCode: string) => `fi fi-${isoCode.toLowerCase()}`

export async function getCountries(): Promise<CountryOption[]> {
  const { Country } = await load()
  return Country.getAllCountries().map((c) => ({
    isoCode: c.isoCode, name: c.name, phonecode: c.phonecode, flag: c.flag, currency: c.currency,
  }))
}

export async function getCountryByCode(isoCode: string): Promise<CountryOption | null> {
  const { Country } = await load()
  const c = Country.getCountryByCode(isoCode)
  if (!c) return null
  return { isoCode: c.isoCode, name: c.name, phonecode: c.phonecode, flag: c.flag, currency: c.currency }
}

/* Régions/États du pays choisi — utilisées comme options du champ « Ville » (qui, dans PERLE,
   représente en réalité la région, pas une ville précise : sélection automatique et fiable,
   contrairement à une liste de villes qui serait trop volumineuse et incomplète). */
export async function getStatesOfCountry(isoCode: string): Promise<RegionOption[]> {
  const { State } = await load()
  const states = State.getStatesOfCountry(isoCode) ?? []
  return states.map((s) => ({ isoCode: s.isoCode, name: s.name })).sort((a, b) => a.name.localeCompare(b.name))
}

export async function getCitiesOfCountry(isoCode: string): Promise<string[]> {
  const { City } = await load()
  const names = City.getCitiesOfCountry(isoCode)?.map((c) => c.name) ?? []
  /* Certains pays ont des villes du même nom dans des régions différentes (ex. plusieurs « Daura » au Nigeria). */
  return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b))
}

export const formatPhonecode = (phonecode: string) => (phonecode.startsWith('+') ? phonecode : `+${phonecode}`)
