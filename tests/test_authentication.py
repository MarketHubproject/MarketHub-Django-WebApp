"""
Authentication and authorization tests for MarketHub.

This module contains comprehensive tests for:
- Sign-up/login/token creation/expiry
- Privilege escalation attempts
- Rate limiting via django-axes
- Session management
- Password policies
"""
import pytest
from unittest.mock import patch
from datetime import datetime, timedelta
from django.test import TestCase, TransactionTestCase
from django.urls import reverse
from django.contrib.auth.models import User
from django.contrib.auth import get_user_model
from django.contrib.sessions.models import Session
from django.conf import settings
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token
# from django_axes.models import AccessAttempt
from django_axes.helpers import get_client_ip_address

from tests.factories import UserFactory, AdminUserFactory


@pytest.mark.auth
@pytest.mark.unit
class TestUserRegistration:
    """Tests for user registration functionality."""
    
    def test_successful_user_registration(self, api_client):
        """Test successful user registration with valid data."""
        registration_data = {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!',
            'first_name': 'New',
            'last_name': 'User',
            'terms_accepted': True
        }
        
        response = api_client.post(
            reverse('user_register'),
            data=registration_data
        )
        
        assert response.status_code == 201
        assert User.objects.filter(username='newuser').exists()
        
        user = User.objects.get(username='newuser')
        assert user.email == 'newuser@example.com'
        assert user.first_name == 'New'
        assert user.last_name == 'User'
        assert user.is_active is True
    
    def test_registration_with_duplicate_username(self, api_client, authenticated_user):
        """Test registration fails with duplicate username."""
        registration_data = {
            'username': authenticated_user.username,
            'email': 'different@example.com',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!',
            'terms_accepted': True
        }
        
        response = api_client.post(
            reverse('user_register'),
            data=registration_data
        )
        
        assert response.status_code == 400
        assert 'username' in response.data
    
    def test_registration_with_duplicate_email(self, api_client, authenticated_user):
        """Test registration fails with duplicate email."""
        registration_data = {
            'username': 'differentuser',
            'email': authenticated_user.email,
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!',
            'terms_accepted': True
        }
        
        response = api_client.post(
            reverse('user_register'),
            data=registration_data
        )
        
        assert response.status_code == 400
        assert 'email' in response.data
    
    def test_registration_password_mismatch(self, api_client):
        """Test registration fails with password mismatch."""
        registration_data = {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'SecurePass123!',
            'password_confirm': 'DifferentPass123!',
            'terms_accepted': True
        }
        
        response = api_client.post(
            reverse('user_register'),
            data=registration_data
        )
        
        assert response.status_code == 400
        assert 'password' in response.data
    
    def test_registration_weak_password(self, api_client):
        """Test registration fails with weak password."""
        registration_data = {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': '123',
            'password_confirm': '123',
            'terms_accepted': True
        }
        
        response = api_client.post(
            reverse('user_register'),
            data=registration_data
        )
        
        assert response.status_code == 400
        assert 'password' in response.data
    
    def test_registration_without_terms(self, api_client):
        """Test registration fails without accepting terms."""
        registration_data = {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!',
            'terms_accepted': False
        }
        
        response = api_client.post(
            reverse('user_register'),
            data=registration_data
        )
        
        assert response.status_code == 400
        assert 'terms_accepted' in response.data


