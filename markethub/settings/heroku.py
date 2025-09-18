"""
Heroku-specific settings for MarketHub Django project.
"""
import os
import dj_database_url
from .base import *
from decouple import config, Csv

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config('SECRET_KEY', default='django-insecure-temp-key-change-me-for-heroku')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config('DEBUG', default=False, cast=bool)

# Heroku provides the PORT env variable
PORT = int(os.environ.get('PORT', 8000))

# Heroku specific allowed hosts configuration
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1', cast=Csv())

# Add Heroku app domain if present
if 'HEROKU_APP_NAME' in os.environ:
    ALLOWED_HOSTS.append(f"{os.environ['HEROKU_APP_NAME']}.herokuapp.com")

# Database configuration using DATABASE_URL (Heroku standard)
default_dburl = 'sqlite:///' + str(BASE_DIR / 'db.sqlite3')
DATABASES = {
    'default': dj_database_url.config(
        default=config('DATABASE_URL', default=default_dburl),
        conn_max_age=600,
        conn_health_checks=True,
    )
}

# Cache Configuration - Use Redis if available, otherwise local memory
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
        # Fallback to database cache
        CACHES = {
            'default': {
                'BACKEND': 'django.core.cache.backends.db.DatabaseCache',
                'LOCATION': 'cache_table',
            }
        }
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.db.DatabaseCache',
            'LOCATION': 'cache_table',
        }
    }

# Email Configuration - Use SendGrid on Heroku
EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = config('EMAIL_HOST', default='smtp.sendgrid.net')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='apikey')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@markethub-app.herokuapp.com')

# Stripe Payment Configuration
PAYMENT_ENV = config('PAYMENT_ENV', default='test')
STRIPE_PUBLISHABLE_KEY_LIVE = config('STRIPE_PUBLISHABLE_KEY_LIVE', default='pk_test_placeholder')
STRIPE_SECRET_KEY_LIVE = config('STRIPE_SECRET_KEY_LIVE', default='sk_test_placeholder')
STRIPE_WEBHOOK_SECRET_LIVE = config('STRIPE_WEBHOOK_SECRET_LIVE', default='whsec_placeholder')

# Use the configured keys
STRIPE_PUBLISHABLE_KEY = STRIPE_PUBLISHABLE_KEY_LIVE
STRIPE_SECRET_KEY = STRIPE_SECRET_KEY_LIVE
STRIPE_WEBHOOK_SECRET = STRIPE_WEBHOOK_SECRET_LIVE

# Security Settings for Heroku
SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', default=True, cast=bool)
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# HSTS (HTTP Strict Transport Security)
SECURE_HSTS_SECONDS = config('SECURE_HSTS_SECONDS', default=31536000, cast=int)  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = config('SECURE_HSTS_INCLUDE_SUBDOMAINS', default=True, cast=bool)
SECURE_HSTS_PRELOAD = config('SECURE_HSTS_PRELOAD', default=True, cast=bool)

# Secure cookies
SESSION_COOKIE_SECURE = config('SESSION_COOKIE_SECURE', default=True, cast=bool)
CSRF_COOKIE_SECURE = config('CSRF_COOKIE_SECURE', default=True, cast=bool)

# Additional security headers
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True

# CSRF Protection
CSRF_TRUSTED_ORIGINS = config('CSRF_TRUSTED_ORIGINS', default='', cast=Csv())
if 'HEROKU_APP_NAME' in os.environ:
    heroku_domain = f"https://{os.environ['HEROKU_APP_NAME']}.herokuapp.com"
    if heroku_domain not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS.append(heroku_domain)

# Static files configuration for Heroku with Whitenoise
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# API configuration
if 'HEROKU_APP_NAME' in os.environ:
    API_BASE_URL = f"https://{os.environ['HEROKU_APP_NAME']}.herokuapp.com/api/"
else:
    API_BASE_URL = config('API_BASE_URL', default='https://localhost:8000/api/')

# Heroku logging configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': config('DJANGO_LOG_LEVEL', default='INFO'),
        },
        'django.request': {
            'handlers': ['console'],
            'level': 'ERROR',
            'propagate': False,
        },
        'homepage': {
            'handlers': ['console'],
            'level': config('APP_LOG_LEVEL', default='INFO'),
        },
    },
}

# Production DRF settings
if 'REST_FRAMEWORK' in locals():
    REST_FRAMEWORK.update({
        'DEFAULT_PERMISSION_CLASSES': [
            'rest_framework.permissions.IsAuthenticatedOrReadOnly',
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
        ],
    })

# Heroku-specific middleware configuration - Whitenoise already included in base

print(f"[HEROKU SETTINGS] DEBUG: {DEBUG}")
print(f"[HEROKU SETTINGS] Database: {DATABASES['default']['ENGINE']}")
print(f"[HEROKU SETTINGS] Allowed Hosts: {ALLOWED_HOSTS}")
if 'HEROKU_APP_NAME' in os.environ:
    print(f"[HEROKU SETTINGS] App Name: {os.environ['HEROKU_APP_NAME']}")
print(f"[HEROKU SETTINGS] Static Files: Whitenoise enabled")