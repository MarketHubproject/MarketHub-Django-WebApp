"""
Payment Processing Views for MarketHub
Handles checkout, payment confirmation, and order completion
"""
import json
import logging
from decimal import Decimal
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt, csrf_protect
from django.views.decorators.http import require_http_methods, require_POST
from django.views.decorators.cache import cache_control
from django.http import JsonResponse, HttpResponse
from django.contrib import messages
from django.conf import settings
from django.urls import reverse
from django.db import transaction
from django.utils import timezone
from django_ratelimit.decorators import ratelimit

from .models import Order, Cart, Payment, PaymentMethod
from .stripe_service import StripeService, StripeWebhookHandler

logger = logging.getLogger(__name__)


@login_required
@cache_control(no_cache=True, no_store=True, must_revalidate=True)
def checkout_view(request, order_id):
    """
    Display the checkout page for an order
    """
    order = get_object_or_404(Order, id=order_id, user=request.user)
    
    # Get user's saved payment methods
    customer = StripeService.get_or_create_customer(request.user)
    saved_payment_methods = []
    
    if customer:
        stripe_methods = StripeService.get_customer_payment_methods(customer.id)
        saved_payment_methods = [
            {
                'id': pm.id,
                'card': {
                    'brand': pm.card.brand,
                    'last4': pm.card.last4,
                    'exp_month': pm.card.exp_month,
                    'exp_year': pm.card.exp_year,
                }
            }
            for pm in stripe_methods
        ]

    context = {
        'order': order,
        'stripe_public_key': settings.STRIPE_PUBLISHABLE_KEY,
        'saved_payment_methods': saved_payment_methods,
        'customer_id': customer.id if customer else None,
    }
    
    return render(request, 'homepage/checkout_payment.html', context)


@login_required
@require_POST
@csrf_protect
@ratelimit(key='user', rate='5/m', method='POST')
@cache_control(no_cache=True, no_store=True, must_revalidate=True)
def process_payment(request, order_id):
    """
    Process payment for an order
    """
    order = get_object_or_404(Order, id=order_id, user=request.user)
    
    try:
        data = json.loads(request.body)
        payment_method_id = data.get('payment_method_id')
        save_payment_method = data.get('save_payment_method', False)
        
        if not payment_method_id:
            return JsonResponse({
                'success': False,
                'error': 'Payment method is required'
            }, status=400)

        # Create or get customer
        customer = StripeService.get_or_create_customer(request.user)
        
        # Create payment intent
        intent = StripeService.create_payment_intent(order, customer.id if customer else None)
        
        if not intent:
            return JsonResponse({
                'success': False,
                'error': 'Failed to create payment intent'
            }, status=500)

        # Create Payment record
        payment, created = Payment.objects.get_or_create(
            order=order,
            defaults={
                'payment_method': 'card',
                'amount': order.total_amount,
                'currency': 'ZAR',
                'status': 'processing',
                'stripe_payment_intent_id': intent.id,
                'stripe_customer_id': customer.id if customer else None
            }
        )

        # Confirm payment intent
        confirmed_intent = StripeService.confirm_payment_intent(intent.id, payment_method_id)
        
        if not confirmed_intent:
            payment.status = 'failed'
            payment.save()
            
            return JsonResponse({
                'success': False,
                'error': 'Payment confirmation failed'
            }, status=400)

        # Save payment method if requested
        if save_payment_method and customer:
            StripeService.save_payment_method(request.user, payment_method_id)

        # Handle different payment statuses
        if confirmed_intent.status == 'succeeded':
            # Payment successful
            payment.status = 'completed'
            payment.processed_at = timezone.now()
            payment.save()
            
            # Update order
            order.payment_status = 'paid'
            order.status = 'processing'
            order.save()
            
            # Clear user's cart
            try:
                cart = Cart.objects.get(user=request.user)
                cart.items.all().delete()
            except Cart.DoesNotExist:
                pass
            
            return JsonResponse({
                'success': True,
                'payment_intent_id': confirmed_intent.id,
                'status': confirmed_intent.status,
                'redirect_url': reverse('order_confirmation', kwargs={'order_id': order.id})
            })
            
        elif confirmed_intent.status == 'requires_action':
            # 3D Secure or other authentication required
            return JsonResponse({
                'success': True,
                'requires_action': True,
                'client_secret': confirmed_intent.client_secret,
                'payment_intent_id': confirmed_intent.id
            })
            
        else:
            # Payment failed or other status
            payment.status = 'failed'
            payment.save()
            
            error_message = 'Payment failed'
            if confirmed_intent.last_payment_error:
                error_message = confirmed_intent.last_payment_error.get('message', error_message)
            
            return JsonResponse({
                'success': False,
                'error': error_message
            }, status=400)

    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Invalid request format'
        }, status=400)
    except Exception as e:
        logger.error(f"Payment processing error: {e}")
        return JsonResponse({
            'success': False,
            'error': 'Payment processing failed. Please try again.'
        }, status=500)


