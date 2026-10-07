"""Export du « Journal de la trésorerie » (CSV, Excel ou PDF).

Le frontend envoie les identifiants des mouvements affichés dans le tableau (filtres et période
déjà appliqués) : l'export reprend exactement ces lignes, avec les KPI calculés sur ces mêmes lignes.
La mise en forme du fichier est commune à toutes les pages (voir accounts/exports.py)."""

from decimal import Decimal

from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from .access import CanViewTreasuryJournal
from .exports import MIME, reponse_tableau
from .models import MouvementTresorerie
from .tresorerie import MouvementSerializer

COLONNES = [
    'Date', 'Heure', 'Référence', 'Code projet', 'Libellé', 'Type', 'Compte',
    'Ordonnateur', 'Bénéficiaire', 'Montant', 'Justificatif', 'Exécuteur',
]


def _montant_fr(value):
    """Montant à la française : 1 234 567,00."""
    return f'{value:,.2f}'.replace(',', ' ').replace('.', ',')


def lignes_journal(mouvements):
    """Une liste de textes par mouvement, dans l'ordre du tableau (valeurs de MouvementSerializer)."""
    data = MouvementSerializer(mouvements, many=True).data
    lignes = []
    for item in data:
        local = timezone.localtime(parse_datetime(item['created_at']))
        lignes.append([
            local.strftime('%d/%m/%Y'), local.strftime('%H:%M'), item['reference'], item['projet_code'] or '—',
            item['libelle'], item['type_mouvement'], item['compte_nom'], item['initiateur_nom'] or '—',
            item['beneficiaire'] or '—', _montant_fr(Decimal(str(item['montant']))), item['justificatif_nom'] or '—',
            item['executeur_nom'] or '—',
        ])
    return lignes


def kpis_journal(mouvements):
    entrees = sum((m.montant for m in mouvements if m.type_mouvement == 'Entrée'), Decimal('0'))
    sorties = sum((m.montant for m in mouvements if m.type_mouvement == 'Sortie'), Decimal('0'))
    return [
        ('Total entrées', _montant_fr(entrees)),
        ('Total sorties', _montant_fr(sorties)),
        ('Solde net de la période', _montant_fr(entrees - sorties)),
        ("Nombre d'opérations", str(len(mouvements))),
    ]


class JournalExportSerializer(serializers.Serializer):
    format = serializers.ChoiceField(choices=list(MIME))
    date_debut = serializers.DateField()
    date_fin = serializers.DateField()
    mouvement_ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=True, max_length=10000)

    def validate(self, attrs):
        if attrs['date_fin'] < attrs['date_debut']:
            raise serializers.ValidationError({'date_fin': 'La date de fin doit être après la date de début.'})
        return attrs


class JournalExportView(APIView):
    """POST : télécharge le journal (CSV, Excel ou PDF) pour les mouvements affichés dans le tableau.
    Seuls les mouvements de l'organisation de l'utilisateur sont retenus, même si d'autres identifiants sont envoyés."""
    permission_classes = [IsAuthenticated, CanViewTreasuryJournal]

    def post(self, request):
        serializer = JournalExportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        mouvements = list(MouvementTresorerie.objects.filter(
            organisation_id=request.user.organisation_id, pk__in=data['mouvement_ids'],
        ).select_related('compte', 'projet', 'initiateur', 'executeur', 'organisation').order_by('-created_at', '-pk'))
        titre = 'Journal de la trésorerie'
        periode = f'Période du {data["date_debut"].strftime("%d/%m/%Y")} au {data["date_fin"].strftime("%d/%m/%Y")}'
        nom = f'journal-tresorerie_{data["date_debut"].isoformat()}_{data["date_fin"].isoformat()}'
        return reponse_tableau(data['format'], nom, titre, periode, kpis_journal(mouvements), COLONNES, lignes_journal(mouvements))
