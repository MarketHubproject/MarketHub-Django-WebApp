"""
Test suite for MarketHub models

This module contains comprehensive tests for all models in the MarketHub application,
ensuring data integrity, relationships, and business logic validation.
"""
import tempfile
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from homepage.models import (
    Product, Cart, CartItem, Order, OrderItem, Category, 
    HeroSlide, Promotion, Payment, PaymentMethod, Review, 
    Favorite, ProductImage, Notification
)


class ProductModelTest(TestCase):
    """Test cases for Product model"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # Create a test image file
        self.image = SimpleUploadedFile(
            name='test_image.jpg',
            content=b'test image content',
            content_type='image/jpeg'
        )
    
    def test_product_creation(self):
        """Test product creation with valid data"""
        product = Product.objects.create(
            name='Test Product',
            description='A test product description',
            price=Decimal('99.99'),
            category='electronics',
            condition='new',
            location='cape_town_central',
            seller=self.user,
            image=self.image
        )
        
        self.assertEqual(product.name, 'Test Product')
        self.assertEqual(product.price, Decimal('99.99'))
        self.assertEqual(product.seller, self.user)
        self.assertEqual(product.status, 'available')
        self.assertTrue(product.image)
        self.assertIsNotNone(product.created_at)
        self.assertIsNotNone(product.updated_at)
    
    def test_product_str_method(self):
        """Test Product __str__ method"""
        product = Product.objects.create(
            name='Test Product',
            description='Test description',
            price=Decimal('50.00'),
            seller=self.user
        )
        
        self.assertEqual(str(product), 'Test Product')
    
    def test_product_get_absolute_url(self):
        """Test Product get_absolute_url method"""
        product = Product.objects.create(
            name='Test Product',
            description='Test description',
            price=Decimal('50.00'),
            seller=self.user
        )
        
        expected_url = f'/products/{product.id}/'
        self.assertEqual(product.get_absolute_url(), expected_url)
    
    def test_product_creation_with_valid_price(self):
        """Test product creation with positive price"""
        # Test that products can be created with valid prices
        product = Product.objects.create(
            name='Valid Product',
            description='Test description',
            price=Decimal('10.00'),
            seller=self.user
        )
        self.assertEqual(product.price, Decimal('10.00'))
        self.assertTrue(product.price > 0)
    
    def test_product_category_choices(self):
        """Test product category choices"""
        valid_categories = [choice[0] for choice in Product.CATEGORY_CHOICES]
        
        # Test valid category
        product = Product.objects.create(
            name='Test Product',
            description='Test description',
            price=Decimal('50.00'),
            category='electronics',
            seller=self.user
        )
        self.assertIn(product.category, valid_categories)
    
    def test_product_search_functionality(self):
        """Test product search capabilities"""
        product1 = Product.objects.create(
            name='iPhone 13',
            description='Apple smartphone',
            price=Decimal('999.00'),
            category='electronics',
            seller=self.user
        )
        
        product2 = Product.objects.create(
            name='Samsung Galaxy',
            description='Android phone',
            price=Decimal('899.00'),
            category='electronics',
            seller=self.user
        )
        
        # Test name search
        results = Product.objects.filter(name__icontains='iPhone')
        self.assertIn(product1, results)
        self.assertNotIn(product2, results)
        
        # Test description search
        results = Product.objects.filter(description__icontains='smartphone')
        self.assertIn(product1, results)


class CartModelTest(TestCase):
    """Test cases for Cart and CartItem models"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='cartuser',
            email='cart@example.com',
            password='testpass123'
        )
        
        self.product = Product.objects.create(
            name='Cart Test Product',
            description='Product for cart testing',
            price=Decimal('25.00'),
            seller=self.user
        )
    
    def test_cart_creation(self):
        """Test cart creation"""
        cart = Cart.objects.create(user=self.user)
        
        self.assertEqual(cart.user, self.user)
        self.assertIsNotNone(cart.created_at)
        self.assertIsNotNone(cart.updated_at)
    
    def test_cart_str_method(self):
        """Test Cart __str__ method"""
        cart = Cart.objects.create(user=self.user)
        expected_str = f"Cart for {self.user.username}"
        self.assertEqual(str(cart), expected_str)
    
    def test_cart_item_creation(self):
        """Test cart item creation"""
        cart = Cart.objects.create(user=self.user)
        cart_item = CartItem.objects.create(
            cart=cart,
            product=self.product,
            quantity=2
        )
        
        self.assertEqual(cart_item.cart, cart)
        self.assertEqual(cart_item.product, self.product)
        self.assertEqual(cart_item.quantity, 2)
        self.assertIsNotNone(cart_item.added_at)
    
    def test_cart_item_total_price(self):
        """Test cart item total price calculation"""
        cart = Cart.objects.create(user=self.user)
        cart_item = CartItem.objects.create(
            cart=cart,
            product=self.product,
            quantity=3
        )
        
        expected_total = self.product.price * 3
        self.assertEqual(cart_item.get_total_price(), expected_total)
    
    def test_cart_get_total_price(self):
        """Test cart total price calculation"""
        cart = Cart.objects.create(user=self.user)
        
        # Add multiple items
        CartItem.objects.create(cart=cart, product=self.product, quantity=2)
        
        product2 = Product.objects.create(
            name='Second Product',
            description='Another product',
            price=Decimal('15.00'),
            seller=self.user
        )
        CartItem.objects.create(cart=cart, product=product2, quantity=1)
        
        # Total should be (25.00 * 2) + (15.00 * 1) = 65.00
        expected_total = Decimal('65.00')
        self.assertEqual(cart.get_total_price(), expected_total)
    
    def test_cart_get_total_items(self):
        """Test cart total items count"""
        cart = Cart.objects.create(user=self.user)
        
        # Add items
        CartItem.objects.create(cart=cart, product=self.product, quantity=3)
        
        product2 = Product.objects.create(
            name='Second Product',
            description='Another product',
            price=Decimal('15.00'),
            seller=self.user
        )
        CartItem.objects.create(cart=cart, product=product2, quantity=2)
        
        # Total items should be 3 + 2 = 5
        self.assertEqual(cart.get_total_items(), 5)


