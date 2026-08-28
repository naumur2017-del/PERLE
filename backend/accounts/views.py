from datetime import timedelta

from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.authtoken.models import Token
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    AvanceDemande, CongeDemande, CongeType, FermetureTechnique, LigneBudgetaire, Organisation,
    Project, ProjectLigne, Task, TaskTemplate, Team, User,
)
from .serializers import (
    AvanceDemandeReviewSerializer,
    AvanceDemandeSerializer,
    CongeDemandeReviewSerializer,
    CongeDemandeSerializer,
    CongeTypeSerializer,
    EmployeeAdminEditSerializer,
    FermetureTechniqueSerializer,
    EmployeeAdminUpdateSerializer,
    EmployeeCreateSerializer,
    EmployeeMeSerializer,
    EmployeeSerializer,
    LigneBudgetaireCreateSerializer,
    LigneBudgetaireSerializer,
    LoginSerializer,
    OrganisationLevelsSerializer,
    OrganisationSearchSerializer,
    ProjectLigneSerializer,
    ProjectSerializer,
    RegisterCompanyOrganisationSerializer,
    RegisterMemberSerializer,
    RegisterPersonalOrganisationSerializer,
    TaskSerializer,
    TaskTemplateSerializer,
    TeamSerializer,
    UserSummarySerializer,
)


DEMANDE_AUTO_APPROVE_DELAY = timedelta(days=3)


def auto_approve_stale_demandes(queryset):
    """Une demande restée « en attente » plus de 3 jours passe automatiquement à « approuvée »
    et rejoint ainsi l'historique, sans intervention d'un admin/directeur."""
    cutoff = timezone.now() - DEMANDE_AUTO_APPROVE_DELAY
    stale = queryset.filter(statut='attente', created_at__lte=cutoff)
    if queryset.model is CongeDemande:
        # Un congé « défini par l'entreprise » sans dates ne peut pas s'auto-approuver :
        # il attend une action explicite de l'admin, qui doit d'abord fixer la période.
        stale = stale.exclude(date_debut__isnull=True)
        employee_ids = list(stale.values_list('employee_id', flat=True))
        stale.update(statut='approuvee', reviewed_at=timezone.now())
        if employee_ids:
            User.objects.filter(id__in=employee_ids, statut='actif').update(statut='conge')
    else:
        stale.update(statut='approuvee', reviewed_at=timezone.now())


def apply_fermetures_techniques(organisation):
    """Fait passer en « Congé » les employés couverts par une fermeture technique actuellement
    active (et les en fait ressortir une fois la période terminée), sans jamais créer de
    CongeDemande ni toucher aux congés réellement demandés. Lazy comme auto_approve_stale_demandes :
    appelé à chaque lecture pertinente, faute de tâche planifiée dans ce projet."""
    if not organisation:
        return
    today = timezone.localdate()

    # Fermetures dont la période est terminée : on retire le statut qu'elles avaient imposé.
    perimees = User.objects.filter(
        organisation=organisation, conge_technique_source__isnull=False,
    ).exclude(conge_technique_source__date_fin__gte=today)
    perimees_ids = list(perimees.values_list('id', flat=True))
    if perimees_ids:
        User.objects.filter(id__in=perimees_ids, statut='conge').update(statut='actif')
        User.objects.filter(id__in=perimees_ids).update(conge_technique_source=None)

    actives = FermetureTechnique.objects.filter(organisation=organisation, date_debut__lte=today, date_fin__gte=today)
    for fermeture in actives:
        candidats = User.objects.filter(organisation=organisation, statut='actif').exclude(
            id__in=fermeture.employes_exceptes.values_list('id', flat=True)
        )
        equipes_exceptees = list(fermeture.equipes_exceptees.values_list('id', flat=True))
        if equipes_exceptees:
            candidats = candidats.exclude(team_id__in=equipes_exceptees)
        candidats.update(statut='conge', conge_technique_source=fermeture)


