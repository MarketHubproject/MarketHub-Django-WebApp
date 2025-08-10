"""
Performance tests for MarketHub using pytest-benchmark.

This module contains performance smoke tests for:
- Search endpoint performance
- Checkout endpoint performance  
- Database query optimization
- API response times
- Concurrent user simulation
"""
import pytest
from unittest.mock import patch, Mock
from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from django.db import connection
from django.test.utils import override_settings
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
import time
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

from homepage.models import Product, Order, Cart, CartItem
from tests.factories import (
    UserFactory, ProductFactory, OrderFactory, CartFactory, 
    CartItemFactory, create_product_with_reviews_scenario
)


@pytest.mark.performance
class TestSearchPerformance:
    """Performance tests for search functionality."""
    
    @pytest.fixture
    def large_product_dataset(self, db):
        """Create a large dataset for performance testing."""
        # Create products in batches for better performance
        products = []
        categories = ['electronics', 'clothing', 'books', 'furniture', 'other']
        
        for i in range(0, 1000, 100):  # Create 1000 products in batches of 100
            batch = []
            for j in range(100):
                product_name = f"Product {i + j}"
                batch.append(Product(
                    name=product_name,
                    description=f"Description for {product_name}",
                    price=Decimal('10.00') + Decimal(str(i + j)),
                    category=categories[(i + j) % len(categories)],
                    condition='good',
                    location='cape_town_central'
                ))
            
            Product.objects.bulk_create(batch)
            products.extend(batch)
        
        return products
    
    def test_search_endpoint_performance(self, benchmark, api_client, large_product_dataset):
        """Benchmark search endpoint performance with large dataset."""
        
        def search_products():
            response = api_client.get(
                reverse('product-list'),
                {'search': 'Product'}
            )
            assert response.status_code == 200
            return response
        
        # Benchmark the search operation
        result = benchmark.pedantic(search_products, iterations=10, rounds=3)
        
        # Verify we get reasonable results
        assert 'results' in result.data
        assert len(result.data['results']) > 0
    
    def test_filtered_search_performance(self, benchmark, api_client, large_product_dataset):
        """Benchmark filtered search performance."""
        
        def filtered_search():
            response = api_client.get(
                reverse('product-list'),
                {
                    'search': 'Product',
                    'category': 'electronics',
                    'price_min': '50',
                    'price_max': '500'
                }
            )
            assert response.status_code == 200
            return response
        
        result = benchmark.pedantic(filtered_search, iterations=10, rounds=3)
        
        # Should complete within reasonable time
        assert result.data['count'] >= 0
    
    def test_search_query_complexity(self, benchmark, api_client, large_product_dataset):
        """Test performance of complex search queries."""
        
        def complex_search():
            response = api_client.get(
                reverse('product-list'),
                {
                    'search': 'Product Electronics Description',
                    'category': 'electronics',
                    'ordering': '-price',
                    'location': 'cape_town_central'
                }
            )
            assert response.status_code == 200
            return response
        
        # Benchmark complex query
        result = benchmark.pedantic(complex_search, iterations=5, rounds=3)
        
        # Verify results are returned
        assert 'results' in result.data
    
    def test_search_pagination_performance(self, benchmark, api_client, large_product_dataset):
        """Test search performance with pagination."""
        
        def paginated_search():
            response = api_client.get(
                reverse('product-list'),
                {
                    'search': 'Product',
                    'page': 5,
                    'page_size': 20
                }
            )
            assert response.status_code == 200
            return response
        
        result = benchmark.pedantic(paginated_search, iterations=10, rounds=3)
        
        # Should handle pagination efficiently
        assert 'results' in result.data
        assert len(result.data['results']) <= 20


