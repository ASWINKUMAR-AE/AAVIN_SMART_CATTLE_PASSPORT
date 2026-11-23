from rest_framework import serializers
from .models import CollectionNotification


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
