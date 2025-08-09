from django.urls import path, include
from . import api_views

app_name = 'api'

urlpatterns = [
    # API Overview
    path('', api_views.api_overview, name='api_overview'),
    
    # Product endpoints
    path('products/', api_views.ProductListCreateAPIView.as_view(), name='product_list_create'),
    path('products/<int:pk>/', api_views.ProductDetailAPIView.as_view(), name='product_detail'),
    path('categories/', api_views.product_categories_api, name='product_categories'),
    
    # Cart endpoints
    path('cart/', api_views.CartAPIView.as_view(), name='cart_detail'),
    path('cart/add/<int:product_id>/', api_views.add_to_cart_api, name='add_to_cart'),
    path('cart/item/<int:item_id>/', api_views.update_cart_item_api, name='update_cart_item'),
    
    # User endpoints
    path('profile/', api_views.user_profile_api, name='user_profile'),
    
    # Authentication endpoints
    path('login/', api_views.api_login, name='api_login'),
    path('logout/', api_views.api_logout, name='api_logout'),
    
    # DRF auth endpoints
    path('auth/', include('rest_framework.urls')),
]
