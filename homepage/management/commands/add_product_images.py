import os
import requests
import uuid
from io import BytesIO
from PIL import Image
from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from django.conf import settings
from homepage.models import Product


class Command(BaseCommand):
    help = 'Add realistic product images to existing products'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force update even if product already has an image'
        )
        parser.add_argument(
            '--product-id',
            type=int,
            help='Update specific product by ID'
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Adding product images...'))
        
        # Product image mappings based on product names and categories
        image_mappings = {
            # Electronics
            'iPhone 12 Pro Max 256GB': 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=600&h=600&fit=crop&auto=format',
            'MacBook Air M1 2021': 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=600&h=600&fit=crop&auto=format',
            'Samsung 55" 4K Smart TV': 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600&h=600&fit=crop&auto=format',
            'Sony PlayStation 5 Console': 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=600&h=600&fit=crop&auto=format',
            'iPad Pro 11" 2022': 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&h=600&fit=crop&auto=format',
            
            # Clothing
            'Designer Leather Jacket': 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&h=600&fit=crop&auto=format',
            'Nike Air Jordan Collection': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop&auto=format',
            'Vintage Rolex Watch': 'https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=600&h=600&fit=crop&auto=format',
            'Designer Handbag Collection': 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&h=600&fit=crop&auto=format',
            
            # Books
            'Complete Harry Potter Series': 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&h=600&fit=crop&auto=format',
            'University Textbook Bundle': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=600&fit=crop&auto=format',
            'Vinyl Record Collection': 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=600&fit=crop&auto=format',
            
            # Furniture
            'Scandinavian Dining Set': 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&h=600&fit=crop&auto=format',
            'Luxury Leather Sofa': 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=600&fit=crop&auto=format',
            'Modern Office Desk Setup': 'https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=600&h=600&fit=crop&auto=format',
            
            # Other
            'Mountain Bike - Trek 2021': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=600&fit=crop&auto=format',
            'Guitar & Amplifier Set': 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=600&fit=crop&auto=format',
            'Gym Equipment Bundle': 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=600&h=600&fit=crop&auto=format',
        }
        
        # Fallback images by category
        category_fallbacks = {
            'electronics': 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600&h=600&fit=crop&auto=format',
            'clothing': 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=600&h=600&fit=crop&auto=format',
            'books': 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&h=600&fit=crop&auto=format',
            'furniture': 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&h=600&fit=crop&auto=format',
            'other': 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&h=600&fit=crop&auto=format',
        }
        
        # Get products to update
        if options['product_id']:
            try:
                products = Product.objects.filter(id=options['product_id'])
                if not products.exists():
                    self.stdout.write(
                        self.style.ERROR(f'Product with ID {options["product_id"]} not found')
                    )
                    return
            except ValueError:
                self.stdout.write(self.style.ERROR('Invalid product ID'))
                return
        else:
            if options['force']:
                products = Product.objects.all()
            else:
                products = Product.objects.filter(image__isnull=True) | Product.objects.filter(image='')
        
        total_products = products.count()
        self.stdout.write(f'Found {total_products} products to update')
        
        updated_count = 0
        for product in products:
            try:
                # Get image URL
                image_url = None
                
                # First, try exact name match
                if product.name in image_mappings:
                    image_url = image_mappings[product.name]
                # Then try category fallback
                elif product.category in category_fallbacks:
                    image_url = category_fallbacks[product.category]
                else:
                    # Default fallback
                    image_url = category_fallbacks['other']
                
                if image_url:
                    success = self.download_and_save_image(product, image_url)
                    if success:
                        updated_count += 1
                        self.stdout.write(
                            self.style.SUCCESS(f'✓ Updated {product.name} (ID: {product.id})')
                        )
                    else:
                        self.stdout.write(
                            self.style.WARNING(f'⚠ Failed to update {product.name} (ID: {product.id})')
                        )
                        
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'✗ Error updating {product.name}: {str(e)}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\nCompleted! Updated {updated_count} out of {total_products} products.'
            )
        )
    
    def download_and_save_image(self, product, image_url):
        """Download image from URL and save to product"""
        try:
            # Download image
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            response = requests.get(image_url, headers=headers, timeout=30)
            response.raise_for_status()
            
            # Open and process image
            img = Image.open(BytesIO(response.content))
            
            # Convert to RGB if needed
            if img.mode in ('RGBA', 'LA', 'P'):
                img = img.convert('RGB')
            
            # Resize to reasonable dimensions while maintaining aspect ratio
            max_size = (800, 800)
            img.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            # Save processed image
            output = BytesIO()
            img.save(output, format='JPEG', quality=85, optimize=True)
            output.seek(0)
            
            # Generate filename
            filename = f"{product.id}_{uuid.uuid4().hex[:8]}.jpg"
            
            # Save to product
            product.image.save(
                filename,
                ContentFile(output.getvalue()),
                save=True
            )
            
            return True
            
        except Exception as e:
            self.stdout.write(f"Error downloading {image_url}: {str(e)}")
            return False
