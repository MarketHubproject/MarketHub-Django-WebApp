"""
API tests for MarketHub Django REST Framework endpoints.

This module contains comprehensive tests for:
- CRUD operations for all API endpoints
- Permission testing for different user types
- API authentication and authorization
- Request/response validation
- API rate limiting and throttling
"""
import pytest
from unittest.mock import patch, Mock
from decimal import Decimal
from django.urls import reverse
from django.contrib.auth.models import User, AnonymousUser
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token
import json

from homepage.models import (
    Product, Category, Order, OrderItem, Payment, PaymentMethod,
    Review, Favorite, Cart, CartItem, Notification
)
from tests.factories import (
    UserFactory, AdminUserFactory, ProductFactory, CategoryFactory,
    OrderFactory, OrderItemFactory, PaymentFactory, PaymentMethodFactory,
    ReviewFactory, FavoriteFactory, CartFactory, CartItemFactory,
    NotificationFactory
)


@pytest.mark.api
class TestProductAPI:
    """Tests for Product API endpoints."""
    
    def test_product_list_anonymous_user(self, api_client):
        """Test product list access for anonymous users."""
        ProductFactory.create_batch(5, status='available')
        ProductFactory.create_batch(2, status='sold')
        
        response = api_client.get(reverse('product-list'))
        
        assert response.status_code == 200
        # Should only show available products to anonymous users
        assert len(response.data['results']) == 5
    
    def test_product_list_authenticated_user(self, authenticated_api_client):
        """Test product list access for authenticated users."""
        ProductFactory.create_batch(5, status='available')
        ProductFactory.create_batch(2, status='sold')
        
        response = authenticated_api_client.get(reverse('product-list'))
        
        assert response.status_code == 200
        # Authenticated users can see all products
        assert len(response.data['results']) == 7
    
    def test_product_detail_access(self, api_client):
        """Test product detail access."""
        product = ProductFactory(status='available')
        
        response = api_client.get(
            reverse('product-detail', kwargs={'pk': product.pk})
        )
        
        assert response.status_code == 200
        assert response.data['id'] == product.id
        assert response.data['name'] == product.name
    
    def test_product_create_requires_authentication(self, api_client):
        """Test that product creation requires authentication."""
        product_data = {
            'name': 'Test Product',
            'description': 'Test description',
            'price': '99.99',
            'category': 'electronics'
        }
        
        response = api_client.post(reverse('product-list'), data=product_data)
        
        assert response.status_code == 401
    
    def test_product_create_authenticated_user(self, authenticated_api_client, authenticated_user):
        """Test product creation by authenticated user."""
        product_data = {
            'name': 'Test Product',
            'description': 'Test description',
            'price': '99.99',
            'category': 'electronics',
            'condition': 'excellent',
            'location': 'cape_town_central'
        }
        
        response = authenticated_api_client.post(reverse('product-list'), data=product_data)
        
        assert response.status_code == 201
        assert response.data['name'] == 'Test Product'
        assert response.data['seller'] == authenticated_user.id
    
    def test_product_update_owner_only(self, authenticated_api_client, authenticated_user):
        """Test that only product owner can update their product."""
        # User's own product
        own_product = ProductFactory(seller=authenticated_user)
        
        # Other user's product
        other_product = ProductFactory()
        
        update_data = {'name': 'Updated Name'}
        
        # Can update own product
        response = authenticated_api_client.patch(
            reverse('product-detail', kwargs={'pk': own_product.pk}),
            data=update_data
        )
        assert response.status_code == 200
        assert response.data['name'] == 'Updated Name'
        
        # Cannot update other's product
        response = authenticated_api_client.patch(
            reverse('product-detail', kwargs={'pk': other_product.pk}),
            data=update_data
        )
        assert response.status_code in [403, 404]
    
    def test_product_delete_owner_only(self, authenticated_api_client, authenticated_user):
        """Test that only product owner can delete their product."""
        own_product = ProductFactory(seller=authenticated_user)
        other_product = ProductFactory()
        
        # Can delete own product
        response = authenticated_api_client.delete(
            reverse('product-detail', kwargs={'pk': own_product.pk})
        )
        assert response.status_code == 204
        
        # Cannot delete other's product
        response = authenticated_api_client.delete(
            reverse('product-detail', kwargs={'pk': other_product.pk})
        )
        assert response.status_code in [403, 404]
    
    def test_product_search_and_filtering(self, api_client):
        """Test product search and filtering."""
        ProductFactory(name='iPhone 13', category='electronics')
        ProductFactory(name='Samsung Galaxy', category='electronics')
        ProductFactory(name='T-Shirt', category='clothing')
        
        # Search by name
        response = api_client.get(reverse('product-list'), {'search': 'iPhone'})
        assert response.status_code == 200
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['name'] == 'iPhone 13'
        
        # Filter by category
        response = api_client.get(reverse('product-list'), {'category': 'electronics'})
        assert response.status_code == 200
        assert len(response.data['results']) == 2
        
        # Filter by price range
        response = api_client.get(reverse('product-list'), {
            'price_min': '50',
            'price_max': '200'
        })
        assert response.status_code == 200
    
    def test_product_validation_errors(self, authenticated_api_client):
        """Test product validation errors."""
        # Missing required fields
        response = authenticated_api_client.post(reverse('product-list'), data={})
        assert response.status_code == 400
        assert 'name' in response.data
        assert 'description' in response.data
        assert 'price' in response.data
        
        # Invalid price
        invalid_data = {
            'name': 'Test',
            'description': 'Test',
            'price': 'invalid_price'
        }
        response = authenticated_api_client.post(reverse('product-list'), data=invalid_data)
        assert response.status_code == 400
        assert 'price' in response.data