class OrganisationSearchView(generics.ListAPIView):
    serializer_class = OrganisationSearchSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        query = self.request.query_params.get('q', '').strip()
        if not query:
            return Organisation.objects.none()
        return Organisation.objects.filter(
            Q(name__icontains=query) | Q(email__icontains=query)
        ).order_by('name')


class OrganisationLevelsView(generics.RetrieveUpdateAPIView):
    serializer_class = OrganisationLevelsSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        organisation = self.request.user.organisation
        if not organisation:
            raise PermissionDenied('Votre compte n’est rattaché à aucune organisation.')
        return organisation


class _RegisterView(APIView):
    permission_classes = [AllowAny]
    serializer_class = None

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {'token': token.key, 'user': UserSummarySerializer(user).data},
            status=status.HTTP_201_CREATED,
        )


class RegisterPersonalOrganisationView(_RegisterView):
    serializer_class = RegisterPersonalOrganisationSerializer


class RegisterCompanyOrganisationView(_RegisterView):
    serializer_class = RegisterCompanyOrganisationSerializer


class RegisterMemberView(_RegisterView):
    serializer_class = RegisterMemberSerializer


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, _ = Token.objects.get_or_create(user=user)
        return Response({'token': token.key, 'user': UserSummarySerializer(user).data})


class EmployeeListView(generics.ListCreateAPIView):
    serializer_class = EmployeeSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return EmployeeCreateSerializer
        return EmployeeSerializer

    def get_queryset(self):
        organisation = self.request.user.organisation
        if not organisation:
            return User.objects.none()
        apply_fermetures_techniques(organisation)
        return (
            User.objects.filter(organisation=organisation)
            .select_related('team')
            .prefetch_related('grade_history__changed_by', 'affectation_history__changed_by',
                               'affectation_history__ancienne_equipe', 'affectation_history__nouvelle_equipe')
            .order_by('first_name', 'last_name')
        )

    def perform_create(self, serializer):
        if self.request.user.role not in ('admin', 'directeur'):
            raise PermissionDenied('Vous n’êtes pas autorisé à ajouter un employé.')
        if not self.request.user.organisation_id:
            raise PermissionDenied('Votre compte n’est rattaché à aucune organisation.')
        serializer.save()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        employee = EmployeeSerializer(serializer.instance, context=self.get_serializer_context())
        return Response(employee.data, status=status.HTTP_201_CREATED)


class EmployeeMeView(generics.RetrieveUpdateAPIView):
    serializer_class = EmployeeMeSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        apply_fermetures_techniques(self.request.user.organisation)
        self.request.user.refresh_from_db()
        return self.request.user


class EmployeeDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = EmployeeAdminUpdateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        organisation = self.request.user.organisation
        if not organisation:
            return User.objects.none()
        apply_fermetures_techniques(organisation)
        return User.objects.filter(organisation=organisation)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        employee = EmployeeSerializer(serializer.instance, context=self.get_serializer_context())
        return Response(employee.data)


class EmployeeAdminEditView(generics.UpdateAPIView):
    serializer_class = EmployeeAdminEditSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        organisation = self.request.user.organisation
        if not organisation:
            return User.objects.none()
        return User.objects.filter(organisation=organisation)

    def perform_update(self, serializer):
        if self.request.user.role not in ('admin', 'directeur'):
            raise PermissionDenied('Vous n’êtes pas autorisé à modifier un employé.')
        serializer.save()

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        employee = EmployeeSerializer(serializer.instance, context=self.get_serializer_context())
        return Response(employee.data)


class TeamListCreateView(generics.ListCreateAPIView):
    serializer_class = TeamSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        organisation = self.request.user.organisation
        if not organisation:
            return Team.objects.none()
        apply_fermetures_techniques(organisation)
        return Team.objects.filter(organisation=organisation).select_related('manager').prefetch_related('team_members')

    def get_serializer_context(self):
        return {**super().get_serializer_context(), 'request': self.request}


class TeamDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TeamSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        organisation = self.request.user.organisation
        if not organisation:
            return Team.objects.none()
        return Team.objects.filter(organisation=organisation)

    def get_serializer_context(self):
        return {**super().get_serializer_context(), 'request': self.request}

    def perform_destroy(self, instance):
        if instance.is_protected:
            raise PermissionDenied('Cette équipe est protégée et ne peut pas être supprimée.')
        if instance.lignes_budgetaires.exists():
            raise ValidationError({'detail': 'Cette équipe est utilisée par des lignes budgétaires : réaffectez-les avant de supprimer l’équipe.'})
        instance.delete()


class _TeamMembershipView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        organisation = request.user.organisation
        team = get_object_or_404(Team, pk=pk, organisation=organisation)
        user = get_object_or_404(User, pk=request.data.get('user_id'), organisation=organisation)
        self.apply(team, user, request.user)
        return Response(TeamSerializer(team, context={'request': request}).data)


class TeamAddMemberView(_TeamMembershipView):
    def apply(self, team, user, changed_by):
        user.move_to_team(team, changed_by=changed_by)


class TeamRemoveMemberView(_TeamMembershipView):
    def apply(self, team, user, changed_by):
        if user.team_id == team.id:
            user.move_to_team(None, changed_by=changed_by)


class CongeTypeListCreateView(generics.ListCreateAPIView):
    """Politiques de congé de l'organisation : consultées par tous, gérées par admin/directeur."""
    serializer_class = CongeTypeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        organisation = self.request.user.organisation
        if not organisation:
            return CongeType.objects.none()
        return CongeType.objects.filter(organisation=organisation)

    def perform_create(self, serializer):
        if self.request.user.role not in ('admin', 'directeur'):
            raise PermissionDenied('Vous n’êtes pas autorisé à configurer les types de congé.')
        if not self.request.user.organisation_id:
            raise PermissionDenied('Votre compte n’est rattaché à aucune organisation.')
        serializer.save()


class CongeTypeDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Modification d'un type de congé (nom, quota, unité, mode de période, actif/inactif) et
    suppression — réservée aux types « standard » créés par l'admin : Congé maladie et Congé
    Technique sont des types par défaut et ne peuvent pas être supprimés."""
    serializer_class = CongeTypeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        organisation = self.request.user.organisation
        if not organisation:
            return CongeType.objects.none()
        return CongeType.objects.filter(organisation=organisation)

    def perform_update(self, serializer):
        if self.request.user.role not in ('admin', 'directeur'):
            raise PermissionDenied('Vous n’êtes pas autorisé à configurer les types de congé.')
        serializer.save()

    def perform_destroy(self, instance):
        if self.request.user.role not in ('admin', 'directeur'):
            raise PermissionDenied('Vous n’êtes pas autorisé à configurer les types de congé.')
        if instance.categorie != 'standard':
            raise PermissionDenied('Ce type de congé par défaut ne peut pas être supprimé.')
        if instance.demandes.exists():
            raise ValidationError({'detail': 'Ce type est utilisé par des demandes existantes : désactivez-le plutôt que de le supprimer.'})
        instance.delete()


class CongeDemandeListCreateView(generics.ListCreateAPIView):
    """Demandes de congé du salarié connecté : consultation et dépôt."""
    serializer_class = CongeDemandeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        apply_fermetures_techniques(self.request.user.organisation)
        qs = CongeDemande.objects.filter(employee=self.request.user)
        auto_approve_stale_demandes(qs)
        return qs

    def perform_create(self, serializer):
        instance = serializer.save(employee=self.request.user)
        # Un congé maladie met en Congé dès sa déclaration, sans attendre l'approbation de l'admin.
        if instance.type_conge.categorie == 'maladie' and self.request.user.statut == 'actif':
            self.request.user.statut = 'conge'
            self.request.user.save(update_fields=['statut'])


class CongeDemandeDetailView(generics.RetrieveDestroyAPIView):
    """Un salarié ne peut consulter/retirer que ses propres demandes, et seulement si elles sont en attente."""
    serializer_class = CongeDemandeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        auto_approve_stale_demandes(CongeDemande.objects.filter(employee=self.request.user))
        return CongeDemande.objects.filter(employee=self.request.user, statut='attente')

    def perform_destroy(self, instance):
        employee = instance.employee
        was_maladie = instance.type_conge.categorie == 'maladie'
        instance.delete()
        if was_maladie and employee.statut == 'conge':
            employee.statut = 'actif'
            employee.save(update_fields=['statut'])


class OrganisationCongeDemandeListView(generics.ListAPIView):
    """Toutes les demandes de congé de l'organisation, pour la gestion RH/direction."""
    serializer_class = CongeDemandeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        organisation = self.request.user.organisation
        if not organisation:
            return CongeDemande.objects.none()
        apply_fermetures_techniques(organisation)
        qs = CongeDemande.objects.filter(employee__organisation=organisation)
        auto_approve_stale_demandes(qs)
        return qs.select_related('employee', 'reviewed_by')


