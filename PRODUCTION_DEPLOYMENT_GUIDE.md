# MarketHub Production Deployment Guide

This comprehensive guide covers the production deployment of MarketHub Django e-commerce application with automated CI/CD, monitoring, and infrastructure as code.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Environment Configuration](#environment-configuration)
4. [Database Migration](#database-migration)
5. [Infrastructure Setup](#infrastructure-setup)
6. [CI/CD Pipeline](#cicd-pipeline)
7. [SSL/HTTPS Configuration](#sslhttps-configuration)
8. [Monitoring and Logging](#monitoring-and-logging)
9. [Backup and Recovery](#backup-and-recovery)
10. [Troubleshooting](#troubleshooting)

## Overview

MarketHub uses a modern production architecture with:
- **Django** with PostgreSQL and Redis
- **Whitenoise** for static file serving
- **Docker** containerization
- **Terraform** for infrastructure as code
- **GitHub Actions** for CI/CD
- **Sentry** for error tracking
- **SSL/HTTPS** with automatic certificate management

## Prerequisites

### Required Tools
- Docker and Docker Compose
- Terraform (>= 1.0)
- AWS CLI (if using AWS)
- Git
- Python 3.11+

### Required Accounts/Services
- GitHub account (for CI/CD)
- AWS account (for infrastructure) OR Heroku account
- Sentry account (for error tracking)
- Domain name and DNS management
- Email service (Gmail, SendGrid, etc.)

## Environment Configuration

### 1. Split Settings Architecture

The application uses environment-specific settings:

```
markethub/settings/
├── __init__.py
├── base.py      # Common settings
├── dev.py       # Development settings
└── prod.py      # Production settings
```

### 2. Environment Variables

Copy `.env.production` to `.env` and configure:

```bash
cp .env.production .env
```

**Critical variables to set:**

```env
# Security
SECRET_KEY=your-super-secure-secret-key-here
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# Database
DATABASE_NAME=markethub_prod
DATABASE_USER=markethub_user
DATABASE_PASSWORD=secure_database_password
DATABASE_HOST=your-db-host

# Redis
REDIS_URL=redis://user:password@host:6379/1

# Email
EMAIL_HOST_USER=your-email@domain.com
EMAIL_HOST_PASSWORD=your-app-password

# Stripe (Live)
STRIPE_PUBLISHABLE_KEY_LIVE=pk_live_...
STRIPE_SECRET_KEY_LIVE=sk_live_...
STRIPE_WEBHOOK_SECRET_LIVE=whsec_...

# Monitoring
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

## Database Migration

### PostgreSQL Migration

1. **Install PostgreSQL** (if not using managed service):
```bash
# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# macOS
brew install postgresql
```

2. **Create Production Database**:
```sql
CREATE DATABASE markethub_prod;
CREATE USER markethub_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE markethub_prod TO markethub_user;
ALTER USER markethub_user CREATEDB;
```

3. **Run Migrations**:
```bash
python manage.py migrate --settings=markethub.settings.prod
python manage.py collectstatic --noinput --settings=markethub.settings.prod
```

## Infrastructure Setup

### Option 1: AWS with Terraform

1. **Configure AWS CLI**:
```bash
aws configure
```

2. **Deploy Infrastructure**:
```bash
cd infrastructure/terraform
terraform init
terraform plan -var="domain_name=yourdomain.com" -var="db_password=secure_password"
terraform apply
```

3. **Get Infrastructure Outputs**:
```bash
terraform output database_endpoint
terraform output redis_endpoint
terraform output load_balancer_dns
```

### Option 2: Docker Compose

1. **Production Deployment**:
```bash
# Set environment variables
export DATABASE_PASSWORD=secure_password
export SECRET_KEY=your-secret-key

# Deploy with Docker Compose
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker-compose -f docker-compose.prod.yml exec web python manage.py migrate
docker-compose -f docker-compose.prod.yml exec web python manage.py collectstatic --noinput
```

## CI/CD Pipeline

### GitHub Actions Setup

1. **Configure Secrets** in GitHub repository settings:

```
# AWS Deployment
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY

# Docker Hub
DOCKER_HUB_USERNAME
DOCKER_HUB_ACCESS_TOKEN

# Heroku (alternative)
HEROKU_API_KEY
HEROKU_EMAIL

# Notifications
SLACK_WEBHOOK_URL
```

2. **Pipeline Features**:
- ✅ Code linting (flake8, black, isort)
- ✅ Unit tests with PostgreSQL and Redis
- ✅ Coverage threshold enforcement (≥85%)
- ✅ Security scanning (safety, bandit)
- ✅ Docker image building and pushing
- ✅ Automated deployment to AWS EB or Heroku
- ✅ Database migrations
- ✅ Slack notifications

3. **Deployment Flow**:
```
Push to main → Lint → Test → Security Scan → Build → Deploy → Notify
```

## SSL/HTTPS Configuration

### Automatic SSL with AWS

When using the Terraform configuration, SSL certificates are automatically managed via AWS Certificate Manager (ACM).

### Manual Let's Encrypt Setup

1. **Install Certbot**:
```bash
sudo apt-get install certbot python3-certbot-nginx
```

2. **Generate Certificate**:
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

3. **Auto-renewal**:
```bash
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### SSL Configuration Verification

The production settings enforce SSL:
- `SECURE_SSL_REDIRECT = True`
- `SECURE_HSTS_SECONDS = 31536000` (1 year)
- `SECURE_HSTS_INCLUDE_SUBDOMAINS = True`
- `SESSION_COOKIE_SECURE = True`
- `CSRF_COOKIE_SECURE = True`

## Monitoring and Logging

### Health Check Endpoints

- `/health/` - Basic health check for load balancers
- `/health/detailed/` - Detailed health check with dependency status
- `/health/ready/` - Kubernetes readiness probe
- `/health/live/` - Kubernetes liveness probe

### Sentry Error Tracking

1. **Create Sentry Project** at https://sentry.io
2. **Configure DSN** in environment variables
3. **Test Error Tracking**:
```python
# In Django shell
from sentry_sdk import capture_exception
try:
    1/0
except Exception as e:
    capture_exception(e)
```

### JSON Logging

Production logs are output in JSON format for easy parsing:

```json
{
  "asctime": "2024-01-15T10:30:00",
  "name": "django.request",
  "levelname": "INFO",
  "message": "GET /api/products/ 200",
  "pathname": "/app/homepage/views.py",
  "lineno": 45
}
```

### Log Files

- `/var/log/markethub/markethub.log` - Application logs
- `/var/log/markethub/markethub-error.log` - Error logs only

## Backup and Recovery

### Automated Database Backups

The Docker Compose configuration includes an optional backup service:

```bash
# Enable backup service
docker-compose -f docker-compose.prod.yml --profile backup up -d backup

# Manual backup
docker-compose -f docker-compose.prod.yml exec db pg_dump -U markethub_user markethub_prod > backup_$(date +%Y%m%d).sql
```

### Backup Strategy

- **Daily** automated backups via Docker service
- **Weekly** full database exports
- **Real-time** replication for critical data
- **Retention** policy: 7 days local, 30 days offsite

## Security Checklist

- ✅ SECRET_KEY is unique and secure
- ✅ DEBUG = False in production
- ✅ HTTPS/SSL enforced
- ✅ Database credentials are secure
- ✅ Redis authentication enabled
- ✅ Security headers configured
- ✅ CSP (Content Security Policy) active
- ✅ Rate limiting enabled
- ✅ Regular security scans in CI/CD

## Performance Optimization

### Static File Serving

Whitenoise handles static files with:
- **Compression** (gzip/brotli)
- **Long-term caching**
- **CDN compatibility**

### Database Connection Pooling

Production uses `django-postgrespool2`:
- **Max connections**: 20
- **Min connections**: 5
- **Connection reuse**

### Caching Strategy

Redis provides:
- **Session storage**
- **Database query caching**
- **Template fragment caching**

## Scaling Considerations

### Horizontal Scaling

- Load balancer distributes traffic
- Multiple application instances
- Shared database and Redis

### Vertical Scaling

- Increase CPU/memory for containers
- Database connection pool tuning
- Redis memory optimization

## Troubleshooting

### Common Issues

1. **Database Connection Errors**:
   - Check DATABASE_* environment variables
   - Verify network connectivity
   - Check PostgreSQL logs

2. **Static Files Not Loading**:
   - Run `collectstatic` command
   - Check STATIC_ROOT permissions
   - Verify Whitenoise configuration

3. **SSL Certificate Issues**:
   - Check domain DNS settings
   - Verify certificate expiration
   - Check Load Balancer configuration

4. **High Memory Usage**:
   - Check database connection pool settings
   - Monitor Redis memory usage
   - Review application code for memory leaks

### Health Check Debugging

```bash
# Check application health
curl https://yourdomain.com/health/detailed/

# Check specific components
docker-compose -f docker-compose.prod.yml exec web python manage.py check
docker-compose -f docker-compose.prod.yml exec db pg_isready
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping
```

### Log Analysis

```bash
# Follow application logs
docker-compose -f docker-compose.prod.yml logs -f web

# Check error logs only
docker-compose -f docker-compose.prod.yml exec web tail -f /var/log/markethub/markethub-error.log

# Database query logs
docker-compose -f docker-compose.prod.yml logs db | grep "LOG:"
```

## Maintenance

### Regular Tasks

- **Weekly**: Review error logs and performance metrics
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Review and test backup/recovery procedures
- **Annually**: Security audit and penetration testing

### Updates and Deployments

1. **Staging Environment**: Always test in staging first
2. **Blue-Green Deployment**: Zero-downtime deployments
3. **Database Migrations**: Use Django migrations with care
4. **Rollback Plan**: Always have a rollback strategy

## Support and Documentation

- **Application Logs**: `/var/log/markethub/`
- **Health Checks**: `/health/detailed/`
- **Admin Interface**: `/admin/`
- **API Documentation**: `/api/`
- **Sentry Dashboard**: Error tracking and performance monitoring

---

For additional support or questions, please refer to the project documentation or contact the development team.
