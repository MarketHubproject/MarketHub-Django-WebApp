import hashlib
import os
from datetime import datetime, timedelta
from django.db import models
from django.contrib.auth.models import User
from django.core.validators import FileExtensionValidator
from django.utils import timezone
from PIL import Image
from io import BytesIO
from django.core.files.uploadedfile import InMemoryUploadedFile


class University(models.Model):
    """Model for supported universities"""
    name = models.CharField(max_length=200, unique=True)
    domain = models.CharField(max_length=100, unique=True)  # e.g., 'university.edu'
    country = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    verification_required = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        verbose_name_plural = "Universities"
        ordering = ['name']


def student_id_upload_path(instance, filename):
    """Generate secure upload path for student ID images"""
    # Create a hash-based filename to avoid collisions
    ext = filename.split('.')[-1]
    filename = f"{instance.user.id}_{timezone.now().strftime('%Y%m%d_%H%M%S')}.{ext}"
    return f"student_ids/{timezone.now().year}/{timezone.now().month}/{filename}"


class StudentProfile(models.Model):
    """Extended profile for student users with verification capabilities"""
    
    VERIFICATION_STATUS_CHOICES = [
        ('pending', 'Pending Upload'),
        ('uploaded', 'ID Uploaded'),
        ('processing', 'Processing'),
        ('verified', 'Verified'),
        ('rejected', 'Rejected'),
        ('expired', 'Expired'),
        ('appealing', 'Under Appeal'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='student_profile')
    
    # University Information
    university_email = models.EmailField(unique=True, help_text="Official university email address")
    university = models.ForeignKey(University, on_delete=models.CASCADE, null=True, blank=True)
    student_id_number = models.CharField(max_length=50, blank=True, help_text="Student ID number from the card")
    expected_graduation_year = models.IntegerField(null=True, blank=True)
    degree_program = models.CharField(max_length=200, blank=True)
    
    # ID Verification
    id_image = models.ImageField(
        upload_to=student_id_upload_path, 
        null=True, 
        blank=True,
        validators=[FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'pdf'])],
        help_text="Upload your student ID card (JPG, PNG, or PDF, max 10MB)"
    )
    id_verified = models.CharField(
        max_length=20,
        choices=VERIFICATION_STATUS_CHOICES,
        default='pending'
    )
    
    # Verification Details
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='verified_students'
    )
    rejection_reason = models.TextField(blank=True)
    verification_notes = models.TextField(blank=True, help_text="Internal notes for verification")
    confidence_score = models.FloatField(null=True, blank=True, help_text="OCR confidence score (0-1)")
    
    # Extracted Data from OCR
    extracted_name = models.CharField(max_length=200, blank=True)
    extracted_student_id = models.CharField(max_length=50, blank=True)
    extracted_university = models.CharField(max_length=200, blank=True)
    extracted_expiry_date = models.DateField(null=True, blank=True)
    ocr_raw_data = models.JSONField(default=dict, blank=True)
    
    # Security & Privacy
    id_hash = models.CharField(max_length=64, blank=True, help_text="SHA-256 hash of original image")
    upload_ip = models.GenericIPAddressField(null=True, blank=True)
    upload_user_agent = models.TextField(blank=True)
    
    # Expiration and Lifecycle
    id_expires_at = models.DateTimeField(null=True, blank=True, help_text="When the student ID expires")
    verification_expires_at = models.DateTimeField(null=True, blank=True, help_text="When verification expires")
    last_verification_check = models.DateTimeField(auto_now=True)
    
    # Status Tracking
    email_verified = models.BooleanField(default=False)
    terms_accepted = models.BooleanField(default=False)
    privacy_consent = models.BooleanField(default=False)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.get_full_name() or self.user.username} - {self.university_email}"
    
    def save(self, *args, **kwargs):
        # Generate hash of ID image if uploaded
        if self.id_image and not self.id_hash:
            self.id_hash = self._generate_image_hash()
        
        # Set verification expiration (1 year from verification)
        if self.id_verified == 'verified' and self.verified_at and not self.verification_expires_at:
            self.verification_expires_at = self.verified_at + timedelta(days=365)
        
        # Compress image if too large
        if self.id_image:
            self._compress_image()
        
        super().save(*args, **kwargs)
    
    def _generate_image_hash(self):
        """Generate SHA-256 hash of the uploaded image"""
        if self.id_image:
            self.id_image.seek(0)
            content = self.id_image.read()
            self.id_image.seek(0)
            return hashlib.sha256(content).hexdigest()
        return ''
    
    def _compress_image(self):
        """Compress image if it's too large"""
        if not self.id_image:
            return
        
        # Open image
        img = Image.open(self.id_image)
        
        # Convert to RGB if necessary
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')
        
        # Resize if too large (max 2048x2048)
        max_size = (2048, 2048)
        if img.size[0] > max_size[0] or img.size[1] > max_size[1]:
            img.thumbnail(max_size, Image.Resampling.LANCZOS)
        
        # Save compressed image
        output = BytesIO()
        img.save(output, format='JPEG', quality=85, optimize=True)
        output.seek(0)
        
        # Replace the file
        self.id_image = InMemoryUploadedFile(
            output,
            'ImageField',
            f"{self.id_image.name.split('.')[0]}.jpg",
            'image/jpeg',
            output.tell(),
            None
        )
    
    @property
    def is_verified(self):
        """Check if the student is verified and verification hasn't expired"""
        if self.id_verified != 'verified':
            return False
        
        if self.verification_expires_at and timezone.now() > self.verification_expires_at:
            # Mark as expired
            self.id_verified = 'expired'
            self.save(update_fields=['id_verified'])
            return False
        
        return True
    
    @property
    def verification_progress(self):
        """Get verification progress percentage"""
        progress_map = {
            'pending': 0,
            'uploaded': 25,
            'processing': 50,
            'verified': 100,
            'rejected': 0,
            'expired': 0,
            'appealing': 75,
        }
        return progress_map.get(self.id_verified, 0)
    
    @property
    def can_upload_id(self):
        """Check if student can upload/re-upload ID"""
        return self.id_verified in ['pending', 'rejected', 'expired']
    
    def mark_as_verified(self, verified_by_user, notes=''):
        """Mark student as verified"""
        self.id_verified = 'verified'
        self.verified_at = timezone.now()
        self.verified_by = verified_by_user
        self.verification_notes = notes
        self.verification_expires_at = timezone.now() + timedelta(days=365)
        self.save()
        
        # Log the verification
        VerificationLog.objects.create(
            student_profile=self,
            action='manual_verify',
            result='approved',
            details={'notes': notes, 'verified_by': verified_by_user.username},
            performed_by=verified_by_user
        )
    
    def mark_as_rejected(self, rejected_by_user, reason):
        """Mark student as rejected"""
        self.id_verified = 'rejected'
        self.rejection_reason = reason
        self.verification_notes = f"Rejected: {reason}"
        self.save()
        
        # Log the rejection
        VerificationLog.objects.create(
            student_profile=self,
            action='manual_reject',
            result='rejected',
            details={'reason': reason, 'rejected_by': rejected_by_user.username},
            performed_by=rejected_by_user
        )
    
    class Meta:
        db_table = 'students_studentprofile'
        verbose_name = "Student Profile"
        verbose_name_plural = "Student Profiles"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['id_verified']),
            models.Index(fields=['university_email']),
            models.Index(fields=['created_at']),
            models.Index(fields=['verification_expires_at']),
        ]


