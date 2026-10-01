import os
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
# Falls back to a local-dev-only key so `manage.py runserver` works out of
# the box; any real deployment MUST set DJANGO_SECRET_KEY itself. The old
# key that used to be hardcoded here was committed to a public repo and is
# considered permanently compromised -- never reuse it anywhere.
SECRET_KEY = os.environ.get(
    'DJANGO_SECRET_KEY',
    's*6lrn9@_k+971lm!i1ql6u@0(n5l)_z2c_7&oq0!$vrhwqwf-'
)

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get('DJANGO_DEBUG', 'True') == 'True'

ALLOWED_HOSTS = os.environ.get('DJANGO_ALLOWED_HOSTS', '127.0.0.1,localhost').split(',')

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
      
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # 3rd-party
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',  # ← for query param filtering

    # local
    'api',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # ← keep first
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'

# Database (SQLite for dev)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# Custom User model
AUTH_USER_MODEL = 'api.User'

# REST Framework config
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
    ),
    # Optional: lock API by default and open specific endpoints if needed
    # 'DEFAULT_PERMISSION_CLASSES': ('rest_framework.permissions.IsAuthenticated',),
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'  # keep UTC on server; convert on client if needed
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# CORS
CORS_ALLOWED_ORIGINS = os.environ.get(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:4200,http://127.0.0.1:4200'
).split(',')
CORS_ALLOW_CREDENTIALS = True

# CSRF – for when you use session/CSRF-protected views. JWT-only APIs can ignore.
CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS

# Only wide-open with credentials during local dev (DEBUG=True). A real
# deployment (DEBUG=False) must rely on the explicit CORS_ALLOWED_ORIGINS
# list above instead -- combining allow-all origins with credentials is
# a real cross-site request risk once this is reachable by the public.
CORS_ALLOW_ALL_ORIGINS = DEBUG