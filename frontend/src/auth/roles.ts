// Profil de l'utilisateur connecté : il détermine l'espace ouvert après la connexion.
// « admin » désigne l'administrateur applicatif (espace d'administration PERLE),
// « directeur » l'administrateur d'une entreprise cliente (accueil métier).

export type UserRole = 'admin' | 'directeur'

/* Comptes de démonstration. À remplacer par le rôle renvoyé par l'API d'authentification :
   la partie locale de l'adresse est le seul discriminant tant que le backend n'est pas branché. */
const DEMO_ADMIN_ACCOUNTS = ['admin@naumur.com', 'administrateur@naumur.com']

export const resolveRole = (email: string): UserRole => {
  const address = email.trim().toLowerCase()
  return DEMO_ADMIN_ACCOUNTS.includes(address) || address.startsWith('admin') ? 'admin' : 'directeur'
}
