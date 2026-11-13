"""
Social sign-in for the buyer storefront: ``POST auth/social/``.

The browser gets an access token from the provider's own SDK and posts it here.
Each provider reduces to one question: "whose verified email does this token
belong to, and was it issued to OUR app?". Everything after that (find or
create the user, issue tokens) is one shared path that returns the same
envelope as ``LoginAPIView``.

Accounts are matched on the provider-verified email. No provider user id is
stored, so someone who changes the email on their Google/Facebook account
lands in a new TradeHut account.
"""

import logging
import uuid

import requests
from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import User

from .models import UserVerification
from .utils import get_client_ip, track_login, track_register
from .views import UserAuthSerializer

logger = logging.getLogger(__name__)

# Seconds to wait on a provider before failing the sign-in (no retry: the buyer
# can click again or use their password).
PROVIDER_TIMEOUT = 5
MAX_TOKEN_LENGTH = 4096


class SocialAuthError(Exception):
    """A sign-in the buyer can be told about. ``message`` is safe to display."""

    def __init__(self, message, http_status=status.HTTP_401_UNAUTHORIZED):
        super().__init__(message)
        self.message = message
        self.http_status = http_status


def verify_google(access_token):
    """Return the Google profile behind ``access_token``.

    The audience check is what stops a token issued to some other site's
    Google app from being replayed here.
    """
    info = requests.get(
        "https://oauth2.googleapis.com/tokeninfo",
        params={"access_token": access_token},
        timeout=PROVIDER_TIMEOUT,
    )
    if info.status_code != 200 or info.json().get("aud") != settings.GOOGLE_OAUTH_CLIENT_ID:
        raise SocialAuthError("Google sign-in could not be verified. Please try again.")

    profile = requests.get(
        "https://openidconnect.googleapis.com/v1/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=PROVIDER_TIMEOUT,
    )
    if profile.status_code != 200:
        raise SocialAuthError("Google sign-in could not be verified. Please try again.")
    data = profile.json()
    # Google sends a boolean here but a string on some legacy responses.
    if str(data.get("email_verified")).lower() != "true" or not data.get("email"):
        raise SocialAuthError(
            "Your Google account has no verified email address. Sign in with your email and password instead.",
            status.HTTP_400_BAD_REQUEST,
        )
    return {
        "email": data["email"],
        "first_name": data.get("given_name") or "",
        "last_name": data.get("family_name") or "",
    }


def verify_facebook(access_token):
    """Return the Facebook profile behind ``access_token``.

    ``debug_token`` is called with the app token (id|secret), so only our own
    backend can run the check, and ``app_id`` must be ours.
    """
    debug = requests.get(
        "https://graph.facebook.com/debug_token",
        params={
            "input_token": access_token,
            "access_token": f"{settings.FACEBOOK_APP_ID}|{settings.FACEBOOK_APP_SECRET}",
        },
        timeout=PROVIDER_TIMEOUT,
    )
    token_data = debug.json().get("data", {}) if debug.status_code == 200 else {}
    if not token_data.get("is_valid") or str(token_data.get("app_id")) != settings.FACEBOOK_APP_ID:
        raise SocialAuthError("Facebook sign-in could not be verified. Please try again.")

    profile = requests.get(
        "https://graph.facebook.com/me",
        params={"fields": "id,email,first_name,last_name", "access_token": access_token},
        timeout=PROVIDER_TIMEOUT,
    )
    if profile.status_code != 200:
        raise SocialAuthError("Facebook sign-in could not be verified. Please try again.")
    data = profile.json()
    # Facebook only returns an email it has confirmed; phone-only accounts and
    # buyers who untick the email permission have none.
    if not data.get("email"):
        raise SocialAuthError(
            "Facebook did not share an email address for your account. Sign in with your email and password instead.",
            status.HTTP_400_BAD_REQUEST,
        )
    return {
        "email": data["email"],
        "first_name": data.get("first_name") or "",
        "last_name": data.get("last_name") or "",
    }


