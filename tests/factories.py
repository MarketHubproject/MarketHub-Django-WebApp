"""
Factory classes for generating test data using factory_boy.

These factories provide realistic test data for models in the MarketHub application.
"""
import factory
from factory import fuzzy
from factory.django import DjangoModelFactory
from django.contrib.auth.models import User
from decimal import Decimal
from datetime import datetime, timedelta
from faker import Faker

from homepage.models import (
    Product, Category, Cart, CartItem, Order, OrderItem, Payment,
    PaymentMethod, Review, Favorite, Notification, HeroSlide,
    Promotion, ProductImage, SearchHistory, ProductView, SavedSearch
)

fake = Faker()


class UserFactory(DjangoModelFactory):
    """Factory for creating User instances."""
    
    class Meta:
        model = User
        django_get_or_create = ('username',)
    
    username = factory.Sequence(lambda n: f"user{n}")
    email = factory.LazyAttribute(lambda obj: f"{obj.username}@example.com")
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    is_staff = False
    is_superuser = False
    is_active = True


class AdminUserFactory(UserFactory):
    """Factory for creating admin User instances."""
    
    username = factory.Sequence(lambda n: f"admin{n}")
    is_staff = True
    is_superuser = True


class CategoryFactory(DjangoModelFactory):
    """Factory for creating Category instances."""
    
    class Meta:
        model = Category
    
    name = factory.Faker('word')
    slug = factory.LazyAttribute(lambda obj: obj.name.lower().replace(' ', '-'))
    description = factory.Faker('text', max_nb_chars=200)
    icon_class = factory.Faker('random_element', elements=['fas fa-laptop', 'fas fa-tshirt', 'fas fa-book'])
    is_featured = factory.Faker('boolean', chance_of_getting_true=30)
    order = factory.Sequence(lambda n: n)


class ProductFactory(DjangoModelFactory):
    """Factory for creating Product instances."""
    
    class Meta:
        model = Product
    
    name = factory.Faker('catch_phrase')
    description = factory.Faker('text')
    price = fuzzy.FuzzyDecimal(low=10.0, high=1000.0, precision=2)
    original_price = factory.LazyAttribute(lambda obj: obj.price + Decimal('50.00') if fake.boolean() else None)
    category = factory.Faker('random_element', elements=['electronics', 'clothing', 'books', 'furniture', 'other'])
    condition = factory.Faker('random_element', elements=['excellent', 'very_good', 'good', 'fair', 'poor'])
    status = factory.Faker('random_element', elements=['available', 'reserved', 'sold', 'inactive'])
    location = factory.Faker('random_element', elements=[
        'cape_town_central', 'cape_town_northern_suburbs', 'cape_town_southern_suburbs'
    ])
    seller = factory.SubFactory(UserFactory)
    is_sold = False
    is_featured = factory.Faker('boolean', chance_of_getting_true=20)
    views_count = factory.Faker('random_int', min=0, max=500)


class ProductImageFactory(DjangoModelFactory):
    """Factory for creating ProductImage instances."""
    
    class Meta:
        model = ProductImage
    
    product = factory.SubFactory(ProductFactory)
    image = factory.django.ImageField(color='blue')
    alt_text = factory.Faker('sentence', nb_words=4)
    order = factory.Sequence(lambda n: n)


class CartFactory(DjangoModelFactory):
    """Factory for creating Cart instances."""
    
    class Meta:
        model = Cart
    
    user = factory.SubFactory(UserFactory)


class CartItemFactory(DjangoModelFactory):
    """Factory for creating CartItem instances."""
    
    class Meta:
        model = CartItem
    
    cart = factory.SubFactory(CartFactory)
    product = factory.SubFactory(ProductFactory)
    quantity = factory.Faker('random_int', min=1, max=5)


