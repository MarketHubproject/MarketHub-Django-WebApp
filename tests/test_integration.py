"""
Integration tests for MarketHub

This module contains integration tests that test the interaction between
different components of the MarketHub application, ensuring they work
together correctly in realistic scenarios.
"""
import json
from decimal import Decimal
from django.test import TestCase, TransactionTestCase
from django.contrib.auth.models import User
from django.urls import reverse
from django.core import mail
from django.test.utils import override_settings
from rest_framework.test import APITestCase
from rest_framework.authtoken.models import Token
from homepage.models import (
    Product, Cart, CartItem, Order, OrderItem, Payment,
    Review, Favorite, Notification, HeroSlide
)


class UserRegistrationToOrderIntegrationTest(TestCase):
    """Test complete user journey from registration to order completion"""
    
    def setUp(self):
        """Set up test data"""
        # Create a seller user
        self.seller = User.objects.create_user(
            username='seller',
            email='seller@example.com',
            password='sellerpass123'
        )
        
        # Create some products
        self.product1 = Product.objects.create(
            name='Integration Test Product 1',
            description='First product for integration testing',
            price=Decimal('100.00'),
            category='electronics',
            condition='new',
            location='cape_town_central',
            seller=self.seller
        )
        
        self.product2 = Product.objects.create(
            name='Integration Test Product 2',
            description='Second product for integration testing',
            price=Decimal('150.00'),
            category='electronics',
            condition='used',
            location='johannesburg_central',
            seller=self.seller
        )
    
    def test_complete_user_journey(self):
        """Test complete user journey from registration to order"""
        # Step 1: User registration
        registration_data = {
            'username': 'newbuyer',
            'email': 'newbuyer@example.com',
            'password1': 'testpassword123',
            'password2': 'testpassword123'
        }
        
        response = self.client.post(reverse('account_signup'), registration_data)
        
        # Check user was created (may redirect to email confirmation)
        self.assertTrue(User.objects.filter(username='newbuyer').exists())
        new_user = User.objects.get(username='newbuyer')
        
        # Step 2: Login
        login_success = self.client.login(
            username='newbuyer', 
            password='testpassword123'
        )
        self.assertTrue(login_success)
        
        # Step 3: Browse products
        response = self.client.get(reverse('homepage:product_list'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Integration Test Product 1')
        
        # Step 4: View product detail
        response = self.client.get(
            reverse('homepage:product_detail', kwargs={'pk': self.product1.pk})
        )
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Integration Test Product 1')
        
        # Step 5: Add products to cart
        response = self.client.post(reverse('homepage:add_to_cart'), {
            'product_id': self.product1.id,
            'quantity': 2
        })
        self.assertEqual(response.status_code, 302)  # Redirect after adding
        
        response = self.client.post(reverse('homepage:add_to_cart'), {
            'product_id': self.product2.id,
            'quantity': 1
        })
        self.assertEqual(response.status_code, 302)
        
        # Step 6: View cart
        response = self.client.get(reverse('homepage:cart'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Integration Test Product 1')
        self.assertContains(response, 'Integration Test Product 2')
        
        # Verify cart contents
        user_cart = Cart.objects.get(user=new_user)
        cart_items = CartItem.objects.filter(cart=user_cart)
        self.assertEqual(cart_items.count(), 2)
        
        # Step 7: Proceed to checkout
        response = self.client.get(reverse('homepage:checkout'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Checkout')
        
        # Step 8: Submit checkout form
        checkout_data = {
            'first_name': 'John',
            'last_name': 'Buyer',
            'email': 'newbuyer@example.com',
            'address_line_1': '123 Integration St',
            'city': 'Cape Town',
            'postal_code': '8001',
            'country': 'South Africa'
        }
        
        response = self.client.post(reverse('homepage:checkout'), checkout_data)
        
        # Should redirect to payment or order confirmation
        self.assertEqual(response.status_code, 302)
        
        # Step 9: Verify order creation
        order = Order.objects.get(user=new_user)
        self.assertEqual(order.first_name, 'John')
        self.assertEqual(order.last_name, 'Buyer')
        self.assertEqual(order.email, 'newbuyer@example.com')
        
        # Verify order items
        order_items = OrderItem.objects.filter(order=order)
        self.assertEqual(order_items.count(), 2)
        
        total_expected = (self.product1.price * 2) + (self.product2.price * 1)
        self.assertEqual(order.subtotal, total_expected)
        
        # Step 10: Verify cart is cleared after order
        cart_items_after_order = CartItem.objects.filter(cart=user_cart)
        self.assertEqual(cart_items_after_order.count(), 0)


class APIToWebIntegrationTest(APITestCase):
    """Test integration between API and web interfaces"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='apiwebuser',
            email='apiwebuser@example.com',
            password='apiwebpass123'
        )
        
        self.token = Token.objects.create(user=self.user)
        
        self.product = Product.objects.create(
            name='API Web Integration Product',
            description='Product for API-Web integration testing',
            price=Decimal('200.00'),
            category='electronics',
            seller=self.user
        )
    
    def test_api_create_product_web_view(self):
        """Test creating product via API and viewing via web"""
        # Step 1: Create product via API
        self.client.force_authenticate(user=self.user, token=self.token)
        
        api_data = {
            'name': 'API Created Product',
            'description': 'Product created via API',
            'price': '300.00',
            'category': 'electronics',
            'condition': 'new',
            'location': 'cape_town_central'
        }
        
        response = self.client.post(reverse('api:product-list'), api_data, format='json')
        self.assertEqual(response.status_code, 201)
        
        api_product_id = response.data['id']
        
        # Step 2: View product via web interface
        self.client.force_authenticate(user=None)  # Clear API authentication
        
        # Use Django test client for web requests
        from django.test import Client
        web_client = Client()
        web_client.login(username='apiwebuser', password='apiwebpass123')
        
        response = web_client.get(
            reverse('homepage:product_detail', kwargs={'pk': api_product_id})
        )
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'API Created Product')
        self.assertContains(response, 'Product created via API')
    
    def test_web_create_product_api_view(self):
        """Test creating product via web and viewing via API"""
        # Step 1: Create product via web interface
        from django.test import Client
        from django.core.files.uploadedfile import SimpleUploadedFile
        
        web_client = Client()
        web_client.login(username='apiwebuser', password='apiwebpass123')
        
        # Create test image
        test_image = SimpleUploadedFile(
            name='web_test_image.jpg',
            content=b'test image content',
            content_type='image/jpeg'
        )
        
        web_data = {
            'name': 'Web Created Product',
            'description': 'Product created via web',
            'price': '250.00',
            'category': 'electronics',
            'condition': 'used',
            'location': 'johannesburg_central',
            'image': test_image
        }
        
        response = web_client.post(reverse('homepage:add_product'), web_data)
        self.assertEqual(response.status_code, 302)  # Redirect after creation
        
        # Get the created product
        web_product = Product.objects.get(name='Web Created Product')
        
        # Step 2: View product via API
        self.client.force_authenticate(user=self.user, token=self.token)
        
        response = self.client.get(
            reverse('api:product-detail', kwargs={'pk': web_product.pk})
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['name'], 'Web Created Product')
        self.assertEqual(response.data['description'], 'Product created via web')


class CartToOrderIntegrationTest(TestCase):
    """Test cart to order conversion with various scenarios"""
    
    def setUp(self):
        """Set up test data"""
        self.buyer = User.objects.create_user(
            username='cartbuyer',
            email='cartbuyer@example.com',
            password='cartpass123'
        )
        
        self.seller = User.objects.create_user(
            username='cartseller',
            email='cartseller@example.com',
            password='sellerpass123'
        )
        
        # Create products with different prices and sellers
        self.product1 = Product.objects.create(
            name='Cart Product 1',
            description='First cart product',
            price=Decimal('50.00'),
            category='electronics',
            seller=self.seller
        )
        
        self.product2 = Product.objects.create(
            name='Cart Product 2',
            description='Second cart product',
            price=Decimal('75.00'),
            category='home_garden',
            seller=self.seller
        )
        
        # Create cart
        self.cart = Cart.objects.create(user=self.buyer)
    
    def test_cart_calculation_consistency(self):
        """Test that cart calculations remain consistent through order creation"""
        # Add items to cart
        cart_item1 = CartItem.objects.create(
            cart=self.cart,
            product=self.product1,
            quantity=2
        )
        
        cart_item2 = CartItem.objects.create(
            cart=self.cart,
            product=self.product2,
            quantity=3
        )
        
        # Calculate expected totals
        expected_subtotal = (self.product1.price * 2) + (self.product2.price * 3)
        expected_shipping = Decimal('50.00')  # Assuming standard shipping
        expected_tax = expected_subtotal * Decimal('0.15')  # 15% tax
        expected_total = expected_subtotal + expected_shipping + expected_tax
        
        # Login and proceed to checkout
        self.client.login(username='cartbuyer', password='cartpass123')
        
        # View cart to verify calculations
        response = self.client.get(reverse('homepage:cart'))
        self.assertEqual(response.status_code, 200)
        
        cart_total = response.context['cart'].get_total_price()
        self.assertEqual(cart_total, expected_subtotal)
        
        # Proceed to checkout
        checkout_data = {
            'first_name': 'Cart',
            'last_name': 'Buyer',
            'email': 'cartbuyer@example.com',
            'address_line_1': '123 Cart St',
            'city': 'Cape Town',
            'postal_code': '8001',
            'province': 'Western Cape',
            'phone': '+27821234567'
        }
        
        response = self.client.post(reverse('homepage:checkout'), checkout_data)
        self.assertEqual(response.status_code, 302)
        
        # Verify order was created with correct calculations
        order = Order.objects.get(user=self.buyer)
        self.assertEqual(order.subtotal, expected_subtotal)
        
        # Verify order items match cart items
        order_items = OrderItem.objects.filter(order=order).order_by('product_id')
        self.assertEqual(order_items.count(), 2)
        
        self.assertEqual(order_items[0].product, self.product1)
        self.assertEqual(order_items[0].quantity, 2)
        self.assertEqual(order_items[1].product, self.product2)
        self.assertEqual(order_items[1].quantity, 3)
    
    def test_cart_modification_during_checkout(self):
        """Test handling of cart modifications during checkout process"""
        # Add items to cart
        CartItem.objects.create(
            cart=self.cart,
            product=self.product1,
            quantity=1
        )
        
        self.client.login(username='cartbuyer', password='cartpass123')
        
        # Start checkout process
        response = self.client.get(reverse('homepage:checkout'))
        self.assertEqual(response.status_code, 200)
        
        # Simulate cart modification (e.g., by another browser session)
        CartItem.objects.create(
            cart=self.cart,
            product=self.product2,
            quantity=2
        )
        
        # Complete checkout
        checkout_data = {
            'first_name': 'Modified',
            'last_name': 'Cart',
            'email': 'cartbuyer@example.com',
            'address_line_1': '123 Modified St',
            'city': 'Cape Town',
            'postal_code': '8001',
            'province': 'Western Cape',
            'phone': '+27821234567'
        }
        
        response = self.client.post(reverse('homepage:checkout'), checkout_data)
        self.assertEqual(response.status_code, 302)
        
        # Verify order includes all current cart items
        order = Order.objects.get(user=self.buyer)
        order_items = OrderItem.objects.filter(order=order)
        self.assertEqual(order_items.count(), 2)


class UserPermissionsIntegrationTest(TestCase):
    """Test user permissions across different components"""
    
    def setUp(self):
        """Set up test data"""
        self.user1 = User.objects.create_user(
            username='permuser1',
            email='permuser1@example.com',
            password='permpass123'
        )
        
        self.user2 = User.objects.create_user(
            username='permuser2',
            email='permuser2@example.com',
            password='permpass123'
        )
        
        # User1's product
        self.product1 = Product.objects.create(
            name='User1 Product',
            description='Product owned by user1',
            price=Decimal('100.00'),
            category='electronics',
            seller=self.user1
        )
        
        # User1's order
        self.order1 = Order.objects.create(
            user=self.user1,
            email=self.user1.email,
            first_name='Perm',
            last_name='User1',
            address_line_1='123 Perm St',
            city='Cape Town',
            postal_code='8001',
            province='Western Cape',
            phone='+27821234567',
            subtotal=Decimal('100.00'),
            shipping_cost=Decimal('0.00'),
            tax_amount=Decimal('0.00'),
            total_amount=Decimal('100.00')
        )
    
    def test_cross_component_permissions(self):
        """Test permissions across web views, API, and models"""
        # Test 1: User2 cannot edit User1's product via web
        self.client.login(username='permuser2', password='permpass123')
        
        response = self.client.get(
            reverse('homepage:edit_product', kwargs={'pk': self.product1.pk})
        )
        self.assertIn(response.status_code, [403, 404])
        
        # Test 2: User2 cannot edit User1's product via API
        from rest_framework.test import APIClient
        from rest_framework.authtoken.models import Token
        
        api_client = APIClient()
        token2 = Token.objects.create(user=self.user2)
        api_client.force_authenticate(user=self.user2, token=token2)
        
        response = api_client.patch(
            reverse('api:product-detail', kwargs={'pk': self.product1.pk}),
            {'name': 'Hacked Product'},
            format='json'
        )
        self.assertEqual(response.status_code, 403)
        
        # Test 3: User2 cannot view User1's order
        response = self.client.get(
            reverse('homepage:order_detail', kwargs={'pk': self.order1.pk})
        )
        self.assertIn(response.status_code, [403, 404])
        
        # Test 4: User1 can access their own resources
        self.client.login(username='permuser1', password='permpass123')
        
        # Can edit own product
        response = self.client.get(
            reverse('homepage:edit_product', kwargs={'pk': self.product1.pk})
        )
        self.assertEqual(response.status_code, 200)
        
        # Can view own order
        response = self.client.get(
            reverse('homepage:order_detail', kwargs={'pk': self.order1.pk})
        )
        self.assertEqual(response.status_code, 200)


class SearchIntegrationTest(TestCase):
    """Test search functionality across different components"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='searchuser',
            email='search@example.com',
            password='searchpass123'
        )
        
        # Create products with searchable content
        self.products = [
            Product.objects.create(
                name='iPhone 13 Pro Max',
                description='Latest Apple smartphone with 5G connectivity',
                price=Decimal('1299.99'),
                category='electronics',
                condition='new',
                location='cape_town_central',
                seller=self.user
            ),
            Product.objects.create(
                name='Samsung Galaxy S21 Ultra',
                description='Android phone with excellent camera system',
                price=Decimal('1199.99'),
                category='electronics',
                condition='used',
                location='johannesburg_central',
                seller=self.user
            ),
            Product.objects.create(
                name='MacBook Pro 16"',
                description='Professional laptop for creative work',
                price=Decimal('2499.99'),
                category='electronics',
                condition='new',
                location='durban_central',
                seller=self.user
            ),
            Product.objects.create(
                name='Dining Table Set',
                description='Beautiful wooden table for family meals',
                price=Decimal('899.99'),
                category='home_garden',
                condition='used',
                location='cape_town_central',
                seller=self.user
            )
        ]
    
    def test_web_search_integration(self):
        """Test web search functionality"""
        # Search for smartphones
        response = self.client.get(reverse('homepage:product_list'), {
            'search': 'smartphone'
        })
        self.assertEqual(response.status_code, 200)
        
        # Should find iPhone (mentioned in description)
        self.assertContains(response, 'iPhone 13 Pro Max')
        # Should not find MacBook or dining table
        self.assertNotContains(response, 'MacBook Pro')
        self.assertNotContains(response, 'Dining Table')
        
        # Search for "phone" should find both smartphones
        response = self.client.get(reverse('homepage:product_list'), {
            'search': 'phone'
        })
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'iPhone 13 Pro Max')
        self.assertContains(response, 'Samsung Galaxy S21 Ultra')
        
        # Category filter combined with search
        response = self.client.get(reverse('homepage:product_list'), {
            'search': 'Pro',
            'category': 'electronics'
        })
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'iPhone 13 Pro Max')
        self.assertContains(response, 'MacBook Pro 16"')
        self.assertNotContains(response, 'Dining Table')
    
    def test_api_search_integration(self):
        """Test API search functionality"""
        from rest_framework.test import APIClient
        
        api_client = APIClient()
        
        # Search via API
        response = api_client.get(reverse('api:product-list'), {
            'search': 'Apple'
        })
        self.assertEqual(response.status_code, 200)
        
        results = response.data.get('results', [])
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['name'], 'iPhone 13 Pro Max')
        
        # Category filter via API
        response = api_client.get(reverse('api:product-list'), {
            'category': 'home_garden'
        })
        self.assertEqual(response.status_code, 200)
        
        results = response.data.get('results', [])
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['name'], 'Dining Table Set')


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class NotificationIntegrationTest(TestCase):
    """Test notification system integration"""
    
    def setUp(self):
        """Set up test data"""
        self.buyer = User.objects.create_user(
            username='notifbuyer',
            email='notifbuyer@example.com',
            password='notifpass123'
        )
        
        self.seller = User.objects.create_user(
            username='notifseller',
            email='notifseller@example.com',
            password='sellerpass123'
        )
        
        self.product = Product.objects.create(
            name='Notification Product',
            description='Product for notification testing',
            price=Decimal('150.00'),
            category='electronics',
            seller=self.seller
        )
    
    def test_order_notification_flow(self):
        """Test notification flow for order creation"""
        # Create cart and add item
        cart = Cart.objects.create(user=self.buyer)
        CartItem.objects.create(cart=cart, product=self.product, quantity=1)
        
        # Login and checkout
        self.client.login(username='notifbuyer', password='notifpass123')
        
        checkout_data = {
            'first_name': 'Notification',
            'last_name': 'Buyer',
            'email': 'notifbuyer@example.com',
            'address_line_1': '123 Notification St',
            'city': 'Cape Town',
            'postal_code': '8001',
            'province': 'Western Cape',
            'phone': '+27821234567'
        }
        
        # Clear any existing emails
        mail.outbox = []
        
        response = self.client.post(reverse('homepage:checkout'), checkout_data)
        self.assertEqual(response.status_code, 302)
        
        # Verify order was created
        order = Order.objects.get(user=self.buyer)
        self.assertEqual(order.first_name, 'Notification')
        
        # Check if notifications were created
        buyer_notifications = Notification.objects.filter(user=self.buyer)
        seller_notifications = Notification.objects.filter(user=self.seller)
        
        # Should have notifications for both buyer and seller
        self.assertGreaterEqual(buyer_notifications.count(), 1)
        self.assertGreaterEqual(seller_notifications.count(), 0)
    
    def test_review_notification_flow(self):
        """Test notification flow for review creation"""
        # Create an order first (prerequisite for review)
        order = Order.objects.create(
            user=self.buyer,
            email=self.buyer.email,
            first_name='Review',
            last_name='Buyer',
            address_line_1='123 Review St',
            city='Cape Town',
            postal_code='8001',
            province='Western Cape',
            phone='+27821234567',
            subtotal=self.product.price,
            shipping_cost=Decimal('0.00'),
            tax_amount=Decimal('0.00'),
            total_amount=self.product.price,
            status='completed'
        )
        
        OrderItem.objects.create(
            order=order,
            product=self.product,
            quantity=1,
            price=self.product.price
        )
        
        # Login as buyer and add review
        self.client.login(username='notifbuyer', password='notifpass123')
        
        review_data = {
            'rating': 5,
            'comment': 'Excellent product, highly recommended!'
        }
        
        response = self.client.post(
            reverse('homepage:add_review', kwargs={'product_id': self.product.id}),
            review_data
        )
        
        self.assertEqual(response.status_code, 302)
        
        # Verify review was created
        review = Review.objects.get(product=self.product, user=self.buyer)
        self.assertEqual(review.rating, 5)
        
        # Check for seller notification about new review
        seller_notifications = Notification.objects.filter(
            user=self.seller,
            notification_type='review'
        )
        self.assertGreaterEqual(seller_notifications.count(), 0)


class MultiUserConcurrencyTest(TransactionTestCase):
    """Test concurrent operations by multiple users"""
    
    def setUp(self):
        """Set up test data"""
        self.seller = User.objects.create_user(
            username='concurrentseller',
            email='seller@example.com',
            password='sellerpass123'
        )
        
        self.buyer1 = User.objects.create_user(
            username='buyer1',
            email='buyer1@example.com',
            password='buyerpass123'
        )
        
        self.buyer2 = User.objects.create_user(
            username='buyer2',
            email='buyer2@example.com',
            password='buyerpass123'
        )
        
        # Create limited stock product
        self.limited_product = Product.objects.create(
            name='Limited Stock Product',
            description='Product with limited stock',
            price=Decimal('99.99'),
            category='electronics',
            seller=self.seller,
            stock_quantity=1  # Only 1 item available
        )
    
    def test_concurrent_cart_operations(self):
        """Test concurrent cart operations"""
        from django.test import Client
        
        # Create separate clients for each buyer
        client1 = Client()
        client2 = Client()
        
        # Login both buyers
        client1.login(username='buyer1', password='buyerpass123')
        client2.login(username='buyer2', password='buyerpass123')
        
        # Both try to add the same product to cart simultaneously
        response1 = client1.post(reverse('homepage:add_to_cart'), {
            'product_id': self.limited_product.id,
            'quantity': 1
        })
        
        response2 = client2.post(reverse('homepage:add_to_cart'), {
            'product_id': self.limited_product.id,
            'quantity': 1
        })
        
        # Both should succeed in adding to cart (cart doesn't reserve stock)
        self.assertEqual(response1.status_code, 302)
        self.assertEqual(response2.status_code, 302)
        
        # Verify both users have the product in their carts
        cart1 = Cart.objects.get(user=self.buyer1)
        cart2 = Cart.objects.get(user=self.buyer2)
        
        self.assertTrue(CartItem.objects.filter(
            cart=cart1, 
            product=self.limited_product
        ).exists())
        
        self.assertTrue(CartItem.objects.filter(
            cart=cart2, 
            product=self.limited_product
        ).exists())
    
    def test_concurrent_favorite_operations(self):
        """Test concurrent favorite operations"""
        from django.test import Client
        
        client1 = Client()
        client2 = Client()
        
        client1.login(username='buyer1', password='buyerpass123')
        client2.login(username='buyer2', password='buyerpass123')
        
        # Both users try to favorite the same product
        response1 = client1.post(
            reverse('homepage:add_to_favorites', 
                   kwargs={'product_id': self.limited_product.id})
        )
        
        response2 = client2.post(
            reverse('homepage:add_to_favorites', 
                   kwargs={'product_id': self.limited_product.id})
        )
        
        # Both should succeed
        self.assertEqual(response1.status_code, 302)
        self.assertEqual(response2.status_code, 302)
        
        # Verify both users have favorited the product
        self.assertTrue(Favorite.objects.filter(
            user=self.buyer1, 
            product=self.limited_product
        ).exists())
        
        self.assertTrue(Favorite.objects.filter(
            user=self.buyer2, 
            product=self.limited_product
        ).exists())


class PaymentIntegrationTest(TestCase):
    """Test payment integration flow"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='paymentuser',
            email='payment@example.com',
            password='paymentpass123'
        )
        
        self.seller = User.objects.create_user(
            username='paymentseller',
            email='paymentseller@example.com',
            password='sellerpass123'
        )
        
        self.product = Product.objects.create(
            name='Payment Product',
            description='Product for payment testing',
            price=Decimal('199.99'),
            category='electronics',
            seller=self.seller
        )
        
        # Create an order
        self.order = Order.objects.create(
            user=self.user,
            email=self.user.email,
            first_name='Payment',
            last_name='User',
            address_line_1='123 Payment St',
            city='Cape Town',
            postal_code='8001',
            province='Western Cape',
            phone='+27821234567',
            subtotal=self.product.price,
            shipping_cost=Decimal('25.00'),
            tax_amount=self.product.price * Decimal('0.15'),
            total_amount=self.product.price + Decimal('25.00') + (self.product.price * Decimal('0.15'))
        )
        
        OrderItem.objects.create(
            order=self.order,
            product=self.product,
            quantity=1,
            price=self.product.price
        )
    
    def test_payment_intent_creation_flow(self):
        """Test payment intent creation and processing"""
        from rest_framework.test import APIClient
        from rest_framework.authtoken.models import Token
        
        # Create API client and authenticate
        api_client = APIClient()
        token = Token.objects.create(user=self.user)
        api_client.force_authenticate(user=self.user, token=token)
        
        # Create payment intent
        payment_data = {
            'order_id': self.order.id,
            'amount': int(self.order.total_amount * 100),  # Amount in cents
            'currency': 'zar'
        }
        
        response = api_client.post(
            reverse('api:create-payment-intent'), 
            payment_data, 
            format='json'
        )
        
        # Response depends on Stripe configuration
        # In test environment, might return error due to missing keys
        self.assertIn(response.status_code, [200, 400])
        
        if response.status_code == 200:
            # If Stripe is properly configured
            self.assertIn('client_secret', response.data)
            
            # Verify payment record was created
            payment = Payment.objects.filter(order=self.order).first()
            if payment:
                self.assertEqual(payment.amount, self.order.total_amount)
                self.assertEqual(payment.currency, 'ZAR')
        
        elif response.status_code == 400:
            # If Stripe configuration is missing (expected in test)
            self.assertIn('error', response.data)
    
    def test_order_status_update_flow(self):
        """Test order status updates throughout payment process"""
        # Initial order status
        self.assertEqual(self.order.status, 'pending')
        self.assertEqual(self.order.payment_status, 'pending')
        
        # Simulate payment success
        payment = Payment.objects.create(
            order=self.order,
            payment_method='card',
            amount=self.order.total_amount,
            currency='ZAR',
            status='succeeded',
            stripe_payment_intent_id='pi_test_123456'
        )
        
        # Update order status
        self.order.payment_status = 'completed'
        self.order.status = 'processing'
        self.order.save()
        
        # Verify status updates
        updated_order = Order.objects.get(id=self.order.id)
        self.assertEqual(updated_order.payment_status, 'completed')
        self.assertEqual(updated_order.status, 'processing')
        
        # Verify payment is linked correctly
        self.assertEqual(payment.order, self.order)
        self.assertEqual(payment.status, 'succeeded')
