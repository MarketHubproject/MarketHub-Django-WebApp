# SQLite to PostgreSQL Migration Guide

This guide provides step-by-step instructions for migrating your MarketHub installation from SQLite (development) to PostgreSQL (production).

## 🎯 **Overview**

MarketHub supports both SQLite (for development) and PostgreSQL (for production). This migration ensures:

- **Better Performance** - PostgreSQL handles concurrent connections efficiently
- **Production Scalability** - Supports multiple application servers
- **Advanced Features** - Full-text search, JSON fields, and more
- **Backup & Recovery** - Enterprise-grade backup solutions
- **Connection Pooling** - Better resource management

## 📋 **Prerequisites**

### **System Requirements**
- PostgreSQL 12+ installed
- Python `psycopg2-binary` package
- Sufficient disk space (2x current database size)
- Database backup (SQLite file copy)

### **Install PostgreSQL**

#### **Ubuntu/Debian**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### **CentOS/RHEL**
```bash
sudo yum install postgresql-server postgresql-contrib
sudo postgresql-setup initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### **macOS**
```bash
brew install postgresql
brew services start postgresql
```

#### **Windows**
Download and install from: https://www.postgresql.org/download/windows/

## 🔧 **Step 1: PostgreSQL Database Setup**

### **Create Database and User**

```bash
# Switch to PostgreSQL user
sudo -u postgres psql

# Create database
CREATE DATABASE markethub_db;

# Create user with password
CREATE USER markethub_user WITH PASSWORD 'markethub_password_secure_2024';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE markethub_db TO markethub_user;

# Grant schema privileges (PostgreSQL 15+)
GRANT ALL ON SCHEMA public TO markethub_user;
GRANT CREATE ON SCHEMA public TO markethub_user;

# Exit PostgreSQL
\q
```

### **Configure PostgreSQL Authentication**

Edit PostgreSQL configuration files:

```bash
# Find configuration directory
sudo -u postgres psql -c "SHOW config_file;"

# Edit pg_hba.conf
sudo nano /etc/postgresql/14/main/pg_hba.conf
```

Add/modify these lines:
```conf
# Database administrative login by Unix domain socket
local   all             postgres                                peer

# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   markethub_db    markethub_user                          md5
host    markethub_db    markethub_user  127.0.0.1/32            md5
host    markethub_db    markethub_user  ::1/128                 md5
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

### **Test Connection**
```bash
psql -h localhost -d markethub_db -U markethub_user
# Enter password when prompted
# Should see: markethub_db=#
\q
```

## 🔄 **Step 2: Environment Configuration**

### **Update Environment Variables**

Create or update `.env.postgresql`:

```env
# Django Core Settings
SECRET_KEY=django-insecure-2!q%^8-0tdl57)##4u_dq!%g8bx#n590f=m(#_%2=%@463+1om
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0

# PostgreSQL Database Configuration
DATABASE_ENGINE=django.db.backends.postgresql
DATABASE_NAME=markethub_db
DATABASE_USER=markethub_user
DATABASE_PASSWORD=markethub_password_secure_2024
DATABASE_HOST=localhost
DATABASE_PORT=5432

# SQLite fallback for development
SQLITE_DATABASE_NAME=db.sqlite3

# API Configuration
API_BASE_URL=http://127.0.0.1:8000/api/
FRONTEND_API_URL=http://127.0.0.1:8000/api/

# Static and Media Files
STATIC_URL=/static/
MEDIA_URL=/media/

# Email Configuration (for production)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
EMAIL_HOST=
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=

# Security Settings
SECURE_SSL_REDIRECT=False
SESSION_COOKIE_SECURE=False
CSRF_COOKIE_SECURE=False
SECURE_BROWSER_XSS_FILTER=True
SECURE_CONTENT_TYPE_NOSNIFF=True

# Cache Configuration
CACHE_BACKEND=django.core.cache.backends.locmem.LocMemCache
CACHE_LOCATION=unique-snowflake

# REST Framework Settings
DRF_PAGE_SIZE=20
DRF_DEFAULT_PERMISSION=rest_framework.permissions.IsAuthenticatedOrReadOnly

# Logging Level
LOG_LEVEL=INFO

# Stripe Payment Processing Configuration
# Test keys - replace with live keys in production
STRIPE_PUBLIC_KEY=pk_test_51XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXx
STRIPE_SECRET_KEY=sk_test_51XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXx
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Django Security Enhancements
CSP_DEFAULT_SRC="'self'"
CSP_SCRIPT_SRC="'self' 'unsafe-inline' https://js.stripe.com"
CSP_FRAME_SRC="'self' https://js.stripe.com https://hooks.stripe.com"
CSP_CONNECT_SRC="'self' https://api.stripe.com"
```

