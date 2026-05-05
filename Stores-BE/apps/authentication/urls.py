from django.urls import path, include, re_path
from rest_framework.routers import DefaultRouter

from .views import (
    AdminLoginAPIView,
    LoginAPIView,
    LogoutAPIView,
    PasswordChangeAPIView,
    PasswordRecoveryAPIView,
    PasswordResetConfirmAPIView,
    RegisterAPIView,
    RegisterProviderAPIView,
    TokenRefreshView,
    TokenVerifyView,
    DebugTokenView,
    UserViewSet,
    SendOTPView,
    VerifyOTPView,
    ResendOTPView,
    LoginWithOTPView,
    MFALoginView,
    VerifyMFALoginView,
    AdminSendOTPView,
    AdminVerifyOTPView,
    AdminResetOTPLimitsView,
    AdminEmailStatsView,
    AdminResetGlobalEmailLimitView,
    AdminOTPDebugLogsView,
    AdminViewUserOTPsView,
)
from . import modal_views


# Create a router for the UserViewSet
router = DefaultRouter()
router.register(r"users", UserViewSet, basename="user")

urlpatterns = [
    path("", include(router.urls)),
    # Authentication endpoints
    path("register/", RegisterAPIView.as_view(), name="register"),
    path(
        "register/provider/",
        RegisterProviderAPIView.as_view(),
        name="register_provider",
    ),
    path("login/", LoginAPIView.as_view(), name="token_obtain_pair"),
    path("admin-login/", AdminLoginAPIView.as_view(), name="admin_token_obtain_pair"),
    path("logout/", LogoutAPIView.as_view(), name="logout"),
    path("forget_password/", PasswordRecoveryAPIView.as_view(), name="forget_password"),
    path(
        "reset_password/<uidb64>/<token>/",
        PasswordResetConfirmAPIView.as_view(),
        name="password_reset_confirm",
    ),
    path("change_password/", PasswordChangeAPIView.as_view(), name="change_password"),
    # Optional trailing slash so POST clients are not broken by APPEND_SLASH.
    re_path(r"^refresh_token/?$", TokenRefreshView.as_view(), name="token_refresh"),
    path("verify_token/", TokenVerifyView.as_view(), name="token_verify"),
    path("debug_token/", DebugTokenView.as_view(), name="debug_token"),
    # OTP endpoints
    path("otp/send/", SendOTPView.as_view(), name="send_otp"),
    path("otp/verify/", VerifyOTPView.as_view(), name="verify_otp"),
    path("otp/resend/", ResendOTPView.as_view(), name="resend_otp"),
    path("login/otp/", LoginWithOTPView.as_view(), name="login_with_otp"),
    # MFA Login endpoints
    path("mfa/login/", MFALoginView.as_view(), name="mfa_login"),
    path("mfa/verify/", VerifyMFALoginView.as_view(), name="verify_mfa_login"),
    # Admin OTP endpoints
    path("admin/otp/send/", AdminSendOTPView.as_view(), name="admin_send_otp"),
    path("admin/otp/verify/", AdminVerifyOTPView.as_view(), name="admin_verify_otp"),
    path(
        "admin/otp/reset-limits/",
        AdminResetOTPLimitsView.as_view(),
        name="admin_reset_otp_limits",
    ),
    # Admin Email Management endpoints
    path("admin/email/stats/", AdminEmailStatsView.as_view(), name="admin_email_stats"),
    path(
        "admin/email/reset-limit/",
        AdminResetGlobalEmailLimitView.as_view(),
        name="admin_reset_email_limit",
    ),
    # Admin Debug endpoints
    path("admin/debug/logs/", AdminOTPDebugLogsView.as_view(), name="admin_debug_logs"),
    # Admin User OTP Management
    path(
        "admin/users/<str:user_id>/otps/",
        AdminViewUserOTPsView.as_view(),
        name="admin_view_user_otps",
    ),
    # ── Modal auth flow (state-machine, opt-in for the FE AuthModal) ─────
    # Mounted under /modal/ so the legacy /login, /register, /otp/ endpoints
    # above are not disturbed. See apps/authentication/MODAL_FLOW.md.
    path("modal/identify/",      modal_views.identify,       name="modal_identify"),
    path("modal/send-otp/",      modal_views.send_otp,       name="modal_send_otp"),
    path("modal/verify-otp/",    modal_views.verify_otp,     name="modal_verify_otp"),
    path("modal/login-password/", modal_views.login_password, name="modal_login_password"),
    path("modal/set-password/",  modal_views.set_password,   name="modal_set_password"),
    path("modal/create-account/", modal_views.create_account, name="modal_create_account"),
    path("modal/refresh/",       modal_views.refresh,        name="modal_refresh"),
    path("modal/logout/",        modal_views.logout,         name="modal_logout"),
]

# Available endpoints:
# GET /api/auth/admin/users/{user_id}/otps/ - View current OTPs for a user