@pytest.mark.performance
class TestCheckoutPerformance:
    """Performance tests for checkout functionality."""
    
    @pytest.fixture
    def checkout_scenario_data(self, db):
        """Set up data for checkout performance tests."""
        users = UserFactory.create_batch(10)
        products = ProductFactory.create_batch(50, status='available')
        
        # Create carts with items for each user
        carts = []
        for user in users:
            cart = CartFactory(user=user)
            # Add 3-5 items per cart
            for i in range(3, 6):
                if i < len(products):
                    CartItemFactory(
                        cart=cart,
                        product=products[i],
                        quantity=1 + (i % 3)
                    )
            carts.append(cart)
        
        return {
            'users': users,
            'products': products,
            'carts': carts
        }
    
    def test_checkout_process_performance(self, benchmark, checkout_scenario_data):
        """Benchmark checkout process performance."""
        user = checkout_scenario_data['users'][0]
        cart = checkout_scenario_data['carts'][0]
        
        api_client = APIClient()
        api_client.force_authenticate(user=user)
        
        checkout_data = {
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
        
        def checkout_process():
            with patch('homepage.stripe_service.stripe.PaymentIntent.create') as mock_create:
                mock_create.return_value = Mock(
                    id='pi_test_1234567890',
                    status='succeeded'
                )
                
                response = api_client.post(
                    reverse('checkout_cart'),
                    data=checkout_data
                )
                assert response.status_code in [200, 201]
                return response
        
        # Benchmark checkout process
        result = benchmark.pedantic(checkout_process, iterations=5, rounds=3)
    
    def test_cart_operations_performance(self, benchmark, checkout_scenario_data):
        """Benchmark cart operations performance."""
        user = checkout_scenario_data['users'][0]
        product = checkout_scenario_data['products'][0]
        
        api_client = APIClient()
        api_client.force_authenticate(user=user)
        
        def cart_operations():
            # Add item to cart
            response1 = api_client.post(
                reverse('cart-add-item'),
                data={'product_id': product.id, 'quantity': 1}
            )
            
            # Get cart contents
            response2 = api_client.get(reverse('cart-detail'))
            
            # Update item quantity
            cart_item = CartItem.objects.filter(
                cart__user=user,
                product=product
            ).first()
            
            if cart_item:
                response3 = api_client.patch(
                    reverse('cart-item-detail', kwargs={'pk': cart_item.pk}),
                    data={'quantity': 2}
                )
            
            return response1, response2
        
        # Benchmark cart operations
        result = benchmark.pedantic(cart_operations, iterations=10, rounds=3)
    
    def test_order_creation_performance(self, benchmark, checkout_scenario_data):
        """Test performance of order creation."""
        user = checkout_scenario_data['users'][0]
        cart = checkout_scenario_data['carts'][0]
        
        def create_order():
            # Calculate totals
            subtotal = sum(
                item.product.price * item.quantity 
                for item in cart.items.all()
            )
            
            order = Order.objects.create(
                user=user,
                first_name='John',
                last_name='Doe',
                email=user.email,
                phone='1234567890',
                address_line_1='123 Test St',
                city='Test City',
                province='Test Province',
                postal_code='12345',
                subtotal=subtotal,
                shipping_cost=Decimal('50.00'),
                tax_amount=subtotal * Decimal('0.15'),
                total_amount=subtotal + Decimal('50.00') + (subtotal * Decimal('0.15'))
            )
            
            # Create order items
            for cart_item in cart.items.all():
                order.items.create(
                    product=cart_item.product,
                    quantity=cart_item.quantity,
                    price=cart_item.product.price
                )
            
            return order
        
        # Benchmark order creation
        result = benchmark.pedantic(create_order, iterations=10, rounds=3)
        assert result.user == user


@pytest.mark.performance
class TestConcurrentUserPerformance:
    """Performance tests simulating concurrent users."""
    
    def test_concurrent_product_browsing(self, db):
        """Test performance with concurrent users browsing products."""
        # Create test data
        ProductFactory.create_batch(100)
        
        def browse_products():
            client = APIClient()
            
            # Simulate browsing behavior
            responses = []
            
            # List products
            response = client.get(reverse('product-list'))
            responses.append(response.status_code)
            
            # View specific product
            if response.status_code == 200 and response.data.get('results'):
                product_id = response.data['results'][0]['id']
                detail_response = client.get(
                    reverse('product-detail', kwargs={'pk': product_id})
                )
                responses.append(detail_response.status_code)
            
            # Search products
            search_response = client.get(
                reverse('product-list'),
                {'search': 'Product'}
            )
            responses.append(search_response.status_code)
            
            return responses
        
        # Simulate 20 concurrent users
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=20) as executor:
            futures = [executor.submit(browse_products) for _ in range(20)]
            results = [future.result() for future in as_completed(futures)]
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # All requests should succeed
        for result in results:
            assert all(status_code == 200 for status_code in result)
        
        # Should complete within reasonable time (adjust threshold as needed)
        assert total_time < 30  # 30 seconds for 20 concurrent users
    
    def test_concurrent_cart_operations(self, db):
        """Test performance with concurrent cart operations."""
        users = UserFactory.create_batch(10)
        products = ProductFactory.create_batch(20, status='available')
        
        def user_cart_operations(user, products_subset):
            client = APIClient()
            client.force_authenticate(user=user)
            
            results = []
            
            # Add items to cart
            for product in products_subset:
                response = client.post(
                    reverse('cart-add-item'),
                    data={'product_id': product.id, 'quantity': 1}
                )
                results.append(response.status_code)
            
            # Get cart
            cart_response = client.get(reverse('cart-detail'))
            results.append(cart_response.status_code)
            
            return results
        
        # Assign products to users
        products_per_user = [products[i:i+2] for i in range(0, len(products), 2)]
        
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [
                executor.submit(user_cart_operations, user, products_subset)
                for user, products_subset in zip(users, products_per_user)
            ]
            results = [future.result() for future in as_completed(futures)]
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # All operations should succeed
        for result in results:
            assert all(status_code in [200, 201] for status_code in result)
        
        # Should handle concurrent cart operations efficiently
        assert total_time < 20  # 20 seconds for 10 concurrent users
    
    def test_concurrent_checkout_performance(self, db):
        """Test checkout performance with multiple concurrent users."""
        users = UserFactory.create_batch(5)
        
        # Create carts for each user
        carts = []
        for user in users:
            cart = CartFactory(user=user)
            products = ProductFactory.create_batch(2, status='available')
            for product in products:
                CartItemFactory(cart=cart, product=product, quantity=1)
            carts.append(cart)
        
        def checkout_process(user):
            client = APIClient()
            client.force_authenticate(user=user)
            
            checkout_data = {
                'first_name': 'Test',
                'last_name': 'User',
                'email': user.email,
                'phone': '1234567890',
                'address_line_1': '123 Test St',
                'city': 'Test City',
                'province': 'Test Province',
                'postal_code': '12345',
                'payment_method': 'card'
            }
            
            with patch('homepage.stripe_service.stripe.PaymentIntent.create') as mock_create:
                mock_create.return_value = Mock(
                    id=f'pi_test_{user.id}',
                    status='succeeded'
                )
                
                response = client.post(
                    reverse('checkout_cart'),
                    data=checkout_data
                )
                
                return response.status_code
        
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(checkout_process, user) for user in users]
            results = [future.result() for future in as_completed(futures)]
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # All checkouts should succeed
        assert all(status_code in [200, 201] for status_code in results)
        
        # Should handle concurrent checkouts
        assert total_time < 15  # 15 seconds for 5 concurrent checkouts


