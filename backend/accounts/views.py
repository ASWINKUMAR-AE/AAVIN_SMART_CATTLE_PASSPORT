from django.db import connection
from django.http import JsonResponse
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.exceptions import ValidationError
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from .responses import success
from .serializers import LoginSerializer, RegisterSerializer, UserSerializer

class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"
    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        refresh = RefreshToken.for_user(user)
        user.last_login = timezone.now()
        user.save(update_fields=["last_login"])
        return success({"accessToken": str(refresh.access_token), "refreshToken": str(refresh),
                        "user": UserSerializer(user).data}, "Login successful")

class RegisterView(APIView):
    def post(self, request):
        serializer = RegisterSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        return success({"user": UserSerializer(serializer.save()).data}, "Account created", 201)

class RefreshView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        serializer = TokenRefreshSerializer(data={"refresh": request.data.get("refreshToken", "")})
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as exc:
            raise InvalidToken(str(exc))
        return success({"accessToken": serializer.validated_data["access"]}, "Token refreshed")

class MeView(APIView):
    def get(self, request):
        return success({"user": UserSerializer(request.user).data})

class LogoutView(APIView):
    def post(self, request):
        raw = request.data.get("refreshToken")
        if raw:
            try:
                token = RefreshToken(raw)
                if str(token["user_id"]) != str(request.user.pk):
                    raise ValidationError("Refresh token belongs to another account")
                token.blacklist()
            except TokenError as exc:
                raise InvalidToken(str(exc))
        return success(message="Logged out; supply refreshToken to revoke it. Access tokens expire automatically.")

def health(request):
    return JsonResponse({"success": True, "service": "aavin-django", "database": "postgresql"})

def ready(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return JsonResponse({"success": True, "database": "connected"})
    except Exception:
        return JsonResponse({"success": False, "message": "Database unavailable"}, status=503)


class FarmerListView(APIView):
    def get(self, request):
        from .models import User
        from rest_framework.exceptions import PermissionDenied
        if request.user.role != User.Role.SOCIETY:
            raise PermissionDenied('Only Society accounts can list their Farmers.')
        farmers = User.objects.filter(role=User.Role.FARMER, parent=request.user).select_related('parent', 'farmer_profile').prefetch_related('cows').order_by('date_joined', 'id')
        return success({'farmers': UserSerializer(farmers, many=True).data})
