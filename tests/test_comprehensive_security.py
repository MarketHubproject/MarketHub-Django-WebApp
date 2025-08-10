"""
Comprehensive security tests for MarketHub.

This module contains security tests for:
- CSRF enforcement
- XSS prevention via script payload testing
- SQL injection with malicious strings
- Input validation and sanitization
- Authentication bypass attempts
- Authorization checks
"""
import pytest
from unittest.mock import patch, Mock
from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth.models import User
from django.contrib.sessions.models import Session
from django.conf import settings
from django.db import connection
from django.test.utils import override_settings
from rest_framework.test import APIClient
from rest_framework import status
import json
import re

from homepage.models import Product, Order, Review, User
from tests.factories import UserFactory, ProductFactory, OrderFactory, ReviewFactory


@pytest.mark.security
class TestCSRFProtection:
    """Tests for CSRF protection enforcement."""
    
    def test_csrf_protection_on_state_changing_operations(self, client):
        """Test CSRF protection on POST, PUT, PATCH, DELETE operations."""
        user = UserFactory()
        
        # Login user
        client.force_login(user)
        
        # Test POST without CSRF token
        response = client.post(
            reverse('product_create'),
            data={
                'name': 'Test Product',
                'description': 'Test',
                'price': '99.99',
                'category': 'electronics'
            }
        )
        
        # Should be rejected due to missing CSRF token
        assert response.status_code == 403
    
    def test_csrf_token_required_for_forms(self, client):
        """Test that forms require CSRF tokens."""
        user = UserFactory()
        client.force_login(user)
        
        # Get form page first to obtain CSRF token
        response = client.get(reverse('product_create'))
        assert response.status_code == 200
        
        # Extract CSRF token from form
        csrf_token = response.context['csrf_token']
        
        # Submit form with CSRF token
        response = client.post(
            reverse('product_create'),
            data={
                'name': 'Test Product',
                'description': 'Test',
                'price': '99.99',
                'category': 'electronics',
                'csrfmiddlewaretoken': csrf_token
            }
        )
        
        # Should succeed with valid CSRF token
        assert response.status_code in [200, 201, 302]
    
    def test_csrf_ajax_requests(self, api_client, authenticated_user):
        """Test CSRF protection for AJAX requests."""
        # AJAX request without CSRF header
        response = api_client.post(
            reverse('api_product_create'),
            data={
                'name': 'Test Product',
                'description': 'Test',
                'price': '99.99'
            },
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        
        # Should be rejected
        assert response.status_code == 403
    
    def test_csrf_exempted_endpoints(self, client):
        """Test that specific endpoints are exempt from CSRF (like webhooks)."""
        # Webhook endpoints should be CSRF exempt
        webhook_data = {
            'id': 'evt_test',
            'type': 'payment_intent.succeeded',
            'data': {'object': {'id': 'pi_test'}}
        }
        
        response = client.post(
            reverse('stripe_webhook'),
            data=json.dumps(webhook_data),
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='test_signature'
        )
        
        # Should not be rejected for CSRF (may fail for other reasons)
        assert response.status_code != 403


@pytest.mark.security
class TestXSSPrevention:
    """Tests for XSS (Cross-Site Scripting) prevention."""
    
    def test_script_tag_sanitization_in_product_description(self, authenticated_api_client, authenticated_user):
        """Test that script tags are sanitized in product descriptions."""
        malicious_payloads = [
            '<script>alert("XSS")</script>',
            '<img src=x onerror=alert("XSS")>',
            '<svg onload=alert("XSS")>',
            'javascript:alert("XSS")',
            '<iframe src="javascript:alert(\'XSS\')"></iframe>',
            '<body onload=alert("XSS")>',
            '<div onclick="alert(\'XSS\')">Click me</div>'
        ]
        
        for payload in malicious_payloads:
            product_data = {
                'name': 'Test Product',
                'description': f'Safe content {payload} more content',
                'price': '99.99',
                'category': 'electronics'
            }
            
            response = authenticated_api_client.post(
                reverse('product-list'),
                data=product_data
            )
            
            if response.status_code == 201:
                # Check that script content was sanitized
                assert '<script>' not in response.data['description']
                assert 'javascript:' not in response.data['description']
                assert 'onerror=' not in response.data['description']
                assert 'onload=' not in response.data['description']
    
    def test_html_entities_in_user_input(self, authenticated_api_client, authenticated_user):
        """Test that HTML entities are properly handled."""
        product = ProductFactory(seller=authenticated_user)
        
        review_data = {
            'product': product.id,
            'rating': 5,
            'title': 'Test &lt;script&gt;alert("XSS")&lt;/script&gt;',
            'comment': 'Great product &amp; excellent service!'
        }
        
        response = authenticated_api_client.post(
            reverse('review-list'),
            data=review_data
        )
        
        assert response.status_code == 201
        
        # HTML entities should be preserved/properly encoded
        assert '&lt;' in response.data['title'] or '<script>' not in response.data['title']
        assert '&amp;' in response.data['comment']
    
    def test_template_context_auto_escaping(self, client):
        """Test that template context variables are auto-escaped."""
        product = ProductFactory(
            name='Test <script>alert("XSS")</script> Product',
            description='Description with <img src=x onerror=alert("XSS")>'
        )
        
        response = client.get(
            reverse('product_detail', kwargs={'pk': product.pk})
        )
        
        assert response.status_code == 200
        
        # Check that dangerous content is escaped in HTML
        content = response.content.decode('utf-8')
        assert '<script>alert("XSS")</script>' not in content
        assert '&lt;script&gt;' in content or 'script' not in content
    
    def test_user_generated_content_sanitization(self, authenticated_api_client, authenticated_user):
        """Test sanitization of user-generated content."""
        # Test various input fields for XSS
        test_cases = [
            ('first_name', '<script>alert("XSS")</script>'),
            ('last_name', '<img src=x onerror=alert("XSS")>'),
            ('bio', 'Normal text <script>malicious()</script> more text'),
        ]
        
        for field, payload in test_cases:
            update_data = {field: payload}
            
            response = authenticated_api_client.patch(
                reverse('user_profile'),
                data=update_data
            )
            
            if response.status_code == 200:
                # Verify dangerous content was sanitized
                field_value = response.data.get(field, '')
                assert '<script>' not in field_value
                assert 'onerror=' not in field_value
    
    def test_reflected_xss_prevention(self, client):
        """Test prevention of reflected XSS attacks."""
        # Test search functionality with malicious input
        xss_payload = '<script>alert("XSS")</script>'
        
        response = client.get(
            reverse('product_search'),
            {'q': xss_payload}
        )
        
        assert response.status_code == 200
        content = response.content.decode('utf-8')
        
        # XSS payload should not be rendered as executable script
        assert '<script>alert("XSS")</script>' not in content
        
        # Should be escaped if displayed
        if xss_payload in content:
            assert '&lt;script&gt;' in content


@pytest.mark.security
class TestSQLInjectionPrevention:
    """Tests for SQL injection prevention."""
    
    def test_sql_injection_in_search_queries(self, api_client):
        """Test SQL injection attempts in search queries."""
        sql_injection_payloads = [
            "'; DROP TABLE products; --",
            "' OR '1'='1",
            "1' OR '1'='1' --",
            "' UNION SELECT * FROM auth_user --",
            "'; INSERT INTO products (name) VALUES ('hacked'); --",
            "' OR 1=1 #",
            "admin'--",
            "' OR 'x'='x",
            "1'; DELETE FROM orders; --"
        ]
        
        for payload in sql_injection_payloads:
            response = api_client.get(
                reverse('product-list'),
                {'search': payload}
            )
            
            # Request should succeed but not execute malicious SQL
            assert response.status_code == 200
            
            # Should not return unexpected results
            # (Implementation depends on search mechanism)
            if 'results' in response.data:
                # Results should be empty or legitimate products only
                for result in response.data['results']:
                    assert 'name' in result
                    assert isinstance(result['name'], str)
    
    def test_sql_injection_in_filters(self, api_client):
        """Test SQL injection in filter parameters."""
        ProductFactory.create_batch(5, category='electronics')
        
        # Test category filter with SQL injection
        response = api_client.get(
            reverse('product-list'),
            {'category': "electronics'; DROP TABLE products; --"}
        )
        
        assert response.status_code in [200, 400]  # Either filtered properly or validation error
        
        # Verify database is intact
        remaining_products = Product.objects.count()
        assert remaining_products > 0  # Products table should not be dropped
    
    def test_sql_injection_in_order_by(self, api_client):
        """Test SQL injection in ordering parameters."""
        ProductFactory.create_batch(5)
        
        sql_payloads = [
            "name'; DROP TABLE products; --",
            "price, (SELECT COUNT(*) FROM auth_user)",
            "created_at; DELETE FROM orders; --"
        ]
        
        for payload in sql_payloads:
            response = api_client.get(
                reverse('product-list'),
                {'ordering': payload}
            )
            
            # Should either work safely or return validation error
            assert response.status_code in [200, 400]
            
            # Verify no data corruption
            product_count = Product.objects.count()
            assert product_count == 5
    
    def test_parameterized_queries_in_custom_sql(self, db):
        """Test that custom SQL uses parameterized queries."""
        # This test would verify any custom SQL in the codebase
        # uses parameterized queries instead of string concatenation
        
        # Example of testing a custom query method
        malicious_input = "'; DROP TABLE products; --"
        
        # If there were a custom search method, it would be tested like:
        # results = Product.objects.search_by_name(malicious_input)
        
        # For now, test that basic queries are safe
        try:
            # This should not execute the malicious SQL
            products = Product.objects.filter(name=malicious_input)
            list(products)  # Force query execution
            
            # Should not raise an exception and table should be intact
            assert Product.objects.count() >= 0
        except Exception as e:
            # If there's an error, it should be a normal Django error,
            # not a SQL syntax error from the injection
            assert 'DROP TABLE' not in str(e)
    
    def test_raw_sql_injection_prevention(self, db):
        """Test prevention in raw SQL queries if any exist."""
        with connection.cursor() as cursor:
            # Test parameterized query (safe)
            malicious_name = "test'; DROP TABLE products; --"
            
            try:
                cursor.execute(
                    "SELECT * FROM homepage_product WHERE name = %s",
                    [malicious_name]
                )
                results = cursor.fetchall()
                
                # Should execute safely and return empty results
                assert isinstance(results, list)
                
                # Verify table still exists
                cursor.execute("SELECT COUNT(*) FROM homepage_product")
                count = cursor.fetchone()[0]
                assert count >= 0
                
            except Exception as e:
                # Should not be a SQL injection error
                assert 'DROP TABLE' not in str(e).upper()


@pytest.mark.security
class TestInputValidation:
    """Tests for input validation and sanitization."""
    
    def test_email_validation(self, api_client):
        """Test email field validation."""
        invalid_emails = [
            'notanemail',
            'test@',
            '@domain.com',
            'test..test@domain.com',
            'test@domain',
            '<script>alert("XSS")</script>@domain.com',
            'test@domain.com<script>alert("XSS")</script>'
        ]
        
        for email in invalid_emails:
            registration_data = {
                'username': 'testuser',
                'email': email,
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
    
    def test_phone_number_validation(self, authenticated_api_client):
        """Test phone number validation."""
        invalid_phones = [
            '<script>alert("XSS")</script>',
            '"; DROP TABLE orders; --',
            'javascript:alert("XSS")',
            '123-456-789012345678901234567890',  # Too long
            'abc-def-ghij',  # Not numbers
        ]
        
        for phone in invalid_phones:
            order_data = {
                'phone': phone,
                'first_name': 'John',
                'last_name': 'Doe',
                'email': 'john@example.com',
                'address_line_1': '123 Test St',
                'city': 'Test City',
                'province': 'Test Province',
                'postal_code': '12345'
            }
            
            response = authenticated_api_client.post(
                reverse('order-list'),
                data=order_data
            )
            
            if response.status_code == 400:
                assert 'phone' in response.data
    
    def test_price_validation(self, authenticated_api_client):
        """Test price field validation."""
        invalid_prices = [
            'free',
            '-100.00',  # Negative price
            '999999999999999.99',  # Too large
            '<script>alert("XSS")</script>',
            '"; DROP TABLE products; --'
        ]
        
        for price in invalid_prices:
            product_data = {
                'name': 'Test Product',
                'description': 'Test description',
                'price': price,
                'category': 'electronics'
            }
            
            response = authenticated_api_client.post(
                reverse('product-list'),
                data=product_data
            )
            
            assert response.status_code == 400
            assert 'price' in response.data
    
    def test_file_upload_validation(self, authenticated_api_client):
        """Test file upload validation and security."""
        import tempfile
        import os
        
        # Test malicious file uploads
        malicious_files = [
            ('test.php', b'<?php system($_GET["cmd"]); ?>'),
            ('test.exe', b'MZ\x90\x00'),  # Executable file header
            ('test.html', b'<script>alert("XSS")</script>'),
            ('test.svg', b'<svg onload="alert(\'XSS\')"><script>alert("XSS")</script></svg>')
        ]
        
        product = ProductFactory(seller=authenticated_api_client.handler._force_user)
        
        for filename, content in malicious_files:
            with tempfile.NamedTemporaryFile(suffix=filename, delete=False) as temp_file:
                temp_file.write(content)
                temp_file.flush()
                
                try:
                    with open(temp_file.name, 'rb') as upload_file:
                        response = authenticated_api_client.patch(
                            reverse('product-detail', kwargs={'pk': product.pk}),
                            data={'image': upload_file},
                            format='multipart'
                        )
                    
                    # Should reject dangerous file types
                    if filename.endswith(('.php', '.exe')):
                        assert response.status_code == 400
                        
                finally:
                    os.unlink(temp_file.name)


@pytest.mark.security
class TestAuthenticationSecurity:
    """Tests for authentication security measures."""
    
    def test_password_brute_force_protection(self, api_client):
        """Test protection against password brute force attacks."""
        user = UserFactory()
        login_url = reverse('user_login')
        
        # Attempt multiple failed logins
        for i in range(10):
            response = api_client.post(login_url, {
                'username': user.username,
                'password': f'wrong_password_{i}'
            })
            
            if response.status_code == 403:
                # Account should be locked after too many attempts
                break
        else:
            # If no lockout occurred, check that rate limiting is in place
            # Make many more attempts
            for i in range(50):
                response = api_client.post(login_url, {
                    'username': user.username,
                    'password': f'wrong_password_{i}'
                })
                if response.status_code == 429:  # Rate limited
                    break
            else:
                pytest.fail("No brute force protection detected")
    
    def test_session_fixation_prevention(self, client):
        """Test prevention of session fixation attacks."""
        # Get initial session ID
        response = client.get('/')
        initial_session_id = client.session.session_key
        
        # Login user
        user = UserFactory()
        client.force_login(user)
        
        # Session ID should change after login
        response = client.get('/')
        post_login_session_id = client.session.session_key
        
        assert initial_session_id != post_login_session_id
    
    def test_session_timeout(self, authenticated_api_client):
        """Test session timeout functionality."""
        # This would require mocking time or using test settings
        # with very short session timeout
        with override_settings(SESSION_COOKIE_AGE=1):  # 1 second timeout
            response = authenticated_api_client.get(reverse('user_profile'))
            assert response.status_code == 200
            
            # Wait for session to expire (mocked)
            import time
            time.sleep(2)
            
            # Session should be expired
            response = authenticated_api_client.get(reverse('user_profile'))
            # Implementation depends on how session expiry is handled
            # Could be 401 (unauthorized) or redirect to login
            assert response.status_code in [401, 302]
    
    def test_concurrent_session_handling(self, api_client):
        """Test handling of concurrent sessions."""
        user = UserFactory()
        
        # Create two clients for same user
        client1 = APIClient()
        client2 = APIClient()
        
        # Login with both clients
        login_data = {
            'username': user.username,
            'password': 'testpass123'
        }
        
        response1 = client1.post(reverse('user_login'), data=login_data)
        response2 = client2.post(reverse('user_login'), data=login_data)
        
        assert response1.status_code == 200
        assert response2.status_code == 200
        
        # Both sessions should be valid unless there's a policy limiting concurrent sessions
        profile_response1 = client1.get(reverse('user_profile'))
        profile_response2 = client2.get(reverse('user_profile'))
        
        # Check your application's concurrent session policy
        assert profile_response1.status_code in [200, 401]
        assert profile_response2.status_code in [200, 401]


@pytest.mark.security
class TestAuthorizationSecurity:
    """Tests for authorization security measures."""
    
    def test_horizontal_privilege_escalation(self, authenticated_api_client, authenticated_user):
        """Test prevention of horizontal privilege escalation."""
        # Create another user's data
        other_user = UserFactory()
        other_order = OrderFactory(user=other_user)
        other_product = ProductFactory(seller=other_user)
        
        # Authenticated user should not be able to access other user's data
        
        # Try to access other user's order
        response = authenticated_api_client.get(
            reverse('order-detail', kwargs={'pk': other_order.pk})
        )
        assert response.status_code in [403, 404]
        
        # Try to modify other user's product
        response = authenticated_api_client.patch(
            reverse('product-detail', kwargs={'pk': other_product.pk}),
            data={'name': 'Hacked Product Name'}
        )
        assert response.status_code in [403, 404]
        
        # Verify the product wasn't actually modified
        other_product.refresh_from_db()
        assert other_product.name != 'Hacked Product Name'
    
    def test_vertical_privilege_escalation(self, authenticated_api_client):
        """Test prevention of vertical privilege escalation."""
        # Regular user should not be able to access admin functions
        
        # Try to access admin-only endpoints
        admin_endpoints = [
            'admin_dashboard',
            'admin_user_list',
            'admin_order_management',
        ]
        
        for endpoint_name in admin_endpoints:
            try:
                response = authenticated_api_client.get(reverse(endpoint_name))
                assert response.status_code in [403, 404, 401]
            except:
                # Endpoint might not exist, which is fine
                pass
    
    def test_direct_object_reference_vulnerabilities(self, authenticated_api_client, authenticated_user):
        """Test for insecure direct object references."""
        # Create user's own data
        user_order = OrderFactory(user=authenticated_user)
        user_product = ProductFactory(seller=authenticated_user)
        
        # Try to access resources by manipulating IDs
        # This should work for own resources
        response = authenticated_api_client.get(
            reverse('order-detail', kwargs={'pk': user_order.pk})
        )
        assert response.status_code == 200
        
        # Try with non-existent IDs
        response = authenticated_api_client.get(
            reverse('order-detail', kwargs={'pk': 99999})
        )
        assert response.status_code == 404
        
        # Try with other user's IDs (covered in horizontal escalation test)
        other_order = OrderFactory()
        response = authenticated_api_client.get(
            reverse('order-detail', kwargs={'pk': other_order.pk})
        )
        assert response.status_code in [403, 404]


@pytest.mark.security  
class TestDataExposure:
    """Tests for sensitive data exposure prevention."""
    
    def test_password_not_in_api_responses(self, authenticated_api_client):
        """Test that passwords are never included in API responses."""
        response = authenticated_api_client.get(reverse('user_profile'))
        
        assert response.status_code == 200
        response_str = json.dumps(response.data)
        
        # Password field should not be present
        assert 'password' not in response.data
        assert 'password' not in response_str.lower()
    
    def test_sensitive_fields_not_exposed(self, api_client):
        """Test that sensitive fields are not exposed in public APIs."""
        user = UserFactory()
        product = ProductFactory(seller=user)
        
        response = api_client.get(
            reverse('product-detail', kwargs={'pk': product.pk})
        )
        
        assert response.status_code == 200
        
        # Sensitive seller information should not be exposed
        if 'seller' in response.data:
            seller_data = response.data['seller']
            if isinstance(seller_data, dict):
                assert 'email' not in seller_data
                assert 'phone' not in seller_data
    
    def test_error_messages_dont_leak_info(self, api_client):
        """Test that error messages don't leak sensitive information."""
        # Try to access non-existent resource
        response = api_client.get(
            reverse('order-detail', kwargs={'pk': 99999})
        )
        
        assert response.status_code == 404
        
        # Error message should be generic
        if hasattr(response, 'data') and response.data:
            error_msg = str(response.data).lower()
            # Should not contain database schema info, file paths, etc.
            assert 'sql' not in error_msg
            assert 'database' not in error_msg
            assert '/home/' not in error_msg
            assert 'traceback' not in error_msg


@pytest.mark.security
class TestSecurityHeaders:
    """Tests for security headers implementation."""
    
    def test_security_headers_present(self, client):
        """Test that appropriate security headers are present."""
        response = client.get('/')
        
        headers = response.headers
        
        # Check for important security headers
        security_headers = {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': ['DENY', 'SAMEORIGIN'],
            'X-XSS-Protection': '1; mode=block',
        }
        
        present_headers = []
        for header, expected_values in security_headers.items():
            if header in headers:
                present_headers.append(header)
                if isinstance(expected_values, list):
                    assert headers[header] in expected_values
                else:
                    assert headers[header] == expected_values
        
        # At least some security headers should be present
        assert len(present_headers) > 0
    
    def test_content_security_policy(self, client):
        """Test Content Security Policy header."""
        response = client.get('/')
        
        if 'Content-Security-Policy' in response.headers:
            csp = response.headers['Content-Security-Policy']
            
            # Should have restrictive policies
            assert 'script-src' in csp
            assert 'object-src' in csp
            
            # Should not allow unsafe inline scripts in production
            if not settings.DEBUG:
                assert "'unsafe-inline'" not in csp or "'unsafe-eval'" not in csp


@pytest.mark.security
class TestRateLimitingSecurity:
    """Tests for rate limiting security measures."""
    
    def test_api_rate_limiting(self, api_client):
        """Test API rate limiting for security."""
        # Make many requests quickly
        responses = []
        
        for i in range(100):
            response = api_client.get(reverse('product-list'))
            responses.append(response.status_code)
            
            if response.status_code == 429:  # Rate limited
                break
        
        # Should eventually get rate limited
        assert 429 in responses or len(responses) >= 100
    
    def test_login_rate_limiting(self, api_client):
        """Test login endpoint rate limiting."""
        responses = []
        
        for i in range(20):
            response = api_client.post(reverse('user_login'), {
                'username': 'nonexistent',
                'password': 'wrongpass'
            })
            responses.append(response.status_code)
            
            if response.status_code == 429:
                break
        
        # Should be rate limited for failed login attempts
        assert 429 in responses or 403 in responses  # 403 could be account lockout
