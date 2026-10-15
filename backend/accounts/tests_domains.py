from django.apps import apps
from django.core.exceptions import ValidationError
from django.urls import resolve
from rest_framework.test import APITestCase
from .models import User
from farmers.models import Farmer, Cow
from societies.models import Society, FarmerMilkCollection, FarmerAttendance, SocietyDispatchReceipt, Vendor
from bmcs.models import BMC
from unions.models import Union


class DomainMappingTests(APITestCase):
    def setUp(self):
        self.union = User.objects.create_user('9800000201', 'Test!874', full_name='Union', role='union')
        self.bmc = User.objects.create_user('9800000202', 'Test!874', full_name='BMC', role='bmc', parent=self.union)
        self.society = User.objects.create_user('9800000203', 'Test!874', full_name='Society', role='society', parent=self.bmc)
        self.farmer = User.objects.create_user('9800000204', 'Test!874', full_name='Farmer', role='farmer', parent=self.society)
        self.other_union = User.objects.create_user('9800000205', 'Test!874', full_name='Other Union', role='union')

    def auth(self, user):
        self.client.force_authenticate(user)

    def test_all_roles_have_typed_records_and_business_foreign_keys(self):
        self.assertEqual(Union.objects.get(pk=self.union.pk).user, self.union)
        self.assertEqual(BMC.objects.get(pk=self.bmc.pk).union_id, self.union.pk)
        self.assertEqual(Society.objects.get(pk=self.society.pk).bmc_id, self.bmc.pk)
        self.assertEqual(Farmer.objects.get(pk=self.farmer.pk).society_id, self.society.pk)
        for model, field, target in [(Cow, 'farmer', Farmer), (FarmerMilkCollection, 'farmer', Farmer),
                (FarmerMilkCollection, 'society', Society), (FarmerAttendance, 'farmer', Farmer),
                (SocietyDispatchReceipt, 'bmc', BMC), (Vendor, 'society', Society)]:
            self.assertIs(model._meta.get_field(field).remote_field.model, target)
        self.assertEqual(list(apps.get_app_config('collections').get_models()), [])
        self.assertEqual(list(apps.get_app_config('dispatch').get_models()), [])
        with self.assertRaises(LookupError):
            apps.get_model('accounts', 'FarmerProfile')

    def test_domain_lists_and_details_are_scoped(self):
        self.auth(self.union)
        self.assertEqual(len(self.client.get('/api/v1/bmcs').data['data']['bmcs']), 1)
        self.assertEqual(len(self.client.get('/api/v1/societies').data['data']['societies']), 1)
        self.assertEqual(len(self.client.get('/api/v1/unions').data['data']['unions']), 1)
        self.assertEqual(self.client.get('/api/v1/unions/' + str(self.other_union.pk)).status_code, 404)
        self.auth(self.other_union)
        self.assertEqual(self.client.get('/api/v1/bmcs').data['data']['bmcs'], [])
        self.assertEqual(self.client.get('/api/v1/societies/' + str(self.society.pk)).status_code, 404)
        self.auth(self.farmer)
        self.assertEqual(self.client.get('/api/v1/farmers/' + str(self.farmer.pk)).status_code, 200)
        self.assertEqual(self.client.get('/api/v1/bmcs').status_code, 403)
        self.assertEqual(self.client.get('/api/v1/unions').status_code, 403)

    def test_role_endpoint_registration_creates_correct_model(self):
        self.auth(self.union)
        response = self.client.post('/api/v1/bmcs', {'phone': '9800000210', 'fullName': 'New BMC', 'password': 'Valid!Pass928'}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(BMC.objects.get(pk=response.data['data']['user']['id']).union_id, self.union.pk)
        self.auth(self.bmc)
        response = self.client.post('/api/v1/societies', {'phone': '9800000211', 'fullName': 'New Society', 'password': 'Valid!Pass928'}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(Society.objects.get(pk=response.data['data']['user']['id']).bmc_id, self.bmc.pk)
        self.auth(self.society)
        response = self.client.post('/api/v1/farmers', {'phone': '9800000212', 'fullName': 'New Farmer'}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(Farmer.objects.get(pk=response.data['data']['user']['id']).society_id, self.society.pk)
        response = self.client.post('/api/v1/farmers', {'phone': '9800000213', 'fullName': 'Wrong role', 'role': 'bmc'}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_role_endpoint_updates_and_supervisor_permissions(self):
        self.auth(self.union)
        response = self.client.patch('/api/v1/bmcs/' + str(self.bmc.pk), {'fullName': 'Renamed BMC'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(BMC.objects.get(pk=self.bmc.pk).user.full_name, 'Renamed BMC')
        self.auth(self.other_union)
        self.assertEqual(self.client.patch('/api/v1/bmcs/' + str(self.bmc.pk), {'isActive': False}, format='json').status_code, 404)
        self.auth(self.bmc)
        self.assertEqual(self.client.patch('/api/v1/bmcs/' + str(self.bmc.pk), {'fullName': 'Self edit'}, format='json').status_code, 403)
        self.assertEqual(self.client.patch('/api/v1/societies/' + str(self.society.pk), {'role': 'union'}, format='json').status_code, 400)

    def test_reassignment_syncs_domain_without_rewriting_historical_records(self):
        other = User.objects.create_user('9800000220', 'Test!874', full_name='Other Society', role='society', parent=self.bmc)
        self.farmer.parent = other
        self.farmer.save()
        self.assertEqual(Farmer.objects.get(pk=self.farmer.pk).society_id, other.pk)
        self.farmer.role = 'bmc'
        with self.assertRaises(ValidationError):
            self.farmer.save()

    def test_urls_no_longer_resolve_to_retired_apps(self):
        for path in ['/api/v1/auth/login', '/api/v1/farmers', '/api/v1/milk-collections', '/api/v1/notifications',
                '/api/v1/workflow/vendors', '/api/v1/workflow/booth-receipts', '/api/v1/workflow/bmc-deliveries']:
            module = resolve(path).func.view_class.__module__
            self.assertFalse(module.startswith(('dispatch.', 'milk_collections.')), (path, module))