### **Install Required Dependencies**

```bash
pip install psycopg2-binary django-postgrespool2
```

## 📊 **Step 3: Database Schema Migration**

### **Initialize PostgreSQL Schema**

```bash
# Use PostgreSQL environment
export DJANGO_SETTINGS_MODULE=markethub.settings.dev
# or 
cp .env.postgresql .env

# Create migrations (if not done already)
python manage.py makemigrations

# Apply migrations to PostgreSQL
python manage.py migrate
```

### **Verify Schema Creation**

```bash
# Connect to PostgreSQL
psql -h localhost -d markethub_db -U markethub_user

# List tables
\dt

# Expected output should include:
# homepage_category
# homepage_product  
# homepage_cart
# homepage_cartitem
# homepage_payment
# auth_user
# django_migrations
# etc.

\q
```

## 📦 **Step 4: Data Export from SQLite**

### **Create Data Backup**

```bash
# Create backup directory
mkdir -p backups/sqlite-to-postgresql-$(date +%Y%m%d)

# Export data using Django's dumpdata
python manage.py dumpdata --indent=2 --output=backups/sqlite-to-postgresql-$(date +%Y%m%d)/full_backup.json

# Export specific apps (recommended)
python manage.py dumpdata homepage --indent=2 --output=backups/sqlite-to-postgresql-$(date +%Y%m%d)/homepage_data.json
python manage.py dumpdata auth.User --indent=2 --output=backups/sqlite-to-postgresql-$(date +%Y%m%d)/users_data.json
python manage.py dumpdata profiles --indent=2 --output=backups/sqlite-to-postgresql-$(date +%Y%m%d)/profiles_data.json
python manage.py dumpdata student_rewards --indent=2 --output=backups/sqlite-to-postgresql-$(date +%Y%m%d)/rewards_data.json
```

### **Selective Data Export (Production-Safe)**

```bash
# Export excluding problematic tables
python manage.py dumpdata \
  --exclude=contenttypes \
  --exclude=auth.permission \
  --exclude=sessions \
  --exclude=admin.logentry \
  --indent=2 \
  --output=backups/sqlite-to-postgresql-$(date +%Y%m%d)/clean_backup.json
```

## 🔄 **Step 5: Data Import to PostgreSQL**

### **Switch to PostgreSQL Configuration**

```bash
# Ensure using PostgreSQL settings
export DATABASE_ENGINE=django.db.backends.postgresql
export DATABASE_NAME=markethub_db
export DATABASE_USER=markethub_user
export DATABASE_PASSWORD=markethub_password_secure_2024

# Or copy the PostgreSQL environment file
cp .env.postgresql .env
```

### **Import Data**

```bash
# Load data into PostgreSQL
python manage.py loaddata backups/sqlite-to-postgresql-$(date +%Y%m%d)/clean_backup.json

# Or load app-specific data
python manage.py loaddata backups/sqlite-to-postgresql-$(date +%Y%m%d)/users_data.json
python manage.py loaddata backups/sqlite-to-postgresql-$(date +%Y%m%d)/homepage_data.json
python manage.py loaddata backups/sqlite-to-postgresql-$(date +%Y%m%d)/profiles_data.json
python manage.py loaddata backups/sqlite-to-postgresql-$(date +%Y%m%d)/rewards_data.json
```

### **Handle Import Issues**

