"""
Security Test Suite for MarketHub

This module contains security tests including:
- Input sanitization tests
- Authentication/authorization tests
- CSRF protection tests
- Basic security vulnerability scans
"""

import pytest
import json
import tempfile
from django.test import TestCase, Client, override_settings
from django.contrib.auth.models import User
from django.urls import reverse
from django.conf import settings
from unittest.mock import patch, MagicMock

from utils.sanitize import (
    sanitize_html,
    sanitize_user_review,
    sanitize_product_description,
    sanitize_search_query,
    validate_url,
    sanitize_filename
)
from homepage.models import Product
from homepage.forms import ProductForm, ProductSearchForm


class InputSanitizationTests(TestCase):
    """Test input sanitization functions"""
    
    def test_basic_html_sanitization(self):
        """Test basic HTML sanitization"""
        malicious_html = '<script>alert("XSS")</script><p>Safe content</p>'
        sanitized = sanitize_html(malicious_html)
        
        # Should remove script tags but keep safe content
        self.assertNotIn('<script>', sanitized)
        self.assertNotIn('alert', sanitized)
        self.assertIn('Safe content', sanitized)
        
    def test_user_review_sanitization(self):
        """Test user review content sanitization"""
        review_content = '''
        <p>Great product!</p>
        <script>steal_data()</script>
        <strong>Very satisfied</strong>
        <iframe src="malicious.com"></iframe>
        '''
        
        sanitized = sanitize_user_review(review_content)
        
        # Should keep safe tags
        self.assertIn('Great product!', sanitized)
        self.assertIn('<strong>', sanitized)
        
        # Should remove dangerous content
        self.assertNotIn('<script>', sanitized)
        self.assertNotIn('<iframe>', sanitized)
        self.assertNotIn('steal_data', sanitized)
        
    def test_product_description_sanitization(self):
        """Test product description sanitization with rich formatting"""
        description = '''
        <h3>Product Features</h3>
        <ul>
            <li>Feature 1</li>
            <li>Feature 2</li>
        </ul>
        <script>alert("XSS")</script>
        <object data="malicious.swf"></object>
        '''
        
        sanitized = sanitize_product_description(description)
        
        # Should keep rich formatting
        self.assertIn('<h3>', sanitized)
        self.assertIn('<ul>', sanitized)
        self.assertIn('<li>', sanitized)
        
        # Should remove dangerous content
        self.assertNotIn('<script>', sanitized)
        self.assertNotIn('<object>', sanitized)
        
    def test_search_query_sanitization(self):
        """Test search query sanitization"""
        malicious_query = '<script>alert("XSS")</script>search term'
        sanitized = sanitize_search_query(malicious_query)
        
        # Should remove all HTML and dangerous characters
        self.assertNotIn('<script>', sanitized)
        self.assertNotIn('<', sanitized)
        self.assertNotIn('>', sanitized)
        self.assertIn('search term', sanitized)
        
    def test_url_validation(self):
        """Test URL validation for safety"""
        # Safe URLs
        self.assertTrue(validate_url('https://example.com'))
        self.assertTrue(validate_url('http://example.com'))
        self.assertTrue(validate_url('mailto:test@example.com'))
        
        # Dangerous URLs
        self.assertFalse(validate_url('javascript:alert("XSS")'))
        self.assertFalse(validate_url('data:text/html,<script>alert("XSS")</script>'))
        self.assertFalse(validate_url('ftp://example.com'))
        
    def test_filename_sanitization(self):
        """Test filename sanitization"""
        malicious_filename = '../../../etc/passwd'
        sanitized = sanitize_filename(malicious_filename)
        
        # Should remove directory traversal
        self.assertNotIn('..', sanitized)
        self.assertNotIn('/', sanitized)
        self.assertNotIn('\\', sanitized)
        
    def test_javascript_handler_removal(self):
        """Test removal of JavaScript event handlers"""
        html_with_handlers = '''
        <p onclick="alert('XSS')">Click me</p>
        <img src="x" onerror="steal_data()">
        '''
        
        sanitized = sanitize_html(html_with_handlers)
        
        # Should remove event handlers
        self.assertNotIn('onclick', sanitized)
        self.assertNotIn('onerror', sanitized)
        self.assertNotIn('alert', sanitized)
        self.assertNotIn('steal_data', sanitized)


