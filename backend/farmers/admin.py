from django.contrib import admin

from .models import Cow, Farmer

@admin.register(Farmer)
class FarmerAdmin(admin.ModelAdmin):
    list_display = ('farmer_id_code', 'user', 'village', 'verification_status')
    search_fields = ('farmer_id_code', 'user__phone', 'user__full_name')


@admin.register(Cow)
class CowAdmin(admin.ModelAdmin):
    list_display = ('pashu_aadhaar', 'farmer', 'breed', 'milk_capacity', 'name')
    search_fields = ('pashu_aadhaar', 'name', 'farmer__user__phone', 'farmer__user__full_name')
    list_filter = ('breed',)
    readonly_fields = ('id', 'created_at')
