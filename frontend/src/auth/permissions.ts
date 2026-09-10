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
  | 'config:view'     // Voir / configurer les pages Architecture et Paramètres

export function can(session: Session | null, feature: Feature): boolean {
  return !!session && (session.permissions ?? []).includes(feature)
}
