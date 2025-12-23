from django.contrib.auth import authenticate
from django.utils.translation import gettext as _
from apps.users.models import User
from apps.users.serializers import UserBasicSerializer
from rest_framework import serializers
from rest_framework.exceptions import APIException
from rest_framework import status
from django.contrib.auth.password_validation import validate_password
from django.db import IntegrityError
from django.db.models import Q
import logging
from .models import UserVerification, OTP
from .utils import mask_email, mask_phone, OTPValidator
import unicodedata

import phonenumbers  # type: ignore
from phonenumbers import PhoneNumberFormat


class EmailAlreadyExistsException(APIException):
    """Custom exception for email already exists with 409 status code"""

    status_code = status.HTTP_409_CONFLICT
    default_detail = "User with this email already exists"
    default_code = "email_already_exists"


class PhoneNumberAlreadyExistsException(APIException):
    """Custom exception for phone number already exists with 409 status code"""

    status_code = status.HTTP_409_CONFLICT
    default_detail = "User with this phone number already exists"
    default_code = "phone_number_already_exists"


logger = logging.getLogger(__name__)


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, required=True, validators=[validate_password]
    )
    password2 = serializers.CharField(write_only=True, required=True)
    first_name = serializers.CharField(required=True)
    last_name = serializers.CharField(required=True)
    # phone_number = serializers.CharField(required=False, allow_blank=True)
    # user_type = serializers.ChoiceField(
    #     choices=User.USER_TYPE_CHOICES,
    #     default='customer'
    # )

    class Meta:
        model = User
        fields = (
            "email",
            "password",
            "password2",
            "first_name",
            "last_name",
            "phone_number",
        )
        # Disable default unique validator; we'll do case-insensitive check
        extra_kwargs = {
            "email": {"validators": []},
            "phone_number": {
                "required": False,
                "allow_null": True,
                "allow_blank": True,
            },
        }

    @staticmethod
    def _normalize_uk_phone(phone: str):
        """Normalize UK phone numbers to E.164 (+44XXXXXXXXXX) using phonenumbers.
        Returns: (normalized_phone, error_message)
        """
        if not phone:
            return "", ""

        # Strip whitespace
        phone = phone.strip()

        # Try parsing with GB region first
        try:
            parsed = phonenumbers.parse(phone, "GB")
            if phonenumbers.is_valid_number(parsed):
                e164 = phonenumbers.format_number(parsed, PhoneNumberFormat.E164)
                return e164, ""
            else:
                # Number parsed but invalid - get possible number info
                possible = phonenumbers.is_possible_number(parsed)
                if not possible:
                    return (
                        "",
                        "Phone number format is not valid. UK mobile numbers should be 11 digits (e.g., 07812345678).",
                    )
                return (
                    "",
                    "Phone number is not valid. Please check the number and try again.",
                )
        except phonenumbers.NumberParseException as e:
            error_type = e.error_type
            error_msg_str = str(e)
            # Check error type and provide helpful messages
            if (
                "INVALID_COUNTRY_CODE" in error_msg_str
                or "country_code" in error_msg_str.lower()
            ):
                return (
                    "",
                    "Phone number must be a valid UK number (starting with 07 for mobile or 01/02 for landline).",
                )
            elif (
                "NOT_A_NUMBER" in error_msg_str
                or "not a number" in error_msg_str.lower()
            ):
                return (
                    "",
                    "Phone number contains invalid characters. Please enter only digits and spaces.",
                )
            elif (
                "TOO_SHORT" in error_msg_str
                or "too short" in error_msg_str.lower()
                or error_type == 1
            ):
                return (
                    "",
                    "Phone number is too short. UK mobile numbers should be 11 digits (e.g., 07812345678).",
                )
            elif (
                "TOO_LONG" in error_msg_str
                or "too long" in error_msg_str.lower()
                or error_type == 2
            ):
                return (
                    "",
                    "Phone number is too long. UK mobile numbers should be 11 digits.",
                )
            else:
                # Generic error message with helpful hint
                return (
                    "",
                    f"Phone number is invalid. UK mobile numbers should be 11 digits starting with 07 (e.g., 07812345678). Error: {error_msg_str}",
                )
        except Exception as e:
            logger.exception("Error normalizing phone number")
            return "", f"Error validating phone number: {str(e)}"

    @staticmethod
    def _is_valid_uk_phone_e164(phone_e164: str) -> bool:
        """Validate a UK phone number in E.164 format.
        If phonenumbers is available, use it; else perform basic checks.
        """
        if not phone_e164:
            return False
        try:
            parsed = phonenumbers.parse(phone_e164, None)
            return (
                phonenumbers.is_valid_number(parsed)
                and phonenumbers.region_code_for_number(parsed) == "GB"
            )
        except Exception:
            return False

    def validate(self, attrs):
        # Check if passwords match
        if attrs.get("password") != attrs.get("password2"):
            raise serializers.ValidationError(
                {"password": "Password fields didn't match."}
            )

        # Normalize and case-insensitive duplicate check
        raw_email = attrs.get("email") or ""
        email_norm = unicodedata.normalize("NFKC", raw_email).strip()
        attrs["email"] = email_norm
        if email_norm and User._base_manager.filter(email__iexact=email_norm).exists():
            raise EmailAlreadyExistsException()

        # Normalize UK phone, validate, and duplicate check (if provided)
        phone_number = attrs.get("phone_number")
        if phone_number:
            phone_norm, error_msg = self._normalize_uk_phone(phone_number)
            if not phone_norm:
                # Use specific error message if available, otherwise generic
                error_message = (
                    error_msg
                    or "Phone number is invalid. UK mobile numbers should be 11 digits (e.g., 07812345678)."
                )
                raise serializers.ValidationError({"phone_number": error_message})
            # Additional validation on E.164 format
            if not self._is_valid_uk_phone_e164(phone_norm):
                raise serializers.ValidationError(
                    {
                        "phone_number": "Phone number is not a valid UK number. Please enter a UK mobile (07...) or landline number."
                    }
                )
            attrs["phone_number"] = phone_norm
            if User._base_manager.filter(phone_number__iexact=phone_norm).exists():
                raise PhoneNumberAlreadyExistsException()

        return attrs

    def create(self, validated_data):
        try:
            # Remove confirmation field
            validated_data.pop("password2", None)

            # Create user with normalized fields
            user_kwargs = dict(
                email=unicodedata.normalize("NFKC", validated_data["email"])
                .strip()
                .lower(),
                password=validated_data["password"],
                first_name=validated_data.get("first_name", ""),
                last_name=validated_data.get("last_name", ""),
            )
            if validated_data.get("phone_number"):
                # phone_number already normalized and validated in validate()
                user_kwargs["phone_number"] = validated_data["phone_number"]
            user = User.objects.create_user(**user_kwargs)

            # Set user as inactive until email verification
            user.is_active = False
            user.save()

            # Create UserVerification record
            UserVerification.objects.create(user=user)

            # Additional setup steps can be added here
            # For example, creating default profiles, settings, etc.

            return user
        except IntegrityError as e:
            # Handle case where a race condition might occur
            # (e.g., two users registering with the same email simultaneously)
            if "unique constraint" in str(e).lower() and "email" in str(e).lower():
                print("email already exists")
                raise EmailAlreadyExistsException()
            elif (
                "unique constraint" in str(e).lower()
                and "phone_number" in str(e).lower()
            ):
                print("phone number already exists")
                raise PhoneNumberAlreadyExistsException()
            raise serializers.ValidationError(
                {"detail": "Registration failed due to database constraint."}
            )
        except Exception as e:
            # Log the exception for debugging
            logger.exception("Error creating user")

            # Return a generic error message to the user
            raise serializers.ValidationError(
                {"detail": "Registration failed. Please try again later."}
            )


