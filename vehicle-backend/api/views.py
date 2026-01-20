from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, Vehicle, Booking
from .serializers import (
    UserSerializer,
    VehicleSerializer,
    BookingSerializer,
    CustomTokenObtainPairSerializer
)
from rest_framework_simplejwt.views import TokenObtainPairView

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('id')
    serializer_class = UserSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['username', 'email', 'role']
    permission_classes = [IsAuthenticated]  # Default permission

    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]  # Allow anyone to register
        return [IsAuthenticated()]  # Require auth for other actions

    def create(self, request, *args, **kwargs):
        # Force role to 'normal' for new registrations
        request.data['role'] = 'normal'
        return super().create(request, *args, **kwargs)

class RegisterView(APIView):
    permission_classes = [AllowAny]
    
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
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def available(self, request):
        date = request.query_params.get('date')
        capacity = request.query_params.get('capacity')

        qs = Vehicle.objects.filter(status='Available')

        if date:
            booked_vehicles = Booking.objects.filter(
                date=date,
                status__in=['Pending', 'Confirmed']
            ).values_list('vehicle', flat=True)
            qs = qs.exclude(id__in=booked_vehicles)

        if capacity:
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

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]