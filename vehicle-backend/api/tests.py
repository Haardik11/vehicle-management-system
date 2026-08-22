from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from .models import User, Vehicle, Booking


class AuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_creates_normal_user_and_returns_tokens(self):
        response = self.client.post('/api/register/', {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'StrongPass123!'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['role'], 'normal')

    def test_register_cannot_set_privileged_role(self):
        response = self.client.post('/api/register/', {
            'username': 'sneaky',
            'email': 'sneaky@example.com',
            'password': 'StrongPass123!',
            'role': 'admin'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['user']['role'], 'normal')

    def test_login_returns_role_in_token_payload(self):
        User.objects.create_user(username='bob', password='pw12345!', role='call_center')
        response = self.client.post('/api/token/', {
            'username': 'bob', 'password': 'pw12345!'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['role'], 'call_center')

    def test_login_rejects_wrong_password(self):
        User.objects.create_user(username='bob', password='pw12345!', role='normal')
        response = self.client.post('/api/token/', {
            'username': 'bob', 'password': 'wrong'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_vehicle_list_requires_authentication(self):
        response = self.client.get('/api/vehicles/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class VehicleRolePermissionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(username='admin_u', password='pw12345!', role='admin')
        self.call_center = User.objects.create_user(username='cc_u', password='pw12345!', role='call_center')
        self.normal = User.objects.create_user(username='normal_u', password='pw12345!', role='normal')
        self.vehicle_payload = {
            'make': 'Test', 'model': 'Car', 'year': 2024,
            'chassis_number': 'TESTCH001', 'vehicle_type': 'Sedan',
            'capacity': 5, 'status': 'Available'
        }

    def auth_as(self, user):
        self.client.force_authenticate(user=user)

    def test_any_authenticated_role_can_list_vehicles(self):
        Vehicle.objects.create(make='Toyota', model='Fortuner', year=2024,
                                chassis_number='CH1', vehicle_type='SUV', capacity=7)
        for user in (self.admin, self.call_center, self.normal):
            self.auth_as(user)
            response = self.client.get('/api/vehicles/')
            self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_can_create_vehicle(self):
        self.auth_as(self.admin)
        response = self.client.post('/api/vehicles/', self.vehicle_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_call_center_can_create_vehicle(self):
        self.auth_as(self.call_center)
        response = self.client.post('/api/vehicles/', self.vehicle_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_normal_user_cannot_create_vehicle(self):
        self.auth_as(self.normal)
        response = self.client.post('/api/vehicles/', self.vehicle_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Vehicle.objects.count(), 0)

    def test_normal_user_cannot_delete_vehicle(self):
        vehicle = Vehicle.objects.create(**self.vehicle_payload)
        self.auth_as(self.normal)
        response = self.client.delete(f'/api/vehicles/{vehicle.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Vehicle.objects.filter(id=vehicle.id).exists())

    def test_admin_can_delete_vehicle(self):
        vehicle = Vehicle.objects.create(**self.vehicle_payload)
        self.auth_as(self.admin)
        response = self.client.delete(f'/api/vehicles/{vehicle.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Vehicle.objects.filter(id=vehicle.id).exists())


class BookingVisibilityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(username='admin_u', password='pw12345!', role='admin')
        self.alice = User.objects.create_user(username='alice', password='pw12345!', role='normal')
        self.bob = User.objects.create_user(username='bob', password='pw12345!', role='normal')
        self.vehicle = Vehicle.objects.create(make='Honda', model='City', year=2023,
                                               chassis_number='CH2', vehicle_type='Sedan', capacity=5)
        self.alice_booking = Booking.objects.create(
            user=self.alice, vehicle=self.vehicle, pickup_location='A',
            drop_location='B', date='2026-09-01'
        )
        self.bob_booking = Booking.objects.create(
            user=self.bob, vehicle=self.vehicle, pickup_location='C',
            drop_location='D', date='2026-09-02'
        )

    def test_normal_user_only_sees_own_bookings(self):
        self.client.force_authenticate(user=self.alice)
        response = self.client.get('/api/bookings/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = {b['id'] for b in response.data}
        self.assertEqual(ids, {self.alice_booking.id})

    def test_admin_sees_all_bookings(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/bookings/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = {b['id'] for b in response.data}
        self.assertEqual(ids, {self.alice_booking.id, self.bob_booking.id})

    def test_booking_is_created_under_authenticated_user(self):
        self.client.force_authenticate(user=self.bob)
        response = self.client.post('/api/bookings/', {
            'vehicle': self.vehicle.id, 'pickup_location': 'X',
            'drop_location': 'Y', 'date': '2026-09-05'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['user'], self.bob.id)