@pytest.mark.performance
class TestDatabaseQueryPerformance:
    """Performance tests for database queries optimization."""
    
    def test_n_plus_one_query_prevention(self, benchmark, db):
        """Test that N+1 query problems are avoided."""
        # Create products with reviews
        products = []
        for i in range(10):
            product = create_product_with_reviews_scenario(num_reviews=5)
            products.append(product)
        
        def get_products_with_reviews():
            # This should use select_related/prefetch_related to avoid N+1
            api_client = APIClient()
            
            # Monitor query count
            initial_queries = len(connection.queries)
            
            response = api_client.get(reverse('product-list'))
            
            final_queries = len(connection.queries)
            query_count = final_queries - initial_queries
            
            return response, query_count
        
        result, query_count = benchmark.pedantic(get_products_with_reviews, iterations=5, rounds=3)
        
        # Should not have excessive queries (adjust threshold based on implementation)
        assert query_count < 20  # Reasonable threshold for 10 products
    
    def test_bulk_operations_performance(self, benchmark, db):
        """Test bulk database operations performance."""
        
        def bulk_create_products():
            products_data = []
            for i in range(100):
                products_data.append(Product(
                    name=f'Bulk Product {i}',
                    description=f'Description {i}',
                    price=Decimal('10.00'),
                    category='electronics',
                    condition='good',
                    location='cape_town_central'
                ))
            
            # Use bulk_create for better performance
            Product.objects.bulk_create(products_data, batch_size=50)
            return len(products_data)
        
        result = benchmark.pedantic(bulk_create_products, iterations=3, rounds=2)
        assert result == 100
    
    def test_complex_query_performance(self, benchmark, db):
        """Test performance of complex database queries."""
        # Create test data
        users = UserFactory.create_batch(20)
        
        for user in users:
            # Create products and orders for each user
            products = ProductFactory.create_batch(3, seller=user)
            orders = OrderFactory.create_batch(2, user=user)
            
            # Create order items
            for order in orders:
                for product in products[:2]:
                    order.items.create(
                        product=product,
                        quantity=1,
                        price=product.price
                    )
        
        def complex_query():
            # Complex query with joins and aggregations
            from django.db.models import Count, Sum, Avg
            
            api_client = APIClient()
            
            # This would be implemented in a view
            users_with_stats = User.objects.select_related().prefetch_related(
                'orders__items__product'
            ).annotate(
                order_count=Count('orders'),
                total_spent=Sum('orders__total_amount'),
                avg_order_value=Avg('orders__total_amount')
            ).filter(order_count__gt=0)
            
            return list(users_with_stats)
        
        result = benchmark.pedantic(complex_query, iterations=5, rounds=3)
        assert len(result) > 0


