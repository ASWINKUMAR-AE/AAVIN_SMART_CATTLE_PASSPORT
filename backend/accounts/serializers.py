from decimal import Decimal
from django.contrib.auth import authenticate, password_validation
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied
from rest_framework.validators import UniqueValidator
from .models import Cow, FarmerProfile, User, phone_validator


class CowSerializer(serializers.ModelSerializer):
    farmerId = serializers.UUIDField(source='farmer_id', read_only=True)
    pashuAadhaar = serializers.RegexField(source='pashu_aadhaar', regex=r'^[0-9]{12}$',
        max_length=12, validators=[UniqueValidator(queryset=Cow.objects.all(),
        message='This Pashu Aadhaar is already registered.')])
    milkCapacity = serializers.DecimalField(source='milk_capacity', max_digits=8,
                                            decimal_places=2, min_value=Decimal('0.01'))
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = Cow
        fields = ['id', 'farmerId', 'pashuAadhaar', 'breed', 'milkCapacity', 'name', 'createdAt']
        read_only_fields = ['id']

class FarmerProfileSerializer(serializers.ModelSerializer):
    farmerIdCode = serializers.CharField(source='farmer_id_code', max_length=64)
    numberOfCows = serializers.IntegerField(source='number_of_cows', min_value=0)
    verificationStatus = serializers.CharField(source='verification_status', read_only=True)
    bankAccountName = serializers.CharField(source='bank_account_name', max_length=150, required=False, allow_blank=True)
    bankName = serializers.CharField(source='bank_name', max_length=150, required=False, allow_blank=True)
    bankAccountNumber = serializers.CharField(source='bank_account_number', max_length=64, required=False, allow_blank=True)
    bankIfsc = serializers.CharField(source='bank_ifsc', max_length=11, required=False, allow_blank=True)
    upiId = serializers.CharField(source='upi_id', max_length=150, required=False, allow_blank=True)

    class Meta:
        model = FarmerProfile
        fields = ['farmerIdCode', 'address', 'village', 'community', 'numberOfCows',
                  'verificationStatus', 'bankAccountName', 'bankName', 'bankAccountNumber', 'bankIfsc', 'upiId']

    def validate_farmerIdCode(self, value):
        value = value.strip().upper()
        if FarmerProfile.objects.filter(farmer_id_code__iexact=value).exists():
            raise serializers.ValidationError('This Farmer ID code is already registered.')
        return value

    def validate_bankIfsc(self, value):
        return value.strip().upper()


class ParentAccountSerializer(serializers.ModelSerializer):
    fullName = serializers.CharField(source='full_name', read_only=True)
    parentId = serializers.UUIDField(source='parent_id', read_only=True, allow_null=True)
    class Meta:
        model = User
        fields = ['id', 'fullName', 'phone', 'role', 'parentId']


class UserSerializer(serializers.ModelSerializer):
    fullName = serializers.CharField(source="full_name", read_only=True)
    roles = serializers.SerializerMethodField()
    parentId = serializers.UUIDField(source="parent_id", read_only=True, allow_null=True)
    parent = ParentAccountSerializer(read_only=True)
    personalDetails = FarmerProfileSerializer(source='farmer_profile', read_only=True, allow_null=True)
    cows = CowSerializer(many=True, read_only=True)
    createdAt = serializers.DateTimeField(source='date_joined', read_only=True)
    class Meta:
        model = User
        fields = ["id", "phone", "fullName", "role", "roles", "parentId", "parent", "personalDetails", "cows", "createdAt"]
    def get_roles(self, obj):
        return [obj.role]

class LoginSerializer(serializers.Serializer):
    phone = serializers.CharField(required=False, validators=[phone_validator])
    # Transitional field accepted from the unchanged frontend, but only phone values authenticate.
    usernameOrPhone = serializers.CharField(required=False, write_only=True, validators=[phone_validator])
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    def validate(self, attrs):
        phone = attrs.get("phone") or attrs.get("usernameOrPhone")
        if not phone:
            raise serializers.ValidationError({"phone": "Phone number is required."})
        if attrs.get("phone") and attrs.get("usernameOrPhone") and attrs["phone"] != attrs["usernameOrPhone"]:
            raise serializers.ValidationError({"phone": "Phone values must match."})
        user = authenticate(request=self.context.get("request"), phone=phone, password=attrs["password"])
        if user is None:
            raise AuthenticationFailed("Invalid credentials or inactive account")
        return {"user": user}

