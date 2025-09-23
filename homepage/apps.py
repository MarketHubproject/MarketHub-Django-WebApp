from django.apps import AppConfig


class HomepageConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'homepage'
    
    def ready(self):
        """Run initialization code when Django starts"""
        # Import here to avoid circular imports
        from django.contrib.auth.models import User
        from django.db import connection
        
        # Check if we're in a migration or if tables don't exist yet
        try:
            if 'auth_user' in connection.introspection.table_names():
                # Only create admin user if none exists
                if not User.objects.filter(is_superuser=True).exists():
                    User.objects.create_superuser(
                        username='admin',
                        email='admin@markethub.com',
                        password='markethub123',
                        first_name='Admin',
                        last_name='User'
                    )
                    print("✅ Admin user created: admin/markethub123")
                else:
                    print("ℹ️ Admin user already exists")
        except Exception as e:
            # Silently fail during migrations or initial setup
            pass
