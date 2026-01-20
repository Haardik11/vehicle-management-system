from django.contrib import admin

# Register your models here.
from .models import User
from .models import Vehicle,Booking



admin.site.register(User)
admin.site.register(Vehicle)
admin.site.register(Booking)
