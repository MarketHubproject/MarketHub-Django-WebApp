from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import UserCreationForm
from django.contrib import messages
from django.core.mail import send_mail
from django.conf import settings
from django.urls import reverse
from django.http import JsonResponse, HttpResponseBadRequest
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils.decorators import method_decorator
from django.views import View
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.utils import timezone
import json
import logging
from PIL import Image
from io import BytesIO

from .models import StudentProfile, University, VerificationLog
from .forms import StudentRegistrationForm, StudentLoginForm, IDUploadForm
from .utils import extract_university_from_email, get_client_ip

logger = logging.getLogger(__name__)


class StudentRegistrationView(View):
    """Handle student registration with university email validation"""
    template_name = 'students/register.html'
    
    def get(self, request):
        if request.user.is_authenticated:
            return redirect('student_dashboard')
        
        form = StudentRegistrationForm()
        universities = University.objects.filter(is_active=True).order_by('name')
        
        return render(request, self.template_name, {
            'form': form,
            'universities': universities
        })
    
    def post(self, request):
        form = StudentRegistrationForm(request.POST)
        universities = University.objects.filter(is_active=True).order_by('name')
        
        if form.is_valid():
            try:
                # Create user but don't activate yet
                user = form.save(commit=False)
                user.is_active = False  # Require email verification first
                user.save()
                
                # Create student profile
                university_email = form.cleaned_data['university_email']
                university = form.cleaned_data['university']
                
                student_profile = StudentProfile.objects.create(
                    user=user,
                    university_email=university_email,
                    university=university,
                    expected_graduation_year=form.cleaned_data.get('expected_graduation_year'),
                    degree_program=form.cleaned_data.get('degree_program'),
                    upload_ip=get_client_ip(request),
                    upload_user_agent=request.META.get('HTTP_USER_AGENT', '')
                )
                
                # Log registration
                VerificationLog.objects.create(
                    student_profile=student_profile,
                    action='register',
                    result='success',
                    details={
                        'university': university.name,
                        'email': university_email
                    },
                    ip_address=get_client_ip(request),
                    user_agent=request.META.get('HTTP_USER_AGENT', '')
                )
                
                # Send verification email
                self._send_verification_email(user, student_profile)
                
                messages.success(
                    request,
                    f'Registration successful! Please check {university_email} for verification instructions.'
                )
                return redirect('student_login')
                
            except Exception as e:
                logger.error(f'Registration error for {form.cleaned_data.get("username")}: {str(e)}')
                messages.error(request, 'Registration failed. Please try again.')
        
        return render(request, self.template_name, {
            'form': form,
            'universities': universities
        })
    
    def _send_verification_email(self, user, student_profile):
        """Send email verification to student"""
        try:
            subject = 'Verify Your MarketHub Student Account'
            message = f"""
            Welcome to MarketHub!
            
            Please verify your student account by clicking the link below:
            http://{settings.ALLOWED_HOSTS[0]}/student/verify/{user.pk}/
            
            After email verification, you'll need to upload your student ID for account activation.
            
            Best regards,
            MarketHub Team
            """
            
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [student_profile.university_email],
                fail_silently=False,
            )
        except Exception as e:
            logger.error(f'Failed to send verification email to {student_profile.university_email}: {str(e)}')


class StudentLoginView(View):
    """Handle student login with verification requirements"""
    template_name = 'students/login.html'
    
    def get(self, request):
        if request.user.is_authenticated:
            return redirect('student_dashboard')
        
        form = StudentLoginForm()
        return render(request, self.template_name, {'form': form})
    
    def post(self, request):
        form = StudentLoginForm(request.POST)
        
        if form.is_valid():
            username = form.cleaned_data['username']
            password = form.cleaned_data['password']
            
            # Authenticate user
            user = authenticate(request, username=username, password=password)
            
            if user is not None:
                # Check if user has student profile
                try:
                    student_profile = user.student_profile
                    
                    # Check email verification
                    if not student_profile.email_verified:
                        messages.error(request, 'Please verify your email before logging in.')
                        return render(request, self.template_name, {'form': form})
                    
                    # Login successful
                    login(request, user)
                    
                    # Log successful login
                    VerificationLog.objects.create(
                        student_profile=student_profile,
                        action='login',
                        result='success',
                        ip_address=get_client_ip(request),
                        user_agent=request.META.get('HTTP_USER_AGENT', '')
                    )
                    
                    return redirect('student_dashboard')
                    
                except StudentProfile.DoesNotExist:
                    messages.error(request, 'Invalid student credentials.')
            else:
                messages.error(request, 'Invalid username or password.')
        
        return render(request, self.template_name, {'form': form})


@login_required
def student_dashboard(request):
    """Student dashboard showing verification status and next steps"""
    try:
        student_profile = request.user.student_profile
    except StudentProfile.DoesNotExist:
        messages.error(request, 'Access denied. Student account required.')
        return redirect('login')
    
    context = {
        'student_profile': student_profile,
        'verification_logs': student_profile.verification_logs.order_by('-created_at')[:5],
        'can_upload': student_profile.can_upload_id,
        'progress': student_profile.verification_progress,
    }
    
    return render(request, 'students/dashboard.html', context)


