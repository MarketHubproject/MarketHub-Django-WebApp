from pathlib import Path
import os

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = 'django-insecure-2!q%^8-0tdl57)##4u_dq!%g8bx#n590f=m(#_%2=%@463+1om'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1']

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework.authtoken',
    'drf_spectacular',
    'csp',
    'axes',
    'homepage',
    'profiles',
    'student_rewards',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'homepage.middleware.PaymentSecurityMiddleware',
    'homepage.middleware.PaymentValidationMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'markethub.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'homepage' / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'homepage.context_processors.api_config',
                'homepage.context_processors.app_config',
                'homepage.context_processors.cart_context',
                'homepage.context_processors.stripe_context',
            ],
        },
    },
]

WSGI_APPLICATION = 'markethub.wsgi.application'

# Database - SQLite for development
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

print(f"[NEW SETTINGS.PY] DATABASES configured: {DATABASES}")

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Additional directories for static files
STATICFILES_DIRS = [
    BASE_DIR / 'homepage' / 'static',
]

# Whitenoise configuration for static files
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Authentication
LOGIN_URL = '/login/'
LOGOUT_REDIRECT_URL = '/'

# Django REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# DRF Spectacular settings
SPECTACULAR_SETTINGS = {
    'TITLE': 'MarketHub API',
    'DESCRIPTION': 'A premium Django e-commerce platform with comprehensive REST API',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'SCHEMA_PATH_PREFIX': '/api/',
}

# Email Configuration - Console backend for development
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Cache Configuration - Local memory cache for development
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
    }
}

# CSRF Protection for development - Relaxed settings
CSRF_TRUSTED_ORIGINS = ['http://127.0.0.1:8000', 'http://localhost:8000']
CSRF_USE_SESSIONS = False
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SECURE = False

# Session settings for development
SESSION_COOKIE_SECURE = False
SESSION_COOKIE_SAMESITE = 'Lax'

# Content Security Policy (CSP) - Relaxed for development
CSP_DEFAULT_SRC = ("'self'",)
CSP_SCRIPT_SRC = (
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'",
    "https://js.stripe.com",
    "https://cdn.jsdelivr.net",
    "https://cdnjs.cloudflare.com",
)
CSP_STYLE_SRC = (
    "'self'",
    "'unsafe-inline'",
    "https://cdn.jsdelivr.net",
    "https://cdnjs.cloudflare.com",
    "https://fonts.googleapis.com",
)

# Django-Axes (Brute Force Protection)
AXES_FAILURE_LIMIT = 5
AXES_COOLOFF_TIME = 1  # 1 hour
AXES_RESET_ON_SUCCESS = True
AXES_ENABLE_ADMIN = True
AXES_VERBOSE = True
AXES_HANDLER = 'axes.handlers.database.AxesDatabaseHandler'

# Authentication backend for axes
AUTHENTICATION_BACKENDS = [
    'axes.backends.AxesBackend',
    'django.contrib.auth.backends.ModelBackend',
]

# Stripe Payment Configuration
PAYMENT_ENV = os.environ.get('PAYMENT_ENV', 'test')

# Stripe API Keys - Load from environment variables
STRIPE_PUBLISHABLE_KEY = os.environ.get('STRIPE_PUBLIC_KEY', 'pk_test_51XXX')
STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY', 'sk_test_51XXX')
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET', 'whsec_XXX')

# Stripe Configuration Validation
if PAYMENT_ENV == 'live' and (not STRIPE_SECRET_KEY or STRIPE_SECRET_KEY.startswith('sk_test_')):
    print("[WARNING] Production environment detected but using test Stripe keys!")
    
if not STRIPE_SECRET_KEY or STRIPE_SECRET_KEY == 'sk_test_51XXX':
    print("[WARNING] Stripe secret key not configured. Payment processing will not work.")

# API Configuration
API_BASE_URL = 'http://127.0.0.1:8000/api/'

# Environment indicator
ENVIRONMENT_NAME = 'DEVELOPMENT'

print("[NEW SETTINGS.PY] Settings file loading completed!")
