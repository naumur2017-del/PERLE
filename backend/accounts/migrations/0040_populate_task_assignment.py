from django.db import migrations


def populate(apps, schema_editor):
    Task = apps.get_model('accounts', 'Task')
    TaskAssignment = apps.get_model('accounts', 'TaskAssignment')
    for task in Task.objects.select_related('assignee', 'organisation').filter(assignee__isnull=False):
        taux = task.organisation.taux_ehs_fcfa
        TaskAssignment.objects.create(
            task=task,
            user=task.assignee,
            heures=0,
            grade_snapshot=task.assignee.grade,
            taux_snapshot=taux,
            ehs_consomme=0,
            montant_fcfa=0,
            execution_statut=task.execution_statut,
            demarree_le=task.demarree_le,
            terminee_le=task.terminee_le,
            created_by=task.created_by,
        )


def reverse(apps, schema_editor):
    # Rien à annuler : les colonnes Task.assignee/execution_statut/... sont encore présentes
    # jusqu'à la migration suivante, donc aucune donnée n'est perdue en laissant les
    # TaskAssignment créés ici.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0039_task_assignment_schema'),
    ]

    operations = [
        migrations.RunPython(populate, reverse),
    ]
