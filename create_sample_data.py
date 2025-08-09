#!/usr/bin/env python
"""
Script to create sample data for MarketHub Django application
"""
from homepage.models import Category, HeroSlide, Promotion, Product, Cart, CartItem
from django.contrib.auth.models import User
import os
import django
from datetime import datetime, timedelta
from decimal import Decimal

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'markethub.settings')
django.setup()


def create_sample_data():
    print("Creating sample data...")

    # Create sample categories
    categories_data = [
        {
            'name': 'Electronics',
            'slug': 'electronics',
            'description': 'Latest electronic devices and gadgets',
            'icon_class': 'fas fa-laptop',
            'is_featured': True,
            'order': 1
        },
        {
            'name': 'Fashion',
            'slug': 'fashion',
            'description': 'Trendy clothing and accessories',
            'icon_class': 'fas fa-tshirt',
            'is_featured': True,
            'order': 2
        },
        {
            'name': 'Books',
            'slug': 'books',
            'description': 'Books, e-books, and educational materials',
            'icon_class': 'fas fa-book',
            'is_featured': True,
            'order': 3
        },
        {
            'name': 'Home & Kitchen',
            'slug': 'home-kitchen',
            'description': 'Home appliances and kitchen essentials',
            'icon_class': 'fas fa-home',
            'is_featured': True,
            'order': 4
        },
        {
            'name': 'Sports',
            'slug': 'sports',
            'description': 'Sports equipment and fitness gear',
            'icon_class': 'fas fa-dumbbell',
            'is_featured': False,
            'order': 5
        }
    ]

    for cat_data in categories_data:
        category, created = Category.objects.get_or_create(
            slug=cat_data['slug'],
            defaults=cat_data
        )
        if created:
            print(f"Created category: {category.name}")

    # Create sample hero slides
    hero_slides_data = [
        {
            'title': 'Summer Sale - Up to 70% Off',
            'subtitle': 'Amazing deals on electronics, fashion, and more!',
            'cta_text': 'Shop Now',
            'cta_url': 'https://example.com/summer-sale',
            'is_active': True,
            'order': 1
        },
        {
            'title': 'New Arrivals in Fashion',
            'subtitle': 'Discover the latest trends and styles',
            'cta_text': 'Explore Collection',
            'cta_url': 'https://example.com/new-fashion',
            'is_active': True,
            'order': 2
        },
        {
            'title': 'Tech Innovation Week',
            'subtitle': 'Latest gadgets and cutting-edge technology',
            'cta_text': 'Browse Tech',
            'cta_url': 'https://example.com/tech-week',
            'is_active': False,
            'order': 3
        }
    ]

    for slide_data in hero_slides_data:
        slide, created = HeroSlide.objects.get_or_create(
            title=slide_data['title'],
            defaults=slide_data
        )
        if created:
            print(f"Created hero slide: {slide.title}")

    # Create sample promotions
    now = datetime.now()
    promotions_data = [
        {
            'title': 'Black Friday Mega Sale',
            'text': 'Unbeatable prices on everything! Limited time offer.',
            'link': 'https://example.com/black-friday',
            'valid_from': now - timedelta(days=1),
            'valid_to': now + timedelta(days=30),
            'is_active': True,
            'order': 1
        },
        {
            'title': 'Free Shipping Weekend',
            'text': 'Free shipping on all orders above $50',
            'link': 'https://example.com/free-shipping',
            'valid_from': now,
            'valid_to': now + timedelta(days=7),
            'is_active': True,
            'order': 2
        }
    ]

    for promo_data in promotions_data:
        promotion, created = Promotion.objects.get_or_create(
            title=promo_data['title'],
            defaults=promo_data
        )
        if created:
            print(f"Created promotion: {promotion.title}")

    # Create sample products
    products_data = [
        {
            'name': 'MacBook Pro 16"',
            'description': 'Powerful laptop for professionals with M2 Pro chip',
            'price': Decimal('2499.99'),
            'category': 'electronics'
        },
        {
            'name': 'iPhone 15 Pro',
            'description': 'Latest iPhone with A17 Pro chip and titanium design',
            'price': Decimal('999.99'),
            'category': 'electronics'
        },
        {
            'name': 'Samsung 65" 4K TV',
            'description': 'Ultra HD Smart TV with HDR and streaming apps',
            'price': Decimal('799.99'),
            'category': 'electronics'
        },
        {
            'name': 'Nike Air Max Sneakers',
            'description': 'Comfortable running shoes with Air Max technology',
            'price': Decimal('129.99'),
            'category': 'fashion'
        },
        {
            'name': 'Levi\'s 501 Jeans',
            'description': 'Classic straight-fit jeans in premium denim',
            'price': Decimal('79.99'),
            'category': 'fashion'
        },
        {
            'name': 'The Great Gatsby',
            'description': 'Classic American novel by F. Scott Fitzgerald',
            'price': Decimal('12.99'),
            'category': 'books'
        },
        {
            'name': 'Python Programming Guide',
            'description': 'Complete guide to Python programming for beginners',
            'price': Decimal('39.99'),
            'category': 'books'
        },
        {
            'name': 'KitchenAid Stand Mixer',
            'description': 'Professional 5-quart stand mixer for baking',
            'price': Decimal('349.99'),
            'category': 'home'
        },
        {
            'name': 'Dyson V15 Vacuum',
            'description': 'Cordless vacuum with laser dust detection',
            'price': Decimal('749.99'),
            'category': 'home'
        },
        {
            'name': 'Yoga Mat Premium',
            'description': 'Non-slip yoga mat with extra cushioning',
            'price': Decimal('49.99'),
            'category': 'other'
        }
    ]

    for prod_data in products_data:
        product, created = Product.objects.get_or_create(
            name=prod_data['name'],
            defaults=prod_data
        )
        if created:
            print(f"Created product: {product.name}")

    # Create sample users
    users_data = [
        {
            'username': 'john_doe',
            'email': 'john@example.com',
            'first_name': 'John',
            'last_name': 'Doe',
            'password': 'samplepass123'
        },
        {
            'username': 'jane_smith',
            'email': 'jane@example.com',
            'first_name': 'Jane',
            'last_name': 'Smith',
            'password': 'samplepass123'
        },
        {
            'username': 'admin',
            'email': 'admin@markethub.com',
            'first_name': 'Admin',
            'last_name': 'User',
            'password': 'adminpass123',
            'is_staff': True,
            'is_superuser': True
        }
    ]

    for user_data in users_data:
        is_staff = user_data.pop('is_staff', False)
        is_superuser = user_data.pop('is_superuser', False)

        if is_superuser:
            user, created = User.objects.get_or_create(
                username=user_data['username'],
                defaults=user_data
            )
            if created:
                user.set_password(user_data['password'])
                user.is_staff = is_staff
                user.is_superuser = is_superuser
                user.save()
                print(f"Created superuser: {user.username}")
        else:
            user, created = User.objects.get_or_create(
                username=user_data['username'],
                defaults=user_data
            )
            if created:
                user.set_password(user_data['password'])
                user.save()
                print(f"Created user: {user.username}")

    # Create sample cart for a user
    john_user = User.objects.get(username='john_doe')
    cart, created = Cart.objects.get_or_create(user=john_user)

    if created:
        # Add some items to the cart
        iphone = Product.objects.get(name='iPhone 15 Pro')
        sneakers = Product.objects.get(name='Nike Air Max Sneakers')

        CartItem.objects.get_or_create(
            cart=cart,
            product=iphone,
            defaults={'quantity': 1}
        )
        CartItem.objects.get_or_create(
            cart=cart,
            product=sneakers,
            defaults={'quantity': 2}
        )
        print(f"Created cart with items for user: {john_user.username}")

    print("Sample data creation completed!")


if __name__ == '__main__':
    create_sample_data()
