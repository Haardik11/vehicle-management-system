from rest_framework import mixins, viewsets, status
from django.utils.dateparse import parse_date
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, Vehicle, Booking
from .permissions import IsAdminOrCallCenter
from .serializers import (
    UserSerializer,
    VehicleSerializer,
    BookingSerializer,
    CustomTokenObtainPairSerializer
)
from rest_framework_simplejwt.views import TokenObtainPairView

class UserViewSet(mixins.ListModelMixin,
                  mixins.RetrieveModelMixin,
                  mixins.UpdateModelMixin,
                  mixins.DestroyModelMixin,
                  viewsets.GenericViewSet):
    # No create action: new accounts go through RegisterView (/api/register/),
    # which applies the registration throttle.
    queryset = User.objects.all().order_by('id')
    serializer_class = UserSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['username', 'email', 'role']
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if getattr(user, 'role', None) == 'admin':
            return qs
        return qs.filter(id=user.id)

class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'register'

    def post(self, request):
        # Remove role if present and force 'normal'
        request.data.pop('role', None)
        serializer = UserSerializer(data=request.data)
        
        if serializer.is_valid():
            user = serializer.save(role='normal')  # Force normal role
            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': serializer.data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class VehicleViewSet(viewsets.ModelViewSet):
    queryset = Vehicle.objects.all().order_by('id')
    serializer_class = VehicleSerializer
    permission_classes = [IsAdminOrCallCenter]

    @action(detail=False, methods=['get'])
    def available(self, request):
        date = request.query_params.get('date')
        capacity = request.query_params.get('capacity')

        qs = Vehicle.objects.filter(status='Available')

        if date:
            try:
                parsed_date = parse_date(date)
            except ValueError:
                parsed_date = None
            if parsed_date is None:
                return Response(
                    {'date': ['Invalid date. Use the format YYYY-MM-DD, for example 2026-09-15.']},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            date = parsed_date
            booked_vehicles = Booking.objects.filter(
                date=date,
                status__in=['Pending', 'Confirmed']
            ).values_list('vehicle', flat=True)
            qs = qs.exclude(id__in=booked_vehicles)

        if capacity:
            try:
                capacity = int(capacity)
            except ValueError:
                return Response(
                    {'capacity': ['Capacity must be a whole number, for example 5.']},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            qs = qs.filter(capacity=capacity)

        serializer = self.get_serializer(qs.order_by('id'), many=True)
        return Response(serializer.data)

class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.all().order_by('-date', '-id')
    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['user', 'status', 'date', 'vehicle']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        role = getattr(user, 'role', 'normal')
        if role == 'normal':
            return qs.filter(user=user)
        return qs

    STATUS_CHANGE_ROLES = ('admin', 'call_center')
    # The only status change other users may make, and only on their own
    # bookings (get_queryset already hides everyone else's).
    SELF_SERVICE_STATUS = 'Cancelled'
    STATUS_DENIED_MESSAGE = "Only admin or call center staff can change a booking's status."
    UPDATE_DENIED_MESSAGE = (
        "Only admin or call center staff can change a booking's status. "
        "You can cancel your own booking by setting its status to Cancelled."
    )

    def _can_change_status(self):
        return getattr(self.request.user, 'role', None) in self.STATUS_CHANGE_ROLES

    def perform_create(self, serializer):
        default_status = Booking._meta.get_field('status').default
        requested = serializer.validated_data.get('status', default_status)
        if requested != default_status and not self._can_change_status():
            raise PermissionDenied(self.STATUS_DENIED_MESSAGE)
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        current = serializer.instance.status
        requested = serializer.validated_data.get('status', current)
        if (requested != current
                and requested != self.SELF_SERVICE_STATUS
                and not self._can_change_status()):
            raise PermissionDenied(self.UPDATE_DENIED_MESSAGE)
        serializer.save()

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'token'