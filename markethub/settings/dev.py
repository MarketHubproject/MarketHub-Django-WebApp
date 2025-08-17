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

# Override strict CSRF settings for development - Use most permissive settings
CSRF_USE_SESSIONS = False  # Use cookies instead of sessions for CSRF
CSRF_COOKIE_HTTPONLY = False  # Allow JavaScript access to CSRF cookie
CSRF_COOKIE_SAMESITE = 'Lax'  # More permissive same-site policy
CSRF_COOKIE_SECURE = False  # Allow CSRF cookie over HTTP in development
CSRF_COOKIE_NAME = 'csrftoken'  # Standard CSRF cookie name
CSRF_HEADER_NAME = 'HTTP_X_CSRFTOKEN'  # Standard CSRF header name

# Override base.py CSRF settings for development
CSRF_COOKIE_HTTPONLY = False  # Override base.py setting
CSRF_COOKIE_SAMESITE = 'Lax'  # Override base.py setting

# CSRF Debug information
print(f"[DEV SETTINGS] CSRF_USE_SESSIONS: {False}")
print(f"[DEV SETTINGS] CSRF_COOKIE_HTTPONLY: {False}")
print(f"[DEV SETTINGS] CSRF_COOKIE_SAMESITE: {'Lax'}")
print(f"[DEV SETTINGS] CSRF_COOKIE_SECURE: {False}")

# Additional CSRF debugging settings
CSRF_FAILURE_VIEW = 'django.views.csrf.csrf_failure'
CSRF_COOKIE_AGE = None  # Use session expiry
CSRF_TOKEN_DEFAULT_VERIFY = True

# More permissive CSRF settings for development
import os
if os.environ.get('DJANGO_ENVIRONMENT', '').lower() == 'development':
    # Ensure CSRF tokens work properly in development
    CSRF_COOKIE_DOMAIN = None
    CSRF_TRUSTED_ORIGINS.extend(['http://127.0.0.1:8000', 'http://localhost:8000'])

# Session settings for development
SESSION_COOKIE_SECURE = False  # Allow session cookie over HTTP in development
SESSION_COOKIE_SAMESITE = 'Lax'  # More permissive same-site policy for sessions

# Enhanced Development logging configuration with security tracking
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
        'security': {
            'format': '[SECURITY] {asctime} {levelname} {module}: {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'debug_file': {
            'level': 'DEBUG',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': 'logs/debug.log',
            'maxBytes': 1024*1024*10,  # 10MB
            'backupCount': 3,
            'formatter': 'verbose',
        },
        'security_file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': 'logs/security.log',
            'maxBytes': 1024*1024*5,  # 5MB
            'backupCount': 5,
            'formatter': 'security',
        },
        'auth_file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': 'logs/auth.log',
            'maxBytes': 1024*1024*5,  # 5MB
            'backupCount': 5,
            'formatter': 'security',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'debug_file'],
            'level': 'INFO',
            'propagate': True,
        },
        'django.security': {
            'handlers': ['console', 'security_file'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.contrib.auth': {
            'handlers': ['console', 'auth_file'],
            'level': 'INFO',
            'propagate': False,
        },
        'axes': {
            'handlers': ['console', 'auth_file'],
            'level': 'INFO',
            'propagate': False,
        },
        'homepage': {
            'handlers': ['console', 'debug_file'],
            'level': 'DEBUG',
            'propagate': True,
        },
        'markethub.security': {
            'handlers': ['console', 'security_file'],
            'level': 'INFO',
            'propagate': False,
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

# Development-specific DRF settings with rate limiting
REST_FRAMEWORK.update({
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',  # Anonymous users: 100 requests per hour
        'user': '1000/hour',  # Authenticated users: 1000 requests per hour
        'login': '20/hour',   # Login attempts: 20 per hour
    },
    'PAGE_SIZE': 20,
})

print(f"[DEV SETTINGS] API rate limiting enabled - Anon: 100/hour, User: 1000/hour")

# Relaxed CSP for development
CSP_SCRIPT_SRC += ("'unsafe-eval'",)  # Allow eval for development tools

# Django Axes configuration for development
# More lenient settings for development environment
AXES_FAILURE_LIMIT = 10  # Allow more attempts in development
AXES_COOLOFF_TIME = 0.1  # Shorter cooloff time (6 minutes)
AXES_RESET_ON_SUCCESS = True
AXES_ENABLE_ADMIN = True
AXES_VERBOSE = False  # Reduce verbosity in development
AXES_LOCK_OUT_AT_FAILURE = True
AXES_LOCKOUT_TEMPLATE = None  # Use default lockout handling
AXES_LOCKOUT_URL = None  # No custom lockout URL

# Use database backend for axes in development (more reliable)
AXES_HANDLER = 'axes.handlers.database.AxesDatabaseHandler'

# Configure authentication backends for Axes
# In testing mode, don't use AxesBackend to avoid request parameter issues
import sys
if 'test' in sys.argv:
    # For testing, use only Django's default backend
    AUTHENTICATION_BACKENDS = [
        'django.contrib.auth.backends.ModelBackend',
    ]
else:
    # For normal operation, use Axes backend
    AUTHENTICATION_BACKENDS = [
        'axes.backends.AxesBackend',  # AxesBackend should come first
        'django.contrib.auth.backends.ModelBackend',  # Django's default backend
    ]

# Enable Axes middleware in development but make it more permissive
if 'axes.middleware.AxesMiddleware' not in MIDDLEWARE:
    # Insert after AuthenticationMiddleware
    auth_index = MIDDLEWARE.index('django.contrib.auth.middleware.AuthenticationMiddleware')
    MIDDLEWARE.insert(auth_index + 1, 'axes.middleware.AxesMiddleware')

print(f"[DEV SETTINGS] Django Axes enabled with lenient settings")
print(f"[DEV SETTINGS] Axes failure limit: {AXES_FAILURE_LIMIT}")
print(f"[DEV SETTINGS] Axes cooloff time: {AXES_COOLOFF_TIME} hours")