@pytest.mark.performance
class TestAPIResponseTimePerformance:
    """Performance tests for API response times."""
    
    def test_api_endpoint_response_times(self, db):
        """Test response times for various API endpoints."""
        # Create test data
        user = UserFactory()
        products = ProductFactory.create_batch(10)
        orders = OrderFactory.create_batch(3, user=user)
        
        api_client = APIClient()
        api_client.force_authenticate(user=user)
        
        endpoints_to_test = [
            ('product-list', {}),
            ('order-list', {}),
            ('user_profile', {}),
        ]
        
        response_times = {}
        
        for endpoint_name, kwargs in endpoints_to_test:
            start_time = time.time()
            
            response = api_client.get(reverse(endpoint_name, **kwargs))
            
            end_time = time.time()
            response_time = end_time - start_time
            
            response_times[endpoint_name] = response_time
            
            # All endpoints should respond successfully
            assert response.status_code == 200
            
            # Response time should be reasonable (adjust thresholds as needed)
            assert response_time < 2.0  # 2 seconds max
        
        # Log response times for monitoring
        for endpoint, time_taken in response_times.items():
            print(f"{endpoint}: {time_taken:.3f}s")
    
    def test_payload_size_performance(self, benchmark, db):
        """Test performance with different payload sizes."""
        user = UserFactory()
        api_client = APIClient()
        api_client.force_authenticate(user=user)
        
        # Create large product description
        large_description = "A" * 5000  # 5KB description
        
        def create_large_product():
            product_data = {
                'name': 'Large Product',
                'description': large_description,
                'price': '99.99',
                'category': 'electronics',
                'condition': 'excellent',
                'location': 'cape_town_central'
            }
            
            response = api_client.post(
                reverse('product-list'),
                data=product_data
            )
            
            assert response.status_code == 201
            return response
        
        # Benchmark large payload handling
        result = benchmark.pedantic(create_large_product, iterations=5, rounds=3)
        
        # Verify large description was handled
        assert len(result.data['description']) == 5000


@pytest.mark.performance
@pytest.mark.slow
class TestLoadTestingScenarios:
    """Load testing scenarios for stress testing."""
    
    def test_high_load_product_listing(self, db):
        """Test product listing under high load."""
        # Create large dataset
        ProductFactory.create_batch(1000)
        
        def simulate_user_load():
            client = APIClient()
            
            # Simulate realistic user behavior
            actions = [
                lambda: client.get(reverse('product-list')),
                lambda: client.get(reverse('product-list'), {'search': 'Product'}),
                lambda: client.get(reverse('product-list'), {'category': 'electronics'}),
            ]
            
            results = []
            for action in actions:
                start_time = time.time()
                response = action()
                end_time = time.time()
                
                results.append({
                    'status_code': response.status_code,
                    'response_time': end_time - start_time
                })
            
            return results
        
        # Simulate 50 concurrent users
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=50) as executor:
            futures = [executor.submit(simulate_user_load) for _ in range(50)]
            all_results = []
            
            for future in as_completed(futures):
                all_results.extend(future.result())
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Calculate statistics
        successful_requests = sum(1 for r in all_results if r['status_code'] == 200)
        avg_response_time = sum(r['response_time'] for r in all_results) / len(all_results)
        max_response_time = max(r['response_time'] for r in all_results)
        
        # Performance assertions
        success_rate = successful_requests / len(all_results)
        assert success_rate > 0.95  # 95% success rate
        assert avg_response_time < 5.0  # Average response time under 5 seconds
        assert max_response_time < 15.0  # Max response time under 15 seconds
        
        print(f"Load test results:")
        print(f"Total time: {total_time:.2f}s")
        print(f"Success rate: {success_rate:.2%}")
        print(f"Average response time: {avg_response_time:.3f}s")
        print(f"Max response time: {max_response_time:.3f}s")
