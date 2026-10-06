from django.db import migrations, models


def deplacer_source_des_entrees(apps, schema_editor):
    # Jusqu'ici, la source d'un approvisionnement était stockée dans `beneficiaire`. Elle part dans
    # `origine` ; le bénéficiaire d'une entrée devient la structure (calculé à l'affichage).
    MouvementTresorerie = apps.get_model('accounts', 'MouvementTresorerie')
    MouvementTresorerie.objects.filter(type_mouvement='Entrée').update(origine=models.F('beneficiaire'), beneficiaire='')


def remettre_demandes_sans_compte_en_brouillon(apps, schema_editor):
    # Une demande soumise avant que le compte à débiter soit obligatoire ne peut pas être exécutée :
    # elle repasse en brouillon pour être refaite avec un compte choisi.
    DemandePaiement = apps.get_model('accounts', 'DemandePaiement')
    DemandePaiement.objects.filter(statut='attente', compte__isnull=True).update(statut='brouillon')


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0071_employe_date_embauche_obligatoire'),
    ]

    operations = [
        migrations.AddField(
            model_name='mouvementtresorerie',
            name='origine',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.RunPython(deplacer_source_des_entrees, migrations.RunPython.noop),
        migrations.RunPython(remettre_demandes_sans_compte_en_brouillon, migrations.RunPython.noop),
    ]
