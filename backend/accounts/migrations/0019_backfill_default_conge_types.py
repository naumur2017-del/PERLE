# Amorce les types « Congé maladie » et « Congé Technique » pour les organisations déjà
# existantes. get_or_create ne touche jamais une ligne dont le nom existe déjà pour
# l'organisation (ex. une organisation où l'admin a déjà créé/personnalisé un type portant l'un
# de ces noms) : dans ce cas la ligne existante n'est pas modifiée, seule sa catégorie reste
# 'standard' (valeur par défaut), ce qui préserve exactement le comportement/quota déjà en place.
from django.db import migrations


DEFAULT_CONGE_TYPES = (
    (
        'Congé maladie', 'maladie', None, None, None,
        "Pas de quota. Le salarié indique uniquement une date de début : le congé reste "
        "ouvert jusqu'à ce qu'il déclare sa reprise du travail, qui en fixe alors la fin.",
    ),
    (
        'Congé Technique', 'technique', None, None, None,
        "Fermeture collective configurée depuis Demandes > Congé Technique (période et "
        "exceptions par équipe ou par salarié). N'apparaît pas dans le formulaire de demande "
        "et ne consomme aucun quota personnel.",
    ),
)


def backfill(apps, schema_editor):
    Organisation = apps.get_model('accounts', 'Organisation')
    CongeType = apps.get_model('accounts', 'CongeType')
    for organisation in Organisation.objects.all():
        for nom, categorie, jours, unite, mode, description in DEFAULT_CONGE_TYPES:
            CongeType.objects.get_or_create(
                organisation=organisation, nom=nom,
                defaults={
                    'categorie': categorie, 'jours_alloues': jours, 'unite': unite,
                    'mode_periode': mode, 'description': description,
                },
            )


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0018_conge_categories_and_fermeture'),
    ]

    operations = [
        migrations.RunPython(backfill, noop),
    ]
