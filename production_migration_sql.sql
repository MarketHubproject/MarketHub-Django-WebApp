-- Production Database Migration Script
-- Purpose: Update "Store Lite" references to "Markethub" safely
-- Date: 2025-08-09
-- Author: AI Assistant

-- Note: Always test in staging environment first!
-- Create backup before running: mysqldump -u username -p database_name > backup_$(date +%Y%m%d_%H%M%S).sql

BEGIN;

-- Update homepage_heroslide table
-- Update titles containing "Store Lite" (case-insensitive)
UPDATE homepage_heroslide 
SET title = REPLACE(REPLACE(title, 'Store Lite', 'Markethub'), 'store lite', 'Markethub')
WHERE LOWER(title) LIKE '%store lite%';

-- Update subtitles containing "Store Lite" (case-insensitive)  
UPDATE homepage_heroslide 
SET subtitle = REPLACE(REPLACE(subtitle, 'Store Lite', 'Markethub'), 'store lite', 'Markethub')
WHERE LOWER(subtitle) LIKE '%store lite%';

-- Update homepage_product table
-- Update product names containing "Store Lite" (case-insensitive)
UPDATE homepage_product 
SET name = REPLACE(REPLACE(name, 'Store Lite', 'Markethub'), 'store lite', 'Markethub')
WHERE LOWER(name) LIKE '%store lite%';

-- Update product descriptions containing "Store Lite" (case-insensitive)
UPDATE homepage_product 
SET description = REPLACE(REPLACE(description, 'Store Lite', 'Markethub'), 'store lite', 'Markethub')
WHERE LOWER(description) LIKE '%store lite%';

-- Update homepage_category table
-- Update category names containing "Store Lite" (case-insensitive)
UPDATE homepage_category 
SET name = REPLACE(REPLACE(name, 'Store Lite', 'Markethub'), 'store lite', 'Markethub')
WHERE LOWER(name) LIKE '%store lite%';

-- Update category descriptions containing "Store Lite" (case-insensitive)
UPDATE homepage_category 
SET description = REPLACE(REPLACE(description, 'Store Lite', 'Markethub'), 'store lite', 'Markethub')
WHERE LOWER(description) LIKE '%store lite%';

-- Update homepage_promotion table
-- Update promotion titles containing "Store Lite" (case-insensitive)
UPDATE homepage_promotion 
SET title = REPLACE(REPLACE(title, 'Store Lite', 'Markethub'), 'store lite', 'Markethub')
WHERE LOWER(title) LIKE '%store lite%';

-- Update promotion text containing "Store Lite" (case-insensitive)
UPDATE homepage_promotion 
SET text = REPLACE(REPLACE(text, 'Store Lite', 'Markethub'), 'store lite', 'Markethub')
WHERE LOWER(text) LIKE '%store lite%';

-- Optional: Update any other tables that might contain "Store Lite"
-- Add more tables as needed:

-- UPDATE other_table 
-- SET column_name = REPLACE(REPLACE(column_name, 'Store Lite', 'Markethub'), 'store lite', 'Markethub')
-- WHERE LOWER(column_name) LIKE '%store lite%';

-- Show affected records count (run this after the updates to verify)
-- SELECT 'hero_slides' as table_name, COUNT(*) as updated_records FROM homepage_heroslide WHERE title LIKE '%Markethub%' OR subtitle LIKE '%Markethub%'
-- UNION ALL
-- SELECT 'products', COUNT(*) FROM homepage_product WHERE name LIKE '%Markethub%' OR description LIKE '%Markethub%'
-- UNION ALL  
-- SELECT 'categories', COUNT(*) FROM homepage_category WHERE name LIKE '%Markethub%' OR description LIKE '%Markethub%'
-- UNION ALL
-- SELECT 'promotions', COUNT(*) FROM homepage_promotion WHERE title LIKE '%Markethub%' OR text LIKE '%Markethub%';

COMMIT;

-- Instructions for usage:
-- 1. Always backup your database first
-- 2. Test in staging environment
-- 3. Run during maintenance window
-- 4. Monitor for any issues
-- 5. Verify results using the SELECT statements above
