from django.shortcuts import get_object_or_404
from rest_framework import serializers
from rest_framework.views import APIView
from accounts.responses import success
from accounts.pagination import page_data
from societies.views import scoped_receipts, Data
from societies.serializers import delivery_data
from .models import BMCDelivery


class DeliveryListView(APIView):
    def get(self, request):
        query = BMCDelivery.objects.filter(receipt__in=scoped_receipts(request.user)).select_related('receipt')
        if 'collectionDate' in request.query_params:
            query = query.filter(receipt__collection_date=serializers.DateField().run_validation(request.query_params['collectionDate']))
        return success(page_data(request, query, lambda rows, many: Data([delivery_data(r) for r in rows])))
