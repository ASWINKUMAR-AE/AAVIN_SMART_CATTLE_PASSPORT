from decimal import Decimal
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from accounts.models import User, phone_validator
from .models import Cow, Farmer


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

class FarmerSerializer(serializers.ModelSerializer):
    farmerIdCode = serializers.CharField(source='farmer_id_code', max_length=64)
    numberOfCows = serializers.IntegerField(source='number_of_cows', min_value=0)
    verificationStatus = serializers.CharField(source='verification_status', read_only=True)
    bankAccountName = serializers.CharField(source='bank_account_name', max_length=150, required=False, allow_blank=True)
    bankName = serializers.CharField(source='bank_name', max_length=150, required=False, allow_blank=True)
    bankAccountNumber = serializers.CharField(source='bank_account_number', max_length=64, required=False, allow_blank=True)
    bankIfsc = serializers.CharField(source='bank_ifsc', max_length=11, required=False, allow_blank=True)
    upiId = serializers.CharField(source='upi_id', max_length=150, required=False, allow_blank=True)

    class Meta:
        model = Farmer
        fields = ['farmerIdCode', 'address', 'village', 'community', 'numberOfCows',
                  'verificationStatus', 'bankAccountName', 'bankName', 'bankAccountNumber', 'bankIfsc', 'upiId']

    def validate_farmerIdCode(self, value):
        value = value.strip().upper()
        if Farmer.objects.filter(farmer_id_code__iexact=value).exists():
            raise serializers.ValidationError('This Farmer ID code is already registered.')
        return value

    def validate_bankIfsc(self, value):
        return value.strip().upper()


class FarmerUpdateSerializer(FarmerSerializer):
    verificationStatus = serializers.ChoiceField(source='verification_status', choices=['pending', 'verified'], required=False)
    numberOfCows = serializers.IntegerField(source='number_of_cows', read_only=True)

    def validate_farmerIdCode(self, value):
        value = value.strip().upper()
        if Farmer.objects.filter(farmer_id_code__iexact=value).exclude(user=self.context['farmer']).exists():
            raise serializers.ValidationError('This Farmer ID code is already registered.')
        return value


class CowUpdateSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    milkCapacity = serializers.DecimalField(source='milk_capacity', max_digits=8, decimal_places=2,
                                            min_value=Decimal('0.01'), required=False)


class FarmerUpdateSerializer(serializers.Serializer):
    phone = serializers.CharField(validators=[phone_validator], required=False)
    fullName = serializers.CharField(max_length=150, required=False)
    personalDetails = FarmerUpdateSerializer(required=False)
    cows = CowUpdateSerializer(many=True, required=False)
    newCows = CowSerializer(many=True, required=False)

    def validate_newCows(self, cows):
        tags = []
        for cow in cows:
            if not all(field in cow for field in ['pashu_aadhaar', 'breed', 'milk_capacity']):
                raise serializers.ValidationError('Each new cow needs Pashu Aadhaar, breed and milk capacity.')
            tags.append(cow['pashu_aadhaar'])
        if len(tags) != len(set(tags)):
            raise serializers.ValidationError('Each new cow must have a different Pashu Aadhaar.')
        return cows

    def validate_phone(self, value):
        if User.objects.filter(phone=value).exclude(pk=self.instance.pk).exists():
            raise serializers.ValidationError('An account with this phone already exists.')
        return value

    def validate_cows(self, cows):
        ids = [cow.get('id') for cow in cows]
        if None in ids or len(ids) != len(set(ids)):
            raise serializers.ValidationError('Provide a unique saved cow ID for each update.')
        owned = set(self.instance.farmer.cows.filter(pk__in=ids).values_list('pk', flat=True))
        if set(ids) != owned:
            raise serializers.ValidationError('Only saved cows belonging to this Farmer can be updated.')
        return cows

    def validate(self, attrs):
        details = attrs.get('personalDetails')
        if details is not None and not Farmer.objects.filter(user=self.instance, has_personal_details=True).exists():
            if not all(details.get(field) for field in ['farmer_id_code', 'address', 'village']):
                raise serializers.ValidationError({'personalDetails': 'Complete Farmer ID, address and village before saving or verifying this account.'})
        return attrs

    def update(self, user, validated_data):
        try:
            with transaction.atomic():
                if 'phone' in validated_data:
                    user.phone = validated_data['phone']
                if 'fullName' in validated_data:
                    user.full_name = validated_data['fullName']
                user.full_clean()
                user.save(update_fields=['phone', 'full_name'])
                for changes in validated_data.get('cows', []):
                    cow = user.farmer.cows.select_for_update().get(pk=changes['id'])
                    for field, value in changes.items():
                        if field != 'id':
                            setattr(cow, field, value)
                    cow.full_clean()
                    cow.save()
                for details in validated_data.get('newCows', []):
                    cow = Cow(farmer_id=user.pk, **details)
                    cow.full_clean()
                    cow.save()
                if 'personalDetails' in validated_data or validated_data.get('newCows'):
                    profile = user.farmer
                    for field, value in validated_data.get('personalDetails', {}).items():
                        setattr(profile, field, value)
                    profile.number_of_cows = user.farmer.cows.count()
                    profile.has_personal_details = True
                    profile.full_clean()
                    profile.save()
                return user
        except IntegrityError:
            raise serializers.ValidationError('Phone or Farmer ID is already registered.')
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict if hasattr(exc, 'message_dict') else exc.messages)
