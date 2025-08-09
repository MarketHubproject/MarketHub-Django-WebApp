# 🖼️ Product Image Integrity Commands

This project includes Django management commands to check that product image files referenced in the database actually exist on disk.

## Quick Start

```bash
# Check all products across both apps
python manage.py check_all_product_images

# Check with detailed output
python manage.py check_all_product_images --verbose

# Check and automatically fix missing files
python manage.py check_all_product_images --fix-missing
```

## Why Use These Commands?

- ✅ **Data Integrity**: Ensure your database references match actual files
- 🔧 **Maintenance**: Catch missing files early before users notice
- 🚀 **Deployment Safety**: Verify all media files transferred correctly
- 🧹 **Cleanup**: Remove orphaned database references automatically

## Commands Available

| Command | Scope | Description |
|---------|-------|-------------|
| `check_product_images` | Homepage app only | Basic image checking for homepage.Product |
| `check_all_product_images` | Both apps | Comprehensive checking for all Product models |

## Real Results from This Project

Current status: ✅ **All 19 product images found and verified!**
- 16 products in homepage app ✅
- 3 products in products app ✅
- 0 missing files 🎉

## Common Use Cases

```bash
# Weekly maintenance check
python manage.py check_all_product_images

# Debug specific app issues
python manage.py check_all_product_images --app homepage --verbose

# Clean up after deployment
python manage.py check_all_product_images --fix-missing

# Check before backup
python manage.py check_all_product_images > backup_integrity_check.log
```

For detailed documentation, see [docs/management_commands.md](docs/management_commands.md).
