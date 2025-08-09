# MarketHub Django WebApp - Deployment Guide

## Overview

This guide covers the complete deployment process for the MarketHub Django WebApp, including staging and production deployments, rollback procedures, and troubleshooting.

## Pre-requisites

- Python 3.8+ with virtual environment
- Git repository access
- Database access (PostgreSQL for production, SQLite for development/staging)
- Web server configuration (Nginx + Gunicorn for production)
- SSL certificates configured
- Domain name and DNS configured

## Environment Setup

### Staging Environment
- **Branch**: `develop`
- **URL**: `https://staging.markethub.com`
- **Database**: PostgreSQL or SQLite
- **Settings**: `markethub.settings.staging`

### Production Environment
- **Branch**: `main`
- **URL**: `https://www.markethub.com`
- **Database**: PostgreSQL
- **Settings**: `markethub.settings.production`

## Pre-Deployment Checklist

### Code Quality
- [ ] All unit tests passing (50 tests)
- [ ] Integration tests passing
- [ ] Code review completed
- [ ] Security review completed
- [ ] Performance testing completed

### Database
- [ ] Database migrations created and tested
- [ ] Database backup created
- [ ] Migration rollback plan prepared

### Infrastructure
- [ ] Server resources adequate
- [ ] SSL certificates valid
- [ ] CDN configured for static files
- [ ] Monitoring and logging configured

### Dependencies
- [ ] Requirements.txt updated
- [ ] Third-party service credentials configured
- [ ] Environment variables set

## Deployment Process

### Automated Deployment

Use the provided deployment script:

```bash
# Deploy to staging
python deploy.py --environment staging

# Deploy to production  
python deploy.py --environment production
```

### Manual Deployment Steps

If you need to deploy manually, follow these steps:

#### 1. Create Backup
```bash
# Create backup directory
mkdir -p backups/$(date +%Y%m%d_%H%M%S)

# Backup database
pg_dump markethub_prod > backups/$(date +%Y%m%d_%H%M%S)/db_backup.sql

# Backup media files
cp -r media/ backups/$(date +%Y%m%d_%H%M%S)/media/

# Save git commit hash
git rev-parse HEAD > backups/$(date +%Y%m%d_%H%M%S)/git_commit.txt
```

#### 2. Update Code
```bash
# Fetch latest changes
git fetch origin

# Checkout target branch
git checkout main  # or develop for staging

# Pull latest changes
git pull origin main
```

#### 3. Install Dependencies
```bash
# Activate virtual environment
source venv/bin/activate

# Install/update dependencies
pip install -r requirements.txt
```

#### 4. Run Tests
```bash
# Run full test suite
python manage.py test --verbosity=2

# Verify 50 tests pass
# Check for any test failures or errors
```

#### 5. Database Migration
```bash
# Check for pending migrations
python manage.py showmigrations

# Run migrations
python manage.py migrate --noinput

# Verify migration success
python manage.py showmigrations
```

#### 6. Load Fixtures (Staging Only)
```bash
# Load sample data fixtures
python manage.py loaddata fixtures/users.json
python manage.py loaddata fixtures/categories.json
python manage.py loaddata fixtures/products.json
python manage.py loaddata fixtures/hero_slides.json
python manage.py loaddata fixtures/promotions.json
python manage.py loaddata fixtures/carts.json
```

#### 7. Collect Static Files
```bash
# Collect static files
python manage.py collectstatic --noinput

# Verify static files are accessible
```

#### 8. Health Check
```bash
# Run Django system check
python manage.py check

# Test database connectivity
python manage.py dbshell

# Verify critical endpoints
curl -f http://localhost:8000/
curl -f http://localhost:8000/api/
```

#### 9. Restart Services
```bash
# Restart web server
sudo systemctl restart nginx

# Restart application server  
sudo systemctl restart gunicorn

# Restart background services (if applicable)
sudo systemctl restart redis
sudo systemctl restart celery
```

## Rollback Procedure

### Automatic Rollback

Use the deployment script with rollback option:

```bash
# List available backups
ls -la backups/

# Rollback to specific backup
python deploy.py --rollback backups/staging_20250807_164900
```

### Manual Rollback Steps

#### 1. Stop Services
```bash
sudo systemctl stop nginx
sudo systemctl stop gunicorn
```

#### 2. Restore Database
```bash
# Restore from backup
pg_restore -d markethub_prod backups/20250807_164900/db_backup.sql

# Or for SQLite
cp backups/20250807_164900/db_backup.sqlite3 db.sqlite3
```

#### 3. Restore Code
```bash
# Get commit hash from backup
COMMIT_HASH=$(cat backups/20250807_164900/git_commit.txt)

# Checkout previous commit
git checkout $COMMIT_HASH
```

#### 4. Restore Media Files
```bash
# Remove current media files
rm -rf media/

# Restore from backup
cp -r backups/20250807_164900/media/ media/
```

#### 5. Restore Dependencies
```bash
# Install previous dependencies
pip install -r requirements.txt
```

#### 6. Restart Services
```bash
sudo systemctl start gunicorn
sudo systemctl start nginx
```

