from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from unittest.mock import patch
from unittest import skipUnless
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from django.db import IntegrityError, transaction, connection, connections
from django.db.models.deletion import ProtectedError
from rest_framework.test import APITestCase, APITransactionTestCase, APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from accounts.models import User
from .models import FarmerMilkCollection, CollectionNotification
from .serializers import india_today


class CollectionTests(APITestCase):
    def setUp(self):
        self.union = User.objects.create_user('9800000001', 'Test!874', full_name='Union', role='union')
        self.bmc = User.objects.create_user('9800000002', 'Test!874', full_name='BMC', role='bmc', parent=self.union)
        self.society = User.objects.create_user('9800000003', 'Test!874', full_name='Society One', role='society', parent=self.bmc)
        self.other_society = User.objects.create_user('9800000004', 'Test!874', full_name='Society Two', role='society', parent=self.bmc)
        self.farmer = User.objects.create_user('9800000005', 'Test!874', full_name='Farmer One', role='farmer', parent=self.society)
        self.other_farmer = User.objects.create_user('9800000006', 'Test!874', full_name='Farmer Two', role='farmer', parent=self.other_society)
        self.payload = {'farmerId': str(self.farmer.pk), 'quantityLitres': '12.34', 'collectionDate': india_today().isoformat(), 'session': 'morning', 'notes': 'Measured'}
        self.url = '/api/v1/milk-collections'
        self.auth(self.society)

    def auth(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(user).access_token}')

    def create(self, **values):
        return self.client.post(self.url, {**self.payload, **values}, format='json')

    def test_create_and_cross_session_farmer_flow(self):
        response = self.create()
        self.assertEqual(response.status_code, 201, response.data)
        data = response.data['data']['record']
        self.assertEqual(data['quantityLitres'], '12.34')
        self.assertEqual(data['farmerName'], 'Farmer One')
        record = FarmerMilkCollection.objects.get()
        self.assertEqual(record.society, self.society)
        self.assertEqual(record.created_by, self.society)
        self.auth(self.farmer)
        self.assertEqual(self.client.get(self.url).data['data']['count'], 1)
        summary = self.client.get(self.url + '/summary').data['data']
        self.assertEqual(summary['todaySupply'], '12.34')
        self.assertEqual(summary['shifts'], {'morning': '12.34', 'evening': '0.00'})
        notifications = self.client.get('/api/v1/notifications').data['data']
        self.assertEqual(notifications['unreadCount'], 1)
        notification = notifications['results'][0]
        self.assertEqual(notification['recipientId'], str(self.farmer.pk))
        for text in ['12.34', 'Society One', self.payload['collectionDate'], 'morning']:
            self.assertIn(text, notification['message'])
        self.assertEqual(self.client.post(f"/api/v1/notifications/{notification['id']}/read").status_code, 200)
        self.assertEqual(self.client.get('/api/v1/notifications').data['data']['unreadCount'], 0)

    def test_role_permissions(self):
        self.client.credentials()
        self.assertEqual(self.create().status_code, 401)
        for user in [self.union, self.bmc, self.farmer]:
            self.auth(user)
            self.assertEqual(self.create().status_code, 403)
        for user in [self.union, self.bmc]:
            self.auth(user)
            self.assertEqual(self.client.get(self.url).status_code, 403)
            self.assertEqual(self.client.get(self.url + '/summary').status_code, 403)

    def test_ownership_inactive_and_forged_fields(self):
        self.assertEqual(self.create(farmerId=str(self.other_farmer.pk)).status_code, 404)
        for field in ['societyId', 'boothId', 'createdBy', 'farmerName', 'id']:
            self.assertEqual(self.create(**{field: str(self.other_society.pk)}).status_code, 400)
        self.farmer.is_active = False
        self.farmer.save()
        self.assertEqual(self.create().status_code, 404)
        self.auth(self.farmer)
        self.assertEqual(self.client.get(self.url).status_code, 401)
        self.assertFalse(FarmerMilkCollection.objects.exists())

    def test_validation(self):
        for quantity in ['0', '-1', '1.234', 'NaN', 'Infinity', '100000000', '', 'abc']:
            self.assertEqual(self.create(quantityLitres=quantity).status_code, 400, quantity)
        for values in [{'session': 'night'}, {'collectionDate': '2026-02-30'},
                       {'collectionDate': (india_today() + timedelta(days=1)).isoformat()}, {'notes': 'x' * 1001}, {'farmerId': 'invalid'}]:
            self.assertEqual(self.create(**values).status_code, 400, values)
        self.assertEqual(self.create(quantityLitres='0.01', notes='').status_code, 201)

    def test_duplicate_and_evening(self):
        self.assertEqual(self.create().status_code, 201)
        self.assertEqual(self.create().status_code, 409)
        self.assertEqual(self.create(session='evening').status_code, 201)
        self.assertEqual(FarmerMilkCollection.objects.count(), 2)
        self.assertEqual(CollectionNotification.objects.count(), 2)
        self.assertEqual(self.client.get(self.url + '/summary').data['data']['todaySupply'], '24.68')

    def test_database_uniqueness_positive_and_shift_constraints(self):
        self.create()
        base = dict(farmer=self.farmer, society=self.society, created_by=self.society, collection_date=india_today(), session='morning', quantity_litres=Decimal('1'))
        for values in [{}, {'session': 'evening', 'quantity_litres': Decimal('0')}, {'session': 'invalid'}]:
            with self.assertRaises(IntegrityError), transaction.atomic():
                FarmerMilkCollection.objects.create(**{**base, **values})
        self.assertEqual(FarmerMilkCollection.objects.count(), 1)

    def test_notification_failure_rolls_back_collection(self):
        with patch('milk_collections.views.CollectionNotification.objects.create', side_effect=RuntimeError('failed')):
            with self.assertRaises(RuntimeError):
                self.create()
        self.assertFalse(FarmerMilkCollection.objects.exists())
        self.assertFalse(CollectionNotification.objects.exists())

    def test_private_listing_and_read_updates(self):
        self.create()
        notification = CollectionNotification.objects.get()
        for user in [self.other_society, self.other_farmer]:
            self.auth(user)
            self.assertEqual(self.client.get(self.url, {'farmerId': str(self.farmer.pk)}).data['data']['count'], 0)
            self.assertEqual(self.client.get(self.url + '/summary', {'farmerId': str(self.farmer.pk)}).data['data']['todaySupply'], '0.00')
            self.assertEqual(self.client.get('/api/v1/notifications').data['data']['count'], 0)
            self.assertEqual(self.client.post(f'/api/v1/notifications/{notification.pk}/read').status_code, 404)
            self.client.post('/api/v1/notifications/read-all')
        notification.refresh_from_db()
        self.assertFalse(notification.is_read)
        self.auth(self.farmer)
        self.client.post('/api/v1/notifications/read-all')
        notification.refresh_from_db()
        self.assertTrue(notification.is_read)

    def test_immutable_historical_owner_and_protected_accounts(self):
        self.create()
        record = FarmerMilkCollection.objects.get()
        self.assertEqual(self.client.patch(self.url, {'quantityLitres': '50'}, format='json').status_code, 405)
        self.farmer.parent = self.other_society
        self.farmer.save()
        self.assertEqual(self.client.get(self.url).data['data']['count'], 1)
        self.auth(self.other_society)
        self.assertEqual(self.client.get(self.url).data['data']['count'], 0)
        self.assertEqual(self.create().status_code, 409)
        with self.assertRaises(ProtectedError):
            self.farmer.delete()
        self.assertEqual(record.society, self.society)

    def test_india_date_and_month_boundaries(self):
        with patch('django.utils.timezone.now', return_value=datetime(2026, 10, 31, 19, 0, tzinfo=timezone.utc)):
            self.assertEqual(india_today(), date(2026, 11, 1))
            for day, quantity, session in [('2026-11-01', '1.11', 'morning'), ('2026-11-01', '2.22', 'evening'), ('2026-10-31', '3.33', 'morning'), ('2026-10-25', '9', 'morning')]:
                self.assertEqual(self.create(collectionDate=day, quantityLitres=quantity, session=session).status_code, 201)
            summary = self.client.get(self.url + '/summary').data['data']
            self.assertEqual(summary['todaySupply'], '3.33')
            self.assertEqual(summary['monthSupply'], '3.33')
            self.assertEqual(summary['last7DaysSupply'], '6.66')
            self.assertEqual(len(summary['dailyTrend']), 7)

    def test_pagination_and_filter_validation(self):
        self.create()
        self.create(session='evening')
        data = self.client.get(self.url, {'pageSize': 1}).data['data']
        self.assertTrue(data['hasNext'])
        next_data = self.client.get(self.url, {'pageSize': 1, 'page': 2}).data['data']
        self.assertNotEqual(data['results'][0]['id'], next_data['results'][0]['id'])
        for params in [{'farmerId': 'bad'}, {'page': 0}, {'pageSize': 101}, {'dateFrom': '2026-11-01', 'dateTo': '2026-10-01'}, {'session': 'night'}]:
            self.assertEqual(self.client.get(self.url, params).status_code, 400)


@skipUnless(connection.vendor == 'postgresql', 'Concurrent row-lock verification requires an isolated PostgreSQL database.')
class ConcurrentCollectionTests(APITransactionTestCase):
    setUp = CollectionTests.setUp
    auth = CollectionTests.auth

    def test_two_simultaneous_submissions_create_one_collection_and_notification(self):
        barrier = Barrier(2)
        society_id = self.society.pk

        def submit():
            try:
                client = APIClient()
                client.force_authenticate(User.objects.get(pk=society_id))
                barrier.wait(timeout=10)
                return client.post(self.url, self.payload, format='json').status_code
            finally:
                connections.close_all()

        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(lambda _: submit(), range(2)))
        self.assertEqual(sorted(results), [201, 409])
        self.assertEqual(FarmerMilkCollection.objects.count(), 1)
        self.assertEqual(CollectionNotification.objects.count(), 1)
