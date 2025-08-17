from django.conf.urls.static import static
from django.conf import settings
from django.urls import path
from django.contrib.auth import views as auth_views
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    # Special Pages
    path('daily-deals/', views.daily_deals, name='daily_deals'),
    path('promotions/', views.promotions, name='promotions'),
    path('signup/', views.signup, name='signup'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('products/', views.product_list, name='product_list'),
    path('products/new/', views.create_product, name='create_product'),
    path('products/add/', views.create_product, name='add_product'),  # Alias for tests
    path('products/<int:pk>/', views.product_detail, name='product_detail'),
    path('products/<int:pk>/edit/', views.edit_product, name='edit_product'),
    path('products/<int:pk>/delete/', views.delete_product, name='delete_product'),
    # Enhanced Products functionality (from products app)
    path('products/enhanced/', views.products_product_list, name='products_product_list'),
    path('products/enhanced/<int:pk>/', views.products_product_detail, name='products_product_detail'),
    path('products/enhanced/create/', views.products_create_product, name='products_create_product'),
    path('products/toggle-favorite/<int:product_id>/', views.toggle_favorite, name='toggle_favorite'),
    path('favorites/add/<int:product_id>/', views.toggle_favorite, name='add_to_favorites'),  # Alias for adding to favorites
    path('favorites/remove/<int:product_id>/', views.toggle_favorite, name='remove_from_favorites'),  # Alias for removing from favorites
    path('favorites/', views.favorites_list, name='favorites_list'),
    path('favorites/', views.favorites_list, name='favorites'),  # Alias for tests
    path('products/<int:product_id>/add-review/', views.add_review, name='add_review'),
    path('products/<int:product_id>/update-review/', views.update_review, name='update_review'),
    path('seller/dashboard/', views.seller_dashboard, name='seller_dashboard'),
    path('seller/products/<int:product_id>/update-status/', views.update_product_status, name='update_product_status'),
    # Cart URLs
    path('cart/', views.view_cart, name='view_cart'),
    path('cart/', views.view_cart, name='cart'),  # Alias for tests
    path('cart/add/<int:product_id>/', views.add_to_cart, name='add_to_cart'),
    path('cart/remove/<int:item_id>/', views.remove_from_cart, name='remove_from_cart'),
    path('cart/update/<int:item_id>/', views.update_cart_item, name='update_cart_item'),
    # Category URLs
    path('category/<slug:slug>/', views.category_view, name='category_detail'),
    # Newsletter signup
    path('newsletter/signup/', views.newsletter_signup, name='newsletter_signup'),
    # Advanced search and saved searches
    path('search/advanced/', views.advanced_search, name='advanced_search'),
    path('search/save/', views.save_search, name='save_search'),
    path('saved-search/delete/<int:search_id>/', views.delete_saved_search, name='delete_saved_search'),
    
    # Analytics URLs
    path('analytics/product/<int:product_id>/', views.product_analytics, name='product_analytics'),
    path('analytics/dashboard/', views.seller_analytics_dashboard, name='seller_analytics_dashboard'),
    
    # Messaging URLs
    path('message/send/<int:product_id>/', views.send_message, name='send_message'),
    path('notifications/', views.notifications_list, name='notifications_list'),
    path('notifications/mark-all-read/', views.mark_all_notifications_read, name='mark_all_notifications_read'),
    
    # Recommendations
    path('recommendations/', views.get_recommendations, name='recommendations'),
    
    # Checkout and Orders
    path('checkout/', views.checkout, name='checkout'),
    path('order-confirmation/<int:order_id>/', views.order_confirmation, name='order_confirmation'),
    path('order-history/', views.order_history, name='order_history'),
    path('my-orders/', views.order_history, name='my_orders'),  # Alias for tests
    path('profile/', views.user_profile, name='profile'),  # User profile view
    path('my-products/', views.user_products, name='my_products'),  # User's products
    path('order/<int:order_id>/', views.order_detail, name='order_detail'),
    path('order/<int:pk>/', views.order_detail, name='order_detail_pk'),  # Alias for tests using pk
    
    # Payment URLs
    path('payment/<int:order_id>/', views.checkout_payment, name='checkout_payment'),
    path('payment-methods/', views.payment_methods, name='payment_methods'),
    path('payment-methods/delete/<int:method_id>/', views.delete_payment_method, name='delete_payment_method'),
    path('payment-methods/set-default/<int:method_id>/', views.set_default_payment_method, name='set_default_payment_method'),
    
    # Stripe Payment URLs
    path('api/stripe/create-payment-intent/<int:order_id>/', views.create_stripe_payment_intent, name='create_stripe_payment_intent'),
    path('api/stripe/confirm-payment/', views.confirm_stripe_payment, name='confirm_stripe_payment'),
    path('api/stripe/webhook/', views.stripe_webhook, name='stripe_webhook'),
    
    # Product Draft URLs
    path('drafts/', views.product_drafts_list, name='product_drafts_list'),
    path('drafts/save/', views.save_product_draft, name='save_product_draft'),
    path('drafts/<int:draft_id>/edit/', views.edit_product_draft, name='edit_product_draft'),
    path('drafts/<int:draft_id>/convert/', views.convert_draft_to_product, name='convert_draft_to_product'),
    path('drafts/<int:draft_id>/delete/', views.delete_product_draft, name='delete_product_draft'),
    path('drafts/auto-save/', views.auto_save_draft, name='auto_save_draft'),
    
    # API URLs
    path('api/product/<int:product_id>/quick-view/', views.quick_view_product, name='quick_view_product'),
    
    # Testing URLs
    path('test_icons/', views.test_icons, name='test_icons'),
    
    # Style Guide
    path('style-guide/', views.style_guide, name='style_guide'),
]


urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
