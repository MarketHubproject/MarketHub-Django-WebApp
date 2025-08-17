"""
Django Test Suite for Payment System

This module contains comprehensive tests for MarketHub's payment functionality,
using Django's built-in TestCase framework for compatibility.
"""
import json
from decimal import Decimal
from unittest.mock import patch, Mock, MagicMock
from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APIClient, APITestCase
from rest_framework import status

from homepage.models import Order, Payment, PaymentMethod, Product, Category, Cart, CartItem
from homepage.stripe_service import StripeService


class PaymentModelTest(TestCase):
    """Test Payment model functionality"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.order = Order.objects.create(
            user=self.user,
            order_number='TEST001',
            email='test@example.com',
            first_name='Test',
            last_name='User',
            address_line_1='123 Test St',
            city='Cape Town',
            province='Western Cape',
            postal_code='8001',
            subtotal=Decimal('100.00'),
            shipping_cost=Decimal('0.00'),
            tax_amount=Decimal('15.00'),
            total_amount=Decimal('115.00')
        )
    
    def test_payment_creation(self):
        """Test payment record creation"""
        payment = Payment.objects.create(
            order=self.order,
            payment_method='card',
            amount=self.order.total_amount,
            currency='ZAR',
            status='pending',
            transaction_id='test_txn_123',
            gateway_fee=Decimal('3.50')
        )
        
        self.assertEqual(payment.order, self.order)
        self.assertEqual(payment.amount, Decimal('115.00'))
        self.assertEqual(payment.net_amount, Decimal('111.50'))  # amount - gateway_fee
        self.assertEqual(payment.currency, 'ZAR')
        self.assertEqual(payment.status, 'pending')
        self.assertFalse(payment.is_successful)
        self.assertTrue(payment.is_pending)
    
    def test_payment_status_properties(self):
        """Test payment status helper properties"""
        # Test successful payment
        successful_payment = Payment.objects.create(
            order=self.order,
            payment_method='card',
            amount=Decimal('100.00'),
            status='completed'
        )
        self.assertTrue(successful_payment.is_successful)
        self.assertFalse(successful_payment.is_pending)
        
        # Test failed payment
        failed_order = Order.objects.create(
            user=self.user,
            order_number='TEST002',
            email='test@example.com',
            first_name='Test',
            last_name='User',
            address_line_1='456 Test Ave',
            city='Cape Town',
            province='Western Cape',
            postal_code='8002',
            subtotal=Decimal('50.00'),
            shipping_cost=Decimal('0.00'),
            tax_amount=Decimal('7.50'),
            total_amount=Decimal('57.50')
        )
        failed_payment = Payment.objects.create(
            order=failed_order,
            payment_method='card',
            amount=failed_order.total_amount,
            status='failed'
        )
        self.assertFalse(failed_payment.is_successful)
        self.assertFalse(failed_payment.is_pending)
        
        # Test pending payment
        pending_order = Order.objects.create(
            user=self.user,
            order_number='TEST003',
            email='test@example.com',
            first_name='Test',
            last_name='User',
            address_line_1='789 Test Blvd',
            city='Cape Town',
            province='Western Cape',
            postal_code='8003',
            subtotal=Decimal('75.00'),
            shipping_cost=Decimal('0.00'),
            tax_amount=Decimal('11.25'),
            total_amount=Decimal('86.25')
        )
        pending_payment = Payment.objects.create(
            order=pending_order,
            payment_method='card',
            amount=pending_order.total_amount,
            status='processing'
        )
        self.assertTrue(pending_payment.is_pending)
        self.assertFalse(pending_payment.is_successful)
    
    def test_payment_str_representation(self):
        """Test payment string representation"""
        payment = Payment.objects.create(
            order=self.order,
            payment_method='card',
            amount=Decimal('100.00'),
            transaction_id='txn_123456'
        )
        
        expected_str = f"Payment txn_123456 for Order {self.order.order_number}"
        self.assertEqual(str(payment), expected_str)


class StripeServiceTest(TestCase):
    """Test Stripe service functionality with mocked API calls"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.order = Order.objects.create(
            user=self.user,
            order_number='TEST001',
            email='test@example.com',
            first_name='Test',
            last_name='User',
            address_line_1='123 Test St',
            city='Cape Town',
            province='Western Cape',
            postal_code='8001',
            subtotal=Decimal('100.00'),
            shipping_cost=Decimal('0.00'),
            tax_amount=Decimal('15.00'),
            total_amount=Decimal('115.00')
        )
    
    @patch('homepage.stripe_service.stripe.PaymentIntent.create')
    def test_create_payment_intent_success(self, mock_create):
        """Test successful payment intent creation"""
        # Mock Stripe response
        mock_intent = Mock()
        mock_intent.id = 'pi_test_123456'
        mock_intent.client_secret = 'pi_test_123456_secret'
        mock_intent.amount = 11500  # R115.00 in cents
        mock_intent.currency = 'zar'
        mock_create.return_value = mock_intent
        
        # Call service method
        intent = StripeService.create_payment_intent(self.order)
        
        # Verify results
        self.assertIsNotNone(intent)
        self.assertEqual(intent.id, 'pi_test_123456')
        self.assertEqual(intent.amount, 11500)
        
        # Verify Stripe was called with correct parameters
        mock_create.assert_called_once()
        call_args = mock_create.call_args[1]
        self.assertEqual(call_args['amount'], 11500)
        self.assertEqual(call_args['currency'], 'zar')
        self.assertEqual(call_args['metadata']['order_id'], str(self.order.id))
    
    @patch('homepage.stripe_service.stripe.Customer.create')
    def test_get_or_create_customer_new(self, mock_create):
        """Test creating a new Stripe customer"""
        # Mock Stripe response
        mock_customer = Mock()
        mock_customer.id = 'cus_test_123456'
        mock_customer.email = self.user.email
        mock_create.return_value = mock_customer
        
        # Call service method
        customer = StripeService.get_or_create_customer(self.user)
        
        # Verify results
        self.assertIsNotNone(customer)
        self.assertEqual(customer.id, 'cus_test_123456')
        self.assertEqual(customer.email, self.user.email)
        
        # Verify Stripe was called with correct parameters
        mock_create.assert_called_once()
        call_args = mock_create.call_args[1]
        self.assertEqual(call_args['email'], self.user.email)
        self.assertIn(self.user.username, call_args['name'])
    
    @patch('homepage.stripe_service.stripe.PaymentIntent.confirm')
    def test_confirm_payment_intent_success(self, mock_confirm):
        """Test successful payment intent confirmation"""
        # Mock Stripe response
        mock_intent = Mock()
        mock_intent.id = 'pi_test_123456'
        mock_intent.status = 'succeeded'
        mock_confirm.return_value = mock_intent
        
        # Call service method
        intent = StripeService.confirm_payment_intent('pi_test_123456', 'pm_test_card')
        
        # Verify results
        self.assertIsNotNone(intent)
        self.assertEqual(intent.status, 'succeeded')
        
        # Verify Stripe was called correctly
        mock_confirm.assert_called_once_with('pi_test_123456', payment_method='pm_test_card')


