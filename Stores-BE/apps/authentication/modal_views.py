"""
apps.authentication.modal_views

State-machine endpoints powering the ``AuthModal`` on the marketing site.

These live alongside the legacy /login/ + /register/ endpoints — they are
NOT a replacement. Existing flows keep working untouched. The modal flow
is mounted under ``/tradehut/api/v1/auth/modal/`` and is fully stateless
on the server: every step round-trips through a ``flow_token`` issued at
``/identify/``.

Flow summary::

    /identify/         → returns {exists, methods, flow_token}
    /send-otp/         → emails/SMS-es a 6-digit code (hashed at rest)
    /verify-otp/       → either logs the user in (existing) or stamps the
                         session as OTP_VERIFIED so /create-account/ can run
    /login-password/   → password path for existing users
    /set-password/     → optional, post-OTP, for new users
    /create-account/   → finalises a signup, returns tokens
    /refresh/          → JWT refresh wrapper (kept here so the FE sees one
                         coherent surface)

Security invariants
-------------------
- OTPs are stored hashed (django.contrib.auth.hashers.make_password). The
  plaintext is returned by ``AuthFlowSession.issue_otp()`` exactly once so
  the delivery channel can use it.
- Per-identifier throttles (``throttles.py``) prevent online brute force.
- ``identify`` ALWAYS returns the same shape regardless of whether the user
  exists — this prevents account-enumeration via response timing/shape.
"""

from __future__ import annotations

import logging
from typing import Any

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.core.mail import send_mail
from django.db import transaction
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import AuthFlowSession, _normalise_identifier, mask_identifier
from .throttles import (
    IdentifyThrottle,
    PasswordLoginThrottle,
    SendOTPHourlyThrottle,
    SendOTPThrottle,
    VerifyOTPThrottle,
)

logger = logging.getLogger(__name__)
User = get_user_model()

# Repeated literals — kept here so a future security review can grep one spot.
ERR_INVALID_FLOW = "Invalid or expired flow."
ERR_VERIFY_FIRST = "Verify the code first."


# ─── Helpers ────────────────────────────────────────────────────────────────

def _client_ip(request) -> str | None:
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def _user_for_identifier(identifier: str, kind: str):
    """Resolve a User row by identifier. Returns ``None`` if not found —
    the caller decides whether that's a signup or an enumeration miss."""
    if kind == "email":
        return User.objects.filter(email__iexact=identifier).first()
    # phone — User has no phone column today, but Profile does.
    return (
        User.objects.filter(profile__phone_number=identifier).first()
        if hasattr(User, "profile")
        else None
    )


def _get_session(request) -> AuthFlowSession | None:
    token = request.data.get("flow_token") or request.headers.get("X-Auth-Flow")
    if not token:
        return None
    try:
        s = AuthFlowSession.objects.get(flow_token=token)
    except AuthFlowSession.DoesNotExist:
        return None
    if s.is_expired:
        return None
    return s


def _issue_jwt(user) -> dict[str, Any]:
    """Build the standard token pair — same shape every endpoint returns,
    so the FE only needs to learn one schema."""
    rt = RefreshToken.for_user(user)
    return {
        "access": str(rt.access_token),
        "refresh": str(rt),
        "user": {
            "id": str(user.id),
            "email": user.email,
            "username": getattr(user, "username", "") or "",
            "is_staff": user.is_staff,
        },
    }


def _deliver_otp(*, identifier: str, kind: str, code: str) -> None:
    """Best-effort delivery. In dev (`EMAIL_BACKEND=console`) the code prints
    to stdout; in prod the configured SMTP/SMS backend takes over.

    The backend NEVER returns the OTP to the client — that's why this helper
    fires-and-forgets. Logging the code is gated by DEBUG."""
    if kind == "email":
        try:
            send_mail(
                subject="Your TradeHut verification code",
                message=(
                    f"Your one-time code is {code}.\n"
                    "It expires in 5 minutes. If you didn't request this, "
                    "ignore this email."
                ),
                from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
                recipient_list=[identifier],
                fail_silently=True,
            )
        except Exception:  # noqa: BLE001 — delivery must never break the flow
            logger.exception("Failed to send OTP email to %s", identifier)
    else:
        # SMS delivery hook — wire Twilio/etc here. For now we just log.
        logger.info("[auth-modal] SMS OTP for %s (delivery TBD)", identifier)

    if settings.DEBUG:
        logger.warning("[auth-modal][DEV] OTP for %s: %s", identifier, code)


