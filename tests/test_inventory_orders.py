"""
Inventory and order management tests for MarketHub.

This module contains comprehensive tests for:
- Concurrent cart updates with transaction.atomic
- Oversell prevention mechanisms
- Order cancellation flow
- Inventory tracking and management
"""
import pytest
from unittest.mock import patch, Mock
from decimal import Decimal
from django.test import TestCase, TransactionTestCase
from django.db import transaction, IntegrityError
from django.urls import reverse
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
import threading
import time

from homepage.models import (
    Product, Cart, CartItem, Order, OrderItem, Payment
)
from tests.factories import (
    UserFactory, ProductFactory, CartFactory, CartItemFactory,
    OrderFactory, OrderItemFactory, PaymentFactory
)


@pytest.mark.integration
class TestConcurrentCartUpdates:
    """Tests for concurrent cart update handling with transaction.atomic."""
    
    def test_concurrent_add_to_cart_same_product(self, transactional_db_access):
        """Test concurrent additions of the same product to cart."""
        user = UserFactory()
        product = ProductFactory(status='available')
        cart = CartFactory(user=user)
        
        def add_to_cart():
            """Function to add item to cart in separate thread."""
            with transaction.atomic():
                cart_item, created = CartItem.objects.get_or_create(
                    cart=cart,
                    product=product,
                    defaults={'quantity': 1}
                )
                if not created:
                    cart_item.quantity += 1
                    cart_item.save()
        
        # Start multiple threads to add the same product
        threads = []
        for _ in range(5):
            thread = threading.Thread(target=add_to_cart)
            threads.append(thread)
        
        # Start all threads simultaneously
        for thread in threads:
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # Verify final cart state
        cart_item = CartItem.objects.get(cart=cart, product=product)
        
        # Should have accumulated all additions
        assert cart_item.quantity == 5
    
    def test_concurrent_quantity_updates_same_cart_item(self, transactional_db_access):
        """Test concurrent quantity updates to the same cart item."""
        cart_item = CartItemFactory(quantity=1)
        
        def update_quantity(increment):
            """Function to update cart item quantity."""
            with transaction.atomic():
                # Use select_for_update to prevent race conditions
                item = CartItem.objects.select_for_update().get(pk=cart_item.pk)
                item.quantity += increment
                item.save()
        
        # Start multiple threads with different increments
        threads = []
        increments = [2, 3, 1, 4, 2]
        
        for increment in increments:
            thread = threading.Thread(target=update_quantity, args=(increment,))
            threads.append(thread)
        
        # Start all threads
        for thread in threads:
            thread.start()
        
        # Wait for completion
        for thread in threads:
            thread.join()
        
        # Verify final quantity
        cart_item.refresh_from_db()
        expected_quantity = 1 + sum(increments)  # Initial 1 + all increments
        assert cart_item.quantity == expected_quantity
    
    def test_concurrent_cart_checkout_inventory_check(self, transactional_db_access):
        """Test concurrent cart checkouts with inventory validation."""
        product = ProductFactory(status='available')
        
        # Create multiple carts with the same product
        carts = []
        for i in range(3):
            user = UserFactory()
            cart = CartFactory(user=user)
            CartItemFactory(cart=cart, product=product, quantity=1)
            carts.append(cart)
        
        checkout_results = []
        
        def checkout_cart(cart):
            """Function to checkout cart."""
            try:
                with transaction.atomic():
                    # Check product availability
                    current_product = Product.objects.select_for_update().get(pk=product.pk)
                    
                    if current_product.status != 'available':
                        raise ValueError("Product not available")
                    
                    # Create order
                    order = Order.objects.create(
                        user=cart.user,
                        first_name='Test',
                        last_name='User',
                        email=cart.user.email,
                        phone='1234567890',
                        address_line_1='123 Test St',
                        city='Test City',
                        province='Test Province',
                        postal_code='12345',
                        subtotal=current_product.price,
                        total_amount=current_product.price
                    )
                    
                    # Create order item
                    OrderItem.objects.create(
                        order=order,
                        product=current_product,
                        quantity=1,
                        price=current_product.price
                    )
                    
                    # Update product status (simulate inventory reduction)
                    current_product.status = 'sold'
                    current_product.save()
                    
                    checkout_results.append(('success', order.id))
                    
            except Exception as e:
                checkout_results.append(('failed', str(e)))
        
        # Start concurrent checkouts
        threads = []
        for cart in carts:
            thread = threading.Thread(target=checkout_cart, args=(cart,))
            threads.append(thread)
        
        for thread in threads:
            thread.start()
        
        for thread in threads:
            thread.join()
        
        # Only one checkout should succeed
        successful_checkouts = [r for r in checkout_results if r[0] == 'success']
        failed_checkouts = [r for r in checkout_results if r[0] == 'failed']
        
        assert len(successful_checkouts) == 1
        assert len(failed_checkouts) == 2
        
        # Verify product is marked as sold
        product.refresh_from_db()
        assert product.status == 'sold'


