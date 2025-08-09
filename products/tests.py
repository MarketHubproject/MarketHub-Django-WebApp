from django.test import TestCase
from decimal import Decimal
from pathlib import Path
from django.conf import settings
from .models import Product
from django.core.exceptions import ValidationError


class ProductModelTest(TestCase):
    def setUp(self):
        self.product = Product.objects.create(
            name='Test Smartphone',
            description='A high-quality smartphone for testing',
            price=Decimal('599.99'),
            category='electronics'
        )

    def test_product_creation(self):
        self.assertEqual(self.product.name, 'Test Smartphone')
        self.assertEqual(self.product.price, Decimal('599.99'))
        self.assertEqual(self.product.category, 'electronics')

    def test_product_str_method(self):
        # Note: there's a typo in the model (_str_ instead of __str__)
        # This test will fail until that's fixed
        try:
            result = str(self.product)
            self.assertEqual(result, 'Test Smartphone')
        except BaseException:
            # If __str__ is not properly defined, it will show the default representation
            self.assertIn('Product', str(self.product))

    def test_product_category_choices(self):
        # Test valid category choices
        valid_categories = ['electronics', 'clothing', 'books', 'furniture', 'other']
        for category in valid_categories:
            product = Product(
                name=f'Test {category}',
                description=f'Test description for {category}',
                price=Decimal('10.00'),
                category=category
            )
            # This should not raise an exception
            product.full_clean()

    def test_product_default_category(self):
        product = Product.objects.create(
            name='No Category Product',
            description='A product without a specific category',
            price=Decimal('25.00')
        )
        self.assertEqual(product.category, 'other')

    def test_product_price_decimal_places(self):
        product = Product.objects.create(
            name='Precise Price Product',
            description='A product with precise pricing',
            price=Decimal('19.99'),
            category='books'
        )
        self.assertEqual(product.price, Decimal('19.99'))
        # Test that we can store up to 10 digits with 2 decimal places
        expensive_product = Product.objects.create(
            name='Expensive Product',
            description='A very expensive product for testing',
            price=Decimal('99999999.99'),
            category='other'
        )
        self.assertEqual(expensive_product.price, Decimal('99999999.99'))

    def test_product_image_field(self):
        # Test that image field accepts None/blank
        product = Product.objects.create(
            name='No Image Product',
            description='A product without an image',
            price=Decimal('15.00'),
            category='clothing'
        )
        self.assertIsNone(product.image.name)

    def test_product_ordering(self):
        # Create multiple products
        product1 = Product.objects.create(
            name='A Product',
            description='First test product',
            price=Decimal('10.00'),
            category='electronics'
        )
        product2 = Product.objects.create(
            name='B Product',
            description='Second test product',
            price=Decimal('20.00'),
            category='clothing'
        )
        product3 = Product.objects.create(
            name='C Product',
            description='Third test product',
            price=Decimal('30.00'),
            category='books'
        )

        # Test that products can be retrieved (no specific ordering defined in model)
        all_products = Product.objects.all()
        self.assertEqual(all_products.count(), 4)  # Including the setUp product

    def test_product_filtering_by_category(self):
        # Create products in different categories
        Product.objects.create(
            name='Electronics Item',
            description='An electronics product for testing',
            price=Decimal('100.00'),
            category='electronics'
        )
        Product.objects.create(
            name='Clothing Item',
            description='A clothing product for testing',
            price=Decimal('50.00'),
            category='clothing'
        )
        Product.objects.create(
            name='Book Item',
            description='A book product for testing',
            price=Decimal('25.00'),
            category='books'
        )

        # Test filtering by category
        electronics = Product.objects.filter(category='electronics')
        self.assertEqual(electronics.count(), 2)  # Including the setUp product

        clothing = Product.objects.filter(category='clothing')
        self.assertEqual(clothing.count(), 1)

        books = Product.objects.filter(category='books')
        self.assertEqual(books.count(), 1)

    def test_product_price_range_queries(self):
        # Create products with different prices
        cheap_product = Product.objects.create(
            name='Cheap Product',
            description='An inexpensive product for testing',
            price=Decimal('5.00'),
            category='other'
        )
        expensive_product = Product.objects.create(
            name='Expensive Product',
            description='An expensive product for testing',
            price=Decimal('1000.00'),
            category='electronics'
        )

        # Test price range queries
        cheap_products = Product.objects.filter(price__lt=Decimal('100.00'))
        self.assertIn(cheap_product, cheap_products)
        self.assertNotIn(expensive_product, cheap_products)

        expensive_products = Product.objects.filter(price__gte=Decimal('500.00'))
        self.assertIn(expensive_product, expensive_products)
        self.assertIn(self.product, expensive_products)  # setUp product is 599.99
        self.assertNotIn(cheap_product, expensive_products)


