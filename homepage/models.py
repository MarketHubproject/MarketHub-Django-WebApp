from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.urls import reverse
from decimal import Decimal

CATEGORY_CHOICES = [
    ('electronics', 'Electronics'),
    ('clothing', 'Clothing'),
    ('books', 'Books'),
    ('furniture', 'Furniture'),
    ('other', 'Other'),
]


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='category_images/', help_text="Category banner image")
    icon_class = models.CharField(max_length=100, blank=True, help_text="CSS icon class (e.g., fas fa-laptop)")
    is_featured = models.BooleanField(default=False, help_text="Display in featured categories section")
    order = models.PositiveIntegerField(default=0, help_text="Display order (lower numbers first)")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'name']
        verbose_name = 'Category'
        verbose_name_plural = 'Categories'

    def __str__(self):
        return self.name

    def get_product_count(self):
        """Get the number of products in this category"""
        # For now, filter products by category slug since we haven't migrated Product model yet
        from .models import Product
        return Product.objects.filter(category=self.slug).count()

    @classmethod
    def get_featured_categories(cls):
        """Get featured categories ordered by display order"""
        return cls.objects.filter(is_featured=True).order_by('order', 'name')


class HeroSlide(models.Model):
    title = models.CharField(max_length=200, help_text="Main headline for the slide")
    subtitle = models.CharField(max_length=300, blank=True, help_text="Secondary text under the title")
    image = models.ImageField(upload_to='hero_slides/', help_text="Recommended size: 1920x800px")
    cta_text = models.CharField(max_length=100, blank=True, help_text="Text for the call-to-action button")
    cta_url = models.URLField(blank=True, help_text="URL for the call-to-action button")
    is_active = models.BooleanField(default=True, help_text="Whether this slide should be displayed")
    order = models.PositiveIntegerField(default=0, help_text="Display order (lower numbers first)")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'created_at']
        verbose_name = 'Hero Slide'
        verbose_name_plural = 'Hero Slides'

    def __str__(self):
        return f"{self.title} ({'Active' if self.is_active else 'Inactive'})"

    @classmethod
    def get_active_slides(cls):
        """Get all active slides ordered by their display order"""
        return cls.objects.filter(is_active=True).order_by('order', 'created_at')


class Promotion(models.Model):
    title = models.CharField(max_length=200, help_text="Promotion title/headline")
    text = models.TextField(max_length=500, help_text="Promotion description or offer details")
    image = models.ImageField(upload_to='promotion_images/',
                              help_text="Promotion banner image (recommended size: 600x400px)")
    link = models.URLField(help_text="Link to promotion page or product")
    valid_from = models.DateTimeField(help_text="Promotion start date and time")
    valid_to = models.DateTimeField(help_text="Promotion end date and time")
    is_active = models.BooleanField(default=True, help_text="Whether this promotion should be displayed")
    order = models.PositiveIntegerField(default=0, help_text="Display order (lower numbers first)")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', '-created_at']
        verbose_name = 'Promotion'
        verbose_name_plural = 'Promotions'

    def __str__(self):
        return f"{self.title} ({'Active' if self.is_active and self.is_valid else 'Inactive'})"

    @property
    def is_valid(self):
        """Check if promotion is currently valid based on dates"""
        now = timezone.now()
        return self.valid_from <= now <= self.valid_to

    @classmethod
    def get_active_promotions(cls):
        """Get all active and valid promotions ordered by display order"""
        now = timezone.now()
        return cls.objects.filter(
            is_active=True,
            valid_from__lte=now,
            valid_to__gte=now
        ).order_by('order', '-created_at')