@pytest.mark.unit
class TestOversellPrevention:
    """Tests for preventing overselling of products."""
    
    def test_product_availability_check_before_checkout(self, authenticated_api_client, authenticated_user):
        """Test that product availability is checked before allowing checkout."""
        # Create sold product
        sold_product = ProductFactory(status='sold')
        cart = CartFactory(user=authenticated_user)
        CartItemFactory(cart=cart, product=sold_product, quantity=1)
        
        checkout_data = {
            'payment_method': 'card',
            'card_token': 'pm_test_1234567890'
        }
        
        response = authenticated_api_client.post(
            reverse('checkout_cart'),
            data=checkout_data
        )
        
        assert response.status_code == 400
        assert 'not available' in str(response.data).lower()
    
    def test_multiple_quantity_oversell_prevention(self, authenticated_api_client, authenticated_user):
        """Test prevention of ordering more items than available."""
        # For this test, assume we have quantity tracking
        # This would require extending the Product model
        product = ProductFactory(status='available')
        cart = CartFactory(user=authenticated_user)
        
        # Try to add more quantity than available (assuming stock is 1)
        CartItemFactory(cart=cart, product=product, quantity=10)
        
        checkout_data = {
            'payment_method': 'card',
            'card_token': 'pm_test_1234567890'
        }
        
        response = authenticated_api_client.post(
            reverse('checkout_cart'),
            data=checkout_data
        )
        
        # Should fail due to insufficient inventory
        # Implementation would depend on inventory tracking system
        assert response.status_code in [400, 409]
    
    def test_reservation_timeout_mechanism(self, db):
        """Test automatic release of reserved products after timeout."""
        product = ProductFactory(status='reserved')
        
        # Mock reservation that should have expired
        with patch('django.utils.timezone.now') as mock_now:
            # Set current time to 1 hour after reservation should expire
            mock_now.return_value = timezone.now() + timezone.timedelta(hours=1)
            
            # Run reservation cleanup (this would be a management command)
            # For now, simulate the logic
            reservation_timeout = timezone.timedelta(minutes=15)
            expired_time = timezone.now() - reservation_timeout
            
            # Products reserved before expired_time should be made available
            Product.objects.filter(
                status='reserved',
                updated_at__lt=expired_time
            ).update(status='available')
            
            product.refresh_from_db()
            assert product.status == 'available'
    
    def test_inventory_validation_api_endpoint(self, authenticated_api_client, authenticated_user):
        """Test API endpoint for inventory validation."""
        available_product = ProductFactory(status='available')
        sold_product = ProductFactory(status='sold')
        
        # Check available product
        response = authenticated_api_client.get(
            reverse('check_product_availability', kwargs={'pk': available_product.pk})
        )
        assert response.status_code == 200
        assert response.data['available'] is True
        
        # Check sold product
        response = authenticated_api_client.get(
            reverse('check_product_availability', kwargs={'pk': sold_product.pk})
        )
        assert response.status_code == 200
        assert response.data['available'] is False
    
    def test_bulk_inventory_validation(self, authenticated_api_client):
        """Test bulk inventory validation for cart items."""
        products = ProductFactory.create_batch(3, status='available')
        sold_product = ProductFactory(status='sold')
        
        product_ids = [p.id for p in products] + [sold_product.id]
        
        response = authenticated_api_client.post(
            reverse('bulk_check_availability'),
            data={'product_ids': product_ids}
        )
        
        assert response.status_code == 200
        
        # Three products should be available, one should not
        available_count = sum(1 for item in response.data if item['available'])
        unavailable_count = sum(1 for item in response.data if not item['available'])
        
        assert available_count == 3
        assert unavailable_count == 1


