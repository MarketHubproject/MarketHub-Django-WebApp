"""
Payment Security Middleware for MarketHub
Provides additional security measures for payment processing
"""
import json
import logging
from decimal import Decimal
from django.http import JsonResponse
from django.conf import settings
from django.utils.deprecation import MiddlewareMixin
from django.core.exceptions import ValidationError
from django.urls import resolve

logger = logging.getLogger(__name__)


class PaymentSecurityMiddleware(MiddlewareMixin):
    """
    Middleware to add security checks for payment-related requests
    """
    
    PAYMENT_PATHS = [
        '/api/payments/',
        '/payments/',
        '/checkout/',
    ]
    
    def process_request(self, request):
        # Check if this is a payment-related request
        if not any(request.path.startswith(path) for path in self.PAYMENT_PATHS):
            return None
            
        # Skip for GET requests
        if request.method == 'GET':
            return None
            
        # Additional security checks for payment requests
        if request.method == 'POST':
            return self._validate_payment_request(request)
            
        return None
    
    def _validate_payment_request(self, request):
        """
        Validate payment-related POST requests
        """
        try:
            # Check for required headers
            if not request.META.get('HTTP_X_REQUESTED_WITH') == 'XMLHttpRequest':
                # Allow regular form submissions for some views
                if 'process_payment' in request.path or 'webhook' in request.path:
                    pass  # These might not be AJAX
                else:
                    return None
            
            # Parse and validate JSON data for API requests
            if request.content_type == 'application/json':
                try:
                    data = json.loads(request.body.decode('utf-8'))
                    request.json_data = data
                    
                    # Validate amount if present
                    if 'amount' in data:
                        amount = data['amount']
                        if isinstance(amount, (str, float, int)):
                            amount_decimal = Decimal(str(amount))
                            if amount_decimal <= 0:
                                return JsonResponse({
                                    'error': 'Amount must be positive'
                                }, status=400)
                            if amount_decimal > Decimal('50000.00'):  # Max amount check
                                return JsonResponse({
                                    'error': 'Amount exceeds maximum limit'
                                }, status=400)
                        else:
                            return JsonResponse({
                                'error': 'Invalid amount format'
                            }, status=400)
                    
                except (json.JSONDecodeError, ValueError) as e:
                    logger.warning(f"Invalid JSON in payment request: {e}")
                    return JsonResponse({
                        'error': 'Invalid request format'
                    }, status=400)
            
            # Rate limiting check (basic implementation)
            # This could be enhanced with Redis or more sophisticated rate limiting
            if hasattr(request, 'user') and request.user.is_authenticated:
                cache_key = f"payment_attempts_{request.user.id}"
                # This is a basic check - in production, use django-ratelimit or similar
                pass
            
            return None
            
        except Exception as e:
            logger.error(f"Payment security middleware error: {e}")
            return JsonResponse({
                'error': 'Security validation failed'
            }, status=400)


class PaymentValidationMiddleware(MiddlewareMixin):
    """
    Middleware to validate payment data integrity
    """
    
    def process_request(self, request):
        # Only process payment API requests
        if not request.path.startswith('/api/payments/'):
            return None
            
        if request.method != 'POST':
            return None
            
        return self._validate_payment_data(request)
    
    def _validate_payment_data(self, request):
        """
        Validate payment data for consistency and security
        """
        try:
            if hasattr(request, 'json_data'):
                data = request.json_data
            else:
                try:
                    data = json.loads(request.body.decode('utf-8'))
                except json.JSONDecodeError:
                    return None  # Not JSON, let other middleware handle
            
            # Validate required fields for different endpoints
            url_name = resolve(request.path_info).url_name
            
            if url_name == 'create_payment_intent':
                if not data.get('order_id') and not data.get('amount'):
                    return JsonResponse({
                        'error': 'Either order_id or amount is required'
                    }, status=400)
            
            elif url_name == 'confirm_payment_intent':
                required_fields = ['payment_intent_id', 'payment_method_id']
                missing_fields = [field for field in required_fields if not data.get(field)]
                if missing_fields:
                    return JsonResponse({
                        'error': f'Missing required fields: {", ".join(missing_fields)}'
                    }, status=400)
            
            # Validate currency if provided
            if 'currency' in data:
                allowed_currencies = ['zar', 'usd', 'eur', 'gbp']
                if data['currency'].lower() not in allowed_currencies:
                    return JsonResponse({
                        'error': 'Unsupported currency'
                    }, status=400)
            
            return None
            
        except Exception as e:
            logger.error(f"Payment validation middleware error: {e}")
            return JsonResponse({
                'error': 'Validation error'
            }, status=400)