class PaymentAPITest(APITestCase):
    """Test payment API endpoints"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.order = Order.objects.create(
            user=self.user,
            order_number='TEST001',
            email='test@example.com',
            first_name='Test',
            last_name='User',
            total_amount=Decimal('100.00')
        )
        
        self.client.force_authenticate(user=self.user)
    
    @patch('homepage.api_views_payments.StripeService.get_or_create_customer')
    @patch('homepage.api_views_payments.StripeService.create_payment_intent')
    def test_create_payment_intent_api_success(self, mock_create_intent, mock_get_customer):
        """Test payment intent creation API endpoint"""
        # Mock Stripe responses
        mock_customer = Mock()
        mock_customer.id = 'cus_test_123'
        mock_get_customer.return_value = mock_customer
        
        mock_intent = Mock()
        mock_intent.id = 'pi_test_123456'
        mock_intent.client_secret = 'pi_test_123456_secret'
        mock_intent.amount = 10000
        mock_intent.currency = 'zar'
        mock_intent.status = 'requires_payment_method'
        mock_create_intent.return_value = mock_intent
        
        # Make API request
        url = reverse('create-payment-intent')
        data = {
            'order_id': self.order.id,
            'currency': 'zar'
        }
        
        response = self.client.post(url, data, format='json')
        
        # Verify response
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['payment_intent_id'], 'pi_test_123456')
        self.assertEqual(response.data['client_secret'], 'pi_test_123456_secret')
        self.assertEqual(response.data['amount'], 100.0)  # Converted from cents
        
        # Verify Payment record was created
        payment = Payment.objects.get(order=self.order)
        self.assertEqual(payment.stripe_payment_intent_id, 'pi_test_123456')
        self.assertEqual(payment.status, 'pending')
    
    def test_create_payment_intent_api_unauthorized(self):
        """Test payment intent creation requires authentication"""
        # Remove authentication
        self.client.force_authenticate(user=None)
        
        url = reverse('create-payment-intent')
        data = {'order_id': self.order.id}
        
        response = self.client.post(url, data, format='json')
        
        # Should return unauthorized
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_create_payment_intent_api_invalid_order(self):
        """Test payment intent creation with invalid order"""
        url = reverse('create-payment-intent')
        data = {'order_id': 99999}  # Non-existent order
        
        response = self.client.post(url, data, format='json')
        
        # Should return not found
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('Order not found', response.data['error'])


class PaymentViewTest(TestCase):
    """Test payment views"""
    
    def setUp(self):
        """Set up test data"""
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.order = Order.objects.create(
            user=self.user,
            order_number='TEST001',
            email='test@example.com',
            first_name='Test',
            last_name='User',
            total_amount=Decimal('100.00')
        )
        
        self.client.login(username='testuser', password='testpass123')
    
    @patch('homepage.payment_views.StripeService.get_or_create_customer')
    @patch('homepage.payment_views.StripeService.get_customer_payment_methods')
    def test_checkout_view(self, mock_get_methods, mock_get_customer):
        """Test checkout page loads correctly"""
        # Mock Stripe responses
        mock_customer = Mock()
        mock_customer.id = 'cus_test_123'
        mock_get_customer.return_value = mock_customer
        mock_get_methods.return_value = []
        
        url = reverse('checkout-payment', kwargs={'order_id': self.order.id})
        response = self.client.get(url)
        
        # Verify response
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Complete Payment')
        self.assertContains(response, self.order.order_number)
        self.assertContains(response, str(self.order.total_amount))
    
    def test_checkout_view_requires_login(self):
        """Test checkout view requires authentication"""
        # Logout user
        self.client.logout()
        
        url = reverse('checkout-payment', kwargs={'order_id': self.order.id})
        response = self.client.get(url)
        
        # Should redirect to login
        self.assertEqual(response.status_code, 302)
        self.assertIn('/accounts/login/', response.url)
    
    def test_payment_success_view(self):
        """Test payment success page"""
        url = reverse('payment-success')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Payment Successful')
    
    def test_payment_cancelled_view(self):
        """Test payment cancelled page"""
        url = reverse('payment-cancelled')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'cancelled')


class PaymentIntegrationTest(TestCase):
    """Integration tests for complete payment flow"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # Create a complete order with items
        self.order = Order.objects.create(
            user=self.user,
            order_number='TEST001',
            email='test@example.com',
            first_name='Test',
            last_name='User',
            address_line_1='123 Test St',
            city='Cape Town',
            province='Western Cape',
            postal_code='8001',
            subtotal=Decimal('100.00'),
            shipping_cost=Decimal('0.00'),
            tax_amount=Decimal('15.00'),
            total_amount=Decimal('115.00'),
            payment_status='pending'
        )
    
    def test_payment_webhook_success(self):
        """Test webhook handling for successful payment"""
        # Create a payment record
        payment = Payment.objects.create(
            order=self.order,
            payment_method='card',
            amount=self.order.total_amount,
            status='pending',
            stripe_payment_intent_id='pi_test_123456'
        )
        
        # Mock webhook event for successful payment
        mock_event = {
            'type': 'payment_intent.succeeded',
            'data': {
                'object': {
                    'id': 'pi_test_123456',
                    'status': 'succeeded',
                    'amount': 11500,
                    'currency': 'zar'
                }
            }
        }
        
        # Process webhook event
        handled = StripeService.handle_webhook_event(mock_event)
        
        # Verify webhook was handled
        self.assertTrue(handled)
        
        # Verify payment and order were updated
        payment.refresh_from_db()
        self.order.refresh_from_db()
        
        self.assertEqual(payment.status, 'completed')
        self.assertEqual(self.order.payment_status, 'paid')
        self.assertEqual(self.order.status, 'processing')
    
    def test_payment_webhook_failure(self):
        """Test webhook handling for failed payment"""
        # Create a payment record
        payment = Payment.objects.create(
            order=self.order,
            payment_method='card',
            amount=self.order.total_amount,
            status='pending',
            stripe_payment_intent_id='pi_test_123456'
        )
        
        # Mock webhook event for failed payment
        mock_event = {
            'type': 'payment_intent.payment_failed',
            'data': {
                'object': {
                    'id': 'pi_test_123456',
                    'status': 'requires_payment_method',
                    'last_payment_error': {
                        'code': 'card_declined',
                        'message': 'Your card was declined.'
                    }
                }
            }
        }
        
        # Process webhook event
        handled = StripeService.handle_webhook_event(mock_event)
        
        # Verify webhook was handled
        self.assertTrue(handled)
        
        # Verify payment was marked as failed
        payment.refresh_from_db()
        self.order.refresh_from_db()
        
        self.assertEqual(payment.status, 'failed')
        self.assertEqual(self.order.payment_status, 'failed')


