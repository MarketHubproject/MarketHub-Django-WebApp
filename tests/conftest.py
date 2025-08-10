"""
Pytest configuration file for MarketHub Django testing.

This file contains shared fixtures and configuration for all tests.
"""
import os
import django
from django.conf import settings
from django.test import TestCase
from django.contrib.auth.models import User
import pytest
from rest_framework.test import APIClient
from decimal import Decimal
import factory
from factory import fuzzy
from faker import Faker

# Configure Django settings for testing
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'markethub.settings.dev')
django.setup()

fake = Faker()


@pytest.fixture(scope='session')
def django_db_setup():
    """Custom database setup for testing."""
    settings.DATABASES['default'] = {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }


@pytest.fixture
def api_client():
    """Provide an API client for testing."""
    return APIClient()


@pytest.fixture
def authenticated_user(db):
    """Create and return an authenticated user."""
    user = User.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123',
        first_name='Test',
        last_name='User'
    )
    return user


@pytest.fixture
def authenticated_api_client(api_client, authenticated_user):
    """Provide an authenticated API client."""
    api_client.force_authenticate(user=authenticated_user)
    return api_client


@pytest.fixture
def admin_user(db):
    """Create and return an admin user."""
    return User.objects.create_superuser(
        username='admin',
        email='admin@example.com',
        password='adminpass123'
    )


@pytest.fixture
def multiple_users(db):
    """Create multiple test users."""
    users = []
    for i in range(5):
        user = User.objects.create_user(
            username=f'user{i}',
            email=f'user{i}@example.com',
            password=f'pass{i}123'
        )
        users.append(user)
    return users


@pytest.fixture
def sample_product_data():
    """Provide sample product data."""
    return {
        'name': 'Test Product',
        'description': 'Test product description',
        'price': Decimal('99.99'),
        'category': 'electronics',
        'condition': 'excellent',
        'location': 'cape_town_central'
    }


@pytest.fixture
def sample_order_data():
    """Provide sample order data."""
    return {
        'first_name': 'John',
        'last_name': 'Doe',
        'email': 'john@example.com',
        'phone': '0123456789',
        'address_line_1': '123 Test Street',
        'city': 'Cape Town',
        'province': 'Western Cape',
        'postal_code': '8001',
        'subtotal': Decimal('100.00'),
        'shipping_cost': Decimal('50.00'),
        'tax_amount': Decimal('15.00'),
        'total_amount': Decimal('165.00')
    }


@pytest.fixture
def mock_stripe_payment_intent():
    """Mock Stripe PaymentIntent object."""
    return {
        'id': 'pi_test_1234567890',
        'object': 'payment_intent',
        'amount': 10000,  # $100.00 in cents
        'currency': 'zar',
        'status': 'succeeded',
        'client_secret': 'pi_test_1234567890_secret_test',
        'metadata': {},
        'charges': {
            'data': [{
                'id': 'ch_test_1234567890',
                'object': 'charge',
                'amount': 10000,
                'status': 'succeeded',
                'payment_method': 'pm_test_1234567890'
            }]
        }
    }


@pytest.fixture
def mock_stripe_webhook_event():
    """Mock Stripe webhook event."""
    return {
        'id': 'evt_test_webhook',
        'object': 'event',
        'type': 'payment_intent.succeeded',
        'data': {
            'object': {
                'id': 'pi_test_1234567890',
                'object': 'payment_intent',
                'status': 'succeeded',
                'amount': 10000,
                'currency': 'zar'
            }
        },
        'created': 1234567890
    }


@pytest.fixture(autouse=True)
def enable_db_access_for_all_tests(db):
    """
    Automatically enable database access for all tests.
    This is needed for pytest-django to work properly.
    """
    pass


@pytest.fixture
def transactional_db_access(transactional_db):
    """Fixture for tests that need transactional database access."""
    pass


# Performance testing fixtures
@pytest.fixture
def performance_data_setup(db):
    """Set up performance test data."""
    from tests.factories import UserFactory, ProductFactory
    
    # Create users
    users = UserFactory.create_batch(50)
    
    # Create products
    products = []
    for user in users:
        batch = ProductFactory.create_batch(10, seller=user)
        products.extend(batch)
    
    return {
        'users': users,
        'products': products
    }


# Security testing fixtures
@pytest.fixture
def malicious_payloads():
    """Common malicious payloads for security testing."""
    return {
        'xss_payloads': [
            '<script>alert("XSS")</script>',
            '"><script>alert("XSS")</script>',
            '<img src=x onerror=alert("XSS")>',
            'javascript:alert("XSS")',
            '<svg onload=alert("XSS")>',
        ],
        'sql_injection_payloads': [
            "' OR '1'='1",
            "1' OR '1'='1' --",
            "'; DROP TABLE users; --",
            "1' UNION SELECT * FROM users --",
            "' OR 1=1 #",
        ],
        'csrf_payloads': [
            '<form method="POST" action="/admin/"><input type="hidden" name="delete" value="1"></form>',
        ],
        'path_traversal_payloads': [
            '../../../etc/passwd',
            '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
            '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
        ]
    }


@pytest.fixture
def rate_limit_test_setup():
    """Setup for rate limiting tests."""
    from django_axes.models import AccessAttempt
    # Clear any existing access attempts
    AccessAttempt.objects.all().delete()
    return True


# Mock external services
@pytest.fixture
def mock_email_backend(monkeypatch):
    """Mock email backend for testing."""
    from django.core.mail.backends.locmem import EmailBackend
    backend = EmailBackend()
    monkeypatch.setattr('django.core.mail.backends.locmem.EmailBackend', lambda: backend)
    return backend


@pytest.fixture
def mock_redis_cache(monkeypatch):
    """Mock Redis cache for testing."""
    from django.core.cache.backends.locmem import LocMemCache
    cache = LocMemCache('test', {})
    monkeypatch.setattr('django.core.cache.cache', cache)
    return cache
