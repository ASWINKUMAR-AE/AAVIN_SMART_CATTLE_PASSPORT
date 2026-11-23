from django.urls import path
from .views import (
    FarmerListView, FarmerDetailView, NotificationListView, NotificationReadView, NotificationsReadAllView,
    CowScanView, CowListView, CowDetailView
)

urlpatterns = [
    path('farmers', FarmerListView.as_view()),
    path('farmers/<uuid:farmer_id>', FarmerDetailView.as_view()),
    path('notifications', NotificationListView.as_view()),
    path('notifications/read-all', NotificationsReadAllView.as_view()),
    path('notifications/<uuid:notification_id>/read', NotificationReadView.as_view()),
    path('cows/scan/<str:tag_id>', CowScanView.as_view()),
    path('cows', CowListView.as_view()),
    path('cows/<str:cow_id>', CowDetailView.as_view()),
]