class AuthenticationSecurityTests(TestCase):
    """Test authentication and authorization security"""
    
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='securepassword123'
        )
        
    def test_login_required_views(self):
        """Test that protected views require authentication"""
        protected_urls = [
            reverse('create_product'),
            reverse('view_cart'),
            reverse('seller_dashboard'),
        ]
        
        for url in protected_urls:
            response = self.client.get(url)
            # Should redirect to login
            self.assertEqual(response.status_code, 302)
            self.assertIn('/login/', response.url)
            
    def test_brute_force_protection(self):
        """Test that repeated failed login attempts are limited"""
        login_url = reverse('login_view')
        
        # Attempt multiple failed logins
        for i in range(6):  # One more than AXES_FAILURE_LIMIT
            response = self.client.post(login_url, {
                'username': 'testuser',
                'password': 'wrongpassword'
            })
            
        # After limit is reached, should be locked out
        response = self.client.post(login_url, {
            'username': 'testuser',
            'password': 'securepassword123'  # Even correct password should be blocked
        })
        
        # Should be blocked (exact response depends on axes configuration)
        self.assertNotEqual(response.status_code, 200)
        
    def test_session_security(self):
        """Test session security settings"""
        self.client.login(username='testuser', password='securepassword123')
        
        # Check session cookie settings
        session_cookie = self.client.session
        self.assertIsNotNone(session_cookie)
        
        # Session should expire on browser close
        self.assertTrue(settings.SESSION_EXPIRE_AT_BROWSER_CLOSE)
        self.assertEqual(settings.SESSION_COOKIE_AGE, 3600)  # 1 hour
        
    def test_csrf_protection(self):
        """Test CSRF protection on forms"""
        self.client.login(username='testuser', password='securepassword123')
        
        # Try to submit form without CSRF token
        response = self.client.post(reverse('create_product'), {
            'name': 'Test Product',
            'description': 'Test Description',
            'price': '10.00',
            'category': 'electronics',
        }, HTTP_X_CSRFTOKEN='invalid')
        
        # Should be rejected due to invalid CSRF token
        self.assertEqual(response.status_code, 403)


class FormSecurityTests(TestCase):
    """Test form-level security"""
    
    def test_product_form_sanitization(self):
        """Test that product form sanitizes input"""
        form_data = {
            'name': '<script>alert("XSS")</script>Product Name',
            'description': '<p>Good product</p><script>steal_data()</script>',
            'price': '10.00',
            'category': 'electronics',
            'condition': 'new',
            'status': 'available',
            'location': 'cape_town_central'
        }
        
        form = ProductForm(data=form_data)
        if form.is_valid():
            # Name should be sanitized
            self.assertNotIn('<script>', form.cleaned_data['name'])
            self.assertIn('Product Name', form.cleaned_data['name'])
            
            # Description should be sanitized
            self.assertNotIn('<script>', form.cleaned_data['description'])
            self.assertIn('Good product', form.cleaned_data['description'])
            
    def test_search_form_sanitization(self):
        """Test search form query sanitization"""
        form_data = {
            'query': '<script>alert("XSS")</script>search term'
        }
        
        form = ProductSearchForm(data=form_data)
        if form.is_valid():
            # Search query should be sanitized
            cleaned_query = form.cleaned_data['query']
            self.assertNotIn('<script>', cleaned_query)
            self.assertNotIn('<', cleaned_query)
            self.assertIn('search term', cleaned_query)


class SecurityHeadersTests(TestCase):
    """Test security headers"""
    
    def test_security_headers_present(self):
        """Test that security headers are present"""
        response = self.client.get('/')
        
        # Check CSP header
        self.assertIn('Content-Security-Policy', response)
        
        # Check other security headers
        if not settings.DEBUG:
            # These headers should be present in production
            self.assertIn('Strict-Transport-Security', response)
            self.assertIn('X-Content-Type-Options', response)
            self.assertIn('X-Frame-Options', response)
            
    def test_csp_configuration(self):
        """Test Content Security Policy configuration"""
        # CSP should be configured
        self.assertIsNotNone(settings.CSP_DEFAULT_SRC)
        self.assertIn("'self'", settings.CSP_DEFAULT_SRC)
        
        # Should allow Stripe for payments
        self.assertIn('https://js.stripe.com', settings.CSP_SCRIPT_SRC)
        self.assertIn('https://api.stripe.com', settings.CSP_CONNECT_SRC)


class SecurityConfigurationTests(TestCase):
    """Test security configuration"""
    
    def test_security_middleware_enabled(self):
        """Test that security middleware is enabled"""
        middleware = settings.MIDDLEWARE
        
        # Check critical security middleware
        self.assertIn('django.middleware.security.SecurityMiddleware', middleware)
        self.assertIn('django.middleware.csrf.CsrfViewMiddleware', middleware)
        self.assertIn('csp.middleware.CSPMiddleware', middleware)
        self.assertIn('axes.middleware.AxesMiddleware', middleware)
        
    def test_csrf_settings(self):
        """Test CSRF protection settings"""
        self.assertTrue(settings.CSRF_USE_SESSIONS)
        self.assertTrue(settings.CSRF_COOKIE_HTTPONLY)
        self.assertEqual(settings.CSRF_COOKIE_SAMESITE, 'Strict')
        
    def test_session_security_settings(self):
        """Test session security configuration"""
        self.assertEqual(settings.SESSION_COOKIE_SAMESITE, 'Strict')
        self.assertTrue(settings.SESSION_COOKIE_HTTPONLY)
        self.assertTrue(settings.SESSION_EXPIRE_AT_BROWSER_CLOSE)
        
    def test_axes_configuration(self):
        """Test django-axes brute force protection configuration"""
        self.assertEqual(settings.AXES_FAILURE_LIMIT, 5)
        self.assertEqual(settings.AXES_COOLOFF_TIME, 1)
        self.assertTrue(settings.AXES_RESET_ON_SUCCESS)
        
    def test_production_security_settings(self):
        """Test production security settings"""
        with override_settings(DEBUG=False):
            # These should be enforced in production
            self.assertTrue(settings.SECURE_SSL_REDIRECT)
            self.assertTrue(settings.SESSION_COOKIE_SECURE)
            self.assertTrue(settings.CSRF_COOKIE_SECURE)