class RegisterSerializer(serializers.Serializer):
    phone = serializers.CharField(validators=[phone_validator])
    fullName = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, trim_whitespace=False, required=False)
    role = serializers.ChoiceField(choices=User.Role.choices)
    parentId = serializers.UUIDField(required=False)
    personalDetails = FarmerProfileSerializer(required=False)
    cows = CowSerializer(many=True, required=False, allow_empty=False)

    def validate_cows(self, cows):
        tags = [cow['pashu_aadhaar'] for cow in cows]
        if len(tags) != len(set(tags)):
            raise serializers.ValidationError('Each cow must have a different Pashu Aadhaar.')
        return cows

    def validate(self, attrs):
        actor = self.context["request"].user
        allowed = {User.Role.SOCIETY: {User.Role.FARMER}, User.Role.BMC: {User.Role.SOCIETY},
                   User.Role.UNION: {User.Role.BMC, User.Role.SOCIETY}}
        if attrs["role"] not in allowed.get(actor.role, set()):
            raise PermissionDenied("Your role cannot create this account type. Union accounts are created manually.")
        if actor.role == User.Role.UNION and attrs["role"] == User.Role.SOCIETY:
            if "parentId" not in attrs:
                raise serializers.ValidationError({"parentId": "Select the BMC for this Society."})
            parent = User.objects.filter(pk=attrs["parentId"], role=User.Role.BMC, parent=actor, is_active=True).first()
            if parent is None:
                raise serializers.ValidationError({"parentId": "Select an active BMC belonging to your Union."})
        else:
            if "parentId" in attrs and attrs["parentId"] != actor.pk:
                raise PermissionDenied("You can create accounts only under your own account.")
            parent = actor
        if User.objects.filter(phone=attrs["phone"]).exists():
            raise serializers.ValidationError({"phone": "An account with this phone already exists."})
        if 'personalDetails' in attrs and attrs['role'] != User.Role.FARMER:
            raise serializers.ValidationError({'personalDetails': 'Only Farmer accounts have personal details.'})
        if 'cows' in attrs:
            if attrs['role'] != User.Role.FARMER:
                raise serializers.ValidationError({'cows': 'Only Farmer accounts can register cows.'})
            if 'personalDetails' in attrs:
                attrs['personalDetails']['number_of_cows'] = len(attrs['cows'])
        if 'password' not in attrs:
            if attrs['role'] != User.Role.FARMER:
                raise serializers.ValidationError({'password': 'Password is required.'})
            attrs['password'] = attrs['phone']
            attrs['parent'] = parent
            return attrs
        candidate = User(phone=attrs["phone"], full_name=attrs["fullName"], role=attrs["role"], parent=parent)
        try:
            password_validation.validate_password(attrs["password"], candidate)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": exc.messages})
        attrs["parent"] = parent
        return attrs

    def create(self, validated_data):
        try:
            with transaction.atomic():
                user = User.objects.create_user(phone=validated_data["phone"], password=validated_data["password"],
                    full_name=validated_data["fullName"], role=validated_data["role"], parent=validated_data["parent"],
                    created_by=self.context["request"].user)
                details = validated_data.get('personalDetails')
                if details is not None:
                    profile = FarmerProfile(user=user, **details)
                    profile.full_clean()
                    profile.save()
                for details in validated_data.get('cows', []):
                    cow = Cow(farmer=user, **details)
                    cow.full_clean()
                    cow.save()
                return user
        except IntegrityError:
            raise serializers.ValidationError({"nonFieldErrors": "Unable to create account; the phone, Farmer ID, or Pashu Aadhaar may already be registered."})
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict if hasattr(exc, "message_dict") else exc.messages)
