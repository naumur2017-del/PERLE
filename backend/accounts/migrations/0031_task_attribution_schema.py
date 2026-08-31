from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0030_finalize_task_template'),
    ]

    operations = [
        migrations.AddField(
            model_name='task',
            name='description',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='task',
            name='project',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='tasks', to='accounts.project'),
        ),
        migrations.AddField(
            model_name='task',
            name='ligne_budgetaire',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.PROTECT, related_name='taches', to='accounts.lignebudgetaire'),
        ),
        migrations.AddField(
            model_name='task',
            name='echeance',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='task',
            name='priorite',
            field=models.CharField(choices=[('haute', 'Haute'), ('moyenne', 'Moyenne'), ('basse', 'Basse')], default='moyenne', max_length=10),
        ),
        migrations.AddField(
            model_name='task',
            name='statut',
            field=models.CharField(choices=[('envoyee', 'Envoyée'), ('acceptee', 'Acceptée'), ('refusee', 'Refusée')], default='envoyee', max_length=10),
        ),
        migrations.AddField(
            model_name='task',
            name='statut_decide_le',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='task',
            name='project_ligne',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.PROTECT, related_name='taches', to='accounts.projectligne'),
        ),
    ]
