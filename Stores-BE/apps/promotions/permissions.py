from rest_framework import permissions


class PromosAdminPermission(permissions.BasePermission):
    """Platform staff (is_staff/is_superuser) can manage every promo."""

    message = "Staff authentication required for platform-wide promo management."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return bool(getattr(user, "is_staff", False) or getattr(user, "is_superuser", False))


class SellerPromoPermission(permissions.BasePermission):
    """Sellers can only manage promos that belong to their SellerProfile."""

    message = "You must be a verified seller to manage seller-scoped promos."

    def _seller_profile(self, user):
        return getattr(user, "seller_profile", None)

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return self._seller_profile(user) is not None

    def has_object_permission(self, request, view, obj):
        seller = self._seller_profile(request.user)
        if seller is None:
            return False
        return obj.seller_id == seller.pk
