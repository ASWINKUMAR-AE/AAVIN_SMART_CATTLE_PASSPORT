from datetime import timedelta
from decimal import Decimal
from django.db import IntegrityError, transaction
from django.db.models import Sum
from django.shortcuts import get_object_or_404
from rest_framework import serializers
from rest_framework.exceptions import APIException, PermissionDenied
from rest_framework.views import APIView
from accounts.models import User
from accounts.responses import success
from .models import FarmerMilkCollection, CollectionNotification
from .serializers import CreateCollectionSerializer, CollectionSerializer, NotificationSerializer, india_today


class DuplicateCollection(APIException):
    status_code = 409
    default_detail = 'A collection already exists for this farmer, date, and shift.'


def scoped_collections(user):
    if user.role == User.Role.SOCIETY:
        query = FarmerMilkCollection.objects.filter(society=user)
    elif user.role == User.Role.FARMER:
        query = FarmerMilkCollection.objects.filter(farmer=user)
    else:
        raise PermissionDenied('Only Society and Farmer accounts can access milk collections.')
    return query.select_related('farmer', 'society', 'created_by')


def filtered_collections(request):
    query = scoped_collections(request.user)
    fields = {'farmerId': serializers.UUIDField(), 'collectionDate': serializers.DateField(),
              'dateFrom': serializers.DateField(), 'dateTo': serializers.DateField(),
              'session': serializers.ChoiceField(choices=['morning', 'evening'])}
    lookups = {'farmerId': 'farmer_id', 'collectionDate': 'collection_date',
               'dateFrom': 'collection_date__gte', 'dateTo': 'collection_date__lte', 'session': 'session'}
    values = {}
    for key, field in fields.items():
        if key in request.query_params:
            values[key] = field.run_validation(request.query_params[key])
            query = query.filter(**{lookups[key]: values[key]})
    if values.get('dateFrom') and values.get('dateTo') and values['dateFrom'] > values['dateTo']:
        raise serializers.ValidationError({'dateTo': 'Must be on or after dateFrom.'})
    return query


def page_data(request, query, serializer):
    page = serializers.IntegerField(min_value=1).run_validation(request.query_params.get('page', 1))
    size = serializers.IntegerField(min_value=1, max_value=100).run_validation(request.query_params.get('pageSize', 50))
    count = query.count()
    return {'results': serializer(query[(page - 1) * size:page * size], many=True).data,
            'count': count, 'page': page, 'pageSize': size, 'hasNext': page * size < count}


class CollectionListView(APIView):
    def get(self, request):
        return success(page_data(request, filtered_collections(request), CollectionSerializer))

    def post(self, request):
        if request.user.role != User.Role.SOCIETY:
            raise PermissionDenied('Only Society accounts can record milk.')
        serializer = CreateCollectionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            with transaction.atomic():
                # Serialize concurrent intake and reassignment using the farmer row.
                farmer = get_object_or_404(User.objects.select_for_update(), pk=data['farmerId'],
                                          role=User.Role.FARMER, parent=request.user, is_active=True)
                if FarmerMilkCollection.objects.filter(farmer=farmer, collection_date=data['collectionDate'], session=data['session']).exists():
                    raise DuplicateCollection()
                record = FarmerMilkCollection.objects.create(farmer=farmer, society=request.user,
                    created_by=request.user, collection_date=data['collectionDate'], session=data['session'],
                    quantity_litres=data['quantityLitres'], notes=data['notes'])
                CollectionNotification.objects.create(recipient=farmer, collection=record,
                    title='Milk Supply Recorded', message=f"Your {record.session} supply of {record.quantity_litres:.2f} litres on {record.collection_date} was recorded at {request.user.full_name}.")
        except IntegrityError:
            if FarmerMilkCollection.objects.filter(farmer_id=data['farmerId'], collection_date=data['collectionDate'], session=data['session']).exists():
                raise DuplicateCollection()
            raise
        return success({'record': CollectionSerializer(record).data}, 'Milk collection recorded', 201)


class CollectionSummaryView(APIView):
    def get(self, request):
        query = filtered_collections(request)
        today = india_today()
        start = today - timedelta(days=6)
        def total(records):
            return format(records.aggregate(total=Sum('quantity_litres'))['total'] or Decimal('0'), '.2f')
        daily = {row['collection_date']: row['total'] for row in query.filter(collection_date__range=[start, today])
                 .order_by().values('collection_date').annotate(total=Sum('quantity_litres'))}
        return success({'today': today.isoformat(), 'todaySupply': total(query.filter(collection_date=today)),
            'monthSupply': total(query.filter(collection_date__range=[today.replace(day=1), today])),
            'last7DaysSupply': total(query.filter(collection_date__range=[start, today])),
            'shifts': {shift: total(query.filter(collection_date=today, session=shift)) for shift in ['morning', 'evening']},
            'dailyTrend': [{'date': (start + timedelta(days=i)).isoformat(),
                            'quantityLitres': format(daily.get(start + timedelta(days=i), Decimal('0')), '.2f')} for i in range(7)]})


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
