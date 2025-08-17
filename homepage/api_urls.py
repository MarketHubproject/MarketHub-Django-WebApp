from django.urls import path, include
from . import api_views
from . import api_views_payments

app_name = 'api'

urlpatterns = [
    # API Overview
    path('', api_views.api_overview, name='api_overview'),

    # Product endpoints - using both naming conventions for compatibility
    path('products/', api_views.ProductListCreateAPIView.as_view(), name='product_list_create'),
    path('products/', api_views.ProductListCreateAPIView.as_view(), name='product-list'),  # Test compatibility
    path('products/<int:pk>/', api_views.ProductDetailAPIView.as_view(), name='product_detail'),
    path('products/<int:pk>/', api_views.ProductDetailAPIView.as_view(), name='product-detail'),  # Test compatibility
    path('categories/', api_views.product_categories_api, name='product_categories'),

    # Cart endpoints
    path('cart/', api_views.CartAPIView.as_view(), name='cart_detail'),
    path('cart/', api_views.CartAPIView.as_view(), name='cart-detail'),  # Test compatibility
    path('cart/add/<int:product_id>/', api_views.add_to_cart_api, name='add_to_cart'),
    path('cart/item/<int:item_id>/', api_views.update_cart_item_api, name='update_cart_item'),

    # User endpoints
    path('profile/', api_views.user_profile_api, name='user_profile'),

    # Authentication endpoints
    path('login/', api_views.api_login, name='api_login'),
    path('logout/', api_views.api_logout, name='api_logout'),

    # DRF auth endpoints
    path('auth/', include('rest_framework.urls')),
    
    # Order endpoints
    path('orders/', api_views.OrderListCreateAPIView.as_view(), name='order-list'),
    path('orders/create/', api_views.OrderListCreateAPIView.as_view(), name='order-create'),  # Alias for tests
    path('orders/<int:pk>/', api_views.OrderDetailAPIView.as_view(), name='order-detail'),
    
    # Review endpoints
    path('reviews/', api_views.ReviewListCreateAPIView.as_view(), name='review-list'),
    path('reviews/<int:pk>/', api_views.ReviewDetailAPIView.as_view(), name='review-detail'),
    
    # Favorite endpoints
    path('favorites/', api_views.FavoriteListAPIView.as_view(), name='favorite-list'),
    path('favorites/<int:pk>/', api_views.FavoriteDetailAPIView.as_view(), name='favorite-detail'),
    path('favorites/toggle/', api_views.toggle_favorite_api, name='favorite-toggle'),
    
    # Payment endpoints
    path('payments/create-intent/', api_views_payments.CreatePaymentIntentView.as_view(), name='create-payment-intent'),
    path('payments/intent/<str:payment_intent_id>/status/', api_views_payments.PaymentIntentStatusView.as_view(), name='payment-intent-status'),
    path('payments/confirm-intent/', api_views_payments.confirm_payment_intent, name='confirm-payment-intent'),
    path('payments/save-method/', api_views_payments.save_payment_method, name='save-payment-method'),
    path('payments/methods/', api_views_payments.get_saved_payment_methods, name='get-payment-methods'),
    path('payments/methods/<str:payment_method_id>/', api_views_payments.remove_payment_method, name='remove-payment-method'),
    path('payments/refund/<str:payment_intent_id>/', api_views_payments.refund_payment, name='refund-payment'),
    
    # Webhook endpoints
    path('webhooks/stripe/', api_views_payments.StripeWebhookView.as_view(), name='stripe-webhook'),
]
