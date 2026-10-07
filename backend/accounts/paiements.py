"""Ordonnances de paiement et leur circuit :

1. un manager d'équipe ou les Ressources établissent l'ordonnance (brouillon) puis la soumettent
   (« attente ») ;
2. la Direction la valide (« valide ») ou la refuse avec un motif (« refuse ») — page
   « Validation des paiements » ;
3. les Ressources l'exécutent en y joignant le justificatif (« execute ») : le compte choisi est
   débité et la sortie entre au journal — page « Exécutions des paiements ».

Chaque étape alerte les personnes concernées (cloche de notifications), et l'auteur suit
l'évolution de sa demande via son statut dans l'historique des ordonnances.
"""

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

from .access import (
    CanViewTreasury, can_create_payment_orders, can_execute_payments, can_validate_payments, can_view_all_payments,
)
from .models import (
    CompteTresorerie, DemandePaiement, LigneBudgetaire, MouvementTresorerie, Notification, Project, ProjectLigne, User,
)

MODES_PAIEMENT = ['Virement bancaire', 'Mobile Money', 'Espèces', 'Chèque']
REFUS_ORDONNANCE = 'Les ordonnances de paiement sont établies par les managers d’équipe et les Ressources.'


def _validate_justificatif(fichier):
    if fichier.size > 10 * 1024 * 1024:
        raise ValidationError('Le fichier ne doit pas dépasser 10 Mo.')
    if Path(fichier.name).suffix.lower() not in ('.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx'):
        raise ValidationError('Format de justificatif non pris en charge.')
    return fichier


def _nom(user):
    return f'{user.first_name} {user.last_name}'.strip() if user else ''


class PaiementSerializer(serializers.ModelSerializer):
    numero = serializers.SerializerMethodField()
    paiement_numero = serializers.SerializerMethodField()
    projet_nom = serializers.CharField(source='projet.nom', read_only=True, default='')
    ligne_budgetaire_nom = serializers.SerializerMethodField()
    compte_nom = serializers.CharField(source='compte.nom', read_only=True, default='')
    initie_par = serializers.SerializerMethodField()
    statut_libelle = serializers.CharField(source='get_statut_display', read_only=True)
    valide_par_nom = serializers.SerializerMethodField()
    execute_par_nom = serializers.SerializerMethodField()
    justificatif_nom = serializers.SerializerMethodField()
    # Justificatif déposé dès la création de la demande (image ou PDF) — remplacé à l'exécution
    # par la preuve de paiement jointe par les Ressources (voir ExecutionSerializer.fichier).
    justificatif = serializers.FileField(required=False, allow_null=True, write_only=True)

    class Meta:
        model = DemandePaiement
        fields = ['id', 'numero', 'paiement_numero', 'reference_demande', 'projet', 'projet_nom', 'ligne_budgetaire',
                  'ligne_budgetaire_nom', 'fournisseur', 'type_depense', 'montant', 'devise',
                  'date_depense', 'objet', 'commentaires', 'mode_paiement', 'statut',
                  'statut_libelle', 'compte', 'compte_nom', 'initie_par', 'commentaire_execution', 'justificatif', 'justificatif_nom',
                  'valide_par_nom', 'valide_le', 'motif_refus', 'execute_par_nom',
                  'decided_at', 'created_at', 'updated_at']
        read_only_fields = ['devise', 'mode_paiement', 'commentaire_execution', 'valide_le', 'motif_refus', 'decided_at', 'created_at', 'updated_at']

    def validate_justificatif(self, fichier):
        return _validate_justificatif(fichier)

    def get_numero(self, obj):
        return f'DP-{obj.created_at.year}-{obj.pk:06d}'

    def get_paiement_numero(self, obj):
        return f'PAY-{obj.created_at.year}-{obj.pk:06d}' if obj.statut != 'brouillon' else ''

    def get_ligne_budgetaire_nom(self, obj):
        return str(obj.ligne_budgetaire) if obj.ligne_budgetaire_id else ''

    def get_initie_par(self, obj):
        return _nom(obj.created_by)

    def get_valide_par_nom(self, obj):
        return _nom(obj.valide_par)

    def get_execute_par_nom(self, obj):
        return _nom(obj.decided_by)

    def get_justificatif_nom(self, obj):
        return Path(obj.justificatif.name).name if obj.justificatif else ''

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        org_id = self.context['request'].user.organisation_id
        self.fields['projet'].queryset = Project.objects.filter(organisation_id=org_id)
        self.fields['ligne_budgetaire'].queryset = LigneBudgetaire.objects.filter(organisation_id=org_id)
        self.fields['compte'].queryset = CompteTresorerie.objects.filter(organisation_id=org_id)

    def validate(self, attrs):
        value = lambda key, default=None: attrs.get(key, getattr(self.instance, key, default))
        statut = value('statut', 'brouillon')
        if statut not in ('brouillon', 'attente'):
            raise ValidationError({'statut': 'Une ordonnance est validée par la Direction puis exécutée par les Ressources.'})
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
            # Le compte à débiter est exigé dès la soumission : c'est lui qui recevra la sortie à l'exécution.
            required_keys = ('compte', 'fournisseur', 'type_depense', 'date_depense', 'objet') if is_transversal else (
                'projet', 'ligne_budgetaire', 'compte', 'fournisseur', 'type_depense', 'date_depense', 'objet')
            errors = {key: 'Ce champ est obligatoire.' for key in required_keys if not value(key)}
            if value('montant', 0) <= 0:
                errors['montant'] = 'Le montant doit être strictement positif.'
            if errors:
                raise ValidationError(errors)
        return attrs


