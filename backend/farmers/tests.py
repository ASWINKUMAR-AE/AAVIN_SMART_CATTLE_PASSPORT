from decimal import Decimal
from django.core.cache import cache
from rest_framework.test import APITestCase
from accounts.models import User
from farmers.models import Farmer, Cow


class CowScanAndListTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.union = User.objects.create_superuser('9842000001', 'CattleSecure!874', full_name='Aavin Madurai District Union')
        self.bmc = User.objects.create_user('9842000002', 'CattleSecure!874', full_name='Melur BMC', role='bmc', parent=self.union)
        self.society = User.objects.create_user('9842000003', 'CattleSecure!874', full_name='Melur Society', role='society', parent=self.bmc)
        self.farmer = User.objects.create_user('9842000004', 'CattleSecure!874', full_name='M. Chinnasamy', role='farmer', parent=self.society)
        
        farmer_profile = self.farmer.farmer
        farmer_profile.farmer_id_code = 'FARM-MDU-101'
        farmer_profile.address = '14 East Street'
        farmer_profile.village = 'Melur'
        farmer_profile.community = 'Melur Taluk'
        farmer_profile.has_personal_details = True
        farmer_profile.bank_name = 'State Bank of India'
        farmer_profile.bank_account_number = '109283741001'
        farmer_profile.bank_ifsc = 'SBIN0000874'
        farmer_profile.upi_id = 'chinnasamy@upi'
        farmer_profile.number_of_cows = 2
        farmer_profile.save()

        self.cow1 = Cow.objects.create(
            farmer=farmer_profile,
            pashu_aadhaar='106353486450',
            breed='Jersey Cross',
            milk_capacity=Decimal('13.50'),
            name='Lakshmi (AIC-106353)'
        )
        self.cow2 = Cow.objects.create(
            farmer=farmer_profile,
            pashu_aadhaar='100100100002',
            breed='Holstein Friesian Cross',
            milk_capacity=Decimal('15.00'),
            name='Kamadhenu'
        )

    def test_scan_cow_by_tag(self):
        response = self.client.get('/api/v1/cows/scan/106353486450')
        self.assertEqual(response.status_code, 200)
        data = response.data['data']
        self.assertIn('cow', data)
        self.assertIn('farmer', data)
        self.assertIn('society', data)
        self.assertEqual(data['cow']['tagId'], '106353486450')
        self.assertEqual(data['cow']['breed'], 'Jersey Cross')
        self.assertEqual(data['cow']['name'], 'Lakshmi (AIC-106353)')
        self.assertEqual(data['farmer']['fullName'], 'M. Chinnasamy')
        self.assertEqual(data['farmer']['farmerIdCode'], 'FARM-MDU-101')
        self.assertEqual(data['farmer']['village'], 'Melur')
        self.assertEqual(data['society']['name'], 'Melur Society')

    def test_scan_cow_not_found(self):
        response = self.client.get('/api/v1/cows/scan/999999999999')
        self.assertEqual(response.status_code, 404)
        self.assertFalse(response.data['success'])

    def test_list_all_cows(self):
        response = self.client.get('/api/v1/cows')
        self.assertEqual(response.status_code, 200)
        cows = response.data['data']['cows']
        self.assertEqual(len(cows), 2)
        tags = [c['tagId'] for c in cows]
        self.assertIn('106353486450', tags)
        self.assertIn('100100100002', tags)

    def test_filter_cows_by_tag(self):
        response = self.client.get('/api/v1/cows?tag=106353486450')
        self.assertEqual(response.status_code, 200)
        cows = response.data['data']['cows']
        self.assertEqual(len(cows), 1)
        self.assertEqual(cows[0]['tagId'], '106353486450')
