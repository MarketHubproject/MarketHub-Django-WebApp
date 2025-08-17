"""
Payment API Views for MarketHub
Handles Stripe payment intent creation, webhooks, and payment processing
"""
import json
import logging
from decimal import Decimal
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.views.decorators.http import require_http_methods
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.views.decorators.cache import cache_control
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
import stripe
from django.conf import settings

from .models import Order, Payment
from .stripe_service import StripeService, StripeWebhookHandler

logger = logging.getLogger(__name__)


@method_decorator(ratelimit(key='user', rate='5/m', method='POST'), name='post')
@method_decorator(cache_control(no_cache=True, no_store=True, must_revalidate=True), name='dispatch')
class CreatePaymentIntentView(APIView):
    """
    Create a Stripe PaymentIntent for an order
    Includes rate limiting and security measures
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            # Get order ID from request
            order_id = request.data.get('order_id')
            amount = request.data.get('amount')
            currency = request.data.get('currency', 'zar')

            if not order_id and not amount:
                return Response(
                    {'error': 'Either order_id or amount is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # If order_id provided, get the order
            order = None
            if order_id:
                try:
                    order = Order.objects.get(id=order_id, user=request.user)
                    amount = order.total_amount
                except Order.DoesNotExist:
                    return Response(
                        {'error': 'Order not found or not accessible'},
                        status=status.HTTP_404_NOT_FOUND
                    )

            # Validate and convert amount
            if isinstance(amount, str):
                try:
                    amount = Decimal(amount)
                    if amount <= 0:
                        raise ValueError("Amount must be positive")
                    if amount > Decimal('10000.00'):  # Max amount limit
                        raise ValueError("Amount exceeds maximum limit")
                except (ValueError, TypeError):
                    return Response(
                        {'error': 'Invalid amount format or value'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Create or get Stripe customer
            customer = StripeService.get_or_create_customer(request.user)
            customer_id = customer.id if customer else None

            # Create payment intent using StripeService
            if order:
                intent = StripeService.create_payment_intent(order, customer_id)
            else:
                # Create payment intent without order (direct payment)
                try:
                    intent_data = {
                        'amount': int(amount * 100),  # Convert to cents
                        'currency': currency,
                        'automatic_payment_methods': {'enabled': True},
                        'metadata': {
                            'user_id': str(request.user.id),
                            'created_via': 'api'
                        }
                    }
                    
                    if customer_id:
                        intent_data['customer'] = customer_id
                        
                    intent = stripe.PaymentIntent.create(**intent_data)
                except stripe.error.StripeError as e:
                    logger.error(f"Stripe error: {e}")
                    return Response(
                        {'error': f'Payment service error: {str(e)}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            if not intent:
                return Response(
                    {'error': 'Failed to create payment intent'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            # Create Payment record if order exists
            if order:
                payment, created = Payment.objects.get_or_create(
                    order=order,
                    defaults={
                        'payment_method': 'card',
                        'amount': order.total_amount,
                        'currency': currency.upper(),
                        'status': 'pending',
                        'stripe_payment_intent_id': intent.id,
                        'stripe_customer_id': customer_id
                    }
                )
                
                if not created:
                    # Update existing payment record
                    payment.stripe_payment_intent_id = intent.id
                    payment.stripe_customer_id = customer_id
                    payment.save()

            return Response({
                'client_secret': intent.client_secret,
                'payment_intent_id': intent.id,
                'amount': intent.amount / 100,  # Convert back from cents
                'currency': intent.currency,
                'status': intent.status,
                'customer_id': customer_id
            })

        except Exception as e:
            logger.error(f"Error creating payment intent: {e}")
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PaymentIntentStatusView(APIView):
    """
    Get the status of a payment intent
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, payment_intent_id):
        try:
            intent = StripeService.retrieve_payment_intent(payment_intent_id)
            
            if not intent:
                return Response(
                    {'error': 'Payment intent not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Verify the payment intent belongs to the user
            if intent.metadata.get('user_id') != str(request.user.id):
                # Also check if it's associated with user's order
                try:
                    order_id = intent.metadata.get('order_id')
                    if order_id:
                        Order.objects.get(id=order_id, user=request.user)
                    else:
                        return Response(
                            {'error': 'Access denied'},
                            status=status.HTTP_403_FORBIDDEN
                        )
                except Order.DoesNotExist:
                    return Response(
                        {'error': 'Access denied'},
                        status=status.HTTP_403_FORBIDDEN
                    )

            return Response({
                'payment_intent_id': intent.id,
                'status': intent.status,
                'amount': intent.amount / 100,
                'currency': intent.currency,
                'client_secret': intent.client_secret,
                'last_payment_error': intent.last_payment_error
            })

        except Exception as e:
            logger.error(f"Error retrieving payment intent: {e}")
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@method_decorator(csrf_exempt, name='dispatch')
class StripeWebhookView(APIView):
    """
    Handle Stripe webhook events
    """
    authentication_classes = []  # Disable authentication for webhooks
    permission_classes = []

    def post(self, request):
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')

        if not sig_header:
            logger.error("Missing Stripe signature")
            return HttpResponse(status=400)

        try:
            event = StripeWebhookHandler.construct_event(payload, sig_header)
            if not event:
                return HttpResponse(status=400)

            # Handle the event
            handled = StripeWebhookHandler.handle_event(event)
            
            if handled:
                logger.info(f"Successfully processed webhook event: {event['type']}")
                return HttpResponse(status=200)
            else:
                logger.warning(f"Unhandled webhook event: {event['type']}")
                return HttpResponse(status=200)  # Still return 200 to prevent retries

        except Exception as e:
            logger.error(f"Webhook error: {e}")
            return HttpResponse(status=400)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@ratelimit(key='user', rate='10/m', method='POST')
@cache_control(no_cache=True, no_store=True, must_revalidate=True)
def confirm_payment_intent(request):
    """
    Confirm a payment intent with a payment method
    """
    try:
        payment_intent_id = request.data.get('payment_intent_id')
        payment_method_id = request.data.get('payment_method_id')

        if not payment_intent_id or not payment_method_id:
            return Response(
                {'error': 'payment_intent_id and payment_method_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Confirm the payment intent
        intent = StripeService.confirm_payment_intent(payment_intent_id, payment_method_id)

        if not intent:
            return Response(
                {'error': 'Failed to confirm payment intent'},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response({
            'payment_intent_id': intent.id,
            'status': intent.status,
            'amount': intent.amount / 100,
            'currency': intent.currency,
        })

    except Exception as e:
        logger.error(f"Error confirming payment intent: {e}")
        return Response(
            {'error': 'Internal server error'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_payment_method(request):
    """
    Save a payment method for future use
    """
    try:
        payment_method_id = request.data.get('payment_method_id')
        
        if not payment_method_id:
            return Response(
                {'error': 'payment_method_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Save the payment method
        payment_method = StripeService.save_payment_method(request.user, payment_method_id)

        if not payment_method:
            return Response(
                {'error': 'Failed to save payment method'},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response({
            'payment_method_id': payment_method.id,
            'card': {
                'brand': payment_method.card.brand,
                'last4': payment_method.card.last4,
                'exp_month': payment_method.card.exp_month,
                'exp_year': payment_method.card.exp_year,
            }
        })

    except Exception as e:
        logger.error(f"Error saving payment method: {e}")
        return Response(
            {'error': 'Internal server error'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_saved_payment_methods(request):
    """
    Get user's saved payment methods
    """
    try:
        # Get or create customer
        customer = StripeService.get_or_create_customer(request.user)
        
        if not customer:
            return Response({'payment_methods': []})

        # Get payment methods from Stripe
        payment_methods = StripeService.get_customer_payment_methods(customer.id)

        methods_data = []
        for pm in payment_methods:
            methods_data.append({
                'id': pm.id,
                'card': {
                    'brand': pm.card.brand,
                    'last4': pm.card.last4,
                    'exp_month': pm.card.exp_month,
                    'exp_year': pm.card.exp_year,
                },
                'created': pm.created
            })

        return Response({'payment_methods': methods_data})

    except Exception as e:
        logger.error(f"Error retrieving payment methods: {e}")
        return Response(
            {'error': 'Internal server error'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_payment_method(request, payment_method_id):
    """
    Remove a saved payment method
    """
    try:
        # Verify the payment method belongs to the user
        customer = StripeService.get_or_create_customer(request.user)
        if not customer:
            return Response(
                {'error': 'Customer not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Detach the payment method
        payment_method = StripeService.detach_payment_method(payment_method_id)

        if not payment_method:
            return Response(
                {'error': 'Failed to remove payment method'},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response({'success': True})

    except Exception as e:
        logger.error(f"Error removing payment method: {e}")
        return Response(
            {'error': 'Internal server error'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def refund_payment(request, payment_intent_id):
    """
    Process a refund for a payment
    """
    try:
        amount = request.data.get('amount')  # Optional partial refund amount
        reason = request.data.get('reason', 'requested_by_customer')

        # Verify the payment belongs to the user
        try:
            payment = Payment.objects.get(
                stripe_payment_intent_id=payment_intent_id,
                order__user=request.user
            )
        except Payment.DoesNotExist:
            return Response(
                {'error': 'Payment not found or access denied'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if payment is refundable
        if payment.status != 'completed':
            return Response(
                {'error': 'Payment must be completed to process refund'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Process the refund
        refund_amount = Decimal(amount) if amount else None
        refund = StripeService.create_refund(payment_intent_id, refund_amount, reason)

        if not refund:
            return Response(
                {'error': 'Failed to process refund'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update payment status if full refund
        if not refund_amount or refund_amount >= payment.amount:
            payment.status = 'refunded'
            payment.is_refunded = True
            payment.save()

            # Update order status
            payment.order.payment_status = 'refunded'
            payment.order.save()

        return Response({
            'refund_id': refund.id,
            'amount': refund.amount / 100,
            'currency': refund.currency,
            'status': refund.status,
            'reason': refund.reason
        })

    except Exception as e:
        logger.error(f"Error processing refund: {e}")
        return Response(
            {'error': 'Internal server error'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
