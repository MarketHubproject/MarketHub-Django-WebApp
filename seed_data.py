#!/usr/bin/env python
"""
Data seeding script for MarketHub
Updates existing products with proper prices and descriptions
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'markethub.settings')
django.setup()

from homepage.models import Product, Cart, CartItem
from django.contrib.auth.models import User
from decimal import Decimal

def seed_products():
    """Update existing products with better data"""
    print("🌱 SEEDING PRODUCT DATA...")
    
    # Product data with prices and descriptions
    products_data = [
        {
            'id': 1,
            'name': 'Dell Laptop',
            'price': Decimal('1299.99'),
            'description': 'High-performance Dell laptop with 16GB RAM, 512GB SSD, Intel Core i7 processor. Perfect for work and gaming with excellent build quality.',
            'category': 'electronics'
        },
        {
            'id': 2, 
            'name': 'Canon Camera Lens',
            'price': Decimal('649.50'),
            'description': 'Professional Canon 24-70mm f/2.8L lens. Perfect for portrait and landscape photography with exceptional image quality.',
            'category': 'other'
        },
        {
            'id': 3,
            'name': 'Canon Camera',
            'price': Decimal('2499.00'), 
            'description': 'Canon EOS R5 mirrorless camera with 45MP sensor, 8K video recording, and advanced autofocus system for professional photography.',
            'category': 'electronics'
        }
    ]
    
    updated_count = 0
    for product_data in products_data:
        try:
            product = Product.objects.get(id=product_data['id'])
            product.name = product_data['name']
            product.price = product_data['price']
            product.description = product_data['description']
            product.category = product_data['category']
            product.save()
            print(f"✅ Updated: {product.name} - ${product.price}")
            updated_count += 1
        except Product.DoesNotExist:
            print(f"❌ Product ID {product_data['id']} not found")
    
    return updated_count

def create_additional_products():
    """Create some additional sample products if needed"""
    print("\n🆕 CREATING ADDITIONAL PRODUCTS...")
    
    additional_products = [
        {
            'name': 'Wireless Bluetooth Headphones',
            'price': Decimal('89.99'),
            'description': 'Premium wireless headphones with noise cancellation, 30-hour battery life, and crystal clear audio quality.',
            'category': 'electronics'
        },
        {
            'name': 'Organic Cotton T-Shirt',
            'price': Decimal('24.99'),
            'description': 'Comfortable organic cotton t-shirt available in multiple colors. Eco-friendly and sustainably made.',
            'category': 'clothing'
        },
        {
            'name': 'Programming Python Book',
            'price': Decimal('39.99'),
            'description': 'Comprehensive guide to Python programming for beginners and intermediate developers. Includes practical exercises.',
            'category': 'books'
        }
    ]
    
    created_count = 0
    for product_data in additional_products:
        # Check if product with this name already exists
        if not Product.objects.filter(name=product_data['name']).exists():
            product = Product.objects.create(**product_data)
            print(f"✅ Created: {product.name} - ${product.price}")
            created_count += 1
        else:
            print(f"⚠️  Product already exists: {product_data['name']}")
    
    return created_count

def update_cart_data():
    """Update cart with realistic data"""
    print("\n🛒 UPDATING CART DATA...")
    
    try:
        admin_user = User.objects.get(username='admin')
        cart, created = Cart.objects.get_or_create(user=admin_user)
        
        if created:
            print("✅ Created cart for admin user")
        
        # Add some items to cart if not already there
        products = Product.objects.all()[:2]  # Get first 2 products
        
        for product in products:
            cart_item, created = CartItem.objects.get_or_create(
                cart=cart,
                product=product,
                defaults={'quantity': 1}
            )
            if created:
                print(f"✅ Added to cart: {product.name}")
            else:
                print(f"⚠️  Already in cart: {product.name}")
                
    except User.DoesNotExist:
        print("❌ Admin user not found")

def print_summary():
    """Print current database status"""
    print("\n📊 DATABASE SUMMARY")
    print("=" * 50)
    print(f"👥 Users: {User.objects.count()}")
    print(f"📦 Products: {Product.objects.count()}")  
    print(f"🛒 Carts: {Cart.objects.count()}")
    print(f"🛍️  Cart Items: {CartItem.objects.count()}")
    
    print("\n📦 PRODUCTS:")
    for product in Product.objects.all():
        print(f"  - {product.name}: ${product.price} [{product.get_category_display()}]")
        
    print("\n👥 USERS:")
    for user in User.objects.all():
        status = "👑 Superuser" if user.is_superuser else "🔧 Staff" if user.is_staff else "👤 Regular"
        print(f"  - {user.username} ({status})")

def main():
    """Main seeding function"""
    print("🚀 MARKETHUB DATA SEEDING")
    print("=" * 50)
    
    # Update existing products
    updated = seed_products()
    
    # Create additional products
    created = create_additional_products()
    
    # Update cart data
    update_cart_data()
    
    # Print summary
    print_summary()
    
    print(f"\n✅ SEEDING COMPLETE!")
    print(f"📝 Updated {updated} existing products")
    print(f"🆕 Created {created} new products")
    print("🎉 Database is ready for use!")

if __name__ == '__main__':
    main()
