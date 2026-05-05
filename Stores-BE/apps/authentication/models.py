from django.db import models
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password, check_password
from django.utils import timezone
from datetime import timedelta
import random
import string
import uuid

from apps.core.models import BaseModel

User = get_user_model()


class OTP(BaseModel):
    """Model to store OTP for user verification"""

    OTP_TYPES = (
        ("signup", "Sign Up Verification"),
        ("login", "Login Authentication"),
        ("password_reset", "Password Reset"),
        ("email_change", "Email Change"),
        ("phone_change", "Phone Change"),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="otps")
    otp_code = models.CharField(max_length=6)
    otp_type = models.CharField(max_length=20, choices=OTP_TYPES)
    is_used = models.BooleanField(default=False)
    expires_at = models.DateTimeField()
    attempts = models.IntegerField(default=0)
    max_attempts = models.IntegerField(default=3)

    class Meta:
        db_table = "otps"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "otp_type", "is_used"]),
            models.Index(fields=["otp_code", "expires_at"]),
        ]

    def __str__(self):
        return f"{getattr(self.user, 'email', 'Unknown')} - {self.otp_type} - {self.otp_code}"

    @classmethod
    def generate_otp(cls, user, otp_type, validity_minutes=10):
        """Generate a new OTP for the user"""
        import logging

        logger = logging.getLogger(__name__)

        logger.info(
            f"[OTP_GEN_DEBUG] Starting OTP generation for user {user.id}, type: {otp_type}"
        )

        # Invalidate any existing unused OTPs of the same type
        logger.info(
            f"[OTP_GEN_DEBUG] Invalidating existing unused OTPs for user {user.id}, type: {otp_type}"
        )
        existing_otps = cls.objects.filter(user=user, otp_type=otp_type, is_used=False)
        existing_count = existing_otps.count()
        logger.info(f"[OTP_GEN_DEBUG] Found {existing_count} existing unused OTPs")

        existing_otps.update(is_used=True)
        logger.info(f"[OTP_GEN_DEBUG] Marked {existing_count} existing OTPs as used")

        # Generate 6-digit OTP
        logger.info(f"[OTP_GEN_DEBUG] Generating 6-digit OTP code")
        otp_code = "".join(random.choices(string.digits, k=6))
        logger.info(f"[OTP_GEN_DEBUG] Generated OTP code: {otp_code}**")

        # Create new OTP
        logger.info(f"[OTP_GEN_DEBUG] Creating new OTP record in database")
        expires_at = timezone.now() + timedelta(minutes=validity_minutes)
        logger.info(f"[OTP_GEN_DEBUG] OTP will expire at: {expires_at}")

        otp = cls.objects.create(
            user=user,
            otp_code=otp_code,
            otp_type=otp_type,
            expires_at=expires_at,
        )

        logger.info(
            f"[OTP_GEN_DEBUG] OTP created successfully - ID: {otp.id}, Code: {otp_code[:2]}**, Expires: {otp.expires_at}"
        )

        return otp

    def is_valid(self):
        """Check if OTP is still valid"""
        return not self.is_used and self.expires_at > timezone.now()

    def verify(self, otp_code):
        """Verify the OTP code (legacy method - now handled in utility)"""
        if not self.is_valid():
            return False

        if self.otp_code == otp_code:
            self.is_used = True
            self.save()
            return True

        return False


class UserVerification(BaseModel):
    """Track user verification status"""

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="verification"
    )
    email_verified = models.BooleanField(default=False)
    phone_verified = models.BooleanField(default=False)
    email_verified_at = models.DateTimeField(null=True, blank=True)
    phone_verified_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "user_verifications"

    def __str__(self):
        return f"{getattr(self.user, 'email', 'Unknown')} - Email: {self.email_verified}, Phone: {self.phone_verified}"


class TrustedDevice(BaseModel):
    """Trusted device record to allow OTP bypass and bind refresh token to device."""

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="trusted_devices"
    )
    device_id = models.CharField(max_length=128)
    device_fingerprint_hash = models.CharField(max_length=256)
    device_name = models.CharField(max_length=200, blank=True)
    device_info = models.JSONField(null=True, blank=True)
    refresh_token_hash = models.CharField(max_length=256, blank=True)
    last_used = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "trusted_devices"
        indexes = [
            models.Index(fields=["user", "device_id"]),
            models.Index(fields=["user", "device_fingerprint_hash"]),
            models.Index(fields=["refresh_token_hash"]),
            models.Index(fields=["expires_at"]),
        ]
        unique_together = ("user", "device_id")

    def __str__(self):
        return f"TrustedDevice({self.user_id}, {self.device_name or self.device_id})"


