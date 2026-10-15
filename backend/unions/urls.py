from django.urls import path
from .views import UnionListView, UnionDetailView
urlpatterns = [path('unions', UnionListView.as_view()), path('unions/<uuid:account_id>', UnionDetailView.as_view())]
