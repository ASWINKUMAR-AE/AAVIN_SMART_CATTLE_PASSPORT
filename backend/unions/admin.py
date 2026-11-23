from django.contrib import admin
from .models import Union
from societies.admin import AuditAdmin

admin.site.register(Union, AuditAdmin)
