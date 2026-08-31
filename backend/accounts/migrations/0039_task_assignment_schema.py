from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0038_task_demarree_le_task_execution_statut_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='organisation',
            name='taux_ehs_fcfa',
            field=models.DecimalField(decimal_places=2, default=150, max_digits=8),
        ),
        migrations.CreateModel(
            name='TaskAssignment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('heures', models.DecimalField(decimal_places=2, max_digits=6)),
                ('grade_snapshot', models.PositiveIntegerField()),
                ('taux_snapshot', models.DecimalField(decimal_places=2, max_digits=8)),
                ('ehs_consomme', models.DecimalField(decimal_places=2, max_digits=10)),
                ('montant_fcfa', models.DecimalField(decimal_places=2, max_digits=14)),
                ('execution_statut', models.CharField(choices=[('a_demarrer', 'À démarrer'), ('en_cours', 'En cours'), ('en_pause', 'En pause'), ('terminee', 'Terminée')], default='a_demarrer', max_length=12)),
                ('demarree_le', models.DateTimeField(blank=True, null=True)),
                ('terminee_le', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to='accounts.user')),
                ('task', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='assignments', to='accounts.task')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='task_assignments', to='accounts.user')),
            ],
            options={
                'ordering': ['-created_at'],
                'unique_together': {('task', 'user')},
            },
        ),
    ]
