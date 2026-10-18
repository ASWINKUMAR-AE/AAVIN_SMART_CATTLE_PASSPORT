from collections.abc import Mapping
from decimal import Decimal
from zoneinfo import ZoneInfo
from django.utils import timezone
from rest_framework import serializers
from .models import FarmerMilkCollection


def india_today():
    return timezone.localdate(timezone=ZoneInfo('Asia/Kolkata'))


class CreateCollectionSerializer(serializers.Serializer):
    farmerId = serializers.UUIDField()
    vendorId = serializers.UUIDField(required=False, allow_null=True)
    quantityLitres = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01'))
    collectionDate = serializers.DateField()
    session = serializers.ChoiceField(choices=['morning', 'evening'])
    notes = serializers.CharField(max_length=1000, required=False, allow_blank=True, default='')

    def to_internal_value(self, data):
        if not isinstance(data, Mapping):
            raise serializers.ValidationError('Expected a JSON object.')
        extra = set(data) - set(self.fields)
        if extra:
            raise serializers.ValidationError({key: 'Unexpected field.' for key in extra})
        return super().to_internal_value(data)

    def validate_collectionDate(self, value):
        if value > india_today():
            raise serializers.ValidationError('Future collection dates are not allowed.')
        return value


class CollectionSerializer(serializers.ModelSerializer):
    vendorId = serializers.UUIDField(source='vendor_id', allow_null=True)
    vendorName = serializers.CharField(source='vendor.name', default=None)
    route = serializers.SerializerMethodField()
    measurementMethod = serializers.SerializerMethodField()
    receiptId = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    def get_route(self, obj):
        return 'vendor' if obj.vendor_id else 'direct'

    def get_measurementMethod(self, obj):
        return 'farmer_wise'

    def get_receiptId(self, obj):
        item = getattr(obj, 'dispatch_item', None)
        return str(item.receipt_id) if item else None

    def get_status(self, obj):
        return 'included_in_receipt' if getattr(obj, 'dispatch_item', None) else 'recorded'

    farmerId = serializers.UUIDField(source='farmer_id')
    farmerName = serializers.CharField(source='farmer.user.full_name')
    boothId = serializers.UUIDField(source='society_id')
    boothName = serializers.CharField(source='society.user.full_name')
    createdBy = serializers.CharField(source='created_by.full_name')
    collectionDate = serializers.DateField(source='collection_date')
    quantityLitres = serializers.DecimalField(source='quantity_litres', max_digits=10, decimal_places=2)
    createdAt = serializers.DateTimeField(source='created_at')

    class Meta:
        model = FarmerMilkCollection
        fields = ['id', 'farmerId', 'farmerName', 'boothId', 'boothName', 'createdBy', 'collectionDate', 'quantityLitres', 'session', 'notes', 'createdAt', 'vendorId', 'vendorName', 'route', 'measurementMethod', 'receiptId', 'status']


