from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.auctions.services import is_verified_buyer

from .models import UserVerification

User = get_user_model()


class UserEmailChangeVerificationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="buyer@example.test", username="buyer", password="pw-12345-Aa"
        )
        self.verification = UserVerification.objects.create(
            user=self.user, email_verified=True, phone_verified=True
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.url = f"/tradehut/api/v1/auth/users/{self.user.pk}/"

    def _reload(self):
        self.user.refresh_from_db()
        self.verification.refresh_from_db()

    def test_non_staff_email_change_resets_email_verified_only(self):
        res = self.client.patch(self.url, {"email": "new@example.test"}, format="json")
        self.assertEqual(res.status_code, 200, res.content)
        self._reload()
        self.assertEqual(self.user.email, "new@example.test")
        self.assertFalse(self.verification.email_verified)
        self.assertIsNone(self.verification.email_verified_at)
        self.assertTrue(self.verification.phone_verified)

    def test_email_remains_login_identifier_after_change(self):
        self.client.patch(self.url, {"email": "new@example.test"}, format="json")
        self.assertTrue(
            User.objects.get(email="new@example.test").check_password("pw-12345-Aa")
        )

    def test_same_email_patch_keeps_verification(self):
        res = self.client.patch(
            self.url, {"email": "buyer@example.test", "first_name": "Kofi"}, format="json"
        )
        self.assertEqual(res.status_code, 200, res.content)
        self._reload()
        self.assertTrue(self.verification.email_verified)

    def test_case_only_change_keeps_verification(self):
        res = self.client.patch(self.url, {"email": "Buyer@Example.test"}, format="json")
        self.assertEqual(res.status_code, 200, res.content)
        self._reload()
        self.assertTrue(self.verification.email_verified)

    def test_patch_without_email_keeps_verification(self):
        self.client.patch(self.url, {"first_name": "Ama"}, format="json")
        self._reload()
        self.assertTrue(self.verification.email_verified)

    def test_missing_verification_row_is_created_unverified(self):
        self.verification.delete()
        res = self.client.patch(self.url, {"email": "other@example.test"}, format="json")
        self.assertEqual(res.status_code, 200, res.content)
        v = UserVerification.objects.get(user=self.user)
        self.assertFalse(v.email_verified)
        self.assertFalse(v.phone_verified)

    def test_staff_change_does_not_reset(self):
        staff = User.objects.create_user(
            email="staff@example.test", username="staff", password="pw-12345-Aa", is_staff=True
        )
        c = APIClient()
        c.force_authenticate(staff)
        res = c.patch(self.url, {"email": "byadmin@example.test"}, format="json")
        self.assertEqual(res.status_code, 200, res.content)
        self._reload()
        self.assertEqual(self.user.email, "byadmin@example.test")
        self.assertTrue(self.verification.email_verified)

    def test_phone_only_verified_user_remains_verified_bidder(self):
        self.verification.email_verified = False
        self.verification.phone_verified = True
        self.verification.save()
        self.assertTrue(is_verified_buyer(self.user))
        self.client.patch(self.url, {"email": "x@example.test"}, format="json")
        self.assertTrue(is_verified_buyer(self.user))

    def test_email_change_drops_email_only_verified_bidder(self):
        self.verification.phone_verified = False
        self.verification.save()
        self.assertTrue(is_verified_buyer(self.user))
        self.client.patch(self.url, {"email": "x@example.test"}, format="json")
        self.assertFalse(is_verified_buyer(self.user))


class UserEmailCollisionTests(TestCase):
    def setUp(self):
        self.victim = User.objects.create_user(
            email="victim@example.test", username="victim", password="pw-12345-Aa"
        )
        self.attacker = User.objects.create_user(
            email="attacker@example.test", username="attacker", password="pw-12345-Aa"
        )
        self.client = APIClient()
        self.client.force_authenticate(self.attacker)
        self.url = f"/tradehut/api/v1/auth/users/{self.attacker.pk}/"

    def test_case_variant_of_other_users_email_rejected(self):
        res = self.client.patch(self.url, {"email": "Victim@Example.test"}, format="json")
        self.assertEqual(res.status_code, 400, res.content)
        self.assertIn("email", res.json())
        self.attacker.refresh_from_db()
        self.assertEqual(self.attacker.email, "attacker@example.test")
        self.assertEqual(User.objects.filter(email__iexact="victim@example.test").count(), 1)

    def test_exact_match_of_other_users_email_rejected(self):
        res = self.client.patch(self.url, {"email": "victim@example.test"}, format="json")
        self.assertEqual(res.status_code, 400, res.content)

    def test_own_email_any_case_allowed(self):
        for value in ("attacker@example.test", "ATTACKER@example.test"):
            res = self.client.patch(self.url, {"email": value}, format="json")
            self.assertEqual(res.status_code, 200, res.content)

    def test_staff_path_also_validated(self):
        staff = User.objects.create_user(
            email="staff@example.test", username="staff", password="pw-12345-Aa", is_staff=True
        )
        c = APIClient()
        c.force_authenticate(staff)
        res = c.patch(self.url, {"email": "VICTIM@example.test"}, format="json")
        self.assertEqual(res.status_code, 400, res.content)
        res = c.patch(self.url, {"email": "fresh@example.test"}, format="json")
        self.assertEqual(res.status_code, 200, res.content)
