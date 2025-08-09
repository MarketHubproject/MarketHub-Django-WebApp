from django.urls import path
from django.contrib.auth import views as auth_views
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('signup/', views.signup, name='signup'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('products/', views.product_list, name='product_list'),
    path('products/new/', views.create_product, name='create_product'),
    path('products/<int:pk>/', views.product_detail, name='product_detail'),
    path('products/<int:pk>/edit/', views.edit_product, name='edit_product'),
    path('products/<int:pk>/delete/', views.delete_product, name='delete_product'),
    # Enhanced Products functionality (from products app)
    path('products/enhanced/', views.products_product_list, name='products_product_list'),
    path('products/enhanced/<int:pk>/', views.products_product_detail, name='products_product_detail'),
    path('products/enhanced/create/', views.products_create_product, name='products_create_product'),
    path('products/toggle-favorite/<int:product_id>/', views.toggle_favorite, name='toggle_favorite'),
    path('favorites/', views.favorites_list, name='favorites_list'),
    path('products/<int:product_id>/add-review/', views.add_review, name='add_review'),
    path('products/<int:product_id>/update-review/', views.update_review, name='update_review'),
    path('seller/dashboard/', views.seller_dashboard, name='seller_dashboard'),
    path('seller/products/<int:product_id>/update-status/', views.update_product_status, name='update_product_status'),
    # Cart URLs
    path('cart/', views.view_cart, name='view_cart'),
    path('cart/add/<int:product_id>/', views.add_to_cart, name='add_to_cart'),
    path('cart/remove/<int:item_id>/', views.remove_from_cart, name='remove_from_cart'),
    path('cart/update/<int:item_id>/', views.update_cart_item, name='update_cart_item'),
    # Category URLs
    path('category/<slug:slug>/', views.category_view, name='category_detail'),
    # Newsletter signup
    path('newsletter/signup/', views.newsletter_signup, name='newsletter_signup'),
    # Checkout URLs
    path('checkout/', views.checkout, name='checkout'),
    path('order-confirmation/<int:order_id>/', views.order_confirmation, name='order_confirmation'),
    path('order-history/', views.order_history, name='order_history'),
    path('order/<int:order_id>/', views.order_detail, name='order_detail'),
]

from django.conf import settings
from django.conf.urls.static import static

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