class OrderFactory(DjangoModelFactory):
    """Factory for creating Order instances."""
    
    class Meta:
        model = Order
    
    user = factory.SubFactory(UserFactory)
    status = factory.Faker('random_element', elements=['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
    payment_status = factory.Faker('random_element', elements=['pending', 'paid', 'failed', 'refunded'])
    
    # Shipping Information
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    email = factory.Faker('email')
    phone = factory.Faker('phone_number')
    address_line_1 = factory.Faker('street_address')
    address_line_2 = factory.Faker('secondary_address')
    city = factory.Faker('city')
    province = 'Western Cape'
    postal_code = factory.Faker('postcode')
    
    # Order Totals
    subtotal = fuzzy.FuzzyDecimal(low=50.0, high=500.0, precision=2)
    shipping_cost = fuzzy.FuzzyDecimal(low=0.0, high=50.0, precision=2)
    tax_amount = factory.LazyAttribute(lambda obj: obj.subtotal * Decimal('0.15'))
    total_amount = factory.LazyAttribute(lambda obj: obj.subtotal + obj.shipping_cost + obj.tax_amount)
    
    # Payment Information
    payment_method = factory.Faker('random_element', elements=['card', 'payfast', 'eft'])


class OrderItemFactory(DjangoModelFactory):
    """Factory for creating OrderItem instances."""
    
    class Meta:
        model = OrderItem
    
    order = factory.SubFactory(OrderFactory)
    product = factory.SubFactory(ProductFactory)
    quantity = factory.Faker('random_int', min=1, max=3)
    price = factory.LazyAttribute(lambda obj: obj.product.price)


class PaymentFactory(DjangoModelFactory):
    """Factory for creating Payment instances."""
    
    class Meta:
        model = Payment
    
    order = factory.SubFactory(OrderFactory)
    payment_method = factory.Faker('random_element', elements=['card', 'payfast', 'eft', 'cash', 'paypal'])
    amount = factory.LazyAttribute(lambda obj: obj.order.total_amount)
    currency = 'ZAR'
    status = factory.Faker('random_element', elements=['pending', 'processing', 'completed', 'failed', 'cancelled'])
    transaction_id = factory.Sequence(lambda n: f"txn_{n}")
    gateway_reference = factory.Sequence(lambda n: f"ref_{n}")
    stripe_payment_intent_id = factory.Sequence(lambda n: f"pi_test_{n}")
    card_last_four = factory.Faker('random_element', elements=['1234', '5678', '9012'])
    card_brand = factory.Faker('random_element', elements=['visa', 'mastercard', 'amex'])
    gateway_fee = fuzzy.FuzzyDecimal(low=2.0, high=10.0, precision=2)


class PaymentMethodFactory(DjangoModelFactory):
    """Factory for creating PaymentMethod instances."""
    
    class Meta:
        model = PaymentMethod
    
    user = factory.SubFactory(UserFactory)
    card_type = factory.Faker('random_element', elements=['visa', 'mastercard', 'amex', 'other'])
    last_four = factory.Faker('random_element', elements=['1234', '5678', '9012', '3456'])
    expiry_month = factory.Faker('random_element', elements=['01', '06', '12'])
    expiry_year = factory.Faker('random_element', elements=['2025', '2026', '2027', '2028'])
    cardholder_name = factory.Faker('name')
    token = factory.Sequence(lambda n: f"token_{n}")
    is_default = factory.Faker('boolean', chance_of_getting_true=20)
    is_active = True


class ReviewFactory(DjangoModelFactory):
    """Factory for creating Review instances."""
    
    class Meta:
        model = Review
    
    product = factory.SubFactory(ProductFactory)
    user = factory.SubFactory(UserFactory)
    rating = factory.Faker('random_int', min=1, max=5)
    title = factory.Faker('sentence', nb_words=6)
    comment = factory.Faker('text')
    is_approved = True
    helpful_votes = factory.Faker('random_int', min=0, max=20)


class FavoriteFactory(DjangoModelFactory):
    """Factory for creating Favorite instances."""
    
    class Meta:
        model = Favorite
    
    user = factory.SubFactory(UserFactory)
    product = factory.SubFactory(ProductFactory)


class NotificationFactory(DjangoModelFactory):
    """Factory for creating Notification instances."""
    
    class Meta:
        model = Notification
    
    user = factory.SubFactory(UserFactory)
    notification_type = factory.Faker('random_element', elements=[
        'new_product', 'price_drop', 'review', 'sale', 'message', 'system'
    ])
    title = factory.Faker('sentence', nb_words=5)
    message = factory.Faker('text')
    product = factory.SubFactory(ProductFactory)
    is_read = factory.Faker('boolean', chance_of_getting_true=30)


class HeroSlideFactory(DjangoModelFactory):
    """Factory for creating HeroSlide instances."""
    
    class Meta:
        model = HeroSlide
    
    title = factory.Faker('catch_phrase')
    subtitle = factory.Faker('sentence')
    image = factory.django.ImageField(color='red')
    cta_text = factory.Faker('word')
    cta_url = factory.Faker('url')
    is_active = True
    order = factory.Sequence(lambda n: n)


class PromotionFactory(DjangoModelFactory):
    """Factory for creating Promotion instances."""
    
    class Meta:
        model = Promotion
    
    title = factory.Faker('catch_phrase')
    text = factory.Faker('text', max_nb_chars=500)
    image = factory.django.ImageField(color='green')
    link = factory.Faker('url')
    valid_from = factory.Faker('date_time_this_year', before_now=True, after_now=False)
    valid_to = factory.Faker('date_time_this_year', before_now=False, after_now=True)
    is_active = True
    order = factory.Sequence(lambda n: n)


class SearchHistoryFactory(DjangoModelFactory):
    """Factory for creating SearchHistory instances."""
    
    class Meta:
        model = SearchHistory
    
    user = factory.SubFactory(UserFactory)
    query = factory.Faker('word')
    results_count = factory.Faker('random_int', min=0, max=100)
    ip_address = factory.Faker('ipv4')


class ProductViewFactory(DjangoModelFactory):
    """Factory for creating ProductView instances."""
    
    class Meta:
        model = ProductView
    
    product = factory.SubFactory(ProductFactory)
    user = factory.SubFactory(UserFactory)
    ip_address = factory.Faker('ipv4')
    user_agent = factory.Faker('user_agent')


class SavedSearchFactory(DjangoModelFactory):
    """Factory for creating SavedSearch instances."""
    
    class Meta:
        model = SavedSearch
    
    user = factory.SubFactory(UserFactory)
    name = factory.Faker('sentence', nb_words=3)
    query = factory.Faker('word')
    category = factory.Faker('random_element', elements=['electronics', 'clothing', 'books'])
    min_price = fuzzy.FuzzyDecimal(low=10.0, high=50.0, precision=2)
    max_price = fuzzy.FuzzyDecimal(low=100.0, high=500.0, precision=2)
    location = factory.Faker('random_element', elements=['cape_town_central', 'cape_town_northern_suburbs'])
    is_active = True
    email_alerts = factory.Faker('boolean', chance_of_getting_true=70)


# Helper functions for creating test data scenarios

def create_complete_order_scenario(user=None):
    """Create a complete order with items and payment."""
    if not user:
        user = UserFactory()
    
    order = OrderFactory(user=user, payment_status='paid', status='processing')
    
    # Create order items
    for _ in range(3):
        OrderItemFactory(order=order)
    
    # Create payment
    PaymentFactory(order=order, status='completed')
    
    return order


def create_product_with_reviews_scenario(seller=None, num_reviews=5):
    """Create a product with multiple reviews."""
    if not seller:
        seller = UserFactory()
    
    product = ProductFactory(seller=seller, is_featured=True)
    
    # Create reviews
    reviewers = UserFactory.create_batch(num_reviews)
    for reviewer in reviewers:
        ReviewFactory(product=product, user=reviewer)
    
    return product


def create_cart_with_items_scenario(user=None, num_items=3):
    """Create a cart with multiple items."""
    if not user:
        user = UserFactory()
    
    cart = CartFactory(user=user)
    
    # Create cart items
    for _ in range(num_items):
        CartItemFactory(cart=cart)
    
    return cart


def create_user_with_full_profile_scenario():
    """Create a user with complete profile data."""
    user = UserFactory()
    
    # Add payment methods
    PaymentMethodFactory.create_batch(2, user=user)
    
    # Add favorites
    products = ProductFactory.create_batch(5)
    for product in products:
        FavoriteFactory(user=user, product=product)
    
    # Add search history
    SearchHistoryFactory.create_batch(10, user=user)
    
    # Add saved searches
    SavedSearchFactory.create_batch(3, user=user)
    
    return user