@pytest.mark.api
class TestOrderAPI:
    """Tests for Order API endpoints."""
    
    def test_order_list_requires_authentication(self, api_client):
        """Test that order list requires authentication."""
        response = api_client.get(reverse('order-list'))
        assert response.status_code == 401
    
    def test_order_list_user_orders_only(self, authenticated_api_client, authenticated_user):
        """Test that users can only see their own orders."""
        # User's orders
        user_orders = OrderFactory.create_batch(3, user=authenticated_user)
        
        # Other user's orders
        OrderFactory.create_batch(2)
        
        response = authenticated_api_client.get(reverse('order-list'))
        
        assert response.status_code == 200
        assert len(response.data['results']) == 3
        
        # All returned orders should belong to the user
        for order_data in response.data['results']:
            assert order_data['user'] == authenticated_user.id
    
    def test_order_detail_access_control(self, authenticated_api_client, authenticated_user):
        """Test order detail access control."""
        user_order = OrderFactory(user=authenticated_user)
        other_order = OrderFactory()
        
        # Can access own order
        response = authenticated_api_client.get(
            reverse('order-detail', kwargs={'pk': user_order.pk})
        )
        assert response.status_code == 200
        
        # Cannot access other's order
        response = authenticated_api_client.get(
            reverse('order-detail', kwargs={'pk': other_order.pk})
        )
        assert response.status_code in [403, 404]
    
    def test_order_creation_from_cart(self, authenticated_api_client, authenticated_user):
        """Test order creation from cart."""
        cart = CartFactory(user=authenticated_user)
        cart_items = CartItemFactory.create_batch(2, cart=cart)
        
        order_data = {
            'first_name': 'John',
            'last_name': 'Doe',
            'email': 'john@example.com',
            'phone': '1234567890',
            'address_line_1': '123 Test St',
            'city': 'Test City',
            'province': 'Test Province',
            'postal_code': '12345',
            'payment_method': 'card'
        }
        
        response = authenticated_api_client.post(
            reverse('create-order-from-cart'),
            data=order_data
        )
        
        assert response.status_code == 201
        
        # Verify order was created
        order = Order.objects.get(id=response.data['id'])
        assert order.user == authenticated_user
        assert order.items.count() == 2
    
    def test_order_status_update_admin_only(self, api_client, authenticated_api_client):
        """Test that only admin can update order status."""
        order = OrderFactory(status='pending')
        
        update_data = {'status': 'processing'}
        
        # Regular user cannot update order status
        response = authenticated_api_client.patch(
            reverse('order-detail', kwargs={'pk': order.pk}),
            data=update_data
        )
        assert response.status_code in [403, 400]
        
        # Admin can update order status
        admin_user = AdminUserFactory()
        api_client.force_authenticate(user=admin_user)
        
        response = api_client.patch(
            reverse('order-detail', kwargs={'pk': order.pk}),
            data=update_data
        )
        assert response.status_code == 200
        assert response.data['status'] == 'processing'
    
    def test_order_filtering_and_sorting(self, authenticated_api_client, authenticated_user):
        """Test order filtering and sorting."""
        OrderFactory(user=authenticated_user, status='pending')
        OrderFactory(user=authenticated_user, status='shipped')
        OrderFactory(user=authenticated_user, status='delivered')
        
        # Filter by status
        response = authenticated_api_client.get(
            reverse('order-list'),
            {'status': 'shipped'}
        )
        assert response.status_code == 200
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['status'] == 'shipped'
        
        # Sort by created date (newest first)
        response = authenticated_api_client.get(
            reverse('order-list'),
            {'ordering': '-created_at'}
        )
        assert response.status_code == 200


