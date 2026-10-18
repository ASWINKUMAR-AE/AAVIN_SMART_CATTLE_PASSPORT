from django.conf import settings
from django.db import models
from accounts.domain import RoleAccount


class BMC(RoleAccount):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, primary_key=True, on_delete=models.CASCADE, related_name='bmc')
    union = models.ForeignKey('unions.Union', on_delete=models.PROTECT, related_name='bmcs')
    account_role = 'bmc'
    parent_field = 'union'


import uuid


class BMCDelivery(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    receipt = models.OneToOneField('societies.SocietyDispatchReceipt', on_delete=models.PROTECT, related_name='delivery')
    dispatched_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, default='pending_arrival', editable=False)

    class Meta:
        db_table = 'dispatch_bmcdelivery'
        ordering = ['-dispatched_at', '-id']
