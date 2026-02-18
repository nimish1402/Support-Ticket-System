#!/bin/sh

echo "Waiting for PostgreSQL..."

while ! python -c "
import psycopg2, os, sys
try:
    psycopg2.connect(
        dbname=os.environ.get('DB_NAME', 'tickets_db'),
        user=os.environ.get('DB_USER', 'postgres'),
        password=os.environ.get('DB_PASSWORD', 'postgres'),
        host=os.environ.get('DB_HOST', 'db'),
        port=os.environ.get('DB_PORT', '5432'),
    )
    sys.exit(0)
except Exception:
    sys.exit(1)
" 2>/dev/null; do
    echo "PostgreSQL unavailable - sleeping 1s"
    sleep 1
done

echo "PostgreSQL is up - running migrations"
python manage.py migrate --noinput

echo "Starting server"
exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 3