class CongeDemandeReviewView(generics.UpdateAPIView):
    """Approbation ou refus d'une demande de congé par un admin/directeur de l'organisation."""
    serializer_class = CongeDemandeReviewSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        organisation = self.request.user.organisation
        if not organisation:
            return CongeDemande.objects.none()
        auto_approve_stale_demandes(CongeDemande.objects.filter(employee__organisation=organisation))
        return CongeDemande.objects.filter(employee__organisation=organisation, statut='attente')

    def perform_update(self, serializer):
        if self.request.user.role not in ('admin', 'directeur'):
            raise PermissionDenied('Vous n’êtes pas autorisé à traiter les demandes.')
        serializer.save(reviewed_by=self.request.user, reviewed_at=timezone.now())
        instance = serializer.instance
        employee = instance.employee
        if instance.statut == 'approuvee':
            if employee.statut == 'actif':
                employee.statut = 'conge'
                employee.save(update_fields=['statut'])
        elif instance.statut == 'refusee' and instance.type_conge.categorie == 'maladie':
            # Le congé maladie avait déjà mis l'employé en Congé dès sa déclaration : un refus le remet actif.
            if employee.statut == 'conge':
                employee.statut = 'actif'
                employee.save(update_fields=['statut'])

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(CongeDemandeSerializer(serializer.instance, context=self.get_serializer_context()).data)


class CongeDemandeEndView(generics.GenericAPIView):
    """Le salarié déclare reprendre le service avant (ou à) la fin prévue de son congé approuvé."""
    serializer_class = CongeDemandeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CongeDemande.objects.filter(employee=self.request.user, statut='approuvee', cloture=False)

    def post(self, request, pk):
        demande = get_object_or_404(self.get_queryset(), pk=pk)
        today = timezone.localdate()
        if demande.date_debut > today:
            return Response({'detail': 'Ce congé n’a pas encore commencé.'}, status=status.HTTP_400_BAD_REQUEST)
        update_fields = ['cloture']
        demande.cloture = True
        if demande.date_fin is None or demande.date_fin > today:
            demande.date_fin = today
            update_fields.append('date_fin')
        demande.save(update_fields=update_fields)

        employee = request.user
        if employee.statut == 'conge':
            employee.statut = 'actif'
            employee.save(update_fields=['statut'])

        return Response(CongeDemandeSerializer(demande, context=self.get_serializer_context()).data)