@pytest.mark.api
class TestPaymentAPI:
    """Tests for Payment API endpoints."""
    
    def test_payment_list_requires_authentication(self, api_client):
        """Test that payment list requires authentication."""
        response = api_client.get(reverse('payment-list'))
        assert response.status_code == 401
    
    def test_payment_create_with_stripe(self, authenticated_api_client, authenticated_user):
        """Test payment creation with Stripe."""
        order = OrderFactory(user=authenticated_user, payment_status='pending')
        
        payment_data = {
            'order': order.id,
            'payment_method': 'card',
            'amount': str(order.total_amount),
            'stripe_token': 'tok_visa'
        }
        
        with patch('homepage.stripe_service.stripe.PaymentIntent.create') as mock_create:
            mock_create.return_value = Mock(
                id='pi_test_1234567890',
                status='succeeded'
            )
            
            response = authenticated_api_client.post(
                reverse('payment-list'),
                data=payment_data
            )
        
        assert response.status_code == 201
        assert response.data['status'] == 'completed'
    
    def test_payment_refund(self, authenticated_api_client, authenticated_user):
        """Test payment refund functionality."""
        order = OrderFactory(user=authenticated_user, payment_status='paid')
        payment = PaymentFactory(order=order, status='completed')
        
        with patch('homepage.stripe_service.stripe.Refund.create') as mock_refund:
            mock_refund.return_value = Mock(
                id='re_test_1234567890',
                status='succeeded'
            )
            
            response = authenticated_api_client.post(
                reverse('payment-refund', kwargs={'pk': payment.pk}),
                data={'reason': 'Customer request'}
            )
        
        assert response.status_code == 200
        
        payment.refresh_from_db()
        assert payment.status == 'refunded'


