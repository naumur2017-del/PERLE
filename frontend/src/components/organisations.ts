export type Organisation = {
  id: string
  name: string
  email: string
  sector: string
  city: string
  members: number
}

/** Annuaire de démonstration — à remplacer par l’appel API dès que le backend est disponible. */
const DIRECTORY: Organisation[] = [
  { id: 'nmr', name: 'NAUMUR', email: 'contact@naumur.com', sector: 'Conseil & ingénierie', city: 'Paris', members: 48 },
  { id: 'ehs', name: 'EHS Solutions', email: 'contact@ehs-solutions.fr', sector: 'Santé & sécurité', city: 'Lyon', members: 126 },
  { id: 'atl', name: 'Atlantis Industries', email: 'rh@atlantis-industries.com', sector: 'Industrie', city: 'Nantes', members: 340 },
  { id: 'grp', name: 'Groupe Meridian', email: 'admin@meridian-group.eu', sector: 'BTP', city: 'Bruxelles', members: 212 },
  { id: 'vlt', name: 'Voltera Énergie', email: 'contact@voltera-energie.fr', sector: 'Énergie', city: 'Bordeaux', members: 87 },
  { id: 'sfn', name: 'Safina Logistique', email: 'operations@safina-log.com', sector: 'Transport & logistique', city: 'Marseille', members: 155 },
  { id: 'krl', name: 'Korallis Santé', email: 'direction@korallis-sante.fr', sector: 'Santé', city: 'Lille', members: 64 },
  { id: 'nvt', name: 'Novatek Digital', email: 'hello@novatek-digital.io', sector: 'Numérique', city: 'Genève', members: 39 },
  { id: 'prm', name: 'Primea Formation', email: 'contact@primea-formation.fr', sector: 'Formation', city: 'Toulouse', members: 22 },
  { id: 'zns', name: 'Zenios Group', email: 'contact@zenios-group.com', sector: 'Services', city: 'Abidjan', members: 178 },
]

/** Recherche une organisation par nom ou par e-mail. */
export function searchOrganisations(query: string): Promise<Organisation[]> {
  const term = query.trim().toLowerCase()
  if (!term) return Promise.resolve([])
  const matches = DIRECTORY.filter(org => org.name.toLowerCase().includes(term) || org.email.toLowerCase().includes(term))
  return new Promise(resolve => window.setTimeout(() => resolve(matches), 260))
}
