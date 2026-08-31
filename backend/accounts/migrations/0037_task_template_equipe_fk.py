from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0036_finalize_task_template_tree'),
    ]

    operations = [
        migrations.AddField(
            model_name='tasktemplate',
            name='equipe',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='task_templates', to='accounts.team'),
        ),
        migrations.RemoveField(
            model_name='tasktemplate',
            name='equipe_label',
        ),
    ]
