from django.urls import path
from .accounts import BMCListView, BMCDetailView
urlpatterns = [path('bmcs', BMCListView.as_view()), path('bmcs/<uuid:account_id>', BMCDetailView.as_view())]
