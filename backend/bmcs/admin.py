from django.contrib import admin
from .models import BMC, BMCDelivery
from societies.admin import AuditAdmin

admin.site.register(BMC, AuditAdmin)
admin.site.register(BMCDelivery, AuditAdmin)
