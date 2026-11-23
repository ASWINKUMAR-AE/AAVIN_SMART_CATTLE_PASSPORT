"""Move ORM ownership without dropping collection, cow, or dispatch data."""
from django.db import migrations
from django.db.migrations.operations.base import Operation


MOVED_MODELS = [
    ('accounts', 'Cow', 'farmers', 'Cow'),
    ('collections', 'FarmerMilkCollection', 'societies', 'FarmerMilkCollection'),
    ('collections', 'CollectionNotification', 'farmers', 'CollectionNotification'),
    ('dispatch', 'Vendor', 'societies', 'Vendor'),
    ('dispatch', 'VendorMilkCollection', 'societies', 'VendorMilkCollection'),
    ('dispatch', 'FarmerAttendance', 'societies', 'FarmerAttendance'),
    ('dispatch', 'SocietyDispatchReceipt', 'societies', 'SocietyDispatchReceipt'),
    ('dispatch', 'DispatchReceiptItem', 'societies', 'DispatchReceiptItem'),
    ('dispatch', 'BMCDelivery', 'bmcs', 'BMCDelivery'),
]


class AdoptRoleDomains(Operation):
    reversible = True
    reduces_to_sql = False

    def state_forwards(self, app_label, state):
        for old_app, old_name, _, _ in MOVED_MODELS:
            state.remove_model(old_app, old_name.lower())
        state.remove_model('accounts', 'farmerprofile')

    @staticmethod
    def rebind(schema_editor, source_apps, target_apps, reverse=False):
        for old_app, old_name, new_app, new_name in MOVED_MODELS:
            source = source_apps.get_model(new_app, new_name) if reverse else source_apps.get_model(old_app, old_name)
            target = target_apps.get_model(old_app, old_name) if reverse else target_apps.get_model(new_app, new_name)
            for field in source._meta.local_fields:
                if not field.is_relation:
                    continue
                replacement = target._meta.get_field(field.name)
                # Labels may change while physical targets stay identical. Only
                # authentication -> typed role references require database DDL.
                before = field.target_field.model._meta.db_table
                after = replacement.target_field.model._meta.db_table
                if before != after:
                    # SQLite rebuilds the whole table for a FK change. Use the
                    # complete target model so a later field cannot restore an
                    # earlier field to its source definition.
                    schema_editor.alter_field(target, field, replacement, strict=True)

    def database_forwards(self, app_label, schema_editor, from_state, to_state):
        from importlib import import_module
        # Also cover accounts written after the bootstrap migration, or a
        # retry following an interrupted deployment.
        import_module('farmers.migrations.0002_backfill_role_accounts').backfill(from_state.apps, schema_editor)
        self.rebind(schema_editor, from_state.apps, to_state.apps)
        schema_editor.delete_model(from_state.apps.get_model('accounts', 'FarmerProfile'))

    def database_backwards(self, app_label, schema_editor, from_state, to_state):
        Profile = to_state.apps.get_model('accounts', 'FarmerProfile')
        Farmer = from_state.apps.get_model('farmers', 'Farmer')
        schema_editor.create_model(Profile)
        fields = [field.name for field in Profile._meta.fields if field.name not in ['id', 'user']]
        alias = schema_editor.connection.alias
        for farmer in Farmer.objects.using(alias).filter(has_personal_details=True).iterator():
            Profile.objects.using(alias).create(user_id=farmer.user_id, **{field: getattr(farmer, field) for field in fields})
        self.rebind(schema_editor, from_state.apps, to_state.apps, reverse=True)

    def describe(self):
        return 'Adopt role domain models, rebind foreign keys, and retire legacy FarmerProfile'


def remap_content_types(apps, schema_editor, reverse=False):
    alias = schema_editor.connection.alias
    ContentType = apps.get_model('contenttypes', 'ContentType')
    Permission = apps.get_model('auth', 'Permission')
    Group = apps.get_model('auth', 'Group')
    User = apps.get_model('accounts', 'User')
    LogEntry = apps.get_model('admin', 'LogEntry')
    mapping = [*MOVED_MODELS, ('accounts', 'FarmerProfile', 'farmers', 'Farmer')]
    for old_app, old_name, new_app, new_name in mapping:
        before = (new_app, new_name.lower()) if reverse else (old_app, old_name.lower())
        after = (old_app, old_name.lower()) if reverse else (new_app, new_name.lower())
        source = ContentType.objects.using(alias).filter(app_label=before[0], model=before[1]).first()
        if source is None:
            continue
        target = ContentType.objects.using(alias).filter(app_label=after[0], model=after[1]).first()
        if target is None:
            source.app_label, source.model = after
            source.save(using=alias, update_fields=['app_label', 'model'])
            target = source
        for permission in Permission.objects.using(alias).filter(content_type_id=source.pk):
            suffix = '_' + before[1]
            codename = permission.codename[:-len(suffix)] + '_' + after[1] if permission.codename.endswith(suffix) else permission.codename
            existing = Permission.objects.using(alias).filter(content_type_id=target.pk, codename=codename).exclude(pk=permission.pk).first()
            if existing:
                for through, owner in [(Group.permissions.through, 'group_id'), (User.user_permissions.through, 'user_id')]:
                    for owner_id in through.objects.using(alias).filter(permission_id=permission.pk).values_list(owner, flat=True):
                        through.objects.using(alias).get_or_create(**{owner: owner_id, 'permission_id': existing.pk})
                permission.delete(using=alias)
            else:
                permission.content_type_id = target.pk
                permission.codename = codename
                permission.save(using=alias, update_fields=['content_type_id', 'codename'])
        if source.pk != target.pk:
            LogEntry.objects.using(alias).filter(content_type_id=source.pk).update(content_type_id=target.pk)
            source.delete(using=alias)


def reverse_content_types(apps, schema_editor):
    remap_content_types(apps, schema_editor, reverse=True)


class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0003_cow'),
        ('admin', '0003_logentry_add_action_flag_choices'),
        ('collections', '0002_farmermilkcollection_vendor'),
        ('dispatch', '0002_backfill_attendance'),
        ('farmers', '0003_adopt_cows_and_notifications'),
        ('bmcs', '0002_adopt_deliveries'),
    ]
    operations = [AdoptRoleDomains(), migrations.RunPython(remap_content_types, reverse_content_types)]
