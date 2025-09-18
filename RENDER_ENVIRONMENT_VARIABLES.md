# MarketHub - Render Environment Variables

## 🔧 Complete Environment Variables for Render Dashboard

Copy and paste these **name-value pairs** into your Render service environment variables section:

---

## 🔒 Core Django Settings

### SECRET_KEY
```
django-prod-key-render-change-this-to-strong-random-key-12345678901234567890
```
**Important**: Generate a new secret key for production. You can use Django's `get_random_secret_key()` or an online generator.

### DEBUG
```
False
```

### DJANGO_SETTINGS_MODULE
```
markethub.settings_production
```

### ALLOWED_HOSTS
```
.onrender.com,localhost,127.0.0.1
```
**Note**: Replace with your custom domain if you have one (e.g., `yourdomain.com,.onrender.com`)

### SITE_URL
```
https://your-app-name.onrender.com
```
**Note**: Replace `your-app-name` with your actual Render service name

---

## 💾 Database Settings

### DATABASE_URL
```
postgresql://user:password@host:port/database
```
**Note**: This will be automatically set by Render when you use the Blueprint. Don't manually set this.

---

## 📁 Static Files

### STATIC_URL
```
/static/
```

### STATIC_ROOT
```
./staticfiles
```

---

## 💳 Stripe Payment Settings

### PAYMENT_ENV
```
test
```
**Note**: Change to `live` when ready for production payments

### STRIPE_PUBLISHABLE_KEY
```
pk_test_51234567890abcdef
```
**Note**: Replace with your actual Stripe publishable key from Stripe Dashboard

### STRIPE_SECRET_KEY
```
sk_test_51234567890abcdef
```
**Note**: Replace with your actual Stripe secret key from Stripe Dashboard

### STRIPE_WEBHOOK_SECRET
```
whsec_test_51234567890abcdef
```
**Note**: Replace with your actual webhook secret from Stripe Dashboard

---

## 📧 Email Configuration

### EMAIL_BACKEND
```
django.core.mail.backends.console.EmailBackend
```
**Note**: For production, change to `django.core.mail.backends.smtp.EmailBackend`

### EMAIL_HOST (Optional - for production email)
```
smtp.gmail.com
```

### EMAIL_PORT (Optional - for production email)
```
587
```

### EMAIL_USE_TLS (Optional - for production email)
```
True
```

### EMAIL_HOST_USER (Optional - for production email)
```
your-email@gmail.com
```

### EMAIL_HOST_PASSWORD (Optional - for production email)
```
your-app-password
```

### DEFAULT_FROM_EMAIL (Optional)
```
noreply@your-app-name.onrender.com
```

---

## 🚀 Performance & Caching

### REDIS_URL
```
redis://red-xxxxx:6379
```
**Note**: This will be automatically set by Render when using Redis service

### WEB_CONCURRENCY
```
4
```

---

## 🔐 Security Settings

### CSRF_TRUSTED_ORIGINS
```
https://your-app-name.onrender.com
```
**Note**: Replace with your actual domain

---

## 📊 API Configuration

### API_BASE_URL
```
https://your-app-name.onrender.com/api/
```

### API_THROTTLE_ANON
```
100/hour
```

### API_THROTTLE_USER
```
1000/hour
```

---

## 🎯 Monitoring (Optional)

### SENTRY_DSN (Optional)
```
https://your-sentry-dsn@sentry.io/project-id
```
**Note**: Only add if you're using Sentry for error tracking

### SENTRY_TRACES_SAMPLE_RATE (Optional)
```
0.1
```

### DJANGO_LOG_LEVEL
```
INFO
```
**Note**: Use `DEBUG` for more verbose logging during initial deployment

### ENVIRONMENT
```
production
```

---

## 🎯 Quick Copy-Paste Format for Render Dashboard

Here are the variables in **Name = Value** format for easy copying:

```
SECRET_KEY=django-prod-key-render-change-this-to-strong-random-key-12345678901234567890
DEBUG=False
DJANGO_SETTINGS_MODULE=markethub.settings_production
ALLOWED_HOSTS=.onrender.com,localhost,127.0.0.1
SITE_URL=https://your-app-name.onrender.com
STATIC_URL=/static/
STATIC_ROOT=./staticfiles
PAYMENT_ENV=test
STRIPE_PUBLISHABLE_KEY=pk_test_51234567890abcdef
STRIPE_SECRET_KEY=sk_test_51234567890abcdef
STRIPE_WEBHOOK_SECRET=whsec_test_51234567890abcdef
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
WEB_CONCURRENCY=4
CSRF_TRUSTED_ORIGINS=https://your-app-name.onrender.com
API_BASE_URL=https://your-app-name.onrender.com/api/
API_THROTTLE_ANON=100/hour
API_THROTTLE_USER=1000/hour
DJANGO_LOG_LEVEL=INFO
ENVIRONMENT=production
```

---

## ⚠️ Important Notes

### 🔄 Variables Set Automatically by Render
These variables are **automatically set** by Render when using the Blueprint - **do not manually add them**:
- `DATABASE_URL` (set by PostgreSQL service)
- `REDIS_URL` (set by Redis service)

### 🔑 Must Replace Before Deployment
These variables **MUST be updated** with your real values:
- `SECRET_KEY` - Generate a strong random key
- `STRIPE_PUBLISHABLE_KEY` - From your Stripe dashboard
- `STRIPE_SECRET_KEY` - From your Stripe dashboard  
- `STRIPE_WEBHOOK_SECRET` - From your Stripe webhook configuration
- `SITE_URL` - Your actual Render app URL
- `ALLOWED_HOSTS` - Your actual domain(s)
- `CSRF_TRUSTED_ORIGINS` - Your actual domain(s)
- `API_BASE_URL` - Your actual API URL

### 📝 Optional Variables
These can be added later for enhanced functionality:
- Email settings (for production email sending)
- Sentry DSN (for error monitoring)
- Custom domain settings

---

## 🚀 Deployment Steps

1. **In Render Dashboard**:
   - Go to your service → Environment
   - Add each variable with Name and Value
   - Click "Save Changes"

2. **Update URLs**:
   - Replace `your-app-name` with your actual Render service name
   - Update domain references after deployment

3. **Test Deployment**:
   - Check `/health/` endpoint
   - Verify admin login works
   - Test payment flow (if configured)

Your MarketHub Django app will be ready to serve customers! 🎉