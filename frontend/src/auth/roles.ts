// Profil de l'utilisateur connecté : il détermine l'espace ouvert après la connexion.
// « admin » désigne l'administrateur applicatif (espace d'administration PERLE),
// « directeur » l'administrateur d'une entreprise cliente (accueil métier),
// « salarie » un membre ayant rejoint une organisation existante.
// Le rôle est renvoyé par l'API d'authentification (connexion ou inscription).

export type UserRole = 'admin' | 'directeur' | 'salarie'
