"""
Django settings for MarketHub testing environment.

This settings file is optimized for running tests with faster database operations,
disabled migrations, and test-specific configurations.
"""

from .settings import *
import tempfile
import os

# Test database configuration
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',  # Use in-memory database for faster tests
        'TEST': {
            'NAME': ':memory:',
        },
    }
}

# Disable migrations during testing for faster test runs
class DisableMigrations:
    def __contains__(self, item):
        return True
    
    def __getitem__(self, item):
        return None

MIGRATION_MODULES = DisableMigrations()

# Use faster password hasher for testing
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

# Email backend for testing
EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

# Media files for testing
MEDIA_ROOT = tempfile.mkdtemp()

# Static files for testing
STATIC_ROOT = tempfile.mkdtemp()

# Disable logging during tests
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'null': {
            'class': 'logging.NullHandler',
        },
    },
    'root': {
        'handlers': ['null'],
        'level': 'DEBUG',
    },
    'loggers': {
        'django': {
            'handlers': ['null'],
            'level': 'INFO',
            'propagate': False,
        },
        'markethub': {
            'handlers': ['null'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}

# Cache configuration for testing
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
    }
}

# Disable CSRF for API testing
REST_FRAMEWORK = REST_FRAMEWORK.copy()
REST_FRAMEWORK['DEFAULT_AUTHENTICATION_CLASSES'] = [
    'rest_framework.authentication.TokenAuthentication',
    'rest_framework.authentication.SessionAuthentication',
]

# Test-specific security settings
SECRET_KEY = 'test-secret-key-not-for-production'
DEBUG = True
ALLOWED_HOSTS = ['testserver', 'localhost', '127.0.0.1']

# Disable HTTPS redirect in tests
SECURE_SSL_REDIRECT = False

# Stripe test settings
STRIPE_PUBLISHABLE_KEY = 'pk_test_123456789'  # Test key
STRIPE_SECRET_KEY = 'sk_test_123456789'  # Test key
STRIPE_WEBHOOK_SECRET = 'whsec_test_123456789'  # Test webhook secret

# Celery configuration for testing (if used)
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# Django REST Framework testing configuration
REST_FRAMEWORK['TEST_REQUEST_DEFAULT_FORMAT'] = 'json'

# File upload settings for testing
FILE_UPLOAD_MAX_MEMORY_SIZE = 1024 * 1024  # 1MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 1024 * 1024  # 1MB

# Time zone for testing
USE_TZ = True
TIME_ZONE = 'UTC'

# Language settings
USE_I18N = True
USE_L10N = True

# Django Axes test settings (if enabled)
if 'axes' in INSTALLED_APPS:
    AXES_ENABLED = False  # Disable during testing

# Search backend for testing (if using Elasticsearch)
if hasattr(globals(), 'ELASTICSEARCH_DSL'):
    ELASTICSEARCH_DSL = {
        'default': {
            'hosts': 'localhost:9200'
        },
    }
    # Use synchronous indexing during tests
    ELASTICSEARCH_DSL_AUTO_REFRESH = True

# Test runner configuration
TEST_RUNNER = 'django.test.runner.DiscoverRunner'

# Coverage settings (if using coverage)
COVERAGE_OMIT = [
    '*/tests/*',
    '*/venv/*',
    '*/virtualenv/*',
    'manage.py',
    '*/migrations/*',
    '*/settings/*',
    '*/node_modules/*',
]

# Disable unnecessary middleware during testing
MIDDLEWARE = [
    middleware for middleware in MIDDLEWARE 
    if not any(skip in middleware for skip in [
        'whitenoise.middleware.WhiteNoiseMiddleware',
        'django.middleware.security.SecurityMiddleware',
    ])
]

# Add test-specific middleware if needed
MIDDLEWARE.insert(0, 'django.middleware.security.SecurityMiddleware')

# Session configuration for testing
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'

# Template configuration for testing
TEMPLATES[0]['OPTIONS']['debug'] = True

# Test-specific installed apps (add any test-only apps here)
TEST_APPS = []

INSTALLED_APPS += TEST_APPS

print("Using test settings - Database: In-Memory SQLite")