class CongeSoldeView(generics.GenericAPIView):
    """Cumul des jours de congé (acquis / pris / restants) du salarié connecté, par type de congé
    « standard » (maladie/technique n'ont pas de quota et ne sont pas comptés ici).

    - Quota annuel (unite='annee') : montant plein dès l'embauche, remis à plein chaque année
      civile — comportement inchangé, sans report d'une année sur l'autre.
    - Quota mensuel (unite='mois') : « banque de congés » qui s'accumule sans limite depuis la
      date d'embauche tant qu'elle n'est pas consommée (aucune remise à zéro annuelle) ; seuls
      les jours effectivement pris (congés approuvés, toutes années confondues) en sont déduits."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        employee = request.user
        organisation = employee.organisation
        if not organisation:
            return Response([])

        today = timezone.localdate()
        year_start = today.replace(month=1, day=1)
        date_embauche = employee.date_embauche or today

        results = []
        for conge_type in CongeType.objects.filter(organisation=organisation, actif=True, categorie='standard'):
            if conge_type.unite == 'annee':
                effective_start = max(date_embauche, year_start)
                jours_acquis = 0 if effective_start > today else (conge_type.jours_alloues or 0)
                demandes_prises = CongeDemande.objects.filter(
                    employee=employee, type_conge=conge_type, statut='approuvee', date_debut__year=today.year,
                )
            else:
                # Banque mensuelle : accumulation continue depuis l'embauche, jamais remise à zéro.
                if date_embauche > today:
                    jours_acquis = 0
                else:
                    months = (today.year - date_embauche.year) * 12 + (today.month - date_embauche.month)
                    if today.day >= date_embauche.day:
                        months += 1
                    jours_acquis = max(0, months) * (conge_type.jours_alloues or 0)
                demandes_prises = CongeDemande.objects.filter(
                    employee=employee, type_conge=conge_type, statut='approuvee',
                )

            jours_pris = sum(demande.duree for demande in demandes_prises)

            results.append({
                'type_conge': CongeTypeSerializer(conge_type, context=self.get_serializer_context()).data,
                'jours_acquis': jours_acquis,
                'jours_pris': jours_pris,
                'solde': max(0, jours_acquis - jours_pris),
            })
        return Response(results)


class AvanceDemandeListCreateView(generics.ListCreateAPIView):
    """Demandes d'avance sur salaire du salarié connecté : consultation et dépôt."""
    serializer_class = AvanceDemandeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = AvanceDemande.objects.filter(employee=self.request.user)
        auto_approve_stale_demandes(qs)
        return qs

    def perform_create(self, serializer):
        serializer.save(employee=self.request.user)


class AvanceDemandeDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = AvanceDemandeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        auto_approve_stale_demandes(AvanceDemande.objects.filter(employee=self.request.user))
        return AvanceDemande.objects.filter(employee=self.request.user, statut='attente')


class OrganisationAvanceDemandeListView(generics.ListAPIView):
    """Toutes les demandes d'avance de l'organisation, pour la gestion RH/direction."""
    serializer_class = AvanceDemandeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        organisation = self.request.user.organisation
        if not organisation:
            return AvanceDemande.objects.none()
        qs = AvanceDemande.objects.filter(employee__organisation=organisation)
        auto_approve_stale_demandes(qs)
        return qs.select_related('employee', 'reviewed_by')


class AvanceDemandeReviewView(generics.UpdateAPIView):
    """Approbation ou refus d'une demande d'avance par un admin/directeur de l'organisation."""
    serializer_class = AvanceDemandeReviewSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        organisation = self.request.user.organisation
        if not organisation:
            return AvanceDemande.objects.none()
        auto_approve_stale_demandes(AvanceDemande.objects.filter(employee__organisation=organisation))
        return AvanceDemande.objects.filter(employee__organisation=organisation, statut='attente')

    def perform_update(self, serializer):
        if self.request.user.role not in ('admin', 'directeur'):
            raise PermissionDenied('Vous n’êtes pas autorisé à traiter les demandes.')
        serializer.save(reviewed_by=self.request.user, reviewed_at=timezone.now())

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(AvanceDemandeSerializer(serializer.instance, context=self.get_serializer_context()).data)


