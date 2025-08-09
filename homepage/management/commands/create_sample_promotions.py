from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from homepage.models import Promotion


class Command(BaseCommand):
    help = 'Create sample promotions for testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing promotions before creating new ones',
        )

    def handle(self, *args, **options):
        if options['clear']:
            Promotion.objects.all().delete()
            self.stdout.write(
                self.style.SUCCESS('Successfully cleared existing promotions')
            )

        # Create sample promotions
        now = timezone.now()

        promotions_data = [{'title': 'Black Friday Mega Sale',
                            'text': 'Get up to 70% off on all electronics! Limited time offer with free shipping on orders over $100. Don\'t miss out on our biggest sale of the year!',
                            'link': '#',
                            'valid_from': now - timedelta(days=1),
                            'valid_to': now + timedelta(days=10),
                            'is_active': True,
                            'order': 1,
                            },
                           {'title': 'Fashion Week Special',
                            'text': 'Exclusive designer collections now available with up to 50% discount. Premium quality clothing and accessories from top brands.',
                            'link': '#',
                            'valid_from': now,
                            'valid_to': now + timedelta(days=15),
                            'is_active': True,
                            'order': 2,
                            },
                           {'title': 'Summer Clearance',
                            'text': 'Clear out summer inventory with massive discounts on outdoor furniture, sports equipment, and seasonal items.',
                            'link': '#',
                            'valid_from': now - timedelta(days=2),
                            'valid_to': now + timedelta(days=7),
                            'is_active': True,
                            'order': 3,
                            },
                           ]

        created_count = 0
        for promotion_data in promotions_data:
            promotion, created = Promotion.objects.get_or_create(
                title=promotion_data['title'],
                defaults=promotion_data
            )
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created promotion: {promotion.title}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Promotion already exists: {promotion.title}')
                )

        self.stdout.write(
            self.style.SUCCESS(f'Successfully created {created_count} new promotions')
        )

        # Show active promotions
        active_promotions = Promotion.get_active_promotions()
        self.stdout.write(
            self.style.SUCCESS(f'Active promotions: {active_promotions.count()}')
        )

        for promotion in active_promotions:
            self.stdout.write(f'  - {promotion.title} (valid until {promotion.valid_to.strftime("%Y-%m-%d")})')
