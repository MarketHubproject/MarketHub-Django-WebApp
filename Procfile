web: python -m gunicorn markethub.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 120 --keep-alive 2 --max-requests 1000
release: python manage.py collectstatic --noinput && python manage.py migrate --noinput
