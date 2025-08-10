#!/usr/bin/env python
import os
import django
from django.conf import settings

# Set Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'markethub.settings')
os.environ.setdefault('DJANGO_ENVIRONMENT', 'development')

# Initialize Django
django.setup()

# Print debug information
print("DEBUG:", getattr(settings, 'DEBUG', 'NOT SET'))
print("ALLOWED_HOSTS:", getattr(settings, 'ALLOWED_HOSTS', 'NOT SET'))
print("DATABASE ENGINE:", settings.DATABASES['default']['ENGINE'])
print("ENVIRONMENT_NAME:", getattr(settings, 'ENVIRONMENT_NAME', 'NOT SET'))

# Check if we can import the settings properly
try:
    from markethub.settings import dev
    print("Dev settings imported successfully")
except Exception as e:
    print(f"Error importing dev settings: {e}")