@login_required
@cache_control(no_cache=True, no_store=True, must_revalidate=True)
def order_confirmation(request, order_id):
    """
    Display order confirmation page after successful payment
    """
    order = get_object_or_404(Order, id=order_id, user=request.user)
    
    if order.payment_status != 'paid':
        messages.warning(request, 'This order has not been paid yet.')
        return redirect('checkout', order_id=order.id)
    
    context = {
        'order': order,
    }
    
    return render(request, 'homepage/order_confirmation.html', context)


@login_required
def payment_status(request, payment_intent_id):
    """
    Check payment status via AJAX
    """
    try:
        # Get the payment intent from Stripe
        intent = StripeService.retrieve_payment_intent(payment_intent_id)
        
        if not intent:
            return JsonResponse({
                'success': False,
                'error': 'Payment intent not found'
            }, status=404)

        # Update local payment record if exists
        try:
            payment = Payment.objects.get(stripe_payment_intent_id=payment_intent_id)
            
            if intent.status == 'succeeded' and payment.status != 'completed':
                payment.status = 'completed'
                payment.processed_at = timezone.now()
                payment.save()
                
                # Update order
                order = payment.order
                order.payment_status = 'paid'
                order.status = 'processing'
                order.save()
                
        except Payment.DoesNotExist:
            pass

        return JsonResponse({
            'success': True,
            'status': intent.status,
            'amount': intent.amount / 100,
            'currency': intent.currency
        })

    except Exception as e:
        logger.error(f"Payment status check error: {e}")
        return JsonResponse({
            'success': False,
            'error': 'Failed to check payment status'
        }, status=500)


@csrf_exempt
@require_POST
def stripe_webhook(request):
    """
    Handle Stripe webhook events
    """
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
            return HttpResponse(status=200)

    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return HttpResponse(status=400)


@login_required
def saved_payment_methods(request):
    """
    Display user's saved payment methods
    """
    customer = StripeService.get_or_create_customer(request.user)
    payment_methods = []
    
    if customer:
        stripe_methods = StripeService.get_customer_payment_methods(customer.id)
        payment_methods = [
            {
                'id': pm.id,
                'card': {
                    'brand': pm.card.brand.title(),
                    'last4': pm.card.last4,
                    'exp_month': pm.card.exp_month,
                    'exp_year': pm.card.exp_year,
                },
                'created': pm.created
            }
            for pm in stripe_methods
        ]

    context = {
        'payment_methods': payment_methods,
    }
    
    return render(request, 'homepage/saved_payment_methods.html', context)


