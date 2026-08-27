from datetime import timedelta

from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.authtoken.models import Token
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AvanceDemande, CongeDemande, Organisation, Team, User
from .serializers import (
    AvanceDemandeReviewSerializer,
    AvanceDemandeSerializer,
    CongeDemandeReviewSerializer,
    CongeDemandeSerializer,
    EmployeeAdminEditSerializer,
    EmployeeAdminUpdateSerializer,
    EmployeeCreateSerializer,
    EmployeeMeSerializer,
    EmployeeSerializer,
    LoginSerializer,
    OrganisationLevelsSerializer,
    OrganisationSearchSerializer,
    RegisterCompanyOrganisationSerializer,
    RegisterMemberSerializer,
    RegisterPersonalOrganisationSerializer,
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
        employee_ids = list(stale.values_list('employee_id', flat=True))
        stale.update(statut='approuvee', reviewed_at=timezone.now())
        if employee_ids:
            User.objects.filter(id__in=employee_ids, statut='actif').update(statut='conge')
    else:
        stale.update(statut='approuvee', reviewed_at=timezone.now())


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
        return self.request.user


class EmployeeDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = EmployeeAdminUpdateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        organisation = self.request.user.organisation
        if not organisation:
            return User.objects.none()
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


class CongeDemandeListCreateView(generics.ListCreateAPIView):
    """Demandes de congé du salarié connecté : consultation et dépôt."""
    serializer_class = CongeDemandeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = CongeDemande.objects.filter(employee=self.request.user)
        auto_approve_stale_demandes(qs)
        return qs

    def perform_create(self, serializer):
        serializer.save(employee=self.request.user)


class CongeDemandeDetailView(generics.RetrieveDestroyAPIView):
    """Un salarié ne peut consulter/retirer que ses propres demandes, et seulement si elles sont en attente."""
    serializer_class = CongeDemandeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        auto_approve_stale_demandes(CongeDemande.objects.filter(employee=self.request.user))
        return CongeDemande.objects.filter(employee=self.request.user, statut='attente')


class OrganisationCongeDemandeListView(generics.ListAPIView):
    """Toutes les demandes de congé de l'organisation, pour la gestion RH/direction."""
    serializer_class = CongeDemandeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        organisation = self.request.user.organisation
        if not organisation:
            return CongeDemande.objects.none()
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
        if serializer.instance.statut == 'approuvee':
            employee = serializer.instance.employee
            if employee.statut == 'actif':
                employee.statut = 'conge'
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
        if demande.date_fin > today:
            demande.date_fin = today
            update_fields.append('date_fin')
        demande.save(update_fields=update_fields)

        employee = request.user
        if employee.statut == 'conge':
            employee.statut = 'actif'
            employee.save(update_fields=['statut'])

        return Response(CongeDemandeSerializer(demande, context=self.get_serializer_context()).data)


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
