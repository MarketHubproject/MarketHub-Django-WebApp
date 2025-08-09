from django.core.management.base import BaseCommand
from homepage.models import Category

class Command(BaseCommand):
    help = 'Create sample category data'

    def handle(self, *args, **options):
        categories_data = [
            {
                'name': 'Electronics',
                'slug': 'electronics',
                'description': 'Stay ahead with the latest technology. From smartphones to smart home devices, laptops to gaming gear.',
                'icon_class': 'fas fa-laptop',
                'is_featured': True,
                'order': 1
            },
            {
                'name': 'Fashion & Clothing',
                'slug': 'clothing',
                'description': 'Express your style with our curated collection of contemporary fashion. Quality fabrics meet modern design.',
                'icon_class': 'fas fa-tshirt',
                'is_featured': True,
                'order': 2
            },
            {
                'name': 'Books & Literature',
                'slug': 'books',
                'description': 'Dive into worlds of knowledge and imagination. From bestsellers to academic texts, find your next great read.',
                'icon_class': 'fas fa-book',
                'is_featured': True,
                'order': 3
            },
            {
                'name': 'Home & Furniture',
                'slug': 'furniture',
                'description': 'Transform your living spaces with our collection of modern furniture and home decor items.',
                'icon_class': 'fas fa-couch',
                'is_featured': True,
                'order': 4
            },
            {
                'name': 'Sports & Outdoors',
                'slug': 'sports',
                'description': 'Gear up for adventure with our collection of sports equipment and outdoor essentials.',
                'icon_class': 'fas fa-football-ball',
                'is_featured': False,
                'order': 5
            },
            {
                'name': 'Health & Beauty',
                'slug': 'health-beauty',
                'description': 'Pamper yourself with our premium health and beauty products for a radiant you.',
                'icon_class': 'fas fa-spa',
                'is_featured': False,
                'order': 6
            }
        ]

        for category_data in categories_data:
            category, created = Category.objects.get_or_create(
                slug=category_data['slug'],
                defaults=category_data
            )
            
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Successfully created category: {category.name}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Category already exists: {category.name}')
                )

        self.stdout.write(
            self.style.SUCCESS('Sample categories creation completed!')
        )
