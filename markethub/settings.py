"""
Django settings for markethub project.

This is the main settings file that determines which environment-specific 
settings to load based on the DJANGO_SETTINGS_MODULE environment variable.

Environment-specific settings are located in:
- markethub.settings.dev - Development settings
- markethub.settings.prod - Production settings  

For backward compatibility, this file defaults to development settings
if no specific environment is set.
"""

print("[MAIN SETTINGS] Starting to load settings...")

import os
from decouple import config

print("[MAIN SETTINGS] Imports completed")

# Determine environment
environment = config('DJANGO_ENVIRONMENT', default='development')
print(f"Loading environment: {environment}")  # Debug print

# Import appropriate settings based on environment
# For local development, always use dev settings regardless of DEBUG env var
if environment == 'production':
    from .settings.prod import *
    print("Loaded production settings")  # Debug print
else:
    # Default to development settings for local development
    from .settings.dev import *
    print("Loaded development settings")  # Debug print

# Environment indicator for debugging
ENVIRONMENT_NAME = environment.upper()
