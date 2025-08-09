from django import forms
from django.contrib.auth.models import User
from .models import Product, Order

class ProductForm(forms.ModelForm):
    class Meta:
        model = Product
        fields = ['name', 'description', 'price', 'image', 'category', 'condition', 'status', 'location']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Enter product name'}),
            'description': forms.Textarea(attrs={'class': 'form-control', 'rows': 4, 'placeholder': 'Describe your product...'}),
            'price': forms.NumberInput(attrs={'class': 'form-control', 'placeholder': 'Price in South African Rands (R)', 'step': '0.01'}),
            'category': forms.Select(attrs={'class': 'form-select'}),
            'condition': forms.Select(attrs={'class': 'form-select'}),
            'status': forms.Select(attrs={'class': 'form-select'}),
            'location': forms.Select(attrs={'class': 'form-select'}),
            'image': forms.FileInput(attrs={'class': 'form-control'}),
        }
        labels = {
            'name': 'Product Name',
            'description': 'Product Description',
            'price': 'Price (in Rands)',
            'category': 'Category',
            'condition': 'Product Condition',
            'status': 'Availability Status',
            'location': 'Location in Cape Town',
            'image': 'Product Image',
        }


class CheckoutForm(forms.ModelForm):
    """Form for checkout process with shipping information"""
    
    class Meta:
        model = Order
        fields = [
            'first_name', 'last_name', 'email', 'phone',
            'address_line_1', 'address_line_2', 'city', 'province', 'postal_code',
            'notes'
        ]
        
        widgets = {
            'first_name': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Enter your first name',
                'required': True
            }),
            'last_name': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Enter your last name',
                'required': True
            }),
            'email': forms.EmailInput(attrs={
                'class': 'form-control',
                'placeholder': 'your.email@example.com',
                'required': True
            }),
            'phone': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': '+27 XX XXX XXXX',
                'required': True
            }),
            'address_line_1': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Street address',
                'required': True
            }),
            'address_line_2': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Apartment, suite, etc. (optional)'
            }),
            'city': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Cape Town',
                'required': True
            }),
            'province': forms.Select(attrs={
                'class': 'form-control',
                'required': True
            }, choices=[
                ('', 'Select Province'),
                ('western_cape', 'Western Cape'),
                ('eastern_cape', 'Eastern Cape'),
                ('northern_cape', 'Northern Cape'),
                ('free_state', 'Free State'),
                ('kwazulu_natal', 'KwaZulu-Natal'),
                ('north_west', 'North West'),
                ('gauteng', 'Gauteng'),
                ('mpumalanga', 'Mpumalanga'),
                ('limpopo', 'Limpopo'),
            ]),
            'postal_code': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': '8000',
                'required': True
            }),
            'notes': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': 3,
                'placeholder': 'Special delivery instructions (optional)'
            })
        }
        
        labels = {
            'first_name': 'First Name',
            'last_name': 'Last Name',
            'email': 'Email Address',
            'phone': 'Phone Number',
            'address_line_1': 'Address Line 1',
            'address_line_2': 'Address Line 2',
            'city': 'City',
            'province': 'Province',
            'postal_code': 'Postal Code',
            'notes': 'Delivery Notes'
        }
    
    def __init__(self, *args, **kwargs):
        user = kwargs.pop('user', None)
        super().__init__(*args, **kwargs)
        
        # Pre-fill with user information if available
        if user and user.is_authenticated:
            self.fields['first_name'].initial = user.first_name
            self.fields['last_name'].initial = user.last_name
            self.fields['email'].initial = user.email
    
    def clean_phone(self):
        phone = self.cleaned_data.get('phone')
        if phone:
            # Remove common phone number formatting
            import re
            phone = re.sub(r'[^\d+]', '', phone)
            if not phone.startswith('+'):
                # Assume South African number if no country code
                if phone.startswith('0'):
                    phone = '+27' + phone[1:]
                else:
                    phone = '+27' + phone
        return phone
    
    def clean_postal_code(self):
        postal_code = self.cleaned_data.get('postal_code')
        if postal_code:
            # Ensure postal code is numeric and 4 digits for South Africa
            import re
            postal_code = re.sub(r'\D', '', postal_code)
            if len(postal_code) != 4:
                raise forms.ValidationError('Please enter a valid 4-digit postal code.')
        return postal_code
