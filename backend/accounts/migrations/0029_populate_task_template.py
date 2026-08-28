# Pour chaque Task existante, crée (ou réutilise) une TaskTemplate portant le même nom dans la
# même organisation, et relie la Task à ce modèle. Préserve les vraies tâches déjà créées en
# production (organisation CGA notamment) sans rien perdre : nom et description sont copiés tels
# quels dans la nouvelle banque de tâches.
from django.db import migrations


def populate(apps, schema_editor):
    Task = apps.get_model('accounts', 'Task')
    TaskTemplate = apps.get_model('accounts', 'TaskTemplate')

    for organisation_id in Task.objects.values_list('organisation_id', flat=True).distinct():
        tasks = Task.objects.filter(organisation_id=organisation_id).order_by('created_at')
        next_seq = 1
        for task in tasks:
            template = TaskTemplate.objects.filter(organisation_id=organisation_id, nom=task.nom).first()
            if template is None:
                # Code unique par organisation, en continuant la séquence déjà utilisée.
                while TaskTemplate.objects.filter(organisation_id=organisation_id, code=f'BQ-{str(next_seq).zfill(3)}').exists():
                    next_seq += 1
                template = TaskTemplate.objects.create(
                    organisation_id=organisation_id, code=f'BQ-{str(next_seq).zfill(3)}',
                    nom=task.nom, description=task.description,
                )
                next_seq += 1
            task.template_id = template.id
            task.save(update_fields=['template'])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0028_task_template_schema'),
    ]

    operations = [
        migrations.RunPython(populate, noop),
    ]
