from rest_framework.views import APIView
from accounts.responses import success
from accounts.serializers import UserSerializer, RegisterSerializer
from .models import Farmer


class FarmerListView(APIView):
    def post(self, request):
        from collections.abc import Mapping
        from rest_framework.exceptions import ValidationError
        if not isinstance(request.data, Mapping):
            raise ValidationError('Expected a JSON object.')
        if request.data.get('role', 'farmer') != 'farmer':
            raise ValidationError({'role': 'Role must match this endpoint.'})
        serializer = RegisterSerializer(data={**request.data, 'role': 'farmer'}, context={'request': request})
        serializer.is_valid(raise_exception=True)
        return success({'user': UserSerializer(serializer.save()).data}, 'Farmer created', 201)

    def get(self, request):
        from accounts.models import User
        from rest_framework.exceptions import PermissionDenied
        if request.user.role != User.Role.SOCIETY:
            raise PermissionDenied('Only Society accounts can list their Farmers.')
        farmers = Farmer.objects.filter(society_id=request.user.pk).select_related('user__parent').prefetch_related('cows').order_by('user__date_joined', 'user_id')
        return success({'farmers': UserSerializer([farmer.user for farmer in farmers], many=True).data})


class FarmerDetailView(APIView):
    def get(self, request, farmer_id):
        from django.shortcuts import get_object_or_404
        from rest_framework.exceptions import PermissionDenied
        if request.user.role == 'society':
            query = Farmer.objects.filter(society_id=request.user.pk)
        elif request.user.role == 'farmer':
            query = Farmer.objects.filter(pk=request.user.pk)
        else:
            raise PermissionDenied('Only Farmers and their Society can access farmer details.')
        farmer = get_object_or_404(query.select_related('user__parent').prefetch_related('cows'), pk=farmer_id)
        return success({'user': UserSerializer(farmer.user).data})

    def patch(self, request, farmer_id):
        from django.db import transaction
        from django.shortcuts import get_object_or_404
        from rest_framework.exceptions import PermissionDenied
        from accounts.models import User
        from .serializers import FarmerUpdateSerializer
        if request.user.role != User.Role.SOCIETY:
            raise PermissionDenied('Only Society accounts can update their Farmers.')
        with transaction.atomic():
            profile = get_object_or_404(Farmer.objects.select_for_update(), pk=farmer_id, society_id=request.user.pk)
            farmer = User.objects.select_for_update().get(pk=profile.user_id)
            serializer = FarmerUpdateSerializer(farmer, data=request.data, partial=True,
                                                 context={'request': request, 'farmer': farmer})
            serializer.is_valid(raise_exception=True)
            return success({'user': UserSerializer(serializer.save()).data}, 'Farmer updated')

from django.shortcuts import get_object_or_404
from accounts.pagination import page_data
from .models import CollectionNotification
from .notification_serializers import NotificationSerializer


class NotificationListView(APIView):
    def get(self, request):
        query = CollectionNotification.objects.filter(recipient=request.user)
        return success({**page_data(request, query, NotificationSerializer), 'unreadCount': query.filter(is_read=False).count()})


class NotificationReadView(APIView):
    def post(self, request, notification_id):
        notification = get_object_or_404(CollectionNotification, pk=notification_id, recipient=request.user)
        CollectionNotification.objects.filter(pk=notification.pk, recipient=request.user).update(is_read=True)
        return success(message='Notification marked read')


class NotificationsReadAllView(APIView):
    def post(self, request):
        CollectionNotification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return success(message='Notifications marked read')