@pytest.mark.auth
@pytest.mark.unit
class TestUserLogin:
    """Tests for user login functionality."""
    
    def test_successful_login(self, api_client, authenticated_user):
        """Test successful login with valid credentials."""
        login_data = {
            'username': authenticated_user.username,
            'password': 'testpass123'
        }
        
        response = api_client.post(
            reverse('user_login'),
            data=login_data
        )
        
        assert response.status_code == 200
        assert 'token' in response.data or 'access_token' in response.data
    
    def test_login_with_email(self, api_client, authenticated_user):
        """Test login using email instead of username."""
        login_data = {
            'email': authenticated_user.email,
            'password': 'testpass123'
        }
        
        response = api_client.post(
            reverse('user_login'),
            data=login_data
        )
        
        assert response.status_code == 200
    
    def test_login_invalid_credentials(self, api_client, authenticated_user):
        """Test login fails with invalid credentials."""
        login_data = {
            'username': authenticated_user.username,
            'password': 'wrongpassword'
        }
        
        response = api_client.post(
            reverse('user_login'),
            data=login_data
        )
        
        assert response.status_code == 401
        assert 'credentials' in str(response.data).lower()
    
    def test_login_inactive_user(self, api_client):
        """Test login fails for inactive user."""
        inactive_user = UserFactory(is_active=False)
        
        login_data = {
            'username': inactive_user.username,
            'password': 'testpass123'
        }
        
        response = api_client.post(
            reverse('user_login'),
            data=login_data
        )
        
        assert response.status_code == 401
    
    def test_login_nonexistent_user(self, api_client):
        """Test login fails for non-existent user."""
        login_data = {
            'username': 'nonexistent',
            'password': 'anypassword'
        }
        
        response = api_client.post(
            reverse('user_login'),
            data=login_data
        )
        
        assert response.status_code == 401


@pytest.mark.auth
@pytest.mark.unit
class TestTokenManagement:
    """Tests for authentication token management."""
    
    def test_token_creation_on_login(self, api_client, authenticated_user):
        """Test that token is created on successful login."""
        login_data = {
            'username': authenticated_user.username,
            'password': 'testpass123'
        }
        
        response = api_client.post(
            reverse('user_login'),
            data=login_data
        )
        
        assert response.status_code == 200
        
        # Check if token exists
        token_exists = Token.objects.filter(user=authenticated_user).exists()
        assert token_exists
    
    def test_token_authentication(self, api_client, authenticated_user):
        """Test API access with valid token."""
        token, created = Token.objects.get_or_create(user=authenticated_user)
        
        # Set token in header
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        
        response = api_client.get(reverse('user_profile'))
        assert response.status_code == 200
    
    def test_invalid_token_authentication(self, api_client):
        """Test API access with invalid token."""
        api_client.credentials(HTTP_AUTHORIZATION='Token invalid_token_12345')
        
        response = api_client.get(reverse('user_profile'))
        assert response.status_code == 401
    
    def test_token_refresh(self, authenticated_api_client, authenticated_user):
        """Test token refresh functionality."""
        old_token = Token.objects.get(user=authenticated_user)
        old_key = old_token.key
        
        response = authenticated_api_client.post(reverse('token_refresh'))
        assert response.status_code == 200
        
        # Verify new token is different
        new_token = Token.objects.get(user=authenticated_user)
        assert new_token.key != old_key
    
    def test_token_expiry(self, api_client, authenticated_user):
        """Test token expiry handling."""
        token = Token.objects.create(user=authenticated_user)
        
        # Mock expired token
        with patch('rest_framework.authtoken.models.Token.created',
                  timezone.now() - timedelta(days=30)):
            
            api_client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
            response = api_client.get(reverse('user_profile'))
            
            # Should require re-authentication for expired token
            assert response.status_code in [401, 403]
    
    def test_logout_token_deletion(self, authenticated_api_client, authenticated_user):
        """Test that token is deleted on logout."""
        token = Token.objects.get(user=authenticated_user)
        
        response = authenticated_api_client.post(reverse('user_logout'))
        assert response.status_code == 200
        
        # Verify token is deleted
        assert not Token.objects.filter(key=token.key).exists()


