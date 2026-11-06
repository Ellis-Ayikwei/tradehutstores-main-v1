"""Seller permissions for the auctions app.

Reuses ``apps.sellers.permissions.IsSeller`` (404 ``not_a_seller`` for users with no
profile). ``apps.core.permissions`` / ``IsVerifiedSeller`` do not exist yet, so the
stricter checks live here; swap for the core ones when BE-0 lands them.
"""

from apps.sellers.permissions import IsSeller as _BaseIsSeller

from .errors import ApiError


def is_seller_verified(profile) -> bool:
    return bool(profile and profile.verification_status == "verified" and profile.is_active)


class IsSeller(_BaseIsSeller):
    """Seller profile exists, is active and not suspended."""

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        profile = request.user.seller_profile
        if not profile.is_active or profile.verification_status == "suspended":
            raise ApiError(403, "seller_suspended", "Your seller account is suspended.")
        return True


class IsVerifiedSeller(IsSeller):
    """IsSeller and ``verification_status == "verified"``."""

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        if not is_seller_verified(request.user.seller_profile):
            raise ApiError(403, "seller_not_verified", "Your seller account must be verified first.")
        return True
