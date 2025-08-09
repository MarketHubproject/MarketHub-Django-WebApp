from django.urls import path
from . import views

urlpatterns = [
    path('', views.product_list, name='product_list'),
    path('<int:pk>/', views.product_detail, name='product_detail'),
    path('new/', views.create_product, name='create_product'),
    path('<int:product_id>/toggle-favorite/', views.toggle_favorite, name='toggle_favorite'),
    path('favorites/', views.favorites_list, name='favorites_list'),
    path('<int:product_id>/add-review/', views.add_review, name='add_review'),
    path('<int:product_id>/update-review/', views.update_review, name='update_review'),
    path('dashboard/', views.seller_dashboard, name='seller_dashboard'),
    path('<int:product_id>/update-status/', views.update_product_status, name='update_product_status'),
]


