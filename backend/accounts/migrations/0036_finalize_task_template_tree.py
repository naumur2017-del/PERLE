from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0035_populate_task_template_tree'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='tasktemplate',
            name='description',
        ),
        migrations.AlterField(
            model_name='tasktemplate',
            name='details',
            field=models.TextField(blank=True),
        ),
        migrations.AlterField(
            model_name='tasktemplate',
            name='equipe_label',
            field=models.CharField(blank=True, max_length=150),
        ),
        migrations.AlterField(
            model_name='tasktemplate',
            name='explication',
            field=models.TextField(blank=True),
        ),
    ]