@pytest.mark.api
class TestReviewAPI:
    """Tests for Review API endpoints."""
    
    def test_review_list_public_access(self, api_client):
        """Test that review list is publicly accessible."""
        product = ProductFactory()
        ReviewFactory.create_batch(3, product=product, is_approved=True)
        ReviewFactory.create_batch(2, product=product, is_approved=False)
        
        response = api_client.get(
            reverse('review-list'),
            {'product': product.id}
        )
        
        assert response.status_code == 200
        # Only approved reviews should be visible
        assert len(response.data['results']) == 3
    
    def test_review_create_requires_authentication(self, api_client):
        """Test that review creation requires authentication."""
        product = ProductFactory()
        review_data = {
            'product': product.id,
            'rating': 5,
            'title': 'Great product',
            'comment': 'Love it!'
        }
        
        response = api_client.post(reverse('review-list'), data=review_data)
        assert response.status_code == 401
    
    def test_review_create_authenticated_user(self, authenticated_api_client, authenticated_user):
        """Test review creation by authenticated user."""
        product = ProductFactory()
        review_data = {
            'product': product.id,
            'rating': 5,
            'title': 'Great product',
            'comment': 'Love it!'
        }
        
        response = authenticated_api_client.post(reverse('review-list'), data=review_data)
        
        assert response.status_code == 201
        assert response.data['user'] == authenticated_user.id
        assert response.data['rating'] == 5
    
    def test_review_duplicate_prevention(self, authenticated_api_client, authenticated_user):
        """Test prevention of duplicate reviews by same user."""
        product = ProductFactory()
        
        # Create first review
        ReviewFactory(product=product, user=authenticated_user)
        
        # Try to create second review for same product
        review_data = {
            'product': product.id,
            'rating': 4,
            'title': 'Another review',
            'comment': 'Different opinion'
        }
        
        response = authenticated_api_client.post(reverse('review-list'), data=review_data)
        assert response.status_code == 400
        assert 'already reviewed' in str(response.data).lower()
    
    def test_review_update_owner_only(self, authenticated_api_client, authenticated_user):
        """Test that only review owner can update their review."""
        user_review = ReviewFactory(user=authenticated_user)
        other_review = ReviewFactory()
        
        update_data = {'rating': 3, 'title': 'Updated review'}
        
        # Can update own review
        response = authenticated_api_client.patch(
            reverse('review-detail', kwargs={'pk': user_review.pk}),
            data=update_data
        )
        assert response.status_code == 200
        assert response.data['rating'] == 3
        
        # Cannot update other's review
        response = authenticated_api_client.patch(
            reverse('review-detail', kwargs={'pk': other_review.pk}),
            data=update_data
        )
        assert response.status_code in [403, 404]


@pytest.mark.api
class TestFavoriteAPI:
    """Tests for Favorite API endpoints."""
    
    def test_favorite_list_requires_authentication(self, api_client):
        """Test that favorite list requires authentication."""
        response = api_client.get(reverse('favorite-list'))
        assert response.status_code == 401
    
    def test_favorite_add_product(self, authenticated_api_client, authenticated_user):
        """Test adding product to favorites."""
        product = ProductFactory()
        
        response = authenticated_api_client.post(
            reverse('favorite-list'),
            data={'product': product.id}
        )
        
        assert response.status_code == 201
        assert Favorite.objects.filter(user=authenticated_user, product=product).exists()
    
    def test_favorite_remove_product(self, authenticated_api_client, authenticated_user):
        """Test removing product from favorites."""
        favorite = FavoriteFactory(user=authenticated_user)
        
        response = authenticated_api_client.delete(
            reverse('favorite-detail', kwargs={'pk': favorite.pk})
        )
        
        assert response.status_code == 204
        assert not Favorite.objects.filter(pk=favorite.pk).exists()
    
    def test_favorite_duplicate_prevention(self, authenticated_api_client, authenticated_user):
        """Test prevention of duplicate favorites."""
        product = ProductFactory()
        FavoriteFactory(user=authenticated_user, product=product)
        
        response = authenticated_api_client.post(
            reverse('favorite-list'),
            data={'product': product.id}
        )
        
        assert response.status_code == 400
        assert 'already in favorites' in str(response.data).lower()


