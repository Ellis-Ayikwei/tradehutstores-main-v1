from rest_framework import permissions


class AdsAdminPermission(permissions.BasePermission):
    """Staff-only access for the ads admin API."""

    message = "Staff authentication required for ad management."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return bool(getattr(user, "is_staff", False) or getattr(user, "is_superuser", False))
