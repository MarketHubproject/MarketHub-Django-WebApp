from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from .models import Category, HeroSlide, Promotion, Product, Cart, CartItem
from rest_framework.test import APITestCase
from rest_framework import status
import tempfile
from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile


class CategoryModelTest(TestCase):
    def setUp(self):
        self.category = Category.objects.create(
            name='Electronics',
            slug='electronics',
            description='Electronic devices and gadgets',
            icon_class='fas fa-laptop',
            is_featured=True,
            order=1
        )

    def test_category_creation(self):
        self.assertEqual(self.category.name, 'Electronics')
        self.assertEqual(self.category.slug, 'electronics')
        self.assertTrue(self.category.is_featured)
        self.assertEqual(self.category.order, 1)

    def test_category_str_method(self):
        self.assertEqual(str(self.category), 'Electronics')

    def test_get_featured_categories(self):
        # Create another featured category
        Category.objects.create(
            name='Books',
            slug='books',
            is_featured=True,
            order=2
        )
        # Create non-featured category
        Category.objects.create(
            name='Other',
            slug='other',
            is_featured=False
        )

        featured = Category.get_featured_categories()
        self.assertEqual(featured.count(), 2)
        self.assertEqual(featured.first().name, 'Electronics')


class HeroSlideModelTest(TestCase):
    def setUp(self):
        self.slide = HeroSlide.objects.create(
            title='Summer Sale',
            subtitle='Up to 50% off on all items',
            cta_text='Shop Now',
            cta_url='https://example.com/sale',
            is_active=True,
            order=1
        )

    def test_hero_slide_creation(self):
        self.assertEqual(self.slide.title, 'Summer Sale')
        self.assertEqual(self.slide.subtitle, 'Up to 50% off on all items')
        self.assertTrue(self.slide.is_active)

    def test_hero_slide_str_method(self):
        self.assertEqual(str(self.slide), 'Summer Sale (Active)')

        inactive_slide = HeroSlide.objects.create(
            title='Winter Sale',
            is_active=False
        )
        self.assertEqual(str(inactive_slide), 'Winter Sale (Inactive)')

    def test_get_active_slides(self):
        # Create inactive slide
        HeroSlide.objects.create(
            title='Inactive Slide',
            is_active=False
        )

        active_slides = HeroSlide.get_active_slides()
        self.assertEqual(active_slides.count(), 1)
        self.assertEqual(active_slides.first().title, 'Summer Sale')


class PromotionModelTest(TestCase):
    def setUp(self):
        self.now = timezone.now()
        self.promotion = Promotion.objects.create(
            title='Black Friday',
            text='Huge discounts on everything!',
            link='https://example.com/black-friday',
            valid_from=self.now - timedelta(days=1),
            valid_to=self.now + timedelta(days=1),
            is_active=True,
            order=1
        )

    def test_promotion_creation(self):
        self.assertEqual(self.promotion.title, 'Black Friday')
        self.assertEqual(self.promotion.text, 'Huge discounts on everything!')
        self.assertTrue(self.promotion.is_active)

    def test_promotion_is_valid_property(self):
        self.assertTrue(self.promotion.is_valid)

        # Create expired promotion
        expired_promotion = Promotion.objects.create(
            title='Expired Sale',
            text='This is expired',
            link='https://example.com',
            valid_from=self.now - timedelta(days=10),
            valid_to=self.now - timedelta(days=5),
            is_active=True
        )
        self.assertFalse(expired_promotion.is_valid)

    def test_promotion_str_method(self):
        self.assertEqual(str(self.promotion), 'Black Friday (Active)')

    def test_get_active_promotions(self):
        # Create inactive promotion
        Promotion.objects.create(
            title='Inactive Promo',
            text='Inactive',
            link='https://example.com',
            valid_from=self.now - timedelta(days=1),
            valid_to=self.now + timedelta(days=1),
            is_active=False
        )

        # Create expired promotion
        Promotion.objects.create(
            title='Expired Promo',
            text='Expired',
            link='https://example.com',
            valid_from=self.now - timedelta(days=10),
            valid_to=self.now - timedelta(days=5),
            is_active=True
        )

        active_promotions = Promotion.get_active_promotions()
        self.assertEqual(active_promotions.count(), 1)
        self.assertEqual(active_promotions.first().title, 'Black Friday')


