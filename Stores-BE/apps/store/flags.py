"""
Feature-flag evaluation. See .claude/plans/24-feature-flags.md.

    from apps.store.flags import feature_enabled
    permission_classes = [IsAuthenticated, feature_enabled("sellers")]
"""

from rest_framework import permissions
from rest_framework.exceptions import APIException

from .models import FeatureFlag, StoreConfig


class FeatureDisabled(APIException):
    status_code = 403
    default_code = "feature_disabled"
    default_detail = "This feature is not available to you yet."

    def __init__(self, key: str):
        super().__init__(detail={"detail": self.default_detail, "code": self.default_code, "feature": key})


def _clean_country(value):
    value = (value or "").strip().upper()
    return value if len(value) == 2 and value.isalpha() and value not in ("XX", "T1") else ""


def resolve_country(request) -> str:
    """CDN header, then client hint (spoofable: rollout control, not a legal block), then store default."""
    meta = request.META
    for candidate in (
        meta.get("HTTP_CF_IPCOUNTRY"),
        meta.get("HTTP_X_CLIENT_COUNTRY"),
        request.query_params.get("country") if hasattr(request, "query_params") else request.GET.get("country"),
    ):
        country = _clean_country(candidate)
        if country:
            return country
    return _clean_country(StoreConfig.singleton().locale_country)


def user_roles(user) -> set:
    if not (user and user.is_authenticated):
        return {"guest"}
    roles = {"buyer"}
    if hasattr(user, "seller_profile"):
        roles.add("seller")
    if getattr(user, "is_staff", False) or getattr(user, "is_superuser", False):
        roles.add("staff")
    return roles


def _upper_list(values):
    return {str(v).upper() for v in (values or [])}


def evaluate(flag, user, country: str) -> bool:
    """`flag` is a FeatureFlag or None (unknown flags fail closed).

    The platform owner (an authenticated superuser) is always allowed, even when the
    flag is `off` or has no row, so they can never be locked out of the settings that
    edit the flags. `is_staff` alone gets no such bypass: `off` still blocks them.
    """
    authed = bool(user and user.is_authenticated)
    if authed and getattr(user, "is_superuser", False):
        return True
    if flag is None or flag.status == "off":
        return False
    is_staff = authed and (getattr(user, "is_staff", False) or getattr(user, "is_superuser", False))
    if is_staff or (authed and flag.beta_users.filter(pk=user.pk).exists()):
        return True
    if flag.status == "beta":
        return False
    audiences = set(flag.audiences or [])
    if audiences and not (audiences & user_roles(user)):
        return False
    country = (country or "").upper()
    if country and country in _upper_list(flag.excluded_countries):
        return False
    allowed = _upper_list(flag.countries)
    if allowed and country not in allowed:
        return False
    return True


def is_enabled(key: str, request) -> bool:
    flag = FeatureFlag.objects.filter(key=key).first()
    return evaluate(flag, request.user, resolve_country(request))


def evaluate_all(request) -> dict:
    country = resolve_country(request)
    return {f.key: evaluate(f, request.user, country) for f in FeatureFlag.objects.all()}


def feature_enabled(key: str):
    """DRF permission factory. Denied callers get 403 code=feature_disabled."""

    class _FeatureEnabled(permissions.BasePermission):
        def has_permission(self, request, view):
            if not is_enabled(key, request):
                raise FeatureDisabled(key)
            return True

    _FeatureEnabled.__name__ = f"FeatureEnabled_{key.replace('-', '_')}"
    return _FeatureEnabled