class Product(models.Model):
    CATEGORY_CHOICES = CATEGORY_CHOICES  # Make it accessible as Product.CATEGORY_CHOICES

    LOCATION_CHOICES = [
        ('cape_town_central', 'Cape Town Central'),
        ('cape_town_northern_suburbs', 'Cape Town Northern Suburbs'),
        ('cape_town_southern_suburbs', 'Cape Town Southern Suburbs'),
        ('cape_town_western_suburbs', 'Cape Town Western Suburbs'),
        ('cape_town_eastern_suburbs', 'Cape Town Eastern Suburbs'),
        ('cape_town_atlantic_seaboard', 'Cape Town Atlantic Seaboard'),
        ('cape_town_west_coast', 'Cape Town West Coast'),
        ('cape_town_helderberg', 'Cape Town Helderberg'),
    ]

    CONDITION_CHOICES = [
        ('excellent', 'Excellent - Like New'),
        ('very_good', 'Very Good - Minor Wear'),
        ('good', 'Good - Some Wear'),
        ('fair', 'Fair - Well Used'),
        ('poor', 'Poor - Needs Repair'),
    ]

    STATUS_CHOICES = [
        ('available', 'Available'),
        ('reserved', 'Reserved'),
        ('sold', 'Sold'),
        ('inactive', 'Inactive'),
    ]

    name = models.CharField(max_length=100)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2, help_text="Price in South African Rands (R)")
    original_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Original retail price")
    image = models.ImageField(upload_to='product_images/', blank=True, null=True)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='other')
    condition = models.CharField(max_length=20, choices=CONDITION_CHOICES, default='good')
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='available',
        help_text="Product availability status")
    location = models.CharField(
        max_length=50,
        choices=LOCATION_CHOICES,
        default='cape_town_central',
        help_text="Location within Cape Town area")
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='products_for_sale', null=True, blank=True)
    is_sold = models.BooleanField(default=False)
    is_featured = models.BooleanField(default=False)
    views_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['category']),
            models.Index(fields=['location']),
            models.Index(fields=['is_sold']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return self.name

    def get_absolute_url(self):
        return reverse('product_detail', kwargs={'pk': self.pk})

    def get_discount_percentage(self):
        """Calculate discount percentage if original price is provided"""
        if self.original_price and self.original_price > 0:
            discount = ((self.original_price - self.price) / self.original_price) * 100
            return round(discount)
        return 0

    def get_average_rating(self):
        """Get average rating from reviews"""
        reviews = self.reviews.filter(is_approved=True)
        if reviews.exists():
            return round(reviews.aggregate(models.Avg('rating'))['rating__avg'], 1)
        return 0

    def get_reviews_count(self):
        """Get total approved reviews count"""
        return self.reviews.filter(is_approved=True).count()

    def is_favorited_by(self, user):
        """Check if product is favorited by specific user"""
        if user.is_authenticated:
            return Favorite.objects.filter(user=user, product=self).exists()
        return False

    def increment_views(self):
        """Increment product views count"""
        self.views_count += 1
        self.save(update_fields=['views_count'])


class Cart(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Cart for {self.user.username}"

    def get_total_price(self):
        return sum(item.get_total_price() for item in self.items.all())

    def get_total_items(self):
        return sum(item.quantity for item in self.items.all())


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    added_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.quantity} x {self.product.name}"

    def get_total_price(self):
        return self.quantity * self.product.price

    class Meta:
        unique_together = ('cart', 'product')


class Favorite(models.Model):
    """User's favorite/wishlist products"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='homepage_favorites')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='homepage_favorited_by')
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'product')
        ordering = ['-added_at']

    def __str__(self):
        return f"{self.user.username}'s verification profile"


class Review(models.Model):
    """Product reviews and ratings"""
    RATING_CHOICES = [(i, i) for i in range(1, 6)]

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews_written')  # Reviews written by user
    buyer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='reviews_given',
        null=True,
        blank=True)  # Compatibility field
    seller = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='reviews_received',
        null=True,
        blank=True)  # Reviews on seller's products
    rating = models.PositiveIntegerField(choices=RATING_CHOICES)
    title = models.CharField(max_length=200, blank=True)
    comment = models.TextField(blank=True)
    is_approved = models.BooleanField(default=True)
    helpful_votes = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('product', 'user')
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        # Automatically set buyer and seller fields for compatibility
        if not self.buyer:
            self.buyer = self.user
        if not self.seller and self.product and self.product.seller:
            self.seller = self.product.seller
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.product.name} - {self.rating}★ by {self.user.username}"


class ProductImage(models.Model):
    """Additional product images"""
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='additional_images')
    image = models.ImageField(upload_to='product_images/additional/')
    alt_text = models.CharField(max_length=200, blank=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'created_at']

    def __str__(self):
        return f"{self.product.name} - Image {self.order}"


class SearchHistory(models.Model):
    """Track user search history for analytics and recommendations"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='search_history', null=True, blank=True)
    query = models.CharField(max_length=200)
    results_count = models.PositiveIntegerField(default=0)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Search History'
        verbose_name_plural = 'Search Histories'

    def __str__(self):
        return f"'{self.query}' by {self.user.username if self.user else 'Anonymous'}"


class Notification(models.Model):
    """User notifications system"""
    NOTIFICATION_TYPES = [
        ('new_product', 'New Product in Category'),
        ('price_drop', 'Price Drop on Watched Product'),
        ('review', 'New Review on Your Product'),
        ('sale', 'Product Sold'),
        ('message', 'New Message'),
        ('system', 'System Notification'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    product = models.ForeignKey(Product, on_delete=models.CASCADE, null=True, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} for {self.user.username}"


class ProductView(models.Model):
    """Track product views for analytics"""
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='product_views')
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.CharField(max_length=300, blank=True)
    viewed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-viewed_at']

    def __str__(self):
        return f"{self.product.name} viewed by {self.user.username if self.user else 'Anonymous'}"


class SavedSearch(models.Model):
    """User saved searches with alerts"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='saved_searches')
    name = models.CharField(max_length=100)
    query = models.CharField(max_length=200, blank=True)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, blank=True)
    min_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    max_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    location = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=True)
    email_alerts = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} by {self.user.username}"


class Order(models.Model):
    """Customer orders"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    ]

    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    order_number = models.CharField(max_length=100, unique=True, editable=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')

    # Shipping Information
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    address_line_1 = models.CharField(max_length=255)
    address_line_2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100)
    province = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20)

    # Order Totals
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    shipping_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)

    # Payment Information
    payment_method = models.CharField(max_length=50, blank=True)
    payment_reference = models.CharField(max_length=255, blank=True)

    # Notes and Tracking
    notes = models.TextField(blank=True)
    tracking_number = models.CharField(max_length=100, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Order {self.order_number} - {self.user.username}"

    def save(self, *args, **kwargs):
        if not self.order_number:
            # Generate unique order number
            import uuid
            from datetime import datetime
            date_str = datetime.now().strftime('%Y%m%d')
            unique_id = str(uuid.uuid4())[:8].upper()
            self.order_number = f"MH{date_str}{unique_id}"
        super().save(*args, **kwargs)

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}"

    def get_full_address(self):
        address_parts = [self.address_line_1]
        if self.address_line_2:
            address_parts.append(self.address_line_2)
        address_parts.extend([self.city, self.province, self.postal_code])
        return ", ".join(address_parts)


