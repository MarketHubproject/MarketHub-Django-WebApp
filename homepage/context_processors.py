"""
Context processors for the homepage app
Provides global template variables across all views
"""

from django.conf import settings
from .models import Cart, CartItem


def api_config(request):
    """
    Provides API configuration to all templates
    """
    return {
        'API_BASE_URL': getattr(settings, 'API_BASE_URL', 'http://127.0.0.1:8000/api/'),
        'FRONTEND_API_URL': getattr(settings, 'API_BASE_URL', 'http://127.0.0.1:8000/api/'),
    }


def app_config(request):
    """
    Provides general app configuration to all templates
    """
    return {
        'DEBUG': settings.DEBUG,
        'STATIC_URL': settings.STATIC_URL,
        'MEDIA_URL': settings.MEDIA_URL,
    }


def cart_context(request):
    """
    Add cart information to template context for authenticated users.
    """
    cart_count = 0
    cart_total = 0
    
    if request.user.is_authenticated:
        try:
            cart = Cart.objects.get(user=request.user)
            cart_count = cart.get_total_items()
            cart_total = cart.get_total_price()
        except Cart.DoesNotExist:
            # Cart doesn't exist yet, will be created when user adds first item
            pass
    
    return {
        'cart_count': cart_count,
        'cart_total': cart_total,
    }


def favorites_context(request):
    """
    Add favorites functionality to template context.
    Uses the products app's Favorite model to provide user's favorite product IDs.
    """
    user_favorites = []
    favorites_count = 0
    
    if request.user.is_authenticated:
        try:
            from products.models import Favorite
            user_favorites = list(Favorite.objects.filter(user=request.user).values_list('product_id', flat=True))
            favorites_count = len(user_favorites)
        except ImportError:
            # If products app is not available
            pass
    
    return {
        'user_favorites': user_favorites,
        'favorites_count': favorites_count,
    }
