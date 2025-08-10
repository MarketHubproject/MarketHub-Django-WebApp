from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
import random
from homepage.models import (
    Category, Product, HeroSlide, Promotion, Review, Favorite
)


class Command(BaseCommand):
    help = 'Setup sample data for MarketHub'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force creation even if data exists',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('🚀 Setting up MarketHub sample data...'))
        
        # Create sample users
        self.create_users()
        
        # Create categories
        self.create_categories()
        
        # Create hero slides
        self.create_hero_slides()
        
        # Create promotions
        self.create_promotions()
        
        # Create sample products
        self.create_products()
        
        # Create reviews and favorites
        self.create_reviews_and_favorites()
        
        self.stdout.write(
            self.style.SUCCESS('✅ MarketHub sample data setup completed!')
        )
        self.stdout.write('🌐 Visit http://127.0.0.1:8000/ to see your marketplace!')
        self.stdout.write('🔐 Admin panel: http://127.0.0.1:8000/admin/')

    def create_users(self):
        """Create sample users"""
        self.stdout.write('👥 Creating sample users...')
        
        users_data = [
            {'username': 'john_seller', 'email': 'john@example.com', 'first_name': 'John', 'last_name': 'Doe'},
            {'username': 'sarah_buyer', 'email': 'sarah@example.com', 'first_name': 'Sarah', 'last_name': 'Smith'},
            {'username': 'mike_trader', 'email': 'mike@example.com', 'first_name': 'Mike', 'last_name': 'Johnson'},
            {'username': 'emma_collector', 'email': 'emma@example.com', 'first_name': 'Emma', 'last_name': 'Wilson'},
            {'username': 'david_tech', 'email': 'david@example.com', 'first_name': 'David', 'last_name': 'Brown'},
        ]
        
        for user_data in users_data:
            user, created = User.objects.get_or_create(
                username=user_data['username'],
                defaults={
                    'email': user_data['email'],
                    'first_name': user_data['first_name'],
                    'last_name': user_data['last_name'],
                }
            )
            if created:
                user.set_password('password123')
                user.save()
                self.stdout.write(f'   ✓ Created user: {user.username}')

    def create_categories(self):
        """Create sample categories"""
        self.stdout.write('📂 Creating categories...')
        
        categories_data = [
            {'name': 'Electronics', 'slug': 'electronics', 'description': 'Phones, laptops, gadgets and more', 'icon_class': 'bi bi-laptop', 'is_featured': True, 'order': 1},
            {'name': 'Fashion & Clothing', 'slug': 'clothing', 'description': 'Stylish clothing and accessories', 'icon_class': 'bi bi-bag-heart', 'is_featured': True, 'order': 2},
            {'name': 'Books & Media', 'slug': 'books', 'description': 'Books, magazines, and educational materials', 'icon_class': 'bi bi-book', 'is_featured': True, 'order': 3},
            {'name': 'Home & Furniture', 'slug': 'furniture', 'description': 'Home decor, furniture and appliances', 'icon_class': 'bi bi-house-heart', 'is_featured': True, 'order': 4},
            {'name': 'Sports & Recreation', 'slug': 'sports', 'description': 'Sports equipment and outdoor gear', 'icon_class': 'bi bi-trophy', 'is_featured': False, 'order': 5},
            {'name': 'Automotive', 'slug': 'automotive', 'description': 'Car parts and accessories', 'icon_class': 'bi bi-car-front', 'is_featured': False, 'order': 6},
        ]
        
        for cat_data in categories_data:
            category, created = Category.objects.get_or_create(
                slug=cat_data['slug'],
                defaults=cat_data
            )
            if created:
                self.stdout.write(f'   ✓ Created category: {category.name}')

    def create_hero_slides(self):
        """Create hero slides"""
        self.stdout.write('🎬 Creating hero slides...')
        
        slides_data = [
            {
                'title': 'Find Amazing Deals on Premium Items',
                'subtitle': 'Discover quality second-hand products at unbeatable prices',
                'cta_text': 'Shop Now',
                'cta_url': '/products/',
                'order': 1
            },
            {
                'title': 'Sell Your Items with Ease',
                'subtitle': 'Join thousands of sellers in Cape Town\'s trusted marketplace',
                'cta_text': 'Start Selling',
                'cta_url': '/products/new/',
                'order': 2
            },
        ]
        
        for slide_data in slides_data:
            slide, created = HeroSlide.objects.get_or_create(
                title=slide_data['title'],
                defaults=slide_data
            )
            if created:
                self.stdout.write(f'   ✓ Created hero slide: {slide.title}')

    def create_promotions(self):
        """Create sample promotions"""
        self.stdout.write('🎯 Creating promotions...')
        
        now = timezone.now()
        promotions_data = [
            {
                'title': 'Electronics Week Special',
                'text': 'Up to 50% off on all electronic items this week only!',
                'link': '/products/?category=electronics',
                'valid_from': now,
                'valid_to': now + timedelta(days=7),
                'order': 1
            },
            {
                'title': 'Fashion Flash Sale',
                'text': 'Designer clothing at incredible prices - limited time offer',
                'link': '/products/?category=clothing',
                'valid_from': now,
                'valid_to': now + timedelta(days=3),
                'order': 2
            },
        ]
        
        for promo_data in promotions_data:
            promotion, created = Promotion.objects.get_or_create(
                title=promo_data['title'],
                defaults=promo_data
            )
            if created:
                self.stdout.write(f'   ✓ Created promotion: {promotion.title}')

    def create_products(self):
        """Create sample products"""
        self.stdout.write('📦 Creating sample products...')
        
        users = list(User.objects.all())
        categories = ['electronics', 'clothing', 'books', 'furniture', 'other']
        locations = [
            'cape_town_central', 'cape_town_northern_suburbs', 
            'cape_town_southern_suburbs', 'cape_town_western_suburbs'
        ]
        conditions = ['excellent', 'very_good', 'good', 'fair']
        
        products_data = [
            # Electronics
            {'name': 'iPhone 12 Pro Max 256GB', 'category': 'electronics', 'price': 12500, 'original_price': 18000, 'description': 'Excellent condition iPhone 12 Pro Max in Pacific Blue. All accessories included, minimal usage signs. Battery health at 95%.'},
            {'name': 'MacBook Air M1 2021', 'category': 'electronics', 'price': 15000, 'original_price': 22000, 'description': 'Like-new MacBook Air with M1 chip, 8GB RAM, 256GB SSD. Perfect for students and professionals. Includes original charger and box.'},
            {'name': 'Samsung 55" 4K Smart TV', 'category': 'electronics', 'price': 8500, 'original_price': 14000, 'description': 'Barely used Samsung 55-inch 4K UHD Smart TV. Exceptional picture quality with HDR support. Wall mount included.'},
            {'name': 'Sony PlayStation 5 Console', 'category': 'electronics', 'price': 9500, 'original_price': 12000, 'description': 'PS5 console in excellent condition with controller and cables. Includes 3 popular games. Smoke-free home.'},
            {'name': 'iPad Pro 11" 2022', 'category': 'electronics', 'price': 11000, 'original_price': 16000, 'description': 'iPad Pro with M2 chip, 128GB, Space Gray. Perfect for digital art and productivity. Apple Pencil compatible.'},
            
            # Fashion & Clothing  
            {'name': 'Designer Leather Jacket', 'category': 'clothing', 'price': 1200, 'original_price': 2500, 'description': 'Authentic leather jacket from premium brand. Size M, barely worn, perfect condition. Timeless classic style.'},
            {'name': 'Nike Air Jordan Collection', 'category': 'clothing', 'price': 2800, 'original_price': 4500, 'description': 'Rare Nike Air Jordan sneakers, size 9. Collector\'s item in excellent condition with original box.'},
            {'name': 'Vintage Rolex Watch', 'category': 'clothing', 'price': 15000, 'original_price': 25000, 'description': 'Authentic vintage Rolex Submariner from the 90s. Serviced recently, keeps perfect time. Includes papers.'},
            {'name': 'Designer Handbag Collection', 'category': 'clothing', 'price': 3500, 'original_price': 6000, 'description': 'Luxury handbag from premium European designer. Genuine leather, barely used, includes dust bag.'},
            
            # Books & Media
            {'name': 'Complete Harry Potter Series', 'category': 'books', 'price': 450, 'original_price': 800, 'description': 'Complete set of Harry Potter books in excellent condition. Hardcover first editions, perfect for collectors.'},
            {'name': 'University Textbook Bundle', 'category': 'books', 'price': 1200, 'original_price': 2400, 'description': 'Engineering textbooks for first and second year. Excellent condition, minimal highlighting. Save thousands!'},
            {'name': 'Vinyl Record Collection', 'category': 'books', 'price': 2200, 'original_price': 3500, 'description': 'Rare vinyl collection including classic rock and jazz albums. Over 50 records in mint condition.'},
            
            # Furniture & Home
            {'name': 'Scandinavian Dining Set', 'category': 'furniture', 'price': 4500, 'original_price': 8000, 'description': 'Beautiful solid wood dining table with 6 chairs. Modern Scandinavian design, seats 6 comfortably.'},
            {'name': 'Luxury Leather Sofa', 'category': 'furniture', 'price': 6500, 'original_price': 12000, 'description': 'Premium 3-seater leather sofa in cognac brown. Excellent condition, very comfortable, from smoke-free home.'},
            {'name': 'Modern Office Desk Setup', 'category': 'furniture', 'price': 2800, 'original_price': 5000, 'description': 'Complete office setup with desk, ergonomic chair, and filing cabinet. Perfect for home office.'},
            
            # Sports & Other
            {'name': 'Mountain Bike - Trek 2021', 'category': 'other', 'price': 8500, 'original_price': 15000, 'description': 'High-end mountain bike, excellent condition. Full suspension, 21 speeds, includes helmet and accessories.'},
            {'name': 'Guitar & Amplifier Set', 'category': 'other', 'price': 3200, 'original_price': 6000, 'description': 'Electric guitar with amplifier and effects pedals. Perfect for beginners or professionals. Sounds amazing!'},
            {'name': 'Gym Equipment Bundle', 'category': 'other', 'price': 5500, 'original_price': 9000, 'description': 'Complete home gym setup with weights, bench, and accessories. Professional quality equipment.'},
        ]
        
        for i, product_data in enumerate(products_data):
            # Assign random seller
            seller = random.choice(users)
            
            product = Product.objects.create(
                name=product_data['name'],
                description=product_data['description'],
                price=Decimal(str(product_data['price'])),
                original_price=Decimal(str(product_data['original_price'])) if product_data.get('original_price') else None,
                category=product_data['category'],
                condition=random.choice(conditions),
                location=random.choice(locations),
                seller=seller,
                is_featured=i < 6,  # First 6 products are featured
                views_count=random.randint(10, 500)
            )
            
            self.stdout.write(f'   ✓ Created product: {product.name}')

    def create_reviews_and_favorites(self):
        """Create sample reviews and favorites"""
        self.stdout.write('⭐ Creating reviews and favorites...')
        
        users = list(User.objects.all())
        products = list(Product.objects.all())
        
        # Create reviews
        review_comments = [
            "Excellent product, exactly as described!",
            "Great quality for the price. Highly recommended.",
            "Fast delivery and item in perfect condition.",
            "Good value for money. Seller was very helpful.",
            "Amazing find! Better than expected quality.",
            "Product works perfectly. Great communication with seller.",
            "Fair price for the condition. Would buy again.",
        ]
        
        for product in products[:12]:  # Add reviews to first 12 products
            # Add 1-3 reviews per product
            num_reviews = random.randint(1, 3)
            reviewers = random.sample(users, min(num_reviews, len(users)))
            
            for reviewer in reviewers:
                if reviewer != product.seller:  # Don't let sellers review their own products
                    Review.objects.create(
                        product=product,
                        user=reviewer,
                        rating=random.randint(3, 5),  # Good ratings mostly
                        title=f"Great {product.category.title()}!",
                        comment=random.choice(review_comments),
                        is_approved=True
                    )
        
        # Create favorites
        for user in users[:4]:  # First 4 users have favorites
            # Each user favorites 2-5 products
            num_favorites = random.randint(2, 5)
            favorite_products = random.sample(products, min(num_favorites, len(products)))
            
            for product in favorite_products:
                if product.seller != user:  # Don't favorite own products
                    Favorite.objects.get_or_create(user=user, product=product)
        
        self.stdout.write('   ✓ Created reviews and favorites')

    def style_message(self, message, style_func):
        """Helper to style console messages"""
        return style_func(message)