@login_required
@require_POST
def remove_payment_method(request, payment_method_id):
    """
    Remove a saved payment method
    """
    try:
        # Verify the payment method belongs to the user
        customer = StripeService.get_or_create_customer(request.user)
        if not customer:
            messages.error(request, 'Customer not found.')
            return redirect('saved_payment_methods')

        # Detach the payment method
        payment_method = StripeService.detach_payment_method(payment_method_id)

        if payment_method:
            messages.success(request, 'Payment method removed successfully.')
        else:
            messages.error(request, 'Failed to remove payment method.')

    except Exception as e:
        logger.error(f"Error removing payment method: {e}")
        messages.error(request, 'An error occurred while removing the payment method.')

    return redirect('saved_payment_methods')


@login_required
def initiate_refund(request, order_id):
    """
    Initiate a refund for an order (admin or customer service use)
    """
    order = get_object_or_404(Order, id=order_id, user=request.user)
    
    try:
        payment = order.payment
        
        if payment.status != 'completed':
            messages.error(request, 'Only completed payments can be refunded.')
            return redirect('order_detail', order_id=order.id)
        
        if payment.is_refunded:
            messages.warning(request, 'This payment has already been refunded.')
            return redirect('order_detail', order_id=order.id)

        # Create refund through Stripe
        refund = StripeService.create_refund(payment.stripe_payment_intent_id)
        
        if refund:
            # Update payment and order status
            payment.status = 'refunded'
            payment.is_refunded = True
            payment.save()
            
            order.payment_status = 'refunded'
            order.status = 'cancelled'
            order.save()
            
            messages.success(request, f'Refund processed successfully. Refund ID: {refund.id}')
        else:
            messages.error(request, 'Failed to process refund. Please contact support.')

    except Payment.DoesNotExist:
        messages.error(request, 'Payment record not found.')
    except Exception as e:
        logger.error(f"Refund error: {e}")
        messages.error(request, 'An error occurred while processing the refund.')

    return redirect('order_detail', order_id=order.id)


@login_required
@require_http_methods(["GET", "POST"])
def quick_checkout(request):
    """
    Quick checkout for cart items
    """
    try:
        cart = Cart.objects.get(user=request.user)
        cart_items = cart.items.all()
        
        if not cart_items:
            messages.error(request, 'Your cart is empty.')
            return redirect('cart')
        
        if request.method == 'POST':
            # Create order from cart
            with transaction.atomic():
                # Calculate totals
                subtotal = cart.get_total_price()
                shipping_cost = Decimal('0.00')  # Free shipping for now
                tax_amount = subtotal * Decimal('0.15')  # 15% VAT
                total_amount = subtotal + shipping_cost + tax_amount
                
                # Create order
                order = Order.objects.create(
                    user=request.user,
                    email=request.user.email,
                    first_name=request.user.first_name or 'Customer',
                    last_name=request.user.last_name or '',
                    address_line_1=request.POST.get('address', ''),
                    city=request.POST.get('city', ''),
                    province=request.POST.get('province', ''),
                    postal_code=request.POST.get('postal_code', ''),
                    phone=request.POST.get('phone', ''),
                    subtotal=subtotal,
                    shipping_cost=shipping_cost,
                    tax_amount=tax_amount,
                    total_amount=total_amount
                )
                
                # Create order items
                for cart_item in cart_items:
                    order.items.create(
                        product=cart_item.product,
                        quantity=cart_item.quantity,
                        price=cart_item.product.price
                    )
                
                # Redirect to checkout
                return redirect('checkout', order_id=order.id)
        
        # GET request - show quick checkout form
        total = cart.get_total_price()
        tax = total * Decimal('0.15')
        grand_total = total + tax
        
        context = {
            'cart': cart,
            'cart_items': cart_items,
            'total': total,
            'tax': tax,
            'grand_total': grand_total,
        }
        
        return render(request, 'homepage/quick_checkout.html', context)
        
    except Cart.DoesNotExist:
        messages.error(request, 'Cart not found.')
        return redirect('homepage')


def payment_success(request):
    """
    Generic payment success page
    """
    return render(request, 'homepage/payment_success.html')


def payment_cancelled(request):
    """
    Payment cancelled page
    """
    return render(request, 'homepage/payment_cancelled.html')
