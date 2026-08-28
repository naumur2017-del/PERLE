# Generated manually: introduces CongeType as a configurable policy (replacing the old
# hardcoded type_conge choices), via a safe two-step field swap so existing data survives.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0014_congedemande_cloture'),
    ]

    operations = [
        migrations.AlterField(
            model_name='congedemande',
            name='date_debut',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='congedemande',
            name='date_fin',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.CreateModel(
            name='CongeType',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nom', models.CharField(max_length=100)),
                ('jours_alloues', models.PositiveIntegerField()),
                ('unite', models.CharField(choices=[('mois', 'Par mois'), ('annee', 'Par année')], default='annee', max_length=10)),
                ('mode_periode', models.CharField(choices=[('employe', 'Le salarié choisit la période'), ('entreprise', "L'entreprise définit la période")], default='employe', max_length=20)),
                ('actif', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('organisation', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='conge_types', to='accounts.organisation')),
            ],
            options={
                'ordering': ['nom'],
                'unique_together': {('organisation', 'nom')},
            },
        ),
        migrations.AddField(
            model_name='congedemande',
            name='type_conge_new',
            field=models.ForeignKey(
                null=True, on_delete=django.db.models.deletion.PROTECT, related_name='demandes', to='accounts.congetype',
            ),
        ),
    ]
