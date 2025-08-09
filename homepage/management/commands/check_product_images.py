"""
Django management command to check that all product image files exist on disk.

Usage:
    python manage.py check_product_images
    python manage.py check_product_images --verbose
    python manage.py check_product_images --fix-missing
"""

from pathlib import Path
from django.core.management.base import BaseCommand
from django.conf import settings
from homepage.models import Product


class Command(BaseCommand):
    help = 'Check that all product image files exist on disk and report any missing files'

    def add_arguments(self, parser):
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed output for each product checked'
        )
        parser.add_argument(
            '--fix-missing',
            action='store_true',
            help='Set image field to null for products with missing image files'
        )

    def handle(self, *args, **options):
        verbose = options['verbose']
        fix_missing = options['fix_missing']

        # Get all products with images
        products_with_images = Product.objects.exclude(image__isnull=True).exclude(image='')
        total_products = products_with_images.count()

        if total_products == 0:
            self.stdout.write(
                self.style.WARNING('No products with images found in the database.')
            )
            return

        self.stdout.write(
            self.style.SUCCESS(f'Checking {total_products} products with images...')
        )

        missing_files = []
        checked_count = 0

        for product in products_with_images:
            checked_count += 1

            # Build the full path to the image file
            if product.image and product.image.name:
                image_path = Path(settings.MEDIA_ROOT) / product.image.name

                if verbose:
                    self.stdout.write(f'Checking product #{product.id}: {product.name}')
                    self.stdout.write(f'  Image path: {product.image.name}')
                    self.stdout.write(f'  Full path: {image_path}')

                # Check if file exists
                if not image_path.exists():
                    missing_info = {
                        'product': product,
                        'image_path': product.image.name,
                        'full_path': str(image_path)
                    }
                    missing_files.append(missing_info)

                    if verbose:
                        self.stdout.write(
                            self.style.ERROR(f'  ❌ Missing: {image_path}')
                        )

                    # Fix missing files if requested
                    if fix_missing:
                        product.image = None
                        product.save()
                        self.stdout.write(
                            self.style.WARNING(f'  🔧 Fixed: Set image to null for product #{product.id}')
                        )
                else:
                    if verbose:
                        self.stdout.write(
                            self.style.SUCCESS(f'  ✅ Found: {image_path}')
                        )

        # Summary report
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write('SUMMARY REPORT')
        self.stdout.write('=' * 60)

        self.stdout.write(f'Total products checked: {checked_count}')
        self.stdout.write(f'Missing image files: {len(missing_files)}')
        self.stdout.write(f'Valid image files: {checked_count - len(missing_files)}')

        if missing_files:
            self.stdout.write('\nMISSING FILES:')
            self.stdout.write('-' * 40)
            for missing in missing_files:
                product = missing['product']
                self.stdout.write(
                    self.style.ERROR(
                        f'Product #{product.id}: "{product.name}" - {missing["image_path"]}'
                    )
                )

            if not fix_missing:
                self.stdout.write(
                    '\n💡 TIP: Use --fix-missing to automatically set image fields to null for missing files')
            else:
                self.stdout.write(
                    self.style.SUCCESS(f'\n✅ Fixed {len(missing_files)} products by setting image to null')
                )
        else:
            self.stdout.write(
                self.style.SUCCESS('\n🎉 All product images found! No missing files detected.')
            )

        # Additional statistics
        self.stdout.write(f'\nMEDIA_ROOT: {settings.MEDIA_ROOT}')

        # Check if MEDIA_ROOT directory exists
        media_root_path = Path(settings.MEDIA_ROOT)
        if media_root_path.exists():
            self.stdout.write(self.style.SUCCESS('✅ MEDIA_ROOT directory exists'))
        else:
            self.stdout.write(self.style.ERROR('❌ MEDIA_ROOT directory does not exist!'))
