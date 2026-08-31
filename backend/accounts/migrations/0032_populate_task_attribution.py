from django.db import migrations


def populate(apps, schema_editor):
    Task = apps.get_model('accounts', 'Task')
    for task in Task.objects.select_related('project_ligne').all():
        pl = task.project_ligne
        if pl is not None:
            task.project_id = pl.project_id
            task.ligne_budgetaire_id = pl.ligne_budgetaire_id
        if task.lancee:
            task.statut = 'acceptee'
            task.statut_decide_le = task.lancee_le
        else:
            task.statut = 'envoyee'
        task.save(update_fields=['project', 'ligne_budgetaire', 'statut', 'statut_decide_le'])


def reverse(apps, schema_editor):
    # Nothing to reverse: project_ligne/heures/lancee columns are still present until the next
    # migration finalizes the schema, so no data is lost by leaving the new fields populated.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0031_task_attribution_schema'),
    ]

    operations = [
        migrations.RunPython(populate, reverse),
    ]