class OTPSerializer(serializers.Serializer):
    """Serializer for OTP verification"""

    otp_code = serializers.CharField(max_length=6, min_length=6)


class SendOTPSerializer(serializers.Serializer):
    """Serializer for sending OTP"""

    email = serializers.EmailField(required=False)
    phone_number = serializers.CharField(required=False)
    otp_type = serializers.ChoiceField(choices=[choice[0] for choice in OTP.OTP_TYPES])

    def validate(self, attrs):
        if not attrs.get("email") and not attrs.get("phone_number"):
            raise serializers.ValidationError(
                "Either email or phone number is required"
            )
        return attrs


class VerifyOTPSerializer(serializers.Serializer):
    """Serializer for verifying OTP"""

    email = serializers.EmailField(required=False)
    phone_number = serializers.CharField(required=False)
    otp_code = serializers.CharField(max_length=6, min_length=6)
    otp_type = serializers.ChoiceField(choices=[choice[0] for choice in OTP.OTP_TYPES])

    def validate(self, attrs):
        if not attrs.get("email") and not attrs.get("phone_number"):
            raise serializers.ValidationError(
                "Either email or phone number is required"
            )
        return attrs


class ResendOTPSerializer(serializers.Serializer):
    """Serializer for resending OTP"""

    email = serializers.EmailField(required=False)
    phone_number = serializers.CharField(required=False)
    otp_type = serializers.ChoiceField(choices=[choice[0] for choice in OTP.OTP_TYPES])

    def validate(self, attrs):
        if not attrs.get("email") and not attrs.get("phone_number"):
            raise serializers.ValidationError(
                "Either email or phone number is required"
            )
        return attrs


