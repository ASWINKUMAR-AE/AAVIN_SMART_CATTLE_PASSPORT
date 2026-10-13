from django.contrib import admin
from django.urls import include, path
from accounts.views import health, ready

urlpatterns = [path("admin/", admin.site.urls), path("api/v1/auth/", include("accounts.urls")),
               path("health", health), path("ready", ready)]
