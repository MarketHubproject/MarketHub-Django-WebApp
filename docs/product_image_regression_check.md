# Product Image Regression Check

This document describes the regression check system for Product image files to catch mismatches between database records and filesystem early.

## Overview

The system includes two complementary approaches:

1. **Management Command**: `check_product_images` - For manual checking and CI/CD integration
2. **Unit Tests**: `ProductImageRegressionTest` - For automated testing during development

## Management Command

### Usage

```bash
# Basic check
python manage.py check_product_images

# Verbose output showing each product checked
python manage.py check_product_images --verbose

# Automatically fix missing image references
python manage.py check_product_images --fix-missing
```

### Features

- **Iterates over all Product objects** that have image field references
- **Asserts `Path(settings.MEDIA_ROOT, p.image.name).exists()`** for each product
- **Detailed reporting** of missing files with product information
- **Optional automatic fixing** of invalid references with `--fix-missing`
- **Colored output** for easy identification of issues
- **Exits with error code** if mismatches found (useful for CI/CD)

### Example Output

```
Checking product images for file system mismatches...
Checking 3 products with image references...

============================================================
RESULTS:
  Total products checked: 3
  Files found: 3
  Missing files: 0

✓ All product images are properly stored on filesystem!
```

### Integration in CI/CD

Add this to your CI/CD pipeline to catch regressions:

```bash
# This will fail the build if image files are missing
python manage.py check_product_images
```

## Unit Tests

### Running Tests

```bash
# Run just the regression tests
python manage.py test products.tests.ProductImageRegressionTest

# Run with verbose output
python manage.py test products.tests.ProductImageRegressionTest -v 2
```

### Test Coverage

The `ProductImageRegressionTest` class includes:

1. **`test_product_image_files_exist_on_filesystem`**
   - Core regression test that checks file existence
   - Uses `Path(settings.MEDIA_ROOT, product.image.name).exists()`
   - Provides detailed error messages for missing files

2. **`test_media_root_directory_exists`**
   - Ensures MEDIA_ROOT directory exists
   - Prerequisite check for image storage

3. **`test_product_images_directory_structure`**
   - Verifies product_images directory exists when products have images
   - Matches the `upload_to='product_images/'` setting

### Example Test Failure

If files are missing, the test will fail with detailed information:

```
AssertionError: Found 2 products with missing image files:
  • Product: 'Test Product 1' (ID: 123)
    Database image field: product_images/missing_file.jpg
    Expected file path: /path/to/media/product_images/missing_file.jpg
  • Product: 'Test Product 2' (ID: 124)
    Database image field: product_images/another_missing.jpg
    Expected file path: /path/to/media/product_images/another_missing.jpg

This indicates a mismatch between database records and filesystem.
```

## When to Use

### Management Command
- **Manual verification** during development
- **Deployment checks** to ensure all files transferred correctly
- **CI/CD pipelines** for automated regression detection
- **Periodic maintenance** to identify and fix orphaned references

### Unit Tests
- **Continuous testing** as part of your test suite
- **Pre-deployment verification** 
- **Development workflow** to catch issues early

## Common Issues Resolved

This regression check helps catch:

- **Files deleted from filesystem** but database references remain
- **Incomplete file transfers** during deployments
- **Broken symlinks** in media directories
- **Path mismatches** between development and production
- **Database corruption** affecting image field paths

## Configuration

The checks use standard Django settings:

- `settings.MEDIA_ROOT` - Base directory for media files
- `Product.image.upload_to` - Relative path within MEDIA_ROOT (currently `'product_images/'`)

No additional configuration required.
