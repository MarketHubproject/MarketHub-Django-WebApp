from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from homepage.models import HeroSlide
import requests
import tempfile
import os


class Command(BaseCommand):
    help = 'Create sample hero slides for testing the slider functionality'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear-existing',
            action='store_true',
            help='Clear existing hero slides before creating new ones',
        )

    def handle(self, *args, **options):
        if options['clear_existing']:
            HeroSlide.objects.all().delete()
            self.stdout.write(
                self.style.SUCCESS('Cleared existing hero slides.')
            )

        # Sample hero slides data
        slides_data = [
            {
                'title': 'Discover Amazing Products',
                'subtitle': 'Shop from thousands of verified sellers and find exactly what you\'re looking for in our premium marketplace.',
                'image_url': 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
                'cta_text': 'Shop Now',
                'cta_url': '/products/',
                'order': 1
            },
            {
                'title': 'Sell Your Products Easily',
                'subtitle': 'Join our community of successful sellers and start earning money by selling your products to customers worldwide.',
                'image_url': 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
                'cta_text': 'Start Selling',
                'cta_url': '/create-product/',
                'order': 2
            },
            {
                'title': 'Premium Shopping Experience',
                'subtitle': 'Experience luxury shopping with secure payments, fast delivery, and exceptional customer service.',
                'image_url': 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
                'cta_text': 'Explore Premium',
                'cta_url': '/products/',
                'order': 3
            },
        ]

        created_count = 0
        for slide_data in slides_data:
            try:
                # Check if slide with same title already exists
                if HeroSlide.objects.filter(title=slide_data['title']).exists():
                    self.stdout.write(
                        self.style.WARNING(
                            f'Slide "{slide_data["title"]}" already exists. Skipping...'
                        )
                    )
                    continue

                # Create the hero slide
                slide = HeroSlide(
                    title=slide_data['title'],
                    subtitle=slide_data['subtitle'],
                    cta_text=slide_data['cta_text'],
                    cta_url=slide_data['cta_url'],
                    order=slide_data['order'],
                    is_active=True
                )

                # Download and save the image (for demo purposes)
                # Note: In production, you should use local images or a CDN
                try:
                    response = requests.get(slide_data['image_url'], timeout=10)
                    if response.status_code == 200:
                        # Create a temporary file
                        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_file:
                            temp_file.write(response.content)
                            temp_file_path = temp_file.name

                        # Save the image to the model
                        with open(temp_file_path, 'rb') as f:
                            image_name = f"hero_slide_{slide_data['order']}.jpg"
                            slide.image.save(image_name, ContentFile(f.read()))

                        # Clean up the temporary file
                        os.unlink(temp_file_path)
                    else:
                        self.stdout.write(
                            self.style.WARNING(
                                f'Failed to download image for "{slide_data["title"]}"'
                            )
                        )
                        continue

                except requests.exceptions.RequestException as e:
                    self.stdout.write(
                        self.style.WARNING(
                            f'Error downloading image for "{slide_data["title"]}": {e}'
                        )
                    )
                    # Create slide without image for now
                    pass

                slide.save()
                created_count += 1
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Created hero slide: "{slide.title}"'
                    )
                )

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f'Error creating slide "{slide_data["title"]}": {e}'
                    )
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'\nSuccessfully created {created_count} hero slide(s)!'
            )
        )
        
        if created_count > 0:
            self.stdout.write(
                self.style.SUCCESS(
                    'You can now view the hero slider on the homepage or manage slides in the Django admin.'
                )
            )