# --- Alertes ---------------------------------------------------------------------------------

def _membres_equipe_protegee(organisation_id, niveau):
    return Q(organisation_id=organisation_id) & (
        Q(team__is_protected=True, team__niveau=niveau)
        | Q(teams_managed__is_protected=True, teams_managed__niveau=niveau)
    )


def _direction(organisation_id):
    """Destinataires des alertes de la Direction : directeur(s) et équipe Direction Générale."""
    return User.objects.filter(
        Q(organisation_id=organisation_id, role='directeur') | _membres_equipe_protegee(organisation_id, 1)
    ).distinct()


def _ressources(organisation_id):
    """Destinataires des alertes « à exécuter » : équipe Ressources (membres et manager)."""
    return User.objects.filter(_membres_equipe_protegee(organisation_id, 3)).distinct()


def _alerter(destinataires, message, cible_type, paiement, sauf=None):
    """Alerte (cloche de notifications) à une étape du circuit d'une ordonnance. L'auteur de
    l'action n'est pas alerté de sa propre action ; chaque personne ne reçoit l'alerte qu'une fois."""
    vus = set()
    for user in destinataires:
        if user is None or user.pk in vus or (sauf is not None and user.pk == sauf.pk):
            continue
        vus.add(user.pk)
        Notification.objects.create(user=user, message=message[:255], cible_type=cible_type, cible_id=paiement.pk)


def _numero(paiement):
    return f'DP-{paiement.created_at.year}-{paiement.pk:06d}'


def _libelle(paiement):
    return f'{paiement.objet or "ordonnance"} — {paiement.montant:,.0f} {paiement.devise}'.replace(',', ' ')


def _alerter_soumission(paiement, auteur):
    _alerter(
        _direction(paiement.organisation_id),
        f'Ordonnance {_numero(paiement)} à valider : {_libelle(paiement)} (soumise par {_nom(auteur) or auteur.email}).',
        'paiement_validation', paiement, sauf=auteur,
    )


# --- Vues ------------------------------------------------------------------------------------

