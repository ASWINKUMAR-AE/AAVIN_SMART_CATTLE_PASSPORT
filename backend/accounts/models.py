import uuid
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from django.db import models, transaction
from django.apps import apps

phone_validator = RegexValidator(r"^\+?[0-9]{10,15}$", "Enter a phone number with 10–15 digits, optionally prefixed by +.")

class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, phone, password=None, **extra_fields):
        if not phone:
            raise ValueError("Phone number is required")
        user = self.model(phone=phone.strip(), **extra_fields)
        user.set_password(password)
        user.full_clean()
        user.save(using=self._db)
        return user

    def create_superuser(self, phone, password=None, **extra_fields):
        extra_fields.setdefault("role", User.Role.UNION)
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        if extra_fields["role"] != User.Role.UNION or not extra_fields["is_staff"] or not extra_fields["is_superuser"]:
            raise ValueError("Superusers must be staff Union accounts")
        return self.create_user(phone, password, **extra_fields)

class User(AbstractUser):
    class Role(models.TextChoices):
        FARMER = "farmer", "Farmer"
        SOCIETY = "society", "Society"
        BMC = "bmc", "BMC"
        UNION = "union", "Union"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = None
    phone = models.CharField(max_length=16, unique=True, validators=[phone_validator])
    full_name = models.CharField(max_length=150)
    role = models.CharField(max_length=10, choices=Role.choices)
    # Account hierarchy: Union -> BMC -> Society -> Farmer; no child-count limits.
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.PROTECT, related_name="members")
    created_by = models.ForeignKey("self", null=True, blank=True, on_delete=models.SET_NULL, related_name="created_accounts")
    objects = UserManager()
    USERNAME_FIELD = "phone"
    REQUIRED_FIELDS = ["full_name"]

    class Meta:
        constraints = [
            models.CheckConstraint(condition=models.Q(role__in=["farmer", "society", "bmc", "union"]), name="accounts_valid_role"),
            models.CheckConstraint(condition=(models.Q(role="union", parent__isnull=True) | models.Q(role__in=["bmc", "society", "farmer"], parent__isnull=False)), name="accounts_parent_required"),
            models.CheckConstraint(condition=models.Q(is_superuser=False) | models.Q(role="union"), name="accounts_superuser_union"),
        ]

    def clean(self):
        super().clean()
        expected = {self.Role.FARMER: self.Role.SOCIETY, self.Role.SOCIETY: self.Role.BMC, self.Role.BMC: self.Role.UNION}
        if self.role == self.Role.UNION:
            if self.parent_id:
                raise ValidationError({"parent": "Union accounts have no parent."})
        elif self.role in expected:
            if not self.parent_id or self.parent.role != expected[self.role]:
                raise ValidationError({"parent": f"A {self.role} must belong to a {expected[self.role]}."})
        if self.pk and not self._state.adding:
            previous = type(self).objects.filter(pk=self.pk).values_list('role', flat=True).first()
            if previous is not None and previous != self.role:
                raise ValidationError({'role': 'An existing account role cannot be changed.'})
            if self.members.exclude(role={self.Role.UNION: self.Role.BMC, self.Role.BMC: self.Role.SOCIETY, self.Role.SOCIETY: self.Role.FARMER}.get(self.role, "")).exists():
                raise ValidationError({"role": "This role is incompatible with existing child accounts."})

    def save(self, *args, **kwargs):
        # Keep auth and its role record atomic, including admin-created accounts.
        using = kwargs.get('using') or self._state.db or 'default'
        self.clean()
        with transaction.atomic(using=using):
            super().save(*args, **kwargs)
            self.sync_role_account(using)

    def sync_role_account(self, using):
        mapping = {
            self.Role.UNION: ('unions', 'Union', None),
            self.Role.BMC: ('bmcs', 'BMC', 'union'),
            self.Role.SOCIETY: ('societies', 'Society', 'bmc'),
            self.Role.FARMER: ('farmers', 'Farmer', 'society'),
        }
        app, name, parent_field = mapping[self.role]
        model = apps.get_model(app, name)
        defaults = {f'{parent_field}_id': self.parent_id} if parent_field else {}
        record, created = model.objects.using(using).get_or_create(user_id=self.pk, defaults=defaults)
        if not created and parent_field and getattr(record, f'{parent_field}_id') != self.parent_id:
            setattr(record, f'{parent_field}_id', self.parent_id)
            record.full_clean()
            record.save(using=using, update_fields=[parent_field])

    def __str__(self):
        return f"{self.full_name} ({self.role})"
