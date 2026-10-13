from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from .models import User

class AccountCreationForm(UserCreationForm):
    class Meta(UserCreationForm.Meta):
        model = User
        fields = ("phone", "full_name", "role", "parent")

class AccountChangeForm(UserChangeForm):
    class Meta(UserChangeForm.Meta):
        model = User
        fields = "__all__"

@admin.register(User)
class AccountAdmin(UserAdmin):
    add_form = AccountCreationForm
    form = AccountChangeForm
    ordering = ("phone",)
    list_display = ("phone", "full_name", "role", "parent", "is_active")
    list_filter = ("role", "is_active")
    search_fields = ("phone", "full_name")
    fieldsets = ((None, {"fields": ("phone", "password")}),
                 ("Account", {"fields": ("full_name", "role", "parent", "created_by")}),
                 ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
                 ("Dates", {"fields": ("last_login", "date_joined")}))
    add_fieldsets = ((None, {"classes": ("wide",), "fields": ("phone", "full_name", "role", "parent", "password1", "password2")}),)
    readonly_fields = ("created_by",)
