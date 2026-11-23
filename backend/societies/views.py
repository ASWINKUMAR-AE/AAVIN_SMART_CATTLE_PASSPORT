from decimal import Decimal
from django.db import transaction, IntegrityError
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied, APIException
from rest_framework.views import APIView
from accounts.models import User
from accounts.responses import success
from .models import FarmerMilkCollection, Society
from farmers.models import Farmer
from bmcs.models import BMC, BMCDelivery
from .collection_serializers import india_today
from accounts.pagination import page_data
from .models import Vendor, VendorMilkCollection, FarmerAttendance, SocietyDispatchReceipt, DispatchReceiptItem
from .serializers import (VendorSerializer, VendorCollectionInput, ReceiptInput, AttendanceSerializer,
                          collection_data, receipt_data, delivery_data)


class Conflict(APIException):
    status_code = 409
    default_detail = 'These collections are already in a receipt, or this request was previously saved with different values.'


def society_only(user):
    if user.role != User.Role.SOCIETY:
        raise PermissionDenied('Only Society accounts can perform this action.')


def scoped_receipts(user):
    query = SocietyDispatchReceipt.objects.select_related('created_by').prefetch_related('items')
    if user.role == User.Role.SOCIETY:
        return query.filter(society_id=user.pk)
    if user.role == User.Role.BMC:
        return query.filter(bmc_id=user.pk, status='sent_to_bmc')
    raise PermissionDenied('Only Society and BMC accounts can access dispatches.')


def filtered(request, query):
    if 'collectionDate' in request.query_params:
        query = query.filter(collection_date=serializers.DateField().run_validation(request.query_params['collectionDate']))
    if 'session' in request.query_params:
        shift = serializers.ChoiceField(choices=['morning', 'evening', 'full_day']).run_validation(request.query_params['session'])
        if shift != 'full_day':
            query = query.filter(session=shift)
    return query


def milk_queries(request):
    society_only(request.user)
    farmer = filtered(request, FarmerMilkCollection.objects.filter(society_id=request.user.pk).select_related('farmer__user', 'society__user', 'created_by', 'vendor', 'dispatch_item'))
    vendor = filtered(request, VendorMilkCollection.objects.filter(society_id=request.user.pk).select_related('vendor', 'society__user', 'created_by', 'dispatch_item'))
    return farmer, vendor


class WorkflowContextView(APIView):
    def get(self, request):
        user = request.user
        if user.role == User.Role.SOCIETY:
            society = get_object_or_404(Society.objects.select_related('bmc__user'), pk=user.pk)
            bmc = society.bmc
            if not bmc.user.is_active:
                raise serializers.ValidationError('This society has no active linked BMC.')
            farmers = Farmer.objects.filter(society=society, user__is_active=True).select_related('user')
            return success({'society': {'id': str(society.pk), 'name': user.full_name, 'assignedBmcId': str(bmc.pk)},
                'bmc': {'id': str(bmc.pk), 'name': bmc.user.full_name},
                'farmers': [{'id': str(f.pk), 'name': f.user.full_name, 'assignedBoothId': str(society.pk),
                    'farmerIdCode': f.farmer_id_code or '', 'village': f.village,
                    'numberOfCows': f.number_of_cows} for f in farmers]})
        if user.role == User.Role.BMC:
            bmc = get_object_or_404(BMC.objects.select_related('user'), pk=user.pk)
            societies = bmc.societies.select_related('user').order_by('user__full_name', 'pk')
            return success({'society': None, 'bmc': {'id': str(bmc.pk), 'name': bmc.user.full_name}, 'farmers': [],
                'societies': [{'id': str(s.pk), 'name': s.user.full_name, 'phone': s.user.phone,
                    'isActive': s.user.is_active} for s in societies]})
        raise PermissionDenied('Only Society and BMC accounts can access this workflow.')


class VendorListView(APIView):
    def get(self, request):
        society_only(request.user)
        return success(page_data(request, Vendor.objects.filter(society_id=request.user.pk), VendorSerializer))

    def post(self, request):
        society_only(request.user)
        serializer = VendorSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                vendor = serializer.save(society_id=request.user.pk)
        except IntegrityError:
            raise Conflict('Vendor code already exists in this society.')
        return success({'vendor': VendorSerializer(vendor).data}, status=201)