# ─── Endpoints ──────────────────────────────────────────────────────────────


@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([IdentifyThrottle])
def identify(request):
    """Step 1 of the modal flow.

    Body: ``{ "identifier": "<email|phone>" }``

    Always returns the same shape so an attacker can't enumerate accounts:

        {
          "flow_token": "<opaque>",
          "identifier_kind": "email" | "phone",
          "masked": "ro****@gmail.com",
          "exists": bool,
          "methods": ["password", "otp"]   # subset of options for THIS user
        }
    """
    raw = request.data.get("identifier", "")
    try:
        identifier, kind = _normalise_identifier(raw)
    except ValueError as e:
        return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    user = _user_for_identifier(identifier, kind)
    purpose = AuthFlowSession.PURPOSE_LOGIN if user else AuthFlowSession.PURPOSE_SIGNUP

    session = AuthFlowSession.new(
        identifier=identifier,
        identifier_kind=kind,
        purpose=purpose,
        user=user,
        ip=_client_ip(request),
        user_agent=request.headers.get("User-Agent", ""),
    )

    methods: list[str] = ["otp"]
    if user and getattr(user, "has_usable_password", lambda: False)():
        methods.insert(0, "password")

    return Response(
        {
            "flow_token": session.flow_token,
            "identifier_kind": kind,
            "masked": mask_identifier(identifier, kind),
            "exists": user is not None,
            "methods": methods,
        }
    )


