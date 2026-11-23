import uuid
from decimal import Decimal
from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from accounts.domain import RoleAccount


class Society(RoleAccount):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, primary_key=True, on_delete=models.CASCADE, related_name='society')
    bmc = models.ForeignKey('bmcs.BMC', on_delete=models.PROTECT, related_name='societies')
    account_role = 'society'
    parent_field = 'bmc'


class FarmerMilkCollection(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    farmer = models.ForeignKey('farmers.Farmer', on_delete=models.PROTECT, related_name='milk_collections')
    society = models.ForeignKey(Society, on_delete=models.PROTECT, related_name='collected_milk')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='recorded_milk')
    collection_date = models.DateField()
    session = models.CharField(max_length=7, choices=[('morning', 'Morning'), ('evening', 'Evening')])
    quantity_litres = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    vendor = models.ForeignKey('societies.Vendor', null=True, blank=True, on_delete=models.PROTECT)
    notes = models.CharField(max_length=1000, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'collections_farmermilkcollection'
        ordering = ['-collection_date', '-created_at', '-id']
        constraints = [
            models.UniqueConstraint(fields=['farmer', 'collection_date', 'session'], name='collection_farmer_date_shift'),
            models.CheckConstraint(condition=models.Q(quantity_litres__gt=0), name='collection_positive_litres'),
            models.CheckConstraint(condition=models.Q(session__in=['morning', 'evening']), name='collection_valid_shift'),
        ]
        indexes = [models.Index(fields=['society', 'collection_date'], name='collections_society_efb7a7_idx'), models.Index(fields=['farmer', 'collection_date'], name='collections_farmer__edf261_idx')]


class Vendor(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    society = models.ForeignKey(Society, on_delete=models.PROTECT)
    code = models.CharField(max_length=64)
    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=16, blank=True)
    route_name = models.CharField(max_length=150, blank=True)
    vehicle_number = models.CharField(max_length=32, blank=True)
    vehicle_type = models.CharField(max_length=64, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'dispatch_vendor'
        ordering = ['name', 'id']
        constraints = [models.UniqueConstraint(fields=['society', 'code'], name='dispatch_vendor_code')]


class VendorMilkCollection(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    society = models.ForeignKey(Society, on_delete=models.PROTECT, related_name='vendor_collections')
    vendor = models.ForeignKey(Vendor, on_delete=models.PROTECT)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='recorded_vendor_milk')
    collection_date = models.DateField()
    session = models.CharField(max_length=7, choices=[('morning', 'Morning'), ('evening', 'Evening')])
    quantity_litres = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    notes = models.CharField(max_length=1000, blank=True)
    submission_key = models.UUIDField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'dispatch_vendormilkcollection'
        ordering = ['-collection_date', '-created_at', '-id']
        constraints = [
            models.UniqueConstraint(fields=['society', 'submission_key'], name='dispatch_vendor_submission'),
            models.CheckConstraint(condition=models.Q(quantity_litres__gt=0), name='dispatch_vendor_positive_litres'),
            models.CheckConstraint(condition=models.Q(session__in=['morning', 'evening']), name='dispatch_vendor_valid_shift'),
        ]
        indexes = [models.Index(fields=['society', 'collection_date'], name='dispatch_ve_society_5eb593_idx')]


class FarmerAttendance(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    farmer = models.ForeignKey('farmers.Farmer', on_delete=models.PROTECT, related_name='milk_attendance')
    society = models.ForeignKey(Society, on_delete=models.PROTECT, related_name='farmer_attendance')
    collection_date = models.DateField()
    session = models.CharField(max_length=7)
    collection = models.OneToOneField('societies.FarmerMilkCollection', on_delete=models.PROTECT)

    class Meta:
        db_table = 'dispatch_farmerattendance'
        ordering = ['-collection_date', 'farmer_id', 'session']
        constraints = [models.UniqueConstraint(fields=['farmer', 'collection_date', 'session'], name='dispatch_attendance_shift')]


class SocietyDispatchReceipt(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    society = models.ForeignKey(Society, on_delete=models.PROTECT, related_name='dispatch_receipts')
    bmc = models.ForeignKey('bmcs.BMC', on_delete=models.PROTECT, related_name='incoming_dispatch_receipts')
    society_name = models.CharField(max_length=150)
    bmc_name = models.CharField(max_length=150)
    collection_date = models.DateField()
    session = models.CharField(max_length=8, choices=[('morning', 'Morning'), ('evening', 'Evening'), ('full_day', 'Full day')])
    dispatch_quantity = models.DecimalField(max_digits=16, decimal_places=2)
    farmer_quantity = models.DecimalField(max_digits=16, decimal_places=2)
    vendor_quantity = models.DecimalField(max_digits=16, decimal_places=2)
    total_farmers_count = models.PositiveIntegerField()
    status = models.CharField(max_length=16, default='confirmed', choices=[('confirmed', 'Confirmed'), ('sent_to_bmc', 'Sent to BMC')])
    verification_code = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    submission_key = models.UUIDField()
    notes = models.CharField(max_length=1000, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='created_dispatch_receipts')
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'dispatch_societydispatchreceipt'
        ordering = ['-created_at', '-id']
        constraints = [models.UniqueConstraint(fields=['society', 'submission_key'], name='dispatch_receipt_submission')]


class DispatchReceiptItem(models.Model):
    receipt = models.ForeignKey(SocietyDispatchReceipt, on_delete=models.PROTECT, related_name='items')
    farmer_collection = models.OneToOneField('societies.FarmerMilkCollection', null=True, blank=True, on_delete=models.PROTECT, related_name='dispatch_item')
    vendor_collection = models.OneToOneField(VendorMilkCollection, null=True, blank=True, on_delete=models.PROTECT, related_name='dispatch_item')

    class Meta:
        db_table = 'dispatch_dispatchreceiptitem'
        constraints = [models.CheckConstraint(condition=(models.Q(farmer_collection__isnull=False, vendor_collection__isnull=True) | models.Q(farmer_collection__isnull=True, vendor_collection__isnull=False)), name='dispatch_item_one_source')]


