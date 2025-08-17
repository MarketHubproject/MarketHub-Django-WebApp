"""
Namespace URL configuration to provide both namespaced and non-namespaced access
"""
from django.urls import path, include
from . import views

app_name = 'homepage'

# Import the main urlpatterns from the main urls.py
from .urls import urlpatterns as main_patterns

# Create a new urlpatterns list for namespace support
urlpatterns = main_patterns