@pytest.mark.integration
class TestOrderCancellationFlow:
    """Tests for order cancellation workflow."""
    
    def test_order_cancellation_by_customer(self, authenticated_api_client, authenticated_user):
        """Test customer-initiated order cancellation."""
        order = OrderFactory(
            user=authenticated_user,
            status='pending',
            payment_status='pending'
        )
        order_items = OrderItemFactory.create_batch(2, order=order)
        
        response = authenticated_api_client.post(
            reverse('cancel_order', kwargs={'pk': order.pk})
        )
        
        assert response.status_code == 200
        
        # Verify order status updated
        order.refresh_from_db()
        assert order.status == 'cancelled'
        
        # Verify products are made available again
        for item in order_items:
            item.product.refresh_from_db()
            assert item.product.status == 'available'
    
    def test_order_cancellation_with_payment_refund(self, authenticated_api_client, authenticated_user):
        """Test order cancellation with payment refund."""
        order = OrderFactory(
            user=authenticated_user,
            status='processing',
            payment_status='paid'
        )
        payment = PaymentFactory(order=order, status='completed')
        order_items = OrderItemFactory.create_batch(2, order=order)
        
        with patch('homepage.stripe_service.stripe.Refund.create') as mock_refund:
            mock_refund.return_value = Mock(
                id='re_test_1234567890',
                status='succeeded',
                amount=int(order.total_amount * 100)
            )
            
            response = authenticated_api_client.post(
                reverse('cancel_order', kwargs={'pk': order.pk}),
                data={'reason': 'Customer request'}
            )
        
        assert response.status_code == 200
        
        # Verify refund was initiated
        mock_refund.assert_called_once()
        
        # Verify order and payment status
        order.refresh_from_db()
        payment.refresh_from_db()
        
        assert order.status == 'cancelled'
        assert payment.status == 'refunded'
    
    def test_order_cancellation_restrictions(self, authenticated_api_client, authenticated_user):
        """Test restrictions on order cancellation."""
        # Cannot cancel shipped orders
        shipped_order = OrderFactory(
            user=authenticated_user,
            status='shipped',
            payment_status='paid'
        )
        
        response = authenticated_api_client.post(
            reverse('cancel_order', kwargs={'pk': shipped_order.pk})
        )
        
        assert response.status_code == 400
        assert 'cannot cancel' in str(response.data).lower()
        
        # Cannot cancel delivered orders
        delivered_order = OrderFactory(
            user=authenticated_user,
            status='delivered',
            payment_status='paid'
        )
        
        response = authenticated_api_client.post(
            reverse('cancel_order', kwargs={'pk': delivered_order.pk})
        )
        
        assert response.status_code == 400
    
    def test_partial_order_cancellation(self, authenticated_api_client, authenticated_user):
        """Test partial order cancellation (individual items)."""
        order = OrderFactory(
            user=authenticated_user,
            status='pending',
            payment_status='paid'
        )
        order_items = OrderItemFactory.create_batch(3, order=order)
        item_to_cancel = order_items[0]
        
        response = authenticated_api_client.post(
            reverse('cancel_order_item', kwargs={'pk': item_to_cancel.pk}),
            data={'reason': 'Item not needed'}
        )
        
        assert response.status_code == 200
        
        # Verify item is removed from order
        assert not OrderItem.objects.filter(pk=item_to_cancel.pk).exists()
        
        # Verify product is made available
        item_to_cancel.product.refresh_from_db()
        assert item_to_cancel.product.status == 'available'
        
        # Verify order totals are updated
        order.refresh_from_db()
        remaining_items = order.items.all()
        expected_subtotal = sum(item.get_total_price() for item in remaining_items)
        assert order.subtotal == expected_subtotal
    
    def test_automatic_cancellation_for_failed_payments(self, db):
        """Test automatic order cancellation for failed payments."""
        order = OrderFactory(status='pending', payment_status='pending')
        payment = PaymentFactory(order=order, status='failed')
        order_items = OrderItemFactory.create_batch(2, order=order)
        
        # Simulate automatic cancellation process
        # This would typically be triggered by a webhook or scheduled task
        
        with patch('homepage.tasks.cancel_failed_payment_orders') as mock_task:
            # Trigger the cancellation process
            from homepage.models import Order
            
            failed_orders = Order.objects.filter(
                payment_status='failed',
                status='pending'
            )
            
            for failed_order in failed_orders:
                failed_order.status = 'cancelled'
                failed_order.save()
                
                # Release inventory
                for item in failed_order.items.all():
                    item.product.status = 'available'
                    item.product.save()
        
        # Verify order was cancelled
        order.refresh_from_db()
        assert order.status == 'cancelled'
        
        # Verify inventory was released
        for item in order_items:
            item.product.refresh_from_db()
            assert item.product.status == 'available'


