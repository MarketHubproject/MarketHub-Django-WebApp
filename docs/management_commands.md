# Product Image Checking Management Commands

This project includes custom Django management commands to help maintain data integrity by checking that product image files referenced in the database actually exist on disk.

## Available Commands

### 1. `check_product_images` (Homepage App)

Checks only the `homepage.Product` model for missing image files.

#### Usage:
```bash
# Basic check
python manage.py check_product_images

# Verbose output showing each product checked
python manage.py check_product_images --verbose

# Automatically fix missing images by setting them to null
python manage.py check_product_images --fix-missing

# Combine flags
python manage.py check_product_images --verbose --fix-missing
```

### 2. `check_all_product_images` (Cross-App Command)

Comprehensive command that checks both `homepage.Product` and `products.Product` models.

#### Usage:
```bash
# Check all Product models across both apps
python manage.py check_all_product_images

# Check only a specific app
python manage.py check_all_product_images --app homepage
python manage.py check_all_product_images --app products

# Verbose output with detailed file paths
python manage.py check_all_product_images --verbose

# Fix missing image references automatically
python manage.py check_all_product_images --fix-missing

# Combine all options
python manage.py check_all_product_images --verbose --fix-missing --app homepage
```

## Command Options

| Option | Description |
|--------|-------------|
| `--verbose` | Shows detailed output for each product checked, including file paths |
| `--fix-missing` | Automatically sets the image field to null for products with missing files |
| `--app` | (check_all_product_images only) Check only specific app: `homepage` or `products` |

## What These Commands Do

1. **Query Database**: Find all products that have an image field set (not null or empty)
2. **Check Files**: For each product, verify that the image file exists at the expected path
3. **Report Results**: Provide a comprehensive summary of findings
4. **Optional Fix**: If `--fix-missing` is used, automatically clean up database references to missing files

## Example Output

### Basic Check (All Files Found):
```
Checking Product models from 2 app(s)...

==================================================
Checking homepage.Product model
==================================================
Found 16 products with images in homepage

homepage Summary:
  Products checked: 16
  Missing files: 0
  Valid files: 16

==================================================
Checking products.Product model
==================================================
Found 3 products with images in products

products Summary:
  Products checked: 3
  Missing files: 0
  Valid files: 3

============================================================
OVERALL SUMMARY REPORT
============================================================
Total products checked: 19
Total missing image files: 0
Total valid image files: 19

🎉 All product images found across all apps! No missing files detected.

MEDIA_ROOT: /path/to/media
✅ MEDIA_ROOT directory exists
📁 Total files in MEDIA_ROOT: 3
🖼️  Total image files in MEDIA_ROOT: 1

✅ No maintenance needed - all images are properly linked!
```

### With Missing Files:
```
============================================================
OVERALL SUMMARY REPORT
============================================================
Total products checked: 19
Total missing image files: 2
Total valid image files: 17

ALL MISSING FILES:
----------------------------------------
homepage.Product #5: "Old Camera" - product_images/missing_camera.jpg
products.Product #12: "Vintage Watch" - product_images/vintage_watch.png

💡 TIP: Use --fix-missing to automatically set image fields to null for missing files

📋 MAINTENANCE SUGGESTIONS:
1. Run this command regularly to catch missing files early
2. Consider setting up file backup for your media directory
3. Implement file validation in your upload forms
4. Use --fix-missing flag to clean up missing image references
```

## When to Use These Commands

### Regular Maintenance
- **Weekly/Monthly**: Run basic checks to catch missing files early
- **After deployments**: Ensure all media files were properly transferred
- **Before backups**: Verify data integrity

### Troubleshooting
- **User reports missing images**: Use `--verbose` to debug specific products
- **After media folder changes**: Verify no files were accidentally removed
- **Database cleanup**: Use `--fix-missing` to clean up orphaned references

### Development
- **After importing data**: Ensure all referenced files exist
- **Testing environments**: Verify test data integrity
- **Code reviews**: Document any changes affecting file storage

## Technical Details

### File Path Resolution
The commands use Django's `settings.MEDIA_ROOT` and the model's `image.name` field to construct the full file path:
```python
image_path = Path(settings.MEDIA_ROOT) / product.image.name
```

### Safety Features
- **Read-only by default**: Commands only report findings unless `--fix-missing` is explicitly used
- **Detailed logging**: All actions are clearly reported
- **App isolation**: Can check specific apps to avoid unintended changes

### Error Handling
- Gracefully handles missing models or apps
- Reports if MEDIA_ROOT directory doesn't exist
- Provides helpful suggestions for common issues

## Integration with CI/CD

You can integrate these commands into your deployment pipeline:

```bash
# In your deployment script
python manage.py check_all_product_images
if [ $? -ne 0 ]; then
    echo "Image integrity check failed!"
    exit 1
fi
```

Or as a periodic maintenance task:
```bash
# Cron job example (run weekly)
0 2 * * 0 /path/to/your/project/manage.py check_all_product_images --fix-missing
```

## Related Files

- `homepage/management/commands/check_product_images.py` - Single app command
- `products/management/commands/check_all_product_images.py` - Cross-app command
- Both commands use the same core logic with `Path(settings.MEDIA_ROOT, p.image.name).exists()`
