from django.core.exceptions import ValidationError
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User

PASSWORD = 'CattleSecure!874'

class AccountTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.union = User.objects.create_superuser('9842000001', PASSWORD, full_name='Madurai Union')
        self.bmc = User.objects.create_user('9842000002', PASSWORD, full_name='BMC One', role='bmc', parent=self.union)
        self.society = User.objects.create_user('9842000003', PASSWORD, full_name='Society One', role='society', parent=self.bmc)
        self.farmer = User.objects.create_user('9842000004', PASSWORD, full_name='Farmer One', role='farmer', parent=self.society)

    def authenticate_as(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(user).access_token}')

    def register(self, role, phone='9842000099', **extra):
        return self.client.post('/api/v1/auth/register', {'phone': phone, 'password': PASSWORD, 'fullName': 'New Account', 'role': role, **extra}, format='json')

    def test_phone_login_for_every_role(self):
        for user in [self.union, self.bmc, self.society, self.farmer]:
            response = self.client.post('/api/v1/auth/login', {'phone': user.phone, 'password': PASSWORD})
            self.assertEqual(response.status_code, 200)
            data = response.data['data']
            self.assertEqual(data['user']['roles'], [user.role])
            self.assertIn('accessToken', data)
            self.assertIn('refreshToken', data)
            self.assertNotIn('password', data['user'])

    def test_frontend_phone_alias(self):
        response = self.client.post('/api/v1/auth/login', {'usernameOrPhone': self.farmer.phone, 'password': PASSWORD})
        self.assertEqual(response.status_code, 200)

    def test_invalid_password_and_inactive_user(self):
        response = self.client.post('/api/v1/auth/login', {'phone': self.farmer.phone, 'password': 'wrong'})
        self.assertEqual(response.status_code, 401)
        self.farmer.is_active = False
        self.farmer.save()
        response = self.client.post('/api/v1/auth/login', {'phone': self.farmer.phone, 'password': PASSWORD})
        self.assertEqual(response.status_code, 401)

    def test_registration_requires_authentication(self):
        self.assertEqual(self.register('farmer').status_code, 401)

    def test_complete_creation_permission_matrix(self):
        allowed = {'union': {'bmc', 'society'}, 'bmc': {'society'}, 'society': {'farmer'}, 'farmer': set()}
        for actor_index, actor in enumerate([self.union, self.bmc, self.society, self.farmer]):
            self.authenticate_as(actor)
            for role_index, role in enumerate(User.Role.values):
                extra = {'parentId': str(self.bmc.pk)} if actor.role == 'union' and role == 'society' else {}
                response = self.register(role, phone=f'984201{actor_index}{role_index}99', **extra)
                if role in allowed[actor.role]:
                    self.assertEqual(response.status_code, 201, response.data)
                    user = User.objects.get(pk=response.data['data']['user']['id'])
                    self.assertEqual(user.created_by, actor)
                    self.assertEqual(user.parent, self.bmc if extra else actor)
                    self.assertTrue(user.check_password(PASSWORD))
                    self.assertNotEqual(user.password, PASSWORD)
                else:
                    self.assertEqual(response.status_code, 403, response.data)

    def test_union_society_requires_own_bmc(self):
        self.authenticate_as(self.union)
        self.assertEqual(self.register('society').status_code, 400)
        other_union = User.objects.create_user('9842000010', PASSWORD, full_name='Other Union', role='union')
        other_bmc = User.objects.create_user('9842000011', PASSWORD, full_name='Other BMC', role='bmc', parent=other_union)
        self.assertEqual(self.register('society', parentId=str(other_bmc.pk)).status_code, 400)
        self.assertEqual(self.register('society', parentId=str(self.farmer.pk)).status_code, 400)

    def test_cannot_register_under_another_society(self):
        self.authenticate_as(self.society)
        self.assertEqual(self.register('farmer', parentId=str(self.bmc.pk)).status_code, 403)

    def test_duplicate_phone_and_weak_password(self):
        self.authenticate_as(self.society)
        self.assertEqual(self.register('farmer', phone=self.farmer.phone).status_code, 400)
        payload = {'phone': '9842000099', 'password': '123', 'fullName': 'New Farmer', 'role': 'farmer'}
        self.assertEqual(self.client.post('/api/v1/auth/register', payload).status_code, 400)

    def test_more_than_fifteen_societies_in_one_bmc(self):
        self.authenticate_as(self.bmc)
        for index in range(16):
            self.assertEqual(self.register('society', phone=f'984210{index:04d}').status_code, 201)
        self.assertEqual(self.bmc.members.count(), 17)

    def test_refresh_me_logout_and_revocation(self):
        refresh = RefreshToken.for_user(self.farmer)
        response = self.client.post('/api/v1/auth/refresh', {'refreshToken': str(refresh)})
        self.assertEqual(response.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['data']['accessToken']}")
        self.assertEqual(self.client.get('/api/v1/auth/me').data['data']['user']['id'], str(self.farmer.pk))
        self.assertEqual(self.client.post('/api/v1/auth/logout', {'refreshToken': str(refresh)}).status_code, 200)
        self.assertEqual(self.client.post('/api/v1/auth/refresh', {'refreshToken': str(refresh)}).status_code, 401)

    def test_cannot_revoke_another_users_refresh_token(self):
        self.authenticate_as(self.society)
        refresh = str(RefreshToken.for_user(self.farmer))
        self.assertEqual(self.client.post('/api/v1/auth/logout', {'refreshToken': refresh}).status_code, 400)
        self.assertEqual(self.client.post('/api/v1/auth/refresh', {'refreshToken': refresh}).status_code, 200)

    def test_inactive_account_cannot_refresh(self):
        refresh = str(RefreshToken.for_user(self.farmer))
        self.farmer.is_active = False
        self.farmer.save()
        self.assertEqual(self.client.post('/api/v1/auth/refresh', {'refreshToken': refresh}).status_code, 401)

    def test_model_rejects_wrong_parent_and_superuser_role(self):
        with self.assertRaises(ValidationError):
            User.objects.create_user('9842000099', PASSWORD, full_name='Wrong', role='farmer', parent=self.bmc)
        with self.assertRaises(ValueError):
            User.objects.create_superuser('9842000099', PASSWORD, full_name='Wrong', role='farmer')

    def test_admin_union_creation_form_hashes_password(self):
        from .admin import AccountCreationForm
        form = AccountCreationForm(data={'phone': '9842000088', 'full_name': 'New Union', 'role': 'union', 'password1': PASSWORD, 'password2': PASSWORD})
        self.assertTrue(form.is_valid(), form.errors)
        user = form.save()
        self.assertTrue(user.check_password(PASSWORD))
        self.assertIsNone(user.parent)

    def profile_payload(self, **changes):
        details = {
            'farmerIdCode': 'farm-mdu-999', 'address': '10 Main Street', 'village': 'Melur',
            'community': 'Melur Taluk', 'numberOfCows': 0,
            'bankAccountName': 'New Farmer', 'bankName': 'Example Bank',
            'bankAccountNumber': '0000123456', 'bankIfsc': 'TEST0001234', 'upiId': 'farmer@bank',
        }
        details.update(changes)
        return {'phone': '9842000099', 'fullName': 'New Farmer', 'role': 'farmer', 'personalDetails': details}

    def test_registration_persists_complete_profile_and_phone_password(self):
        from .models import FarmerProfile
        self.authenticate_as(self.society)
        payload = self.profile_payload()
        response = self.client.post('/api/v1/auth/register', payload, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        user = User.objects.get(phone=payload['phone'])
        profile = FarmerProfile.objects.get(user=user)
        self.assertEqual(profile.farmer_id_code, 'FARM-MDU-999')
        self.assertEqual(profile.number_of_cows, 0)
        self.assertEqual(profile.verification_status, 'pending')
        self.assertEqual(profile.address, payload['personalDetails']['address'])
        self.assertEqual(profile.bank_account_number, '0000123456')
        for wire, model_field in [('village', 'village'), ('community', 'community'), ('bankAccountName', 'bank_account_name'),
                                  ('bankName', 'bank_name'), ('bankIfsc', 'bank_ifsc'), ('upiId', 'upi_id')]:
            self.assertEqual(getattr(profile, model_field), payload['personalDetails'][wire])
        self.assertEqual(user.parent, self.society)
        self.assertEqual(user.created_by, self.society)
        self.assertTrue(user.check_password(user.phone))
        self.assertNotEqual(user.password, user.phone)
        self.client.credentials()
        login = self.client.post('/api/v1/auth/login', {'phone': user.phone, 'password': user.phone})
        self.assertEqual(login.status_code, 200, login.data)
        data = login.data['data']['user']
        self.assertEqual(data['personalDetails']['numberOfCows'], 0)
        self.assertEqual(data['parent']['id'], str(self.society.pk))
        self.client.credentials(HTTP_AUTHORIZATION='Bearer '+login.data['data']['accessToken'])
        self.assertEqual(self.client.get('/api/v1/auth/me').data['data']['user']['personalDetails'], data['personalDetails'])

    def test_optional_banking_and_existing_accounts_without_profile(self):
        self.authenticate_as(self.society)
        payload = self.profile_payload()
        for field in ['bankAccountName', 'bankName', 'bankAccountNumber', 'bankIfsc', 'upiId']:
            del payload['personalDetails'][field]
        response = self.client.post('/api/v1/auth/register', payload, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['data']['user']['personalDetails']['bankName'], '')
        listed = self.client.get('/api/v1/farmers').data['data']['farmers']
        legacy = next(item for item in listed if item['id'] == str(self.farmer.pk))
        self.assertIsNone(legacy['personalDetails'])

    def test_duplicate_profile_code_case_insensitive_and_negative_cows(self):
        self.authenticate_as(self.society)
        response = self.client.post('/api/v1/auth/register', self.profile_payload(), format='json')
        self.assertEqual(response.status_code, 201)
        duplicate = self.profile_payload(farmerIdCode='farm-mdu-999')
        duplicate['phone'] = '9842000098'
        response = self.client.post('/api/v1/auth/register', duplicate, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('farmerIdCode', response.data['errors']['personalDetails'])
        self.assertFalse(User.objects.filter(phone=duplicate['phone']).exists())
        negative = self.profile_payload(numberOfCows=-1, farmerIdCode='FARM-MDU-998')
        negative['phone'] = '9842000097'
        self.assertEqual(self.client.post('/api/v1/auth/register', negative, format='json').status_code, 400)

    def test_profile_failure_rolls_back_account(self):
        from unittest.mock import patch
        from django.db import IntegrityError
        from .models import FarmerProfile
        self.authenticate_as(self.society)
        with patch.object(FarmerProfile, 'save', side_effect=IntegrityError('test failure')):
            response = self.client.post('/api/v1/auth/register', self.profile_payload(), format='json')
        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.filter(phone='9842000099').exists())

    def test_nonfarmer_cannot_use_default_password_or_profile(self):
        self.authenticate_as(self.union)
        data = {'phone': '9842000099', 'fullName': 'BMC Two', 'role': 'bmc'}
        self.assertEqual(self.client.post('/api/v1/auth/register', data).status_code, 400)
        data['password'] = PASSWORD
        data['personalDetails'] = self.profile_payload()['personalDetails']
        self.assertEqual(self.client.post('/api/v1/auth/register', data, format='json').status_code, 400)

    def test_farmer_listing_is_society_scoped(self):
        other = User.objects.create_user('9842000010', PASSWORD, full_name='Society Two', role='society', parent=self.bmc)
        other_farmer = User.objects.create_user('9842000011', PASSWORD, full_name='Other Farmer', role='farmer', parent=other)
        self.authenticate_as(self.society)
        response = self.client.get('/api/v1/farmers?parentId='+str(other.pk))
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item['id'] for item in response.data['data']['farmers']], [str(self.farmer.pk)])
        self.authenticate_as(other)
        response = self.client.get('/api/v1/farmers')
        self.assertEqual([item['id'] for item in response.data['data']['farmers']], [str(other_farmer.pk)])
        for actor in [self.union, self.bmc, self.farmer]:
            self.authenticate_as(actor)
            self.assertEqual(self.client.get('/api/v1/farmers').status_code, 403)
        self.client.credentials()
        self.assertEqual(self.client.get('/api/v1/farmers').status_code, 401)

    def test_login_preserves_password_spaces(self):
        self.farmer.set_password('  SecurePassword!879  ')
        self.farmer.save()
        good = self.client.post('/api/v1/auth/login', {'phone': self.farmer.phone, 'password': '  SecurePassword!879  '})
        self.assertEqual(good.status_code, 200)
        bad = self.client.post('/api/v1/auth/login', {'phone': self.farmer.phone, 'password': 'SecurePassword!879'})
        self.assertEqual(bad.status_code, 401)

    def cow_payload(self, **changes):
        cow = {'pashuAadhaar': '123456789012', 'breed': 'Jersey Cross', 'milkCapacity': '12.50', 'name': 'Lakshmi'}
        cow.update(changes)
        return cow

    def test_registration_saves_cows_and_returns_them_on_login_me_and_listing(self):
        from decimal import Decimal
        from .models import Cow, FarmerProfile
        self.authenticate_as(self.society)
        payload = self.profile_payload(numberOfCows=99)
        payload['cows'] = [self.cow_payload(farmerId=str(self.farmer.pk)),
                           self.cow_payload(pashuAadhaar='123456789013', name='', breed='HF Cross')]
        response = self.client.post('/api/v1/auth/register', payload, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        user = User.objects.get(phone=payload['phone'])
        self.assertEqual(FarmerProfile.objects.get(user=user).number_of_cows, 2)
        self.assertEqual(Cow.objects.filter(farmer=user).count(), 2)
        cow = Cow.objects.get(pashu_aadhaar='123456789012')
        self.assertEqual(cow.milk_capacity, Decimal('12.50'))
        self.assertEqual(cow.name, 'Lakshmi')
        saved = response.data['data']['user']['cows']
        self.assertEqual({item['farmerId'] for item in saved}, {str(user.pk)})
        self.assertEqual({item['id'] for item in saved}, {str(item.pk) for item in user.cows.all()})
        self.assertTrue(all(item['createdAt'] for item in saved))
        listed = self.client.get('/api/v1/farmers').data['data']['farmers']
        self.assertEqual(next(item for item in listed if item['id'] == str(user.pk))['cows'], saved)
        self.client.credentials()
        login = self.client.post('/api/v1/auth/login', {'phone': user.phone, 'password': user.phone})
        self.assertEqual(login.status_code, 200, login.data)
        self.assertEqual(login.data['data']['user']['cows'], saved)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer '+login.data['data']['accessToken'])
        self.assertEqual(self.client.get('/api/v1/auth/me').data['data']['user']['cows'], saved)

    def test_invalid_cows_do_not_create_farmer_or_profile(self):
        from .models import Cow, FarmerProfile
        self.authenticate_as(self.society)
        cases = [[], [self.cow_payload(pashuAadhaar='123')],
                 [self.cow_payload(pashuAadhaar='12345678901x')],
                 [self.cow_payload(breed='')], [self.cow_payload(milkCapacity='0')],
                 [self.cow_payload(milkCapacity='-1')], [self.cow_payload(milkCapacity='NaN')],
                 [self.cow_payload(), self.cow_payload()]]
        for cows in cases:
            with self.subTest(cows=cows):
                payload = {**self.profile_payload(), 'cows': cows}
                response = self.client.post('/api/v1/auth/register', payload, format='json')
                self.assertEqual(response.status_code, 400, response.data)
                self.assertIn('cows', response.data['errors'])
                self.assertFalse(User.objects.filter(phone=payload['phone']).exists())
                self.assertEqual(FarmerProfile.objects.count(), 0)
                self.assertEqual(Cow.objects.count(), 0)

    def test_existing_tag_cannot_be_registered_to_another_farmer(self):
        from .models import Cow
        Cow.objects.create(farmer=self.farmer, pashu_aadhaar='123456789012', breed='HF Cross', milk_capacity=10)
        self.authenticate_as(self.society)
        payload = {**self.profile_payload(), 'cows': [self.cow_payload()]}
        response = self.client.post('/api/v1/auth/register', payload, format='json')
        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn('pashuAadhaar', response.data['errors']['cows'][0])
        self.assertFalse(User.objects.filter(phone=payload['phone']).exists())
        self.assertEqual(Cow.objects.count(), 1)

    def test_cow_save_failure_rolls_back_farmer_profile_and_all_cows(self):
        from unittest.mock import patch
        from django.db import IntegrityError
        from .models import Cow, FarmerProfile
        self.authenticate_as(self.society)
        payload = {**self.profile_payload(), 'cows': [self.cow_payload(), self.cow_payload(pashuAadhaar='123456789013')]}
        original_save = Cow.save
        def fail_second(cow, *args, **kwargs):
            if cow.pashu_aadhaar.endswith('13'):
                raise IntegrityError('simulated concurrent tag collision')
            return original_save(cow, *args, **kwargs)
        with patch.object(Cow, 'save', fail_second):
            response = self.client.post('/api/v1/auth/register', payload, format='json')
        self.assertEqual(response.status_code, 400, response.data)
        self.assertFalse(User.objects.filter(phone=payload['phone']).exists())
        self.assertEqual(FarmerProfile.objects.count(), 0)
        self.assertEqual(Cow.objects.count(), 0)

    def test_cows_are_only_registered_for_farmers_and_listed_to_their_society(self):
        from .models import Cow
        self.authenticate_as(self.union)
        response = self.register('bmc', cows=[self.cow_payload()])
        self.assertEqual(response.status_code, 400, response.data)
        Cow.objects.create(farmer=self.farmer, pashu_aadhaar='123456789012', breed='Jersey Cross', milk_capacity=12)
        other = User.objects.create_user('9842000010', PASSWORD, full_name='Other Society', role='society', parent=self.bmc)
        self.authenticate_as(other)
        self.assertEqual(self.client.get('/api/v1/farmers').data['data']['farmers'], [])
        with self.assertRaises(ValidationError):
            Cow(farmer=self.society, pashu_aadhaar='123456789013', breed='Jersey Cross', milk_capacity=12).full_clean()
