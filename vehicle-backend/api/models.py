from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    ROLE_CHOICES = [('admin', 'Admin'), ('call_center', 'Call Center'), ('normal', 'Normal')]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='normal')

class Vehicle(models.Model):
    make = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    year = models.PositiveIntegerField()
    chassis_number = models.CharField(max_length=100, unique=True)
    vehicle_type = models.CharField(max_length=50)
    capacity = models.PositiveIntegerField()
    status = models.CharField(max_length=20, default='Available')

class Booking(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE)
    pickup_location = models.CharField(max_length=255)
    drop_location = models.CharField(max_length=255)
    date = models.DateField()
    status = models.CharField(max_length=20, default='Pending')
