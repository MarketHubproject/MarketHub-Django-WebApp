# Store Lite → MarketHub Rebrand Migration Notes

## Overview
This PR implements a comprehensive rebrand from "Store Lite" to "MarketHub" across the entire Django web application.

## Changes Summary

### 1. File Renames
- **CSS Files**: `store-lite.css` → `markethub.css`
- **SCSS Files**: `store-lite.scss` → `markethub.scss`
- **JavaScript Files**: `store-lite.js` → `markethub.js`
- **Documentation**: All brand reference files updated
- **Variables**: `_storelite_variables.scss` → `_markethub_variables.scss`

### 2. Code Changes
- **Templates**: Updated all references from "Store Lite" to "MarketHub"
- **Python Code**: Updated strings, comments, and variable names
- **Configuration**: Updated settings.py and related configuration files
- **Database Migration**: Created migration to update existing data
- **Build Scripts**: Updated asset compilation scripts

### 3. Database Migration
- Migration file: `homepage/migrations/0002_update_store_lite_to_markethub.py`
- Updates existing hero slides, promotions, and content references
- SQL backup available in `production_migration_sql.sql`

## Pre-Migration Checklist
- [ ] Backup production database
- [ ] Verify all tests pass
- [ ] Check CSS/JS asset compilation
- [ ] Verify template rendering
- [ ] Test API endpoints

## Post-Migration Verification
- [ ] Check homepage displays "MarketHub" branding
- [ ] Verify CSS styles load correctly
- [ ] Test JavaScript functionality
- [ ] Confirm database content updated
- [ ] Validate all internal links work

## Rollback Procedures
See `ROLLBACK_INSTRUCTIONS.md` for detailed rollback procedures.

## Testing
- All existing tests updated and passing
- New integration tests added for rebrand
- Manual testing completed on development environment
