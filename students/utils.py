"""
Utility functions for the student verification system.
"""

import re
import hashlib
import secrets
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import datetime, timedelta
import logging

from .models import University

logger = logging.getLogger(__name__)


def get_client_ip(request):
    """Extract the client IP address from the request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def extract_university_from_email(email):
    """
    Extract university information from an email domain.
    Returns a University object if found, None otherwise.
    """
    if not email or '@' not in email:
        return None
    
    domain = email.split('@')[1].lower()
    
    try:
        return University.objects.get(domain=domain, is_active=True)
    except University.DoesNotExist:
        return None


def generate_verification_token():
    """Generate a secure random token for email verification"""
    return secrets.token_urlsafe(32)


def hash_file_content(file_content):
    """Generate SHA-256 hash of file content"""
    return hashlib.sha256(file_content).hexdigest()


def is_valid_university_email(email):
    """
    Check if an email address looks like a valid university email.
    This is a basic heuristic check before domain validation.
    """
    if not email or '@' not in email:
        return False
    
    email = email.lower()
    domain = email.split('@')[1]
    
    # Common university email patterns
    university_patterns = [
        r'\.edu$',  # US universities
        r'\.ac\.uk$',  # UK universities  
        r'\.edu\.au$',  # Australian universities
        r'\.ca$',  # Canadian universities
        r'\.edu\.ca$',  # Canadian universities
        r'\.university\.',  # Generic university pattern
        r'\.college\.', # Generic college pattern
    ]
    
    for pattern in university_patterns:
        if re.search(pattern, domain):
            return True
    
    return False


def validate_student_id_number(id_number):
    """
    Basic validation for student ID numbers.
    Returns True if the ID looks valid, False otherwise.
    """
    if not id_number:
        return True  # ID number is optional
    
    # Remove spaces and convert to uppercase
    id_number = id_number.replace(' ', '').upper()
    
    # Basic patterns for student IDs
    patterns = [
        r'^\d{6,12}$',  # 6-12 digits
        r'^[A-Z]\d{5,10}$',  # Letter followed by 5-10 digits
        r'^[A-Z]{2}\d{4,8}$',  # Two letters followed by 4-8 digits
        r'^[A-Z]\d{2}[A-Z]\d{3,6}$',  # Letter-digits-letter-digits pattern
    ]
    
    for pattern in patterns:
        if re.match(pattern, id_number):
            return True
    
    return False


def format_file_size(bytes_size):
    """Convert bytes to human readable format"""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if bytes_size < 1024.0:
            return f"{bytes_size:.1f} {unit}"
        bytes_size /= 1024.0
    return f"{bytes_size:.1f} TB"


def send_verification_email(student_profile, verification_link):
    """
    Send verification email to student with customized content.
    """
    try:
        subject = 'Verify Your MarketHub Student Account'
        
        # Create email content
        message = f"""
Dear {student_profile.user.get_full_name() or student_profile.user.username},

Welcome to MarketHub Student Portal!

Please verify your student account by clicking the link below:
{verification_link}

This link will expire in 24 hours for security purposes.

After email verification, you'll need to upload a clear photo of your student ID card for account activation.

University: {student_profile.university.name if student_profile.university else 'Not specified'}
Email: {student_profile.university_email}

If you didn't create this account, please ignore this email.

Best regards,
MarketHub Student Verification Team

---
This is an automated message. Please do not reply to this email.
        """
        
        # Send email
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[student_profile.university_email],
            fail_silently=False,
        )
        
        logger.info(f'Verification email sent to {student_profile.university_email}')
        return True
        
    except Exception as e:
        logger.error(f'Failed to send verification email to {student_profile.university_email}: {str(e)}')
        return False


def send_verification_status_email(student_profile, status, reason=None):
    """
    Send email notification when verification status changes.
    """
    try:
        status_messages = {
            'verified': {
                'subject': 'Student Verification Approved - MarketHub',
                'message': f"""
Dear {student_profile.user.get_full_name() or student_profile.user.username},

Great news! Your student verification has been approved.

You now have full access to MarketHub's student features and discounts.

Verification Details:
- University: {student_profile.university.name if student_profile.university else 'Not specified'}
- Verified on: {timezone.now().strftime('%B %d, %Y')}

You can now log in and start shopping: {settings.ALLOWED_HOSTS[0]}/student/login/

Best regards,
MarketHub Team
                """
            },
            'rejected': {
                'subject': 'Student Verification Update - MarketHub',
                'message': f"""
