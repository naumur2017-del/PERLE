// Gestion des rôles côté frontend : chaque fonctionnalité sensible porte une clé stable,
// calculée par le backend (accounts/access.py) et renvoyée dans la session sous
// `permissions`. On masque les entrées de navigation et les boutons quand la clé est absente ;
// le backend refuse de toute façon les requêtes non autorisées.

import type { Session } from './session'

export type Feature =
  | 'projets:create' // Créer / modifier un projet et ses lignes (page « Création de projet »)
  | 'staffing:new'   // Accepter/refuser et répartir les tâches (page « Nouveau staffing »)
  | 'equipes:manage' // Créer / modifier / supprimer les équipes et leurs membres (page « Équipes »)
  | 'tresorerie:view' // Voir les pages Trésorerie
  | 'tresorerie:manage_comptes' // Créer un compte de trésorerie et le rapprovisionner — Direction et Ressources
  | 'tresorerie:ordonnances' // Établir une ordonnance de paiement (Ordonnances › Nouvelle demande) — managers d'équipe et Ressources
  | 'tresorerie:validation' // Accepter / refuser les ordonnances soumises (page « Validation des paiements ») — Direction
  | 'tresorerie:execution' // Exécuter une ordonnance validée en joignant le justificatif (page « Exécutions des paiements ») — Ressources
  | 'tresorerie:journal' // Voir le journal de la trésorerie (mouvements des comptes) — Direction, Pilotage et Ressources
  | 'config:view'     // Voir / configurer les pages Architecture et Paramètres
  | 'employes:contrat' // Téléverser le contrat de travail d'un salarié (page Profil › Documents)
  | 'employes:create'  // Ajouter un employé (page Gestion des équipes) — réservé aux Ressources

export function can(session: Session | null, feature: Feature): boolean {
  return !!session && (session.permissions ?? []).includes(feature)
}