# Simple wrappers to expose user serializers within authentication module
class UserSerializer(UserBasicSerializer):
    """User serializer (basic fields)"""

    class Meta(UserBasicSerializer.Meta):
        fields = UserBasicSerializer.Meta.fields


class UserAuthSerializer(UserBasicSerializer):
    """User serializer with auth-related flags."""

    class Meta(UserBasicSerializer.Meta):
        fields = UserBasicSerializer.Meta.fields + [
            "is_staff",
            "is_superuser",
            "last_login",
        ]


class LoginWithOTPSerializer(serializers.Serializer):
    """Serializer for login with OTP"""

    email = serializers.EmailField()
    otp_code = serializers.CharField(max_length=6, min_length=6, required=False)
    request_otp = serializers.BooleanField(default=False)


class MFALoginVerifySerializer(serializers.Serializer):
    """Serializer for MFA login verification"""

    email = serializers.EmailField()
    otp_code = serializers.CharField(max_length=6, min_length=6)


class MFALoginSerializer(serializers.Serializer):
    """Serializer for MFA login verification"""

    email = serializers.EmailField()
    password = serializers.CharField(
        style={"input_type": "password"}, trim_whitespace=False
    )

    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")

        logger.info(f"Login attempt for email: {email}")

        if not email or not password:
            logger.warning("Login attempt without email or password")
            msg = _('Must include "email" and "password".')
            raise serializers.ValidationError(
                {"detail": msg, "code": "missing_fields"}, code="authorization"
            )

        # Check if user exists before attempting authentication
        try:
            user_exists = User.objects.filter(email__iexact=email.lower()).exists()
            if not user_exists:
                logger.warning(f"User with email {email} not found in database")
                raise serializers.ValidationError(
                    {"detail": "User not found", "code": "user_not_found"},
                    code="authorization",
                )
        except Exception as e:
            logger.exception(f"Error checking user existence: {str(e)}")

        # Try both email and email_or_phone parameters for authentication
        # First attempt with email parameter
        user = authenticate(
            request=self.context.get("request"),
            email=email.lower(),  # Ensure lowercase email
            password=password,
        )

        # If that fails, try with email_or_phone parameter
        if not user:
            logger.info(
                f"First authentication attempt failed, trying with email_or_phone"
            )
            user = authenticate(
                request=self.context.get("request"),
                email_or_phone=email.lower(),  # Ensure lowercase
                password=password,
            )

        if user:
            # Check Django's is_active field first
            if not user.is_active:
                logger.warning(f"User {email} is inactive (Django is_active=False)")
                raise serializers.ValidationError(
                    "User account is disabled.",
                    code="inactive_account",
                )

            # Check custom account_status field for more specific statuses
            account_status = getattr(user, "account_status", "active")

            if account_status == "inactive":
                logger.warning(f"User {email} has inactive account status")
                raise serializers.ValidationError(
                    "Your account is currently inactive. Please contact support to reactivate your account.",
                    code="account_inactive",
                )
            elif account_status == "pending":
                logger.warning(f"User {email} has pending account status")
                raise serializers.ValidationError(
                    "Your account is pending approval. You will receive an email once your account is activated.",
                    code="account_pending",
                )
            elif account_status == "suspended":
                logger.warning(f"User {email} has suspended account status")
                raise serializers.ValidationError(
                    "Your account has been temporarily suspended. Please contact support for more information.",
                    code="account_suspended",
                )
            elif account_status == "deleted":
                logger.warning(f"User {email} has deleted account status")
                raise serializers.ValidationError(
                    "This account has been deleted. Please contact support if you believe this is an error.",
                    code="account_deleted",
                )
            elif account_status == "banned":
                logger.warning(f"User {email} has banned account status")
                raise serializers.ValidationError(
                    "Your account has been permanently banned due to policy violations.",
                    code="account_banned",
                )
            elif account_status == "expired":
                logger.warning(f"User {email} has expired account status")
                raise serializers.ValidationError(
                    "Your account has expired. Please renew your subscription or contact support.",
                    code="account_expired",
                )
            elif account_status != "active":
                # Catch any other unexpected status values
                logger.warning(
                    f"User {email} has unknown account status: {account_status}"
                )
                raise serializers.ValidationError(
                    "Your account status is unknown. Please contact support for assistance.",
                    code="account_unknown_status",
                )

            logger.info(f"Authentication successful for {email}")
        else:
            # Check if user exists but credentials are invalid
            user_exists = User.objects.filter(email__iexact=email.lower()).exists()
            if not user_exists:
                logger.warning(f"User with email {email} not found in database")
                raise serializers.ValidationError(
                    {"detail": "User not found 11", "code": "user_not_found"},
                    code="authorization",
                )
            else:
                # User exists but password is wrong
                logger.warning(
                    f"Authentication failed for {email} - invalid credentials"
                )
                raise serializers.ValidationError(
                    {"detail": "Invalid password", "code": "invalid_credentials"},
                    code="authorization",
                )

        attrs["user"] = user
        return attrs


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(
        style={"input_type": "password"}, trim_whitespace=False
    )

    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")

        logger.info(f"Login attempt for email: {email}")

        if not email or not password:
            logger.warning("Login attempt without email or password")
            msg = _('Must include "email" and "password".')
            raise serializers.ValidationError(
                {"detail": msg, "code": "missing_fields"}, code="authorization"
            )

        # Check if user exists before attempting authentication
        try:
            user_exists = User.objects.filter(email__iexact=email.lower()).exists()
            if not user_exists:
                logger.warning(f"User with email {email} not found in database")
                raise serializers.ValidationError(
                    {"detail": "User not found", "code": "user_not_found"},
                    code="authorization",
                )
        except Exception as e:
            logger.exception(f"Error checking user existence: {str(e)}")

        # Try both email and email_or_phone parameters for authentication
        # First attempt with email parameter
        user = authenticate(
            request=self.context.get("request"),
            email=email.lower(),  # Ensure lowercase email
            password=password,
        )

        # If that fails, try with email_or_phone parameter
        if not user:
            logger.info(
                f"First authentication attempt failed, trying with email_or_phone"
            )
            user = authenticate(
                request=self.context.get("request"),
                email_or_phone=email.lower(),  # Ensure lowercase
                password=password,
            )

        if user:
            # Make sure the user is active
            if not user.is_active:
                logger.warning(f"User {email} is inactive")
                raise serializers.ValidationError(
                    {"detail": "User account is disabled.", "code": "inactive_account"},
                    code="authorization",
                )
            logger.info(f"Authentication successful for {email}")
        else:
            # Check if user exists but credentials are invalid
            user_exists = User.objects.filter(email__iexact=email.lower()).exists()
            if not user_exists:
                logger.warning(f"User with email {email} not found in database")
                raise serializers.ValidationError(
                    {"detail": "User not found 11", "code": "user_not_found"},
                    code="authorization",
                )
            else:
                # User exists but password is wrong
                logger.warning(
                    f"Authentication failed for {email} - invalid credentials"
                )
                raise serializers.ValidationError(
                    {"detail": "Invalid password", "code": "invalid_credentials"},
                    code="authorization",
                )

        attrs["user"] = user
        return attrs


class PasswordRecoverySerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    password = serializers.CharField(
        write_only=True, required=True, validators=[validate_password]
    )
    token = serializers.CharField(write_only=True, required=True)
    uidb64 = serializers.CharField(write_only=True, required=True)


class PasswordChangeSerializer(serializers.Serializer):
    new_password = serializers.CharField(required=True, validators=[validate_password])


from .models import OTP
from .utils import OTPValidator
