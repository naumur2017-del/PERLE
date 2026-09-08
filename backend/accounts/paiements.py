from pathlib import Path

from django.db import transaction
from django.db.models import Q
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, serializers
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import DemandePaiement, LigneBudgetaire, Project, ProjectLigne


class PaiementSerializer(serializers.ModelSerializer):
    numero = serializers.SerializerMethodField()
    paiement_numero = serializers.SerializerMethodField()
    projet_nom = serializers.CharField(source='projet.nom', read_only=True, default='')
    ligne_budgetaire_nom = serializers.SerializerMethodField()
    initie_par = serializers.SerializerMethodField()
    statut_libelle = serializers.CharField(source='get_statut_display', read_only=True)
    justificatif_nom = serializers.SerializerMethodField()

    class Meta:
        model = DemandePaiement
        fields = ['id', 'numero', 'paiement_numero', 'projet', 'projet_nom', 'ligne_budgetaire',
                  'ligne_budgetaire_nom', 'fournisseur', 'type_depense', 'montant', 'devise',
                  'date_depense', 'objet', 'commentaires', 'mode_paiement', 'statut',
                  'statut_libelle', 'initie_par', 'commentaire_execution', 'justificatif_nom',
                  'decided_at', 'created_at', 'updated_at']
        read_only_fields = ['devise', 'commentaire_execution', 'decided_at', 'created_at', 'updated_at']

    def get_numero(self, obj):
        return f'DP-{obj.created_at.year}-{obj.pk:06d}'

    def get_paiement_numero(self, obj):
        return f'PAY-{obj.created_at.year}-{obj.pk:06d}' if obj.statut != 'brouillon' else ''

    def get_ligne_budgetaire_nom(self, obj):
        return str(obj.ligne_budgetaire) if obj.ligne_budgetaire_id else ''

    def get_initie_par(self, obj):
        return f'{obj.created_by.first_name} {obj.created_by.last_name}'.strip() if obj.created_by else ''

    def get_justificatif_nom(self, obj):
        return Path(obj.justificatif.name).name if obj.justificatif else ''

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        org_id = self.context['request'].user.organisation_id
        self.fields['projet'].queryset = Project.objects.filter(organisation_id=org_id)
        self.fields['ligne_budgetaire'].queryset = LigneBudgetaire.objects.filter(organisation_id=org_id)

    def validate(self, attrs):
        value = lambda key, default=None: attrs.get(key, getattr(self.instance, key, default))
        statut = value('statut', 'brouillon')
        if statut not in ('brouillon', 'attente'):
            raise ValidationError({'statut': 'Utilisez la décision d’exécution pour accepter ou refuser.'})
        if value('montant', 0) < 0:
            raise ValidationError({'montant': 'Le montant ne peut pas être négatif.'})
        # Une dépense « Transversal » n'est rattachée à aucun projet ni ligne budgétaire précis —
        # même logique qu'une tâche transversale (Task.project nul) ailleurs dans l'application.
        # On les force à vide côté serveur (pas seulement côté formulaire) pour ne jamais laisser
        # une incohérence entrer par un appel API direct.
        is_transversal = value('type_depense') == 'Transversal'
        if is_transversal:
            attrs['projet'] = None
            attrs['ligne_budgetaire'] = None
        else:
            projet, ligne = value('projet'), value('ligne_budgetaire')
            if ligne and (not projet or not ProjectLigne.objects.filter(project=projet, ligne_budgetaire=ligne).exists()):
                raise ValidationError({'ligne_budgetaire': 'Cette ligne doit appartenir au projet sélectionné.'})
        if statut == 'attente':
            required_keys = ('fournisseur', 'type_depense', 'date_depense', 'objet') if is_transversal else (
                'projet', 'ligne_budgetaire', 'fournisseur', 'type_depense', 'date_depense', 'objet')
            errors = {key: 'Ce champ est obligatoire.' for key in required_keys if not value(key)}
            if value('montant', 0) <= 0:
                errors['montant'] = 'Le montant doit être strictement positif.'
            if errors:
                raise ValidationError(errors)
        return attrs


