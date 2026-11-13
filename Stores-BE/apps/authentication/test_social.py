from unittest.mock import Mock, patch

import requests
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.users.models import User

from .models import UserVerification

URL = "/tradehut/api/v1/auth/social/"
EMAIL = "ama.buyer@example.com"


def _resp(status_code=200, payload=None):
    return Mock(status_code=status_code, json=Mock(return_value=payload or {}))


def _google(aud="google-client-id", email=EMAIL, email_verified=True, tokeninfo_status=200):
    """Fake for requests.get covering the two Google calls."""

    def fake_get(url, **kwargs):
        if "tokeninfo" in url:
            return _resp(tokeninfo_status, {"aud": aud})
        return _resp(
            200,
            {"email": email, "email_verified": email_verified, "given_name": "Ama", "family_name": "Buyer"},
        )

    return fake_get


def _facebook(app_id="fb-app-id", is_valid=True, email=EMAIL):
    def fake_get(url, **kwargs):
        if "debug_token" in url:
            return _resp(200, {"data": {"is_valid": is_valid, "app_id": app_id}})
        profile = {"id": "1", "first_name": "Ama", "last_name": "Buyer"}
        if email:
            profile["email"] = email
        return _resp(200, profile)

    return fake_get


@override_settings(
    GOOGLE_OAUTH_CLIENT_ID="google-client-id",
    FACEBOOK_APP_ID="fb-app-id",
    FACEBOOK_APP_SECRET="fb-secret",
)
class SocialLoginTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def post(self, provider="google", token="tok"):
        return self.client.post(URL, {"provider": provider, "access_token": token}, format="json")

    # --- happy paths ---------------------------------------------------------

    @patch("apps.authentication.social.requests.get")
    def test_google_creates_verified_active_user_and_returns_login_envelope(self, get):
        get.side_effect = _google()
        res = self.post()
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["user"]["email"], EMAIL)
        self.assertTrue(res["Authorization"].startswith("Bearer "))
        self.assertTrue(res["X-Refresh-Token"])
        user = User.objects.get(email=EMAIL)
        self.assertTrue(user.is_active)
        self.assertFalse(user.has_usable_password())
        self.assertEqual((user.first_name, user.last_name), ("Ama", "Buyer"))
        self.assertTrue(user.verification.email_verified)

    @patch("apps.authentication.social.requests.get")
    def test_facebook_creates_user(self, get):
        get.side_effect = _facebook()
        res = self.post("facebook")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(User.objects.filter(email=EMAIL).exists())

    @patch("apps.authentication.social.requests.get")
    def test_repeat_sign_in_reuses_the_account(self, get):
        get.side_effect = _google()
        self.post()
        res = self.post()
        self.assertEqual(res.status_code, 200)
        self.assertEqual(User.objects.filter(email__iexact=EMAIL).count(), 1)

    @patch("apps.authentication.social.requests.get")
    def test_existing_account_matched_case_insensitively_and_keeps_password(self, get):
        user = User.objects.create_user(email="Ama.Buyer@example.com", password="Passw0rd!x")
        get.side_effect = _google()
        res = self.post()
        self.assertEqual(res.status_code, 200)
        self.assertEqual(User.objects.count(), 1)
        user.refresh_from_db()
        self.assertTrue(user.check_password("Passw0rd!x"))
        self.assertTrue(user.verification.email_verified)

    @patch("apps.authentication.social.requests.get")
    def test_username_collision_gets_a_suffix(self, get):
        User.objects.create_user(email="ama.buyer@other.example", username="ama.buyer", password="x")
        get.side_effect = _google()
        self.assertEqual(self.post().status_code, 200)
        self.assertNotEqual(User.objects.get(email=EMAIL).username, "ama.buyer")

    # --- account states ------------------------------------------------------

    @patch("apps.authentication.social.requests.get")
    def test_unverified_pending_signup_is_activated_and_password_dropped(self, get):
        user = User.objects.create_user(email=EMAIL, password="attacker-chosen-1A")
        user.is_active = False
        user.save()
        UserVerification.objects.create(user=user)
        get.side_effect = _google()
        self.assertEqual(self.post().status_code, 200)
        user.refresh_from_db()
        self.assertTrue(user.is_active)
        self.assertFalse(user.has_usable_password())

    @patch("apps.authentication.social.requests.get")
    def test_disabled_account_stays_disabled(self, get):
        user = User.objects.create_user(email=EMAIL, password="x")
        user.is_active = False
        user.save()
        UserVerification.objects.create(user=user, email_verified=True)
        get.side_effect = _google()
        res = self.post()
        self.assertEqual(res.status_code, 403)
        self.assertNotIn("Authorization", res)
        user.refresh_from_db()
        self.assertFalse(user.is_active)

    @patch("apps.authentication.social.requests.get")
    def test_staff_account_refused(self, get):
        User.objects.create_user(email=EMAIL, password="x", is_staff=True)
        get.side_effect = _google()
        res = self.post()
        self.assertEqual(res.status_code, 403)
        self.assertNotIn("Authorization", res)

    @patch("apps.authentication.social.requests.get")
    def test_two_step_account_refused(self, get):
        User.objects.create_user(email=EMAIL, password="x", is_2fa_enabled=True)
        get.side_effect = _google()
        self.assertEqual(self.post().status_code, 403)

    # --- token and provider failures -----------------------------------------

    @patch("apps.authentication.social.requests.get")
    def test_google_token_for_another_app_rejected(self, get):
        get.side_effect = _google(aud="someone-elses-client-id")
        self.assertEqual(self.post().status_code, 401)
        self.assertFalse(User.objects.exists())

    @patch("apps.authentication.social.requests.get")
    def test_google_invalid_token_rejected(self, get):
        get.side_effect = _google(tokeninfo_status=400)
        self.assertEqual(self.post().status_code, 401)

    @patch("apps.authentication.social.requests.get")
    def test_google_unverified_email_rejected(self, get):
        get.side_effect = _google(email_verified=False)
        self.assertEqual(self.post().status_code, 400)
        self.assertFalse(User.objects.exists())

    @patch("apps.authentication.social.requests.get")
    def test_facebook_token_for_another_app_rejected(self, get):
        get.side_effect = _facebook(app_id="someone-elses-app")
        self.assertEqual(self.post("facebook").status_code, 401)
        self.assertFalse(User.objects.exists())

    @patch("apps.authentication.social.requests.get")
    def test_facebook_without_email_rejected(self, get):
        get.side_effect = _facebook(email=None)
        self.assertEqual(self.post("facebook").status_code, 400)
        self.assertFalse(User.objects.exists())

    @patch("apps.authentication.social.requests.get")
    def test_provider_timeout_is_503_and_writes_nothing(self, get):
        get.side_effect = requests.Timeout()
        self.assertEqual(self.post().status_code, 503)
        self.assertFalse(User.objects.exists())

    # --- input ---------------------------------------------------------------

    def test_unknown_provider_and_missing_token_are_400(self):
        self.assertEqual(self.post("apple").status_code, 400)
        self.assertEqual(self.post("google", "").status_code, 400)
        self.assertEqual(self.client.post(URL, {}, format="json").status_code, 400)

    @override_settings(GOOGLE_OAUTH_CLIENT_ID="")
    @patch("apps.authentication.social.requests.get")
    def test_unconfigured_provider_is_400_without_calling_out(self, get):
        self.assertEqual(self.post().status_code, 400)
        get.assert_not_called()