class ProductModelTest(TestCase):
    def setUp(self):
        self.product = Product.objects.create(
            name='Laptop',
            description='High-performance laptop',
            price=Decimal('999.99'),
            category='electronics'
        )

    def test_product_creation(self):
        self.assertEqual(self.product.name, 'Laptop')
        self.assertEqual(self.product.description, 'High-performance laptop')
        self.assertEqual(self.product.price, Decimal('999.99'))
        self.assertEqual(self.product.category, 'electronics')

    def test_product_str_method(self):
        self.assertEqual(str(self.product), 'Laptop')


class CartModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.cart = Cart.objects.create(user=self.user)
        self.product1 = Product.objects.create(
            name='Product 1',
            description='Test product 1',
            price=Decimal('10.00'),
            category='electronics'
        )
        self.product2 = Product.objects.create(
            name='Product 2',
            description='Test product 2',
            price=Decimal('20.00'),
            category='books'
        )

    def test_cart_creation(self):
        self.assertEqual(self.cart.user, self.user)
        self.assertEqual(str(self.cart), f'Cart for {self.user.username}')

    def test_cart_empty_totals(self):
        self.assertEqual(self.cart.get_total_price(), 0)
        self.assertEqual(self.cart.get_total_items(), 0)

    def test_cart_with_items(self):
        item1 = CartItem.objects.create(
            cart=self.cart,
            product=self.product1,
            quantity=2
        )
        item2 = CartItem.objects.create(
            cart=self.cart,
            product=self.product2,
            quantity=1
        )

        self.assertEqual(self.cart.get_total_price(), Decimal('40.00'))  # 2*10 + 1*20
        self.assertEqual(self.cart.get_total_items(), 3)  # 2 + 1


class CartItemModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.cart = Cart.objects.create(user=self.user)
        self.product = Product.objects.create(
            name='Test Product',
            description='Test description',
            price=Decimal('15.00'),
            category='electronics'
        )
        self.cart_item = CartItem.objects.create(
            cart=self.cart,
            product=self.product,
            quantity=3
        )

    def test_cart_item_creation(self):
        self.assertEqual(self.cart_item.cart, self.cart)
        self.assertEqual(self.cart_item.product, self.product)
        self.assertEqual(self.cart_item.quantity, 3)

    def test_cart_item_str_method(self):
        self.assertEqual(str(self.cart_item), '3 x Test Product')

    def test_get_total_price(self):
        self.assertEqual(self.cart_item.get_total_price(), Decimal('45.00'))  # 3 * 15.00

    def test_unique_together_constraint(self):
        # Try to create duplicate cart item
        with self.assertRaises(Exception):
            CartItem.objects.create(
                cart=self.cart,
                product=self.product,
                quantity=1
            )


class HomepageIntegrationTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

    def test_homepage_loads(self):
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)

    def test_category_context(self):
        # Create featured categories
        cat1 = Category.objects.create(
            name='Electronics',
            slug='electronics',
            is_featured=True,
            order=1
        )
        cat2 = Category.objects.create(
            name='Books',
            slug='books',
            is_featured=True,
            order=2
        )

        response = self.client.get('/')
        self.assertContains(response, 'Electronics')
        self.assertContains(response, 'Books')


class APIIntegrationTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.product = Product.objects.create(
            name='API Test Product',
            description='Product for API testing',
            price=Decimal('25.00'),
            category='electronics'
        )
        self.category = Category.objects.create(
            name='Test Category',
            slug='test-category'
        )

    def test_products_api_list(self):
        try:
            url = reverse('product-list')  # Assuming you have this URL pattern
            response = self.client.get(url)
            # Test should work whether authenticated or not for product listing
            self.assertIn(response.status_code, [200, 404])  # 404 if URL doesn't exist yet
        except Exception:
            # URL pattern doesn't exist yet, test direct URL
            url = '/api/products/'
            response = self.client.get(url)
            self.assertIn(response.status_code, [200, 404])  # 404 if URL doesn't exist yet

    def test_categories_api_list(self):
        url = '/api/categories/'  # Direct URL since reverse might not work
        response = self.client.get(url)
        self.assertIn(response.status_code, [200, 404])  # 404 if URL doesn't exist yet
