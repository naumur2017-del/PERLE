import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0029_populate_task_template'),
    ]

    operations = [
        migrations.RemoveField(model_name='task', name='nom'),
        migrations.RemoveField(model_name='task', name='description'),
        migrations.AlterField(
            model_name='task',
            name='template',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT, related_name='attributions',
                to='accounts.tasktemplate',
            ),
        ),
    ]