If you encounter foreign key or content type issues:

```bash
# Clear and reload content types
python manage.py shell
```

```python
from django.contrib.contenttypes.models import ContentType
ContentType.objects.all().delete()

from django.core.management import call_command
call_command('migrate', '--run-syncdb')
exit()
```

Then retry the data import.

## 🧪 **Step 6: Data Verification**

### **Verify Data Migration**

```bash
python manage.py shell
```

```python
# Check user count
from django.contrib.auth.models import User
print(f"Users: {User.objects.count()}")

# Check products
from homepage.models import Product
print(f"Products: {Product.objects.count()}")

# Check categories  
from homepage.models import Category
print(f"Categories: {Category.objects.count()}")

# Check payments
from homepage.models import Payment
print(f"Payments: {Payment.objects.count()}")

# Sample data verification
if Product.objects.exists():
    product = Product.objects.first()
    print(f"Sample product: {product.name} - ${product.price}")

exit()
```

### **Test Application Functionality**

```bash
# Start development server
python manage.py runserver

# Test in browser:
# - http://127.0.0.1:8000/ (Homepage)
# - http://127.0.0.1:8000/admin/ (Admin interface)
# - http://127.0.0.1:8000/api/ (API endpoints)
```

### **Run Comprehensive Tests**

```bash
# Run test suite
python manage.py test

# Or use pytest
pytest --cov=. --cov-report=html
```

## 🔧 **Step 7: Performance Optimization**

### **Create Database Indexes**

```sql
-- Connect to PostgreSQL
psql -h localhost -d markethub_db -U markethub_user

-- Optimize common queries
CREATE INDEX CONCURRENTLY idx_homepage_product_category ON homepage_product(category);
CREATE INDEX CONCURRENTLY idx_homepage_product_price ON homepage_product(price);
CREATE INDEX CONCURRENTLY idx_homepage_product_created ON homepage_product(created_at);
CREATE INDEX CONCURRENTLY idx_homepage_cartitem_cart ON homepage_cartitem(cart_id);
CREATE INDEX CONCURRENTLY idx_homepage_payment_user ON homepage_payment(user_id);
CREATE INDEX CONCURRENTLY idx_homepage_payment_status ON homepage_payment(status);

-- Full-text search index for products
CREATE INDEX CONCURRENTLY idx_homepage_product_search 
ON homepage_product 
USING GIN(to_tsvector('english', name || ' ' || description));

\q
```

### **Configure Connection Pooling**

Update your production settings:

```python
# markethub/settings/prod.py
DATABASES = {
    'default': {
        'ENGINE': 'django_postgrespool2',
        'NAME': config('DATABASE_NAME'),
        'USER': config('DATABASE_USER'),
        'PASSWORD': config('DATABASE_PASSWORD'),
        'HOST': config('DATABASE_HOST'),
        'PORT': config('DATABASE_PORT', default=5432, cast=int),
        'OPTIONS': {
            'MAX_CONNS': 20,
            'MIN_CONNS': 5,
        }
    }
}
```

## 📊 **Step 8: Monitoring and Maintenance**

### **Database Statistics**

```sql
-- Connect to PostgreSQL as admin
sudo -u postgres psql -d markethub_db

-- Enable query statistics
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Check database size
SELECT pg_size_pretty(pg_database_size('markethub_db'));

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Monitor slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;

\q
```

### **Backup Script**

Create `scripts/backup_postgresql.sh`:

```bash
#!/bin/bash

# PostgreSQL Backup Script
BACKUP_DIR="/var/backups/markethub"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="markethub_db"
DB_USER="markethub_user"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create backup
pg_dump -h localhost -U "$DB_USER" -F c "$DB_NAME" > "$BACKUP_DIR/markethub_backup_$DATE.dump"

# Create SQL backup
pg_dump -h localhost -U "$DB_USER" "$DB_NAME" > "$BACKUP_DIR/markethub_backup_$DATE.sql"

# Compress backups older than 7 days
find "$BACKUP_DIR" -name "*.sql" -type f -mtime +7 -exec gzip {} \;

# Remove backups older than 30 days
find "$BACKUP_DIR" -name "*.gz" -type f -mtime +30 -delete

echo "Backup completed: markethub_backup_$DATE"
```

