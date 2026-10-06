from decimal import Decimal
from pathlib import Path

from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import generics, serializers
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .access import CanViewTreasury, can_manage_treasury_accounts
from .models import CompteTresorerie, MouvementTresorerie
from .paiements import _validate_justificatif


def _nom_utilisateur(user):
    return f'{user.first_name} {user.last_name}'.strip() if user else ''


class CompteSerializer(serializers.ModelSerializer):
    solde_actuel = serializers.SerializerMethodField()

    class Meta:
        model = CompteTresorerie
        fields = ['id', 'nom', 'code', 'sous_libelle', 'solde_initial', 'solde_actuel', 'created_at']
        read_only_fields = ['created_at']

    def get_solde_actuel(self, obj):
        return obj.solde_actuel()

    def validate_code(self, code):
        code = code.strip()
        organisation_id = self.context['request'].user.organisation_id
        existing = CompteTresorerie.objects.filter(organisation_id=organisation_id, code=code)
        if self.instance is not None:
            existing = existing.exclude(pk=self.instance.pk)
        if existing.exists():
            raise ValidationError('Un compte porte déjà ce code.')
        return code

    def validate_solde_initial(self, value):
        if value < 0:
            raise ValidationError('Le solde initial ne peut pas être négatif.')
        return value


class RapprovisionnementSerializer(serializers.Serializer):
    montant = serializers.DecimalField(max_digits=16, decimal_places=2, min_value=Decimal('0.01'))
    libelle = serializers.CharField(max_length=255)
    source = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    justificatif = serializers.FileField(required=False, allow_null=True)

    def validate_justificatif(self, fichier):
        return _validate_justificatif(fichier)


class MouvementSerializer(serializers.ModelSerializer):
    reference = serializers.SerializerMethodField()
    beneficiaire = serializers.SerializerMethodField()
    compte_nom = serializers.CharField(source='compte.nom', read_only=True)
    compte_code = serializers.CharField(source='compte.code', read_only=True)
    projet_code = serializers.CharField(source='projet.code', read_only=True, default='')
    projet_nom = serializers.CharField(source='projet.nom', read_only=True, default='')
    initiateur_nom = serializers.SerializerMethodField()
    executeur_nom = serializers.SerializerMethodField()
    justificatif_nom = serializers.SerializerMethodField()

    class Meta:
        model = MouvementTresorerie
        fields = ['id', 'reference', 'created_at', 'compte', 'compte_nom', 'compte_code', 'type_mouvement', 'nature',
                  'libelle', 'montant', 'beneficiaire', 'origine', 'projet', 'projet_code', 'projet_nom', 'initiateur_nom',
                  'executeur_nom', 'justificatif_nom']

    def get_reference(self, obj):
        if obj.demande_id:
            return f'PAY-{obj.created_at.year}-{obj.demande_id:06d}'
        return f'MVT-{obj.created_at.year}-{obj.pk:06d}'

    def get_beneficiaire(self, obj):
        # Une entrée profite à la structure ; une sortie va au fournisseur payé.
        if obj.type_mouvement == 'Entrée':
            return obj.organisation.name
        return obj.beneficiaire

    def get_initiateur_nom(self, obj):
        return _nom_utilisateur(obj.initiateur)

    def get_executeur_nom(self, obj):
        return _nom_utilisateur(obj.executeur)

    def get_justificatif_nom(self, obj):
        return Path(obj.justificatif.name).name if obj.justificatif else ''


class TresorerieScope:
    permission_classes = [IsAuthenticated, CanViewTreasury]

    def organisation_id(self):
        return self.request.user.organisation_id


class CompteListCreateView(TresorerieScope, generics.ListCreateAPIView):
    serializer_class = CompteSerializer

    def get_queryset(self):
        if not self.organisation_id():
            return CompteTresorerie.objects.none()
        return CompteTresorerie.objects.filter(organisation_id=self.organisation_id())

    def create(self, request, *args, **kwargs):
        if not can_manage_treasury_accounts(request.user):
            raise PermissionDenied('Seuls les administrateurs et directeurs peuvent créer un compte.')
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(organisation=self.request.user.organisation, created_by=self.request.user)


class CompteRapprovisionnerView(TresorerieScope, APIView):
    def post(self, request, pk):
        if not can_manage_treasury_accounts(request.user):
            raise PermissionDenied('Seuls les administrateurs et directeurs peuvent rapprovisionner un compte.')
        serializer = RapprovisionnementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        with transaction.atomic():
            compte = get_object_or_404(
                CompteTresorerie.objects.filter(organisation_id=self.organisation_id()).select_for_update(of=('self',)),
                pk=pk,
            )
            mouvement = MouvementTresorerie.objects.create(
                organisation=compte.organisation, compte=compte, type_mouvement='Entrée', nature='Approvisionnement',
                libelle=data['libelle'], montant=data['montant'], origine=data['source'],
                initiateur=request.user, executeur=request.user, justificatif=data.get('justificatif') or '',
            )
        return Response(MouvementSerializer(mouvement, context={'request': request}).data, status=201)


class MouvementListView(TresorerieScope, generics.ListAPIView):
    serializer_class = MouvementSerializer

    def get_queryset(self):
        if not self.organisation_id():
            return MouvementTresorerie.objects.none()
        return MouvementTresorerie.objects.filter(organisation_id=self.organisation_id()).select_related(
            'compte', 'projet', 'initiateur', 'executeur', 'organisation',
        )
