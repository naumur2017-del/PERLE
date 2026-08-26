from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.authtoken.models import Token
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Organisation, Team, User
from .serializers import (
    EmployeeAdminEditSerializer,
    EmployeeAdminUpdateSerializer,
    EmployeeCreateSerializer,
    EmployeeMeSerializer,
    EmployeeSerializer,
    LoginSerializer,
    OrganisationSearchSerializer,
    RegisterCompanyOrganisationSerializer,
    RegisterMemberSerializer,
    RegisterPersonalOrganisationSerializer,
    TeamSerializer,
    UserSummarySerializer,
)


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
