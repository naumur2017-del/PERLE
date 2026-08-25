export interface CountryOption {
  isoCode: string
  name: string
  phonecode: string
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
  return Country.getAllCountries().map((c) => ({ isoCode: c.isoCode, name: c.name, phonecode: c.phonecode }))
}

export async function getCitiesOfCountry(isoCode: string): Promise<string[]> {
  const { City } = await load()
  const names = City.getCitiesOfCountry(isoCode)?.map((c) => c.name) ?? []
  /* Certains pays ont des villes du même nom dans des régions différentes (ex. plusieurs « Daura » au Nigeria). */
  return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b))
}

export const formatPhonecode = (phonecode: string) => (phonecode.startsWith('+') ? phonecode : `+${phonecode}`)
