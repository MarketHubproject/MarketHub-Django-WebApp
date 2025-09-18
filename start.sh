#!/bin/bash
# Start script for MarketHub on Render

echo "🚀 Starting MarketHub Django WebApp..."

# Set default port if not provided
PORT=${PORT:-10000}

echo "📡 Starting gunicorn server on port $PORT..."

# Start gunicorn with proper configuration
exec python -m gunicorn markethub.wsgi:application \
    --bind 0.0.0.0:$PORT \
    --workers 2 \
    --timeout 120 \
    --keep-alive 2 \
    --max-requests 1000 \
    --max-requests-jitter 100 \
    --log-level info \
    --access-logfile - \
    --error-logfile -