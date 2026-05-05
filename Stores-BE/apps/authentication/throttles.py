"""
apps.authentication.throttles

Rate-limit policies used by the modal auth flow.

We piggy-back on DRF's ``SimpleRateThrottle`` so the cache backend swap is
trivial — just point ``CACHES`` at Redis on Railway and the same code keys
under-the-hood become Redis keys.

Buckets are keyed by **identifier** (email/phone), not IP, so a shared NAT
won't lock a whole office out of OTP delivery.
"""

from __future__ import annotations

from rest_framework.throttling import SimpleRateThrottle


class _IdentifierThrottle(SimpleRateThrottle):
    """Base class — pulls the identifier out of the request body."""

    scope = ""

    def get_cache_key(self, request, view):
        identifier = (
            request.data.get("identifier")
            or request.data.get("email")
            or request.data.get("phone")
            or ""
        )
        identifier = identifier.strip().lower()
        if not identifier:
            # Fall back to IP when no identifier — better than no key at all.
            identifier = self.get_ident(request)
        return self.cache_format % {
            "scope": self.scope,
            "ident": identifier,
        }


class SendOTPThrottle(_IdentifierThrottle):
    """3 OTP sends per minute, 10 per hour, per identifier."""
    scope = "auth_send_otp_min"
    rate = "3/min"


class SendOTPHourlyThrottle(_IdentifierThrottle):
    scope = "auth_send_otp_hour"
    rate = "10/hour"


class VerifyOTPThrottle(_IdentifierThrottle):
    """20 verify attempts per hour. Combined with the per-session attempt
    counter (max 5) this neutralises both online brute force and credential
    stuffing."""
    scope = "auth_verify_otp"
    rate = "20/hour"


class IdentifyThrottle(SimpleRateThrottle):
    """30 identify calls per minute, per IP. Cheap endpoint, just stops
    enumeration scrapers."""
    scope = "auth_identify"
    rate = "30/min"

    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }


class PasswordLoginThrottle(_IdentifierThrottle):
    """10 password attempts per hour per identifier."""
    scope = "auth_password_login"
    rate = "10/hour"
