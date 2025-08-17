"""
Django forms for student registration, authentication, and ID upload.
"""

from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.utils import timezone
from datetime import datetime
import re

from .models import StudentProfile, University


class StudentRegistrationForm(UserCreationForm):
    """Extended user creation form for student registration"""
    
    first_name = forms.CharField(
        max_length=30,
        required=True,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Enter your first name'
        })
    )
    
    last_name = forms.CharField(
        max_length=30,
        required=True,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Enter your last name'
        })
    )
    
    email = forms.EmailField(
        required=True,
        widget=forms.EmailInput(attrs={
            'class': 'form-control',
            'placeholder': 'Enter your personal email'
        }),
        help_text='Your personal email address (different from university email)'
    )
    
    university_email = forms.EmailField(
        required=True,
        widget=forms.EmailInput(attrs={
            'class': 'form-control',
            'placeholder': 'Enter your university email (e.g., john@university.edu)'
        }),
        help_text='Your official university email address'
    )
    
    university = forms.ModelChoiceField(
        queryset=University.objects.filter(is_active=True),
        required=True,
        widget=forms.Select(attrs={
            'class': 'form-control'
        }),
        help_text='Select your university'
    )
    
    expected_graduation_year = forms.IntegerField(
        required=False,
        widget=forms.NumberInput(attrs={
            'class': 'form-control',
            'placeholder': 'e.g., 2025',
            'min': timezone.now().year,
            'max': timezone.now().year + 10
        }),
        help_text='Expected year of graduation (optional)'
    )
    
    degree_program = forms.CharField(
        max_length=200,
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'e.g., Computer Science, Business Administration'
        }),
        help_text='Your degree program (optional)'
    )
    
    terms_accepted = forms.BooleanField(
        required=True,
        widget=forms.CheckboxInput(attrs={
            'class': 'form-check-input'
        }),
        label='I accept the Terms of Service and Privacy Policy'
    )
    
    privacy_consent = forms.BooleanField(
        required=True,
        widget=forms.CheckboxInput(attrs={
            'class': 'form-check-input'
        }),
        label='I consent to the processing of my student ID for verification purposes'
    )
    
    class Meta:
        model = User
        fields = (
            'username', 'first_name', 'last_name', 'email',
            'password1', 'password2'
        )
        widgets = {
            'username': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Choose a username'
            }),
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Add CSS classes to password fields
        self.fields['password1'].widget.attrs.update({
            'class': 'form-control',
            'placeholder': 'Enter a secure password'
        })
        self.fields['password2'].widget.attrs.update({
            'class': 'form-control',
            'placeholder': 'Confirm your password'
        })
    
    def clean_university_email(self):
        """Validate university email format and domain"""
        university_email = self.cleaned_data.get('university_email')
        
        if not university_email:
            return university_email
        
        # Basic email validation
        try:
            validate_email(university_email)
        except ValidationError:
            raise forms.ValidationError('Please enter a valid email address.')
        
        # Check if email is already registered
        if StudentProfile.objects.filter(university_email=university_email).exists():
            raise forms.ValidationError('This university email is already registered.')
        
        # Extract domain from email
        domain = university_email.split('@')[1].lower()
        
        # Check if university is selected and domain matches
        university = self.cleaned_data.get('university')
        if university and domain != university.domain.lower():
            raise forms.ValidationError(
                f'Email domain ({domain}) does not match selected university domain ({university.domain}).'
            )
        
        return university_email
    
    def clean_email(self):
        """Ensure personal email is different from university email"""
        email = self.cleaned_data.get('email')
        university_email = self.cleaned_data.get('university_email')
        
        if email and university_email and email == university_email:
            raise forms.ValidationError(
                'Personal email must be different from university email.'
            )
        
        return email
    
    def clean_expected_graduation_year(self):
        """Validate graduation year"""
        year = self.cleaned_data.get('expected_graduation_year')
        current_year = timezone.now().year
        
        if year and (year < current_year or year > current_year + 10):
            raise forms.ValidationError(
                f'Graduation year must be between {current_year} and {current_year + 10}.'
            )
        
        return year
    
    def save(self, commit=True):
        """Save user with additional fields"""
        user = super().save(commit=False)
        user.email = self.cleaned_data['email']
        user.first_name = self.cleaned_data['first_name']
        user.last_name = self.cleaned_data['last_name']
        
        if commit:
            user.save()
        
        return user


