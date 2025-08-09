"""
Django management command to check that all product image files exist on disk
for both homepage.Product and products.Product models.

Usage:
    python manage.py check_all_product_images
    python manage.py check_all_product_images --verbose
    python manage.py check_all_product_images --fix-missing
"""

from pathlib import Path
from django.core.management.base import BaseCommand
from django.conf import settings
from django.apps import apps


class Command(BaseCommand):
    help = 'Check that all product image files exist on disk across all apps and report any missing files'

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
        parser.add_argument(
            '--app',
            type=str,
            help='Check only specific app (homepage or products)',
            choices=['homepage', 'products']
        )

    def handle(self, *args, **options):
        verbose = options['verbose']
        fix_missing = options['fix_missing']
        specific_app = options.get('app')
        
        # Define the apps and models to check
        models_to_check = []
        
        # Add homepage.Product model
        if not specific_app or specific_app == 'homepage':
            try:
                HomePage = apps.get_model('homepage', 'Product')
                models_to_check.append(('homepage', HomePage))
            except LookupError:
                self.stdout.write(
                    self.style.WARNING('homepage.Product model not found')
                )
        
        # Add products.Product model
        if not specific_app or specific_app == 'products':
            try:
                ProductsPage = apps.get_model('products', 'Product')
                models_to_check.append(('products', ProductsPage))
            except LookupError:
                self.stdout.write(
                    self.style.WARNING('products.Product model not found')
                )
        
        if not models_to_check:
            self.stdout.write(
                self.style.ERROR('No Product models found to check!')
            )
            return
        
        self.stdout.write(
            self.style.SUCCESS(f'Checking Product models from {len(models_to_check)} app(s)...')
        )
        
        total_missing_files = []
        total_checked_count = 0
        
        # Check each model
        for app_name, ProductModel in models_to_check:
            self.stdout.write(f'\n{"="*50}')
            self.stdout.write(f'Checking {app_name}.Product model')
            self.stdout.write("="*50)
            
            # Get all products with images
            products_with_images = ProductModel.objects.exclude(image__isnull=True).exclude(image='')
            app_total_products = products_with_images.count()
            
            if app_total_products == 0:
                self.stdout.write(
                    self.style.WARNING(f'No products with images found in {app_name}.Product')
                )
                continue
            
            self.stdout.write(
                self.style.SUCCESS(f'Found {app_total_products} products with images in {app_name}')
            )
            
            app_missing_files = []
            app_checked_count = 0
            
            for product in products_with_images:
                app_checked_count += 1
                total_checked_count += 1
                
                # Build the full path to the image file
                if product.image and product.image.name:
                    image_path = Path(settings.MEDIA_ROOT) / product.image.name
                    
                    if verbose:
                        self.stdout.write(f'[{app_name}] Checking product #{product.id}: {product.name}')
                        self.stdout.write(f'  Image path: {product.image.name}')
                        self.stdout.write(f'  Full path: {image_path}')
                    
                    # Check if file exists
                    if not image_path.exists():
                        missing_info = {
                            'app': app_name,
                            'product': product,
                            'image_path': product.image.name,
                            'full_path': str(image_path)
                        }
                        app_missing_files.append(missing_info)
                        total_missing_files.append(missing_info)
                        
                        if verbose:
                            self.stdout.write(
                                self.style.ERROR(f'  ❌ Missing: {image_path}')
                            )
                        
                        # Fix missing files if requested
                        if fix_missing:
                            product.image = None
                            product.save()
                            self.stdout.write(
                                self.style.WARNING(f'  🔧 Fixed: Set image to null for {app_name}.Product #{product.id}')
                            )
                    else:
                        if verbose:
                            self.stdout.write(
                                self.style.SUCCESS(f'  ✅ Found: {image_path}')
                            )
            
            # App-specific summary
            self.stdout.write(f'\n{app_name} Summary:')
            self.stdout.write(f'  Products checked: {app_checked_count}')
            self.stdout.write(f'  Missing files: {len(app_missing_files)}')
            self.stdout.write(f'  Valid files: {app_checked_count - len(app_missing_files)}')
            
            if app_missing_files:
                for missing in app_missing_files:
                    product = missing['product']
                    self.stdout.write(
                        self.style.ERROR(
                            f'  ❌ {app_name}.Product #{product.id}: "{product.name}" - {missing["image_path"]}'
                        )
                    )
        
        # Overall summary report
        self.stdout.write('\n' + '='*60)
        self.stdout.write('OVERALL SUMMARY REPORT')
        self.stdout.write('='*60)
        
        self.stdout.write(f'Total products checked: {total_checked_count}')
        self.stdout.write(f'Total missing image files: {len(total_missing_files)}')
        self.stdout.write(f'Total valid image files: {total_checked_count - len(total_missing_files)}')
        
        if total_missing_files:
            self.stdout.write('\nALL MISSING FILES:')
            self.stdout.write('-' * 40)
            for missing in total_missing_files:
                product = missing['product']
                app_name = missing['app']
                self.stdout.write(
                    self.style.ERROR(
                        f'{app_name}.Product #{product.id}: "{product.name}" - {missing["image_path"]}'
                    )
                )
            
            if not fix_missing:
                self.stdout.write('\n💡 TIP: Use --fix-missing to automatically set image fields to null for missing files')
            else:
                self.stdout.write(
                    self.style.SUCCESS(f'\n✅ Fixed {len(total_missing_files)} products by setting image to null')
                )
        else:
            self.stdout.write(
                self.style.SUCCESS('\n🎉 All product images found across all apps! No missing files detected.')
            )
        
        # Additional statistics
        self.stdout.write(f'\nMEDIA_ROOT: {settings.MEDIA_ROOT}')
        
        # Check if MEDIA_ROOT directory exists
        media_root_path = Path(settings.MEDIA_ROOT)
        if media_root_path.exists():
            self.stdout.write(self.style.SUCCESS('✅ MEDIA_ROOT directory exists'))
            
            # Show some directory stats
            try:
                all_files = list(media_root_path.rglob('*'))
                image_files = [f for f in all_files if f.is_file() and f.suffix.lower() in ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']]
                self.stdout.write(f'📁 Total files in MEDIA_ROOT: {len([f for f in all_files if f.is_file()])}')
                self.stdout.write(f'🖼️  Total image files in MEDIA_ROOT: {len(image_files)}')
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'Could not read MEDIA_ROOT contents: {e}'))
        else:
            self.stdout.write(self.style.ERROR('❌ MEDIA_ROOT directory does not exist!'))
        
        # Show suggestions for future maintenance
        if total_missing_files:
            self.stdout.write('\n📋 MAINTENANCE SUGGESTIONS:')
            self.stdout.write('1. Run this command regularly to catch missing files early')
            self.stdout.write('2. Consider setting up file backup for your media directory')
            self.stdout.write('3. Implement file validation in your upload forms')
            self.stdout.write('4. Use --fix-missing flag to clean up missing image references')
        else:
            self.stdout.write('\n✅ No maintenance needed - all images are properly linked!')