class FermetureTechniqueListCreateView(generics.ListCreateAPIView):
    """Périodes de fermeture technique (congé technique) : consultées par tous les salariés
    de l'organisation, définies par admin/directeur. Ne crée aucune CongeDemande individuelle,
    mais met bien les employés couverts en statut « Congé » pendant la période (voir
    apply_fermetures_techniques)."""
    serializer_class = FermetureTechniqueSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        organisation = self.request.user.organisation
        if not organisation:
            return FermetureTechnique.objects.none()
        apply_fermetures_techniques(organisation)
        return FermetureTechnique.objects.filter(organisation=organisation).prefetch_related(
            'equipes_exceptees', 'employes_exceptes'
        )

    def perform_create(self, serializer):
        if self.request.user.role not in ('admin', 'directeur'):
            raise PermissionDenied('Vous n’êtes pas autorisé à configurer le congé technique.')
        if not self.request.user.organisation_id:
            raise PermissionDenied('Votre compte n’est rattaché à aucune organisation.')
        serializer.save()
        apply_fermetures_techniques(self.request.user.organisation)


class FermetureTechniqueDetailView(generics.RetrieveDestroyAPIView):
    """Suppression d'une période de fermeture technique mal configurée."""
    serializer_class = FermetureTechniqueSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        organisation = self.request.user.organisation
        if not organisation:
            return FermetureTechnique.objects.none()
        return FermetureTechnique.objects.filter(organisation=organisation)

    def perform_destroy(self, instance):
        if self.request.user.role not in ('admin', 'directeur'):
            raise PermissionDenied('Vous n’êtes pas autorisé à configurer le congé technique.')
        concernes = list(instance.employes_places_en_conge.filter(statut='conge').values_list('id', flat=True))
        instance.delete()
        if concernes:
            User.objects.filter(id__in=concernes, statut='conge').update(statut='actif', conge_technique_source=None)


class LigneBudgetaireListCreateView(generics.ListCreateAPIView):
    """Référentiel des lignes budgétaires (Architecture monétaire) : consulté par tous les
    membres de l'organisation, géré par admin/directeur."""
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        return LigneBudgetaireCreateSerializer if self.request.method == 'POST' else LigneBudgetaireSerializer

    def get_queryset(self):
        organisation = self.request.user.organisation
        if not organisation:
            return LigneBudgetaire.objects.none()
        return LigneBudgetaire.objects.filter(organisation=organisation).select_related('equipe', 'parent')

    def perform_create(self, serializer):
        if self.request.user.role not in ('admin', 'directeur'):
            raise PermissionDenied('Vous n’êtes pas autorisé à configurer l’architecture monétaire.')
        if not self.request.user.organisation_id:
            raise PermissionDenied('Votre compte n’est rattaché à aucune organisation.')
        serializer.save()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        ligne = LigneBudgetaireSerializer(serializer.instance, context=self.get_serializer_context())
        return Response(ligne.data, status=status.HTTP_201_CREATED)


class LigneBudgetaireDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Modification (nom, équipe, déclinaison, actif) et suppression d'une ligne budgétaire.
    Une ligne ayant des sous-lignes ne peut pas être supprimée."""
    serializer_class = LigneBudgetaireSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        organisation = self.request.user.organisation
        if not organisation:
            return LigneBudgetaire.objects.none()
        return LigneBudgetaire.objects.filter(organisation=organisation).select_related('equipe', 'parent')

    def perform_update(self, serializer):
        if self.request.user.role not in ('admin', 'directeur'):
            raise PermissionDenied('Vous n’êtes pas autorisé à configurer l’architecture monétaire.')
        serializer.save()

    def perform_destroy(self, instance):
        if self.request.user.role not in ('admin', 'directeur'):
            raise PermissionDenied('Vous n’êtes pas autorisé à configurer l’architecture monétaire.')
        if instance.enfants.exists():
            raise ValidationError({'detail': 'Cette ligne a des sous-lignes : supprimez-les d’abord.'})
        instance.delete()


class ProjectListCreateView(generics.ListCreateAPIView):
    """Projets de l'organisation (Création de projet). « brouillon » et « définitif » sont le
    même modèle, filtrable via ?statut=brouillon|definitif (Brouillon / Historique)."""
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        organisation = self.request.user.organisation
        if not organisation:
            return Project.objects.none()
        qs = Project.objects.filter(organisation=organisation).prefetch_related('lignes')
        statut = self.request.query_params.get('statut')
        if statut in ('brouillon', 'definitif'):
            qs = qs.filter(statut=statut)
        return qs

    def perform_create(self, serializer):
        if self.request.user.role not in ('admin', 'directeur'):
            raise PermissionDenied('Vous n’êtes pas autorisé à créer un projet.')
        if not self.request.user.organisation_id:
            raise PermissionDenied('Votre compte n’est rattaché à aucune organisation.')
        serializer.save()


class ProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Consultation, modification (informations générales) et suppression d'un projet."""
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        organisation = self.request.user.organisation
        if not organisation:
            return Project.objects.none()
        return Project.objects.filter(organisation=organisation).prefetch_related('lignes')

    def perform_update(self, serializer):
        if self.request.user.role not in ('admin', 'directeur'):
            raise PermissionDenied('Vous n’êtes pas autorisé à modifier ce projet.')
        serializer.save()

    def perform_destroy(self, instance):
        if self.request.user.role not in ('admin', 'directeur'):
            raise PermissionDenied('Vous n’êtes pas autorisé à supprimer ce projet.')
        instance.delete()


