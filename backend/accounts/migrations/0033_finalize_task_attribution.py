from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0032_populate_task_attribution'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='task',
            name='project_ligne',
        ),
        migrations.RemoveField(
            model_name='task',
            name='heures',
        ),
        migrations.RemoveField(
            model_name='task',
            name='lancee',
        ),
        migrations.RemoveField(
            model_name='task',
            name='lancee_le',
        ),
        migrations.AlterField(
            model_name='task',
            name='ligne_budgetaire',
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='taches', to='accounts.lignebudgetaire'),
        ),
        migrations.AlterField(
            model_name='task',
            name='description',
            field=models.TextField(blank=True),
        ),
    ]
