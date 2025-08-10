"""
Base settings for MarketHub Django project.
These settings are common to all environments.
"""
import os
from pathlib import Path
from decouple import config, Csv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

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
    'whitenoise.middleware.WhiteNoiseMiddleware',  # Added for static file serving
    'csp.middleware.CSPMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'axes.middleware.AxesMiddleware',
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

# DRF Spectacular settings for API documentation
SPECTACULAR_SETTINGS = {
    'TITLE': 'MarketHub API',
    'DESCRIPTION': 'A premium Django e-commerce platform with comprehensive REST API',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'SCHEMA_PATH_PREFIX': '/api/',
    'COMPONENT_SPLIT_REQUEST': True,
    'SORT_OPERATIONS': False,
    'ENUM_NAME_OVERRIDES': {
        'ValidationErrorEnum': 'drf_spectacular.utils.validation_error_response_schema',
    },
    'SERVE_AUTHENTICATION': ['rest_framework.authentication.SessionAuthentication'],
    'SERVE_PERMISSIONS': ['rest_framework.permissions.IsAuthenticated'],
    'CONTACT': {
        'name': 'MarketHub Support',
        'email': 'support@markethub.com',
    },
    'LICENSE': {
        'name': 'MIT License',
        'url': 'https://opensource.org/licenses/MIT',
    },
    'EXTERNAL_DOCS': {
        'description': 'MarketHub Documentation',
        'url': 'https://markethub.com/docs/',
    },
    'TAGS': [
        {'name': 'Authentication', 'description': 'User authentication endpoints'},
        {'name': 'Products', 'description': 'Product management operations'},
        {'name': 'Cart', 'description': 'Shopping cart functionality'},
        {'name': 'Orders', 'description': 'Order processing and management'},
        {'name': 'Payments', 'description': 'Payment processing via Stripe'},
        {'name': 'Categories', 'description': 'Product category management'},
        {'name': 'Users', 'description': 'User profile management'},
    ],
}

# API Configuration
API_BASE_URL = 'http://127.0.0.1:8000/api/'

# CSRF Protection
CSRF_USE_SESSIONS = True
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = 'Strict'

# Session Security
SESSION_COOKIE_SAMESITE = 'Strict'
SESSION_COOKIE_HTTPONLY = True
SESSION_EXPIRE_AT_BROWSER_CLOSE = True
SESSION_COOKIE_AGE = 3600  # 1 hour

# Content Security Policy (CSP)
CSP_DEFAULT_SRC = ("'self'",)
CSP_SCRIPT_SRC = (
    "'self'",
    "'unsafe-inline'",  # Required for inline scripts - minimize in production
    "'unsafe-eval'",   # Required for some JS libraries - minimize in production
    "https://js.stripe.com",  # Stripe JS SDK
    "https://cdn.jsdelivr.net",  # CDN for libraries
    "https://cdnjs.cloudflare.com",  # CDN for libraries
)
CSP_STYLE_SRC = (
    "'self'",
    "'unsafe-inline'",  # Required for CSS - use nonces in production
    "https://cdn.jsdelivr.net",
    "https://cdnjs.cloudflare.com",
    "https://fonts.googleapis.com",
)
CSP_FONT_SRC = (
    "'self'",
    "https://fonts.gstatic.com",
    "https://cdnjs.cloudflare.com",
)
CSP_IMG_SRC = (
    "'self'",
    "data:",  # Allow data: URLs for images
    "blob:",  # Allow blob: URLs for images
    "https:",  # Allow HTTPS images
)
CSP_CONNECT_SRC = (
    "'self'",
    "https://api.stripe.com",  # Stripe API
)
CSP_FRAME_ANCESTORS = ("'none'",)  # Prevent embedding in frames
CSP_BASE_URI = ("'self'",)
CSP_OBJECT_SRC = ("'none'",)  # Prevent plugins like Flash

# Security Headers
SECURE_REFERRER_POLICY = 'same-origin'
X_FRAME_OPTIONS = 'DENY'  # Prevent clickjacking

# Django-Axes (Brute Force Protection)
AXES_FAILURE_LIMIT = 5
AXES_COOLOFF_TIME = 1  # 1 hour
AXES_RESET_ON_SUCCESS = True
AXES_ENABLE_ADMIN = True
AXES_VERBOSE = True
AXES_RESET_COOL_OFF_ON_FAILURE_DURING_LOCKOUT = False

# Use database for axes lockouts
AXES_HANDLER = 'axes.handlers.database.AxesDatabaseHandler'

# Authentication backend for axes
AUTHENTICATION_BACKENDS = [
    'axes.backends.AxesBackend',  # AxesBackend should come first
    'django.contrib.auth.backends.ModelBackend',  # Django's default backend
]
