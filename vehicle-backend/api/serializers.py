from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from django.contrib.auth.password_validation import validate_password as run_password_validators
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User, Vehicle, Booking

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'role']
        extra_kwargs = {
            'password': {'write_only': True},
            'role': {'read_only': True}  # Prevent role from being set directly
        }

    def validate_password(self, value):
        # Apply the validators in AUTH_PASSWORD_VALIDATORS. An unsaved copy of
        # the user carries the submitted username/email so the similarity
        # check compares against the values being saved, without touching
        # the real record if validation fails.
        candidate = User(
            username=self.initial_data.get('username', getattr(self.instance, 'username', '')),
            email=self.initial_data.get('email', getattr(self.instance, 'email', '')),
        )
        try:
            run_password_validators(value, user=candidate)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value

    def create(self, validated_data):
        # Force role to 'normal' for all new registrations
        validated_data['role'] = 'normal'
        # Hash password before saving
        validated_data['password'] = make_password(validated_data['password'])
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Prevent role updates through this serializer
        validated_data.pop('role', None)
        if 'password' in validated_data:
            validated_data['password'] = make_password(validated_data['password'])
        return super().update(instance, validated_data)

class VehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = '__all__'

class BookingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = '__all__'
        read_only_fields = ['user']  # User is automatically set from request

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Add custom claims to JWT
        token['username'] = user.username
        token['role'] = user.role
        return token

    def validate(self, attrs):
        # Include user data in the token response
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data