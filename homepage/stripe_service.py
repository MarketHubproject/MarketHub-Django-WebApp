import stripe
import logging
from decimal import Decimal
from django.conf import settings
from django.contrib.auth.models import User
from .models import Payment, Order

# Configure Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

logger = logging.getLogger(__name__)


class StripeService:
    """Service class to handle Stripe payment operations"""
    
    @staticmethod
    def create_payment_intent(order, customer_id=None):
        """
        Create a Stripe PaymentIntent for an order
        """
        try:
            # Convert amount to cents (Stripe expects amounts in smallest currency unit)
            amount_cents = int(order.total_amount * 100)
            
            intent_data = {
                'amount': amount_cents,
                'currency': 'zar',  # South African Rand
                'automatic_payment_methods': {
                    'enabled': True,
                },
                'metadata': {
                    'order_id': str(order.id),
                    'order_number': order.order_number,
                    'user_id': str(order.user.id),
                }
            }
            
            if customer_id:
                intent_data['customer'] = customer_id
            
            intent = stripe.PaymentIntent.create(**intent_data)
            
            logger.info(f"Created PaymentIntent {intent.id} for order {order.order_number}")
            return intent
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating PaymentIntent: {e}")
            return None
    
    @staticmethod
    def get_or_create_customer(user):
        """
        Get or create a Stripe customer for a user
        """
        try:
            # Check if we already have a customer ID stored
            payments_with_customer = Payment.objects.filter(
                order__user=user,
                stripe_customer_id__isnull=False
            ).first()
            
            if payments_with_customer:
                try:
                    # Verify the customer still exists in Stripe
                    customer = stripe.Customer.retrieve(payments_with_customer.stripe_customer_id)
                    return customer
                except stripe.error.InvalidRequestError:
                    # Customer doesn't exist anymore, create a new one
                    pass
            
            # Create new customer
            customer = stripe.Customer.create(
                email=user.email,
                name=f"{user.first_name} {user.last_name}".strip() or user.username,
                metadata={'user_id': str(user.id)}
            )
            
            logger.info(f"Created Stripe customer {customer.id} for user {user.username}")
            return customer
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating customer: {e}")
            return None
    
    @staticmethod
    def confirm_payment_intent(payment_intent_id, payment_method_id):
        """
        Confirm a PaymentIntent with a payment method
        """
        try:
            intent = stripe.PaymentIntent.confirm(
                payment_intent_id,
                payment_method=payment_method_id
            )
            return intent
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error confirming PaymentIntent: {e}")
            return None
    
    @staticmethod
    def retrieve_payment_intent(payment_intent_id):
        """
        Retrieve a PaymentIntent from Stripe
        """
        try:
            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            return intent
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error retrieving PaymentIntent: {e}")
            return None
    
    @staticmethod
    def create_refund(payment_intent_id, amount=None, reason=None):
        """
        Create a refund for a payment
        """
        try:
            refund_data = {
                'payment_intent': payment_intent_id,
                'reason': reason or 'requested_by_customer'
            }
            
            if amount:
                # Amount in cents
                refund_data['amount'] = int(amount * 100)
            
            refund = stripe.Refund.create(**refund_data)
            logger.info(f"Created refund {refund.id} for PaymentIntent {payment_intent_id}")
            return refund
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating refund: {e}")
            return None
    
    @staticmethod
    def save_payment_method(user, payment_method_id):
        """
        Save a payment method to a customer
        """
        try:
            customer = StripeService.get_or_create_customer(user)
            if not customer:
                return None
            
            # Attach payment method to customer
            payment_method = stripe.PaymentMethod.attach(
                payment_method_id,
                customer=customer.id
            )
            
            logger.info(f"Saved payment method {payment_method_id} for user {user.username}")
            return payment_method
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error saving payment method: {e}")
            return None
    
    @staticmethod
    def get_customer_payment_methods(customer_id):
        """
        Get all payment methods for a customer
        """
        try:
            payment_methods = stripe.PaymentMethod.list(
                customer=customer_id,
                type='card'
            )
            return payment_methods.data
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error retrieving payment methods: {e}")
            return []
    
    @staticmethod
    def detach_payment_method(payment_method_id):
        """
        Remove a payment method from a customer
        """
        try:
            payment_method = stripe.PaymentMethod.detach(payment_method_id)
            logger.info(f"Detached payment method {payment_method_id}")
            return payment_method
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error detaching payment method: {e}")
            return None
    
    @staticmethod
    def handle_webhook_event(event):
        """
        Handle Stripe webhook events
        """
        event_type = event['type']
        
        if event_type == 'payment_intent.succeeded':
            return StripeService._handle_payment_succeeded(event['data']['object'])
        elif event_type == 'payment_intent.payment_failed':
            return StripeService._handle_payment_failed(event['data']['object'])
        elif event_type == 'charge.dispute.created':
            return StripeService._handle_dispute_created(event['data']['object'])
        elif event_type == 'invoice.payment_succeeded':
            return StripeService._handle_invoice_payment_succeeded(event['data']['object'])
        else:
            logger.info(f"Unhandled webhook event type: {event_type}")
            return False
    
    @staticmethod
    def _handle_payment_succeeded(payment_intent):
        """Handle successful payment"""
        try:
            payment = Payment.objects.get(stripe_payment_intent_id=payment_intent['id'])
            payment.status = 'completed'
            payment.gateway_response = payment_intent
            payment.save()
            
            # Update order status
            order = payment.order
            order.payment_status = 'paid'
            order.status = 'processing'
            order.save()
            
            logger.info(f"Payment succeeded for order {order.order_number}")
            return True
            
        except Payment.DoesNotExist:
            logger.error(f"Payment not found for PaymentIntent {payment_intent['id']}")
            return False
    
    @staticmethod
    def _handle_payment_failed(payment_intent):
        """Handle failed payment"""
        try:
            payment = Payment.objects.get(stripe_payment_intent_id=payment_intent['id'])
            payment.status = 'failed'
            payment.gateway_response = payment_intent
            payment.save()
            
            # Update order status
            order = payment.order
            order.payment_status = 'failed'
            order.save()
            
            logger.info(f"Payment failed for order {order.order_number}")
            return True
            
        except Payment.DoesNotExist:
            logger.error(f"Payment not found for PaymentIntent {payment_intent['id']}")
            return False
    
    @staticmethod
    def _handle_dispute_created(charge):
        """Handle charge dispute/chargeback"""
        try:
            # Find payment by charge ID (would need to store charge ID in payment model)
            logger.warning(f"Dispute created for charge {charge['id']}")
            # TODO: Implement dispute handling logic
            return True
        except Exception as e:
            logger.error(f"Error handling dispute: {e}")
            return False
    
    @staticmethod
    def _handle_invoice_payment_succeeded(invoice):
        """Handle successful invoice payment (for subscriptions if implemented)"""
        logger.info(f"Invoice payment succeeded: {invoice['id']}")
        return True


class StripeWebhookHandler:
    """Handler for Stripe webhook events"""
    
    @staticmethod
    def construct_event(payload, sig_header):
        """
        Construct and verify webhook event
        """
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
            return event
        except ValueError:
            logger.error("Invalid webhook payload")
            return None
        except stripe.error.SignatureVerificationError:
            logger.error("Invalid webhook signature")
            return None
    
    @staticmethod
    def handle_event(event):
        """
        Route webhook event to appropriate handler
        """
        return StripeService.handle_webhook_event(event)