@login_required
def upload_student_id(request):
    """Handle student ID upload"""
    try:
        student_profile = request.user.student_profile
    except StudentProfile.DoesNotExist:
        messages.error(request, 'Access denied. Student account required.')
        return redirect('login')
    
    if not student_profile.can_upload_id:
        messages.error(request, 'ID upload not available at this time.')
        return redirect('student_dashboard')
    
    if request.method == 'POST':
        form = IDUploadForm(request.POST, request.FILES, instance=student_profile)
        if form.is_valid():
            try:
                # Update profile with uploaded ID
                student_profile = form.save(commit=False)
                student_profile.id_verified = 'uploaded'
                student_profile.save()
                
                # Log upload
                VerificationLog.objects.create(
                    student_profile=student_profile,
                    action='upload',
                    result='success',
                    details={'filename': student_profile.id_image.name},
                    ip_address=get_client_ip(request),
                    user_agent=request.META.get('HTTP_USER_AGENT', '')
                )
                
                # TODO: Trigger OCR processing here
                # process_id_verification.delay(student_profile.id)
                
                messages.success(request, 'Student ID uploaded successfully! Verification in progress.')
                return redirect('student_dashboard')
                
            except Exception as e:
                logger.error(f'ID upload error for {request.user.username}: {str(e)}')
                messages.error(request, 'Upload failed. Please try again.')
    else:
        form = IDUploadForm(instance=student_profile)
    
    return render(request, 'students/upload_id.html', {
        'form': form,
        'student_profile': student_profile
    })


@csrf_exempt
@require_http_methods(["POST"])
def upload_id_ajax(request):
    """AJAX endpoint for ID upload with progress tracking"""
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    
    try:
        student_profile = request.user.student_profile
    except StudentProfile.DoesNotExist:
        return JsonResponse({'error': 'Student account required'}, status=403)
    
    if not student_profile.can_upload_id:
        return JsonResponse({'error': 'Upload not allowed at this time'}, status=400)
    
    if 'id_image' not in request.FILES:
        return JsonResponse({'error': 'No file uploaded'}, status=400)
    
    id_image = request.FILES['id_image']
    
    # Validate file
    if id_image.size > 10 * 1024 * 1024:  # 10MB limit
        return JsonResponse({'error': 'File too large. Maximum size is 10MB.'}, status=400)
    
    allowed_types = ['image/jpeg', 'image/png', 'application/pdf']
    if id_image.content_type not in allowed_types:
        return JsonResponse({'error': 'Invalid file type. Please upload JPG, PNG, or PDF.'}, status=400)
    
    try:
        # Save the file
        student_profile.id_image = id_image
        student_profile.id_verified = 'uploaded'
        student_profile.save()
        
        # Log upload
        VerificationLog.objects.create(
            student_profile=student_profile,
            action='upload',
            result='success',
            details={
                'filename': id_image.name,
                'size': id_image.size,
                'content_type': id_image.content_type
            },
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        return JsonResponse({
            'success': True,
            'message': 'ID uploaded successfully!',
            'status': student_profile.get_id_verified_display(),
            'progress': student_profile.verification_progress
        })
        
    except Exception as e:
        logger.error(f'AJAX upload error for {request.user.username}: {str(e)}')
        return JsonResponse({'error': 'Upload failed. Please try again.'}, status=500)


def verify_email(request, user_id):
    """Verify student email address"""
    user = get_object_or_404(User, pk=user_id)
    
    try:
        student_profile = user.student_profile
        
        if not student_profile.email_verified:
            student_profile.email_verified = True
            user.is_active = True  # Activate user account
            student_profile.save()
            user.save()
            
            # Log email verification
            VerificationLog.objects.create(
                student_profile=student_profile,
                action='email_verify',
                result='success',
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            messages.success(request, 'Email verified successfully! You can now log in and upload your student ID.')
        else:
            messages.info(request, 'Email already verified.')
            
    except StudentProfile.DoesNotExist:
        messages.error(request, 'Invalid verification link.')
    
    return redirect('student_login')


@login_required
def verification_status(request):
    """API endpoint to get verification status"""
    try:
        student_profile = request.user.student_profile
        return JsonResponse({
            'status': student_profile.id_verified,
            'status_display': student_profile.get_id_verified_display(),
            'progress': student_profile.verification_progress,
            'can_upload': student_profile.can_upload_id,
            'is_verified': student_profile.is_verified,
            'rejection_reason': student_profile.rejection_reason,
            'verified_at': student_profile.verified_at.isoformat() if student_profile.verified_at else None
        })
    except StudentProfile.DoesNotExist:
        return JsonResponse({'error': 'Student account required'}, status=403)


def student_logout(request):
    """Student logout"""
    if request.user.is_authenticated:
        try:
            student_profile = request.user.student_profile
            # Log logout
            VerificationLog.objects.create(
                student_profile=student_profile,
                action='logout',
                result='success',
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
        except StudentProfile.DoesNotExist:
            pass
    
    logout(request)
    messages.success(request, 'Logged out successfully.')
    return redirect('student_login')