class PaiementScope:
    # Les pages Trésorerie ne sont visibles que par la direction, le pilotage, les ressources
    # et les managers (voir accounts/access.py).
    permission_classes = [IsAuthenticated, CanViewTreasury]
    serializer_class = PaiementSerializer

    def get_queryset(self):
        """La Direction (qui valide) et les Ressources (qui exécutent) voient toutes les
        ordonnances soumises, plus leurs propres brouillons ; les autres (managers) ne voient que
        les leurs, dont ils suivent l'évolution via le statut."""
        user = self.request.user
        if not user.organisation_id:
            return DemandePaiement.objects.none()
        qs = DemandePaiement.objects.filter(organisation_id=user.organisation_id)
        if can_view_all_payments(user):
            qs = qs.filter(Q(created_by=user) | ~Q(statut='brouillon'))
        else:
            qs = qs.filter(created_by=user)
        return qs.select_related('projet', 'ligne_budgetaire', 'created_by', 'valide_par', 'decided_by', 'compte')


class PaiementListView(PaiementScope, generics.ListCreateAPIView):
    def create(self, request, *args, **kwargs):
        # Vérifié avant la validation : un refus d'accès prime sur les erreurs de saisie.
        if not can_create_payment_orders(request.user):
            raise PermissionDenied(REFUS_ORDONNANCE)
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        user = self.request.user
        if not user.organisation_id:
            raise PermissionDenied('Votre compte n’est rattaché à aucune organisation.')
        paiement = serializer.save(organisation=user.organisation, created_by=user, devise=user.organisation.currency_code)
        if paiement.statut == 'attente':
            _alerter_soumission(paiement, user)


class PaiementDetailView(PaiementScope, generics.RetrieveUpdateDestroyAPIView):
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']

    def _brouillon_a_soi(self, request, pk):
        """Seul l'auteur d'un brouillon peut le modifier, le soumettre ou le supprimer."""
        if not can_create_payment_orders(request.user):
            raise PermissionDenied(REFUS_ORDONNANCE)
        instance = get_object_or_404(self.get_queryset().select_for_update(of=('self',)), pk=pk)
        if instance.created_by_id != request.user.pk and request.user.role != 'admin':
            raise PermissionDenied('Seul l’auteur de l’ordonnance peut la modifier.')
        if instance.statut != 'brouillon':
            raise ValidationError('Seuls les brouillons peuvent être modifiés ou supprimés.')
        return instance

    def update(self, request, *args, **kwargs):
        with transaction.atomic():
            instance = self._brouillon_a_soi(request, kwargs['pk'])
            serializer = self.get_serializer(instance, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            paiement = serializer.save()
            if paiement.statut == 'attente':
                _alerter_soumission(paiement, request.user)
            return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        with transaction.atomic():
            self._brouillon_a_soi(request, kwargs['pk']).delete()
        return Response(status=204)


class ValidationSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=['accepte', 'refuse'])
    motif = serializers.CharField(required=False, allow_blank=True, default='', max_length=2000)

    def validate(self, attrs):
        if attrs['decision'] == 'refuse' and not attrs['motif'].strip():
            raise ValidationError({'motif': 'Indiquez la raison du refus.'})
        return attrs


class PaiementValidationView(PaiementScope, APIView):
    """Direction : accepte (→ à exécuter par les Ressources) ou refuse (motif obligatoire) une
    ordonnance soumise."""

    def post(self, request, pk):
        if not can_validate_payments(request.user):
            raise PermissionDenied('Seule la Direction valide les ordonnances de paiement.')
        serializer = ValidationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        with transaction.atomic():
            paiement = get_object_or_404(self.get_queryset().select_for_update(of=('self',)), pk=pk)
            if paiement.statut != 'attente':
                raise ValidationError('Cette ordonnance n’est plus en attente de validation.')
            paiement.statut = 'valide' if data['decision'] == 'accepte' else 'refuse'
            paiement.motif_refus = data['motif'].strip() if paiement.statut == 'refuse' else ''
            paiement.valide_par = request.user
            paiement.valide_le = timezone.now()
            paiement.save()
        numero = _numero(paiement)
        if paiement.statut == 'valide':
            _alerter([paiement.created_by], f'Votre ordonnance {numero} a été validée par la Direction ({_libelle(paiement)}) : elle passe en exécution.',
                     'paiement', paiement, sauf=request.user)
            _alerter(_ressources(paiement.organisation_id), f'Ordonnance {numero} validée, à exécuter : {_libelle(paiement)}.',
                     'paiement_execution', paiement, sauf=request.user)
        else:
            _alerter([paiement.created_by], f'Votre ordonnance {numero} a été refusée par la Direction. Motif : {paiement.motif_refus}',
                     'paiement', paiement, sauf=request.user)
        return Response(PaiementSerializer(paiement, context={'request': request}).data)