@pytest.mark.auth
@pytest.mark.integration
class TestPrivilegeEscalation:
    """Tests for preventing privilege escalation attacks."""
    
    def test_regular_user_cannot_access_admin(self, authenticated_api_client):
        """Test that regular users cannot access admin endpoints."""
        response = authenticated_api_client.get('/admin/')
        assert response.status_code in [401, 403, 302]
    
    def test_regular_user_cannot_modify_other_users(self, authenticated_api_client, authenticated_user):
        """Test that users cannot modify other user accounts."""
        other_user = UserFactory()
        
        update_data = {
            'first_name': 'Hacked',
            'is_staff': True,
            'is_superuser': True
        }
        
        response = authenticated_api_client.patch(
            reverse('user_detail', kwargs={'pk': other_user.id}),
            data=update_data
        )
        
        assert response.status_code in [403, 404]
        
        # Verify other user wasn't modified
        other_user.refresh_from_db()
        assert other_user.first_name != 'Hacked'
        assert other_user.is_staff is False
        assert other_user.is_superuser is False
    
    def test_user_cannot_escalate_own_privileges(self, authenticated_api_client, authenticated_user):
        """Test that users cannot escalate their own privileges."""
        update_data = {
            'is_staff': True,
            'is_superuser': True
        }
        
        response = authenticated_api_client.patch(
            reverse('user_profile'),
            data=update_data
        )
        
        # Request might succeed but sensitive fields should be ignored
        authenticated_user.refresh_from_db()
        assert authenticated_user.is_staff is False
        assert authenticated_user.is_superuser is False
    
    def test_staff_user_limited_admin_access(self, api_client):
        """Test that staff users have limited admin access."""
        staff_user = UserFactory(is_staff=True, is_superuser=False)
        
        api_client.force_authenticate(user=staff_user)
        
        # Staff can access admin but with limited permissions
        response = api_client.get('/admin/')
        assert response.status_code in [200, 302]
        
        # But cannot access user management
        response = api_client.get('/admin/auth/user/')
        assert response.status_code in [403, 302]
    
    def test_permission_required_decorators(self, authenticated_api_client):
        """Test that permission decorators work correctly."""
        # Try to access a staff-only endpoint
        response = authenticated_api_client.get(reverse('admin_dashboard'))
        assert response.status_code == 403
    
    def test_object_level_permissions(self, authenticated_api_client, authenticated_user):
        """Test object-level permissions for user-owned resources."""
        from tests.factories import ProductFactory
        
        # User's own product
        own_product = ProductFactory(seller=authenticated_user)
        
        # Other user's product
        other_product = ProductFactory()
        
        # Can access own product
        response = authenticated_api_client.get(
            reverse('product_detail', kwargs={'pk': own_product.id})
        )
        assert response.status_code == 200
        
        # Can edit own product
        response = authenticated_api_client.patch(
            reverse('product_detail', kwargs={'pk': own_product.id}),
            data={'name': 'Updated Name'}
        )
        assert response.status_code == 200
        
        # Cannot edit other's product
        response = authenticated_api_client.patch(
            reverse('product_detail', kwargs={'pk': other_product.id}),
            data={'name': 'Hacked Name'}
        )
        assert response.status_code in [403, 404]