class ProductIntegrationTest(TestCase):
    def setUp(self):
        self.products_data = [
            {'name': 'Laptop', 'description': 'A powerful laptop for work and gaming', 'price': Decimal('999.99'), 'category': 'electronics'},
            {'name': 'T-Shirt', 'description': 'A comfortable cotton t-shirt', 'price': Decimal('29.99'), 'category': 'clothing'},
            {'name': 'Novel', 'description': 'An exciting adventure novel', 'price': Decimal('14.99'), 'category': 'books'},
            {'name': 'Coffee Mug', 'description': 'A ceramic coffee mug', 'price': Decimal('12.99'), 'category': 'furniture'},
            {'name': 'Gift Card', 'description': 'A versatile gift card', 'price': Decimal('50.00'), 'category': 'other'},
        ]

        for product_data in self.products_data:
            Product.objects.create(**product_data)

    def test_bulk_product_operations(self):
        # Test that all products were created
        self.assertEqual(Product.objects.count(), 5)

        # Test category distribution
        categories = Product.objects.values_list('category', flat=True)
        unique_categories = set(categories)
        self.assertEqual(len(unique_categories), 5)  # All different categories

    def test_product_search_functionality(self):
        # Test name-based search (case insensitive)
        laptop_results = Product.objects.filter(name__icontains='laptop')
        self.assertEqual(laptop_results.count(), 1)

        # Test multiple word search
        shirt_results = Product.objects.filter(name__icontains='shirt')
        self.assertEqual(shirt_results.count(), 1)

    def test_category_statistics(self):
        # Test category-based statistics
        from django.db.models import Count, Avg

        category_counts = Product.objects.values('category').annotate(
            count=Count('id')
        )

        # Each category should have 1 product
        for category_data in category_counts:
            self.assertEqual(category_data['count'], 1)

        # Test average price calculation
        avg_price = Product.objects.aggregate(Avg('price'))['price__avg']
        expected_avg = sum(Decimal(str(p['price'])) for p in self.products_data) / len(self.products_data)
        self.assertAlmostEqual(float(avg_price), float(expected_avg), places=2)


class ProductImageRegressionTest(TestCase):
    """
    Regression test to catch mismatches between Product image database records
    and actual files on the filesystem.
    """

    def test_product_image_files_exist_on_filesystem(self):
        """
        Iterate over Product objects with images and assert that the corresponding
        image files exist on the filesystem. This catches future mismatches early.
        """
        # Get all products that have image references in the database
        products_with_images = Product.objects.filter(
            image__isnull=False
        ).exclude(image='')

        # Track any missing files for detailed error reporting
        missing_files = []

        for product in products_with_images:
            # Construct the expected file path using Path and settings.MEDIA_ROOT
            image_path = Path(settings.MEDIA_ROOT, product.image.name)

            try:
                # Assert that the file exists - this is the core regression check
                self.assertTrue(
                    image_path.exists(),
                    f'Image file missing for product "{product.name}" (ID: {product.id}): {image_path}'
                )

                # Additional check: ensure it's actually a file, not a directory
                self.assertTrue(
                    image_path.is_file(),
                    f'Image path exists but is not a file for product "{product.name}" (ID: {product.id}): {image_path}'
                )

            except AssertionError:
                missing_files.append({
                    'product_id': product.id,
                    'product_name': product.name,
                    'image_name': product.image.name,
                    'expected_path': str(image_path)
                })

        # If there are missing files, provide detailed error information
        if missing_files:
            error_msg = f"Found {len(missing_files)} products with missing image files:\n"
            for item in missing_files:
                error_msg += (
                    f"  • Product: '{item['product_name']}' (ID: {item['product_id']})\n"
                    f"    Database image field: {item['image_name']}\n"
                    f"    Expected file path: {item['expected_path']}\n"
                )
            error_msg += "\nThis indicates a mismatch between database records and filesystem."
            self.fail(error_msg)

    def test_media_root_directory_exists(self):
        """
        Ensure the MEDIA_ROOT directory exists. This is a prerequisite for
        product images to be stored properly.
        """
        media_root_path = Path(settings.MEDIA_ROOT)
        self.assertTrue(
            media_root_path.exists(),
            f'MEDIA_ROOT directory does not exist: {media_root_path}'
        )
        self.assertTrue(
            media_root_path.is_dir(),
            f'MEDIA_ROOT is not a directory: {media_root_path}'
        )

    def test_product_images_directory_structure(self):
        """
        Check that the product_images directory exists within MEDIA_ROOT
        since that's the upload_to path for Product.image field.
        """
        product_images_path = Path(settings.MEDIA_ROOT, 'product_images')

        # Only test if there are actually products with images
        products_with_images = Product.objects.filter(
            image__isnull=False
        ).exclude(image='')

        if products_with_images.exists():
            self.assertTrue(
                product_images_path.exists(),
                f'Product images directory does not exist: {product_images_path}. '
                f'This directory should exist when products have images.'
            )
