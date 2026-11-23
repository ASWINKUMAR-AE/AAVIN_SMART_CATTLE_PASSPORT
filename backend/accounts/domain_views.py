"""Shared account transport; each role view supplies a typed, scoped queryset."""
from collections.abc import Mapping
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from rest_framework.views import APIView
from .models import User, phone_validator
from .responses import success
from .serializers import RegisterSerializer, UserSerializer


class RoleAccountUpdateSerializer(serializers.Serializer):
    fullName = serializers.CharField(max_length=150, required=False)
    phone = serializers.CharField(validators=[phone_validator], required=False)
    isActive = serializers.BooleanField(required=False)

    def to_internal_value(self, data):
        if not isinstance(data, Mapping):
            raise serializers.ValidationError('Expected a JSON object.')
        unknown = set(data) - set(self.fields)
        if unknown:
            raise serializers.ValidationError({key: 'Unexpected field.' for key in unknown})
        return super().to_internal_value(data)

    def validate_phone(self, value):
        if User.objects.filter(phone=value).exclude(pk=self.instance.pk).exists():
            raise serializers.ValidationError('An account with this phone already exists.')
        return value

    def update(self, user, values):
        fields = {'phone': 'phone', 'fullName': 'full_name', 'isActive': 'is_active'}
        for field, value in values.items():
            setattr(user, fields[field], value)
        user.full_clean()
        user.save(update_fields=[fields[field] for field in values])
        return user


class RoleListView(APIView):
    def get(self, request):
        rows = self.queryset(request.user).select_related('user__parent').order_by('user__date_joined', 'user_id')
        return success({self.plural: UserSerializer([row.user for row in rows], many=True).data})

    def post(self, request):
        if self.role == 'union':
            raise PermissionDenied('Union accounts are created through the administrator.')
        if not isinstance(request.data, Mapping):
            raise serializers.ValidationError('Expected a JSON object.')
        if request.data.get('role', self.role) != self.role:
            raise serializers.ValidationError({'role': 'Role must match this endpoint.'})
        serializer = RegisterSerializer(data={**request.data, 'role': self.role}, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return success({'user': UserSerializer(user).data}, 'Account created', 201)


class RoleDetailView(APIView):
    def get(self, request, account_id):
        row = get_object_or_404(self.queryset(request.user).select_related('user__parent'), pk=account_id)
        return success({'user': UserSerializer(row.user).data})

    def patch(self, request, account_id):
        from django.core.exceptions import ValidationError as DjangoValidationError
        from django.db import IntegrityError
        with transaction.atomic():
            row = get_object_or_404(self.queryset(request.user).select_for_update(), pk=account_id)
            if not self.can_update(request.user, row):
                raise PermissionDenied('Only the supervising account can update this account.')
            user = User.objects.select_for_update().get(pk=row.user_id)
            serializer = RoleAccountUpdateSerializer(user, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            try:
                serializer.save()
            except DjangoValidationError as exc:
                raise serializers.ValidationError(exc.message_dict if hasattr(exc, 'message_dict') else exc.messages)
            except IntegrityError:
                raise serializers.ValidationError('An account with this phone already exists.')
        return success({'user': UserSerializer(user).data}, 'Account updated')