class VerificationLog(models.Model):
    """Log all verification-related actions for audit purposes"""
    
    ACTION_CHOICES = [
        ('upload', 'ID Uploaded'),
        ('auto_verify', 'Automatic Verification'),
        ('manual_review', 'Manual Review'),
        ('approve', 'Approved'),
        ('reject', 'Rejected'),
        ('appeal', 'Appeal Submitted'),
        ('reupload', 'ID Re-uploaded'),
        ('expire', 'Verification Expired'),
        ('delete', 'Data Deleted'),
    ]
    
    RESULT_CHOICES = [
        ('success', 'Success'),
        ('failure', 'Failure'),
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('error', 'Error'),
    ]
    
    student_profile = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='verification_logs')
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    result = models.CharField(max_length=20, choices=RESULT_CHOICES)
    details = models.JSONField(default=dict, blank=True)
    
    # Request Information
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    # Staff Action
    performed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.student_profile.user.username} - {self.action} - {self.result}"
    
    class Meta:
        db_table = 'students_verificationlog'
        verbose_name = "Verification Log"
        verbose_name_plural = "Verification Logs"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['student_profile', 'action']),
            models.Index(fields=['created_at']),
            models.Index(fields=['result']),
        ]


class VerificationAppeal(models.Model):
    """Model for handling verification appeals"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('under_review', 'Under Review'),
        ('approved', 'Appeal Approved'),
        ('denied', 'Appeal Denied'),
        ('withdrawn', 'Withdrawn'),
    ]
    
    student_profile = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='appeals')
    reason = models.TextField(help_text="Reason for the appeal")
    additional_documents = models.FileField(
        upload_to='appeal_documents/',
        null=True,
        blank=True,
        validators=[FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'pdf'])]
    )
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Review Information
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    review_notes = models.TextField(blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Appeal by {self.student_profile.user.username} - {self.status}"
    
    class Meta:
        db_table = 'students_verificationappeal'
        verbose_name = "Verification Appeal"
        verbose_name_plural = "Verification Appeals"
        ordering = ['-created_at']


class StudentSettings(models.Model):
    """Settings and preferences for student accounts"""
    
    student_profile = models.OneToOneField(StudentProfile, on_delete=models.CASCADE, related_name='settings')
    
    # Notification Preferences
    email_notifications = models.BooleanField(default=True)
    verification_updates = models.BooleanField(default=True)
    marketing_emails = models.BooleanField(default=False)
    
    # Privacy Settings
    public_profile = models.BooleanField(default=False)
    show_university = models.BooleanField(default=True)
    show_graduation_year = models.BooleanField(default=False)
    
    # Student Discount Preferences
    auto_apply_discounts = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Settings for {self.student_profile.user.username}"
    
    class Meta:
        db_table = 'students_studentsettings'
        verbose_name = "Student Settings"
        verbose_name_plural = "Student Settings"
