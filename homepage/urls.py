from django.urls import path
from . import views

app_name = 'homepage'

urlpatterns = [
    # Main pages
    path('', views.home, name='home'),
    path('products/', views.product_list, name='product_list'),
    path('product/<slug:slug>/', views.product_detail, name='product_detail'),
    path('category/<slug:slug>/', views.category_detail, name='category_detail'),
    
    # Cart functionality
    path('cart/', views.cart_detail, name='cart_detail'),
    path('cart/add/', views.add_to_cart, name='add_to_cart'),
    path('cart/update/', views.update_cart_item, name='update_cart_item'),
    path('cart/remove/', views.remove_from_cart, name='remove_from_cart'),
    path('cart/count/', views.get_cart_count, name='get_cart_count'),
    
    # Checkout
    path('checkout/', views.checkout, name='checkout'),
    
    # User registration
    path('register/', views.register, name='register'),
    
    # Setup and Health check
    path('setup/', views.setup_admin, name='setup_admin'),
    path('health/', views.health_check, name='health_check'),
]
