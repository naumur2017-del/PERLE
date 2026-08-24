from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Organisation, Team, User
from .serializers import (
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


class EmployeeListView(generics.ListAPIView):
    serializer_class = EmployeeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        organisation = self.request.user.organisation
        if not organisation:
            return User.objects.none()
        return User.objects.filter(organisation=organisation).select_related('team').order_by('first_name', 'last_name')


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


class _TeamMembershipView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        organisation = request.user.organisation
        team = get_object_or_404(Team, pk=pk, organisation=organisation)
        user = get_object_or_404(User, pk=request.data.get('user_id'), organisation=organisation)
        self.apply(team, user)
        return Response(TeamSerializer(team, context={'request': request}).data)


class TeamAddMemberView(_TeamMembershipView):
    def apply(self, team, user):
        user.move_to_team(team)


class TeamRemoveMemberView(_TeamMembershipView):
    def apply(self, team, user):
        if user.team_id == team.id:
            user.move_to_team(None)
