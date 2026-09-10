"""Contrôle d'accès par fonctionnalité — socle de la gestion des rôles.

Chaque fonctionnalité sensible porte une clé stable (« projets:create », …) et une règle
qui répond oui / non pour un utilisateur donné. ``feature_permissions(user)`` renvoie la
liste des clés autorisées : elle est transmise au frontend (voir ``UserSummarySerializer``
et ``EmployeeMeSerializer``) pour masquer les entrées de navigation et les boutons, et les
règles sont réutilisées côté vues pour refuser les requêtes non autorisées.

Pour ajouter une fonctionnalité : écrire sa règle, l'enregistrer dans ``FEATURE_CHECKS``,
puis consommer la clé côté frontend (``auth/permissions.ts``).

Les équipes de référence sont les équipes protégées créées à l'inscription
(``create_default_teams``) : niveau 1 = Direction Générale, niveau 2 = Pilotage,
niveau 3 = Ressources. Leur niveau ne peut pas être modifié.
"""

from rest_framework.permissions import BasePermission

from .models import Team

PROJECT_TEAM_NIVEAUX = (1, 2)      # Direction Générale + Pilotage
TEAM_ADMIN_NIVEAUX = (2, 3)        # Pilotage + Ressources
TRESORERIE_TEAM_NIVEAUX = (1, 2, 3)  # Direction Générale + Pilotage + Ressources


def _protected_team_ids(organisation, niveaux):
    if organisation is None:
        return set()
    return set(
        Team.objects.filter(
            organisation=organisation, is_protected=True, niveau__in=niveaux,
        ).values_list('id', flat=True)
    )


def _affecte_a_une_equipe(user, niveaux):
    """L'utilisateur est-il membre ou manager d'une des équipes protégées visées ?"""
    team_ids = _protected_team_ids(user.organisation, niveaux)
    if not team_ids:
        return False
    if user.team_id in team_ids:
        return True
    return user.teams_managed.filter(id__in=team_ids).exists()


def can_manage_projects(user):
    """Créer / modifier un projet et ses lignes budgétaires (page « Création de projet »).

    Ouvert au directeur et à l'administrateur, ainsi qu'à toute personne affectée à l'équipe
    Direction ou Pilotage (membre ou manager)."""
    if user is None or not getattr(user, 'is_authenticated', False):
        return False
    if user.role in ('admin', 'directeur'):
        return True
    return _affecte_a_une_equipe(user, PROJECT_TEAM_NIVEAUX)


def can_access_new_staffing(user):
    """Page « Nouveau staffing » (accepter/refuser une tâche, répartir une tâche acceptée).

    Ouvert au directeur/admin, aux personnes affectées à la Direction ou au Pilotage, et à
    tout manager d'équipe (chaque manager staffe les tâches de son équipe)."""
    if user is None or not getattr(user, 'is_authenticated', False):
        return False
    if can_manage_projects(user):
        return True
    return user.teams_managed.exists()


def can_manage_teams(user):
    """Créer / modifier / supprimer une équipe, ses membres et le nombre de niveaux
    d'organigramme (page « Gestion des équipes » › Équipes). La lecture reste ouverte à tous.

    Ouvert au directeur/admin et aux personnes affectées à l'équipe Pilotage ou Ressources
    (membre ou manager)."""
    if user is None or not getattr(user, 'is_authenticated', False):
        return False
    if user.role in ('admin', 'directeur'):
        return True
    return _affecte_a_une_equipe(user, TEAM_ADMIN_NIVEAUX)


def can_access_config(user):
    """Pages Architecture (tâches, monétaire) et Paramètres — réservées au directeur/admin et
    aux personnes affectées à la Direction ou au Pilotage (membre ou manager)."""
    if user is None or not getattr(user, 'is_authenticated', False):
        return False
    if user.role in ('admin', 'directeur'):
        return True
    return _affecte_a_une_equipe(user, PROJECT_TEAM_NIVEAUX)


def can_view_treasury(user):
    """Pages Trésorerie (ordonnances, exécutions, comptes, journal, mercuriales).

    Visibles uniquement pour le directeur/admin, les personnes affectées à la Direction, au
    Pilotage ou aux Ressources (membre ou manager), et tout manager d'équipe."""
    if user is None or not getattr(user, 'is_authenticated', False):
        return False
    if user.role in ('admin', 'directeur'):
        return True
    if _affecte_a_une_equipe(user, TRESORERIE_TEAM_NIVEAUX):
        return True
    return user.teams_managed.exists()


FEATURE_CHECKS = {
    'projets:create': can_manage_projects,
    'staffing:new': can_access_new_staffing,
    'equipes:manage': can_manage_teams,
    'tresorerie:view': can_view_treasury,
    'config:view': can_access_config,
}


def feature_permissions(user):
    return sorted(key for key, check in FEATURE_CHECKS.items() if check(user))


class CanViewTreasury(BasePermission):
    message = 'Les pages de trésorerie sont réservées à la direction, au pilotage, aux ressources et aux managers.'

    def has_permission(self, request, view):
        return can_view_treasury(request.user)
