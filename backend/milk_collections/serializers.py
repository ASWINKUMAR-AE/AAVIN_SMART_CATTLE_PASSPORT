from collections.abc import Mapping
from decimal import Decimal
from zoneinfo import ZoneInfo
from django.utils import timezone
from rest_framework import serializers
from .models import FarmerMilkCollection, CollectionNotification


def india_today():
    return timezone.localdate(timezone=ZoneInfo('Asia/Kolkata'))


class CreateCollectionSerializer(serializers.Serializer):
    farmerId = serializers.UUIDField()
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
    farmerId = serializers.UUIDField(source='farmer_id')
    farmerName = serializers.CharField(source='farmer.full_name')
    boothId = serializers.UUIDField(source='society_id')
    boothName = serializers.CharField(source='society.full_name')
    createdBy = serializers.CharField(source='created_by.full_name')
    collectionDate = serializers.DateField(source='collection_date')
    quantityLitres = serializers.DecimalField(source='quantity_litres', max_digits=10, decimal_places=2)
    createdAt = serializers.DateTimeField(source='created_at')

    class Meta:
        model = FarmerMilkCollection
        fields = ['id', 'farmerId', 'farmerName', 'boothId', 'boothName', 'createdBy', 'collectionDate', 'quantityLitres', 'session', 'notes', 'createdAt']


class NotificationSerializer(serializers.ModelSerializer):
    recipientId = serializers.UUIDField(source='recipient_id')
    referenceId = serializers.UUIDField(source='collection_id')
    isRead = serializers.BooleanField(source='is_read')
    timestamp = serializers.DateTimeField(source='created_at')
    recipientRole = serializers.SerializerMethodField()
    type = serializers.SerializerMethodField()
    linkRoute = serializers.SerializerMethodField()

    def get_recipientRole(self, obj):
        return 'farmer'

    def get_type(self, obj):
        return 'milk_recorded'

    def get_linkRoute(self, obj):
        return '/(farmer)/milk-history'

    class Meta:
        model = CollectionNotification
        fields = ['id', 'recipientId', 'recipientRole', 'referenceId', 'title', 'message', 'isRead', 'timestamp', 'type', 'linkRoute']
