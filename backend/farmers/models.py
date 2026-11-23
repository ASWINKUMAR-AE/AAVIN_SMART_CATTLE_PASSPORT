import uuid
from decimal import Decimal
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, RegexValidator
from django.db import models
from accounts.models import User
from accounts.domain import RoleAccount


class Farmer(RoleAccount):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, primary_key=True, on_delete=models.CASCADE, related_name='farmer')
    society = models.ForeignKey('societies.Society', on_delete=models.PROTECT, related_name='farmers')
    has_personal_details = models.BooleanField(default=False)
    account_role = 'farmer'
    parent_field = 'society'
    farmer_id_code = models.CharField(max_length=64, unique=True, null=True, blank=True)
    address = models.TextField(blank=True)
    village = models.CharField(max_length=150, blank=True)
    community = models.CharField(max_length=150, blank=True)
    number_of_cows = models.PositiveIntegerField(default=0)
    verification_status = models.CharField(max_length=10, choices=[('pending', 'Pending'), ('verified', 'Verified')], default='pending')
    bank_account_name = models.CharField(max_length=150, blank=True)
    bank_name = models.CharField(max_length=150, blank=True)
    bank_account_number = models.CharField(max_length=64, blank=True)
    bank_ifsc = models.CharField(max_length=11, blank=True)
    upi_id = models.CharField(max_length=150, blank=True)

    def clean(self):
        super().clean()
        if self.farmer_id_code:
            self.farmer_id_code = self.farmer_id_code.strip().upper()
        if self.user.role != User.Role.FARMER:
            raise ValidationError({'user': 'Personal details belong to a Farmer account.'})

    def __str__(self):
        return self.farmer_id_code or self.user.full_name


class Cow(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    farmer = models.ForeignKey(Farmer, on_delete=models.CASCADE, related_name='cows')
    pashu_aadhaar = models.CharField(max_length=12, unique=True, validators=[
        RegexValidator(r'^[0-9]{12}$', 'Pashu Aadhaar must contain exactly 12 digits.')])
    breed = models.CharField(max_length=150)
    milk_capacity = models.DecimalField(max_digits=8, decimal_places=2,
                                        validators=[MinValueValidator(Decimal('0.01'))])
    name = models.CharField(max_length=150, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts_cow'
        ordering = ['created_at', 'id']
        constraints = [
            models.CheckConstraint(condition=models.Q(milk_capacity__gt=0), name='accounts_cow_positive_milk'),
            models.CheckConstraint(condition=models.Q(pashu_aadhaar__regex=r'^[0-9]{12}$'), name='accounts_cow_valid_tag'),
        ]

    def clean(self):
        if self.farmer_id and not Farmer.objects.filter(pk=self.farmer_id, user__role=User.Role.FARMER).exists():
            raise ValidationError({'farmer': 'Cows must belong to a Farmer account.'})

    def __str__(self):
        return f'{self.pashu_aadhaar} ({self.breed})'


class CollectionNotification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='collection_notifications')
    collection = models.OneToOneField('societies.FarmerMilkCollection', on_delete=models.PROTECT, related_name='notification')
    title = models.CharField(max_length=150)
    message = models.CharField(max_length=500)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'collections_collectionnotification'
        ordering = ['-created_at', '-id']
        indexes = [models.Index(fields=['recipient', 'is_read', 'created_at'], name='collections_recipie_7b2ee4_idx')]