@pytest.mark.auth
@pytest.mark.integration
class TestRateLimiting:
    """Tests for rate limiting via django-axes."""
    
    def test_failed_login_attempts_tracking(self, api_client, authenticated_user, rate_limit_test_setup):
        """Test that failed login attempts are tracked."""
        login_data = {
            'username': authenticated_user.username,
            'password': 'wrongpassword'
        }
        
        # Make multiple failed attempts
        for _ in range(3):
            response = api_client.post(
                reverse('user_login'),
                data=login_data
            )
            assert response.status_code == 401
        
        # Check that attempts were recorded
        attempts = AccessAttempt.objects.filter(username=authenticated_user.username)
        assert attempts.count() >= 3
    
    def test_account_lockout_after_max_attempts(self, api_client, authenticated_user, rate_limit_test_setup):
        """Test account lockout after maximum failed attempts."""
        login_data = {
            'username': authenticated_user.username,
            'password': 'wrongpassword'
        }
        
        # Make failed attempts up to the limit
        max_attempts = getattr(settings, 'AXES_FAILURE_LIMIT', 5)
        
        for i in range(max_attempts + 1):
            response = api_client.post(
                reverse('user_login'),
                data=login_data
            )
        
        # Account should be locked
        final_response = api_client.post(
            reverse('user_login'),
            data=login_data
        )
        
        assert final_response.status_code == 403
        assert 'locked' in str(final_response.data).lower()
    
    def test_successful_login_resets_attempts(self, api_client, authenticated_user, rate_limit_test_setup):
        """Test that successful login resets failed attempts."""
        wrong_login_data = {
            'username': authenticated_user.username,
            'password': 'wrongpassword'
        }
        
        correct_login_data = {
            'username': authenticated_user.username,
            'password': 'testpass123'
        }
        
        # Make some failed attempts
        for _ in range(2):
            api_client.post(reverse('user_login'), data=wrong_login_data)
        
        # Successful login
        response = api_client.post(reverse('user_login'), data=correct_login_data)
        assert response.status_code == 200
        
        # Attempts should be reset
        attempts = AccessAttempt.objects.filter(
            username=authenticated_user.username,
            failures_since_start__gt=0
        )
        assert attempts.count() == 0
    
    def test_ip_based_rate_limiting(self, api_client, rate_limit_test_setup):
        """Test IP-based rate limiting."""
        login_data = {
            'username': 'nonexistent',
            'password': 'wrongpassword'
        }
        
        max_attempts = getattr(settings, 'AXES_FAILURE_LIMIT', 5)
        
        # Make failed attempts from same IP
        for i in range(max_attempts + 1):
            response = api_client.post(
                reverse('user_login'),
                data=login_data,
                REMOTE_ADDR='192.168.1.100'
            )
        
        # IP should be blocked
        final_response = api_client.post(
            reverse('user_login'),
            data=login_data,
            REMOTE_ADDR='192.168.1.100'
        )
        
        assert final_response.status_code == 403
    
    def test_different_ip_not_affected(self, api_client, rate_limit_test_setup):
        """Test that different IPs are not affected by rate limiting."""
        login_data = {
            'username': 'nonexistent',
            'password': 'wrongpassword'
        }
        
        max_attempts = getattr(settings, 'AXES_FAILURE_LIMIT', 5)
        
        # Block first IP
        for i in range(max_attempts + 1):
            api_client.post(
                reverse('user_login'),
                data=login_data,
                REMOTE_ADDR='192.168.1.100'
            )
        
        # Different IP should still work
        response = api_client.post(
            reverse('user_login'),
            data=login_data,
            REMOTE_ADDR='192.168.1.200'
        )
        
        assert response.status_code == 401  # Wrong credentials, not blocked
    
    def test_cooloff_period(self, api_client, authenticated_user, rate_limit_test_setup):
        """Test account unlock after cooloff period."""
        login_data = {
            'username': authenticated_user.username,
            'password': 'wrongpassword'
        }
        
        max_attempts = getattr(settings, 'AXES_FAILURE_LIMIT', 5)
        
        # Lock account
        for i in range(max_attempts + 1):
            api_client.post(reverse('user_login'), data=login_data)
        
        # Mock cooloff period passed
        with patch('django_axes.handlers.database.timezone.now') as mock_now:
            mock_now.return_value = timezone.now() + timedelta(hours=1)
            
            correct_login_data = {
                'username': authenticated_user.username,
                'password': 'testpass123'
            }
            
            response = api_client.post(
                reverse('user_login'),
                data=correct_login_data
            )
            
            # Should be unlocked and able to login
            assert response.status_code == 200