class OrderModelTest(TestCase):
    """Test cases for Order and OrderItem models"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='orderuser',
            email='order@example.com',
            password='testpass123'
        )
        
        self.product = Product.objects.create(
            name='Order Test Product',
            description='Product for order testing',
            price=Decimal('100.00'),
            seller=self.user
        )
    
    def test_order_creation(self):
        """Test order creation"""
        order = Order.objects.create(
            user=self.user,
            email=self.user.email,
            first_name='John',
            last_name='Doe',
            address_line_1='123 Test St',
            city='Cape Town',
            postal_code='8001',
            province='Western Cape',
            subtotal=Decimal('100.00'),
            shipping_cost=Decimal('10.00'),
            tax_amount=Decimal('15.00'),
            total_amount=Decimal('125.00')
        )
        
        self.assertEqual(order.user, self.user)
        self.assertEqual(order.total_amount, Decimal('125.00'))
        self.assertIsNotNone(order.order_number)
        self.assertEqual(order.status, 'pending')
        self.assertEqual(order.payment_status, 'pending')
    
    def test_order_number_generation(self):
        """Test order number is unique and properly formatted"""
        order1 = Order.objects.create(
            user=self.user,
            email=self.user.email,
            first_name='John',
            last_name='Doe',
            address_line_1='123 Test St',
            city='Cape Town',
            postal_code='8001',
            province='Western Cape',
            subtotal=Decimal('85.00'),
            shipping_cost=Decimal('10.00'),
            tax_amount=Decimal('5.00'),
            total_amount=Decimal('100.00')
        )
        
        order2 = Order.objects.create(
            user=self.user,
            email=self.user.email,
            first_name='Jane',
            last_name='Smith',
            address_line_1='456 Test Ave',
            city='Cape Town',
            postal_code='8002',
            province='Western Cape',
            subtotal=Decimal('170.00'),
            shipping_cost=Decimal('20.00'),
            tax_amount=Decimal('10.00'),
            total_amount=Decimal('200.00')
        )
        
        # Order numbers should be unique
        self.assertNotEqual(order1.order_number, order2.order_number)
        
        # Order numbers should follow expected format (MH + timestamp + random)
        self.assertTrue(order1.order_number.startswith('MH'))
        self.assertTrue(order2.order_number.startswith('MH'))
    
    def test_order_item_creation(self):
        """Test order item creation"""
        order = Order.objects.create(
            user=self.user,
            email=self.user.email,
            first_name='John',
            last_name='Doe',
            address_line_1='123 Test St',
            city='Cape Town',
            postal_code='8001',
            province='Western Cape',
            subtotal=Decimal('85.00'),
            shipping_cost=Decimal('10.00'),
            tax_amount=Decimal('5.00'),
            total_amount=Decimal('100.00')
        )
        
        order_item = OrderItem.objects.create(
            order=order,
            product=self.product,
            quantity=2,
            price=self.product.price
        )
        
        self.assertEqual(order_item.order, order)
        self.assertEqual(order_item.product, self.product)
        self.assertEqual(order_item.quantity, 2)
        self.assertEqual(order_item.price, self.product.price)
    
    def test_order_get_full_name(self):
        """Test order get_full_name method"""
        order = Order.objects.create(
            user=self.user,
            email=self.user.email,
            first_name='John',
            last_name='Doe',
            address_line_1='123 Test St',
            city='Cape Town',
            postal_code='8001',
            province='Western Cape',
            subtotal=Decimal('85.00'),
            shipping_cost=Decimal('10.00'),
            tax_amount=Decimal('5.00'),
            total_amount=Decimal('100.00')
        )
        
        self.assertEqual(order.get_full_name(), 'John Doe')


class ReviewModelTest(TestCase):
    """Test cases for Review model"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='reviewer',
            email='reviewer@example.com',
            password='testpass123'
        )
        
        self.seller = User.objects.create_user(
            username='seller',
            email='seller@example.com',
            password='testpass123'
        )
        
        self.product = Product.objects.create(
            name='Review Test Product',
            description='Product for review testing',
            price=Decimal('75.00'),
            seller=self.seller
        )
    
    def test_review_creation(self):
        """Test review creation"""
        review = Review.objects.create(
            product=self.product,
            user=self.user,
            rating=5,
            comment='Excellent product!'
        )
        
        self.assertEqual(review.product, self.product)
        self.assertEqual(review.user, self.user)
        self.assertEqual(review.rating, 5)
        self.assertEqual(review.comment, 'Excellent product!')
        self.assertIsNotNone(review.created_at)
    
    def test_review_rating_validation(self):
        """Test review rating validation"""
        # Test invalid rating (too high)
        with self.assertRaises(ValidationError):
            review = Review(
                product=self.product,
                user=self.user,
                rating=6,  # Invalid: should be 1-5
                comment='Test review'
            )
            review.full_clean()
        
        # Test invalid rating (too low)
        with self.assertRaises(ValidationError):
            review = Review(
                product=self.product,
                user=self.user,
                rating=0,  # Invalid: should be 1-5
                comment='Test review'
            )
            review.full_clean()
    
    def test_review_str_method(self):
        """Test Review __str__ method"""
        review = Review.objects.create(
            product=self.product,
            user=self.user,
            rating=4,
            comment='Good product'
        )
        
        expected_str = f'{self.product.name} - {review.rating}★ by {self.user.username}'  # Actual format from model
        self.assertEqual(str(review), expected_str)