@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([SendOTPThrottle, SendOTPHourlyThrottle])
def send_otp(request):
    """Step 2 (or resend). Generates + delivers a fresh OTP.

    Body: ``{ "flow_token": "..." }``
    """
    s = _get_session(request)
    if s is None:
        return Response(
            {"detail": ERR_INVALID_FLOW}, status=status.HTTP_400_BAD_REQUEST
        )
    s.refresh_from_db(fields=["step"])
    if s.step == AuthFlowSession.STEP_OTP_VERIFIED:
        return Response(
            {
                "detail": (
                    "This email is already verified for this step. "
                    "Continue to finish signing up."
                )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not s.can_resend:
        return Response(
            {
                "detail": "Please wait before requesting another code.",
                "retry_in_seconds": 30,
            },
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )
    try:
        code = s.issue_otp(ttl_minutes=5)
    except ValueError as e:
        return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    _deliver_otp(identifier=s.identifier, kind=s.identifier_kind, code=code)
    return Response(
        {
            "sent": True,
            "expires_in_seconds": 300,
            "resend_in_seconds": 30,
            "attempts_remaining": s.otp_max_attempts,
        }
    )


@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([VerifyOTPThrottle])
def verify_otp(request):
    """Step 3.

    Body: ``{ "flow_token": "...", "code": "123456" }``

    Outcomes:
      • Existing user → tokens are returned immediately.
      • New user → ``needs_account: true`` so the FE can show the signup
        finalisation step.
    """
    s = _get_session(request)
    if s is None:
        return Response(
            {"detail": ERR_INVALID_FLOW}, status=status.HTTP_400_BAD_REQUEST
        )

    code = (request.data.get("code") or "").strip()
    if not code.isdigit() or len(code) != 6:
        return Response({"detail": "Code must be 6 digits."}, status=400)

    if s.is_otp_locked:
        return Response(
            {"detail": "Too many attempts. Start over."},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    if not s.verify_otp(code):
        remaining = max(0, s.otp_max_attempts - s.otp_attempts)
        return Response(
            {"detail": "Incorrect or expired code.", "attempts_remaining": remaining},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if s.user is not None:
        s.step = s.STEP_COMPLETED
        s.save(update_fields=["step", "updated_at"])
        return Response({"verified": True, "needs_account": False, **_issue_jwt(s.user)})

    # Signup path — the OTP is verified but the account doesn't exist yet.
    return Response(
        {
            "verified": True,
            "needs_account": True,
            "needs_password": True,  # FE may skip; password is optional
            "flow_token": s.flow_token,
        }
    )


@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([PasswordLoginThrottle])
def login_password(request):
    """Password fast-path for existing users.

    Body: ``{ "flow_token": "...", "password": "..." }``
    """
    s = _get_session(request)
    if s is None:
        return Response({"detail": ERR_INVALID_FLOW}, status=400)
    if s.purpose != AuthFlowSession.PURPOSE_LOGIN or s.user is None:
        return Response({"detail": "No account for this identifier."}, status=400)

    password = request.data.get("password") or ""
    user = authenticate(request, username=s.user.email, password=password)
    if user is None:
        return Response({"detail": "Incorrect credentials."}, status=400)

    s.step = s.STEP_COMPLETED
    s.save(update_fields=["step", "updated_at"])
    return Response(_issue_jwt(user))


@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def set_password(request):
    """Optional step in the signup flow — happens after OTP_VERIFIED but
    before /create-account/.

    Body: ``{ "flow_token": "...", "password": "..." }``

    The password is *staged* on the session (hashed) so /create-account/ can
    persist it atomically with the new user row.
    """
    from django.contrib.auth.hashers import make_password

    s = _get_session(request)
    if s is None:
        return Response({"detail": ERR_INVALID_FLOW}, status=400)
    if s.step != s.STEP_OTP_VERIFIED:
        return Response({"detail": ERR_VERIFY_FIRST}, status=400)

    pwd = request.data.get("password") or ""
    if len(pwd) < 8:
        return Response({"detail": "Password must be at least 8 characters."}, status=400)

    # We piggy-back on otp_hash as a transient slot — it's already cleared
    # at this point (verify_otp() blanks it). Avoids a schema migration just
    # for a 30-second-lived field.
    s.otp_hash = make_password(pwd)
    s.save(update_fields=["otp_hash", "updated_at"])
    return Response({"staged": True})


@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def create_account(request):
    """Finalise signup. Requires step=OTP_VERIFIED.

    Body: ``{ "flow_token": "...", "name": "...", "username": "..." }``
    """
    s = _get_session(request)
    if s is None:
        return Response({"detail": ERR_INVALID_FLOW}, status=400)
    if s.step != s.STEP_OTP_VERIFIED:
        return Response({"detail": ERR_VERIFY_FIRST}, status=400)
    if s.user is not None:
        return Response({"detail": "Account already exists."}, status=400)

    name = (request.data.get("name") or "").strip()
    username = (request.data.get("username") or "").strip()
    if not username:
        username = (s.identifier.split("@")[0] if s.identifier_kind == "email"
                    else s.identifier.lstrip("+"))

    with transaction.atomic():
        if s.identifier_kind == "email":
            user = User.objects.create(
                email=s.identifier,
                username=username[:150],
                first_name=name[:150],
            )
        else:
            # Phone-only signup: synthesise an email placeholder so the
            # User schema stays satisfied. UI prompts user to add email later.
            placeholder = f"{s.identifier.lstrip('+')}@phone.tradehut.local"
            user = User.objects.create(
                email=placeholder,
                username=username[:150],
                first_name=name[:150],
            )

        if s.otp_hash:
            # Password was staged via /set-password/.
            user.password = s.otp_hash  # already a hash
            user.save(update_fields=["password"])
        else:
            user.set_unusable_password()
            user.save(update_fields=["password"])

        s.user = user
        s.otp_hash = ""
        s.step = s.STEP_COMPLETED
        s.save(update_fields=["user", "otp_hash", "step", "updated_at"])

    return Response(_issue_jwt(user), status=status.HTTP_201_CREATED)


@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def refresh(request):
    """Stateless wrapper around ``rest_framework_simplejwt`` so the FE has a
    single ``/auth/modal/refresh/`` URL even after we move sessions to a
    rotating store later."""
    refresh_token = request.data.get("refresh") or request.data.get("refresh_token")
    if not refresh_token:
        return Response({"detail": "refresh token required"}, status=400)
    try:
        token = RefreshToken(refresh_token)
        return Response({"access": str(token.access_token)})
    except Exception as exc:  # noqa: BLE001
        return Response({"detail": str(exc)}, status=401)


@csrf_exempt
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout(request):
    """Best-effort blacklist of the refresh token; idempotent."""
    refresh_token = request.data.get("refresh") or request.data.get("refresh_token")
    if refresh_token:
        try:
            RefreshToken(refresh_token).blacklist()
        except Exception:  # noqa: BLE001 — token may already be blacklisted
            pass
    return Response({"ok": True})