class ExecutionSerializer(serializers.Serializer):
    fichier = serializers.FileField()
    mode_paiement = serializers.ChoiceField(choices=MODES_PAIEMENT)
    commentaire = serializers.CharField(required=False, allow_blank=True, default='', max_length=10000)

    def validate_fichier(self, fichier):
        return _validate_justificatif(fichier)


def _debiter_compte(paiement, executeur):
    """Enregistre la sortie de trésorerie d'un paiement exécuté, sur le compte choisi à la demande.

    Appelé dans la transaction de l'exécution : le compte est verrouillé pour que deux paiements
    ne puissent pas consommer le même solde en parallèle, et un solde insuffisant annule l'exécution."""
    if not paiement.compte_id:
        raise ValidationError({'compte': 'Aucun compte à débiter n’est renseigné pour cette demande.'})
    compte = CompteTresorerie.objects.select_for_update(of=('self',)).get(pk=paiement.compte_id)
    solde = compte.solde_actuel()
    if paiement.montant > solde:
        raise ValidationError({'compte': f'Solde insuffisant sur {compte.nom} : {solde} disponible pour {paiement.montant}.'})
    MouvementTresorerie.objects.create(
        organisation_id=paiement.organisation_id, compte=compte, type_mouvement='Sortie', nature='Paiement',
        libelle=paiement.objet, montant=paiement.montant, beneficiaire=paiement.fournisseur,
        projet=paiement.projet, demande=paiement, initiateur=paiement.created_by, executeur=executeur,
        justificatif=paiement.justificatif,
    )


class PaiementExecutionView(PaiementScope, APIView):
    """Ressources : exécutent une ordonnance validée en y joignant le justificatif ; le compte
    choisi est débité et la sortie apparaît dans le journal de la trésorerie."""

    def post(self, request, pk):
        if not can_execute_payments(request.user):
            raise PermissionDenied('Seules les Ressources exécutent les paiements.')
        serializer = ExecutionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        with transaction.atomic():
            paiement = get_object_or_404(self.get_queryset().select_for_update(of=('self',)), pk=pk)
            if paiement.statut != 'valide':
                raise ValidationError('Seule une ordonnance validée par la Direction peut être exécutée.')
            paiement.statut = 'execute'
            paiement.justificatif = data['fichier']
            paiement.mode_paiement = data['mode_paiement']
            paiement.commentaire_execution = data['commentaire']
            paiement.decided_by = request.user
            paiement.decided_at = timezone.now()
            _debiter_compte(paiement, request.user)
            paiement.save()
        numero = _numero(paiement)
        _alerter([paiement.created_by], f'Votre ordonnance {numero} a été exécutée ({_libelle(paiement)}, {paiement.mode_paiement}).',
                 'paiement', paiement, sauf=request.user)
        _alerter(_direction(paiement.organisation_id), f'Ordonnance {numero} exécutée par les Ressources : {_libelle(paiement)} ({paiement.mode_paiement}).',
                 'paiement_execute', paiement, sauf=request.user)
        return Response(PaiementSerializer(paiement, context={'request': request}).data)


class PaiementJustificatifView(PaiementScope, APIView):
    def get(self, request, pk):
        paiement = get_object_or_404(self.get_queryset().exclude(justificatif=''), pk=pk)
        return FileResponse(paiement.justificatif.open('rb'), as_attachment=True, filename=Path(paiement.justificatif.name).name)