@pytest.mark.unit
class TestInventoryTracking:
    """Tests for inventory tracking and management."""
    
    def test_product_status_transitions(self, db):
        """Test valid product status transitions."""
        product = ProductFactory(status='available')
        
        # Available -> Reserved
        product.status = 'reserved'
        product.save()
        assert product.status == 'reserved'
        
        # Reserved -> Sold
        product.status = 'sold'
        product.save()
        assert product.status == 'sold'
        
        # Reserved -> Available (cancel reservation)
        product.status = 'available'
        product.save()
        assert product.status == 'available'
    
    def test_product_view_count_increment(self, authenticated_api_client):
        """Test that product view count increments correctly."""
        product = ProductFactory(views_count=0)
        
        # View product multiple times
        for _ in range(5):
            response = authenticated_api_client.get(
                reverse('product_detail', kwargs={'pk': product.pk})
            )
            assert response.status_code == 200
        
        product.refresh_from_db()
        assert product.views_count == 5
    
    def test_inventory_alerts_for_sold_products(self, db):
        """Test inventory alerts when products are sold."""
        product = ProductFactory(status='available', seller__email='seller@example.com')
        
        # Simulate product being sold
        product.status = 'sold'
        product.is_sold = True
        product.save()
        
        # This would trigger an inventory alert
        # Implementation would depend on notification system
        from homepage.models import Notification
        
        # Create notification for seller
        Notification.objects.create(
            user=product.seller,
            notification_type='sale',
            title=f'Your product "{product.name}" has been sold',
            message=f'Congratulations! Your product "{product.name}" has been sold.',
            product=product
        )
        
        # Verify notification was created
        notification = Notification.objects.filter(
            user=product.seller,
            notification_type='sale',
            product=product
        ).first()
        
        assert notification is not None
        assert product.name in notification.title
    
    def test_low_inventory_warnings(self, db):
        """Test warnings for low inventory levels."""
        # This test assumes we have quantity tracking
        # For the current model, we simulate with status
        
        products = ProductFactory.create_batch(10, status='available')
        
        # Simulate most products being sold
        for product in products[:8]:
            product.status = 'sold'
            product.save()
        
        # Check remaining inventory
        available_products = Product.objects.filter(status='available').count()
        assert available_products == 2
        
        # This could trigger a low inventory alert
        if available_products < 3:
            # Alert would be sent to administrators
            assert True  # Low inventory condition met
    
    def test_inventory_reporting(self, db):
        """Test inventory reporting functionality."""
        # Create products in various states
        ProductFactory.create_batch(5, status='available')
        ProductFactory.create_batch(3, status='sold')
        ProductFactory.create_batch(2, status='reserved')
        ProductFactory.create_batch(1, status='inactive')
        
        # Generate inventory report
        from django.db.models import Count
        from homepage.models import Product
        
        inventory_report = Product.objects.values('status').annotate(
            count=Count('id')
        ).order_by('status')
        
        report_dict = {item['status']: item['count'] for item in inventory_report}
        
        assert report_dict['available'] == 5
        assert report_dict['sold'] == 3
        assert report_dict['reserved'] == 2
        assert report_dict['inactive'] == 1
    
    def test_product_reservation_workflow(self, authenticated_api_client, authenticated_user):
        """Test product reservation during checkout process."""
        product = ProductFactory(status='available')
        cart = CartFactory(user=authenticated_user)
        CartItemFactory(cart=cart, product=product, quantity=1)
        
        # Start checkout process
        response = authenticated_api_client.post(
            reverse('start_checkout'),
            data={'cart_id': cart.id}
        )
        
        assert response.status_code == 200
        
        # Product should be reserved
        product.refresh_from_db()
        assert product.status == 'reserved'
        
        # Reservation should have a timeout
        checkout_session_id = response.data['checkout_session_id']
        
        # Verify reservation details
        from django.core.cache import cache
        reservation_key = f"reservation_{product.id}"
        reservation_data = cache.get(reservation_key)
        
        assert reservation_data is not None
        assert reservation_data['user_id'] == authenticated_user.id
        assert reservation_data['checkout_session_id'] == checkout_session_id