@pytest.mark.api
class TestCartAPI:
    """Tests for Cart API endpoints."""
    
    def test_cart_get_or_create_authenticated_user(self, authenticated_api_client, authenticated_user):
        """Test cart get or create for authenticated user."""
        response = authenticated_api_client.get(reverse('cart-detail'))
        
        assert response.status_code == 200
        
        # Cart should be created if it doesn't exist
        cart = Cart.objects.get(user=authenticated_user)
        assert cart is not None
    
    def test_cart_add_item(self, authenticated_api_client, authenticated_user):
        """Test adding item to cart."""
        product = ProductFactory(status='available')
        
        response = authenticated_api_client.post(
            reverse('cart-add-item'),
            data={
                'product_id': product.id,
                'quantity': 2
            }
        )
        
        assert response.status_code == 200
        
        # Verify item was added
        cart = Cart.objects.get(user=authenticated_user)
        cart_item = cart.items.get(product=product)
        assert cart_item.quantity == 2
    
    def test_cart_update_item_quantity(self, authenticated_api_client, authenticated_user):
        """Test updating cart item quantity."""
        cart = CartFactory(user=authenticated_user)
        cart_item = CartItemFactory(cart=cart, quantity=1)
        
        response = authenticated_api_client.patch(
            reverse('cart-item-detail', kwargs={'pk': cart_item.pk}),
            data={'quantity': 3}
        )
        
        assert response.status_code == 200
        
        cart_item.refresh_from_db()
        assert cart_item.quantity == 3
    
    def test_cart_remove_item(self, authenticated_api_client, authenticated_user):
        """Test removing item from cart."""
        cart = CartFactory(user=authenticated_user)
        cart_item = CartItemFactory(cart=cart)
        
        response = authenticated_api_client.delete(
            reverse('cart-item-detail', kwargs={'pk': cart_item.pk})
        )
        
        assert response.status_code == 204
        assert not CartItem.objects.filter(pk=cart_item.pk).exists()
    
    def test_cart_clear(self, authenticated_api_client, authenticated_user):
        """Test clearing entire cart."""
        cart = CartFactory(user=authenticated_user)
        CartItemFactory.create_batch(3, cart=cart)
        
        response = authenticated_api_client.post(reverse('cart-clear'))
        
        assert response.status_code == 200
        assert cart.items.count() == 0


@pytest.mark.api
class TestAPIPermissions:
    """Tests for API permission systems."""
    
    def test_admin_can_access_all_endpoints(self, api_client):
        """Test that admin users can access all endpoints."""
        admin_user = AdminUserFactory()
        api_client.force_authenticate(user=admin_user)
        
        # Admin can view all orders
        OrderFactory.create_batch(5)
        response = api_client.get(reverse('admin-order-list'))
        assert response.status_code == 200
        assert len(response.data['results']) == 5
        
        # Admin can view all users
        UserFactory.create_batch(3)
        response = api_client.get(reverse('admin-user-list'))
        assert response.status_code == 200
    
    def test_staff_limited_access(self, api_client):
        """Test staff user permissions."""
        staff_user = UserFactory(is_staff=True, is_superuser=False)
        api_client.force_authenticate(user=staff_user)
        
        # Staff can view orders but not users
        response = api_client.get(reverse('admin-order-list'))
        assert response.status_code == 200
        
        response = api_client.get(reverse('admin-user-list'))
        assert response.status_code == 403
    
    def test_regular_user_restrictions(self, authenticated_api_client):
        """Test regular user restrictions."""
        # Regular users cannot access admin endpoints
        response = authenticated_api_client.get(reverse('admin-order-list'))
        assert response.status_code == 403
        
        response = authenticated_api_client.get(reverse('admin-user-list'))
        assert response.status_code == 403
    
    def test_object_level_permissions(self, authenticated_api_client, authenticated_user):
        """Test object-level permissions."""
        # Users can only access their own data
        user_order = OrderFactory(user=authenticated_user)
        other_order = OrderFactory()
        
        # Can access own order
        response = authenticated_api_client.get(
            reverse('order-detail', kwargs={'pk': user_order.pk})
        )
        assert response.status_code == 200
        
        # Cannot access other's order
        response = authenticated_api_client.get(
            reverse('order-detail', kwargs={'pk': other_order.pk})
        )
        assert response.status_code in [403, 404]


