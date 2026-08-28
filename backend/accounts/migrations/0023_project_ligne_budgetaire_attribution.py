import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0022_project_and_project_ligne'),
    ]

    operations = [
        migrations.AddField(
            model_name='lignebudgetaire',
            name='montant_prevu',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=16, null=True),
        ),
        migrations.RemoveField(model_name='projectligne', name='nom'),
        migrations.RemoveField(model_name='projectligne', name='type_ligne'),
        migrations.RemoveField(model_name='projectligne', name='division'),
        migrations.RemoveField(model_name='projectligne', name='ehs'),
        migrations.AddField(
            model_name='projectligne',
            name='ligne_budgetaire',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT, related_name='project_lignes',
                to='accounts.lignebudgetaire', null=True,
            ),
        ),
        migrations.AlterField(
            model_name='projectligne',
            name='ligne_budgetaire',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT, related_name='project_lignes',
                to='accounts.lignebudgetaire',
            ),
        ),
        migrations.AlterUniqueTogether(
            name='projectligne',
            unique_together={('project', 'code'), ('project', 'ligne_budgetaire')},
        ),
    ]
