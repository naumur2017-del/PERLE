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

Règle générale : un accès rattaché à une équipe protégée est ouvert à **toute personne qui
en fait partie** (membre) ainsi qu'à son manager — jamais au manager seul. La page
« Nouveau staffing » fait exception : elle ajoute aux trois équipes protégées les managers
de n'importe quelle équipe (chacun staffe les tâches de son équipe).
"""

from rest_framework.permissions import BasePermission

from .models import Team

PROJECT_TEAM_NIVEAUX = (1, 2)      # Direction Générale + Pilotage
TEAM_ADMIN_NIVEAUX = (2, 3)        # Pilotage + Ressources
SUPERVISION_NIVEAUX = (1, 2, 3)    # Direction Générale + Pilotage + Ressources (« back-office »)
RESOURCES_NIVEAUX = (3,)           # Ressources
DIRECTION_RESOURCES_NIVEAUX = (1, 3)  # Direction Générale + Ressources
DIRECTION_NIVEAUX = (1,)           # Direction Générale


def _protected_team_ids(organisation, niveaux):
    if organisation is None:
        return set()
    return set(
        Team.objects.filter(
            organisation=organisation, is_protected=True, niveau__in=niveaux,
        ).values_list('id', flat=True)
    )


def _in_protected_team(user, niveaux):
    """L'utilisateur fait-il partie d'une des équipes protégées visées — comme **membre**
    (``user.team``) ou comme manager ?"""
    team_ids = _protected_team_ids(user.organisation, niveaux)
    if not team_ids:
        return False
    if user.team_id in team_ids:
        return True
    return user.teams_managed.filter(id__in=team_ids).exists()


def _manages_any_team(user):
    return user.teams_managed.exists()


def _authenticated(user):
    return user is not None and getattr(user, 'is_authenticated', False)


def can_manage_projects(user):
    """Créer / modifier un projet et ses lignes budgétaires (page « Création de projet »).

    Ouvert au directeur/admin et à toute personne faisant partie de la Direction ou du
    Pilotage (membre ou manager)."""
    if not _authenticated(user):
        return False
    if user.role in ('admin', 'directeur'):
        return True
    return _in_protected_team(user, PROJECT_TEAM_NIVEAUX)


def is_team_structure_in_place(organisation):
    """La structure de l'organisation est-elle en place ? Oui dès que la Direction et le
    Pilotage ont créé les équipes (au moins une équipe en plus des 3 équipes protégées) et
    attribué un manager au Pilotage (PIL) et aux Ressources (RES).

    Calculé à la volée : si l'un de ces managers est retiré, la structure n'est plus
    considérée en place et la Direction / le Pilotage retrouvent la main pour la compléter —
    l'organisation n'est jamais bloquée sans personne pour gérer ses équipes."""
    if organisation is None:
        return False
    teams = Team.objects.filter(organisation=organisation)
    if not teams.filter(is_protected=False).exists():
        return False
    managed_niveaux = set(
        teams.filter(is_protected=True, niveau__in=TEAM_ADMIN_NIVEAUX, manager__isnull=False)
        .values_list('niveau', flat=True)
    )
    return managed_niveaux >= set(TEAM_ADMIN_NIVEAUX)


def can_manage_teams(user):
    """Créer / modifier / supprimer une équipe, ses membres et le nombre de niveaux
    d'organigramme (page « Gestion des équipes » › Équipes), et soumettre une demande de
    changement de grade. La lecture reste ouverte à tous.

    Tant que la structure n'est pas en place (voir ``is_team_structure_in_place``) : ouvert au
    directeur/admin et à toute personne faisant partie du Pilotage ou des Ressources (membre ou
    manager). Une fois en place, la Direction (directeur, équipe Direction Générale) et le
    Pilotage perdent ce droit : seules les Ressources (et l'Administrateur PERLE) gèrent les
    équipes ; la Direction garde la validation des demandes qui lui remontent (grades,
    exécutions de paiement…) et sa vue globale sur l'organisation."""
    if not _authenticated(user):
        return False
    if user.role == 'admin':
        return True
    if is_team_structure_in_place(user.organisation):
        return _in_protected_team(user, RESOURCES_NIVEAUX)
    if user.role == 'directeur':
        return True
    return _in_protected_team(user, TEAM_ADMIN_NIVEAUX)


def can_access_config(user):
    """Pages Architecture (tâches, monétaire) et Paramètres.

    Ouvert au directeur/admin et à toute personne faisant partie de la Direction ou du
    Pilotage (membre ou manager)."""
    if not _authenticated(user):
        return False
    if user.role in ('admin', 'directeur'):
        return True
    return _in_protected_team(user, PROJECT_TEAM_NIVEAUX)


def is_org_supervisor(user):
    """« Back-office » qui supervise toute l'organisation : directeur/admin ou personne faisant
    partie de la Direction, du Pilotage ou des Ressources (membre ou manager)."""
    if not _authenticated(user):
        return False
    if user.role in ('admin', 'directeur'):
        return True
    return _in_protected_team(user, SUPERVISION_NIVEAUX)


def can_view_treasury(user):
    """Pages Trésorerie (ordonnances, exécutions, comptes, journal, mercuriales).

    Visibles pour le back-office (Direction / Pilotage / Ressources, membres compris) et tout
    manager d'équipe."""
    if not _authenticated(user):
        return False
    return is_org_supervisor(user) or _manages_any_team(user)


def can_manage_treasury_accounts(user):
    """Créer un compte de trésorerie et le rapprovisionner (page « Comptes et opérations »).

    Réservé à la Direction (directeur ou personne de l'équipe Direction Générale) et aux
    Ressources (membre ou manager), plus l'Administrateur PERLE pour l'assistance."""
    if not _authenticated(user):
        return False
    if user.role in ('admin', 'directeur'):
        return True
    return _in_protected_team(user, DIRECTION_RESOURCES_NIVEAUX)


def can_create_payment_orders(user):
    """Établir une ordonnance de paiement — créer, modifier, supprimer et soumettre une demande
    de paiement encore en brouillon (page « Ordonnances des paiements » › Nouvelle demande).

    Ouvert à tout manager d'équipe et aux Ressources (membre ou manager), plus l'Administrateur
    PERLE. La Direction ne crée pas d'ordonnance — elle les valide (voir can_validate_payments) :
    le directeur, manager de la Direction Générale, n'est donc pas compté parmi les managers,
    pour qu'une même personne n'établisse pas puis ne valide pas sa propre ordonnance."""
    if not _authenticated(user):
        return False
    if user.role == 'admin':
        return True
    if _in_protected_team(user, RESOURCES_NIVEAUX):
        return True
    if user.role == 'directeur':
        return False
    return user.teams_managed.exclude(id__in=_protected_team_ids(user.organisation, DIRECTION_NIVEAUX)).exists()


def can_validate_payments(user):
    """Accepter ou refuser une ordonnance soumise (page « Validation des paiements »).

    Réservé à la Direction : directeur ou personne de l'équipe Direction Générale (membre ou
    manager), plus l'Administrateur PERLE."""
    if not _authenticated(user):
        return False
    if user.role in ('admin', 'directeur'):
        return True
    return _in_protected_team(user, DIRECTION_NIVEAUX)


def can_execute_payments(user):
    """Exécuter une ordonnance validée en y joignant le justificatif (page « Exécutions des
    paiements ») — le compte choisi est alors débité.

    Réservé aux Ressources (membre ou manager), plus l'Administrateur PERLE."""
    if not _authenticated(user):
        return False
    if user.role == 'admin':
        return True
    return _in_protected_team(user, RESOURCES_NIVEAUX)


def can_view_all_payments(user):
    """Voir toutes les ordonnances de l'organisation (et non seulement les siennes) : la
    Direction qui les valide et les Ressources qui les exécutent."""
    return can_validate_payments(user) or can_execute_payments(user)


def can_view_treasury_journal(user):
    """Journal de la trésorerie : les mouvements des comptes (entrées, sorties) et leur export.

    Réservé au back-office : Direction, Pilotage et Ressources (membres compris). Un simple
    manager d'équipe voit les autres pages de trésorerie mais pas les mouvements."""
    return is_org_supervisor(user)


def can_access_new_staffing(user):
    """Page « Nouveau staffing » (accepter/refuser une tâche, répartir une tâche acceptée).

    Ouverte au back-office (Direction / Pilotage / Ressources, membres compris) et, en plus,
    à tout manager d'équipe — chacun staffe les tâches de son équipe."""
    if not _authenticated(user):
        return False
    return is_org_supervisor(user) or _manages_any_team(user)


def can_manage_employee_documents(user):
    """Téléverser le contrat de travail d'un salarié (page Profil › Documents).

    Le salarié consulte et télécharge son propre contrat mais ne peut pas le modifier
    (voir EmployeeMeSerializer). Seuls le directeur/admin et les Ressources (membre ou
    manager) peuvent le téléverser ou le remplacer."""
    if not _authenticated(user):
        return False
    if user.role in ('admin', 'directeur'):
        return True
    return _in_protected_team(user, RESOURCES_NIVEAUX)


def can_create_employee(user):
    """Ajouter un employé (page Gestion des équipes, bouton « Ajouter un employé »).

    Réservé aux membres de l'équipe Ressources (membre ou manager) : la Direction (rôle
    directeur, équipe Direction Générale) n'y a plus accès — seules les Ressources créent
    désormais un compte salarié depuis cette page. L'Administrateur PERLE (rôle plateforme,
    hors organisation) garde l'accès pour l'assistance et l'amorçage d'une nouvelle
    organisation avant qu'elle n'ait de membre dans Ressources ; en pratique, un nouveau
    salarié peut de toute façon toujours s'inscrire lui-même (voir RegisterMemberView)."""
    if not _authenticated(user):
        return False
    if user.role == 'admin':
        return True
    return _in_protected_team(user, RESOURCES_NIVEAUX)


FEATURE_CHECKS = {
    'projets:create': can_manage_projects,
    'staffing:new': can_access_new_staffing,
    'equipes:manage': can_manage_teams,
    'tresorerie:view': can_view_treasury,
    'tresorerie:manage_comptes': can_manage_treasury_accounts,
    'tresorerie:ordonnances': can_create_payment_orders,
    'tresorerie:validation': can_validate_payments,
    'tresorerie:execution': can_execute_payments,
    'tresorerie:journal': can_view_treasury_journal,
    'config:view': can_access_config,
    'employes:contrat': can_manage_employee_documents,
    'employes:create': can_create_employee,
}


def feature_permissions(user):
    return sorted(key for key, check in FEATURE_CHECKS.items() if check(user))


class CanViewTreasury(BasePermission):
    message = 'Les pages de trésorerie sont réservées à la direction, au pilotage, aux ressources et aux managers.'

    def has_permission(self, request, view):
        return can_view_treasury(request.user)


class CanViewTreasuryJournal(BasePermission):
    message = 'Le journal de la trésorerie est réservé à la Direction, au Pilotage et aux Ressources.'

    def has_permission(self, request, view):
        return can_view_treasury_journal(request.user)
