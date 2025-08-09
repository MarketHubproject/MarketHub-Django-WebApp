# Store Lite → Markethub Migration Guide

## Overview
This guide covers the complete process for migrating all "Store Lite" references to "Markethub" in both fixture data and database records.

## ✅ Completed Steps

### 1. Fixture Data Updates
- **Status**: ✅ COMPLETED
- **File Updated**: `fixtures/hero_slides.json`
- **Changes Made**:
  - `"Welcome to Store Lite"` → `"Welcome to Markethub"`
  - `"...at Store Lite."` → `"...at Markethub."`
- **Verification**: All other fixture files checked and confirmed clean

### 2. Django Migration Created
- **Status**: ✅ READY FOR DEPLOYMENT
- **Migration File**: `homepage/migrations/0002_update_store_lite_to_markethub.py`
- **Coverage**: 
  - HeroSlide (title, subtitle)
  - Product (name, description)
  - Category (name, description)  
  - Promotion (title, text)
- **Safety Features**:
  - Case-insensitive matching
  - Atomic transaction
  - Reversible migration
  - Raw SQL for reliability

### 3. Production SQL Script
- **Status**: ✅ READY FOR USE
- **File**: `production_migration_sql.sql`
- **Usage**: Alternative to Django migration for direct database access
- **Features**:
  - Transaction-wrapped
  - Comprehensive table coverage
  - Backup instructions included
  - Verification queries provided

### 4. Staging Verification Script
- **Status**: ✅ READY FOR TESTING
- **File**: `staging_verification.py`
- **Purpose**: Automated testing in staging environment
- **Features**:
  - Pre-migration checks
  - Migration execution
  - Post-migration verification
  - Detailed reporting

## 🚀 Deployment Instructions

### Option A: Django Migration (Recommended)

1. **Apply Migration in Staging**:
   ```bash
   # In staging environment
   python manage.py migrate homepage 0002
   ```

2. **Verify Results**:
   ```bash
   python staging_verification.py
   ```

3. **Deploy to Production**:
   ```bash
   # In production environment
   python manage.py migrate homepage 0002
   ```

### Option B: Direct SQL (Alternative)

1. **Create Database Backup**:
   ```bash
   # MySQL
   mysqldump -u username -p database_name > backup_$(date +%Y%m%d_%H%M%S).sql
   
   # PostgreSQL
   pg_dump -U username database_name > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Execute SQL Script**:
   ```bash
   # MySQL
   mysql -u username -p database_name < production_migration_sql.sql
   
   # PostgreSQL
   psql -U username -d database_name -f production_migration_sql.sql
   ```

## 🔍 Verification Steps

### 1. Pre-Migration Check
```python
# Run this Django shell command to check current state
from homepage.models import HeroSlide, Product, Category, Promotion
from django.db.models import Q

# Check for Store Lite references
HeroSlide.objects.filter(Q(title__icontains='store lite') | Q(subtitle__icontains='store lite')).count()
Product.objects.filter(Q(name__icontains='store lite') | Q(description__icontains='store lite')).count()
Category.objects.filter(Q(name__icontains='store lite') | Q(description__icontains='store lite')).count()
Promotion.objects.filter(Q(title__icontains='store lite') | Q(text__icontains='store lite')).count()
```

### 2. Post-Migration Verification
```python
# Check for Markethub references
HeroSlide.objects.filter(Q(title__icontains='markethub') | Q(subtitle__icontains='markethub')).count()
Product.objects.filter(Q(name__icontains='markethub') | Q(description__icontains='markethub')).count()
Category.objects.filter(Q(name__icontains='markethub') | Q(description__icontains='markethub')).count()
Promotion.objects.filter(Q(title__icontains='markethub') | Q(text__icontains='markethub')).count()

# Confirm no Store Lite references remain
HeroSlide.objects.filter(Q(title__icontains='store lite') | Q(subtitle__icontains='store lite')).count()  # Should be 0
```

### 3. SQL Verification Queries
```sql
-- Check updated records
SELECT 'hero_slides' as table_name, COUNT(*) as updated_records 
FROM homepage_heroslide 
WHERE title LIKE '%Markethub%' OR subtitle LIKE '%Markethub%'
UNION ALL
SELECT 'products', COUNT(*) FROM homepage_product 
WHERE name LIKE '%Markethub%' OR description LIKE '%Markethub%'
UNION ALL  
SELECT 'categories', COUNT(*) FROM homepage_category 
WHERE name LIKE '%Markethub%' OR description LIKE '%Markethub%'
UNION ALL
SELECT 'promotions', COUNT(*) FROM homepage_promotion 
WHERE title LIKE '%Markethub%' OR text LIKE '%Markethub%';

-- Verify no Store Lite references remain
SELECT 'Remaining Store Lite References' as check_type, COUNT(*) as count
FROM (
    SELECT title FROM homepage_heroslide WHERE LOWER(title) LIKE '%store lite%'
    UNION ALL
    SELECT subtitle FROM homepage_heroslide WHERE LOWER(subtitle) LIKE '%store lite%'
    UNION ALL
    SELECT name FROM homepage_product WHERE LOWER(name) LIKE '%store lite%'
    UNION ALL
    SELECT description FROM homepage_product WHERE LOWER(description) LIKE '%store lite%'
    UNION ALL
    SELECT name FROM homepage_category WHERE LOWER(name) LIKE '%store lite%'
    UNION ALL
    SELECT description FROM homepage_category WHERE LOWER(description) LIKE '%store lite%'
    UNION ALL
    SELECT title FROM homepage_promotion WHERE LOWER(title) LIKE '%store lite%'
    UNION ALL
    SELECT text FROM homepage_promotion WHERE LOWER(text) LIKE '%store lite%'
) AS all_references;
```

## ⚠️ Important Notes

### Safety Considerations
1. **Always backup database before migration**
2. **Test in staging environment first**
3. **Run during maintenance window**
4. **Monitor application after deployment**
5. **Keep rollback plan ready**

### Rollback Instructions
If rollback is needed, use the reverse migration:
```bash
python manage.py migrate homepage 0001
```

### Files Involved
- ✅ `fixtures/hero_slides.json` - Updated
- ✅ `homepage/migrations/0002_update_store_lite_to_markethub.py` - Created
- ✅ `production_migration_sql.sql` - Created
- ✅ `staging_verification.py` - Created
- ✅ `MIGRATION_README.md` - This file

### Database Tables Affected
- `homepage_heroslide` - title, subtitle fields
- `homepage_product` - name, description fields
- `homepage_category` - name, description fields
- `homepage_promotion` - title, text fields

## 📈 Expected Results
After successful migration:
- All "Store Lite" text references updated to "Markethub"
- Case variations handled (Store Lite, store lite, STORE LITE)
- Database integrity maintained
- Application functionality preserved
- SEO and branding consistency achieved

## 📞 Support
If issues arise during migration:
1. Check the Django logs for error details
2. Verify database connection and permissions
3. Confirm staging testing was completed
4. Contact system administrator if needed

---
**Migration prepared on**: 2025-08-09  
**Version**: 1.0  
**Status**: Ready for deployment
