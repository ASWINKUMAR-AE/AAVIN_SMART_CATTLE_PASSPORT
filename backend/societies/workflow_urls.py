from django.urls import path
from . import views

urlpatterns = [
    path('context', views.WorkflowContextView.as_view()),
    path('vendors', views.VendorListView.as_view()),
    path('vendors/<uuid:vendor_id>', views.VendorDetailView.as_view()),
    path('vendor-milk-collections', views.VendorCollectionListView.as_view()),
    path('milk-transactions', views.MilkTransactionListView.as_view()),
    path('farmer-attendance', views.AttendanceListView.as_view()),
    path('booth-review', views.CollectionReviewView.as_view()),
    path('booth-receipts', views.ReceiptListView.as_view()),
    path('booth-receipts/<uuid:receipt_id>', views.ReceiptDetailView.as_view()),
    path('booth-receipts/<uuid:receipt_id>/send', views.ReceiptSendView.as_view()),
]
