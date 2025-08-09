from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create a router for API endpoints
router = DefaultRouter()
# Register your ViewSets here
# Example: router.register(r'your-endpoint', views.YourViewSet)

app_name = 'student_rewards'

urlpatterns = [
    # API URLs
    path('api/', include(router.urls)),

    # Regular views
    # Add your URL patterns here
    # Example: path('', views.index, name='index'),
]
