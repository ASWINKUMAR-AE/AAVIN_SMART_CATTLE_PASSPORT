from django.contrib import admin
from django.urls import include, path
from accounts.views import FarmerListView, health, ready

urlpatterns = [path("admin/", admin.site.urls), path("api/v1/auth/", include("accounts.urls")),
               path("api/v1/farmers", FarmerListView.as_view()), path("health", health), path("ready", ready)]
