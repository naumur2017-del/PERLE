import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0027_task_lancee'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='TaskTemplate',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.CharField(max_length=30)),
                ('nom', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True)),
                ('actif', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to=settings.AUTH_USER_MODEL)),
                ('organisation', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='task_templates', to='accounts.organisation')),
            ],
            options={
                'ordering': ['nom'],
                'unique_together': {('organisation', 'code')},
            },
        ),
        migrations.AddField(
            model_name='task',
            name='template',
            field=models.ForeignKey(
                null=True, on_delete=django.db.models.deletion.PROTECT, related_name='attributions',
                to='accounts.tasktemplate',
            ),
        ),
    ]