class ProjectLigneListCreateView(generics.ListCreateAPIView):
    """Lignes budgétaires/tâches rattachées à un projet donné."""
    serializer_class = ProjectLigneSerializer
    permission_classes = [IsAuthenticated]

    def get_project(self):
        organisation = self.request.user.organisation
        return get_object_or_404(Project, pk=self.kwargs['project_id'], organisation=organisation)

    def get_queryset(self):
        return ProjectLigne.objects.filter(project=self.get_project())

    def get_serializer_context(self):
        return {**super().get_serializer_context(), 'project': self.get_project()}

    def perform_create(self, serializer):
        if self.request.user.role not in ('admin', 'directeur'):
            raise PermissionDenied('Vous n’êtes pas autorisé à modifier ce projet.')
        serializer.save()


class ProjectLigneDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Modification/suppression d'une ligne budgétaire d'un projet."""
    serializer_class = ProjectLigneSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        organisation = self.request.user.organisation
        if not organisation:
            return ProjectLigne.objects.none()
        return ProjectLigne.objects.filter(project__organisation=organisation)

    def perform_update(self, serializer):
        if self.request.user.role not in ('admin', 'directeur'):
            raise PermissionDenied('Vous n’êtes pas autorisé à modifier ce projet.')
        serializer.save()

    def perform_destroy(self, instance):
        if self.request.user.role not in ('admin', 'directeur'):
            raise PermissionDenied('Vous n’êtes pas autorisé à modifier ce projet.')
        instance.delete()


class TaskTemplateListCreateView(generics.ListCreateAPIView):
    """Banque de tâches réutilisables (onglet Architecture des tâches) : consultée par tous,
    gérée par admin/directeur."""
    serializer_class = TaskTemplateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        organisation = self.request.user.organisation
        if not organisation:
            return TaskTemplate.objects.none()
        return TaskTemplate.objects.filter(organisation=organisation)

    def perform_create(self, serializer):
        if self.request.user.role not in ('admin', 'directeur'):
            raise PermissionDenied('Vous n’êtes pas autorisé à ajouter une tâche à la banque.')
        if not self.request.user.organisation_id:
            raise PermissionDenied('Votre compte n’est rattaché à aucune organisation.')
        serializer.save()


class TaskTemplateDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Modification et suppression d'une tâche de la banque. Bloquée si elle est déjà attribuée
    à une équipe (voir Task.template, PROTECT) : désactivez-la plutôt que de la supprimer."""
    serializer_class = TaskTemplateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        organisation = self.request.user.organisation
        if not organisation:
            return TaskTemplate.objects.none()
        return TaskTemplate.objects.filter(organisation=organisation)

    def perform_update(self, serializer):
        if self.request.user.role not in ('admin', 'directeur'):
            raise PermissionDenied('Vous n’êtes pas autorisé à modifier cette tâche de la banque.')
        serializer.save()

    def perform_destroy(self, instance):
        if self.request.user.role not in ('admin', 'directeur'):
            raise PermissionDenied('Vous n’êtes pas autorisé à supprimer cette tâche de la banque.')
        if instance.attributions.exists():
            raise ValidationError({'detail': 'Cette tâche est déjà attribuée à une ou plusieurs équipes : désactivez-la plutôt que de la supprimer.'})
        instance.delete()


