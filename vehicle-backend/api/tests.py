from django.conf import settings
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from .models import User, Vehicle, Booking


# The test client speaks plain HTTP, so the production HTTPS redirect is
# turned off here; every other production setting stays as configured.
@override_settings(SECURE_SSL_REDIRECT=False)
class APITestBase(TestCase):
    """Fresh API client and an empty cache for every test, so request
    throttle counters from one test never carry over into another."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()


class AuthTests(APITestBase):
    def setUp(self):
        super().setUp()

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


class VehicleRolePermissionTests(APITestBase):
    def setUp(self):
        super().setUp()
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


class BookingVisibilityTests(APITestBase):
    def setUp(self):
        super().setUp()
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


class UnauthorizedAccessTests(APITestBase):
    """Every non-public endpoint must reject requests with no token at all."""

    def setUp(self):
        super().setUp()

    def test_bookings_list_requires_authentication(self):
        response = self.client.get('/api/bookings/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_bookings_create_requires_authentication(self):
        response = self.client.post('/api/bookings/', {
            'vehicle': 1, 'pickup_location': 'A', 'drop_location': 'B', 'date': '2026-09-01'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_users_list_requires_authentication(self):
        response = self.client.get('/api/users/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_users_detail_requires_authentication(self):
        user = User.objects.create_user(username='someone', password='pw12345!', role='normal')
        response = self.client.get(f'/api/users/{user.id}/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_vehicle_create_requires_authentication(self):
        response = self.client.post('/api/vehicles/', {
            'make': 'X', 'model': 'Y', 'year': 2024, 'chassis_number': 'UNAUTHCH1',
            'vehicle_type': 'Sedan', 'capacity': 5
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_vehicle_delete_requires_authentication(self):
        vehicle = Vehicle.objects.create(make='X', model='Y', year=2024,
                                          chassis_number='UNAUTHCH2', vehicle_type='Sedan', capacity=5)
        response = self.client.delete(f'/api/vehicles/{vehicle.id}/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class UserObjectPermissionTests(APITestBase):
    """A non-admin user must never be able to read or write another user's account."""

    def setUp(self):
        super().setUp()
        self.alice = User.objects.create_user(username='alice_u', password='pw12345!', role='normal')
        self.bob = User.objects.create_user(username='bob_u', password='pw12345!', role='normal')
        self.admin = User.objects.create_user(username='admin_u', password='pw12345!', role='admin')

    def test_normal_user_cannot_read_another_users_record(self):
        self.client.force_authenticate(user=self.alice)
        response = self.client.get(f'/api/users/{self.bob.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_normal_user_cannot_edit_another_users_record(self):
        self.client.force_authenticate(user=self.alice)
        response = self.client.patch(f'/api/users/{self.bob.id}/', {'email': 'hijacked@evil.com'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.bob.refresh_from_db()
        self.assertNotEqual(self.bob.email, 'hijacked@evil.com')

    def test_normal_user_can_read_and_edit_own_record(self):
        self.client.force_authenticate(user=self.alice)
        response = self.client.patch(f'/api/users/{self.alice.id}/', {'email': 'alice@example.com'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_normal_user_list_only_shows_self(self):
        self.client.force_authenticate(user=self.alice)
        response = self.client.get('/api/users/')
        ids = {u['id'] for u in response.data}
        self.assertEqual(ids, {self.alice.id})

    def test_admin_can_read_and_edit_any_users_record(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(f'/api/users/{self.bob.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class UserCreationRouteTests(APITestBase):
    """Accounts can only be created through /api/register/, not /api/users/."""

    def setUp(self):
        super().setUp()
        self.payload = {'username': 'sidedoor', 'email': 'sidedoor@example.com',
                        'password': 'Tangerine-Bicycle-73'}

    def test_anonymous_post_to_users_is_rejected(self):
        response = self.client.post('/api/users/', self.payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(User.objects.filter(username='sidedoor').exists())

    def test_authenticated_post_to_users_is_not_allowed(self):
        admin = User.objects.create_user(username='admin_c', password='pw12345!', role='admin')
        self.client.force_authenticate(user=admin)
        response = self.client.post('/api/users/', self.payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertFalse(User.objects.filter(username='sidedoor').exists())


class BruteForceAndPasswordStrengthTests(APITestBase):
    """Login throttling and password validator enforcement."""

    def setUp(self):
        super().setUp()
        self.user = User.objects.create_user(username='target', password='Correct-Horse-42', role='normal')

    def test_repeated_bad_logins_are_throttled(self):
        rate = settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']['token']
        allowed = int(rate.split('/')[0])
        bad_login = {'username': 'target', 'password': 'wrong-password'}
        for _ in range(allowed):
            response = self.client.post('/api/token/', bad_login, format='json')
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        response = self.client.post('/api/token/', bad_login, format='json')
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_weak_password_is_rejected_at_registration(self):
        response = self.client.post('/api/register/', {
            'username': 'weakling', 'email': 'weakling@example.com', 'password': '1'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(any('too short' in message for message in response.data['password']))
        self.assertFalse(User.objects.filter(username='weakling').exists())

    def test_strong_password_is_accepted_at_registration(self):
        response = self.client.post('/api/register/', {
            'username': 'stronguser', 'email': 'stronguser@example.com', 'password': 'Tangerine-Bicycle-73'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.get(username='stronguser').check_password('Tangerine-Bicycle-73'))

    def test_weak_password_is_rejected_on_password_change(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(f'/api/users/{self.user.id}/', {'password': '1'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('Correct-Horse-42'))


class BookingStatusPermissionTests(APITestBase):
    """Only admin and call center staff may set or change a booking's status."""

    def setUp(self):
        super().setUp()
        self.admin = User.objects.create_user(username='admin_s', password='pw12345!', role='admin')
        self.call_center = User.objects.create_user(username='cc_s', password='pw12345!', role='call_center')
        self.normal = User.objects.create_user(username='normal_s', password='pw12345!', role='normal')
        self.vehicle = Vehicle.objects.create(make='Kia', model='Seltos', year=2024,
                                              chassis_number='STATUSCH1', vehicle_type='SUV', capacity=5)
        self.booking = Booking.objects.create(user=self.normal, vehicle=self.vehicle,
                                              pickup_location='A', drop_location='B', date='2026-09-20')
        self.new_booking = {'vehicle': self.vehicle.id, 'pickup_location': 'A',
                            'drop_location': 'B', 'date': '2026-09-21'}

    def test_normal_user_cannot_create_booking_with_non_default_status(self):
        self.client.force_authenticate(user=self.normal)
        response = self.client.post('/api/bookings/', {**self.new_booking, 'status': 'Confirmed'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Booking.objects.count(), 1)

    def test_normal_user_can_create_booking_with_default_status(self):
        self.client.force_authenticate(user=self.normal)
        response = self.client.post('/api/bookings/', {**self.new_booking, 'status': 'Pending'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'Pending')

    def test_normal_user_cannot_change_status_of_own_booking(self):
        self.client.force_authenticate(user=self.normal)
        response = self.client.patch(f'/api/bookings/{self.booking.id}/', {'status': 'Confirmed'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('cancel your own booking', str(response.data['detail']))
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, 'Pending')

    def test_normal_user_can_cancel_own_booking(self):
        self.client.force_authenticate(user=self.normal)
        response = self.client.patch(f'/api/bookings/{self.booking.id}/', {'status': 'Cancelled'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, 'Cancelled')

    def test_normal_user_cannot_cancel_another_users_booking(self):
        other = User.objects.create_user(username='other_s', password='pw12345!', role='normal')
        others_booking = Booking.objects.create(user=other, vehicle=self.vehicle,
                                                pickup_location='C', drop_location='D', date='2026-09-22')
        self.client.force_authenticate(user=self.normal)
        response = self.client.patch(f'/api/bookings/{others_booking.id}/', {'status': 'Cancelled'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        others_booking.refresh_from_db()
        self.assertEqual(others_booking.status, 'Pending')

    def test_normal_user_cannot_reopen_cancelled_booking(self):
        self.booking.status = 'Cancelled'
        self.booking.save()
        self.client.force_authenticate(user=self.normal)
        response = self.client.patch(f'/api/bookings/{self.booking.id}/', {'status': 'Pending'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, 'Cancelled')

    def test_normal_user_can_still_edit_other_fields_of_own_booking(self):
        self.client.force_authenticate(user=self.normal)
        response = self.client.patch(f'/api/bookings/{self.booking.id}/', {'pickup_location': 'Airport'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.pickup_location, 'Airport')

    def test_admin_can_change_booking_status(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(f'/api/bookings/{self.booking.id}/', {'status': 'Confirmed'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, 'Confirmed')

    def test_call_center_can_change_booking_status(self):
        self.client.force_authenticate(user=self.call_center)
        response = self.client.patch(f'/api/bookings/{self.booking.id}/', {'status': 'Cancelled'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, 'Cancelled')


class AvailableVehiclesDateTests(APITestBase):
    """The availability search rejects bad dates and capacities with 400 instead of crashing."""

    def setUp(self):
        super().setUp()
        self.client.force_authenticate(
            user=User.objects.create_user(username='searcher', password='pw12345!', role='normal')
        )

    def test_malformed_date_returns_400(self):
        response = self.client.get('/api/vehicles/available/?date=not-a-date')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('date', response.data)

    def test_impossible_date_returns_400(self):
        response = self.client.get('/api/vehicles/available/?date=2026-02-30')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_valid_date_still_works(self):
        response = self.client.get('/api/vehicles/available/?date=2026-09-15')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_non_numeric_capacity_returns_400(self):
        response = self.client.get('/api/vehicles/available/?capacity=abc')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('capacity', response.data)

    def test_numeric_capacity_still_filters(self):
        Vehicle.objects.create(make='Toyota', model='Innova', year=2024, chassis_number='CAPCH7',
                               vehicle_type='MUV', capacity=7)
        Vehicle.objects.create(make='Honda', model='City', year=2024, chassis_number='CAPCH5',
                               vehicle_type='Sedan', capacity=5)
        response = self.client.get('/api/vehicles/available/?capacity=7')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([v['capacity'] for v in response.data], [7])
