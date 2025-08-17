# Student ID Verification System - Architecture & Requirements

## Overview

This document outlines the implementation of a dedicated student authentication system with ID scanning verification for MarketHub. The system provides a separate sign-in flow for students that requires verification of student ID cards before granting access.

## Functional Requirements

### Core Features
1. **Separate Student Registration Portal**: Dedicated sign-up flow for students
2. **ID Scanning/Upload**: Camera capture or file upload for student ID cards
3. **Automated Verification**: OCR-based extraction and validation of student information
4. **Manual Review Process**: Admin interface for reviewing flagged or failed verifications
5. **Status Tracking**: Real-time updates on verification progress
6. **Secure Data Handling**: Encrypted storage and automatic data purging

### User Journey
```
Student Registration → ID Upload → Verification (Auto/Manual) → Account Activation → Student Portal Access
```

## Technical Architecture

### System Components

#### 1. Django Apps Structure
```
students/                    # New Django app for student functionality
├── models.py               # StudentProfile, VerificationLog models
├── views.py                # Student auth views
├── serializers.py          # API serializers
├── verification.py         # ID verification logic
├── ocr_service.py          # OCR processing service
└── admin.py                # Admin verification interface

student_auth/               # Custom authentication backend
├── backends.py             # Student authentication backend
├── decorators.py           # Student-only view decorators
└── middleware.py           # Student session middleware
```

#### 2. Database Models

```python
class StudentProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    university_email = models.EmailField(unique=True)
    university_name = models.CharField(max_length=200)
    student_id_number = models.CharField(max_length=50, blank=True)
    
    # ID Verification
    id_image = models.FileField(upload_to='student_ids/', null=True, blank=True)
    id_verified = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('processing', 'Processing'),
            ('verified', 'Verified'),
            ('rejected', 'Rejected'),
            ('expired', 'Expired')
        ],
        default='pending'
    )
    
    # Verification Details
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='verified_students')
    rejection_reason = models.TextField(blank=True)
    verification_notes = models.TextField(blank=True)
    
    # Security & Privacy
    id_hash = models.CharField(max_length=64)  # SHA-256 hash of original image
    expires_at = models.DateTimeField()  # Student ID expiration
    last_verification_check = models.DateTimeField(auto_now=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class VerificationLog(models.Model):
    student_profile = models.ForeignKey(StudentProfile, on_delete=models.CASCADE)
    action = models.CharField(max_length=50)  # upload, auto_verify, manual_review, approve, reject
    result = models.CharField(max_length=20)
    details = models.JSONField(default=dict)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
```

#### 3. Authentication Flow

```python
class StudentAuthenticationBackend(BaseBackend):
    """Custom authentication backend for students only"""
    
    def authenticate(self, request, username=None, password=None, **kwargs):
        try:
            user = User.objects.get(email=username)
            if user.check_password(password) and hasattr(user, 'studentprofile'):
                if user.studentprofile.id_verified == 'verified':
                    return user
        except User.DoesNotExist:
            return None
        return None
```

### Frontend Architecture

#### React Components Structure
```
src/components/student/
├── StudentRegistration.jsx     # Main registration form
├── IDScanner/
│   ├── IDScanner.jsx           # Camera capture component
│   ├── FileUpload.jsx          # File upload alternative
│   ├── ImagePreview.jsx        # Preview and crop interface
│   └── VerificationProgress.jsx # Status tracking
├── StudentLogin.jsx            # Student-specific login
├── StudentDashboard.jsx        # Student portal dashboard
└── VerificationStatus.jsx      # Verification status display
```

#### Key Frontend Features
- **WebRTC Camera Access**: Real-time camera capture for ID scanning
- **Image Processing**: Client-side compression, rotation, and cropping
- **Progressive Upload**: Chunked upload for large files with progress tracking
- **Real-time Status**: WebSocket updates for verification progress

## Security & Privacy

### Data Protection
1. **Encryption at Rest**: AES-256 encryption for all ID images
2. **Secure Transmission**: TLS 1.3 for all data transfers
3. **Access Control**: Role-based permissions for verification staff
4. **Data Retention**: Automatic purging of rejected/expired IDs after 30 days
5. **Audit Logging**: Comprehensive logging of all access and modifications

### Privacy Compliance
- **FERPA Compliance**: Educational records protection
- **GDPR Compliance**: Right to erasure and data portability
- **CCPA Compliance**: California privacy rights
- **Minimal Data Collection**: Only collect necessary verification data

### Security Measures
```python
# Example security implementations
class SecureFileUpload:
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'pdf']
    SCAN_FOR_MALWARE = True
    STRIP_EXIF_DATA = True
    
    def validate_upload(self, file):
        # File type validation
        # Size validation  
        # Malware scanning
        # EXIF data removal
```

## OCR & Verification Logic