class TaskListCreateView(generics.ListCreateAPIView):
    """Référentiel Architecture des tâches : consulté par tous, géré par admin/directeur.
    Filtrable via ?equipe=<id> ou ?assignee=<id> (utilisé par l'arborescence équipes/membres),
    ou ?staffing=1 pour ne renvoyer que les tâches lancées dont l'utilisateur connecté est le
    manager de l'équipe (utilisé par Nouveau staffing : une seule requête, un seul filtre)."""
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        organisation = self.request.user.organisation
        if not organisation:
            return Task.objects.none()
        qs = Task.objects.filter(organisation=organisation).select_related(
            'equipe', 'assignee', 'project_ligne__project', 'project_ligne__ligne_budgetaire',
        )
        equipe_id = self.request.query_params.get('equipe')
        assignee_id = self.request.query_params.get('assignee')
        if equipe_id:
            qs = qs.filter(equipe_id=equipe_id)
        if assignee_id:
            qs = qs.filter(assignee_id=assignee_id)
        if self.request.query_params.get('staffing'):
            qs = qs.filter(lancee=True, equipe__manager_id=self.request.user.id)
        return qs

    def perform_create(self, serializer):
        if self.request.user.role not in ('admin', 'directeur'):
            raise PermissionDenied('Vous n’êtes pas autorisé à créer une tâche.')
        if not self.request.user.organisation_id:
            raise PermissionDenied('Votre compte n’est rattaché à aucune organisation.')
        serializer.save()


def _can_manage_task(user, task):
    return user.role in ('admin', 'directeur') or task.equipe.manager_id == user.id


class TaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Consultation, modification et suppression d'une tâche. Le manager de l'équipe peut aussi
    modifier ses tâches (notamment `assignee`, depuis Nouveau staffing), pas seulement admin/directeur."""
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        organisation = self.request.user.organisation
        if not organisation:
            return Task.objects.none()
        return Task.objects.filter(organisation=organisation).select_related(
            'equipe', 'assignee', 'project_ligne__project', 'project_ligne__ligne_budgetaire',
        )

    def perform_update(self, serializer):
        if not _can_manage_task(self.request.user, self.get_object()):
            raise PermissionDenied('Vous n’êtes pas autorisé à modifier cette tâche.')
        serializer.save()

    def perform_destroy(self, instance):
        if self.request.user.role not in ('admin', 'directeur'):
            raise PermissionDenied('Vous n’êtes pas autorisé à supprimer cette tâche.')
        instance.delete()


class TaskLaunchView(generics.GenericAPIView):
    """Lance une tâche : elle devient visible dans Nouveau staffing pour le manager de son
    équipe, qui décide alors de se l'attribuer ou de l'attribuer à un membre de son équipe."""
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        organisation = self.request.user.organisation
        if not organisation:
            return Task.objects.none()
        return Task.objects.filter(organisation=organisation)

    def post(self, request, pk):
        task = get_object_or_404(self.get_queryset(), pk=pk)
        if not _can_manage_task(request.user, task):
            raise PermissionDenied('Vous n’êtes pas autorisé à lancer cette tâche.')
        if not task.lancee:
            task.lancee = True
            task.lancee_le = timezone.now()
            task.save(update_fields=['lancee', 'lancee_le'])
        return Response(TaskSerializer(task, context=self.get_serializer_context()).data)
