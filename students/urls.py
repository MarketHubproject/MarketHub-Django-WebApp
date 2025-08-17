"""
URL configuration for the student verification system.
"""

from django.urls import path, include
from django.views.generic import TemplateView

from .views import (
    StudentRegistrationView,
    StudentLoginView,
    student_dashboard,
    upload_student_id,
    upload_id_ajax,
    verify_email,
    verification_status,
    student_logout,
)

app_name = 'students'

urlpatterns = [
    # Authentication URLs
    path('register/', StudentRegistrationView.as_view(), name='register'),
    path('login/', StudentLoginView.as_view(), name='login'),
    path('logout/', student_logout, name='logout'),
    path('verify/<int:user_id>/', verify_email, name='verify_email'),
    
    # Dashboard and Profile URLs
    path('dashboard/', student_dashboard, name='dashboard'),
    path('upload-id/', upload_student_id, name='upload_id'),
    
    # API Endpoints
    path('api/upload-id/', upload_id_ajax, name='upload_id_ajax'),
    path('api/verification-status/', verification_status, name='verification_status'),
    
    # Static Pages
    path('', TemplateView.as_view(template_name='students/index.html'), name='index'),
    path('help/', TemplateView.as_view(template_name='students/help.html'), name='help'),
    path('privacy/', TemplateView.as_view(template_name='students/privacy.html'), name='privacy'),
]
