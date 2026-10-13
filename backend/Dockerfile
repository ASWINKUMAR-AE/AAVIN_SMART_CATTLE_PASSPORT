# Build from the project root: docker build -t aavin-backend ./backend
# Run: docker run --rm -p 4000:4000 --env-file backend/.env aavin-backend
# Apply migrations separately:
# docker run --rm --env-file backend/.env aavin-backend python manage.py migrate

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    DJANGO_DEBUG=false

WORKDIR /app

COPY requirements.txt ./requirements.txt
RUN python -m pip install --no-compile -r requirements.txt "gunicorn>=23,<24"

RUN groupadd --system aavin \
    && useradd --system --gid aavin --home-dir /app aavin \
    && chown aavin:aavin /app

# Copy application files explicitly so local credentials and the virtual
# environment are not included in the image.
COPY --chown=aavin:aavin manage.py ./manage.py
COPY --chown=aavin:aavin config/ ./config/
COPY --chown=aavin:aavin accounts/ ./accounts/

USER aavin

EXPOSE 8000

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "2", "--timeout", "60", "--access-logfile", "-", "--error-logfile", "-"]