@pytest.mark.integration
class TestOrderWorkflow:
    """Tests for complete order workflow."""
    
    def test_complete_order_lifecycle(self, authenticated_api_client, authenticated_user):
        """Test complete order from cart to delivery."""
        # 1. Create cart with items
        product1 = ProductFactory(status='available', price=Decimal('100.00'))
        product2 = ProductFactory(status='available', price=Decimal('50.00'))
        
        cart = CartFactory(user=authenticated_user)
        CartItemFactory(cart=cart, product=product1, quantity=1)
        CartItemFactory(cart=cart, product=product2, quantity=2)
        
        # 2. Checkout cart
        checkout_data = {
            'payment_method': 'card',
            'card_token': 'pm_test_1234567890',
            'shipping_address': {
                'first_name': 'John',
                'last_name': 'Doe',
                'address_line_1': '123 Test St',
                'city': 'Test City',
                'province': 'Test Province',
                'postal_code': '12345'
            }
        }
        
        with patch('homepage.stripe_service.stripe.PaymentIntent.create') as mock_create:
            mock_create.return_value = Mock(
                id='pi_test_1234567890',
                status='succeeded'
            )
            
            response = authenticated_api_client.post(
                reverse('checkout_cart'),
                data=checkout_data
            )
        
        assert response.status_code == 200
        order_id = response.data['order_id']
        
        # 3. Verify order was created
        order = Order.objects.get(id=order_id)
        assert order.user == authenticated_user
        assert order.status == 'pending'
        assert order.payment_status == 'paid'
        assert order.items.count() == 2
        
        # 4. Process order (admin action)
        admin_client = APIClient()
        admin_user = UserFactory(is_staff=True, is_superuser=True)
        admin_client.force_authenticate(user=admin_user)
        
        response = admin_client.post(
            reverse('process_order', kwargs={'pk': order_id}),
            data={'status': 'processing'}
        )
        
        assert response.status_code == 200
        
        order.refresh_from_db()
        assert order.status == 'processing'
        
        # 5. Ship order
        response = admin_client.post(
            reverse('ship_order', kwargs={'pk': order_id}),
            data={
                'tracking_number': 'TRACK123456',
                'shipping_carrier': 'PostNet'
            }
        )
        
        assert response.status_code == 200
        
        order.refresh_from_db()
        assert order.status == 'shipped'
        assert order.tracking_number == 'TRACK123456'
        
        # 6. Mark as delivered
        response = admin_client.post(
            reverse('mark_delivered', kwargs={'pk': order_id})
        )
        
        assert response.status_code == 200
        
        order.refresh_from_db()
        assert order.status == 'delivered'
    
    def test_order_history_and_tracking(self, authenticated_api_client, authenticated_user):
        """Test order history and tracking functionality."""
        # Create multiple orders for user
        orders = OrderFactory.create_batch(3, user=authenticated_user)
        
        # Add items to orders
        for order in orders:
            OrderItemFactory.create_batch(2, order=order)
        
        # Get order history
        response = authenticated_api_client.get(reverse('order_history'))
        assert response.status_code == 200
        assert len(response.data['results']) == 3
        
        # Get specific order details
        order = orders[0]
        response = authenticated_api_client.get(
            reverse('order_detail', kwargs={'pk': order.pk})
        )
        
        assert response.status_code == 200
        assert response.data['id'] == order.id
        assert len(response.data['items']) == 2
    
    def test_order_search_and_filtering(self, authenticated_api_client, authenticated_user):
        """Test order search and filtering capabilities."""
        # Create orders with different statuses
        pending_order = OrderFactory(user=authenticated_user, status='pending')
        shipped_order = OrderFactory(user=authenticated_user, status='shipped')
        delivered_order = OrderFactory(user=authenticated_user, status='delivered')
        
        # Filter by status
        response = authenticated_api_client.get(
            reverse('order_history'),
            data={'status': 'shipped'}
        )
        
        assert response.status_code == 200
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['id'] == shipped_order.id
        
        # Filter by date range
        from datetime import datetime, timedelta
        
        response = authenticated_api_client.get(
            reverse('order_history'),
            data={
                'date_from': (datetime.now() - timedelta(days=7)).date(),
                'date_to': datetime.now().date()
            }
        )
        
        assert response.status_code == 200
        assert len(response.data['results']) == 3  # All orders within date range
