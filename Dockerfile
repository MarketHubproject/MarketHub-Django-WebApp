# Multi-stage Docker build for MarketHub Django application
FROM python:3.11-slim as base

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN groupadd -r appuser && useradd --no-log-init -r -g appuser appuser

# Set work directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Development stage
FROM base as development
ENV DJANGO_SETTINGS_MODULE=markethub.settings.dev
COPY . .
RUN chown -R appuser:appuser /app
USER appuser
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

# Production stage
FROM base as production

# Set production environment
ENV DJANGO_SETTINGS_MODULE=markethub.settings.prod \
    DJANGO_ENVIRONMENT=production

# Copy application code
COPY . .

# Create directories for logs and static files
RUN mkdir -p /var/log/markethub /app/staticfiles /app/media && \
    chown -R appuser:appuser /app /var/log/markethub

# Collect static files
RUN python manage.py collectstatic --noinput --settings=markethub.settings.prod

# Switch to non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health/', timeout=10)"

# Expose port
EXPOSE 8000

# Start command
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "3", "--worker-class", "gevent", "--worker-connections", "1000", "--max-requests", "1000", "--max-requests-jitter", "100", "--timeout", "30", "--keep-alive", "5", "markethub.wsgi:application"]
