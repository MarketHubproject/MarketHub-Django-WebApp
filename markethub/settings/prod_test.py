"""
Production-like settings for local testing.
Uses SQLite and simplified configuration for easy testing.
"""
from .base import *
from decouple import config, Csv
import os

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config('SECRET_KEY', default='django-test-prod-key-12345')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config('DEBUG', default=False, cast=bool)

ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1', cast=Csv())

# Database - Use SQLite for local testing
database_engine = config('DATABASE_ENGINE', default='django.db.backends.sqlite3')
if database_engine == 'django.db.backends.sqlite3':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / config('DATABASE_NAME', default='db_prod_test.sqlite3'),
        }
    }
else:
    # PostgreSQL configuration for real production
    DATABASES = {
        'default': {
            'ENGINE': config('DATABASE_ENGINE', default='django.db.backends.postgresql'),
            'NAME': config('DATABASE_NAME', default='markethub_prod'),
            'USER': config('DATABASE_USER', default='markethub_user'),
            'PASSWORD': config('DATABASE_PASSWORD', default='secure_password'),
            'HOST': config('DATABASE_HOST', default='localhost'),
            'PORT': config('DATABASE_PORT', default=5432, cast=int),
        }
    }

# Cache Configuration - Use local memory if Redis not available
redis_url = config('REDIS_URL', default='')
if redis_url:
    try:
        CACHES = {
            'default': {
                'BACKEND': 'django_redis.cache.RedisCache',
                'LOCATION': redis_url,
                'OPTIONS': {
                    'CLIENT_CLASS': 'django_redis.client.DefaultClient',
                }
            }
        }
        SESSION_ENGINE = 'django.contrib.sessions.backends.cached_db'
    except ImportError:
        # Fallback to local memory cache
        CACHES = {
            'default': {
                'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
                'LOCATION': 'unique-snowflake',
            }
        }
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'unique-snowflake',
        }
    }

# Email Configuration
EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@markethub.com')

# Stripe Payment Configuration
PAYMENT_ENV = config('PAYMENT_ENV', default='test')
STRIPE_PUBLISHABLE_KEY_LIVE = config('STRIPE_PUBLISHABLE_KEY_LIVE', default='pk_test_placeholder')
STRIPE_SECRET_KEY_LIVE = config('STRIPE_SECRET_KEY_LIVE', default='sk_test_placeholder')
STRIPE_WEBHOOK_SECRET_LIVE = config('STRIPE_WEBHOOK_SECRET_LIVE', default='whsec_placeholder')

# Use live keys for production
STRIPE_PUBLISHABLE_KEY = STRIPE_PUBLISHABLE_KEY_LIVE
STRIPE_SECRET_KEY = STRIPE_SECRET_KEY_LIVE
STRIPE_WEBHOOK_SECRET = STRIPE_WEBHOOK_SECRET_LIVE

# Security Settings - Relaxed for local testing, but production-like
SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', default=False, cast=bool)
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# HSTS (HTTP Strict Transport Security) - Disabled for local testing
SECURE_HSTS_SECONDS = config('SECURE_HSTS_SECONDS', default=0, cast=int)
SECURE_HSTS_INCLUDE_SUBDOMAINS = config('SECURE_HSTS_INCLUDE_SUBDOMAINS', default=False, cast=bool)
SECURE_HSTS_PRELOAD = config('SECURE_HSTS_PRELOAD', default=False, cast=bool)

# Secure cookies - Relaxed for local testing
SESSION_COOKIE_SECURE = config('SESSION_COOKIE_SECURE', default=False, cast=bool)
CSRF_COOKIE_SECURE = config('CSRF_COOKIE_SECURE', default=False, cast=bool)

# Additional security headers
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True

# CSRF Protection
CSRF_TRUSTED_ORIGINS = config('CSRF_TRUSTED_ORIGINS', default='http://127.0.0.1:8000,http://localhost:8000', cast=Csv())

# Static file serving with Whitenoise and compression
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# API configuration
API_BASE_URL = config('API_BASE_URL', default='http://127.0.0.1:8000/api/')

# Simplified logging configuration
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
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'level': 'INFO',
        'handlers': ['console'],
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['console'],
            'level': 'ERROR',
            'propagate': False,
        },
        'homepage': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# Production DRF settings
if 'REST_FRAMEWORK' in locals():
    REST_FRAMEWORK.update({
        'DEFAULT_PERMISSION_CLASSES': [
            'rest_framework.permissions.IsAuthenticatedOrReadOnly',  # Relaxed for testing
        ],
        'DEFAULT_THROTTLE_CLASSES': [
            'rest_framework.throttling.AnonRateThrottle',
            'rest_framework.throttling.UserRateThrottle'
        ],
        'DEFAULT_THROTTLE_RATES': {
            'anon': config('API_THROTTLE_ANON', default='100/hour'),
            'user': config('API_THROTTLE_USER', default='1000/hour'),
        },
        'DEFAULT_RENDERER_CLASSES': [
            'rest_framework.renderers.JSONRenderer',
            'rest_framework.renderers.BrowsableAPIRenderer',  # Keep for testing
        ],
    })

print(f"[PROD-TEST SETTINGS] DEBUG: {DEBUG}")
print(f"[PROD-TEST SETTINGS] Database: {DATABASES['default']['ENGINE']}")
print(f"[PROD-TEST SETTINGS] Cache: {CACHES['default']['BACKEND']}")
print(f"[PROD-TEST SETTINGS] Email: {EMAIL_BACKEND}")