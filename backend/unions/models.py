from django.conf import settings
from django.db import models
from accounts.domain import RoleAccount


class Union(RoleAccount):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, primary_key=True, on_delete=models.CASCADE, related_name='union')
    account_role = 'union'
    parent_field = None