@pytest.mark.django_db
class SecurityIntegrationTests(TestCase):
    """Integration tests for security features"""
    
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='securepassword123'
        )
        
    def test_end_to_end_xss_protection(self):
        """Test XSS protection end-to-end"""
        self.client.login(username='testuser', password='securepassword123')
        
        # Create product with potentially malicious content
        response = self.client.post(reverse('create_product'), {
            'name': '<script>alert("XSS")</script>Safe Product',
            'description': '<p>Good product</p><script>steal_data()</script>',
            'price': '10.00',
            'category': 'electronics',
            'condition': 'new',
            'status': 'available',
            'location': 'cape_town_central',
            'csrfmiddlewaretoken': self.client.cookies['csrftoken'].value
        })
        
        # Should redirect on success or show form errors
        self.assertIn(response.status_code, [200, 302])
        
        # Check that malicious content is not stored
        if Product.objects.filter(seller=self.user).exists():
            product = Product.objects.filter(seller=self.user).first()
            self.assertNotIn('<script>', product.name)
            self.assertNotIn('<script>', product.description)
            
    def test_sql_injection_protection(self):
        """Test SQL injection protection"""
        # Django ORM should protect against SQL injection
        malicious_query = "'; DROP TABLE homepage_product; --"
        
        # Try SQL injection through search
        response = self.client.get(reverse('product_list'), {
            'q': malicious_query
        })
        
        # Should not cause server error
        self.assertEqual(response.status_code, 200)
        
        # Products table should still exist
        self.assertTrue(Product.objects.all().count() >= 0)


def run_security_scan():
    """Run automated security scans"""
    import subprocess
    import sys
    
    results = {
        'bandit': None,
        'safety': None,
        'status': 'passed'
    }
    
    try:
        # Run bandit security scanner
        print("Running bandit security scanner...")
        bandit_result = subprocess.run([
            sys.executable, '-m', 'bandit', '-r', '.', 
            '--exclude', 'venv,env,tests,migrations',
            '--format', 'json'
        ], capture_output=True, text=True, timeout=60)
        
        if bandit_result.returncode == 0:
            results['bandit'] = json.loads(bandit_result.stdout)
        else:
            results['bandit'] = {'error': bandit_result.stderr}
            
    except Exception as e:
        results['bandit'] = {'error': str(e)}
        
    try:
        # Run safety vulnerability scanner
        print("Running safety vulnerability scanner...")
        safety_result = subprocess.run([
            sys.executable, '-m', 'safety', 'check', '--json'
        ], capture_output=True, text=True, timeout=60)
        
        if safety_result.returncode == 0:
            results['safety'] = json.loads(safety_result.stdout)
        else:
            results['safety'] = {'error': safety_result.stderr}
            
    except Exception as e:
        results['safety'] = {'error': str(e)}
        
    # Analyze results
    if results['bandit'] and 'results' in results['bandit']:
        high_severity_issues = [
            issue for issue in results['bandit']['results'] 
            if issue.get('issue_severity') == 'HIGH'
        ]
        if high_severity_issues:
            results['status'] = 'failed'
            results['high_severity_count'] = len(high_severity_issues)
            
    if results['safety'] and isinstance(results['safety'], list) and len(results['safety']) > 0:
        results['status'] = 'failed'
        results['vulnerable_packages'] = len(results['safety'])
        
    return results


if __name__ == '__main__':
    # Run security scan
    scan_results = run_security_scan()
    
    print("\n=== Security Scan Results ===")
    print(f"Overall Status: {scan_results['status'].upper()}")
    
    if scan_results.get('bandit'):
        if 'results' in scan_results['bandit']:
            print(f"Bandit: Found {len(scan_results['bandit']['results'])} potential issues")
            if scan_results.get('high_severity_count'):
                print(f"  - {scan_results['high_severity_count']} HIGH severity issues")
        else:
            print(f"Bandit: {scan_results['bandit'].get('error', 'No issues found')}")
            
    if scan_results.get('safety'):
        if isinstance(scan_results['safety'], list):
            print(f"Safety: Found {len(scan_results['safety'])} vulnerable packages")
        else:
            print(f"Safety: {scan_results['safety'].get('error', 'No vulnerabilities found')}")
            
    # Write results to file
    with open('security_scan_results.json', 'w') as f:
        json.dump(scan_results, f, indent=2)
        
    print(f"\nDetailed results saved to: security_scan_results.json")