class PaymentModelTest(TestCase):
    """Test cases for Payment model"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='paymentuser',
            email='payment@example.com',
            password='testpass123'
        )
        
        self.order = Order.objects.create(
            user=self.user,
            email=self.user.email,
            first_name='Payment',
            last_name='User',
            address_line_1='123 Payment St',
            city='Cape Town',
            postal_code='8001',
            province='Western Cape',
            subtotal=Decimal('130.00'),
            shipping_cost=Decimal('15.00'),
            tax_amount=Decimal('5.00'),
            total_amount=Decimal('150.00')
        )
    
    def test_payment_creation(self):
        """Test payment creation"""
        payment = Payment.objects.create(
            order=self.order,
            payment_method='card',
            amount=self.order.total_amount,
            currency='ZAR',
            status='pending'
        )
        
        self.assertEqual(payment.order, self.order)
        self.assertEqual(payment.payment_method, 'card')
        self.assertEqual(payment.amount, self.order.total_amount)
        self.assertEqual(payment.currency, 'ZAR')
        self.assertEqual(payment.status, 'pending')
        self.assertIsNotNone(payment.created_at)
    
    def test_payment_str_method(self):
        """Test Payment __str__ method"""
        payment = Payment.objects.create(
            order=self.order,
            payment_method='card',
            amount=self.order.total_amount,
            currency='ZAR'
        )
        
        expected_str = f'Payment Pending for Order {self.order.order_number}'  # Actual format from model
        self.assertEqual(str(payment), expected_str)


class FavoriteModelTest(TestCase):
    """Test cases for Favorite model"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='favoriteuser',
            email='favorite@example.com',
            password='testpass123'
        )
        
        self.seller = User.objects.create_user(
            username='favoriteseller',
            email='favoriteseller@example.com',
            password='testpass123'
        )
        
        self.product = Product.objects.create(
            name='Favorite Test Product',
            description='Product for favorite testing',
            price=Decimal('60.00'),
            seller=self.seller
        )
    
    def test_favorite_creation(self):
        """Test favorite creation"""
        favorite = Favorite.objects.create(
            user=self.user,
            product=self.product
        )
        
        self.assertEqual(favorite.user, self.user)
        self.assertEqual(favorite.product, self.product)
        self.assertIsNotNone(favorite.added_at)  # Field is added_at not created_at
    
    def test_favorite_uniqueness(self):
        """Test that a user can only favorite a product once"""
        # Create first favorite
        Favorite.objects.create(user=self.user, product=self.product)
        
        # Try to create duplicate - should raise IntegrityError
        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            Favorite.objects.create(user=self.user, product=self.product)
    
    def test_favorite_str_method(self):
        """Test Favorite __str__ method"""
        favorite = Favorite.objects.create(
            user=self.user,
            product=self.product
        )
        
        expected_str = f'{self.user.username} - {self.product.name}'  # Actual format from model
        self.assertEqual(str(favorite), expected_str)


