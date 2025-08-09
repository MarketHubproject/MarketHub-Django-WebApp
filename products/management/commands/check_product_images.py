from django.core.management.base import BaseCommand
from django.conf import settings
from pathlib import Path
from products.models import Product


class Command(BaseCommand):
    help = 'Check for missing product image files and report any mismatches between database records and filesystem'

    def add_arguments(self, parser):
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed information for each product checked',
        )
        parser.add_argument(
            '--fix-missing',
            action='store_true',
            help='Remove image references for products where files are missing',
        )

    def handle(self, *args, **options):
        verbose = options['verbose']
        fix_missing = options['fix_missing']

        self.stdout.write(
            self.style.SUCCESS('Checking product images for file system mismatches...')
        )

        products_with_images = Product.objects.filter(image__isnull=False).exclude(image='')
        total_products = products_with_images.count()

        if total_products == 0:
            self.stdout.write(
                self.style.WARNING('No products with images found in database.')
            )
            return

        missing_files = []
        existing_files = 0

        self.stdout.write(f'Checking {total_products} products with image references...')

        for product in products_with_images:
            image_path = Path(settings.MEDIA_ROOT, product.image.name)

            if verbose:
                self.stdout.write(f'Checking product "{product.name}" (ID: {product.id})')
                self.stdout.write(f'  Expected path: {image_path}')

            try:
                # Assert that the file exists
                assert image_path.exists(), f'Image file missing: {image_path}'
                existing_files += 1

                if verbose:
                    self.stdout.write(
                        self.style.SUCCESS(f'  ✓ File exists')
                    )

            except AssertionError as e:
                missing_files.append({
                    'product': product,
                    'path': image_path,
                    'error': str(e)
                })

                if verbose:
                    self.stdout.write(
                        self.style.ERROR(f'  ✗ File missing: {image_path}')
                    )

        # Report results
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write(f'RESULTS:')
        self.stdout.write(f'  Total products checked: {total_products}')
        self.stdout.write(
            self.style.SUCCESS(f'  Files found: {existing_files}')
        )
        self.stdout.write(
            self.style.ERROR(f'  Missing files: {len(missing_files)}')
        )

        if missing_files:
            self.stdout.write('\n' + self.style.ERROR('MISSING FILES:'))
            for item in missing_files:
                product = item['product']
                path = item['path']
                self.stdout.write(
                    f'  • Product: "{product.name}" (ID: {product.id})'
                )
                self.stdout.write(f'    Path: {path}')
                self.stdout.write(f'    Image field: {product.image.name}')
                self.stdout.write('')

            if fix_missing:
                self.stdout.write(
                    self.style.WARNING('Fixing missing image references...')
                )
                fixed_count = 0
                for item in missing_files:
                    product = item['product']
                    product.image = None
                    product.save()
                    fixed_count += 1
                    self.stdout.write(
                        f'  ✓ Cleared image reference for product "{product.name}"'
                    )

                self.stdout.write(
                    self.style.SUCCESS(f'Fixed {fixed_count} products with missing images.')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(
                        'To automatically clear these invalid image references, '
                        'run this command with --fix-missing'
                    )
                )
        else:
            self.stdout.write(
                self.style.SUCCESS('\n✓ All product images are properly stored on filesystem!')
            )

        # Raise assertion error if any files are missing (for automated testing/CI)
        if missing_files:
            self.stdout.write('')
            raise AssertionError(
                f'Found {len(missing_files)} products with missing image files. '
                'This indicates a mismatch between database records and filesystem.'
            )
