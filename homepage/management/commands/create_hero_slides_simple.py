from django.core.management.base import BaseCommand
from homepage.models import HeroSlide


class Command(BaseCommand):
    help = 'Create simple hero slides for testing (without downloading images)'

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

        # Sample hero slides data (without images for now)
        slides_data = [{'title': 'Welcome to MarketHub',
                        'subtitle': 'Discover amazing products from trusted sellers in our modern marketplace. Shop with confidence and enjoy premium service.',
                        'cta_text': 'Shop Now',
                        'cta_url': '/products/',
                        'order': 1},
                       {'title': 'Start Selling Today',
                        'subtitle': 'Join thousands of successful sellers and turn your products into profit. Easy setup, secure payments, global reach.',
                        'cta_text': 'Start Selling',
                        'cta_url': '/create-product/',
                        'order': 2},
                       {'title': 'Premium Shopping Experience',
                        'subtitle': 'Experience luxury shopping with secure payments, fast delivery, and exceptional customer service at MarketHub.',
                        'cta_text': 'Explore Premium',
                        'cta_url': '/products/',
                        'order': 3},
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

                # Create the hero slide without image
                slide = HeroSlide.objects.create(
                    title=slide_data['title'],
                    subtitle=slide_data['subtitle'],
                    cta_text=slide_data['cta_text'],
                    cta_url=slide_data['cta_url'],
                    order=slide_data['order'],
                    is_active=True
                )

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
                self.style.WARNING(
                    'Note: Slides were created without images. Please add images through the Django admin.'
                )
            )
            self.stdout.write(
                self.style.SUCCESS(
                    'You can now manage slides in the Django admin at /admin/homepage/heroslide/'
                )
            )