## Testing Deployment

### Automated Tests
The deployment script automatically runs:
- 50 unit tests covering all models and functionality
- Integration tests for API endpoints
- Django system check

### Manual Verification

#### Functional Testing
- [ ] Homepage loads correctly
- [ ] User authentication works
- [ ] Product catalog displays
- [ ] Shopping cart functionality
- [ ] Admin interface accessible

#### Performance Testing
- [ ] Page load times < 2 seconds
- [ ] Database query performance
- [ ] Static file serving
- [ ] API response times

#### Security Testing
- [ ] HTTPS redirect working
- [ ] Security headers present
- [ ] Admin interface protected
- [ ] API authentication working

## Monitoring and Alerts

### Health Checks
- **Database**: Connection test every 5 minutes
- **Application**: HTTP status check every minute  
- **Static Files**: CDN availability check
- **SSL Certificate**: Expiration monitoring

### Log Monitoring
- **Error Logs**: `/var/log/nginx/error.log`
- **Access Logs**: `/var/log/nginx/access.log`
- **Application Logs**: `/var/log/gunicorn/error.log`
- **Django Logs**: Configured in settings.py

### Performance Monitoring
- Response time monitoring
- Database query monitoring
- Memory and CPU usage
- Disk space monitoring

## Troubleshooting

### Common Issues

#### Migration Failures
```bash
# Check migration status
python manage.py showmigrations

# Fake apply migrations if needed
python manage.py migrate --fake app_name migration_name

# Reset migrations (DANGER - data loss)
python manage.py migrate app_name zero
```

#### Static Files Not Loading
```bash
# Verify static files directory
ls -la staticfiles/

# Check nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

#### Database Connection Issues
```bash
# Test database connection
python manage.py dbshell

# Check database server status
sudo systemctl status postgresql

# Review database logs
sudo journalctl -u postgresql
```

#### Application Not Starting
```bash
# Check gunicorn status
sudo systemctl status gunicorn

# View gunicorn logs
sudo journalctl -u gunicorn

# Test gunicorn manually
gunicorn markethub.wsgi:application --bind 0.0.0.0:8000
```

### Emergency Contacts
- **DevOps Team**: devops@markethub.com
- **Database Admin**: dba@markethub.com  
- **Security Team**: security@markethub.com
- **On-call Engineer**: +1-555-0123

## Post-Deployment Tasks

### Immediate (0-15 minutes)
- [ ] Verify deployment success
- [ ] Check error logs
- [ ] Monitor key metrics
- [ ] Test critical user flows

### Short-term (15-60 minutes)  
- [ ] Monitor performance metrics
- [ ] Check for error spikes
- [ ] Verify monitoring alerts
- [ ] Update deployment documentation

### Long-term (1-24 hours)
- [ ] Analyze deployment impact
- [ ] Review performance trends
- [ ] Document any issues
- [ ] Plan next deployment improvements

## Security Considerations

### Pre-deployment Security
- [ ] Security patches applied
- [ ] Dependencies scanned for vulnerabilities
- [ ] Secrets properly managed
- [ ] Access logs reviewed

### Post-deployment Security  
- [ ] Security monitoring active
- [ ] SSL certificate valid
- [ ] Security headers configured
- [ ] Authentication systems working

## Backup Strategy

### Automated Backups
- **Database**: Daily full backup, hourly incremental
- **Media Files**: Daily synchronization to S3
- **Code**: Git repository with tags for releases
- **Configuration**: Infrastructure as Code in Git

### Backup Retention
- **Daily**: Keep for 30 days
- **Weekly**: Keep for 12 weeks  
- **Monthly**: Keep for 12 months
- **Yearly**: Keep for 7 years

## Disaster Recovery

### Recovery Time Objectives (RTO)
- **Staging**: 2 hours
- **Production**: 1 hour

### Recovery Point Objectives (RPO)
- **Database**: 1 hour (last backup)
- **Media Files**: 24 hours
- **Code**: Real-time (Git)

### DR Procedures
1. Assess damage and scope
2. Activate DR team
3. Restore from most recent backup
4. Verify system functionality
5. Update DNS if needed
6. Communicate status to stakeholders

---

## Appendix

### Useful Commands

```bash
# Check Django version
python -c "import django; print(django.get_version())"

# Generate secret key
python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'

# Check database size
python manage.py dbshell -c "\d+"

# List installed packages
pip freeze

# Check disk space
df -h

# Check memory usage
free -h

# Check running processes
ps aux | grep python

# Monitor real-time logs
tail -f /var/log/nginx/error.log
```

### Configuration Files

Key configuration files to verify:
- `markethub/settings/production.py`
- `nginx.conf`
- `gunicorn.service`
- `requirements.txt`
- `.env.production`

### Performance Benchmarks

Expected performance metrics:
- **Homepage load time**: < 2 seconds
- **API response time**: < 500ms
- **Database query time**: < 100ms
- **Static file serving**: < 200ms
- **Memory usage**: < 512MB
- **CPU usage**: < 50%

---

For additional support, consult the project README.md or contact the development team.
