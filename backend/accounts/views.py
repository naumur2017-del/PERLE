from django.db.models import Q
from rest_framework import generics, status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Organisation
from .serializers import (
    LoginSerializer,
    MembershipRequestSerializer,
    OrganisationSearchSerializer,
    RegisterCompanyOrganisationSerializer,
    RegisterPersonalOrganisationSerializer,
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


class MembershipRequestCreateView(generics.CreateAPIView):
    serializer_class = MembershipRequestSerializer
    permission_classes = [AllowAny]


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, _ = Token.objects.get_or_create(user=user)
        return Response({'token': token.key, 'user': UserSummarySerializer(user).data})
