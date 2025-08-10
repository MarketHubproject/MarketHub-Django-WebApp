"""
Development settings for MarketHub Django project.
"""
from .base import *
from decouple import config, Csv

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config('SECRET_KEY', default='django-insecure-2!q%^8-0tdl57)##4u_dq!%g8bx#n590f=m(#_%2=%@463+1om')

# Force DEBUG = True for development, ignoring any config values
DEBUG = True
print(f"[DEV SETTINGS] DEBUG set to: {DEBUG}")  # Debug output

# Set ALLOWED_HOSTS explicitly for development
ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '*']
print(f"[DEV SETTINGS] ALLOWED_HOSTS set to: {ALLOWED_HOSTS}")  # Debug output

# Force DEBUG to True and ensure it overrides any other setting
DEBUG = True
print(f"[DEV SETTINGS] DEBUG forcibly set to: {DEBUG}")  # Debug output

# Database - SQLite for development
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
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

# Stripe Payment Configuration - Test environment
PAYMENT_ENV = config('PAYMENT_ENV', default='test')
STRIPE_PUBLISHABLE_KEY_TEST = config('STRIPE_PUBLISHABLE_KEY_TEST', default='')
STRIPE_SECRET_KEY_TEST = config('STRIPE_SECRET_KEY_TEST', default='')
STRIPE_WEBHOOK_SECRET_TEST = config('STRIPE_WEBHOOK_SECRET_TEST', default='')

# Use test keys for development
STRIPE_PUBLISHABLE_KEY = STRIPE_PUBLISHABLE_KEY_TEST
STRIPE_SECRET_KEY = STRIPE_SECRET_KEY_TEST
STRIPE_WEBHOOK_SECRET = STRIPE_WEBHOOK_SECRET_TEST

# CSRF Protection for development - Relaxed settings
CSRF_TRUSTED_ORIGINS = config('CSRF_TRUSTED_ORIGINS', default='http://127.0.0.1:8000,http://localhost:8000', cast=Csv())

# Override strict CSRF settings for development
CSRF_USE_SESSIONS = False  # Use cookies instead of sessions for CSRF
CSRF_COOKIE_HTTPONLY = False  # Allow JavaScript access to CSRF cookie
CSRF_COOKIE_SAMESITE = 'Lax'  # More permissive same-site policy
CSRF_COOKIE_SECURE = False  # Allow CSRF cookie over HTTP in development
CSRF_COOKIE_NAME = 'csrftoken'  # Standard CSRF cookie name
CSRF_HEADER_NAME = 'HTTP_X_CSRFTOKEN'  # Standard CSRF header name

# Session settings for development
SESSION_COOKIE_SECURE = False  # Allow session cookie over HTTP in development
SESSION_COOKIE_SAMESITE = 'Lax'  # More permissive same-site policy for sessions

# Development logging configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'file': {
            'level': 'DEBUG',
            'class': 'logging.FileHandler',
            'filename': 'debug.log',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': True,
        },
        'homepage': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': True,
        },
    },
}

# Development API configuration
API_BASE_URL = 'http://127.0.0.1:8000/api/'

# Debug toolbar for development (optional)
if DEBUG:
    try:
        import debug_toolbar
        INSTALLED_APPS += ['debug_toolbar']
        MIDDLEWARE += ['debug_toolbar.middleware.DebugToolbarMiddleware']
        INTERNAL_IPS = ['127.0.0.1']
    except ImportError:
        pass

# Development-specific DRF settings
REST_FRAMEWORK.update({
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
    'PAGE_SIZE': 20,
})

# Relaxed CSP for development
CSP_SCRIPT_SRC += ("'unsafe-eval'",)  # Allow eval for development tools
