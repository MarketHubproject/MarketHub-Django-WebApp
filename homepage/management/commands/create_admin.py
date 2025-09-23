from django.core.management.base import BaseCommand
from django.contrib.auth.models import User


class Command(BaseCommand):
    help = 'Create admin user for MarketHub'

    def handle(self, *args, **options):
        if User.objects.filter(username='admin').exists():
            self.stdout.write(
                self.style.WARNING('Admin user already exists')
            )
            return

        try:
            User.objects.create_superuser(
                username='admin',
                email='admin@markethub.com',
                password='markethub123',
                first_name='Admin',
                last_name='User'
            )
            self.stdout.write(
                self.style.SUCCESS('Admin user created successfully!')
            )
            self.stdout.write(
                self.style.SUCCESS('Username: admin')
            )
            self.stdout.write(
                self.style.SUCCESS('Password: markethub123')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error creating admin user: {e}')
            )