class LoginSession(BaseModel):
    """Short-lived login session for OTP verification during device trust onboarding."""

    id = models.UUIDField(primary_key=True, editable=False)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="login_sessions"
    )
    device_fingerprint_hash = models.CharField(max_length=256)
    otp_code = models.CharField(max_length=6)
    otp_expires_at = models.DateTimeField()
    attempts = models.IntegerField(default=0)
    max_attempts = models.IntegerField(default=3)
    verified_at = models.DateTimeField(null=True, blank=True)
    is_verified = models.BooleanField(default=False)

    class Meta:
        db_table = "login_sessions"
        indexes = [
            models.Index(fields=["user", "otp_expires_at"]),
        ]

    def __str__(self):
        return f"LoginSession({self.user_id}, verified={self.is_verified})"


# ─── Modal auth flow ──────────────────────────────────────────────────────────
# `AuthFlowSession` powers the multi-step modal login/signup flow. Unlike the
# legacy `OTP` model it:
#
#   • does NOT require a User FK — supports brand-new identifiers (signup);
#   • stores OTPs as a salted hash, never the plaintext code;
#   • carries enough state (identifier + purpose + step) for the FE to be
#     fully stateless between requests.

class AuthFlowSession(models.Model):
    """Short-lived ticket for a multi-step login/signup conversation.

    A session is created at the *identify* step and threaded through every
    subsequent call via the opaque `flow_token` cookie/header. It keeps the
    backend stateless: nothing is bound to a Django session.
    """

    PURPOSE_LOGIN = "login"
    PURPOSE_SIGNUP = "signup"
    PURPOSE_PASSWORD_RESET = "password_reset"
    PURPOSE_CHOICES = [
        (PURPOSE_LOGIN, "Login"),
        (PURPOSE_SIGNUP, "Signup"),
        (PURPOSE_PASSWORD_RESET, "Password reset"),
    ]

    STEP_IDENTIFIED = "identified"
    STEP_OTP_SENT = "otp_sent"
    STEP_OTP_VERIFIED = "otp_verified"
    STEP_COMPLETED = "completed"
    STEP_CHOICES = [
        (STEP_IDENTIFIED, "Identified"),
        (STEP_OTP_SENT, "OTP sent"),
        (STEP_OTP_VERIFIED, "OTP verified"),
        (STEP_COMPLETED, "Completed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    flow_token = models.CharField(max_length=64, unique=True, db_index=True)

    # Identifier as the user typed it (lower-cased for emails). Stored verbatim
    # because we never expose this back to the FE — the FE keeps its own copy.
    identifier = models.CharField(max_length=255, db_index=True)
    identifier_kind = models.CharField(max_length=16)  # "email" | "phone"

    purpose = models.CharField(max_length=32, choices=PURPOSE_CHOICES)
    step = models.CharField(
        max_length=32, choices=STEP_CHOICES, default=STEP_IDENTIFIED
    )

    # OTP — hashed, never plaintext. expires_at is independent of step so we
    # can resend without rotating the session.
    otp_hash = models.CharField(max_length=256, blank=True)
    otp_expires_at = models.DateTimeField(null=True, blank=True)
    otp_attempts = models.IntegerField(default=0)
    otp_max_attempts = models.IntegerField(default=5)
    otp_resend_count = models.IntegerField(default=0)
    otp_last_sent_at = models.DateTimeField(null=True, blank=True)

    # User binding — populated lazily. For login this is set at *identify*;
    # for signup it's set at *create-account*.
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="auth_flow_sessions",
        null=True,
        blank=True,
    )

    # Audit trail.
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=512, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField()

    class Meta:
        db_table = "auth_flow_sessions"
        indexes = [
            models.Index(fields=["identifier", "purpose"]),
            models.Index(fields=["expires_at"]),
        ]
        ordering = ["-created_at"]

    # ── Lifecycle helpers ────────────────────────────────────────────────
    @classmethod
    def new(cls, *, identifier: str, identifier_kind: str, purpose: str,
            user=None, ip: str | None = None, user_agent: str = "",
            ttl_minutes: int = 15) -> "AuthFlowSession":
        """Create a fresh session and return it. Old sessions for the same
        (identifier, purpose) are NOT touched — stale ones get cleaned up by
        TTL on `expires_at`."""
        flow_token = uuid.uuid4().hex + uuid.uuid4().hex  # 64 chars
        return cls.objects.create(
            flow_token=flow_token,
            identifier=identifier,
            identifier_kind=identifier_kind,
            purpose=purpose,
            user=user,
            ip_address=ip,
            user_agent=user_agent[:512],
            expires_at=timezone.now() + timedelta(minutes=ttl_minutes),
        )

    @property
    def is_expired(self) -> bool:
        return self.expires_at <= timezone.now()

    # ── OTP ───────────────────────────────────────────────────────────────
    def issue_otp(self, *, ttl_minutes: int = 5) -> str:
        """Generate, hash and persist a new OTP. Returns the *plaintext* code
        ONCE so the caller can deliver it (email/SMS); plaintext is never
        retrievable afterwards."""
        # Reload step so a concurrent verify-otp cannot be clobbered by a
        # stale resend that still holds an in-memory OTP_SENT snapshot.
        self.refresh_from_db(fields=["step"])
        if self.step == self.STEP_OTP_VERIFIED:
            raise ValueError(
                "This code was already verified. Continue to create your account."
            )
        code = "".join(random.choices(string.digits, k=6))
        self.otp_hash = make_password(code)
        self.otp_expires_at = timezone.now() + timedelta(minutes=ttl_minutes)
        self.otp_attempts = 0
        self.otp_resend_count = self.otp_resend_count + 1
        self.otp_last_sent_at = timezone.now()
        self.step = self.STEP_OTP_SENT
        self.save(update_fields=[
            "otp_hash", "otp_expires_at", "otp_attempts",
            "otp_resend_count", "otp_last_sent_at", "step", "updated_at",
        ])
        return code

    def verify_otp(self, code: str) -> bool:
        """Constant-time OTP check. On success bumps step to OTP_VERIFIED.
        On failure increments attempt counter — caller is responsible for
        enforcing the lockout."""
        if not self.otp_hash or not self.otp_expires_at:
            return False
        if self.otp_expires_at <= timezone.now():
            return False
        if self.otp_attempts >= self.otp_max_attempts:
            return False
        ok = check_password(code, self.otp_hash)
        if ok:
            self.step = self.STEP_OTP_VERIFIED
            # Burn the OTP so it can't be replayed.
            self.otp_hash = ""
            self.save(update_fields=["step", "otp_hash", "updated_at"])
            return True
        self.otp_attempts += 1
        self.save(update_fields=["otp_attempts", "updated_at"])
        return False

    @property
    def is_otp_locked(self) -> bool:
        return self.otp_attempts >= self.otp_max_attempts

    @property
    def can_resend(self) -> bool:
        """Throttle resends to once every 30s. Hard cap of 5 resends per
        session."""
        if self.otp_resend_count >= 5:
            return False
        if self.otp_last_sent_at is None:
            return True
        return (timezone.now() - self.otp_last_sent_at) >= timedelta(seconds=30)


def _normalise_identifier(value: str) -> tuple[str, str]:
    """Return ``(identifier, kind)`` where kind is "email" or "phone".
    Raises ``ValueError`` if neither shape matches."""
    v = (value or "").strip()
    if "@" in v and "." in v.split("@")[-1]:
        return v.lower(), "email"
    digits = "".join(c for c in v if c.isdigit() or c == "+")
    if 7 <= len(digits) <= 20 and digits.lstrip("+").isdigit():
        return digits, "phone"
    raise ValueError("identifier must be a valid email or phone number")


def mask_identifier(identifier: str, kind: str) -> str:
    """Return a masked form for echoing back to the FE — never echo the raw
    value once we've stored it server-side."""
    if kind == "email":
        local, _, domain = identifier.partition("@")
        if len(local) <= 2:
            return f"{local[0]}*@{domain}"
        return f"{local[:2]}{'*' * max(2, len(local) - 2)}@{domain}"
    if kind == "phone":
        digits = identifier
        return f"{digits[:3]}{'*' * (len(digits) - 6)}{digits[-3:]}" if len(digits) > 6 else digits
    return identifier