Dear {student_profile.user.get_full_name() or student_profile.user.username},

We were unable to verify your student status at this time.

Reason: {reason or 'The uploaded document could not be verified.'}

You can upload a new document or appeal this decision:
{settings.ALLOWED_HOSTS[0]}/student/dashboard/

Tips for successful verification:
- Ensure your student ID is clearly visible and not blurred
- Make sure all text is readable
- Upload in good lighting conditions
- Use JPG, PNG, or PDF format

If you believe this is an error, you can submit an appeal with additional documentation.

Best regards,
MarketHub Student Verification Team
                """
            }
        }
        
        email_content = status_messages.get(status)
        if not email_content:
            return False
        
        send_mail(
            subject=email_content['subject'],
            message=email_content['message'],
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[student_profile.university_email],
            fail_silently=False,
        )
        
        logger.info(f'Status email ({status}) sent to {student_profile.university_email}')
        return True
        
    except Exception as e:
        logger.error(f'Failed to send status email to {student_profile.university_email}: {str(e)}')
        return False


def clean_filename(filename):
    """
    Clean filename by removing or replacing unsafe characters.
    """
    # Remove or replace unsafe characters
    filename = re.sub(r'[^\w\s.-]', '', filename)
    # Replace spaces with underscores
    filename = filename.replace(' ', '_')
    # Limit length
    if len(filename) > 100:
        name, ext = filename.rsplit('.', 1) if '.' in filename else (filename, '')
        filename = f"{name[:90]}{'.' + ext if ext else ''}"
    
    return filename


def generate_student_username(first_name, last_name, university_domain):
    """
    Generate a suggested username for student registration.
    """
    # Clean and format names
    first = re.sub(r'[^\w]', '', first_name.lower())
    last = re.sub(r'[^\w]', '', last_name.lower())
    
    # Get university code from domain
    university_code = university_domain.split('.')[0][:4]
    
    # Generate username suggestions
    suggestions = [
        f"{first}.{last}",
        f"{first}_{last}",
        f"{first}{last}",
        f"{first}.{last}.{university_code}",
        f"{first[0]}{last}",
        f"{first}{last[0]}",
    ]
    
    return suggestions[:3]  # Return top 3 suggestions


def check_graduation_year_validity(graduation_year, university=None):
    """
    Check if a graduation year is reasonable for a current student.
    """
    if not graduation_year:
        return True  # Optional field
    
    current_year = timezone.now().year
    min_year = current_year
    max_year = current_year + 8  # PhD programs can be long
    
    # Adjust for university-specific rules if needed
    if university and hasattr(university, 'max_program_duration'):
        max_year = current_year + university.max_program_duration
    
    return min_year <= graduation_year <= max_year


def extract_text_from_image(image_path):
    """
    Extract text from image using OCR.
    This is a placeholder for OCR functionality.
    In production, integrate with services like AWS Textract, Google Vision, or Tesseract.
    """
    # TODO: Implement actual OCR functionality
    # For now, return a placeholder
    return {
        'extracted_text': '',
        'confidence': 0.0,
        'student_name': '',
        'student_id': '',
        'university_name': '',
        'expiry_date': None
    }


def verify_student_data_match(extracted_data, student_profile):
    """
    Compare extracted OCR data with student profile information.
    Returns a confidence score and list of matches/mismatches.
    """
    matches = []
    mismatches = []
    confidence_factors = []
    
    # Compare names
    if extracted_data.get('student_name') and student_profile.user.get_full_name():
        extracted_name = extracted_data['student_name'].lower()
        profile_name = student_profile.user.get_full_name().lower()
        
        # Simple name matching (in production, use more sophisticated matching)
        if extracted_name in profile_name or profile_name in extracted_name:
            matches.append('Name matches')
            confidence_factors.append(0.4)
        else:
            mismatches.append('Name does not match')
    
    # Compare student ID numbers
    if (extracted_data.get('student_id') and 
        student_profile.student_id_number and 
        extracted_data['student_id'] == student_profile.student_id_number):
        matches.append('Student ID matches')
        confidence_factors.append(0.3)
    
    # Compare university names
    if (extracted_data.get('university_name') and 
        student_profile.university and
        extracted_data['university_name'].lower() in student_profile.university.name.lower()):
        matches.append('University matches')
        confidence_factors.append(0.3)
    
    # Calculate overall confidence
    confidence = sum(confidence_factors)
    
    return {
        'confidence': confidence,
        'matches': matches,
        'mismatches': mismatches,
        'auto_approve': confidence >= 0.8
    }
