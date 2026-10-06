export type Granularite = 'mois' | 'trimestre' | 'annee' | 'personnalisee'

export interface Periode { debut: string; fin: string; libelle: string }

export interface PeriodeEtat {
  granularite: Granularite
  annee: number
  mois: number
  trimestre: number
  debutPerso: string
  finPerso: string
}

export const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
export const pad2 = (n: number) => String(n).padStart(2, '0')
export const isoLocal = (date: Date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
export const isoVersFr = (iso: string) => iso.split('-').reverse().join('/')

// Jour 0 du mois suivant = dernier jour du mois courant (mois exprimé de 1 à 12).
const dernierJour = (year: number, month: number) => isoLocal(new Date(year, month, 0))

export const anneesDisponibles = (reference = new Date()) =>
  Array.from({ length: 7 }, (_, i) => reference.getFullYear() - 5 + i)

export function calculerPeriode(granularite: Granularite, year: number, month: number, quarter: number, debutPerso: string, finPerso: string): Periode {
  if (granularite === 'mois') {
    return { debut: `${year}-${pad2(month)}-01`, fin: dernierJour(year, month), libelle: `${MOIS[month - 1]} ${year}` }
  }
  if (granularite === 'trimestre') {
    const premierMois = (quarter - 1) * 3 + 1
    return { debut: `${year}-${pad2(premierMois)}-01`, fin: dernierJour(year, premierMois + 2), libelle: `T${quarter} ${year}` }
  }
  if (granularite === 'annee') {
    return { debut: `${year}-01-01`, fin: `${year}-12-31`, libelle: `Année ${year}` }
  }
  const debut = debutPerso || isoLocal(new Date())
  const fin = finPerso || debut
  return { debut, fin, libelle: `Du ${isoVersFr(debut)} au ${isoVersFr(fin)}` }
}

export const periodeEtatInitial = (reference = new Date()): PeriodeEtat => ({
  granularite: 'mois',
  annee: reference.getFullYear(),
  mois: reference.getMonth() + 1,
  trimestre: Math.floor(reference.getMonth() / 3) + 1,
  debutPerso: '',
  finPerso: '',
})

export const periodeDepuisEtat = (etat: PeriodeEtat) =>
  calculerPeriode(etat.granularite, etat.annee, etat.mois, etat.trimestre, etat.debutPerso, etat.finPerso)
