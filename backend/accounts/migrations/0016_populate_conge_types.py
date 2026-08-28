# Data migration: seed CongeType rows from the old hardcoded type_conge choices (per
# organisation that already used them), give every organisation at least a default type,
# and relink existing CongeDemande rows to the new FK before the old field is dropped.

from django.db import migrations

OLD_TYPE_CHOICES = {
    'annuel': ('Congé annuel payé', 2, 'mois', 'employe'),
    'exceptionnel': ('Congé exceptionnel', 3, 'annee', 'employe'),
    'maladie': ('Congé maladie', 90, 'annee', 'employe'),
    'sans_solde': ('Congé sans solde', 0, 'annee', 'employe'),
}


def resolve(key):
    return OLD_TYPE_CHOICES.get(key, (key or 'Congé', 0, 'annee', 'employe'))


def populate_conge_types(apps, schema_editor):
    Organisation = apps.get_model('accounts', 'Organisation')
    CongeType = apps.get_model('accounts', 'CongeType')
    CongeDemande = apps.get_model('accounts', 'CongeDemande')

    used_keys_by_org = {}
    for demande in CongeDemande.objects.select_related('employee').all():
        org_id = demande.employee.organisation_id
        if org_id is None:
            continue
        used_keys_by_org.setdefault(org_id, set()).add(demande.type_conge)

    for org_id, keys in used_keys_by_org.items():
        for key in keys:
            nom, jours, unite, mode = resolve(key)
            CongeType.objects.get_or_create(
                organisation_id=org_id, nom=nom,
                defaults={'jours_alloues': jours, 'unite': unite, 'mode_periode': mode},
            )

    # Toute organisation existante reçoit au moins un type par défaut, pour ne pas laisser
    # le formulaire de demande de congé vide.
    for organisation in Organisation.objects.all():
        CongeType.objects.get_or_create(
            organisation=organisation, nom='Congé annuel payé',
            defaults={'jours_alloues': 2, 'unite': 'mois', 'mode_periode': 'employe'},
        )

    for demande in CongeDemande.objects.select_related('employee').all():
        org_id = demande.employee.organisation_id
        if org_id is None:
            continue
        nom, *_ = resolve(demande.type_conge)
        conge_type = CongeType.objects.filter(organisation_id=org_id, nom=nom).first()
        if conge_type:
            demande.type_conge_new_id = conge_type.id
            demande.save(update_fields=['type_conge_new'])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0015_congetype_and_type_conge_new'),
    ]

    operations = [
        migrations.RunPython(populate_conge_types, noop),
    ]
