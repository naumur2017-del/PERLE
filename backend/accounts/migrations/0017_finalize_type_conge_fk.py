# Drops the old hardcoded type_conge CharField (now fully replaced by CongeType rows,
# see 0016) and promotes type_conge_new to be the real type_conge FK.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0016_populate_conge_types'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='congedemande',
            name='type_conge',
        ),
        migrations.RenameField(
            model_name='congedemande',
            old_name='type_conge_new',
            new_name='type_conge',
        ),
        migrations.AlterField(
            model_name='congedemande',
            name='type_conge',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT, related_name='demandes', to='accounts.congetype',
            ),
        ),
    ]
