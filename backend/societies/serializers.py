from rest_framework import serializers
from .collection_serializers import CreateCollectionSerializer, CollectionSerializer
from .models import Vendor, VendorMilkCollection, FarmerAttendance


class VendorSerializer(serializers.ModelSerializer):
    vehicleNumber = serializers.CharField(source='vehicle_number', max_length=32, required=False, allow_blank=True)
    vehicleType = serializers.CharField(source='vehicle_type', max_length=64, required=False, allow_blank=True)
    routeName = serializers.CharField(source='route_name', max_length=150, required=False, allow_blank=True)
    isActive = serializers.BooleanField(source='is_active', required=False)

    class Meta:
        model = Vendor
        fields = ['id', 'code', 'name', 'phone', 'vehicleNumber', 'vehicleType', 'routeName', 'isActive']
        read_only_fields = ['id']

    def validate_code(self, value):
        value = value.strip().upper()
        query = Vendor.objects.filter(society_id=self.context['request'].user.pk, code=value)
        if self.instance:
            query = query.exclude(pk=self.instance.pk)
        if query.exists():
            raise serializers.ValidationError('Vendor code already exists in this society.')
        return value


class VendorCollectionInput(CreateCollectionSerializer):
    farmerId = None
    vendorId = serializers.UUIDField()
    submissionKey = serializers.UUIDField()


class ReceiptInput(serializers.Serializer):
    collectionDate = serializers.DateField()
    session = serializers.ChoiceField(choices=['morning', 'evening', 'full_day'])
    includedRecordIds = serializers.ListField(child=serializers.UUIDField(), allow_empty=False, max_length=10000)
    submissionKey = serializers.UUIDField()
    notes = serializers.CharField(max_length=1000, required=False, allow_blank=True, default='')

    def validate_collectionDate(self, value):
        return CreateCollectionSerializer().validate_collectionDate(value)

    def validate_includedRecordIds(self, value):
        if len(set(value)) != len(value):
            raise serializers.ValidationError('Duplicate collection IDs are not allowed.')
        return value


def collection_data(record):
    if not isinstance(record, VendorMilkCollection):
        return CollectionSerializer(record).data
    item = getattr(record, 'dispatch_item', None)
    return {'id': str(record.pk), 'boothId': str(record.society_id), 'boothName': record.society.user.full_name,
            'vendorId': str(record.vendor_id), 'vendorName': record.vendor.name,
            'farmerId': None, 'farmerName': None, 'collectionDate': record.collection_date.isoformat(),
            'session': record.session, 'quantityLitres': format(record.quantity_litres, '.2f'),
            'notes': record.notes, 'createdBy': record.created_by.full_name, 'createdAt': record.created_at.isoformat(),
            'route': 'vendor', 'measurementMethod': 'combined',
            'receiptId': str(item.receipt_id) if item else None, 'status': 'included_in_receipt' if item else 'recorded'}


def receipt_data(receipt):
    items = list(receipt.items.all())
    return {'id': str(receipt.pk), 'boothId': str(receipt.society_id), 'boothName': receipt.society_name,
            'bmcId': str(receipt.bmc_id), 'bmcName': receipt.bmc_name, 'collectionDate': receipt.collection_date.isoformat(),
            'session': receipt.session, 'dispatchQuantity': format(receipt.dispatch_quantity, '.2f'),
            'farmerQuantity': format(receipt.farmer_quantity, '.2f'), 'vendorQuantity': format(receipt.vendor_quantity, '.2f'),
            'measurementBasis': 'mixed' if receipt.farmer_quantity and receipt.vendor_quantity else 'combined' if receipt.vendor_quantity else 'farmer_wise',
            'includedRecordIds': [str(item.farmer_collection_id or item.vendor_collection_id) for item in items],
            'totalRecordsCount': len(items), 'totalFarmersCount': receipt.total_farmers_count,
            'createdAt': receipt.created_at.isoformat(), 'createdBy': receipt.created_by.full_name,
            'status': receipt.status, 'verificationCode': str(receipt.verification_code), 'notes': receipt.notes}


def delivery_data(delivery):
    receipt = delivery.receipt
    return {'id': str(delivery.pk), 'boothReceiptId': str(receipt.pk), 'boothId': str(receipt.society_id),
            'boothName': receipt.society_name, 'bmcId': str(receipt.bmc_id),
            'collectionDate': receipt.collection_date.isoformat(), 'dispatchTime': delivery.dispatched_at.isoformat(),
            'declaredDispatchQuantity': format(receipt.dispatch_quantity, '.2f'), 'status': delivery.status,
            'backendSynced': True}


class AttendanceSerializer(serializers.ModelSerializer):
    farmerId = serializers.UUIDField(source='farmer_id')
    farmerName = serializers.CharField(source='farmer.user.full_name')
    collectionDate = serializers.DateField(source='collection_date')

    class Meta:
        model = FarmerAttendance
        fields = ['id', 'farmerId', 'farmerName', 'collectionDate', 'session']
