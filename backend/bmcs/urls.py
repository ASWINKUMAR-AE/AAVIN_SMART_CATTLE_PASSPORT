from django.urls import path
from .views import DeliveryListView
urlpatterns = [path('bmc-deliveries', DeliveryListView.as_view())]
