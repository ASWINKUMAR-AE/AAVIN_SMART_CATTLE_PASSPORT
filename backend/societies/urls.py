from django.urls import path
from .accounts import SocietyListView, SocietyDetailView
from .collections import CollectionListView, CollectionSummaryView

urlpatterns = [path('societies', SocietyListView.as_view()), path('societies/<uuid:account_id>', SocietyDetailView.as_view()), path('milk-collections', CollectionListView.as_view()), path('milk-collections/summary', CollectionSummaryView.as_view())]
