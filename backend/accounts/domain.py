from django.core.exceptions import ValidationError
from django.db import models


class RoleAccount(models.Model):
    """Role identity shares its UUID with the authentication account."""
    class Meta:
        abstract = True

    def clean(self):
        super().clean()
        if self.user.role != self.account_role:
            raise ValidationError({'user': f'This record requires a {self.account_role} account.'})
        if self.parent_field and self.user.parent_id != getattr(self, f'{self.parent_field}_id'):
            raise ValidationError({self.parent_field: 'Role hierarchy must match the authentication account parent.'})

    def __str__(self):
        return self.user.full_name