class StudentLoginForm(forms.Form):
    """Student login form"""
    
    username = forms.CharField(
        max_length=150,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Enter your username',
            'autofocus': True
        })
    )
    
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'Enter your password'
        })
    )
    
    remember_me = forms.BooleanField(
        required=False,
        widget=forms.CheckboxInput(attrs={
            'class': 'form-check-input'
        }),
        label='Remember me'
    )


class IDUploadForm(forms.ModelForm):
    """Form for uploading student ID images"""
    
    class Meta:
        model = StudentProfile
        fields = ['id_image', 'student_id_number']
        widgets = {
            'id_image': forms.FileInput(attrs={
                'class': 'form-control',
                'accept': 'image/jpeg,image/jpg,image/png,application/pdf',
                'data-max-size': '10485760'  # 10MB in bytes
            }),
            'student_id_number': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Enter the ID number from your student card (optional)'
            })
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['id_image'].help_text = (
            'Upload a clear photo of your student ID card. '
            'Accepted formats: JPG, PNG, PDF. Maximum size: 10MB.'
        )
        self.fields['student_id_number'].help_text = (
            'Optional: Enter the ID number shown on your card for faster verification.'
        )
        self.fields['student_id_number'].required = False
    
    def clean_id_image(self):
        """Validate uploaded ID image"""
        id_image = self.cleaned_data.get('id_image')
        
        if not id_image:
            raise forms.ValidationError('Please select an image to upload.')
        
        # Check file size (10MB limit)
        if id_image.size > 10 * 1024 * 1024:
            raise forms.ValidationError('File size cannot exceed 10MB.')
        
        # Check file type
        allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
        if hasattr(id_image, 'content_type') and id_image.content_type not in allowed_types:
            raise forms.ValidationError(
                'Invalid file type. Please upload a JPG, PNG, or PDF file.'
            )
        
        # Additional validation for image files
        if id_image.content_type in ['image/jpeg', 'image/jpg', 'image/png']:
            try:
                from PIL import Image
                img = Image.open(id_image)
                img.verify()
                
                # Reset file pointer after verification
                id_image.seek(0)
                
                # Check minimum dimensions
                if img.size[0] < 200 or img.size[1] < 200:
                    raise forms.ValidationError(
                        'Image is too small. Minimum dimensions are 200x200 pixels.'
                    )
                
            except Exception:
                raise forms.ValidationError(
                    'Invalid image file. Please upload a valid image.'
                )
        
        return id_image


class UniversitySearchForm(forms.Form):
    """Form for searching universities"""
    
    search_query = forms.CharField(
        max_length=200,
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Search universities by name or domain...',
            'autocomplete': 'off'
        })
    )
    
    country = forms.CharField(
        max_length=100,
        required=False,
        widget=forms.Select(attrs={
            'class': 'form-control'
        })
    )
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Populate country choices dynamically
        countries = University.objects.values_list('country', flat=True).distinct().order_by('country')
        country_choices = [('', 'All Countries')] + [(c, c) for c in countries if c]
        self.fields['country'].widget.choices = country_choices


class VerificationAppealForm(forms.Form):
    """Form for appealing verification decisions"""
    
    reason = forms.CharField(
        widget=forms.Textarea(attrs={
            'class': 'form-control',
            'rows': 5,
            'placeholder': 'Please explain why you believe your verification was incorrectly rejected...'
        }),
        help_text='Provide detailed information about why your verification should be reconsidered.'
    )
    
    additional_documents = forms.FileField(
        required=False,
        widget=forms.FileInput(attrs={
            'class': 'form-control',
            'accept': 'image/jpeg,image/jpg,image/png,application/pdf'
        }),
        help_text='Optional: Upload additional documentation to support your appeal.'
    )
    
    def clean_additional_documents(self):
        """Validate additional documents"""
        file = self.cleaned_data.get('additional_documents')
        
        if file:
            # Check file size
            if file.size > 10 * 1024 * 1024:
                raise forms.ValidationError('File size cannot exceed 10MB.')
            
            # Check file type
            allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
            if hasattr(file, 'content_type') and file.content_type not in allowed_types:
                raise forms.ValidationError(
                    'Invalid file type. Please upload a JPG, PNG, or PDF file.'
                )
        
        return file
