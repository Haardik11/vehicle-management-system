from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import (
    UserViewSet, VehicleViewSet, BookingViewSet,
    CustomTokenObtainPairView, RegisterView  # Add RegisterView here
)
from rest_framework_simplejwt.views import TokenRefreshView

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'vehicles', VehicleViewSet)
router.register(r'bookings', BookingViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('register/', RegisterView.as_view(), name='register'),  # Add this line
]