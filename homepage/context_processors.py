"""
Context processors for MarketHub homepage app
"""
from django.conf import settings
from django.urls import reverse_lazy
import os


def api_config(request):
    """
    Add API configuration to template context
    """
    return {
        'API_BASE_URL': getattr(settings, 'API_BASE_URL', '/api/'),
        'API_VERSION': getattr(settings, 'API_VERSION', 'v1'),
    }


def app_config(request):
    """
    Add application configuration to template context
    """
    return {
        'APP_NAME': getattr(settings, 'APP_NAME', 'MarketHub'),
        'APP_VERSION': getattr(settings, 'APP_VERSION', '1.0.0'),
        'DEBUG': getattr(settings, 'DEBUG', False),
        'ENVIRONMENT': getattr(settings, 'ENVIRONMENT', 'production'),
    }


def cart_context(request):
    """
    Add cart-related data to template context
    """
    # Initialize cart data
    cart_items = []
    cart_total = 0
    cart_count = 0
    
    # Get cart data from session if it exists
    if hasattr(request, 'session') and 'cart' in request.session:
        cart_data = request.session['cart']
        cart_items = cart_data.get('items', [])
        cart_total = cart_data.get('total', 0)
        cart_count = len(cart_items)
    
    return {
        'cart_items': cart_items,
        'cart_total': cart_total,
        'cart_count': cart_count,
    }


def stripe_context(request):
    """
    Add Stripe payment configuration to template context
    """
    # Get Stripe configuration from settings or environment
    stripe_publishable_key = getattr(settings, 'STRIPE_PUBLISHABLE_KEY', '')
    if not stripe_publishable_key:
        stripe_publishable_key = os.environ.get('STRIPE_PUBLISHABLE_KEY', '')
    
    payment_env = getattr(settings, 'PAYMENT_ENV', 'test')
    if not payment_env:
        payment_env = os.environ.get('PAYMENT_ENV', 'test')
    
    return {
        'STRIPE_PUBLISHABLE_KEY': stripe_publishable_key,
        'PAYMENT_ENV': payment_env,
        'STRIPE_ENABLED': bool(stripe_publishable_key),
    }