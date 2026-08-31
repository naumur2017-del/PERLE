from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0033_finalize_task_attribution'),
    ]

    operations = [
        migrations.AddField(
            model_name='tasktemplate',
            name='parent',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='enfants', to='accounts.tasktemplate'),
        ),
        migrations.AddField(
            model_name='tasktemplate',
            name='niveau',
            field=models.PositiveSmallIntegerField(default=1),
        ),
        migrations.AddField(
            model_name='tasktemplate',
            name='equipe_label',
            field=models.CharField(blank=True, default='', max_length=150),
        ),
        migrations.AddField(
            model_name='tasktemplate',
            name='type_element',
            field=models.CharField(choices=[('dossier', 'Dossier'), ('tache_elementaire', 'Tâche élémentaire')], default='dossier', max_length=20),
        ),
        migrations.AddField(
            model_name='tasktemplate',
            name='attribuable',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='tasktemplate',
            name='recurrente',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='tasktemplate',
            name='details',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='tasktemplate',
            name='explication',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='tasktemplate',
            name='frequence',
            field=models.CharField(choices=[('ponctuelle', 'Ponctuelle'), ('recurrente', 'Récurrente')], default='ponctuelle', max_length=20),
        ),
        migrations.AddField(
            model_name='tasktemplate',
            name='mode_declenchement',
            field=models.CharField(choices=[('manuel', 'Manuel'), ('automatique', 'Automatique')], default='manuel', max_length=20),
        ),
        migrations.AddField(
            model_name='tasktemplate',
            name='priorite_defaut',
            field=models.CharField(choices=[('haute', 'Haute'), ('moyenne', 'Moyenne'), ('basse', 'Basse')], default='moyenne', max_length=10),
        ),
        migrations.AddField(
            model_name='tasktemplate',
            name='duree_estimee_heures',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=6, null=True),
        ),
        migrations.AddField(
            model_name='tasktemplate',
            name='updated_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to='accounts.user'),
        ),
        migrations.AddField(
            model_name='tasktemplate',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AlterField(
            model_name='tasktemplate',
            name='description',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterModelOptions(
            name='tasktemplate',
            options={'ordering': ['code']},
        ),
    ]
