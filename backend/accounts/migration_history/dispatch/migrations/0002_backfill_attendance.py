from django.db import migrations


def backfill(apps, schema_editor):
    Collection = apps.get_model('collections', 'FarmerMilkCollection')
    Attendance = apps.get_model('dispatch', 'FarmerAttendance')
    alias = schema_editor.connection.alias
    for record in Collection.objects.using(alias).iterator(chunk_size=1000):
        Attendance.objects.using(alias).get_or_create(collection_id=record.pk, defaults={
            'farmer_id': record.farmer_id, 'society_id': record.society_id,
            'collection_date': record.collection_date, 'session': record.session,
        })


class Migration(migrations.Migration):
    dependencies = [('dispatch', '0001_initial'), ('collections', '0002_farmermilkcollection_vendor')]
    operations = [migrations.RunPython(backfill, migrations.RunPython.noop)]
