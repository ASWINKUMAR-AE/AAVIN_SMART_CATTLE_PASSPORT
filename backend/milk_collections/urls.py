from django.urls import path
from .views import CollectionListView, CollectionSummaryView, NotificationListView, NotificationReadView, NotificationsReadAllView

urlpatterns = [
    path('milk-collections', CollectionListView.as_view()),
    path('milk-collections/summary', CollectionSummaryView.as_view()),
    path('notifications', NotificationListView.as_view()),
    path('notifications/read-all', NotificationsReadAllView.as_view()),
    path('notifications/<uuid:notification_id>/read', NotificationReadView.as_view()),
]
