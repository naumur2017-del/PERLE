from django.db import migrations


def populate(apps, schema_editor):
    TaskTemplate = apps.get_model('accounts', 'TaskTemplate')
    for template in TaskTemplate.objects.all():
        template.details = template.description or ''
        template.type_element = 'tache_elementaire'
        template.attribuable = True
        template.niveau = 1
        template.parent = None
        template.save(update_fields=['details', 'type_element', 'attribuable', 'niveau', 'parent'])


def reverse(apps, schema_editor):
    # Rien à annuler : la colonne `description` reste présente jusqu'à la migration suivante.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0034_task_template_tree_schema'),
    ]

    operations = [
        migrations.RunPython(populate, reverse),
    ]
