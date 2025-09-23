from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from homepage.models import Category, Product, ProductImage
from django.utils.text import slugify


class Command(BaseCommand):
    help = 'Set up the store with initial data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--create-superuser',
            action='store_true',
            help='Create a superuser account',
        )
        parser.add_argument(
            '--add-sample-data',
            action='store_true', 
            help='Add sample categories and products',
        )

    def handle(self, *args, **options):
        if options['create_superuser']:
            self.create_superuser()
        
        if options['add_sample_data']:
            self.add_sample_data()

    def create_superuser(self):
        """Create a superuser if one doesn't exist"""
        if not User.objects.filter(is_superuser=True).exists():
            User.objects.create_superuser(
                username='admin',
                email='admin@markethub.com',
                password='markethub123'
            )
            self.stdout.write(
                self.style.SUCCESS('Superuser created: admin/markethub123')
            )
        else:
            self.stdout.write(
                self.style.WARNING('Superuser already exists')
            )

    def add_sample_data(self):
        """Add sample categories and products"""
        self.stdout.write('Adding sample categories...')
        
        # Create categories
        categories_data = [
            {
                'name': 'Electronics',
                'slug': 'electronics',
                'description': 'Latest gadgets and electronic devices'
            },
            {
                'name': 'Clothing',
                'slug': 'clothing',
                'description': 'Fashion and apparel for all occasions'
            },
            {
                'name': 'Home & Garden',
                'slug': 'home-garden',
                'description': 'Everything for your home and garden'
            },
            {
                'name': 'Sports & Outdoors',
                'slug': 'sports-outdoors',
                'description': 'Gear for active lifestyles'
            },
            {
                'name': 'Books & Media',
                'slug': 'books-media',
                'description': 'Books, movies, music and more'
            },
            {
                'name': 'Health & Beauty',
                'slug': 'health-beauty',
                'description': 'Personal care and wellness products'
            }
        ]
        
        for cat_data in categories_data:
            category, created = Category.objects.get_or_create(
                slug=cat_data['slug'],
                defaults={
                    'name': cat_data['name'],
                    'description': cat_data['description']
                }
            )
            if created:
                self.stdout.write(f'Created category: {category.name}')

        self.stdout.write('Adding sample products...')
        
        # Get some categories for products
        electronics = Category.objects.get(slug='electronics')
        clothing = Category.objects.get(slug='clothing')
        home_garden = Category.objects.get(slug='home-garden')
        
        # Create sample products
        products_data = [
            {
                'name': 'Wireless Bluetooth Headphones',
                'slug': 'wireless-bluetooth-headphones',
                'description': 'Premium quality wireless headphones with noise cancellation and long battery life. Perfect for music lovers and professionals.',
                'short_description': 'Premium wireless headphones with noise cancellation',
                'price': 89.99,
                'compare_at_price': 129.99,
                'sku': 'WBH001',
                'stock_quantity': 50,
                'category': electronics,
                'status': 'active',
                'featured': True
            },
            {
                'name': 'Smart Fitness Watch', 
                'slug': 'smart-fitness-watch',
                'description': 'Track your health and fitness with this advanced smartwatch. Features heart rate monitoring, GPS, and smartphone connectivity.',
                'short_description': 'Advanced fitness tracking smartwatch',
                'price': 199.99,
                'compare_at_price': 249.99,
                'sku': 'SFW002',
                'stock_quantity': 30,
                'category': electronics,
                'status': 'active',
                'featured': True
            },
            {
                'name': 'Comfortable Cotton T-Shirt',
                'slug': 'comfortable-cotton-tshirt',
                'description': '100% premium cotton t-shirt available in multiple colors. Soft, comfortable, and perfect for everyday wear.',
                'short_description': 'Premium 100% cotton t-shirt',
                'price': 24.99,
                'sku': 'CCT003',
                'stock_quantity': 100,
                'category': clothing,
                'status': 'active',
                'featured': True
            },
            {
                'name': 'Organic Coffee Beans',
                'slug': 'organic-coffee-beans',
                'description': 'Freshly roasted organic coffee beans sourced from sustainable farms. Rich flavor and aromatic blend.',
                'short_description': 'Fresh organic coffee beans',
                'price': 18.99,
                'compare_at_price': 24.99,
                'sku': 'OCB004',
                'stock_quantity': 75,
                'category': home_garden,
                'status': 'active',
                'featured': True
            },
            {
                'name': 'Portable Phone Charger',
                'slug': 'portable-phone-charger',
                'description': 'High-capacity portable battery pack with fast charging. Keep your devices powered on the go.',
                'short_description': 'High-capacity portable battery pack',
                'price': 34.99,
                'sku': 'PPC005',
                'stock_quantity': 60,
                'category': electronics,
                'status': 'active'
            },
            {
                'name': 'Yoga Mat Premium',
                'slug': 'yoga-mat-premium',
                'description': 'Extra-thick premium yoga mat with excellent grip and cushioning. Perfect for yoga, pilates, and fitness.',
                'short_description': 'Premium extra-thick yoga mat',
                'price': 39.99,
                'sku': 'YMP006',
                'stock_quantity': 40,
                'category': home_garden,
                'status': 'active'
            },
            {
                'name': 'Stainless Steel Water Bottle',
                'slug': 'stainless-steel-water-bottle',
                'description': 'Insulated stainless steel water bottle keeps drinks cold for 24 hours or hot for 12 hours.',
                'short_description': 'Insulated stainless steel bottle',
                'price': 28.99,
                'sku': 'SSWB007',
                'stock_quantity': 80,
                'category': home_garden,
                'status': 'active'
            },
            {
                'name': 'Denim Jacket Classic',
                'slug': 'denim-jacket-classic',
                'description': 'Timeless denim jacket made from high-quality denim. A versatile piece for any wardrobe.',
                'short_description': 'Classic high-quality denim jacket',
                'price': 79.99,
                'compare_at_price': 99.99,
                'sku': 'DJC008',
                'stock_quantity': 25,
                'category': clothing,
                'status': 'active'
            }
        ]
        
        for product_data in products_data:
            product, created = Product.objects.get_or_create(
                slug=product_data['slug'],
                defaults=product_data
            )
            if created:
                self.stdout.write(f'Created product: {product.name}')

        self.stdout.write(
            self.style.SUCCESS('Sample data added successfully!')
        )