from django.db import migrations


def backfill(apps, schema_editor):
    alias = schema_editor.connection.alias
    User = apps.get_model('accounts', 'User')
    Profile = apps.get_model('accounts', 'FarmerProfile')
    Union = apps.get_model('unions', 'Union')
    BMC = apps.get_model('bmcs', 'BMC')
    Society = apps.get_model('societies', 'Society')
    Farmer = apps.get_model('farmers', 'Farmer')
    for user in User.objects.using(alias).filter(role='union').iterator():
        Union.objects.using(alias).get_or_create(user_id=user.pk)
    for role, Model, parent in [('bmc', BMC, 'union'), ('society', Society, 'bmc'), ('farmer', Farmer, 'society')]:
        for user in User.objects.using(alias).filter(role=role).iterator():
            Model.objects.using(alias).get_or_create(user_id=user.pk, defaults={f'{parent}_id': user.parent_id})
    fields = [field.name for field in Profile._meta.fields if field.name not in ['id', 'user']]
    for profile in Profile.objects.using(alias).iterator():
        Farmer.objects.using(alias).filter(user_id=profile.user_id).update(
            has_personal_details=True, **{field: getattr(profile, field) for field in fields})


class Migration(migrations.Migration):
    dependencies = [('farmers', '0001_initial'), ('accounts', '0003_cow')]
    operations = [migrations.RunPython(backfill, migrations.RunPython.noop)]
