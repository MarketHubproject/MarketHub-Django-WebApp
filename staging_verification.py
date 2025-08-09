#!/usr/bin/env python3
"""
Staging Environment Verification Script
Purpose: Test the Store Lite -> Markethub migration in staging environment
Author: AI Assistant
Date: 2025-08-09

This script should be run in the staging environment to:
1. Check for existing "Store Lite" references
2. Apply the migration
3. Verify the results
4. Generate a report
"""

import os
import sys
import django
from django.db import connection
from django.core.management import call_command

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'store.settings')
django.setup()

# Import models after Django setup
from homepage.models import HeroSlide, Product, Category, Promotion


def check_store_lite_references():
    """Check for existing 'Store Lite' references in the database."""
    print("🔍 Checking for existing 'Store Lite' references...")
    results = {}
    
    # Check HeroSlide model
    hero_slides = HeroSlide.objects.filter(
        models.Q(title__icontains='store lite') | 
        models.Q(subtitle__icontains='store lite')
    )
    results['hero_slides'] = hero_slides.count()
    
    # Check Product model  
    products = Product.objects.filter(
        models.Q(name__icontains='store lite') |
        models.Q(description__icontains='store lite')
    )
    results['products'] = products.count()
    
    # Check Category model
    categories = Category.objects.filter(
        models.Q(name__icontains='store lite') |
        models.Q(description__icontains='store lite')
    )
    results['categories'] = categories.count()
    
    # Check Promotion model
    promotions = Promotion.objects.filter(
        models.Q(title__icontains='store lite') |
        models.Q(text__icontains='store lite')
    )
    results['promotions'] = promotions.count()
    
    return results


def check_markethub_references():
    """Check for 'Markethub' references after migration."""
    print("✅ Checking for 'Markethub' references...")
    results = {}
    
    # Check HeroSlide model
    hero_slides = HeroSlide.objects.filter(
        models.Q(title__icontains='markethub') | 
        models.Q(subtitle__icontains='markethub')
    )
    results['hero_slides'] = hero_slides.count()
    
    # Check Product model
    products = Product.objects.filter(
        models.Q(name__icontains='markethub') |
        models.Q(description__icontains='markethub')
    )
    results['products'] = products.count()
    
    # Check Category model
    categories = Category.objects.filter(
        models.Q(name__icontains='markethub') |
        models.Q(description__icontains='markethub')
    )
    results['categories'] = categories.count()
    
    # Check Promotion model
    promotions = Promotion.objects.filter(
        models.Q(title__icontains='markethub') |
        models.Q(text__icontains='markethub')
    )
    results['promotions'] = promotions.count()
    
    return results


def run_migration():
    """Apply the migration."""
    print("🚀 Running migration...")
    try:
        call_command('migrate', 'homepage', '0002', verbosity=2)
        return True
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        return False


def print_report(before, after):
    """Print a detailed report of the migration results."""
    print("\n" + "="*60)
    print("📊 MIGRATION VERIFICATION REPORT")
    print("="*60)
    
    print("\nBEFORE MIGRATION (Store Lite references):")
    print("-" * 40)
    for model, count in before.items():
        print(f"{model.ljust(15)}: {count} records")
    
    print("\nAFTER MIGRATION (Markethub references):")
    print("-" * 40)
    for model, count in after.items():
        print(f"{model.ljust(15)}: {count} records")
    
    print("\nMIGRATION STATUS:")
    print("-" * 20)
    total_before = sum(before.values())
    total_after = sum(after.values())
    
    if total_before > 0 and total_after == total_before:
        print("✅ Migration SUCCESSFUL - All Store Lite references updated to Markethub")
    elif total_before == 0:
        print("ℹ️  No Store Lite references found - Migration not needed")
    else:
        print(f"⚠️  PARTIAL SUCCESS - {total_after}/{total_before} references updated")
    
    print(f"\nTotal records processed: {total_before}")
    print(f"Total records updated: {total_after}")
    
    print("\n" + "="*60)


def main():
    """Main execution function."""
    print("🏗️  Store Lite -> Markethub Migration Verification")
    print("Running in STAGING environment")
    print("-" * 60)
    
    # Check references before migration
    before_results = check_store_lite_references()
    
    # Apply migration
    if run_migration():
        print("✅ Migration applied successfully")
        
        # Check references after migration
        after_results = check_markethub_references()
        
        # Generate report
        print_report(before_results, after_results)
        
        # Final verification - check if any Store Lite references remain
        remaining = check_store_lite_references()
        if sum(remaining.values()) > 0:
            print("⚠️  WARNING: Some Store Lite references still exist!")
            print("Remaining references:", remaining)
        else:
            print("🎉 All Store Lite references successfully updated!")
            
    else:
        print("❌ Migration failed - aborting verification")
        return 1
    
    return 0


if __name__ == "__main__":
    # Import models module for Q objects
    from django.db import models
    
    exit_code = main()
    sys.exit(exit_code)