### Automated Verification Pipeline
```python
class IDVerificationService:
    def process_id_image(self, image_path):
        # 1. Image preprocessing
        processed_image = self.preprocess_image(image_path)
        
        # 2. OCR extraction
        extracted_data = self.extract_text_with_ocr(processed_image)
        
        # 3. Data validation
        validation_result = self.validate_extracted_data(extracted_data)
        
        # 4. University verification
        university_verified = self.verify_university(extracted_data.get('university'))
        
        # 5. Cross-reference with registration data
        data_match = self.cross_reference_data(extracted_data)
        
        return {
            'auto_verified': all([validation_result, university_verified, data_match]),
            'confidence_score': self.calculate_confidence(extracted_data),
            'extracted_data': extracted_data,
            'requires_manual_review': not auto_verified or confidence_score < 0.8
        }
```

### Supported ID Formats
- US University Student IDs
- International Student IDs
- Digital Student IDs (QR codes)
- Government-issued Student IDs

## Admin Verification Interface

### Features
- **Queue Management**: Prioritized queue of pending verifications
- **Side-by-side Comparison**: User registration data vs. extracted ID data
- **Image Enhancement**: Zoom, rotate, contrast adjustment for better review
- **Bulk Actions**: Approve/reject multiple verifications
- **Verification Notes**: Add notes for future reference
- **Appeal Process**: Handle verification appeals

### Admin Dashboard Components
```jsx
const VerificationQueue = () => {
  return (
    <div className="verification-queue">
      <QueueFilters />
      <PendingVerifications />
      <VerificationModal />
      <BulkActions />
    </div>
  );
};
```

## API Endpoints

### Student Authentication APIs
```
POST /api/student/register/          # Student registration
POST /api/student/upload-id/         # ID image upload
GET  /api/student/verification-status/ # Check verification status
POST /api/student/login/             # Student login
POST /api/student/logout/            # Student logout
```

### Admin Verification APIs
```
GET  /api/admin/verification-queue/  # Get pending verifications
POST /api/admin/verify/{id}/         # Approve/reject verification
GET  /api/admin/verification/{id}/   # Get verification details
POST /api/admin/bulk-verify/         # Bulk verification actions
```

## User Experience Flow

### Student Registration Process
1. **Landing Page**: Dedicated student portal entry
2. **Registration Form**: Email, password, university selection
3. **Email Verification**: Confirm university email address
4. **ID Upload**: Camera capture or file upload with guided instructions
5. **Processing**: Real-time status updates during verification
6. **Notification**: Email notification when verification is complete
7. **Account Access**: Full platform access upon verification

### Responsive Design
- **Mobile-First**: Optimized for mobile ID scanning
- **Progressive Web App**: Offline capability for form completion
- **Accessibility**: WCAG 2.1 AA compliance
- **Multi-language**: Support for international students

## Integration Points

### Existing System Integration
1. **User Model Extension**: Seamless integration with existing User model
2. **Permission System**: Django groups for student-specific permissions
3. **Payment System**: Student discounts and verification
4. **Notification System**: Verification status updates
5. **Admin Interface**: Extended Django admin for verification management

### Feature Flags
```python
STUDENT_VERIFICATION_ENABLED = env.bool('STUDENT_VERIFICATION_ENABLED', True)
STUDENT_AUTO_VERIFICATION = env.bool('STUDENT_AUTO_VERIFICATION', False)
STUDENT_MANUAL_REVIEW_THRESHOLD = env.float('STUDENT_MANUAL_REVIEW_THRESHOLD', 0.8)
```

## Performance & Scalability

### Performance Targets
- **Image Upload**: < 30 seconds for 10MB files
- **OCR Processing**: < 60 seconds per image
- **Verification Queue**: Handle 1000+ pending verifications
- **Dashboard Load**: < 2 seconds for admin interface

### Scalability Measures
- **Async Processing**: Celery task queue for OCR processing
- **CDN Integration**: CloudFront for image delivery
- **Database Optimization**: Indexed queries and connection pooling
- **Caching**: Redis caching for verification status

## Monitoring & Analytics

### Key Metrics
- Verification success rate
- Average processing time
- Manual review queue length
- Student conversion rate
- Security incident tracking

### Alerting
- High verification failure rate
- Queue backlog exceeding thresholds
- Security violations
- System performance degradation

## Deployment Strategy

### Environment Configuration
```yaml
# Production settings
STUDENT_ID_STORAGE_BUCKET: 'markethub-student-ids-prod'
STUDENT_ID_ENCRYPTION_KEY: '${AWS_SECRETS_MANAGER}/student-id-key'
OCR_SERVICE_ENDPOINT: 'https://api.textract.amazonaws.com'
VERIFICATION_QUEUE_SIZE: 1000
```

### Rollout Plan
1. **Beta Testing**: Select universities for initial testing
2. **Gradual Rollout**: 10% → 50% → 100% of student traffic
3. **Monitoring**: Continuous monitoring during rollout
4. **Rollback Plan**: Quick rollback capability if issues arise

## Compliance & Legal

### Data Protection
- **Data Processing Agreement**: Clear terms for ID processing
- **Consent Management**: Explicit consent for ID collection
- **Data Subject Rights**: Easy access to deletion and data export
- **Third-party Integrations**: Compliant OCR service providers

### Academic Integrity
- **Verification Standards**: Industry-standard verification processes
- **False Document Detection**: Advanced security features
- **Dispute Resolution**: Clear appeal process for rejected verifications

This architecture provides a comprehensive, secure, and scalable solution for student ID verification while maintaining compliance with educational and privacy regulations.