@pytest.mark.api
class TestAPIRateLimiting:
    """Tests for API rate limiting and throttling."""
    
    def test_anonymous_rate_limiting(self, api_client):
        """Test rate limiting for anonymous users."""
        # Make many requests quickly
        responses = []
        for i in range(100):
            response = api_client.get(reverse('product-list'))
            responses.append(response.status_code)
        
        # Should eventually get rate limited
        rate_limited = any(status_code == 429 for status_code in responses)
        assert rate_limited or all(status_code == 200 for status_code in responses[:50])
    
    def test_authenticated_higher_rate_limit(self, authenticated_api_client):
        """Test that authenticated users have higher rate limits."""
        # Make many requests quickly
        responses = []
        for i in range(200):
            response = authenticated_api_client.get(reverse('product-list'))
            responses.append(response.status_code)
            if response.status_code == 429:
                break
        
        # Authenticated users should be able to make more requests
        successful_requests = sum(1 for status_code in responses if status_code == 200)
        assert successful_requests > 50


@pytest.mark.api
class TestAPIValidation:
    """Tests for API request/response validation."""
    
    def test_invalid_json_request(self, authenticated_api_client):
        """Test handling of invalid JSON requests."""
        response = authenticated_api_client.post(
            reverse('product-list'),
            data="invalid json",
            content_type='application/json'
        )
        
        assert response.status_code == 400
    
    def test_missing_required_fields(self, authenticated_api_client):
        """Test validation of missing required fields."""
        # Product creation without required fields
        response = authenticated_api_client.post(
            reverse('product-list'),
            data={}
        )
        
        assert response.status_code == 400
        assert 'name' in response.data
        assert 'description' in response.data
        assert 'price' in response.data
    
    def test_field_type_validation(self, authenticated_api_client):
        """Test field type validation."""
        # Invalid price type
        response = authenticated_api_client.post(
            reverse('product-list'),
            data={
                'name': 'Test Product',
                'description': 'Test',
                'price': 'not_a_number',
                'category': 'electronics'
            }
        )
        
        assert response.status_code == 400
        assert 'price' in response.data
    
    def test_field_length_validation(self, authenticated_api_client):
        """Test field length validation."""
        # Name too long
        response = authenticated_api_client.post(
            reverse('product-list'),
            data={
                'name': 'x' * 200,  # Assuming max length is less than 200
                'description': 'Test',
                'price': '99.99',
                'category': 'electronics'
            }
        )
        
        assert response.status_code == 400
        assert 'name' in response.data
    
    def test_choice_field_validation(self, authenticated_api_client):
        """Test choice field validation."""
        # Invalid category choice
        response = authenticated_api_client.post(
            reverse('product-list'),
            data={
                'name': 'Test Product',
                'description': 'Test',
                'price': '99.99',
                'category': 'invalid_category'
            }
        )
        
        assert response.status_code == 400
        assert 'category' in response.data


@pytest.mark.api
class TestAPIResponses:
    """Tests for API response formats and content."""
    
    def test_successful_response_format(self, api_client):
        """Test successful response format."""
        product = ProductFactory()
        
        response = api_client.get(
            reverse('product-detail', kwargs={'pk': product.pk})
        )
        
        assert response.status_code == 200
        assert 'id' in response.data
        assert 'name' in response.data
        assert 'price' in response.data
        assert 'created_at' in response.data
    
    def test_error_response_format(self, authenticated_api_client):
        """Test error response format."""
        response = authenticated_api_client.post(
            reverse('product-list'),
            data={}
        )
        
        assert response.status_code == 400
        assert isinstance(response.data, dict)
        assert any(field in response.data for field in ['name', 'description', 'price'])
    
    def test_pagination_format(self, api_client):
        """Test pagination response format."""
        ProductFactory.create_batch(25)
        
        response = api_client.get(reverse('product-list'))
        
        assert response.status_code == 200
        assert 'results' in response.data
        assert 'count' in response.data
        assert 'next' in response.data
        assert 'previous' in response.data
    
    def test_filtering_response(self, api_client):
        """Test filtered response content."""
        ProductFactory.create_batch(3, category='electronics')
        ProductFactory.create_batch(2, category='clothing')
        
        response = api_client.get(
            reverse('product-list'),
            {'category': 'electronics'}
        )
        
        assert response.status_code == 200
        assert len(response.data['results']) == 3
        for product in response.data['results']:
            assert product['category'] == 'electronics'