Make it executable and add to cron:
```bash
chmod +x scripts/backup_postgresql.sh

# Add to crontab (daily backup at 2 AM)
crontab -e
# Add: 0 2 * * * /path/to/your/project/scripts/backup_postgresql.sh
```

## 🚨 **Troubleshooting**

### **Common Issues and Solutions**

#### **Connection Issues**
```bash
# Issue: psycopg2.OperationalError: could not connect
# Solution: Check PostgreSQL service and authentication

sudo systemctl status postgresql
sudo -u postgres psql -c "SELECT version();"
```

#### **Permission Issues**
```sql
-- Issue: permission denied for relation
-- Solution: Grant proper permissions

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO markethub_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO markethub_user;
```

#### **Encoding Issues**
```sql
-- Check database encoding
SELECT datname, datcollate, datctype FROM pg_database WHERE datname='markethub_db';

-- If needed, recreate with proper encoding
DROP DATABASE markethub_db;
CREATE DATABASE markethub_db 
    WITH ENCODING 'UTF8' 
    LC_COLLATE='en_US.UTF-8' 
    LC_CTYPE='en_US.UTF-8';
```

#### **Data Import Errors**
```bash
# Issue: Duplicate key errors during import
# Solution: Clear problematic data first

python manage.py shell -c "
from django.contrib.auth.models import User;
from homepage.models import Product, Category;
User.objects.filter(is_superuser=False).delete();
Product.objects.all().delete();
Category.objects.all().delete();
"
```

### **Rollback Plan**

If migration fails, rollback to SQLite:

```bash
# Switch back to SQLite
cp .env.example .env
sed -i 's/DATABASE_ENGINE=django.db.backends.postgresql/DATABASE_ENGINE=django.db.backends.sqlite3/' .env
sed -i 's/DATABASE_NAME=markethub_db/DATABASE_NAME=db.sqlite3/' .env

# Start server with SQLite
python manage.py runserver
```

## ✅ **Step 9: Production Deployment**

### **Update Production Environment**

```env
# .env.production
DEBUG=False
SECRET_KEY=your-secure-production-key
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

DATABASE_ENGINE=django.db.backends.postgresql
DATABASE_NAME=markethub_prod
DATABASE_USER=markethub_prod_user
DATABASE_PASSWORD=super_secure_production_password
DATABASE_HOST=your-db-host
DATABASE_PORT=5432

# Additional production settings...
```

### **Post-Migration Checklist**

- [ ] All data successfully migrated
- [ ] User authentication working
- [ ] Product listings displaying correctly
- [ ] Shopping cart functionality intact
- [ ] Payment processing functional
- [ ] Admin interface accessible
- [ ] API endpoints responding
- [ ] Static files serving properly
- [ ] Email notifications working
- [ ] Backup system configured
- [ ] Monitoring and logging setup
- [ ] Performance optimizations applied

## 📈 **Performance Comparison**

### **Before (SQLite)**
- Single connection limit
- File-based storage
- Limited concurrent users
- No connection pooling

### **After (PostgreSQL)**
- Multiple concurrent connections
- Server-based architecture
- Horizontal scaling capability
- Connection pooling enabled
- Advanced query optimization
- Better backup and recovery options

## 🎉 **Migration Complete!**

Your MarketHub application is now running on PostgreSQL! 

### **Next Steps**
1. Monitor performance for the first week
2. Set up automated backups
3. Configure monitoring and alerting
4. Plan for regular maintenance
5. Consider setting up a read replica for high traffic

### **Support**
- Check PostgreSQL logs: `tail -f /var/log/postgresql/postgresql-*.log`
- Django debug mode: Set `DEBUG=True` temporarily
- Database queries: Use Django Debug Toolbar
- Performance issues: Monitor with `pg_stat_statements`

---

*Your MarketHub application is now enterprise-ready with PostgreSQL!*
