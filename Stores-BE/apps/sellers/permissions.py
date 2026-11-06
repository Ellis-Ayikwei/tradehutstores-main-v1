from rest_framework import permissions


class IsSeller(permissions.BasePermission):
    """Authenticated user who has a seller profile (any verification status).

    Authenticated users without a profile get 404 ``not_a_seller`` so the
    application UI can tell "never applied" apart from "not logged in".
    Reads are allowed for every status (a suspended seller still sees their
    dashboard banner); writes need an active, non-suspended account.
    """

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if not hasattr(user, "seller_profile"):
            from .services import SellerApiError

            raise SellerApiError(404, "not_a_seller", "You do not have a seller account.")
        if request.method not in permissions.SAFE_METHODS:
            from .services import ensure_account_writable

            ensure_account_writable(user.seller_profile)
        return True


class IsStaff(permissions.BasePermission):
    message = "Staff only."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_staff)
