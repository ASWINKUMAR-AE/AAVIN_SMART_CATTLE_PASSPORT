from django.contrib.auth import authenticate, password_validation
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied
from .models import User, phone_validator

class UserSerializer(serializers.ModelSerializer):
    fullName = serializers.CharField(source="full_name", read_only=True)
    roles = serializers.SerializerMethodField()
    parentId = serializers.UUIDField(source="parent_id", read_only=True, allow_null=True)
    class Meta:
        model = User
        fields = ["id", "phone", "fullName", "role", "roles", "parentId"]
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
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    role = serializers.ChoiceField(choices=User.Role.choices)
    parentId = serializers.UUIDField(required=False)

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
                return User.objects.create_user(phone=validated_data["phone"], password=validated_data["password"],
                    full_name=validated_data["fullName"], role=validated_data["role"], parent=validated_data["parent"],
                    created_by=self.context["request"].user)
        except IntegrityError:
            raise serializers.ValidationError({"phone": "Unable to create account; verify the phone and parent."})
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict if hasattr(exc, "message_dict") else exc.messages)
