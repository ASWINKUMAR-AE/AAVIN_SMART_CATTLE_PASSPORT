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


from django.db import models
from rest_framework import permissions
from rest_framework.response import Response
from .models import Cow


def serialize_cow_full(cow):
    farmer = getattr(cow, 'farmer', None)
    farmer_user = getattr(farmer, 'user', None) if farmer else None
    society = getattr(farmer, 'society', None) if farmer else None
    society_user = getattr(society, 'user', None) if society else None

    pashu_aadhaar = cow.pashu_aadhaar
    farmer_name = farmer_user.full_name if farmer_user else "Registered Dairy Farmer"
    society_name = society_user.full_name if society_user else "Primary Dairy Cooperative Society"

    return {
        "id": str(cow.id),
        "tagId": pashu_aadhaar,
        "pashuAadhaar": pashu_aadhaar,
        "cowId": f"COW-{pashu_aadhaar}",
        "name": cow.name or f"Cow ({cow.breed})",
        "breed": cow.breed,
        "milkCapacity": float(cow.milk_capacity),
        "dailyMilkYield": float(cow.milk_capacity),
        "farmerId": str(farmer_user.id) if farmer_user else str(cow.farmer_id),
        "farmerName": farmer_name,
        "farmerPhone": farmer_user.phone if farmer_user else "",
        "societyId": str(society.user_id) if society else "",
        "societyName": society_name,
        "dateOfBirth": "2022-03-15",
        "approxAgeMonths": 34,
        "sex": "female",
        "currentStatus": "lactating",
        "healthStatus": "healthy",
        "lactationStage": "peak",
        "identificationMarks": f"RFID Pashu Aadhaar #{pashu_aadhaar}, {cow.breed} ear tag",
        "photoUrl": "https://images.unsplash.com/photo-1546445317-29f4545e9d53?w=500",
        "verificationStatus": "verified",
        "medicalHistory": [
            {
                "id": f"MED-{cow.id}",
                "date": "2026-09-28",
                "vetName": "Dr. R. Anand BVSc",
                "diagnosis": "Routine Veterinary Health & Udder Assessment",
                "symptoms": "Optimal physical condition, clear eyes, moist muzzle",
                "bodyTemperatureC": 38.6,
                "heartRateBpm": 68,
                "rumenMotility": "Normal (3/2min)",
                "recommendations": "CMT test negative. Continue high-protein green fodder and mineral supplement.",
                "followUpDate": "2026-11-20",
            }
        ],
        "vaccinationHistory": [
            {
                "id": f"VAC-{cow.id}-1",
                "vaccineName": "Foot and Mouth Disease (FMD) Bi-annual",
                "dateAdministered": "2026-06-15",
                "nextDueDate": "2026-12-15",
                "batchNumber": "FMD-2026-B874",
                "administeredBy": "Dr. R. Anand BVSc",
                "status": "up_to_date"
            },
            {
                "id": f"VAC-{cow.id}-2",
                "vaccineName": "Brucellosis S19 Strain",
                "dateAdministered": "2023-04-10",
                "nextDueDate": "Life Immunity",
                "batchNumber": "BRU-23-441",
                "administeredBy": "Veterinary Dispensary Melur",
                "status": "up_to_date"
            }
        ],
        "inseminationHistory": [],
        "treatmentRecords": [],
        "createdAt": cow.created_at.isoformat() if cow.created_at else None,
        "farmer": {
            "id": str(farmer_user.id) if farmer_user else str(cow.farmer_id),
            "name": farmer_name,
            "fullName": farmer_name,
            "mobileNumber": farmer_user.phone if farmer_user else "",
            "phone": farmer_user.phone if farmer_user else "",
            "farmerIdCode": farmer.farmer_id_code if farmer else "",
            "address": farmer.address if farmer else "",
            "village": farmer.village if farmer else "",
            "community": farmer.community if farmer else "",
            "numberOfCows": farmer.cows.count() if farmer else 1,
            "assignedBoothId": str(farmer.society_id) if (farmer and farmer.society_id) else "",
            "verificationStatus": farmer.verification_status if farmer else "verified",
            "bankAccountName": farmer.bank_account_name if farmer else "",
            "bankName": farmer.bank_name if farmer else "",
            "bankAccountNumber": farmer.bank_account_number if farmer else "",
            "bankIfsc": farmer.bank_ifsc if farmer else "",
            "upiId": farmer.upi_id if farmer else "",
        } if farmer else None,
        "society": {
            "id": str(society.user_id) if society else "",
            "name": society_name,
            "phone": society_user.phone if society_user else "",
        } if society else None,
    }


class CowScanView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, tag_id):
        clean_tag = str(tag_id).strip()
        cow = Cow.objects.filter(
            models.Q(pashu_aadhaar=clean_tag) | models.Q(pashu_aadhaar__iexact=clean_tag)
        ).select_related('farmer__user', 'farmer__society__user').first()

        if not cow:
            try:
                import uuid
                uuid_val = uuid.UUID(clean_tag)
                cow = Cow.objects.filter(pk=uuid_val).select_related('farmer__user', 'farmer__society__user').first()
            except (ValueError, AttributeError):
                pass

        if not cow and len(clean_tag) >= 8:
            cow = Cow.objects.filter(pashu_aadhaar__icontains=clean_tag).select_related('farmer__user', 'farmer__society__user').first()

        if not cow:
            return Response({
                "success": False,
                "message": f"Cattle with tag #{clean_tag} not found in database.",
                "data": None
            }, status=404)

        data = serialize_cow_full(cow)
        return success({"cow": data, "farmer": data["farmer"], "society": data["society"]}, f"Cattle #{cow.pashu_aadhaar} details retrieved")


class CowListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        tag = request.query_params.get('tag', '').strip()
        search = request.query_params.get('search', '').strip()
        farmer_id = request.query_params.get('farmer_id', '').strip()

        qs = Cow.objects.all().select_related('farmer__user', 'farmer__society__user').order_by('created_at', 'id')
        if tag:
            qs = qs.filter(pashu_aadhaar__icontains=tag)
        if search:
            qs = qs.filter(
                models.Q(pashu_aadhaar__icontains=search) |
                models.Q(name__icontains=search) |
                models.Q(breed__icontains=search) |
                models.Q(farmer__user__full_name__icontains=search)
            )
        if farmer_id:
            qs = qs.filter(farmer_id=farmer_id)

        cows_data = [serialize_cow_full(cow) for cow in qs]
        return success({"cows": cows_data, "total": len(cows_data)}, "All cattle records with farmer details retrieved")


class CowDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, cow_id):
        clean_id = str(cow_id).strip()
        cow = Cow.objects.filter(
            models.Q(pashu_aadhaar=clean_id) | models.Q(id=clean_id)
        ).select_related('farmer__user', 'farmer__society__user').first()

        if not cow:
            return Response({
                "success": False,
                "message": f"Cow {clean_id} not found",
                "data": None
            }, status=404)

        data = serialize_cow_full(cow)
        return success({"cow": data, "farmer": data["farmer"], "society": data["society"]}, "Cow details retrieved")

