web: python3 -m gunicorn markethub.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 120 --keep-alive 2 --max-requests 1000
release: python3 manage.py collectstatic --noinput && python3 manage.py migrate --noinput
