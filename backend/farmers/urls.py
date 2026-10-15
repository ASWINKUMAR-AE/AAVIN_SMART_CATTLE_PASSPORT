from django.urls import path
from .views import FarmerListView, FarmerDetailView, NotificationListView, NotificationReadView, NotificationsReadAllView

urlpatterns = [
    path('farmers', FarmerListView.as_view()),
    path('farmers/<uuid:farmer_id>', FarmerDetailView.as_view()),
    path('notifications', NotificationListView.as_view()),
    path('notifications/read-all', NotificationsReadAllView.as_view()),
    path('notifications/<uuid:notification_id>/read', NotificationReadView.as_view()),
]
