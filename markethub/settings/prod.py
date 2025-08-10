"""
Production settings for MarketHub Django project.
"""
import json
import logging.config
from .base import *
from decouple import config, Csv

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config('SECRET_KEY')  # Required in production

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config('DEBUG', default=False, cast=bool)

ALLOWED_HOSTS = config('ALLOWED_HOSTS', cast=Csv())

# PostgreSQL Database with connection pooling
DATABASES = {
    'default': {
        'ENGINE': 'django_postgrespool2',
        'NAME': config('DATABASE_NAME'),
        'USER': config('DATABASE_USER'),
        'PASSWORD': config('DATABASE_PASSWORD'),
        'HOST': config('DATABASE_HOST'),
        'PORT': config('DATABASE_PORT', default=5432, cast=int),
        'OPTIONS': {
            'MAX_CONNS': config('DATABASE_MAX_CONNS', default=20, cast=int),
            'MIN_CONNS': config('DATABASE_MIN_CONNS', default=5, cast=int),
        }
    }
}

# Redis Cache Configuration
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': config('REDIS_URL', default='redis://127.0.0.1:6379/1'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

# Session engine - use cached DB for performance
SESSION_ENGINE = 'django.contrib.sessions.backends.cached_db'

# Email Configuration - Production email backend
EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = config('EMAIL_HOST')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@markethub.com')

# Stripe Payment Configuration - Production
PAYMENT_ENV = config('PAYMENT_ENV', default='live')
STRIPE_PUBLISHABLE_KEY_LIVE = config('STRIPE_PUBLISHABLE_KEY_LIVE')
STRIPE_SECRET_KEY_LIVE = config('STRIPE_SECRET_KEY_LIVE')
STRIPE_WEBHOOK_SECRET_LIVE = config('STRIPE_WEBHOOK_SECRET_LIVE')

# Use live keys for production
STRIPE_PUBLISHABLE_KEY = STRIPE_PUBLISHABLE_KEY_LIVE
STRIPE_SECRET_KEY = STRIPE_SECRET_KEY_LIVE
STRIPE_WEBHOOK_SECRET = STRIPE_WEBHOOK_SECRET_LIVE

# Security Settings - Force SSL/HTTPS
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# HSTS (HTTP Strict Transport Security)
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Secure cookies
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# Additional security headers
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True

# CSRF Protection
CSRF_TRUSTED_ORIGINS = config('CSRF_TRUSTED_ORIGINS', cast=Csv())

# Prevent caching of authenticated pages
CACHE_MIDDLEWARE_SECONDS = 0

# Static file serving with Whitenoise and compression
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Optional CDN configuration for static files
STATIC_HOST = config('STATIC_HOST', default='')
if STATIC_HOST:
    STATIC_URL = f'{STATIC_HOST}/static/'

# Media file serving (consider using cloud storage like AWS S3)
MEDIA_HOST = config('MEDIA_HOST', default='')
if MEDIA_HOST:
    MEDIA_URL = f'{MEDIA_HOST}/media/'

# Production API configuration
API_BASE_URL = config('API_BASE_URL')

# Sentry Configuration for Error Tracking
SENTRY_DSN = config('SENTRY_DSN', default='')
if SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration
    from sentry_sdk.integrations.logging import LoggingIntegration
    
    sentry_logging = LoggingIntegration(
        level=logging.INFO,        # Capture info and above as breadcrumbs
        event_level=logging.ERROR  # Send errors as events
    )
    
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[
            DjangoIntegration(
                transaction_style='url',
                middleware_spans=True,
                signals_spans=True,
            ),
            sentry_logging,
        ],
        traces_sample_rate=config('SENTRY_TRACES_SAMPLE_RATE', default=0.1, cast=float),
        send_default_pii=True,
        environment=config('ENVIRONMENT', default='production'),
    )

# Production Logging Configuration with JSON output
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'json': {
            '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
            'format': '%(asctime)s %(name)s %(levelname)s %(message)s %(pathname)s %(lineno)d'
        },
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'json',
        },
        'file': {
            'level': 'WARNING',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': '/var/log/markethub/markethub.log',
            'maxBytes': 1024*1024*10,  # 10 MB
            'backupCount': 5,
            'formatter': 'json',
        },
        'error_file': {
            'level': 'ERROR',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': '/var/log/markethub/markethub-error.log',
            'maxBytes': 1024*1024*10,  # 10 MB
            'backupCount': 5,
            'formatter': 'json',
        },
    },
    'root': {
        'level': 'INFO',
        'handlers': ['console', 'file'],
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['console', 'error_file'],
            'level': 'ERROR',
            'propagate': False,
        },
        'homepage': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'sentry_sdk': {
            'level': 'ERROR',
            'handlers': ['console'],
            'propagate': False,
        },
    },
}

# Production DRF settings
REST_FRAMEWORK.update({
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
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

# Stricter CSP for production
CSP_SCRIPT_SRC = (
    "'self'",
    "https://js.stripe.com",
    "https://cdn.jsdelivr.net",
    "https://cdnjs.cloudflare.com",
)

# Remove unsafe-inline and unsafe-eval for production
CSP_STYLE_SRC = (
    "'self'",
    "https://cdn.jsdelivr.net",
    "https://cdnjs.cloudflare.com",
    "https://fonts.googleapis.com",
)

# Add production domain to CSP
PRODUCTION_DOMAIN = config('PRODUCTION_DOMAIN', default='')
if PRODUCTION_DOMAIN:
    CSP_CONNECT_SRC += (f'https://{PRODUCTION_DOMAIN}',)

# CloudFront/Cloudflare CDN Configuration (optional)
CDN_DOMAIN = config('CDN_DOMAIN', default='')
if CDN_DOMAIN:
    CSP_IMG_SRC += (f'https://{CDN_DOMAIN}',)
    CSP_FONT_SRC += (f'https://{CDN_DOMAIN}',)
    CSP_STYLE_SRC += (f'https://{CDN_DOMAIN}',)

# Health check configuration
HEALTH_CHECK = {
    'DISK_USAGE_MAX': 90,  # percent
    'MEMORY_MIN': 100,    # in MB
}

# Monitoring and metrics
if config('ENABLE_METRICS', default=False, cast=bool):
    INSTALLED_APPS += ['django_prometheus']
    MIDDLEWARE = ['django_prometheus.middleware.PrometheusBeforeMiddleware'] + MIDDLEWARE
    MIDDLEWARE += ['django_prometheus.middleware.PrometheusAfterMiddleware']