class OrderItem(models.Model):
    """Items within an order"""
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)  # Price at time of order

    def __str__(self):
        return f"{self.quantity} x {self.product.name} (Order: {self.order.order_number})"

    def get_total_price(self):
        return self.quantity * self.price


class Payment(models.Model):
    """Payment records for orders"""
    PAYMENT_METHOD_CHOICES = [
        ('card', 'Credit/Debit Card'),
        ('payfast', 'PayFast'),
        ('eft', 'EFT Transfer'),
        ('cash', 'Cash on Delivery'),
        ('paypal', 'PayPal'),
    ]

    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
    ]

    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='payment')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='ZAR')
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    
    # Payment Gateway Information
    transaction_id = models.CharField(max_length=255, blank=True, null=True)
    gateway_reference = models.CharField(max_length=255, blank=True, null=True)
    gateway_response = models.JSONField(blank=True, null=True)
    
    # Stripe-specific fields
    stripe_payment_intent_id = models.CharField(max_length=255, blank=True, null=True)
    stripe_customer_id = models.CharField(max_length=255, blank=True, null=True)
    is_refunded = models.BooleanField(default=False)
    
    # Card Payment Details (if applicable)
    card_last_four = models.CharField(max_length=4, blank=True, null=True)
    card_brand = models.CharField(max_length=20, blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Fees and charges
    gateway_fee = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    net_amount = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    
    class Meta:
        ordering = ['-created_at']
        
    def __str__(self):
        return f"Payment {self.transaction_id or 'Pending'} for Order {self.order.order_number}"
        
    def save(self, *args, **kwargs):
        if not self.net_amount:
            self.net_amount = self.amount - self.gateway_fee
        super().save(*args, **kwargs)
        
    @property
    def is_successful(self):
        return self.status == 'completed'
        
    @property
    def is_pending(self):
        return self.status in ['pending', 'processing']


class PaymentMethod(models.Model):
    """Saved payment methods for users"""
    CARD_TYPES = [
        ('visa', 'Visa'),
        ('mastercard', 'Mastercard'),
        ('amex', 'American Express'),
        ('other', 'Other'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payment_methods')
    card_type = models.CharField(max_length=20, choices=CARD_TYPES)
    last_four = models.CharField(max_length=4)
    expiry_month = models.CharField(max_length=2)
    expiry_year = models.CharField(max_length=4)
    cardholder_name = models.CharField(max_length=100)
    
    # Security - never store actual card numbers or CVV
    token = models.CharField(max_length=255, help_text="Tokenized card reference from payment gateway")
    
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-is_default', '-created_at']
        
    def __str__(self):
        return f"{self.get_card_type_display()} ending in {self.last_four}"
        
    def save(self, *args, **kwargs):
        if self.is_default:
            # Ensure only one default payment method per user
            PaymentMethod.objects.filter(user=self.user, is_default=True).update(is_default=False)
        super().save(*args, **kwargs)


class ProductDraft(models.Model):
    """Saved drafts of products being created"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='product_drafts')
    name = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, blank=True)
    condition = models.CharField(max_length=20, blank=True)
    location = models.CharField(max_length=50, blank=True)
    
    # Image placeholder or temporary image
    temp_image = models.ImageField(upload_to='product_drafts/', blank=True, null=True)
    
    # Additional metadata
    draft_data = models.JSONField(blank=True, null=True, help_text="Additional form data")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-updated_at']
        
    def __str__(self):
        return f"Draft: {self.name or 'Untitled'} by {self.user.username}"


def user_id_upload_path(instance, filename):
    """Generate secure upload path for user ID/passport images"""
    # Create a hash-based filename to avoid collisions
    ext = filename.split('.')[-1]
    filename = f"{instance.user.id}_{timezone.now().strftime('%Y%m%d_%H%M%S')}.{ext}"
    return f"user_ids/{timezone.now().year}/{timezone.now().month}/{filename}"


class UserVerificationProfile(models.Model):
    """Extended profile for regular users with ID/Passport verification"""
    
    ID_TYPE_CHOICES = [
        ('id', 'South African ID Document'),
        ('passport', 'Passport'),
    ]
    
    VERIFICATION_STATUS_CHOICES = [
        ('pending', 'Pending Upload'),
        ('uploaded', 'Document Uploaded'),
        ('processing', 'Processing'),
        ('verified', 'Verified'),
        ('rejected', 'Rejected'),
        ('expired', 'Expired'),
        ('appealing', 'Under Appeal'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='verification_profile')
    
    # Personal Information
    phone_number = models.CharField(max_length=20, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    
    # ID/Passport Verification
    id_type = models.CharField(
        max_length=10,
        choices=ID_TYPE_CHOICES,
        help_text="Choose between South African ID or Passport"
    )
    id_number = models.CharField(
        max_length=50, 
        blank=True, 
        help_text="ID or Passport number"
    )
    id_image_front = models.ImageField(
        upload_to=user_id_upload_path, 
        null=True, 
        blank=True,
        help_text="Upload front side of ID or passport photo page"
    )
    id_image_back = models.ImageField(
        upload_to=user_id_upload_path, 
        null=True, 
        blank=True,
        help_text="Upload back side of ID (not required for passport)"
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
        related_name='verified_users'
    )
    rejection_reason = models.TextField(blank=True)
    verification_notes = models.TextField(blank=True, help_text="Internal notes for verification")
    
    # Extracted Data from OCR/Manual Review
    extracted_name = models.CharField(max_length=200, blank=True)
    extracted_id_number = models.CharField(max_length=50, blank=True)
    extracted_date_of_birth = models.DateField(null=True, blank=True)
    extracted_address = models.TextField(blank=True)
    ocr_raw_data = models.JSONField(default=dict, blank=True)
    
    # Security & Privacy
    id_hash_front = models.CharField(max_length=64, blank=True, help_text="SHA-256 hash of front image")
    id_hash_back = models.CharField(max_length=64, blank=True, help_text="SHA-256 hash of back image")
    upload_ip = models.GenericIPAddressField(null=True, blank=True)
    upload_user_agent = models.TextField(blank=True)
    
    # Expiration and Lifecycle
    id_expires_at = models.DateTimeField(null=True, blank=True, help_text="When the ID/passport expires")
    verification_expires_at = models.DateTimeField(null=True, blank=True, help_text="When verification expires")
    last_verification_check = models.DateTimeField(auto_now=True)
    
    # Status Tracking
    terms_accepted = models.BooleanField(default=False)
    privacy_consent = models.BooleanField(default=False)
    is_approved_user = models.BooleanField(default=False, help_text="User approved for platform access")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.get_full_name() or self.user.username} - {self.get_id_type_display()}"
    
    def save(self, *args, **kwargs):
        import hashlib
        
        # Generate hash of ID images if uploaded
        if self.id_image_front and not self.id_hash_front:
            self.id_hash_front = self._generate_image_hash(self.id_image_front)
        
        if self.id_image_back and not self.id_hash_back:
            self.id_hash_back = self._generate_image_hash(self.id_image_back)
        
        # Set verification expiration (2 years from verification)
        if self.id_verified == 'verified' and self.verified_at and not self.verification_expires_at:
            from datetime import timedelta
            self.verification_expires_at = self.verified_at + timedelta(days=730)
        
        # Update user approval status
        if self.id_verified == 'verified':
            self.is_approved_user = True
        elif self.id_verified in ['rejected', 'expired']:
            self.is_approved_user = False
        
        super().save(*args, **kwargs)
    
    def _generate_image_hash(self, image_field):
        """Generate SHA-256 hash of the uploaded image"""
        if image_field:
            image_field.seek(0)
            content = image_field.read()
            image_field.seek(0)
            import hashlib
            return hashlib.sha256(content).hexdigest()
        return ''
    
    @property
    def is_verified(self):
        """Check if the user is verified and verification hasn't expired"""
        if self.id_verified != 'verified':
            return False
        
        if self.verification_expires_at and timezone.now() > self.verification_expires_at:
            # Mark as expired
            self.id_verified = 'expired'
            self.is_approved_user = False
            self.save(update_fields=['id_verified', 'is_approved_user'])
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
        """Check if user can upload/re-upload ID"""
        return self.id_verified in ['pending', 'rejected', 'expired']
    
    def mark_as_verified(self, verified_by_user, notes=''):
        """Mark user as verified"""
        self.id_verified = 'verified'
        self.verified_at = timezone.now()
        self.verified_by = verified_by_user
        self.verification_notes = notes
        self.is_approved_user = True
        from datetime import timedelta
        self.verification_expires_at = timezone.now() + timedelta(days=730)
        self.save()
        
        # Log the verification
        UserVerificationLog.objects.create(
            user_profile=self,
            action='manual_verify',
            result='approved',
            details={'notes': notes, 'verified_by': verified_by_user.username},
            performed_by=verified_by_user
        )
    
    def mark_as_rejected(self, rejected_by_user, reason):
        """Mark user as rejected"""
        self.id_verified = 'rejected'
        self.rejection_reason = reason
        self.verification_notes = f"Rejected: {reason}"
        self.is_approved_user = False
        self.save()
        
        # Log the rejection
        UserVerificationLog.objects.create(
            user_profile=self,
            action='manual_reject',
            result='rejected',
            details={'reason': reason, 'rejected_by': rejected_by_user.username},
            performed_by=rejected_by_user
        )
    
    class Meta:
        db_table = 'homepage_userprofile'
        verbose_name = "User Profile"
        verbose_name_plural = "User Profiles"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['id_verified']),
            models.Index(fields=['created_at']),
            models.Index(fields=['verification_expires_at']),
            models.Index(fields=['is_approved_user']),
        ]


class UserVerificationLog(models.Model):
    """Log all user verification-related actions for audit purposes"""
    
    ACTION_CHOICES = [
        ('upload', 'ID/Passport Uploaded'),
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
    
    user_profile = models.ForeignKey(UserVerificationProfile, on_delete=models.CASCADE, related_name='verification_logs')
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
        return f"{self.user_profile.user.username} - {self.action} - {self.result}"
    
    class Meta:
        db_table = 'homepage_userverificationlog'
        verbose_name = "User Verification Log"
        verbose_name_plural = "User Verification Logs"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user_profile', 'action']),
            models.Index(fields=['created_at']),
            models.Index(fields=['result']),
        ]


class UserVerificationAppeal(models.Model):
    """Model for handling user verification appeals"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('under_review', 'Under Review'),
        ('approved', 'Appeal Approved'),
        ('denied', 'Appeal Denied'),
        ('withdrawn', 'Withdrawn'),
    ]
    
    user_profile = models.ForeignKey(UserVerificationProfile, on_delete=models.CASCADE, related_name='appeals')
    reason = models.TextField(help_text="Reason for the appeal")
    additional_documents = models.FileField(
        upload_to='user_appeal_documents/',
        null=True,
        blank=True,
        help_text="Optional additional documentation"
    )
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Review Information
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    review_notes = models.TextField(blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Appeal by {self.user_profile.user.username} - {self.status}"
    
    class Meta:
        db_table = 'homepage_userverificationappeal'
        verbose_name = "User Verification Appeal"
        verbose_name_plural = "User Verification Appeals"
        ordering = ['-created_at']
