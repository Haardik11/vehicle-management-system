from django.http import HttpResponse
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('', lambda request: HttpResponse("✅ Django backend is running")),
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),  # ✅ All API routes, including login, are handled inside api/urls.py
]
