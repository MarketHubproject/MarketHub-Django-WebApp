# MarketHub Deployment Guide

## Environment Configuration

MarketHub uses environment variables for configuration management through `python-decouple`. This allows for secure, flexible deployment across different environments.

### Environment Files

1. **`.env`** - Development environment (not committed to git)
2. **`.env.example`** - Template file showing required variables
3. **Production** - Environment variables set directly on server

### Required Environment Variables

#### Core Django Settings
```bash
SECRET_KEY=your-secret-key-here
DEBUG=True/False
ALLOWED_HOSTS=localhost,127.0.0.1,yourdomain.com
```

#### Database Configuration
```bash
DATABASE_ENGINE=django.db.backends.sqlite3
DATABASE_NAME=db.sqlite3
DATABASE_USER=
DATABASE_PASSWORD=
DATABASE_HOST=
DATABASE_PORT=
```

#### API Configuration
```bash
API_BASE_URL=http://127.0.0.1:8000/api/
FRONTEND_API_URL=http://127.0.0.1:8000/api/
```

#### Static and Media Files
```bash
STATIC_URL=/static/
MEDIA_URL=/media/
```

#### Email Configuration
```bash
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
EMAIL_HOST=
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
```

#### Security Settings (Production)
```bash
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SECURE_BROWSER_XSS_FILTER=True
SECURE_CONTENT_TYPE_NOSNIFF=True
```

#### Cache and Logging
```bash
CACHE_BACKEND=django.core.cache.backends.locmem.LocMemCache
CACHE_LOCATION=unique-snowflake
LOG_LEVEL=INFO
```

#### REST Framework
```bash
DRF_PAGE_SIZE=20
DRF_DEFAULT_PERMISSION=rest_framework.permissions.IsAuthenticatedOrReadOnly
```

## Deployment Steps

### 1. Development Setup
```bash
# Clone repository
git clone <repository-url>
cd markethub

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env

# Edit .env with your values
# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Collect static files
python manage.py collectstatic

# Run development server
python manage.py runserver
```

### 2. Production Deployment

#### Database Migration
For production, consider using PostgreSQL:
```bash
pip install psycopg2-binary
```

Update your `.env`:
```bash
DATABASE_ENGINE=django.db.backends.postgresql
DATABASE_NAME=markethub_production
DATABASE_USER=markethub_user
DATABASE_PASSWORD=secure_password
DATABASE_HOST=localhost
DATABASE_PORT=5432
```

#### Web Server Configuration
Use Gunicorn + Nginx for production:

```bash
# Install Gunicorn
pip install gunicorn

# Run with Gunicorn
gunicorn markethub.wsgi:application --bind 0.0.0.0:8000
```

#### Static Files
Configure your web server to serve static files directly:
```bash
python manage.py collectstatic --noinput
```

### 3. Environment-Specific Configurations

#### Development (.env)
```bash
DEBUG=True
SECRET_KEY=development-key
DATABASE_ENGINE=django.db.backends.sqlite3
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

#### Staging (.env.staging)
```bash
DEBUG=False
SECRET_KEY=staging-secret-key
DATABASE_ENGINE=django.db.backends.postgresql
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
ALLOWED_HOSTS=staging.yourdomain.com
```

#### Production (.env.production)
```bash
DEBUG=False
SECRET_KEY=super-secure-production-key
DATABASE_ENGINE=django.db.backends.postgresql
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
```

## API Integration

The frontend uses environment variables to communicate with the backend API:

- `API_BASE_URL` is available in templates via context processor
- JavaScript API client uses this URL for all requests
- Configure different API URLs for different environments

## Security Considerations

1. **Never commit `.env` files** to version control
2. **Use strong SECRET_KEY** in production
3. **Enable HTTPS** in production (`SECURE_SSL_REDIRECT=True`)
4. **Configure proper ALLOWED_HOSTS**
5. **Use environment-specific database credentials**
6. **Enable security middleware** for production

## Monitoring and Logging

The application includes comprehensive logging configuration:
- File logging: `debug.log`
- Console logging for development
- Configurable log levels via `LOG_LEVEL` environment variable

## Scaling Considerations

- **Database**: Migrate from SQLite to PostgreSQL for production
- **Cache**: Use Redis for production caching
- **Static Files**: Use CDN for static file delivery
- **Load Balancer**: Use multiple application instances with load balancer

## Backup Strategy

1. **Database backups**: Regular automated backups
2. **Media files**: Backup uploaded files
3. **Environment configuration**: Secure backup of environment variables

## Health Checks

The application supports health checks for monitoring:
- Database connectivity
- API endpoints
- Static file serving

## Troubleshooting

### Common Issues

1. **Missing environment variables**: Check `.env` file exists and has correct values
2. **Database connection errors**: Verify database settings and credentials
3. **Static files not loading**: Run `collectstatic` and check web server configuration
4. **API endpoints not working**: Check CORS settings and authentication

### Debug Mode

Enable debug mode in development:
```bash
DEBUG=True
LOG_LEVEL=DEBUG
```

This provides detailed error pages and logging for troubleshooting.
