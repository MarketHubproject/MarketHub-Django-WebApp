from django import forms
from .models import Product, Order, Payment, PaymentMethod, ProductDraft
from django.contrib.auth.models import User
import json
from decimal import Decimal


class ProductForm(forms.ModelForm):
    class Meta:
        model = Product
        fields = ['name', 'description', 'price', 'image', 'category', 'condition', 'status', 'location']
        widgets = {
            'name': forms.TextInput(
                attrs={
                    'class': 'form-control',
                    'placeholder': 'Enter product name'}),
            'description': forms.Textarea(
                attrs={
                    'class': 'form-control',
                    'rows': 4,
                    'placeholder': 'Describe your product...'}),
            'price': forms.NumberInput(
                attrs={
                    'class': 'form-control',
                    'placeholder': 'Price in South African Rands (R)',
                    'step': '0.01'}),
            'category': forms.Select(
                attrs={
                    'class': 'form-select'}),
            'condition': forms.Select(
                attrs={
                    'class': 'form-select'}),
            'status': forms.Select(
                attrs={
                    'class': 'form-select'}),
            'location': forms.Select(
                attrs={
                    'class': 'form-select'}),
            'image': forms.FileInput(
                attrs={
                    'class': 'form-control'}),
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


class PaymentForm(forms.ModelForm):
    """Form for processing payments"""
    # Additional fields for card payment
    card_number = forms.CharField(
        max_length=19,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': '1234 5678 9012 3456',
            'maxlength': '19',
            'data-card-field': 'number'
        }),
        label='Card Number'
    )
    
    card_expiry_month = forms.ChoiceField(
        choices=[(f'{i:02d}', f'{i:02d}') for i in range(1, 13)],
        widget=forms.Select(attrs={
            'class': 'form-control',
            'data-card-field': 'exp-month'
        }),
        label='Expiry Month'
    )
    
    card_expiry_year = forms.ChoiceField(
        choices=[(str(year), str(year)) for year in range(2024, 2035)],
        widget=forms.Select(attrs={
            'class': 'form-control',
            'data-card-field': 'exp-year'
        }),
        label='Expiry Year'
    )
    
    card_cvv = forms.CharField(
        max_length=4,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': '123',
            'maxlength': '4',
            'data-card-field': 'cvv'
        }),
        label='CVV'
    )
    
    cardholder_name = forms.CharField(
        max_length=100,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'John Doe',
            'data-card-field': 'name'
        }),
        label='Cardholder Name'
    )
    
    save_payment_method = forms.BooleanField(
        required=False,
        widget=forms.CheckboxInput(attrs={
            'class': 'form-check-input'
        }),
        label='Save this payment method for future purchases'
    )

    class Meta:
        model = Payment
        fields = ['payment_method']
        widgets = {
            'payment_method': forms.Select(attrs={
                'class': 'form-control'
            })
        }

    def __init__(self, *args, **kwargs):
        self.user = kwargs.pop('user', None)
        super().__init__(*args, **kwargs)
        
        # Show card fields only if card payment is selected
        if self.data.get('payment_method') != 'card':
            # Remove card fields if not card payment
            card_fields = ['card_number', 'card_expiry_month', 'card_expiry_year', 'card_cvv', 'cardholder_name']
            for field in card_fields:
                if field in self.fields:
                    del self.fields[field]

    def clean_card_number(self):
        card_number = self.cleaned_data.get('card_number')
        if card_number:
            # Remove spaces and validate
            card_number = card_number.replace(' ', '')
            if not card_number.isdigit() or len(card_number) < 13 or len(card_number) > 19:
                raise forms.ValidationError('Please enter a valid card number.')
        return card_number

    def clean_card_cvv(self):
        cvv = self.cleaned_data.get('card_cvv')
        if cvv:
            if not cvv.isdigit() or len(cvv) < 3 or len(cvv) > 4:
                raise forms.ValidationError('Please enter a valid CVV.')
        return cvv