# provider -> (display name, verifier, settings that must all be non-empty)
PROVIDERS = {
    "google": ("Google", verify_google, ("GOOGLE_OAUTH_CLIENT_ID",)),
    "facebook": ("Facebook", verify_facebook, ("FACEBOOK_APP_ID", "FACEBOOK_APP_SECRET")),
}


class SocialLoginAPIView(APIView):
    """Body: ``{"provider": "google" | "facebook", "access_token": "<provider token>"}``.

    200: same body and headers as ``LoginAPIView`` (user in the body, tokens in
    ``Authorization`` and ``X-Refresh-Token``). Errors are ``{"detail": ...}``.
    """

    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        provider = request.data.get("provider")
        access_token = request.data.get("access_token")
        entry = PROVIDERS.get(provider) if isinstance(provider, str) else None
        if entry is None or not all(getattr(settings, name, "") for name in entry[2]):
            return Response(
                {"detail": "This sign-in method is not available."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        label, verify, _ = entry
        if not isinstance(access_token, str) or not access_token or len(access_token) > MAX_TOKEN_LENGTH:
            return Response(
                {"detail": f"{label} sign-in did not complete. Please try again."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            profile = verify(access_token)
        except SocialAuthError as exc:
            return Response({"detail": exc.message}, status=exc.http_status)
        except (requests.RequestException, ValueError):
            # ValueError covers a non-JSON body from the provider.
            logger.warning("Social sign-in: %s unreachable or returned an unreadable response", provider)
            return Response(
                {"detail": f"We could not reach {label}. Try again, or sign in with your email and password."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        email = profile["email"].strip().lower()
        created = False
        with transaction.atomic():
            user = User.objects.select_for_update().filter(email__iexact=email).first()
            if user is None:
                username = email.split("@")[0][:140]
                if User.objects.filter(username=username).exists():
                    username = f"{username}-{uuid.uuid4().hex[:8]}"
                try:
                    with transaction.atomic():
                        # password=None stores an unusable password.
                        user = User.objects.create_user(
                            email=email,
                            username=username,
                            password=None,
                            first_name=profile["first_name"][:150],
                            last_name=profile["last_name"][:150],
                        )
                    created = True
                except IntegrityError:
                    # A concurrent request for the same buyer won the insert.
                    user = User.objects.filter(email__iexact=email).first()
                    if user is None:
                        raise

            verification, _ = UserVerification.objects.get_or_create(user=user)

            if user.is_staff or user.is_superuser:
                return Response(
                    {"detail": "Staff accounts sign in from the admin site."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            if user.is_2fa_enabled:
                return Response(
                    {"detail": "This account uses two-step verification. Sign in with your email and password."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            if not user.is_active:
                if verification.email_verified:
                    # Verified once and inactive now: staff switched it off.
                    return Response(
                        {"detail": "This account is disabled. Contact support for help."},
                        status=status.HTTP_403_FORBIDDEN,
                    )
                # Signup that never confirmed its email. The provider has now
                # proved who owns the address, so activate it, and drop the
                # password because whoever typed it was never proven to be
                # the owner.
                user.is_active = True
                user.set_unusable_password()
                user.save(update_fields=["is_active", "password"])

            if not verification.email_verified:
                verification.email_verified = True
                verification.email_verified_at = timezone.now()
                verification.save(update_fields=["email_verified", "email_verified_at"])

        if created:
            track_register(user, details={"registration_method": provider})
        track_login(
            user,
            details={
                "ip": get_client_ip(request),
                "login_method": provider,
                "user_agent": request.META.get("HTTP_USER_AGENT", ""),
            },
        )
        logger.info("Social sign-in (%s) for user %s", provider, user.id)

        refresh = RefreshToken.for_user(user)
        response = Response({"user": UserAuthSerializer(user).data})
        response["Authorization"] = f"Bearer {refresh.access_token}"
        response["X-Refresh-Token"] = str(refresh)
        response["Access-Control-Expose-Headers"] = "Authorization, X-Refresh-Token"
        return response