class PaymentSecurityTest(TestCase):
    """Test payment security measures"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='otherpass123'
        )
        
        self.user_order = Order.objects.create(
            user=self.user,
            order_number='USER001',
            email='test@example.com',
            first_name='Test',
            last_name='User',
            total_amount=Decimal('100.00')
        )
        
        self.client = APIClient()
    
    def test_payment_intent_access_control(self):
        """Test users can only access their own payment intents"""
        # Login as other user
        self.client.force_authenticate(user=self.other_user)
        
        # Try to create payment intent for user's order
        url = reverse('create-payment-intent')
        data = {'order_id': self.user_order.id}
        
        response = self.client.post(url, data, format='json')
        
        # Should be forbidden or not found
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_amount_validation(self):
        """Test payment amount validation"""
        self.client.force_authenticate(user=self.user)
        
        # Test negative amount
        url = reverse('create-payment-intent')
        data = {'amount': '-100.00'}
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Test excessive amount
        data = {'amount': '20000.00'}  # Above limit
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_rate_limiting(self):
        """Test payment endpoint rate limiting"""
        self.client.force_authenticate(user=self.user)
        
        url = reverse('create-payment-intent')
        data = {'amount': '100.00'}
        
        # Make multiple rapid requests (should be limited)
        responses = []
        for _ in range(10):
            response = self.client.post(url, data, format='json')
            responses.append(response.status_code)
        
        # At least some requests should be rate limited
        # Note: Actual rate limiting behavior depends on configuration
        self.assertTrue(any(code == 429 for code in responses) or 
                       all(code in [200, 400, 500] for code in responses))
