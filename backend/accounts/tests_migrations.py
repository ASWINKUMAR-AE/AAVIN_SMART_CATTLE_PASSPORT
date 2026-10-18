import uuid
from decimal import Decimal
from django.contrib.auth.hashers import make_password, check_password
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase


class RoleMigrationTests(TransactionTestCase):
    """Exercise upgrades and rollback with real pre-refactor rows and FKs."""
    def test_role_upgrade_preserves_rows_and_permissions(self):
        executor = MigrationExecutor(connection)
        latest = executor.loader.graph.leaf_nodes()
        old_state_targets = [('accounts', '0003_cow'), ('dispatch', '0002_backfill_attendance'),
                       ('collections', '0002_farmermilkcollection_vendor')]
        old_targets = [*old_state_targets, ('farmers', None), ('societies', None), ('bmcs', None), ('unions', None)]
        try:
            executor.migrate(old_targets)
            old = executor.loader.project_state(old_state_targets).apps
            User = old.get_model('accounts', 'User')
            Profile = old.get_model('accounts', 'FarmerProfile')
            Cow = old.get_model('accounts', 'Cow')
            Milk = old.get_model('collections', 'FarmerMilkCollection')
            Notification = old.get_model('collections', 'CollectionNotification')
            Vendor = old.get_model('dispatch', 'Vendor')
            VendorMilk = old.get_model('dispatch', 'VendorMilkCollection')
            Attendance = old.get_model('dispatch', 'FarmerAttendance')
            Receipt = old.get_model('dispatch', 'SocietyDispatchReceipt')
            Item = old.get_model('dispatch', 'DispatchReceiptItem')
            Delivery = old.get_model('dispatch', 'BMCDelivery')
            password = make_password('Migration!928')
            union = User.objects.create(phone='9800000301', full_name='Union', role='union', password=password)
            bmc = User.objects.create(phone='9800000302', full_name='BMC', role='bmc', parent_id=union.pk, password=password)
            society = User.objects.create(phone='9800000303', full_name='Society', role='society', parent_id=bmc.pk, password=password)
            farmer = User.objects.create(phone='9800000304', full_name='Farmer', role='farmer', parent_id=society.pk, password=password)
            Profile.objects.create(user_id=farmer.pk, farmer_id_code='MIGRATE-FARMER', address='Street', village='Village',
                                   number_of_cows=1, bank_account_number='00123456')
            cow = Cow.objects.create(farmer_id=farmer.pk, pashu_aadhaar='123456789099', breed='Jersey', milk_capacity='12.50')
            milk = Milk.objects.create(farmer_id=farmer.pk, society_id=society.pk, created_by_id=society.pk,
                                       collection_date='2026-10-15', session='morning', quantity_litres='12.34')
            notification = Notification.objects.create(recipient_id=farmer.pk, collection=milk, title='Supply', message='Saved', is_read=True)
            vendor = Vendor.objects.create(society_id=society.pk, code='V-MIG', name='Vendor')
            bulk = VendorMilk.objects.create(society_id=society.pk, vendor=vendor, created_by_id=society.pk,
                collection_date='2026-10-15', session='evening', quantity_litres='20.10', submission_key=uuid.uuid4())
            Attendance.objects.create(farmer_id=farmer.pk, society_id=society.pk, collection_date='2026-10-15', session='morning', collection=milk)
            receipt = Receipt.objects.create(society_id=society.pk, bmc_id=bmc.pk, society_name='Society', bmc_name='BMC',
                collection_date='2026-10-15', session='full_day', dispatch_quantity='32.44', farmer_quantity='12.34', vendor_quantity='20.10',
                total_farmers_count=1, submission_key=uuid.uuid4(), created_by_id=society.pk, status='sent_to_bmc')
            Item.objects.create(receipt=receipt, farmer_collection=milk)
            Item.objects.create(receipt=receipt, vendor_collection=bulk)
            delivery = Delivery.objects.create(receipt=receipt)
            # Preexisting Django permissions must follow moved models as well.
            ContentType = old.get_model('contenttypes', 'ContentType')
            Permission = old.get_model('auth', 'Permission')
            ct, _ = ContentType.objects.get_or_create(app_label='accounts', model='farmerprofile')
            permission, _ = Permission.objects.get_or_create(content_type=ct, codename='view_farmerprofile', defaults={'name': 'View Farmer Profile'})
            farmer.user_permissions.add(permission)
            # Both labels may already have content types during a staged deploy.
            target_ct, _ = ContentType.objects.get_or_create(app_label='farmers', model='farmer')
            Permission.objects.get_or_create(content_type=target_ct, codename='view_farmer', defaults={'name': 'View Farmer'})
            Group = old.get_model('auth', 'Group')
            group = Group.objects.create(name='Farmer auditors')
            group.permissions.add(permission)
            executor = MigrationExecutor(connection)
            executor.migrate(latest)
            new = executor.loader.project_state(latest).apps
            self.assertEqual(new.get_model('unions', 'Union').objects.get(pk=union.pk).user_id, union.pk)
            self.assertEqual(new.get_model('bmcs', 'BMC').objects.get(pk=bmc.pk).union_id, union.pk)
            self.assertEqual(new.get_model('societies', 'Society').objects.get(pk=society.pk).bmc_id, bmc.pk)
            saved_farmer = new.get_model('farmers', 'Farmer').objects.get(pk=farmer.pk)
            self.assertEqual(saved_farmer.farmer_id_code, 'MIGRATE-FARMER')
            self.assertEqual(saved_farmer.bank_account_number, '00123456')
            self.assertTrue(saved_farmer.has_personal_details)
            saved_user = new.get_model('accounts', 'User').objects.get(pk=farmer.pk)
            self.assertTrue(check_password('Migration!928', saved_user.password))
            self.assertEqual(new.get_model('farmers', 'Cow').objects.get(pk=cow.pk).farmer_id, farmer.pk)
            saved_milk = new.get_model('societies', 'FarmerMilkCollection').objects.get(pk=milk.pk)
            self.assertEqual(saved_milk.quantity_litres, Decimal('12.34'))
            self.assertEqual(saved_milk.society_id, society.pk)
            self.assertTrue(new.get_model('farmers', 'CollectionNotification').objects.get(pk=notification.pk).is_read)
            self.assertEqual(new.get_model('societies', 'VendorMilkCollection').objects.get(pk=bulk.pk).quantity_litres, Decimal('20.10'))
            self.assertEqual(new.get_model('societies', 'DispatchReceiptItem').objects.filter(receipt_id=receipt.pk).count(), 2)
            self.assertEqual(new.get_model('bmcs', 'BMCDelivery').objects.get(pk=delivery.pk).receipt_id, receipt.pk)
            self.assertEqual(saved_user.user_permissions.get().codename, 'view_farmer')
            self.assertEqual(saved_user.user_permissions.get().content_type.app_label, 'farmers')
            self.assertEqual(new.get_model('auth', 'Group').objects.get(pk=group.pk).permissions.get().codename, 'view_farmer')
            self.assertNotIn('accounts_farmerprofile', connection.introspection.table_names())
            with connection.cursor() as cursor:
                constraints = connection.introspection.get_constraints(cursor, 'collections_farmermilkcollection')
            targets = {value['foreign_key'][0] for value in constraints.values() if value.get('foreign_key')}
            self.assertIn('farmers_farmer', targets)
            self.assertIn('societies_society', targets)
            # Rollback restores the legacy schema and data, then upgrades again.
            executor = MigrationExecutor(connection)
            executor.migrate(old_targets)
            restored = executor.loader.project_state(old_state_targets).apps
            self.assertEqual(restored.get_model('accounts', 'FarmerProfile').objects.get(user_id=farmer.pk).bank_account_number, '00123456')
            self.assertEqual(restored.get_model('dispatch', 'BMCDelivery').objects.get(pk=delivery.pk).receipt_id, receipt.pk)
            MigrationExecutor(connection).migrate(latest)
        finally:
            # Leave the schema at the current state for subsequent tests/flush.
            MigrationExecutor(connection).migrate(latest)
