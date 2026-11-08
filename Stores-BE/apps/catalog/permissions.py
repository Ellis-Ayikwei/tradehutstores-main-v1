from rest_framework import permissions


class CatalogAdminPermission(permissions.BasePermission):
    """Staff-only CRUD for catalog admin endpoints."""

    message = "Staff authentication required for catalog management."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return bool(getattr(user, "is_staff", False) or getattr(user, "is_superuser", False))


class IsEligibleSeller(permissions.BasePermission):
    """Authenticated user with an active seller profile (pending or verified)."""

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        from .services import ensure_seller_eligible

        ensure_seller_eligible(user)
        return True