class SavedPaymentMethodForm(forms.ModelForm):
    """Form for managing saved payment methods"""
    
    class Meta:
        model = PaymentMethod
        fields = ['card_type', 'last_four', 'expiry_month', 'expiry_year', 'cardholder_name', 'is_default']
        widgets = {
            'card_type': forms.Select(attrs={'class': 'form-control'}),
            'last_four': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': '1234',
                'maxlength': '4'
            }),
            'expiry_month': forms.Select(attrs={'class': 'form-control'}),
            'expiry_year': forms.Select(attrs={'class': 'form-control'}),
            'cardholder_name': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'John Doe'
            }),
            'is_default': forms.CheckboxInput(attrs={'class': 'form-check-input'})
        }


class ProductDraftForm(forms.ModelForm):
    """Form for saving product drafts"""
    
    class Meta:
        model = ProductDraft
        fields = ['name', 'description', 'price', 'category', 'condition', 'location', 'temp_image']
        widgets = {
            'name': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Enter product name (optional)'
            }),
            'description': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': 4,
                'placeholder': 'Describe your product... (optional)'
            }),
            'price': forms.NumberInput(attrs={
                'class': 'form-control',
                'placeholder': 'Price in Rands (optional)',
                'step': '0.01'
            }),
            'category': forms.Select(attrs={
                'class': 'form-select'
            }),
            'condition': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Product condition (optional)'
            }),
            'location': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Location (optional)'
            }),
            'temp_image': forms.FileInput(attrs={
                'class': 'form-control'
            })
        }
        
    def save_draft_data(self, form_data):
        """Save additional form data as JSON"""
        if hasattr(self, 'instance') and self.instance.pk:
            # Convert form data to JSON-serializable format
            draft_data = {}
            for key, value in form_data.items():
                if isinstance(value, Decimal):
                    draft_data[key] = str(value)
                else:
                    draft_data[key] = value
            self.instance.draft_data = draft_data
            self.instance.save()
            
    def load_draft_data(self):
        """Load draft data from JSON field"""
        if hasattr(self, 'instance') and self.instance.pk and self.instance.draft_data:
            return self.instance.draft_data
        return {}


class ProductSearchForm(forms.Form):
    """Enhanced search form for products"""
    
    query = forms.CharField(
        required=False,
        max_length=200,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Search for products...'
        }),
        label='Search'
    )
    
    category = forms.ChoiceField(
        required=False,
        choices=[('', 'All Categories')] + Product.CATEGORY_CHOICES,
        widget=forms.Select(attrs={
            'class': 'form-select'
        }),
        label='Category'
    )
    
    min_price = forms.DecimalField(
        required=False,
        decimal_places=2,
        widget=forms.NumberInput(attrs={
            'class': 'form-control',
            'placeholder': 'Min price',
            'step': '0.01'
        }),
        label='Min Price'
    )
    
    max_price = forms.DecimalField(
        required=False,
        decimal_places=2,
        widget=forms.NumberInput(attrs={
            'class': 'form-control',
            'placeholder': 'Max price',
            'step': '0.01'
        }),
        label='Max Price'
    )
    
    location = forms.ChoiceField(
        required=False,
        choices=[('', 'All Locations')] + Product._meta.get_field('location').choices,
        widget=forms.Select(attrs={
            'class': 'form-select'
        }),
        label='Location'
    )
    
    condition = forms.MultipleChoiceField(
        required=False,
        choices=Product._meta.get_field('condition').choices,
        widget=forms.CheckboxSelectMultiple(attrs={
            'class': 'form-check-input'
        }),
        label='Condition'
    )
    
    sort_by = forms.ChoiceField(
        required=False,
        choices=[
            ('', 'Relevance'),
            ('-created_at', 'Newest First'),
            ('created_at', 'Oldest First'),
            ('price', 'Price: Low to High'),
            ('-price', 'Price: High to Low'),
            ('name', 'Name: A to Z'),
            ('-name', 'Name: Z to A'),
        ],
        widget=forms.Select(attrs={
            'class': 'form-select'
        }),
        label='Sort By'
    )
