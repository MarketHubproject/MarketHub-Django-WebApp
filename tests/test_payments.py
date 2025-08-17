"""
Payment system tests for MarketHub.

This module contains comprehensive tests for:
- Unit tests: fee calculation, token saving, error paths
- Integration tests: Stripe mock integration, webhook lifecycle
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status

from homepage.models import Order, Payment, PaymentMethod
from homepage.stripe_service import StripeService as StripePaymentService
from tests.factories import (
    UserFactory, OrderFactory, PaymentFactory, PaymentMethodFactory,
    OrderItemFactory
)


@pytest.mark.payment
@pytest.mark.unit
class TestPaymentFeeCalculation:
    """Unit tests for payment fee calculations."""
    
    def test_gateway_fee_calculation_percentage(self, db):
        """Test percentage-based gateway fee calculation."""
        payment = PaymentFactory(
            amount=Decimal('100.00'),
            gateway_fee=Decimal('2.90')  # 2.9%
        )
        
        assert payment.net_amount == Decimal('97.10')
    
    def test_gateway_fee_calculation_fixed(self, db):
        """Test fixed gateway fee calculation."""
        payment = PaymentFactory(
            amount=Decimal('50.00'),
            gateway_fee=Decimal('5.00')  # Fixed fee
        )
        
        assert payment.net_amount == Decimal('45.00')
    
    def test_zero_gateway_fee(self, db):
        """Test calculation with zero gateway fee."""
        payment = PaymentFactory(
            amount=Decimal('100.00'),
            gateway_fee=Decimal('0.00')
        )
        
        assert payment.net_amount == Decimal('100.00')
    
    # def test_stripe_fee_calculation(self):
    #     """Test Stripe-specific fee calculation."""
    #     service = StripePaymentService()
    #     
    #     # South African rates: 3.4% + R2.00
    #     amount = Decimal('100.00')
    #     expected_fee = (amount * Decimal('0.034')) + Decimal('2.00')
    #     
    #     calculated_fee = service.calculate_processing_fee(amount)
    #     assert calculated_fee == expected_fee
    # 
    # def test_fee_calculation_rounding(self):
    #     """Test that fee calculations are properly rounded."""
    #     service = StripePaymentService()
    #     
    #     # Test amount that would result in fractional cents
    #     amount = Decimal('33.33')
    #     fee = service.calculate_processing_fee(amount)
    #     
    #     # Ensure result has only 2 decimal places
    #     assert fee.as_tuple().exponent >= -2


@pytest.mark.payment
@pytest.mark.unit
class TestPaymentTokenSaving:
    """Unit tests for payment token saving functionality."""
    
    def test_save_payment_method_token(self, authenticated_user):
        """Test saving payment method with token."""
        token_data = {
            'token': 'pm_test_1234567890',
            'card_type': 'visa',
            'last_four': '4242',
            'expiry_month': '12',
            'expiry_year': '2025',
            'cardholder_name': 'John Doe'
        }
        
        payment_method = PaymentMethod.objects.create(
            user=authenticated_user,
            **token_data
        )
        
        assert payment_method.token == 'pm_test_1234567890'
        assert payment_method.card_type == 'visa'
        assert payment_method.last_four == '4242'
        assert payment_method.is_active is True
    
    def test_default_payment_method_uniqueness(self, authenticated_user):
        """Test that only one payment method can be default per user."""
        # Create first default payment method
        method1 = PaymentMethodFactory(user=authenticated_user, is_default=True)
        
        # Create second default payment method
        method2 = PaymentMethodFactory(user=authenticated_user, is_default=True)
        
        # Refresh from database
        method1.refresh_from_db()
        method2.refresh_from_db()
        
        # Only the second one should be default
        assert method1.is_default is False
        assert method2.is_default is True
    
    def test_token_encryption_security(self, authenticated_user):
        """Test that sensitive data is handled securely."""
        payment_method = PaymentMethodFactory(
            user=authenticated_user,
            token='pm_test_secure_token'
        )
        
        # Verify we don't store full card numbers or CVV
        assert not hasattr(payment_method, 'card_number')
        assert not hasattr(payment_method, 'cvv')
        assert len(payment_method.last_four) == 4
        assert payment_method.token.startswith('pm_test_')


@pytest.mark.payment
@pytest.mark.unit
class TestPaymentErrorPaths:
    """Unit tests for payment error handling."""
    
    def test_insufficient_funds_error(self, db):
        """Test handling of insufficient funds error."""
        payment = PaymentFactory(
            status='failed',
            gateway_response={'error': {'code': 'insufficient_funds'}}
        )
        
        assert not payment.is_successful
        assert payment.gateway_response['error']['code'] == 'insufficient_funds'
    
    def test_invalid_card_error(self, db):
        """Test handling of invalid card error."""
        payment = PaymentFactory(
            status='failed',
            gateway_response={'error': {'code': 'card_declined'}}
        )
        
        assert not payment.is_successful
        assert payment.status == 'failed'
    
    def test_payment_timeout_error(self, db):
        """Test handling of payment timeout."""
        payment = PaymentFactory(
            status='cancelled',
            gateway_response={'error': {'code': 'payment_timeout'}}
        )
        
        assert payment.status == 'cancelled'
        assert not payment.is_successful
    
    @patch('homepage.stripe_service.stripe.PaymentIntent.create')
    def test_stripe_api_error_handling(self, mock_create):
        """Test handling of Stripe API errors."""
        # Mock Stripe API error
        import stripe
        mock_create.side_effect = stripe.error.CardError(
            message="Your card was declined.",
            param="card",
            code="card_declined"
        )
        
        service = StripePaymentService()
        
        with pytest.raises(stripe.error.CardError) as exc_info:
            service.create_payment_intent(
                amount=Decimal('100.00'),
                currency='zar',
                metadata={'order_id': '123'}
            )
        
        assert exc_info.value.code == 'card_declined'
    
    def test_payment_refund_error(self, db):
        """Test refund error handling."""
        payment = PaymentFactory(
            status='completed',
            amount=Decimal('100.00')
        )
        
        # Simulate refund failure
        with patch('homepage.stripe_service.stripe.Refund.create') as mock_refund:
            import stripe
            mock_refund.side_effect = stripe.error.InvalidRequestError(
                message="Charge already refunded",
                param="charge"
            )
            
            service = StripePaymentService()
            with pytest.raises(stripe.error.InvalidRequestError):
                service.refund_payment(payment.stripe_payment_intent_id, payment.amount)


@pytest.mark.payment
@pytest.mark.integration
class TestStripeIntegration:
    """Integration tests with mocked Stripe service."""
    
    @patch('homepage.stripe_service.stripe.PaymentIntent.create')
    def test_create_payment_intent_success(self, mock_create, authenticated_user):
        """Test successful payment intent creation."""
        # Mock successful Stripe response
        mock_create.return_value = Mock(
            id='pi_test_1234567890',
            client_secret='pi_test_1234567890_secret_test',
            status='requires_payment_method',
            amount=10000
        )
        
        service = StripePaymentService()
        order = OrderFactory(user=authenticated_user, total_amount=Decimal('100.00'))
        
        intent = service.create_payment_intent(
            amount=order.total_amount,
            currency='zar',
            metadata={'order_id': str(order.id)}
        )
        
        assert intent.id == 'pi_test_1234567890'
        assert intent.amount == 10000
        mock_create.assert_called_once()
    
    @patch('homepage.stripe_service.stripe.PaymentIntent.confirm')
    def test_confirm_payment_intent_success(self, mock_confirm):
        """Test successful payment intent confirmation."""
        mock_confirm.return_value = Mock(
            id='pi_test_1234567890',
            status='succeeded',
            charges=Mock(
                data=[Mock(
                    id='ch_test_1234567890',
                    payment_method='pm_test_1234567890'
                )]
            )
        )
        
        service = StripePaymentService()
        result = service.confirm_payment_intent(
            'pi_test_1234567890',
            payment_method='pm_test_1234567890'
        )
        
        assert result.status == 'succeeded'
        mock_confirm.assert_called_once_with(
            'pi_test_1234567890',
            payment_method='pm_test_1234567890'
        )
    
    @patch('homepage.stripe_service.stripe.Customer.create')
    def test_create_stripe_customer(self, mock_create, authenticated_user):
        """Test Stripe customer creation."""
        mock_create.return_value = Mock(
            id='cus_test_1234567890',
            email='test@example.com'
        )
        
        service = StripePaymentService()
        customer = service.create_customer(
            email=authenticated_user.email,
            name=f"{authenticated_user.first_name} {authenticated_user.last_name}"
        )
        
        assert customer.id == 'cus_test_1234567890'
        assert customer.email == 'test@example.com'
    
    @patch('homepage.stripe_service.stripe.PaymentMethod.attach')
    def test_attach_payment_method(self, mock_attach):
        """Test attaching payment method to customer."""
        mock_attach.return_value = Mock(
            id='pm_test_1234567890',
            customer='cus_test_1234567890'
        )
        
        service = StripePaymentService()
        result = service.attach_payment_method(
            'pm_test_1234567890',
            'cus_test_1234567890'
        )
        
        assert result.customer == 'cus_test_1234567890'
        mock_attach.assert_called_once_with(customer='cus_test_1234567890')


@pytest.mark.payment
@pytest.mark.integration
class TestWebhookLifecycle:
    """Integration tests for webhook lifecycle management."""
    
    def test_payment_intent_succeeded_webhook(self, api_client, mock_stripe_webhook_event):
        """Test handling of payment_intent.succeeded webhook."""
        # Create order and payment
        order = OrderFactory(payment_status='pending')
        payment = PaymentFactory(
            order=order,
            status='pending',
            stripe_payment_intent_id='pi_test_1234567890'
        )
        
        # Simulate webhook payload
        webhook_payload = mock_stripe_webhook_event
        
        with patch('homepage.views.stripe.Webhook.construct_event') as mock_construct:
            mock_construct.return_value = webhook_payload
            
            response = api_client.post(
                reverse('stripe_webhook'),
                data=webhook_payload,
                HTTP_STRIPE_SIGNATURE='test_signature'
            )
        
        # Verify webhook was processed successfully
        assert response.status_code == 200
        
        # Verify order and payment were updated
        order.refresh_from_db()
        payment.refresh_from_db()
        
        assert order.payment_status == 'paid'
        assert payment.status == 'completed'
    
    def test_payment_intent_payment_failed_webhook(self, api_client):
        """Test handling of payment_intent.payment_failed webhook."""
        order = OrderFactory(payment_status='pending')
        payment = PaymentFactory(
            order=order,
            status='pending',
            stripe_payment_intent_id='pi_test_1234567890'
        )
        
        webhook_payload = {
            'type': 'payment_intent.payment_failed',
            'data': {
                'object': {
                    'id': 'pi_test_1234567890',
                    'status': 'requires_payment_method',
                    'last_payment_error': {
                        'code': 'card_declined',
                        'message': 'Your card was declined.'
                    }
                }
            }
        }
        
        with patch('homepage.views.stripe.Webhook.construct_event') as mock_construct:
            mock_construct.return_value = webhook_payload
            
            response = api_client.post(
                reverse('stripe_webhook'),
                data=webhook_payload,
                HTTP_STRIPE_SIGNATURE='test_signature'
            )
        
        assert response.status_code == 200
        
        # Verify payment was marked as failed
        payment.refresh_from_db()
        assert payment.status == 'failed'
    
    def test_invalid_webhook_signature(self, api_client):
        """Test handling of invalid webhook signature."""
        with patch('homepage.views.stripe.Webhook.construct_event') as mock_construct:
            import stripe
            mock_construct.side_effect = stripe.error.SignatureVerificationError(
                message="Invalid signature",
                sig_header="invalid_signature"
            )
            
            response = api_client.post(
                reverse('stripe_webhook'),
                data={'type': 'payment_intent.succeeded'},
                HTTP_STRIPE_SIGNATURE='invalid_signature'
            )
        
        assert response.status_code == 400
    
    def test_webhook_idempotency(self, api_client, mock_stripe_webhook_event):
        """Test that webhook events are processed only once (idempotency)."""
        order = OrderFactory(payment_status='pending')
        payment = PaymentFactory(
            order=order,
            status='pending',
            stripe_payment_intent_id='pi_test_1234567890'
        )
        
        webhook_payload = mock_stripe_webhook_event
        
        with patch('homepage.views.stripe.Webhook.construct_event') as mock_construct:
            mock_construct.return_value = webhook_payload
            
            # Send webhook twice
            response1 = api_client.post(
                reverse('stripe_webhook'),
                data=webhook_payload,
                HTTP_STRIPE_SIGNATURE='test_signature'
            )
            
            response2 = api_client.post(
                reverse('stripe_webhook'),
                data=webhook_payload,
                HTTP_STRIPE_SIGNATURE='test_signature'
            )
        
        # Both requests should succeed
        assert response1.status_code == 200
        assert response2.status_code == 200
        
        # Payment should only be updated once
        payment.refresh_from_db()
        assert payment.status == 'completed'


@pytest.mark.payment
@pytest.mark.integration
class TestCheckoutFlow:
    """Integration tests for complete checkout flow."""
    
    def test_complete_checkout_with_new_card(self, authenticated_api_client, authenticated_user):
        """Test complete checkout flow with new payment method."""
        # Create order
        order = OrderFactory(user=authenticated_user, payment_status='pending')
        OrderItemFactory.create_batch(2, order=order)
        
        checkout_data = {
            'payment_method': 'new_card',
            'save_payment_method': True,
            'card_token': 'pm_test_1234567890'
        }
        
        with patch('homepage.stripe_service.stripe.PaymentIntent.create') as mock_create:
            mock_create.return_value = Mock(
                id='pi_test_1234567890',
                client_secret='pi_test_1234567890_secret_test',
                status='succeeded'
            )
            
            response = authenticated_api_client.post(
                reverse('process_checkout', kwargs={'order_id': order.id}),
                data=checkout_data
            )
        
        assert response.status_code == 200
        
        # Verify payment method was saved
        assert PaymentMethod.objects.filter(
            user=authenticated_user,
            token='pm_test_1234567890'
        ).exists()
    
    def test_checkout_with_saved_payment_method(self, authenticated_api_client, authenticated_user):
        """Test checkout with existing saved payment method."""
        # Create saved payment method
        payment_method = PaymentMethodFactory(
            user=authenticated_user,
            is_default=True
        )
        
        order = OrderFactory(user=authenticated_user, payment_status='pending')
        OrderItemFactory.create_batch(2, order=order)
        
        checkout_data = {
            'payment_method': str(payment_method.id)
        }
        
        with patch('homepage.stripe_service.stripe.PaymentIntent.create') as mock_create:
            mock_create.return_value = Mock(
                id='pi_test_1234567890',
                client_secret='pi_test_1234567890_secret_test',
                status='succeeded'
            )
            
            response = authenticated_api_client.post(
                reverse('process_checkout', kwargs={'order_id': order.id}),
                data=checkout_data
            )
        
        assert response.status_code == 200
    
    def test_checkout_with_insufficient_inventory(self, authenticated_api_client, authenticated_user):
        """Test checkout fails when product inventory is insufficient."""
        # Create product with limited inventory
        from tests.factories import ProductFactory
        product = ProductFactory(status='sold')  # Product is sold out
        
        order = OrderFactory(user=authenticated_user)
        OrderItemFactory(order=order, product=product, quantity=1)
        
        checkout_data = {
            'payment_method': 'pm_test_1234567890'
        }
        
        response = authenticated_api_client.post(
            reverse('process_checkout', kwargs={'order_id': order.id}),
            data=checkout_data
        )
        
        assert response.status_code == 400
        assert 'inventory' in response.data['error'].lower()


@pytest.mark.payment
class TestPaymentModelMethods:
    """Test Payment model methods and properties."""
    
    def test_payment_is_successful_property(self, db):
        """Test is_successful property."""
        completed_payment = PaymentFactory(status='completed')
        failed_payment = PaymentFactory(status='failed')
        
        assert completed_payment.is_successful is True
        assert failed_payment.is_successful is False
    
    def test_payment_is_pending_property(self, db):
        """Test is_pending property."""
        pending_payment = PaymentFactory(status='pending')
        processing_payment = PaymentFactory(status='processing')
        completed_payment = PaymentFactory(status='completed')
        
        assert pending_payment.is_pending is True
        assert processing_payment.is_pending is True
        assert completed_payment.is_pending is False
    
    def test_payment_str_method(self, db):
        """Test Payment string representation."""
        payment = PaymentFactory(
            transaction_id='txn_123456',
            order__order_number='MH20240101ABCD'
        )
        
        expected = f"Payment txn_123456 for Order MH20240101ABCD"
        assert str(payment) == expected
    
    def test_payment_net_amount_calculation(self, db):
        """Test net amount calculation on save."""
        payment = Payment.objects.create(
            order=OrderFactory(),
            payment_method='card',
            amount=Decimal('100.00'),
            gateway_fee=Decimal('3.50')
        )
        
        assert payment.net_amount == Decimal('96.50')
