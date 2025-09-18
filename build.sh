#!/usr/bin/env bash
# build.sh - Render build script for MarketHub Django App

set -o errexit  # exit on error

# Install Python dependencies
echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Install Node.js dependencies (if needed for frontend assets)
if [ -f "package.json" ]; then
    echo "Installing Node.js dependencies..."
    npm ci
    echo "Building frontend assets..."
    npm run build 2>/dev/null || echo "No npm build script found, skipping..."
fi

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput --clear

# Apply database migrations
echo "Applying database migrations..."
python manage.py migrate --noinput

# Create superuser if it doesn't exist (optional)
echo "Creating superuser if needed..."
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'changeme123')
    print('Superuser created: admin/changeme123')
else:
    print('Superuser already exists')
" || echo "Could not create superuser, continuing..."

# Load initial data if fixtures exist
if [ -d "fixtures" ] && [ "$(ls -A fixtures)" ]; then
    echo "Loading initial data from fixtures..."
    python manage.py loaddata fixtures/*.json || echo "Could not load fixtures, continuing..."
fi

echo "Build completed successfully!"