class NotificationModelTest(TestCase):
    """Test cases for Notification model"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='notificationuser',
            email='notification@example.com',
            password='testpass123'
        )
        
        self.product = Product.objects.create(
            name='Notification Test Product',
            description='Product for notification testing',
            price=Decimal('40.00'),
            seller=self.user
        )
    
    def test_notification_creation(self):
        """Test notification creation"""
        notification = Notification.objects.create(
            user=self.user,
            notification_type='message',
            title='New Message',
            message='You have received a new message about your product.',
            product=self.product
        )
        
        self.assertEqual(notification.user, self.user)
        self.assertEqual(notification.notification_type, 'message')
        self.assertEqual(notification.title, 'New Message')
        self.assertEqual(notification.product, self.product)
        self.assertFalse(notification.is_read)
        self.assertIsNotNone(notification.created_at)
    
    def test_notification_str_method(self):
        """Test Notification __str__ method"""
        notification = Notification.objects.create(
            user=self.user,
            notification_type='order',
            title='Order Update',
            message='Your order has been shipped.'
        )
        
        expected_str = f'Order Update for {self.user.username}'
        self.assertEqual(str(notification), expected_str)


class ModelRelationshipTest(TestCase):
    """Test model relationships and constraints"""
    
    def setUp(self):
        """Set up test data"""
        self.user1 = User.objects.create_user(
            username='user1',
            email='user1@example.com',
            password='testpass123'
        )
        
        self.user2 = User.objects.create_user(
            username='user2',
            email='user2@example.com',
            password='testpass123'
        )
        
        self.product = Product.objects.create(
            name='Relationship Test Product',
            description='Product for testing relationships',
            price=Decimal('30.00'),
            seller=self.user1
        )
    
    def test_user_product_relationship(self):
        """Test user-product relationship"""
        # User should be able to have multiple products
        product2 = Product.objects.create(
            name='Second Product',
            description='Another product',
            price=Decimal('20.00'),
            seller=self.user1
        )
        
        user1_products = Product.objects.filter(seller=self.user1)
        self.assertEqual(user1_products.count(), 2)
        self.assertIn(self.product, user1_products)
        self.assertIn(product2, user1_products)
    
    def test_cart_user_relationship(self):
        """Test cart-user relationship"""
        cart = Cart.objects.create(user=self.user1)
        
        # User should have access to their cart
        self.assertEqual(cart.user, self.user1)
        
        # User should be able to have only one active cart (business logic)
        user_carts = Cart.objects.filter(user=self.user1)
        self.assertEqual(user_carts.count(), 1)
    
    def test_review_constraints(self):
        """Test review model constraints"""
        # A user should be able to review a product
        review = Review.objects.create(
            product=self.product,
            user=self.user2,  # Different user from seller
            rating=5,
            comment='Great product!'
        )
        
        self.assertEqual(review.product, self.product)
        self.assertEqual(review.user, self.user2)
    
    def test_cascade_deletions(self):
        """Test cascade deletion behavior"""
        # Create related objects
        cart = Cart.objects.create(user=self.user1)
        cart_item = CartItem.objects.create(
            cart=cart,
            product=self.product,
            quantity=1
        )
        
        favorite = Favorite.objects.create(
            user=self.user2,
            product=self.product
        )
        
        review = Review.objects.create(
            product=self.product,
            user=self.user2,
            rating=4,
            comment='Good product'
        )
        
        # Delete product
        product_id = self.product.id
        self.product.delete()
        
        # Check that related objects are handled appropriately
        # CartItems should be deleted (cascade)
        self.assertEqual(CartItem.objects.filter(product_id=product_id).count(), 0)
        
        # Reviews should be deleted (cascade)
        self.assertEqual(Review.objects.filter(product_id=product_id).count(), 0)
        
        # Favorites should be deleted (cascade)
        self.assertEqual(Favorite.objects.filter(product_id=product_id).count(), 0)
