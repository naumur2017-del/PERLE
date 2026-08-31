from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0040_populate_task_assignment'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='task',
            name='assignee',
        ),
        migrations.RemoveField(
            model_name='task',
            name='execution_statut',
        ),
        migrations.RemoveField(
            model_name='task',
            name='demarree_le',
        ),
        migrations.RemoveField(
            model_name='task',
            name='terminee_le',
        ),
    ]
