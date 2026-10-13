import uuid
from decimal import Decimal
from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class FarmerMilkCollection(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    farmer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='milk_collections')
    society = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='collected_milk')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='recorded_milk')
    collection_date = models.DateField()
    session = models.CharField(max_length=7, choices=[('morning', 'Morning'), ('evening', 'Evening')])
    quantity_litres = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    notes = models.CharField(max_length=1000, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-collection_date', '-created_at', '-id']
        constraints = [
            models.UniqueConstraint(fields=['farmer', 'collection_date', 'session'], name='collection_farmer_date_shift'),
            models.CheckConstraint(condition=models.Q(quantity_litres__gt=0), name='collection_positive_litres'),
            models.CheckConstraint(condition=models.Q(session__in=['morning', 'evening']), name='collection_valid_shift'),
        ]
        indexes = [models.Index(fields=['society', 'collection_date']), models.Index(fields=['farmer', 'collection_date'])]


class CollectionNotification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='collection_notifications')
    collection = models.OneToOneField(FarmerMilkCollection, on_delete=models.PROTECT, related_name='notification')
    title = models.CharField(max_length=150)
    message = models.CharField(max_length=500)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at', '-id']
        indexes = [models.Index(fields=['recipient', 'is_read', 'created_at'])]