@pytest.mark.auth
@pytest.mark.unit
class TestSessionManagement:
    """Tests for session management and security."""
    
    def test_session_creation_on_login(self, api_client, authenticated_user):
        """Test that session is created on login."""
        login_data = {
            'username': authenticated_user.username,
            'password': 'testpass123'
        }
        
        response = api_client.post(reverse('user_login'), data=login_data)
        assert response.status_code == 200
        
        # Check session exists
        assert api_client.session.session_key is not None
    
    def test_session_data_security(self, authenticated_api_client, authenticated_user):
        """Test that sensitive data is not stored in session."""
        response = authenticated_api_client.get(reverse('user_profile'))
        assert response.status_code == 200
        
        # Check session doesn't contain sensitive data
        session_data = authenticated_api_client.session._session
        
        # Should not contain password or sensitive info
        session_str = str(session_data).lower()
        assert 'password' not in session_str
        assert 'secret' not in session_str
    
    def test_session_invalidation_on_logout(self, authenticated_api_client):
        """Test that session is invalidated on logout."""
        session_key = authenticated_api_client.session.session_key
        
        response = authenticated_api_client.post(reverse('user_logout'))
        assert response.status_code == 200
        
        # Session should be invalidated
        assert not Session.objects.filter(session_key=session_key).exists()
    
    def test_concurrent_sessions_handling(self, authenticated_user):
        """Test handling of multiple concurrent sessions."""
        client1 = APIClient()
        client2 = APIClient()
        
        login_data = {
            'username': authenticated_user.username,
            'password': 'testpass123'
        }
        
        # Login from two different clients
        response1 = client1.post(reverse('user_login'), data=login_data)
        response2 = client2.post(reverse('user_login'), data=login_data)
        
        assert response1.status_code == 200
        assert response2.status_code == 200
        
        # Both sessions should be valid
        assert client1.get(reverse('user_profile')).status_code == 200
        assert client2.get(reverse('user_profile')).status_code == 200


@pytest.mark.auth
@pytest.mark.unit
class TestPasswordSecurity:
    """Tests for password security policies."""
    
    def test_password_hashing(self, authenticated_user):
        """Test that passwords are properly hashed."""
        # Password should be hashed, not stored in plain text
        assert authenticated_user.password != 'testpass123'
        assert authenticated_user.password.startswith('pbkdf2_sha256$')
    
    def test_password_validation_rules(self, api_client):
        """Test password validation rules."""
        weak_passwords = [
            '123',
            'password',
            'abc123',
            '11111111',
            'qwerty'
        ]
        
        for weak_password in weak_passwords:
            registration_data = {
                'username': f'user_{weak_password}',
                'email': f'user_{weak_password}@example.com',
                'password': weak_password,
                'password_confirm': weak_password,
                'terms_accepted': True
            }
            
            response = api_client.post(
                reverse('user_register'),
                data=registration_data
            )
            
            assert response.status_code == 400
            assert 'password' in response.data
    
    def test_password_change_requires_current_password(self, authenticated_api_client):
        """Test that password change requires current password."""
        change_data = {
            'new_password': 'NewSecurePass123!',
            'new_password_confirm': 'NewSecurePass123!'
            # Missing current password
        }
        
        response = authenticated_api_client.post(
            reverse('change_password'),
            data=change_data
        )
        
        assert response.status_code == 400
        assert 'current_password' in response.data
    
    def test_successful_password_change(self, authenticated_api_client, authenticated_user):
        """Test successful password change."""
        change_data = {
            'current_password': 'testpass123',
            'new_password': 'NewSecurePass123!',
            'new_password_confirm': 'NewSecurePass123!'
        }
        
        response = authenticated_api_client.post(
            reverse('change_password'),
            data=change_data
        )
        
        assert response.status_code == 200
        
        # Verify password was changed
        authenticated_user.refresh_from_db()
        assert authenticated_user.check_password('NewSecurePass123!')


@pytest.mark.auth
@pytest.mark.integration
class TestSecurityHeaders:
    """Tests for security headers and CSRF protection."""
    
    def test_csrf_protection_enabled(self, api_client):
        """Test that CSRF protection is enabled for state-changing operations."""
        # POST without CSRF token should fail
        response = api_client.post(
            reverse('user_register'),
            data={'username': 'test'},
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        
        # Should require CSRF token
        assert response.status_code in [403, 400]
    
    def test_security_headers_present(self, api_client):
        """Test that security headers are present in responses."""
        response = api_client.get('/')
        
        # Check for important security headers
        headers = response.headers
        
        # These may vary based on configuration
        security_headers = [
            'X-Content-Type-Options',
            'X-Frame-Options',
            'X-XSS-Protection',
            'Content-Security-Policy'
        ]
        
        # At least some security headers should be present
        present_headers = [h for h in security_headers if h in headers]
        assert len(present_headers) > 0
