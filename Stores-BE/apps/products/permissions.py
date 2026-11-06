"""Write permissions for the catalogue.

Reads stay public (visibility is handled by ``apps.products.visibility``).
Writes need staff, or a seller who is active and pending/verified, acting on
their own products only.
"""

from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied

WRITING_SELLER_STATUSES = ("pending", "verified")


def writing_seller_profile(user):
    """The user's seller profile if it may manage listings, else ``None``."""
    profile = getattr(user, "seller_profile", None)
    if profile is None or not profile.is_active:
        return None
    if profile.verification_status not in WRITING_SELLER_STATUSES:
        return None
    return profile


def owns_product(user, product):
    if user.is_staff:
        return True
    profile = writing_seller_profile(user)
    return bool(
        profile is not None
        and product is not None
        and product.seller_profile_id == profile.pk
    )


class IsStaffOrWritingSeller(permissions.BasePermission):
    """Safe methods: anyone. Writes: staff or an active pending/verified seller."""

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        user = request.user
        if not (user and user.is_authenticated):
            return False
        return bool(user.is_staff or writing_seller_profile(user))


class ProductOwnerOrStaff(IsStaffOrWritingSeller):
    """Object level for ``Product``: the owning seller or staff."""

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return owns_product(request.user, obj)


class ParentProductOwnerOrStaff(IsStaffOrWritingSeller):
    """Object level for rows hanging off a product (variant, image, ...)."""

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return owns_product(request.user, getattr(obj, "product", None))


def assert_can_attach(user, product):
    """On create/update of a child row: the target product must be the caller's."""
    if not owns_product(user, product):
        raise PermissionDenied("You can only manage your own products.")
