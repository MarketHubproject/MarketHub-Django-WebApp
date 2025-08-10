#!/usr/bin/env python
"""
Test runner for MarketHub Django application.

This script properly configures Django before running pytest tests.
"""
import os
import sys
import django
from django.conf import settings
from django.test.utils import get_runner

if __name__ == "__main__":
    # Set the Django settings module
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'markethub.settings.dev')
    
    # Configure Django
    django.setup()
    
    # Import pytest after Django is configured
    import pytest
    
    print("🧪 Running MarketHub Test Suite")
    print("=" * 50)
    print(f"Django version: {django.get_version()}")
    print(f"Python version: {sys.version}")
    print("=" * 50)
    
    # Run pytest with the arguments passed to this script
    exit_code = pytest.main(sys.argv[1:] if len(sys.argv) > 1 else [
        "tests/",
        "--cov=.",
        "--cov-report=html:htmlcov",
        "--cov-report=term-missing",
        "--cov-fail-under=85",
        "-v"
    ])
    
    if exit_code == 0:
        print("\n✅ All tests passed! Coverage maintained at 85%+")
    else:
        print(f"\n❌ Tests failed with exit code {exit_code}")
    
    sys.exit(exit_code)
