from django.core.management.base import BaseCommand
from django.db import transaction
from homepage.models import Product as HomepageProduct
from products.models import Product as ProductsProduct, ProductImage
import os
from django.conf import settings


class Command(BaseCommand):
    help = 'Synchronize existing product image records from products/ to product_images/ paths'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes',
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed output',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        verbose = options['verbose']

        self.stdout.write(self.style.SUCCESS('=== Product Image Path Synchronization ==='))

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))

        # Track changes
        total_updates = 0

        with transaction.atomic():
            # Check Homepage Product model
            homepage_products_to_update = []
            for product in HomepageProduct.objects.all():
                if product.image and product.image.name.startswith('products/'):
                    homepage_products_to_update.append(product)

            if homepage_products_to_update:
                self.stdout.write(f'Found {len(homepage_products_to_update)} homepage products with old paths')
                for product in homepage_products_to_update:
                    old_path = product.image.name
                    new_path = old_path.replace('products/', 'product_images/', 1)

                    if verbose or dry_run:
                        self.stdout.write(f'  Product {product.id}: {old_path} -> {new_path}')

                    if not dry_run:
                        product.image.name = new_path
                        product.save(update_fields=['image'])
                    total_updates += 1
            else:
                self.stdout.write('✓ No homepage products with old paths found')

            # Check Products app Product model
            products_to_update = []
            for product in ProductsProduct.objects.all():
                if product.image and product.image.name.startswith('products/'):
                    products_to_update.append(product)

            if products_to_update:
                self.stdout.write(f'Found {len(products_to_update)} products with old paths')
                for product in products_to_update:
                    old_path = product.image.name
                    new_path = old_path.replace('products/', 'product_images/', 1)

                    if verbose or dry_run:
                        self.stdout.write(f'  Product {product.id}: {old_path} -> {new_path}')

                    if not dry_run:
                        product.image.name = new_path
                        product.save(update_fields=['image'])
                    total_updates += 1
            else:
                self.stdout.write('✓ No products with old paths found')

            # Check ProductImage model (these use products/gallery/ which is different)
            product_images_to_update = []
            for product_image in ProductImage.objects.all():
                if product_image.image.name.startswith(
                        'products/') and not product_image.image.name.startswith('products/gallery/'):
                    # Only update if it's not the gallery path (which is intentionally different)
                    product_images_to_update.append(product_image)

            if product_images_to_update:
                self.stdout.write(f'Found {len(product_images_to_update)} product images with old paths')
                for product_image in product_images_to_update:
                    old_path = product_image.image.name
                    new_path = old_path.replace('products/', 'product_images/', 1)

                    if verbose or dry_run:
                        self.stdout.write(f'  ProductImage {product_image.id}: {old_path} -> {new_path}')

                    if not dry_run:
                        product_image.image.name = new_path
                        product_image.save(update_fields=['image'])
                    total_updates += 1
            else:
                self.stdout.write('✓ No product images with old paths found')

            # Check filesystem consistency
            media_root = settings.MEDIA_ROOT
            products_dir = os.path.join(media_root, 'products')
            product_images_dir = os.path.join(media_root, 'product_images')

            self.stdout.write('\n=== Filesystem Check ===')

            if os.path.exists(products_dir):
                files_to_move = []
                for root, dirs, files in os.walk(products_dir):
                    # Skip the gallery subdirectory as it's intentionally different
                    if 'gallery' in root:
                        continue
                    for file in files:
                        files_to_move.append(os.path.join(root, file))

                if files_to_move:
                    self.stdout.write(f'Found {len(files_to_move)} files in products/ that should be moved:')

                    # Create target directory if it doesn't exist
                    if not dry_run:
                        os.makedirs(product_images_dir, exist_ok=True)

                    for file_path in files_to_move:
                        rel_path = os.path.relpath(file_path, products_dir)
                        target_path = os.path.join(product_images_dir, rel_path)

                        if verbose or dry_run:
                            self.stdout.write(f'  Move: {file_path} -> {target_path}')

                        if not dry_run:
                            os.makedirs(os.path.dirname(target_path), exist_ok=True)
                            os.rename(file_path, target_path)
                else:
                    self.stdout.write('✓ No files in products/ directory to move')
            else:
                self.stdout.write('✓ No products/ directory found')

            if dry_run and total_updates > 0:
                self.stdout.write(f'\n{total_updates} records would be updated (dry run mode)')
                # Rollback transaction in dry run mode
                transaction.set_rollback(True)
            elif total_updates > 0:
                self.stdout.write(self.style.SUCCESS(f'\n✓ Successfully updated {total_updates} records'))
            else:
                self.stdout.write(self.style.SUCCESS('\n✓ All records are already synchronized'))

        self.stdout.write(self.style.SUCCESS('\n=== Synchronization Complete ==='))
