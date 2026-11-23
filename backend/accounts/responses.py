from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

def success(data=None, message="Success", status=200):
    return Response({"success": True, "message": message, "data": data, "timestamp": timezone.now().isoformat()}, status=status)

def exception_handler(exc, context):
    response = drf_exception_handler(exc, context)
    if response is not None:
        errors = response.data
        detail = errors.get("detail") if isinstance(errors, dict) else None
        response.data = {"success": False, "message": str(detail or "Validation failed"), "errors": errors,
                         "timestamp": timezone.now().isoformat()}
    return response
