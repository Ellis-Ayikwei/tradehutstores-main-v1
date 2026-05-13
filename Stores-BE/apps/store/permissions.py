from rest_framework import permissions


class StoreConfigAdminPermission(permissions.BasePermission):
    """Read & write require platform staff (is_staff or is_superuser)."""

    message = "Staff authentication required to access store configuration."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return bool(getattr(user, "is_staff", False) or getattr(user, "is_superuser", False))
