# Settings package for MarketHub Django project
import os

# Get the environment from environment variable
environment = os.environ.get('DJANGO_ENVIRONMENT', 'development').lower()

print(f"[SETTINGS __init__] Environment detected: {environment}")

if environment == 'production':
    print("[SETTINGS __init__] Loading production settings...")
    from .prod import *
else:
    print("[SETTINGS __init__] Loading development settings...")
    from .dev import *

print(f"[SETTINGS __init__] Settings loading completed for {environment}")
