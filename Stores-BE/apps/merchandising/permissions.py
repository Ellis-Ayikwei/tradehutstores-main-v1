from rest_framework import permissions


class MerchandisingAdminPermission(permissions.BasePermission):
    """Staff-only access for homepage merchandising admin API."""

    message = "Staff authentication required for this action."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return bool(getattr(user, "is_staff", False) or getattr(user, "is_superuser", False))
