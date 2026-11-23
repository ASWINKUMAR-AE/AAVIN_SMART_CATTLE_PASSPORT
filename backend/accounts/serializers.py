from django.contrib.auth import authenticate, password_validation
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied
from .models import User, phone_validator
from farmers.models import Cow
from bmcs.models import BMC
from farmers.serializers import CowSerializer, FarmerSerializer


class ParentAccountSerializer(serializers.ModelSerializer):
    fullName = serializers.CharField(source='full_name', read_only=True)
    parentId = serializers.UUIDField(source='parent_id', read_only=True, allow_null=True)
    class Meta:
        model = User
        fields = ['id', 'fullName', 'phone', 'role', 'parentId']


class UserSerializer(serializers.ModelSerializer):
    isActive = serializers.BooleanField(source="is_active", read_only=True)
    fullName = serializers.CharField(source="full_name", read_only=True)
    roles = serializers.SerializerMethodField()
    parentId = serializers.UUIDField(source="parent_id", read_only=True, allow_null=True)
    parent = ParentAccountSerializer(read_only=True)
    personalDetails = serializers.SerializerMethodField()
    cows = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source='date_joined', read_only=True)
    class Meta:
        model = User
        fields = ["id", "phone", "fullName", "role", "roles", "parentId", "parent", "personalDetails", "cows", "createdAt", "isActive"]
    def get_personalDetails(self, obj):
        if obj.role != User.Role.FARMER:
            return None
        profile = getattr(obj, 'farmer', None)
        return FarmerSerializer(profile).data if profile and profile.has_personal_details else None

    def get_cows(self, obj):
        if obj.role != User.Role.FARMER:
            return []
        profile = getattr(obj, 'farmer', None)
        return CowSerializer(profile.cows.all(), many=True).data if profile else []

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
    personalDetails = FarmerSerializer(required=False)
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
            bmc = BMC.objects.filter(pk=attrs['parentId'], union_id=actor.pk, user__is_active=True).select_related('user').first()
            parent = bmc.user if bmc else None
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
                    profile = user.farmer
                    for key, value in details.items():
                        setattr(profile, key, value)
                    profile.has_personal_details = True
                    profile.full_clean()
                    profile.save()
                for details in validated_data.get('cows', []):
                    cow = Cow(farmer_id=user.pk, **details)
                    cow.full_clean()
                    cow.save()
                if 'cows' in validated_data:
                    profile = user.farmer
                    profile.number_of_cows = profile.cows.count()
                    profile.save(update_fields=['number_of_cows'])
                return user
        except IntegrityError:
            raise serializers.ValidationError({"nonFieldErrors": "Unable to create account; the phone, Farmer ID, or Pashu Aadhaar may already be registered."})
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict if hasattr(exc, "message_dict") else exc.messages)
