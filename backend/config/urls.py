from django.contrib import admin
from django.urls import include, path
from accounts.views import health, ready

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/auth/', include('accounts.urls')),
    path('api/v1/', include('farmers.urls')),
    path('api/v1/', include('societies.urls')),
    path('api/v1/', include('bmcs.account_urls')),
    path('api/v1/', include('unions.urls')),
    path('api/v1/workflow/', include('societies.workflow_urls')),
    path('api/v1/workflow/', include('bmcs.urls')),
    path('health', health), path('ready', ready),
]
