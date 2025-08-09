from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from products.models import Product


class Command(BaseCommand):
    help = 'Populate the database with sample products'

    def handle(self, *args, **options):
        # Get or create a user for the products
        user, created = User.objects.get_or_create(
            username='admin',
            defaults={'email': 'admin@markethub.com', 'is_staff': True, 'is_superuser': True}
        )
        if created:
            user.set_password('admin123')
            user.save()
            self.stdout.write(f"Created admin user with password 'admin123'")

        # Sample product data
        sample_products = [{'name': 'iPhone 13 Pro Max',
                            'description': 'Excellent condition Apple iPhone 13 Pro Max 128GB in Space Gray. Includes original charger and box.',
                            'price': 18500.00,
                            'category': 'electronics',
                            'location': 'cape_town_city_centre',
                            'seller': user,
                            },
                           {'name': 'Nike Air Jordan 1 Retro',
                            'description': 'Brand new Nike Air Jordan 1 Retro High OG in Chicago colorway. Size 9 US. Never worn.',
                            'price': 2800.00,
                            'category': 'fashion',
                            'location': 'camps_bay',
                            'seller': user,
                            },
                           {'name': 'MacBook Pro 16-inch',
                            'description': '2021 MacBook Pro with M1 Pro chip, 16GB RAM, 512GB SSD. Perfect for creative work and development.',
                            'price': 28000.00,
                            'category': 'electronics',
                            'location': 'sea_point',
                            'seller': user,
                            },
                           {'name': 'Mountain Bike - Giant Talon',
                            'description': 'Giant Talon 1 mountain bike in great condition. Perfect for trails around Table Mountain.',
                            'price': 8500.00,
                            'category': 'sports',
                            'location': 'woodstock',
                            'seller': user,
                            },
                           {'name': 'Vintage Leather Sofa',
                            'description': 'Beautiful vintage brown leather 3-seater sofa. Well-maintained, adds character to any living room.',
                            'price': 12000.00,
                            'category': 'home_garden',
                            'location': 'observatory',
                            'seller': user,
                            },
                           {'name': 'Canon EOS R5 Camera',
                            'description': 'Professional full-frame mirrorless camera with 45MP sensor. Includes 24-70mm lens.',
                            'price': 35000.00,
                            'category': 'electronics',
                            'location': 'green_point',
                            'seller': user,
                            },
                           {'name': 'BMW 3 Series 2019',
                            'description': '2019 BMW 320i with low mileage, full service history. Excellent condition, one owner.',
                            'price': 420000.00,
                            'category': 'automotive',
                            'location': 'constantia',
                            'seller': user,
                            },
                           {'name': 'Designer Handbag - Gucci',
                            'description': 'Authentic Gucci Dionysus GG Supreme bag in excellent condition. Comes with authenticity card.',
                            'price': 15000.00,
                            'category': 'fashion',
                            'location': 'cape_town_city_centre',
                            'seller': user,
                            },
                           {'name': 'Gaming Setup Complete',
                            'description': 'Complete gaming setup: RTX 3080 PC, 27-inch 144Hz monitor, mechanical keyboard, gaming mouse.',
                            'price': 28000.00,
                            'category': 'electronics',
                            'location': 'bellville',
                            'seller': user,
                            },
                           {'name': 'Antique Persian Rug',
                            'description': 'Beautiful hand-woven Persian rug, 200x300cm. Over 50 years old, excellent condition.',
                            'price': 18500.00,
                            'category': 'home_garden',
                            'location': 'claremont',
                            'seller': user,
                            },
                           ]

        created_count = 0
        for product_data in sample_products:
            product, created = Product.objects.get_or_create(
                name=product_data['name'],
                defaults=product_data
            )
            if created:
                created_count += 1
                self.stdout.write(f"Created product: {product.name}")

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created {created_count} products. '
                f'Total products in database: {Product.objects.count()}'
            )
        )
