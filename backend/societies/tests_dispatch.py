import uuid
from datetime import timedelta
from decimal import Decimal
from importlib import import_module
from types import SimpleNamespace
from django.apps import apps
from django.db import connection
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken
from accounts.models import User
from .models import FarmerMilkCollection
from farmers.models import CollectionNotification
from .collection_serializers import india_today
from .models import Vendor, VendorMilkCollection, FarmerAttendance, SocietyDispatchReceipt, DispatchReceiptItem
from bmcs.models import BMCDelivery


class DispatchTests(APITestCase):
    def setUp(self):
        self.union = User.objects.create_user('9800000101', 'Test!874', full_name='Union', role='union')
        self.bmc = User.objects.create_user('9800000102', 'Test!874', full_name='BMC', role='bmc', parent=self.union)
        self.other_bmc = User.objects.create_user('9800000103', 'Test!874', full_name='Other BMC', role='bmc', parent=self.union)
        self.society = User.objects.create_user('9800000104', 'Test!874', full_name='Society', role='society', parent=self.bmc)
        self.other_society = User.objects.create_user('9800000105', 'Test!874', full_name='Other Society', role='society', parent=self.other_bmc)
        self.farmer = User.objects.create_user('9800000106', 'Test!874', full_name='Farmer', role='farmer', parent=self.society)
        self.vendor = Vendor.objects.create(society_id=self.society.pk, code='V1', name='Vendor')
        self.today = india_today().isoformat()
        self.auth(self.society)

    def auth(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(user).access_token}')

    def post(self, path, payload):
        return self.client.post('/api/v1/workflow/' + path, payload, format='json')

    def get(self, path):
        return self.client.get('/api/v1/workflow/' + path)

    def farmer_milk(self, **overrides):
        payload = {'farmerId': str(self.farmer.pk), 'quantityLitres': '12.34', 'collectionDate': self.today, 'session': 'morning'}
        return self.client.post('/api/v1/milk-collections', {**payload, **overrides}, format='json')

    def vendor_payload(self, **overrides):
        return {'vendorId': str(self.vendor.pk), 'quantityLitres': '20.10', 'collectionDate': self.today,
                'session': 'evening', 'submissionKey': str(uuid.uuid4()), **overrides}

    def receipt_payload(self, ids, **overrides):
        return {'collectionDate': self.today, 'session': 'full_day', 'includedRecordIds': ids,
                'submissionKey': str(uuid.uuid4()), **overrides}

    def create_receipt(self):
        record = self.farmer_milk().data['data']['record']
        payload = self.receipt_payload([record['id']])
        response = self.post('booth-receipts', payload)
        self.assertEqual(response.status_code, 201, response.data)
        return response.data['data']['receipt'], payload

    def test_mixed_daily_dispatch_cross_account_inbox(self):
        morning = self.farmer_milk().data['data']['record']
        evening = self.farmer_milk(session='evening', quantityLitres='0.01').data['data']['record']
        bulk = self.post('vendor-milk-collections', self.vendor_payload()).data['data']['record']
        self.assertEqual(FarmerAttendance.objects.count(), 2)
        self.assertEqual(CollectionNotification.objects.count(), 2)
        review = self.get('booth-review?collectionDate=' + self.today).data['data']
        self.assertEqual(review['dispatchQuantity'], '32.45')
        self.assertEqual(len(review['attendedFarmerIds']), 1)
        payload = self.receipt_payload([morning['id'], evening['id'], bulk['id']])
        response = self.post('booth-receipts', payload)
        self.assertEqual(response.status_code, 201, response.data)
        receipt = response.data['data']['receipt']
        self.assertEqual(receipt['measurementBasis'], 'mixed')
        self.assertEqual(receipt['totalFarmersCount'], 1)
        self.assertEqual(receipt['totalRecordsCount'], 3)
        self.assertEqual(receipt['dispatchQuantity'], '32.45')
        self.assertEqual(receipt['bmcId'], str(self.bmc.pk))
        self.assertEqual(self.get('booth-review?collectionDate=' + self.today).data['data']['dispatchQuantity'], '0.00')
        self.assertEqual(len(self.get('booth-review?collectionDate=' + self.today).data['data']['attendedFarmerIds']), 1)
        self.auth(self.bmc)
        self.assertEqual(self.get('bmc-deliveries').data['data']['count'], 0)
        self.assertEqual(self.get('booth-receipts/' + receipt['id']).status_code, 404)
        self.auth(self.society)
        sent = self.post('booth-receipts/' + receipt['id'] + '/send', {})
        self.assertEqual(sent.status_code, 200, sent.data)
        self.assertEqual(sent.data['data']['receipt']['status'], 'sent_to_bmc')
        for actor, count in [(self.society, 1), (self.bmc, 1), (self.other_society, 0), (self.other_bmc, 0)]:
            self.auth(actor)
            inbox = self.get('bmc-deliveries').data['data']
            self.assertEqual(inbox['count'], count)
            if count:
                self.assertEqual(inbox['results'][0]['declaredDispatchQuantity'], '32.45')
                self.assertEqual(inbox['results'][0]['status'], 'pending_arrival')
        self.auth(self.farmer)
        history = self.client.get('/api/v1/milk-collections').data['data']['results']
        self.assertEqual(len(history), 2)
        self.assertTrue(all(row['status'] == 'included_in_receipt' for row in history))

    def test_vendor_retry_and_separate_batches(self):
        payload = self.vendor_payload()
        first = self.post('vendor-milk-collections', payload)
        second = self.post('vendor-milk-collections', payload)
        self.assertEqual(first.status_code, 201, first.data)
        self.assertEqual(second.status_code, 200, second.data)
        self.assertEqual(first.data['data']['record']['id'], second.data['data']['record']['id'])
        self.assertEqual(self.post('vendor-milk-collections', {**payload, 'quantityLitres': '21.00'}).status_code, 409)
        self.assertEqual(self.post('vendor-milk-collections', self.vendor_payload()).status_code, 201)
        self.assertEqual(VendorMilkCollection.objects.count(), 2)
        self.assertEqual(FarmerMilkCollection.objects.count(), 0)
        self.assertEqual(FarmerAttendance.objects.count(), 0)
        self.assertEqual(CollectionNotification.objects.count(), 0)

    def test_receipt_and_send_retries_and_duplicate_inclusion(self):
        receipt, payload = self.create_receipt()
        self.assertEqual(self.post('booth-receipts', payload).status_code, 200)
        self.assertEqual(self.post('booth-receipts', {**payload, 'notes': 'changed'}).status_code, 409)
        self.assertEqual(self.post('booth-receipts', {**payload, 'submissionKey': str(uuid.uuid4())}).status_code, 409)
        for _ in range(2):
            self.assertEqual(self.post('booth-receipts/' + receipt['id'] + '/send', {}).status_code, 200)
        self.assertEqual(SocietyDispatchReceipt.objects.count(), 1)
        self.assertEqual(DispatchReceiptItem.objects.count(), 1)
        self.assertEqual(BMCDelivery.objects.count(), 1)

    def test_receipt_validation(self):
        record = self.farmer_milk().data['data']['record']
        for ids, override in [([], {}), ([record['id'], record['id']], {}), ([str(uuid.uuid4())], {}),
                ([record['id']], {'session': 'evening'}), ([record['id']], {'session': 'night'}),
                ([record['id']], {'collectionDate': (india_today() + timedelta(days=1)).isoformat()})]:
            response = self.post('booth-receipts', self.receipt_payload(ids, **override))
            self.assertEqual(response.status_code, 400, response.data)
        self.auth(self.other_society)
        self.assertEqual(self.post('booth-receipts', self.receipt_payload([record['id']])).status_code, 400)
        self.assertEqual(SocietyDispatchReceipt.objects.count(), 0)

    def test_vendor_validation_and_ownership(self):
        for value in ['0', '-1', '1.234', 'NaN', 'Infinity']:
            self.assertEqual(self.post('vendor-milk-collections', self.vendor_payload(quantityLitres=value)).status_code, 400)
        self.assertEqual(self.post('vendor-milk-collections', self.vendor_payload(session='night')).status_code, 400)
        self.assertEqual(self.post('vendor-milk-collections', self.vendor_payload(collectionDate=(india_today() + timedelta(days=1)).isoformat())).status_code, 400)
        self.assertEqual(self.post('vendor-milk-collections', self.vendor_payload(boothId=str(self.other_society.pk))).status_code, 400)
        self.auth(self.other_society)
        self.assertEqual(self.post('vendor-milk-collections', self.vendor_payload()).status_code, 404)
        self.auth(self.society)
        self.vendor.is_active = False
        self.vendor.save()
        self.assertEqual(self.post('vendor-milk-collections', self.vendor_payload()).status_code, 404)
        self.assertEqual(self.farmer_milk(vendorId=str(self.vendor.pk)).status_code, 404)
        self.assertEqual(FarmerAttendance.objects.count(), 0)

    def test_vendor_route_farmer_collection(self):
        response = self.farmer_milk(vendorId=str(self.vendor.pk))
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['data']['record']['route'], 'vendor')
        self.assertEqual(response.data['data']['record']['measurementMethod'], 'farmer_wise')
        self.assertEqual(FarmerAttendance.objects.count(), 1)
        self.assertEqual(self.farmer_milk().status_code, 409)
        self.assertEqual(FarmerAttendance.objects.count(), 1)

    def test_role_restrictions(self):
        receipt, _ = self.create_receipt()
        for actor in [self.bmc, self.union, self.farmer]:
            self.auth(actor)
            self.assertEqual(self.post('vendors', {'code': 'X', 'name': 'X'}).status_code, 403)
            self.assertEqual(self.post('vendor-milk-collections', self.vendor_payload()).status_code, 403)
            self.assertEqual(self.get('farmer-attendance').status_code, 403)
            self.assertEqual(self.post('booth-receipts', self.receipt_payload([str(uuid.uuid4())])).status_code, 403)
            self.assertEqual(self.post('booth-receipts/' + receipt['id'] + '/send', {}).status_code, 403)
        self.client.credentials()
        self.assertEqual(self.get('bmc-deliveries').status_code, 401)

    def test_vendor_management_context_and_pagination(self):
        response = self.post('vendors', {'code': 'new', 'name': 'New Vendor', 'routeName': 'Route A', 'vehicleNumber': 'TN01'})
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(self.post('vendors', {'code': 'NEW', 'name': 'Duplicate'}).status_code, 400)
        vendor_id = response.data['data']['vendor']['id']
        patched = self.client.patch('/api/v1/workflow/vendors/' + vendor_id, {'phone': '9876543210'}, format='json')
        self.assertEqual(patched.status_code, 200)
        self.assertEqual(self.get('vendors?pageSize=1').data['data']['hasNext'], True)
        context = self.get('context').data['data']
        self.assertEqual(context['bmc']['id'], str(self.bmc.pk))
        self.assertEqual(len(context['farmers']), 1)
        self.auth(self.other_society)
        self.assertEqual(self.client.patch('/api/v1/workflow/vendors/' + vendor_id, {'name': 'Hacked'}, format='json').status_code, 404)
        self.assertEqual(self.get('vendors').data['data']['count'], 0)

    def test_bmc_context_lists_only_linked_societies_without_requiring_deliveries(self):
        inactive = User.objects.create_user('9800000190', 'Test!874', full_name='Inactive Society',
                                          role='society', parent=self.bmc, is_active=False)
        self.auth(self.bmc)
        rows = self.get('context').data['data']['societies']
        self.assertEqual([row['id'] for row in rows], [str(inactive.pk), str(self.society.pk)])
        self.assertEqual(rows[0]['isActive'], False)
        self.assertEqual(rows[1]['name'], self.society.full_name)
        self.assertEqual(rows[1]['phone'], self.society.phone)
        self.assertEqual(rows[1]['isActive'], True)
        self.assertNotIn(str(self.other_society.pk), [row['id'] for row in rows])
        self.auth(self.other_bmc)
        self.assertEqual([row['id'] for row in self.get('context').data['data']['societies']], [str(self.other_society.pk)])
        self.auth(self.society)
        self.assertNotIn('societies', self.get('context').data['data'])

    def test_bmc_linked_society_list_follows_reassignment(self):
        self.society.parent = self.other_bmc
        self.society.save()
        self.auth(self.bmc)
        self.assertEqual(self.get('context').data['data']['societies'], [])
        self.auth(self.other_bmc)
        self.assertEqual({row['id'] for row in self.get('context').data['data']['societies']},
                         {str(self.society.pk), str(self.other_society.pk)})

    def test_link_change_and_inactive_bmc(self):
        receipt, _ = self.create_receipt()
        self.society.parent = self.other_bmc
        self.society.save()
        self.assertEqual(self.post('booth-receipts/' + receipt['id'] + '/send', {}).status_code, 400)
        self.assertEqual(BMCDelivery.objects.count(), 0)
        self.assertEqual(SocietyDispatchReceipt.objects.get().status, 'confirmed')
        self.society.parent = self.bmc
        self.society.save()
        self.assertEqual(self.post('booth-receipts/' + receipt['id'] + '/send', {}).status_code, 200)
        self.society.parent = self.other_bmc
        self.society.save()
        self.assertEqual(self.post('booth-receipts/' + receipt['id'] + '/send', {}).status_code, 200)
        self.assertEqual(SocietyDispatchReceipt.objects.get().bmc_id, self.bmc.pk)
        self.other_bmc.is_active = False
        self.other_bmc.save()
        self.assertEqual(self.get('context').status_code, 400)
        record = self.farmer_milk(session='evening').data['data']['record']
        self.assertEqual(self.post('booth-receipts', self.receipt_payload([record['id']])).status_code, 400)