class VendorDetailView(APIView):
    def patch(self, request, vendor_id):
        society_only(request.user)
        vendor = get_object_or_404(Vendor, pk=vendor_id, society_id=request.user.pk)
        serializer = VendorSerializer(vendor, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                serializer.save()
        except IntegrityError:
            raise Conflict('Vendor code already exists in this society.')
        return success({'vendor': serializer.data})


class VendorCollectionListView(APIView):
    def get(self, request):
        _, query = milk_queries(request)
        return success(page_data(request, query, lambda rows, many: Data([collection_data(r) for r in rows])))

    def post(self, request):
        society_only(request.user)
        serializer = VendorCollectionInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        with transaction.atomic():
            # The society lock also serializes receipt creation against new intake.
            Society.objects.select_for_update().get(pk=request.user.pk)
            existing = VendorMilkCollection.objects.filter(society_id=request.user.pk, submission_key=data['submissionKey']).first()
            if existing:
                if (existing.vendor_id != data['vendorId'] or existing.collection_date != data['collectionDate'] or
                    existing.session != data['session'] or existing.quantity_litres != data['quantityLitres'] or existing.notes != data['notes']):
                    raise Conflict()
                return success({'record': collection_data(existing)})
            vendor = get_object_or_404(Vendor, pk=data['vendorId'], society_id=request.user.pk, is_active=True)
            record = VendorMilkCollection.objects.create(society_id=request.user.pk, vendor=vendor, created_by=request.user,
                collection_date=data['collectionDate'], session=data['session'], quantity_litres=data['quantityLitres'],
                notes=data['notes'], submission_key=data['submissionKey'])
        return success({'record': collection_data(record)}, status=201)


class Data:
    def __init__(self, data):
        self.data = data


class MilkTransactionListView(APIView):
    def get(self, request):
        farmer, vendor = milk_queries(request)
        rows = sorted([*farmer, *vendor], key=lambda r: (r.collection_date, r.created_at, str(r.pk)), reverse=True)
        return success(page_data(request, ListQuery(rows), lambda rows, many: Data([collection_data(r) for r in rows])))


class ListQuery(list):
    def count(self):
        return len(self)


class AttendanceListView(APIView):
    def get(self, request):
        society_only(request.user)
        query = filtered(request, FarmerAttendance.objects.filter(society_id=request.user.pk).select_related('farmer'))
        return success(page_data(request, query, AttendanceSerializer))


class CollectionReviewView(APIView):
    def get(self, request):
        farmer, vendor = milk_queries(request)
        farmer = farmer.filter(dispatch_item__isnull=True)
        vendor = vendor.filter(dispatch_item__isnull=True)
        fq = sum((r.quantity_litres for r in farmer), Decimal('0'))
        vq = sum((r.quantity_litres for r in vendor), Decimal('0'))
        attendance = filtered(request, FarmerAttendance.objects.filter(society_id=request.user.pk))
        return success({'farmerQuantity': format(fq, '.2f'), 'vendorQuantity': format(vq, '.2f'),
            'dispatchQuantity': format(fq + vq, '.2f'), 'attendedFarmerIds': list(attendance.order_by().values_list('farmer_id', flat=True).distinct()),
            'records': [collection_data(r) for r in [*farmer, *vendor]]})


class ReceiptListView(APIView):
    def get(self, request):
        query = filtered(request, scoped_receipts(request.user))
        return success(page_data(request, query, lambda rows, many: Data([receipt_data(r) for r in rows])))

    def post(self, request):
        society_only(request.user)
        serializer = ReceiptInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        with transaction.atomic():
            society = Society.objects.select_for_update().get(pk=request.user.pk)
            prior = SocietyDispatchReceipt.objects.filter(society=society, submission_key=data['submissionKey']).first()
            if prior:
                old_ids = {item.farmer_collection_id or item.vendor_collection_id for item in prior.items.all()}
                if (old_ids != set(data['includedRecordIds']) or prior.collection_date != data['collectionDate'] or
                        prior.session != data['session'] or prior.notes != data['notes']):
                    raise Conflict()
                return success({'receipt': receipt_data(prior)})
            bmc = society.bmc
            if not bmc or not bmc.user.is_active:
                raise serializers.ValidationError('This society has no active linked BMC.')
            ids = data['includedRecordIds']
            filters = {'society': society, 'pk__in': ids, 'collection_date': data['collectionDate']}
            if data['session'] != 'full_day':
                filters['session'] = data['session']
            farmer = list(FarmerMilkCollection.objects.select_for_update().filter(**filters))
            vendor = list(VendorMilkCollection.objects.select_for_update().filter(**filters))
            if len(farmer) + len(vendor) != len(ids):
                raise serializers.ValidationError('All selected collections must belong to this society, date, and session.')
            if (DispatchReceiptItem.objects.filter(farmer_collection_id__in=ids).exists() or
                    DispatchReceiptItem.objects.filter(vendor_collection_id__in=ids).exists()):
                raise Conflict()
            fq = sum((r.quantity_litres for r in farmer), Decimal('0'))
            vq = sum((r.quantity_litres for r in vendor), Decimal('0'))
            receipt = SocietyDispatchReceipt.objects.create(society=society, bmc=bmc, society_name=society.user.full_name,
                bmc_name=bmc.user.full_name, collection_date=data['collectionDate'], session=data['session'],
                dispatch_quantity=fq + vq, farmer_quantity=fq, vendor_quantity=vq,
                total_farmers_count=len({r.farmer_id for r in farmer}), created_by=request.user,
                notes=data['notes'], submission_key=data['submissionKey'])
            DispatchReceiptItem.objects.bulk_create([DispatchReceiptItem(receipt=receipt, farmer_collection=r) for r in farmer] +
                [DispatchReceiptItem(receipt=receipt, vendor_collection=r) for r in vendor])
        return success({'receipt': receipt_data(receipt)}, status=201)


class ReceiptDetailView(APIView):
    def get(self, request, receipt_id):
        return success({'receipt': receipt_data(get_object_or_404(scoped_receipts(request.user), pk=receipt_id))})


class ReceiptSendView(APIView):
    def post(self, request, receipt_id):
        society_only(request.user)
        with transaction.atomic():
            society = Society.objects.select_for_update().get(pk=request.user.pk)
            receipt = get_object_or_404(SocietyDispatchReceipt.objects.select_for_update(), pk=receipt_id, society=society)
            if receipt.status != 'sent_to_bmc':
                if society.bmc_id != receipt.bmc_id or not BMC.objects.filter(pk=receipt.bmc_id, user__is_active=True).exists():
                    raise serializers.ValidationError('The linked BMC has changed or is inactive. This receipt cannot be sent.')
                receipt.status = 'sent_to_bmc'
                receipt.sent_at = timezone.now()
                receipt.save(update_fields=['status', 'sent_at'])
            delivery, _ = BMCDelivery.objects.get_or_create(receipt=receipt)
        return success({'receipt': receipt_data(receipt), 'delivery': delivery_data(delivery)})