class PaiementScope:
    permission_classes = [IsAuthenticated]
    serializer_class = PaiementSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.organisation_id:
            return DemandePaiement.objects.none()
        qs = DemandePaiement.objects.filter(organisation_id=user.organisation_id)
        if user.role not in ('admin', 'directeur'):
            qs = qs.filter(Q(created_by=user))
        return qs.select_related('projet', 'ligne_budgetaire', 'created_by')


class PaiementListView(PaiementScope, generics.ListCreateAPIView):
    def perform_create(self, serializer):
        user = self.request.user
        if not user.organisation_id:
            raise PermissionDenied('Votre compte n’est rattaché à aucune organisation.')
        serializer.save(organisation=user.organisation, created_by=user, devise=user.organisation.currency_code)


class PaiementDetailView(PaiementScope, generics.RetrieveUpdateDestroyAPIView):
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']

    def update(self, request, *args, **kwargs):
        with transaction.atomic():
            instance = get_object_or_404(self.get_queryset().select_for_update(of=('self',)), pk=kwargs['pk'])
            if instance.statut != 'brouillon':
                raise ValidationError('Seuls les brouillons peuvent être modifiés.')
            serializer = self.get_serializer(instance, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        with transaction.atomic():
            instance = get_object_or_404(self.get_queryset().select_for_update(of=('self',)), pk=kwargs['pk'])
            if instance.statut != 'brouillon':
                raise ValidationError('Seuls les brouillons peuvent être supprimés.')
            instance.delete()
        return Response(status=204)


class DecisionSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=['accepte', 'refuse'])
    commentaire = serializers.CharField(required=False, allow_blank=True, default='', max_length=10000)
    fichier = serializers.FileField(required=False)
    mode_paiement = serializers.ChoiceField(choices=['Virement bancaire', 'Mobile Money', 'Espèces', 'Chèque'], required=False)

    def validate_fichier(self, fichier):
        if fichier.size > 10 * 1024 * 1024:
            raise ValidationError('Le fichier ne doit pas dépasser 10 Mo.')
        if Path(fichier.name).suffix.lower() not in ('.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx'):
            raise ValidationError('Format de justificatif non pris en charge.')
        return fichier

    def validate(self, attrs):
        if not attrs.get('commentaire') and not attrs.get('fichier'):
            raise ValidationError('Ajoutez un commentaire ou un justificatif.')
        if attrs['decision'] == 'accepte' and not attrs.get('mode_paiement'):
            raise ValidationError({'mode_paiement': 'Sélectionnez un mode de paiement.'})
        return attrs


class PaiementDecisionView(PaiementScope, APIView):
    def post(self, request, pk):
        if request.user.role not in ('admin', 'directeur'):
            raise PermissionDenied('Seuls les administrateurs et directeurs peuvent décider une exécution.')
        serializer = DecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        with transaction.atomic():
            paiement = get_object_or_404(self.get_queryset().select_for_update(of=('self',)), pk=pk)
            if paiement.statut != 'attente':
                raise ValidationError('Ce paiement n’est plus en attente d’exécution.')
            paiement.statut = 'execute' if data['decision'] == 'accepte' else 'refuse'
            paiement.commentaire_execution = data['commentaire']
            paiement.mode_paiement = data.get('mode_paiement', paiement.mode_paiement)
            if data.get('fichier'):
                paiement.justificatif = data['fichier']
            paiement.decided_by = request.user
            paiement.decided_at = timezone.now()
            paiement.save()
        return Response(PaiementSerializer(paiement, context={'request': request}).data)


class PaiementJustificatifView(PaiementScope, APIView):
    def get(self, request, pk):
        paiement = get_object_or_404(self.get_queryset().exclude(justificatif=''), pk=pk)
        return FileResponse(paiement.justificatif.open('rb'), as_attachment=True, filename=Path(paiement.justificatif.name).name)