# SQLite does not implement SELECT FOR UPDATE. Run these against an isolated
# PostgreSQL test database to exercise the production locking semantics.
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from unittest import skipUnless
from django.db import close_old_connections
from rest_framework.test import APITransactionTestCase, APIClient


@skipUnless(connection.vendor == 'postgresql', 'Requires isolated PostgreSQL test database')
class DispatchConcurrencyTests(APITransactionTestCase):
    setUp = DispatchTests.setUp
    auth = DispatchTests.auth
    post = DispatchTests.post
    farmer_milk = DispatchTests.farmer_milk
    receipt_payload = DispatchTests.receipt_payload
    create_receipt = DispatchTests.create_receipt

    def simultaneous_posts(self, path, payloads):
        barrier = Barrier(2)
        society_id = self.society.pk

        def submit(payload):
            close_old_connections()
            try:
                client = APIClient()
                client.force_authenticate(User.objects.get(pk=society_id))
                barrier.wait(timeout=10)
                response = client.post('/api/v1/workflow/' + path, payload, format='json')
                return response.status_code, response.data
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as pool:
            return list(pool.map(submit, payloads))

    def test_concurrent_receipts_claim_collection_once(self):
        record = self.farmer_milk().data['data']['record']
        results = self.simultaneous_posts('booth-receipts', [self.receipt_payload([record['id']]), self.receipt_payload([record['id']])])
        self.assertEqual(sorted(status for status, _ in results), [201, 409], results)
        self.assertEqual(DispatchReceiptItem.objects.count(), 1)

    def test_concurrent_sends_create_one_delivery(self):
        receipt, _ = self.create_receipt()
        results = self.simultaneous_posts('booth-receipts/' + receipt['id'] + '/send', [{}, {}])
        self.assertEqual([status for status, _ in results], [200, 200], results)
        self.assertEqual(BMCDelivery.objects.count(), 1)
