from django.contrib import admin
from .models import Society, Vendor, VendorMilkCollection, FarmerAttendance, SocietyDispatchReceipt, DispatchReceiptItem


# Dispatches are immutable audit records; operations go through the scoped APIs.
class AuditAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


for model in [Society, Vendor, VendorMilkCollection, FarmerAttendance, SocietyDispatchReceipt, DispatchReceiptItem]:
    admin.site.register(model, AuditAdmin)
