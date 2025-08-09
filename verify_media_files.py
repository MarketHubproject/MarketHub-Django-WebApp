#!/usr/bin/env python
from django.conf import settings
from django.db import connection
import os
import django
import sys
from pathlib import Path

# Setup Django environment
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'markethub.settings')
django.setup()


def get_all_file_paths():
    """Extract all file paths from tables with image/file fields"""
    cursor = connection.cursor()

    file_paths = []

    # Query all tables with image fields
    queries = [
        # HomepageCategory images
        "SELECT 'homepage_category' as table_name, 'image' as field_name, image as file_path FROM homepage_category WHERE image IS NOT NULL AND image != ''",

        # HomepageProduct images
        "SELECT 'homepage_product' as table_name, 'image' as field_name, image as file_path FROM homepage_product WHERE image IS NOT NULL AND image != ''",

        # HomepageHeroslide images
        "SELECT 'homepage_heroslide' as table_name, 'image' as field_name, image as file_path FROM homepage_heroslide WHERE image IS NOT NULL AND image != ''",

        # HomepagePromotion images
        "SELECT 'homepage_promotion' as table_name, 'image' as field_name, image as file_path FROM homepage_promotion WHERE image IS NOT NULL AND image != ''",

        # ProductsProduct images
        "SELECT 'products_product' as table_name, 'image' as field_name, image as file_path FROM products_product WHERE image IS NOT NULL AND image != ''",

        # ProductsProductimage images
        "SELECT 'products_productimage' as table_name, 'image' as field_name, image as file_path FROM products_productimage WHERE image IS NOT NULL AND image != ''",

        # ProfilesUserprofile profile pictures
        "SELECT 'profiles_userprofile' as table_name, 'profile_picture' as field_name, profile_picture as file_path FROM profiles_userprofile WHERE profile_picture IS NOT NULL AND profile_picture != ''"
    ]

    for query in queries:
        cursor.execute(query)
        results = cursor.fetchall()
        for row in results:
            file_paths.append({
                'table': row[0],
                'field': row[1],
                'path': row[2]
            })

    return file_paths


def check_file_existence(file_paths):
    """Check if files exist in the filesystem"""
    print(f"MEDIA_ROOT: {settings.MEDIA_ROOT}")
    print(f"Current working directory: {os.getcwd()}")
    print("=" * 80)

    media_root = Path(settings.MEDIA_ROOT) if hasattr(settings, 'MEDIA_ROOT') else Path('media')

    results = []

    for item in file_paths:
        table = item['table']
        field = item['field']
        path = item['path']

        # Full path in media directory
        full_path = media_root / path

        exists = full_path.exists()

        result = {
            'table': table,
            'field': field,
            'db_path': path,
            'full_path': str(full_path),
            'exists': exists
        }

        results.append(result)

        status = "✓ EXISTS" if exists else "✗ MISSING"
        print(f"{status:10} | {table:20} | {field:15} | {path}")

        # Check for potential mismatches (file in different location)
        if not exists:
            # Look for file in other subdirectories
            filename = Path(path).name
            for root, dirs, files in os.walk(media_root):
                if filename in files:
                    actual_path = Path(root) / filename
                    relative_path = actual_path.relative_to(media_root)
                    print(f"{'':10} | {'FOUND AT:':20} | {'':15} | {relative_path}")
                    break

    return results


def main():
    print("Extracting file paths from database...")
    file_paths = get_all_file_paths()

    print(f"\nFound {len(file_paths)} file references in database")
    print("=" * 80)
    print(f"{'STATUS':10} | {'TABLE':20} | {'FIELD':15} | {'PATH'}")
    print("=" * 80)

    results = check_file_existence(file_paths)

    # Summary
    existing_files = sum(1 for r in results if r['exists'])
    missing_files = len(results) - existing_files

    print("=" * 80)
    print(f"SUMMARY:")
    print(f"  Total files in DB: {len(results)}")
    print(f"  Files found: {existing_files}")
    print(f"  Files missing: {missing_files}")

    if missing_files > 0:
        print(f"\nMissing files:")
        for r in results:
            if not r['exists']:
                print(f"  - {r['db_path']} (from {r['table']}.{r['field']})")


if __name__ == "__main__":
    main()
