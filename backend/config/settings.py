import os
from datetime import timedelta
from pathlib import Path
from dotenv import load_dotenv
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "")
if not SECRET_KEY:
    raise ImproperlyConfigured("Set DJANGO_SECRET_KEY in backend/.env")
DEBUG = os.environ.get("DJANGO_DEBUG", "false").lower() == "true"
ALLOWED_HOSTS = os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
INSTALLED_APPS = [
    "django.contrib.admin", "django.contrib.auth", "django.contrib.contenttypes",
    "django.contrib.sessions", "django.contrib.messages", "django.contrib.staticfiles",
    "corsheaders", "rest_framework", "rest_framework_simplejwt.token_blacklist", "accounts", "unions", "bmcs", "societies", "farmers",
    # Migration history for the retired apps; they register no runtime models.
    "milk_collections.apps.CollectionsConfig",
    "accounts.migration_history.dispatch.apps.DispatchHistoryConfig",
]
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware", "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware", "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware", "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware", "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
ROOT_URLCONF = "config.urls"
TEMPLATES = [{"BACKEND": "django.template.backends.django.DjangoTemplates", "DIRS": [], "APP_DIRS": True,
              "OPTIONS": {"context_processors": ["django.template.context_processors.request",
              "django.contrib.auth.context_processors.auth", "django.contrib.messages.context_processors.messages"]}}]
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"
DATABASES = {"default": {
    "ENGINE": "django.db.backends.postgresql",
    "HOST": os.environ.get("DATABASE_HOST", "13.232.41.40"),
    "PORT": os.environ.get("DATABASE_PORT", "5432"),
    "NAME": os.environ.get("DATABASE_NAME", "aavin"),
    "USER": os.environ.get("DATABASE_USER", "nivas"),
    "PASSWORD": os.environ.get("DATABASE_PASSWORD", ""),
    "OPTIONS": {"sslmode": os.environ.get("DATABASE_SSLMODE", "require"), "connect_timeout": 15},
    "CONN_MAX_AGE": 60,
}}
AUTH_USER_MODEL = "accounts.User"
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework_simplejwt.authentication.JWTAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "EXCEPTION_HANDLER": "accounts.responses.exception_handler",
    "DEFAULT_THROTTLE_RATES": {"login": "10/min"},
}
SIMPLE_JWT = {"ACCESS_TOKEN_LIFETIME": timedelta(minutes=30), "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
              "ROTATE_REFRESH_TOKENS": False, "BLACKLIST_AFTER_ROTATION": True}
CORS_ALLOWED_ORIGINS = os.environ.get("FRONTEND_ORIGINS", "http://localhost:8081,http://127.0.0.1:8081").split(",")
LANGUAGE_CODE = "en-in"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
