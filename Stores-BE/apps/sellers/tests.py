import tempfile
import uuid
from unittest import mock

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.files.storage import FileSystemStorage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import connection
from django.test import TestCase as DjangoTestCase, override_settings
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from apps.catalog.models import Category

from . import services
from .models import SellerDocument, SellerProfile

User = get_user_model()


class TestCase(DjangoTestCase):
    """The data migration seeds the `sellers` flag as `beta`, which still blocks ordinary sellers.
    These tests exercise the endpoints, not the rollout, so they run with the flag released;
    the flag-specific tests below set their own state."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        from apps.store.models import FeatureFlag

        FeatureFlag.objects.filter(key="sellers").update(status="on")


PNG =b"\x89PNG\r\n\x1a\n" + b"0" * 64
PDF = b"%PDF-1.4\n" + b"0" * 64
JPG = b"\xff\xd8\xff\xe0" + b"0" * 64

APPLICATION = {
    "business_name": "Accra Gadgets",
    "business_type": "individual",
    "business_email": "shop@accragadgets.test",
    "business_phone": "024 123 4567",
    "business_address": "Stall 12, Accra",
    "other_category": "Phone accessories",
    "id_type": "ghana_card",
    "id_number": "GHA-123456789-0",
    "accept_terms": True,
}

MEDIA = tempfile.mkdtemp(prefix="seller_tests_")


class PrivateDocsMixin:
    """Point SellerDocument.file at a throwaway directory (never the real private root)."""

    def setUp(self):
        super().setUp()
        self.private_dir = tempfile.mkdtemp(prefix="seller_private_")
        field = SellerDocument._meta.get_field("file")
        patcher = mock.patch.object(field, "storage", FileSystemStorage(location=self.private_dir))
        patcher.start()
        self.addCleanup(patcher.stop)


def make_user(email, **extra):
    return User.objects.create_user(email=email, password="pass12345!", **extra)


def upload(kind="id_card", name="id.png", content=PNG, content_type="image/png"):
    return {"kind": kind, "file": SimpleUploadedFile(name, content, content_type=content_type)}


def make_seller(email, status="pending", **extra):
    user = make_user(email)
    profile = SellerProfile.objects.create(
        user=user,
        business_name=extra.pop("business_name", f"Biz {email}"),
        verification_status=status,
        is_verified=status == "verified",
        id_type="ghana_card",
        id_number="GHA-123456789-0",
        **extra,
    )
    return user, profile


def add_required_docs(profile, status="pending"):
    for kind in services.required_document_kinds(profile):
        SellerDocument.objects.create(
            seller=profile, kind=kind, status=status, file=f"seller_documents/x/{kind}.png"
        )


class PhoneTests(TestCase):
    def test_accepted_formats_normalise(self):
        for raw in ["0241234567", "024 123 4567", "+233241234567", "233241234567", "024-123-4567"]:
            self.assertEqual(services.normalise_ghana_phone(raw), "+233241234567", raw)
        for prefix in ["24", "54", "55", "59", "53", "20", "50", "27", "57", "26", "56", "28"]:
            self.assertEqual(
                services.normalise_ghana_phone(f"0{prefix}1234567"), f"+233{prefix}1234567"
            )

    def test_rejected_formats(self):
        for raw in ["", "12345", "0221234567", "024123456", "02412345678", "+234241234567", "abc"]:
            with self.assertRaises(ValueError):
                services.normalise_ghana_phone(raw)


@override_settings(MEDIA_ROOT=MEDIA)
class OnboardingTests(TestCase):
    def setUp(self):
        self.user = make_user("applicant@test.dev")
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_requires_auth(self):
        res = APIClient().post("/tradehut/api/v1/sellers/onboarding/", APPLICATION, format="json")
        self.assertIn(res.status_code, (401, 403))

    def test_happy_path(self):
        res = self.client.post("/tradehut/api/v1/sellers/onboarding/", APPLICATION, format="json")
        self.assertEqual(res.status_code, 201, res.content)
        body = res.json()
        self.assertEqual(body["verification_status"], "pending")
        self.assertFalse(body["is_verified"])
        self.assertEqual(body["business_phone"], "+233241234567")
        self.assertEqual(body["id_number_last4"], "89-0")
        self.assertNotIn("id_number", body)
        self.assertEqual(body["missing_documents"], ["id_card", "id_card_back", "proof_of_address"])
        self.assertFalse(body["can_resubmit"])
        self.assertTrue(self.user.groups.filter(name="Sellers").exists())
        profile = SellerProfile.objects.get(user=self.user)
        self.assertEqual(profile.id_number, "GHA-123456789-0")
        self.assertFalse(profile.is_verified)

    def test_second_application_conflicts(self):
        self.client.post("/tradehut/api/v1/sellers/onboarding/", APPLICATION, format="json")
        res = self.client.post("/tradehut/api/v1/sellers/onboarding/", APPLICATION, format="json")
        self.assertEqual(res.status_code, 409)
        self.assertEqual(res.json()["code"], "already_seller")

    def test_validation_errors(self):
        res = self.client.post(
            "/tradehut/api/v1/sellers/onboarding/",
            {**APPLICATION, "business_phone": "12345", "accept_terms": False},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        errors = res.json()
        self.assertIn("business_phone", errors)
        self.assertIn("accept_terms", errors)
        # ID number format is a cross-field rule (depends on id_type)
        bad_id = self.client.post(
            "/tradehut/api/v1/sellers/onboarding/", {**APPLICATION, "id_number": "bad"}, format="json"
        )
        self.assertEqual(bad_id.status_code, 400)
        self.assertIn("id_number", bad_id.json())
        self.assertFalse(SellerProfile.objects.filter(user=self.user).exists())

    def test_registered_business_needs_registration_number(self):
        res = self.client.post(
            "/tradehut/api/v1/sellers/onboarding/",
            {**APPLICATION, "business_type": "registered_business"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("business_registration_number", res.json())

        res = self.client.post(
            "/tradehut/api/v1/sellers/onboarding/",
            {
                **APPLICATION,
                "business_type": "registered_business",
                "business_registration_number": "CS123456789",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.content)
        self.assertIn("business_registration", res.json()["missing_documents"])

    def test_passport_does_not_need_back_of_id(self):
        res = self.client.post(
            "/tradehut/api/v1/sellers/onboarding/",
            {**APPLICATION, "id_type": "passport", "id_number": "G1234567"},
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(res.json()["missing_documents"], ["id_card", "proof_of_address"])


@override_settings(MEDIA_ROOT=MEDIA)
class SellerSelfServiceTests(PrivateDocsMixin, TestCase):
    def setUp(self):
        super().setUp()
        self.user, self.profile = make_seller("a@seller.test")
        self.other_user, self.other_profile = make_seller("b@seller.test")
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_not_a_seller(self):
        client = APIClient()
        client.force_authenticate(make_user("buyer@test.dev"))
        res = client.get("/tradehut/api/v1/sellers/me/")
        self.assertEqual(res.status_code, 404)
        self.assertEqual(res.json()["code"], "not_a_seller")

    def test_me_masks_sensitive_fields(self):
        self.profile.bank_account_number = "0123456789"
        self.profile.save()
        res = self.client.get("/tradehut/api/v1/sellers/me/")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["bank_account_last4"], "6789")
        self.assertEqual(body["id_number_last4"], "89-0")
        for hidden in ("bank_account_number", "id_number", "bank_routing_number"):
            self.assertNotIn(hidden, body)

    def test_patch_updates_and_validates_phone(self):
        res = self.client.patch(
            "/tradehut/api/v1/sellers/me/",
            {"business_phone": "055 765 4321", "bank_account_number": "999888777", "is_accepting_orders": False},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.content)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.business_phone, "+233557654321")
        self.assertEqual(self.profile.bank_account_number, "999888777")
        self.assertFalse(self.profile.is_accepting_orders)
        self.assertEqual(res.json()["bank_account_last4"], "8777")

        bad = self.client.patch("/tradehut/api/v1/sellers/me/", {"business_phone": "0221234567"}, format="json")
        self.assertEqual(bad.status_code, 400)

    def test_kyc_fields_locked_after_verification(self):
        SellerProfile.objects.filter(pk=self.profile.pk).update(verification_status="verified", is_verified=True)
        res = self.client.patch("/tradehut/api/v1/sellers/me/", {"business_name": "New Name"}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()["code"], "identity_locked")
        self.assertIn("business_name", res.json()["fields"])
        same = self.client.patch(
            "/tradehut/api/v1/sellers/me/", {"business_name": self.profile.business_name}, format="json"
        )
        self.assertEqual(same.status_code, 200)
        ok = self.client.patch("/tradehut/api/v1/sellers/me/", {"return_policy": "30 days"}, format="json")
        self.assertEqual(ok.status_code, 200)

    def test_suspended_cannot_patch_or_upload(self):
        SellerProfile.objects.filter(pk=self.profile.pk).update(verification_status="suspended")
        # a real request loads the user fresh; drop the test's cached seller_profile
        self.client.force_authenticate(User.objects.get(pk=self.user.pk))
        res = self.client.patch("/tradehut/api/v1/sellers/me/", {"return_policy": "x"}, format="json")
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.json()["code"], "seller_suspended")
        res = self.client.post("/tradehut/api/v1/sellers/me/documents/", upload(), format="multipart")
        self.assertEqual(res.status_code, 403)
        # but the seller can still read their status
        self.assertEqual(self.client.get("/tradehut/api/v1/sellers/me/").status_code, 200)

    def test_patch_and_upload_never_change_status(self):
        services.set_verification_status(self.profile, "rejected", notes="Documents are unreadable.")
        self.client.patch("/tradehut/api/v1/sellers/me/", {"return_policy": "x"}, format="json")
        self.client.post("/tradehut/api/v1/sellers/me/documents/", upload(), format="multipart")
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.verification_status, "rejected")

    def test_document_rows_expose_uploaded_at(self):
        self.client.post("/tradehut/api/v1/sellers/me/documents/", upload(), format="multipart")
        doc = self.client.get("/tradehut/api/v1/sellers/me/").json()["documents"][0]
        for key in ("kind", "status", "note", "uploaded_at"):
            self.assertIn(key, doc)

    def test_rejection_reason_visible_only_when_rejected(self):
        services.set_verification_status(self.profile, "rejected", notes="Photo of the ID is blurry.")
        body = self.client.get("/tradehut/api/v1/sellers/me/").json()
        self.assertEqual(body["verification_notes"], "Photo of the ID is blurry.")
        self.assertTrue(body["can_resubmit"])

    def test_resubmit_flow(self):
        url = "/tradehut/api/v1/sellers/me/resubmit/"
        res = self.client.post(url)
        self.assertEqual(res.status_code, 409)
        self.assertEqual(res.json()["code"], "not_rejected")

        services.set_verification_status(self.profile, "rejected", notes="Documents are unreadable.")
        res = self.client.post(url)
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()["code"], "missing_documents")

        add_required_docs(self.profile)
        res = self.client.post(url)
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()["code"], "missing_categories")

        SellerProfile.objects.filter(pk=self.profile.pk).update(other_category="Phone accessories")
        res = self.client.post(url)
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()["verification_status"], "pending")

    # --- documents ---------------------------------------------------------
    def post_doc(self, **kwargs):
        return self.client.post("/tradehut/api/v1/sellers/me/documents/", upload(**kwargs), format="multipart")

    def test_upload_valid_types(self):
        self.assertEqual(self.post_doc().status_code, 201)
        self.assertEqual(self.post_doc(kind="id_card_back", name="b.jpg", content=JPG, content_type="image/jpeg").status_code, 201)
        res = self.post_doc(kind="proof_of_address", name="bill.pdf", content=PDF, content_type="application/pdf")
        self.assertEqual(res.status_code, 201)
        body = res.json()
        self.assertEqual(body["status"], "pending")
        self.assertEqual(self.profile.documents.count(), 3)

    def test_upload_rejects_bad_files(self):
        cases = [
            dict(name="id.gif", content=b"GIF89a" + b"0" * 20, content_type="image/gif"),
            dict(name="id.png", content=PNG, content_type="application/pdf"),  # mime/ext mismatch
            dict(name="id.exe", content=PNG, content_type="image/png"),  # bad extension
            dict(name="id.png", content=b"not really a png at all", content_type="image/png"),  # bad content
            dict(name="id.pdf", content=PNG, content_type="application/pdf"),  # content/ext mismatch
        ]
        for case in cases:
            res = self.post_doc(**case)
            self.assertEqual(res.status_code, 400, case)
            self.assertIn("file", res.json(), case)
        self.assertEqual(self.profile.documents.count(), 0)

    def test_upload_rejects_oversize_and_bad_kind(self):
        big = PNG + b"0" * (10 * 1024 * 1024)
        self.assertEqual(self.post_doc(content=big).status_code, 400)
        self.assertEqual(self.post_doc(kind="selfie").status_code, 400)

    def test_reupload_supersedes_unapproved_document_and_keeps_the_file(self):
        first = self.post_doc().json()["id"]
        second = self.post_doc().json()["id"]
        docs = SellerDocument.objects.filter(seller=self.profile, kind="id_card")
        self.assertEqual(docs.count(), 2)  # nothing hard-deleted
        old = SellerDocument.objects.get(pk=first)
        self.assertEqual(old.status, "superseded")
        self.assertTrue(old.file.storage.exists(old.file.name))
        self.assertEqual(SellerDocument.objects.get(pk=second).status, "pending")
        # the seller only sees the current one; missing/required math ignores superseded
        shown = self.client.get("/tradehut/api/v1/sellers/me/documents/").json()
        self.assertEqual([d["id"] for d in shown], [second])
        me = self.client.get("/tradehut/api/v1/sellers/me/").json()
        self.assertEqual([d["id"] for d in me["documents"]], [second])
        self.assertNotIn("id_card", services.missing_document_kinds(SellerProfile.objects.get(pk=self.profile.pk)))

    def test_approved_document_is_not_superseded_by_reupload(self):
        first = self.post_doc().json()["id"]
        SellerDocument.objects.filter(pk=first).update(status="approved")
        self.post_doc()
        self.assertEqual(SellerDocument.objects.get(pk=first).status, "approved")

    def test_cannot_see_another_sellers_documents(self):
        SellerDocument.objects.create(seller=self.other_profile, kind="id_card", file="seller_documents/o/a.png")
        res = self.client.get("/tradehut/api/v1/sellers/me/documents/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), [])
        me = self.client.get("/tradehut/api/v1/sellers/me/").json()
        self.assertEqual(me["id"], str(self.profile.pk))
        self.assertEqual(me["documents"], [])

    def test_seller_cannot_use_staff_endpoints(self):
        base = "/tradehut/api/v1/sellers/admin/"
        self.assertEqual(self.client.get(base + "list/").status_code, 403)
        self.assertEqual(self.client.get(f"{base}{self.other_profile.pk}/").status_code, 403)
        self.assertEqual(
            self.client.patch(f"{base}{self.profile.pk}/", {"verification_status": "verified"}, format="json").status_code,
            403,
        )


class PublicSellerTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user, self.verified = make_seller(
            "v@seller.test", status="verified", business_name="Verified Shop",
            business_email="private@seller.test", business_phone="+233241234567",
            bank_account_number="1234567890", business_address="Secret address",
        )
        _, self.pending = make_seller("p@seller.test", status="pending", business_name="Pending Shop")
        _, self.suspended = make_seller("s@seller.test", status="suspended", business_name="Suspended Shop")
        _, self.inactive = make_seller("i@seller.test", status="verified", business_name="Inactive Shop", is_active=False)

    def test_public_profile_by_slug_and_uuid_hides_kyc(self):
        for key in (self.verified.store_slug, str(self.verified.pk)):
            res = self.client.get(f"/tradehut/api/v1/sellers/{key}/")
            self.assertEqual(res.status_code, 200, key)
            body = res.json()
            self.assertEqual(body["business_name"], "Verified Shop")
            raw = res.content.decode()
            for secret in (
                "id_number", "id_type", "bank", "business_email", "business_phone", "business_address",
                "private@seller.test", "+233241234567", "1234567890", "Secret address", "GHA-", "tax_id",
                "verification_notes", "commission_rate",
            ):
                self.assertNotIn(secret, raw, secret)

    def test_unverified_inactive_and_unknown_are_404(self):
        for key in (
            self.pending.store_slug, str(self.pending.pk), self.suspended.store_slug,
            self.inactive.store_slug, "does-not-exist", "00000000-0000-0000-0000-000000000000",
        ):
            self.assertEqual(self.client.get(f"/tradehut/api/v1/sellers/{key}/").status_code, 404, key)

    def test_public_profile_ignores_bad_token(self):
        res = self.client.get(f"/tradehut/api/v1/sellers/{self.verified.store_slug}/", HTTP_AUTHORIZATION="Bearer junk")
        self.assertEqual(res.status_code, 200)

    def test_public_list_only_verified_active_and_paginated(self):
        for path in ("/tradehut/api/v1/sellers/", "/tradehut/api/v1/sellers/list/"):
            body = self.client.get(path).json()
            self.assertEqual(body["count"], 1, path)
            self.assertEqual([r["business_name"] for r in body["results"]], ["Verified Shop"])
            self.assertNotIn("id_number", body["results"][0])


class StaffReviewTests(PrivateDocsMixin, TestCase):
    def setUp(self):
        super().setUp()
        self.staff = make_user("staff@test.dev", is_staff=True)
        self.seller_user, self.profile = make_seller("applicant@seller.test", status="pending")
        self.client = APIClient()
        self.client.force_authenticate(self.staff)
        self.url = f"/tradehut/api/v1/sellers/admin/{self.profile.pk}/"

    def test_anonymous_and_buyer_denied(self):
        self.assertIn(APIClient().get("/tradehut/api/v1/sellers/admin/list/").status_code, (401, 403))
        buyer = APIClient()
        buyer.force_authenticate(make_user("buyer@test.dev"))
        self.assertEqual(buyer.get("/tradehut/api/v1/sellers/admin/list/").status_code, 403)
        self.assertEqual(buyer.patch(self.url, {"verification_status": "verified"}, format="json").status_code, 403)

    def test_list_filter_and_detail(self):
        make_seller("other@seller.test", status="verified")
        res = self.client.get("/tradehut/api/v1/sellers/admin/list/?status=pending")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["count"], 1)
        row = body["results"][0]
        self.assertEqual(row["user"]["email"], "applicant@seller.test")
        self.assertEqual(row["id_number_last4"], "89-0")
        self.assertNotIn("id_number", row)
        detail = self.client.get(self.url).json()
        self.assertEqual(detail["id_number"], "GHA-123456789-0")

    def test_approve_requires_documents(self):
        res = self.client.patch(self.url, {"verification_status": "verified"}, format="json")
        self.assertEqual(res.status_code, 409)
        self.assertEqual(res.json()["code"], "missing_documents")
        self.assertIn("id_card", res.json()["missing"])
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.verification_status, "pending")

    def test_approve_sets_flags_and_notifies(self):
        add_required_docs(self.profile)
        with mock.patch("apps.sellers.services._notify_seller") as notify, \
                self.captureOnCommitCallbacks(execute=True):
            res = self.client.patch(self.url, {"verification_status": "verified"}, format="json")
        self.assertEqual(res.status_code, 200, res.content)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.verification_status, "verified")
        self.assertTrue(self.profile.is_verified)
        self.assertIsNotNone(self.profile.verification_date)
        notify.assert_called_once()
        self.assertEqual(notify.call_args.args[0], self.seller_user.pk)
        self.assertEqual(notify.call_args.args[1], "seller_verified")

    def test_reject_needs_notes_of_10_chars(self):
        for payload in ({"verification_status": "rejected"},
                        {"verification_status": "rejected", "verification_notes": "short"},
                        {"verification_status": "rejected", "verification_notes": "   too short  "}):
            res = self.client.patch(self.url, payload, format="json")
            self.assertEqual(res.status_code, 400, payload)
            self.assertIn("verification_notes", res.json())
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.verification_status, "pending")

        with mock.patch("apps.sellers.services._notify_seller") as notify, \
                self.captureOnCommitCallbacks(execute=True):
            res = self.client.patch(
                self.url,
                {"verification_status": "rejected", "verification_notes": "The ID photo is not readable."},
                format="json",
            )
        self.assertEqual(res.status_code, 200, res.content)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.verification_status, "rejected")
        self.assertFalse(self.profile.is_verified)
        notify.assert_called_once()
        self.assertEqual(notify.call_args.args[1], "seller_rejected")

    def test_status_keeps_is_verified_in_sync(self):
        add_required_docs(self.profile)
        services.set_verification_status(self.profile, "verified", actor=self.staff)
        self.profile.refresh_from_db()
        self.assertTrue(self.profile.is_verified)
        services.set_verification_status(self.profile, "suspended", actor=self.staff)
        self.profile.refresh_from_db()
        self.assertFalse(self.profile.is_verified)
        # un-suspending does not require documents again
        SellerDocument.objects.filter(seller=self.profile).delete()
        services.set_verification_status(self.profile, "verified", actor=self.staff)
        self.profile.refresh_from_db()
        self.assertTrue(self.profile.is_verified)

    def test_invalid_status_and_commission_bounds(self):
        self.assertEqual(self.client.patch(self.url, {"verification_status": "bogus"}, format="json").status_code, 400)
        self.assertEqual(self.client.patch(self.url, {"commission_rate": "101"}, format="json").status_code, 400)
        res = self.client.patch(self.url, {"commission_rate": "12.50", "is_accepting_orders": False}, format="json")
        self.assertEqual(res.status_code, 200)
        self.profile.refresh_from_db()
        self.assertEqual(str(self.profile.commission_rate), "12.50")
        self.assertFalse(self.profile.is_accepting_orders)

    def test_delete_is_soft(self):
        self.assertEqual(self.client.delete(self.url).status_code, 204)
        self.profile.refresh_from_db()
        self.assertFalse(self.profile.is_active)

    def test_document_review(self):
        doc = SellerDocument.objects.create(seller=self.profile, kind="id_card", file="seller_documents/x/a.png")
        docs = self.client.get(f"{self.url}documents/")
        self.assertEqual(docs.status_code, 200)
        self.assertEqual(len(docs.json()), 1)
        doc_url = f"/tradehut/api/v1/sellers/admin/documents/{doc.pk}/"
        self.assertEqual(self.client.patch(doc_url, {"status": "rejected"}, format="json").status_code, 400)
        res = self.client.patch(doc_url, {"status": "rejected", "note": "Photo is blurry"}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["note"], "Photo is blurry")
        res = self.client.patch(doc_url, {"status": "approved"}, format="json")
        self.assertEqual(res.json()["status"], "approved")
        self.assertEqual(res.json()["note"], "")
        buyer = APIClient()
        buyer.force_authenticate(make_user("buyer@test.dev"))
        self.assertEqual(buyer.patch(doc_url, {"status": "approved"}, format="json").status_code, 403)

    def test_rejected_doc_counts_as_missing(self):
        add_required_docs(self.profile)
        self.assertEqual(services.missing_document_kinds(SellerProfile.objects.get(pk=self.profile.pk)), [])
        SellerDocument.objects.filter(seller=self.profile, kind="id_card").update(status="rejected")
        self.assertEqual(services.missing_document_kinds(SellerProfile.objects.get(pk=self.profile.pk)), ["id_card"])


class AdminLoginSellerTests(TestCase):
    url = "/tradehut/api/v1/auth/admin-login/"

    def login(self, email):
        return APIClient().post(self.url, {"email": email, "password": "pass12345!"}, format="json")

    def test_sellers_are_denied_whatever_their_status(self):
        for status in ("pending", "rejected", "verified", "suspended"):
            make_seller(f"{status}@seller.test", status=status)
            res = self.login(f"{status}@seller.test")
            self.assertEqual(res.status_code, 403, status)
            self.assertNotIn("Authorization", res)

    def test_buyer_denied_staff_allowed(self):
        make_user("buyer@test.dev")
        make_user("staff@test.dev", is_staff=True)
        self.assertEqual(self.login("buyer@test.dev").status_code, 403)
        res = self.login("staff@test.dev")
        self.assertEqual(res.status_code, 200, res.content)
        self.assertIn("Authorization", res)

    def test_staff_who_also_sells_is_allowed(self):
        user, _ = make_seller("both@seller.test", status="verified")
        user.is_staff = True
        user.save(update_fields=["is_staff"])
        self.assertEqual(self.login("both@seller.test").status_code, 200)


class SellersGroupMigrationTests(TestCase):
    def test_backfill_function_adds_existing_sellers_to_group(self):
        import importlib
        from django.apps import apps as django_apps

        migration = importlib.import_module("apps.sellers.migrations.0004_sellers_group")
        user, _ = make_seller("old@seller.test")
        buyer = make_user("buyer@test.dev")
        Group.objects.filter(name="Sellers").delete()
        migration.create_group_and_backfill(django_apps, None)
        migration.create_group_and_backfill(django_apps, None)  # idempotent
        group = Group.objects.get(name="Sellers")
        self.assertTrue(user.groups.filter(pk=group.pk).exists())
        self.assertFalse(buyer.groups.filter(pk=group.pk).exists())


class PrivateDocumentAccessTests(PrivateDocsMixin, TestCase):
    def setUp(self):
        super().setUp()
        self.user, self.profile = make_seller("kyc@seller.test")
        self.staff = make_user("staff@test.dev", is_staff=True)
        self.seller_client = APIClient()
        self.seller_client.force_authenticate(self.user)
        self.staff_client = APIClient()
        self.staff_client.force_authenticate(self.staff)
        res = self.seller_client.post(
            "/tradehut/api/v1/sellers/me/documents/", upload(), format="multipart"
        )
        self.assertEqual(res.status_code, 201, res.content)
        self.doc_id = res.json()["id"]

    def test_file_is_stored_outside_media_root_and_media_url_cannot_reach_it(self):
        from django.conf import settings

        doc = SellerDocument.objects.get(pk=self.doc_id)
        self.assertTrue(doc.file.path.startswith(self.private_dir))
        self.assertFalse(doc.file.path.startswith(str(settings.MEDIA_ROOT)))
        self.assertTrue(doc.file.name.startswith(f"seller_documents/{self.profile.pk}/"))
        # the filename is unguessable and never the client's name
        self.assertNotIn("id.png", doc.file.name)
        res = APIClient().get(f"{settings.MEDIA_URL}{doc.file.name}")
        self.assertEqual(res.status_code, 404)
        res = APIClient().get(f"/tradehut/api/v1{settings.MEDIA_URL}{doc.file.name}")
        self.assertEqual(res.status_code, 404)

    def test_seller_and_staff_get_signed_url_that_serves_the_file(self):
        for client, path in (
            (self.seller_client, "/tradehut/api/v1/sellers/me/documents/"),
            (self.staff_client, f"/tradehut/api/v1/sellers/admin/{self.profile.pk}/documents/"),
        ):
            body = client.get(path).json()
            self.assertEqual(len(body), 1)
            row = body[0]
            for key in ("id", "kind", "status", "note", "uploaded_at", "file_url"):
                self.assertIn(key, row)
            self.assertIn("/sellers/documents/file/", row["file_url"])
            self.assertNotIn(self.private_dir, row["file_url"])
            served = APIClient().get(row["file_url"])
            self.assertEqual(served.status_code, 200)
            self.assertEqual(b"".join(served.streaming_content), PNG)
            self.assertEqual(served["Content-Type"], "image/png")
            self.assertIn("no-store", served["Cache-Control"])
            self.assertEqual(served["Content-Security-Policy"], "sandbox")

    def test_staff_detail_documents_include_id_and_file_url(self):
        detail = self.staff_client.get(f"/tradehut/api/v1/sellers/admin/{self.profile.pk}/").json()
        row = detail["documents"][0]
        self.assertEqual(row["id"], self.doc_id)
        self.assertTrue(row["file_url"])

    def test_tampered_expired_and_unknown_tokens_are_404(self):
        from . import storage

        url = self.seller_client.get("/tradehut/api/v1/sellers/me/documents/").json()[0]["file_url"]
        token = url.rstrip("/").rsplit("/", 1)[-1]
        base = "/tradehut/api/v1/sellers/documents/file/"
        self.assertEqual(APIClient().get(f"{base}{token}x/").status_code, 404)
        self.assertEqual(APIClient().get(f"{base}garbage/").status_code, 404)
        with mock.patch.object(storage, "SIGNED_URL_TTL_SECONDS", -1):
            self.assertEqual(APIClient().get(f"{base}{token}/").status_code, 404)
        # token for a deleted document
        SellerDocument.objects.filter(pk=self.doc_id).delete()
        self.assertEqual(APIClient().get(f"{base}{token}/").status_code, 404)

    def test_other_sellers_cannot_obtain_a_url_for_this_document(self):
        other_user, _ = make_seller("other@seller.test")
        client = APIClient()
        client.force_authenticate(other_user)
        self.assertEqual(client.get("/tradehut/api/v1/sellers/me/documents/").json(), [])
        buyer = APIClient()
        buyer.force_authenticate(make_user("buyer@test.dev"))
        self.assertEqual(buyer.get(f"/tradehut/api/v1/sellers/admin/{self.profile.pk}/documents/").status_code, 403)


class VisibilityRefreshTests(TestCase):
    def setUp(self):
        self.staff = make_user("staff@test.dev", is_staff=True)
        self.user, self.profile = make_seller("r@seller.test")
        add_required_docs(self.profile)
        self.client = APIClient()
        self.client.force_authenticate(self.staff)
        self.url = f"/tradehut/api/v1/sellers/admin/{self.profile.pk}/"

    def patch(self, payload):
        with override_settings(SEARCH_ENABLE_ES=True),                 mock.patch("apps.search.tasks.reindex_seller_products_task.delay") as reindex,                 mock.patch("apps.merchandising.services.bust_all_section_caches") as bust,                 self.captureOnCommitCallbacks(execute=True):
            res = self.client.patch(self.url, payload, format="json")
        self.assertEqual(res.status_code, 200, res.content)
        return reindex, bust

    def test_status_change_busts_homepage_cache_and_reindexes(self):
        reindex, bust = self.patch({"verification_status": "verified"})
        reindex.assert_called_once_with(self.profile.pk)
        bust.assert_called_once()

    def test_deactivation_reindexes(self):
        reindex, bust = self.patch({"is_active": False})
        reindex.assert_called_once_with(self.profile.pk)
        bust.assert_called_once()

    def test_unrelated_change_does_not(self):
        reindex, bust = self.patch({"commission_rate": "11.00"})
        reindex.assert_not_called()
        bust.assert_not_called()


class AccountStateGuardTests(PrivateDocsMixin, TestCase):
    base = "/tradehut/api/v1/sellers/me/"

    def seller_client(self, **extra):
        status = extra.pop("status", "pending")
        user, profile = make_seller("g@seller.test", status=status, **extra)
        client = APIClient()
        client.force_authenticate(user)
        return client, profile

    def test_inactive_seller_reads_but_cannot_write(self):
        client, _ = self.seller_client(status="verified", is_active=False)
        self.assertEqual(client.get(self.base).status_code, 200)
        res = client.patch(self.base, {"return_policy": "x"}, format="json")
        self.assertEqual((res.status_code, res.json()["code"]), (403, "seller_inactive"))
        res = client.post(self.base + "documents/", upload(), format="multipart")
        self.assertEqual((res.status_code, res.json()["code"]), (403, "seller_inactive"))
        self.assertEqual(client.post(self.base + "resubmit/").status_code, 403)

    def test_suspended_seller_reads_but_cannot_write(self):
        client, profile = self.seller_client(status="suspended")
        res = client.get(self.base)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["verification_status"], "suspended")
        self.assertEqual(client.get(self.base + "documents/").status_code, 200)
        for call in (
            lambda: client.patch(self.base, {"return_policy": "x"}, format="json"),
            lambda: client.post(self.base + "documents/", upload(), format="multipart"),
            lambda: client.post(self.base + "resubmit/"),
        ):
            res = call()
            self.assertEqual((res.status_code, res.json()["code"]), (403, "seller_suspended"))

    def test_service_level_guard_for_documents(self):
        _, profile = make_seller("svc@seller.test", status="verified", is_active=False)
        with self.assertRaises(services.SellerApiError) as ctx:
            services.add_document(profile, "id_card", SimpleUploadedFile("a.png", PNG, content_type="image/png"))
        self.assertEqual(ctx.exception.detail["code"], "seller_inactive")


class IdentityLockTests(TestCase):
    url = "/tradehut/api/v1/sellers/me/"

    def setUp(self):
        self.user, self.profile = make_seller(
            "lock@seller.test", status="verified",
            business_phone="+233241234567", business_address="Stall 12, Accra",
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_phone_and_address_changes_are_locked(self):
        res = self.client.patch(self.url, {"business_phone": "055 765 4321"}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()["code"], "identity_locked")
        self.assertEqual(res.json()["fields"], ["business_phone"])
        res = self.client.patch(self.url, {"business_address": "Elsewhere"}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()["fields"], ["business_address"])

    def test_unchanged_values_pass_even_in_another_phone_format(self):
        res = self.client.patch(
            self.url,
            {"business_phone": "024 123 4567", "business_address": "Stall 12, Accra", "return_policy": "30 days"},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.content)

    def test_legacy_unnormalised_stored_phone_is_tolerated(self):
        SellerProfile.objects.filter(pk=self.profile.pk).update(business_phone="0241234567")
        res = self.client.patch(self.url, {"business_phone": "+233241234567"}, format="json")
        self.assertEqual(res.status_code, 200, res.content)


class SlugAndOnboardingRaceTests(TestCase):
    def test_reserved_words_are_never_slugs(self):
        for word in ("me", "list", "onboarding", "admin", "documents", "resubmit"):
            _, profile = make_seller(f"{word}@seller.test", business_name=word.title())
            self.assertNotEqual(profile.store_slug, word)
            self.assertTrue(profile.store_slug.startswith(f"{word}-"), profile.store_slug)

    def test_slug_collision_retries_instead_of_already_seller(self):
        from django.db import IntegrityError

        user = make_user("race@test.dev")
        real_create = SellerProfile.objects.create
        calls = []

        def flaky_create(**kwargs):
            calls.append(kwargs.get("store_slug"))
            if len(calls) == 1:
                raise IntegrityError("duplicate key value violates unique constraint (store_slug)")
            return real_create(**kwargs)

        data = {k: v for k, v in APPLICATION.items() if k != "accept_terms"}
        with mock.patch.object(SellerProfile.objects, "create", side_effect=flaky_create):
            profile = services.create_seller_application(user, data)
        self.assertEqual(len(calls), 2)
        self.assertIsNone(calls[0])
        self.assertTrue(calls[1].startswith("accra-gadgets-"))
        self.assertEqual(profile.store_slug, calls[1])

    def test_user_level_duplicate_still_reports_already_seller(self):
        from types import SimpleNamespace

        from django.db import IntegrityError

        user = make_user("dup@test.dev")
        SellerProfile.objects.create(user=user, business_name="Existing")
        data = {k: v for k, v in APPLICATION.items() if k != "accept_terms"}
        real_filter = SellerProfile.objects.filter
        seen = []

        def filter_first_says_none(*args, **kwargs):
            seen.append(1)
            if len(seen) == 1:  # the up-front "already a seller?" check loses the race
                return SimpleNamespace(exists=lambda: False)
            return real_filter(*args, **kwargs)

        with mock.patch.object(SellerProfile.objects, "filter", side_effect=filter_first_says_none),                 mock.patch.object(SellerProfile.objects, "create", side_effect=IntegrityError("user_id")):
            with self.assertRaises(services.SellerApiError) as ctx:
                services.create_seller_application(user, data)
        self.assertEqual(ctx.exception.detail["code"], "already_seller")


class KycStorageConfigTests(PrivateDocsMixin, TestCase):
    def test_r2_without_kyc_bucket_fails_at_use_not_at_creation(self):
        from django.core.exceptions import ImproperlyConfigured
        from django.core.files.base import ContentFile

        from . import storage

        with override_settings(USE_R2=True), mock.patch.object(storage, "config", return_value=""):
            built = storage.private_document_storage()  # must not raise (startup / check)
        self.assertIsInstance(built, storage.KycStorageNotConfigured)
        for call in (
            lambda: built.save("a.png", ContentFile(b"x")),
            lambda: built.open("a.png"),
            lambda: built.url("a.png"),
            lambda: built.exists("a.png"),
        ):
            with self.assertRaises(ImproperlyConfigured):
                call()

    def test_r2_with_kyc_bucket_uses_private_signed_storage(self):
        from . import storage

        with override_settings(USE_R2=True, AWS_STORAGE_BUCKET_NAME="public-media"), \
                mock.patch.object(storage, "config", return_value="kyc-private-bucket"):
            built = storage.private_document_storage()
        self.assertEqual(built.bucket_name, "kyc-private-bucket")
        self.assertTrue(built.querystring_auth)
        self.assertIsNone(built.custom_domain)
        self.assertEqual(built.querystring_expire, storage.SIGNED_URL_TTL_SECONDS)

    def test_upload_returns_503_when_kyc_storage_is_not_configured(self):
        from . import storage

        user, _ = make_seller("noconf@seller.test")
        client = APIClient()
        client.force_authenticate(user)
        field = SellerDocument._meta.get_field("file")
        with mock.patch.object(field, "storage", storage.KycStorageNotConfigured()):
            res = client.post("/tradehut/api/v1/sellers/me/documents/", upload(), format="multipart")
            self.assertEqual(res.status_code, 503, res.content)
            body = res.json()
            self.assertEqual(body["code"], "kyc_storage_not_configured")
            self.assertIn("detail", body)
        self.assertEqual(SellerDocument.objects.count(), 0)
        # profile/status reads keep working
        self.assertEqual(client.get("/tradehut/api/v1/sellers/me/").status_code, 200)


class UserViewSetScopingTests(TestCase):
    base = "/tradehut/api/v1/auth/users/"

    def setUp(self):
        self.me = make_user("me@test.dev")
        self.other = make_user("other@test.dev")
        self.staff = make_user("staff@test.dev", is_staff=True)

    def api(self, user=None):
        c = APIClient()
        if user:
            c.force_authenticate(user)
        return c

    def rows(self, res):
        body = res.json()
        return body["results"] if isinstance(body, dict) else body

    def test_anonymous_denied(self):
        self.assertIn(self.api().get(self.base).status_code, (401, 403))

    def test_non_staff_list_returns_only_self(self):
        res = self.api(self.me).get(self.base)
        self.assertEqual(res.status_code, 200)
        self.assertEqual([r["email"] for r in self.rows(res)], ["me@test.dev"])

    def test_non_staff_cannot_retrieve_edit_or_delete_others(self):
        c = self.api(self.me)
        url = f"{self.base}{self.other.pk}/"
        self.assertEqual(c.get(url).status_code, 404)
        self.assertEqual(c.patch(url, {"first_name": "x"}, format="json").status_code, 404)
        self.assertEqual(c.delete(url).status_code, 403)
        self.other.refresh_from_db()
        self.assertEqual(self.other.first_name, "")
        self.assertTrue(User.objects.filter(pk=self.other.pk).exists())

    def test_non_staff_can_edit_self_but_not_delete_or_create(self):
        c = self.api(self.me)
        url = f"{self.base}{self.me.pk}/"
        self.assertEqual(c.patch(url, {"first_name": "Ama"}, format="json").status_code, 200)
        self.me.refresh_from_db()
        self.assertEqual(self.me.first_name, "Ama")
        self.assertEqual(c.delete(url).status_code, 403)
        self.assertTrue(User.objects.filter(pk=self.me.pk).exists())
        res = c.post(self.base, {"email": "new@test.dev", "username": "new"}, format="json")
        self.assertEqual(res.status_code, 403)

    def test_non_staff_cannot_escalate_or_deactivate_self(self):
        c = self.api(self.me)
        url = f"{self.base}{self.me.pk}/"
        res = c.patch(
            url,
            {"is_staff": True, "is_superuser": True, "is_active": False, "first_name": "Kofi"},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.content)
        self.me.refresh_from_db()
        self.assertFalse(self.me.is_staff)
        self.assertFalse(self.me.is_superuser)
        self.assertTrue(self.me.is_active)
        self.assertEqual(self.me.first_name, "Kofi")

    def test_me_action_still_works(self):
        res = self.api(self.me).get(f"{self.base}me/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["email"], "me@test.dev")

    def test_staff_sees_and_manages_everyone(self):
        c = self.api(self.staff)
        emails = {r["email"] for r in self.rows(c.get(self.base))}
        self.assertTrue({"me@test.dev", "other@test.dev", "staff@test.dev"} <= emails)
        url = f"{self.base}{self.other.pk}/"
        self.assertEqual(c.get(url).status_code, 200)
        self.assertEqual(c.patch(url, {"first_name": "Staffed"}, format="json").status_code, 200)
        self.other.refresh_from_db()
        self.assertEqual(self.other.first_name, "Staffed")


# --------------------------------------------------------------- selling categories

ONBOARD = "/tradehut/api/v1/sellers/onboarding/"
ME = "/tradehut/api/v1/sellers/me/"
RESUBMIT = "/tradehut/api/v1/sellers/me/resubmit/"
ADMIN_LIST = "/tradehut/api/v1/sellers/admin/list/"


def app_without_other(**extra):
    body = {k: v for k, v in APPLICATION.items() if k != "other_category"}
    body.update(extra)
    return body


class SellingCategoriesOnboardingTests(TestCase):
    def setUp(self):
        self.phones = Category.objects.create(name="Phones")
        self.fashion = Category.objects.create(name="Fashion")
        self.user = make_user("cat-applicant@test.dev")
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def post(self, **extra):
        return self.client.post(ONBOARD, app_without_other(**extra), format="json")

    def test_happy_path_with_categories_and_other(self):
        res = self.post(
            selling_categories=[str(self.phones.id), str(self.fashion.id)],
            other_category="  Wigs   &  hair ",
        )
        self.assertEqual(res.status_code, 201, res.content)
        body = res.json()
        self.assertEqual(
            body["selling_categories"],
            [{"id": str(self.fashion.id), "name": "Fashion"}, {"id": str(self.phones.id), "name": "Phones"}],
        )
        self.assertEqual(body["other_category"], "Wigs & hair")
        self.assertEqual(body["missing_fields"], [])
        self.assertEqual(SellerProfile.objects.get(user=self.user).selling_categories.count(), 2)

    def test_categories_only_and_other_only_both_accepted(self):
        res = self.post(selling_categories=[str(self.phones.id)])
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(res.json()["other_category"], "")
        other = make_user("other-only@test.dev")
        client = APIClient()
        client.force_authenticate(other)
        res = client.post(
            ONBOARD, app_without_other(selling_categories=[], other_category="Handmade soap"), format="json"
        )
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(res.json()["selling_categories"], [])

    def test_none_provided_is_400(self):
        for extra in ({}, {"selling_categories": []}, {"other_category": ""}, {"other_category": "   "}):
            res = self.post(**extra)
            self.assertEqual(res.status_code, 400, extra)
            self.assertIn("selling_categories", res.json())
        self.assertFalse(SellerProfile.objects.filter(user=self.user).exists())

    def test_unknown_id_and_malformed_id_are_400(self):
        res = self.post(selling_categories=[str(self.phones.id), str(uuid.uuid4())])
        self.assertEqual(res.status_code, 400)
        self.assertIn("selling_categories", res.json())
        self.assertEqual(self.post(selling_categories=["not-a-uuid"]).status_code, 400)
        self.assertFalse(SellerProfile.objects.filter(user=self.user).exists())

    def test_more_than_ten_is_400_but_duplicates_are_ignored(self):
        cats = [Category.objects.create(name=f"Cat {i}") for i in range(11)]
        res = self.post(selling_categories=[str(c.id) for c in cats])
        self.assertEqual(res.status_code, 400)
        self.assertIn("selling_categories", res.json())
        # ten distinct ids repeated: duplicates are ignored, so this is within the limit
        ids = [str(c.id) for c in cats[:10]]
        res = self.post(selling_categories=ids + ids)
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(len(res.json()["selling_categories"]), 10)

    def test_other_category_sanitising(self):
        for bad in (
            "http://x.com", "https://shop.example", "www.shop.com", "me@example.com",
            "<b>bold</b>", "<script>", "ab", "x" * 81, "Phones_and_more", "&&&", "Phones; DROP",
        ):
            res = self.post(other_category=bad)
            self.assertEqual(res.status_code, 400, bad)
            self.assertIn("other_category", res.json(), bad)
        self.assertFalse(SellerProfile.objects.filter(user=self.user).exists())
        for good in ("Café & Bakery, Ghana", "Home-made/organic goods", "Électronique 2"):
            self.assertEqual(services.clean_other_category(good), good)
        self.assertEqual(services.clean_other_category("  a\t\n b   c "), "a b c")
        self.assertEqual(services.clean_other_category("   "), "")


class SellingCategoriesSelfServiceTests(PrivateDocsMixin, TestCase):
    def setUp(self):
        super().setUp()
        self.phones = Category.objects.create(name="Phones")
        self.fashion = Category.objects.create(name="Fashion")

    def seller_client(self, email, status):
        user, profile = make_seller(email, status=status)
        client = APIClient()
        client.force_authenticate(User.objects.get(pk=user.pk))
        return client, profile

    def test_patch_allowed_for_pending_rejected_and_verified(self):
        for status in ("pending", "rejected", "verified"):
            client, profile = self.seller_client(f"{status}@cat.test", status)
            res = client.patch(
                ME,
                {"selling_categories": [str(self.phones.id), str(self.phones.id)], "other_category": "Wigs"},
                format="json",
            )
            self.assertEqual(res.status_code, 200, (status, res.content))
            body = res.json()
            self.assertEqual(body["selling_categories"], [{"id": str(self.phones.id), "name": "Phones"}])
            self.assertEqual(body["other_category"], "Wigs")
            profile.refresh_from_db()
            self.assertEqual(profile.verification_status, status)

    def test_patch_replaces_and_clears_other(self):
        client, profile = self.seller_client("replace@cat.test", "pending")
        profile.selling_categories.set([self.phones])
        res = client.patch(
            ME, {"selling_categories": [str(self.fashion.id)], "other_category": ""}, format="json"
        )
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual([c["name"] for c in res.json()["selling_categories"]], ["Fashion"])
        self.assertEqual(res.json()["other_category"], "")

    def test_cannot_clear_everything(self):
        client, profile = self.seller_client("clear@cat.test", "pending")
        profile.selling_categories.set([self.phones])
        res = client.patch(ME, {"selling_categories": [], "other_category": ""}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("selling_categories", res.json())
        self.assertEqual(profile.selling_categories.count(), 1)

    def test_patch_validation_errors(self):
        client, _ = self.seller_client("bad@cat.test", "pending")
        self.assertEqual(client.patch(ME, {"selling_categories": [str(uuid.uuid4())]}, format="json").status_code, 400)
        self.assertEqual(client.patch(ME, {"other_category": "http://x.com"}, format="json").status_code, 400)
        self.assertEqual(client.patch(ME, {"other_category": "<b>"}, format="json").status_code, 400)

    def test_legacy_seller_without_categories_is_not_blocked(self):
        client, profile = self.seller_client("legacy@cat.test", "verified")
        res = client.get(ME)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["selling_categories"], [])
        self.assertEqual(res.json()["missing_fields"], [])  # verified: never asked
        ok = client.patch(ME, {"return_policy": "30 days", "is_accepting_orders": False}, format="json")
        self.assertEqual(ok.status_code, 200, ok.content)
        # re-sending the empty pair changes nothing, so it is not a block either
        ok = client.patch(ME, {"selling_categories": [], "other_category": ""}, format="json")
        self.assertEqual(ok.status_code, 200, ok.content)

    def test_missing_fields_only_for_pending_and_rejected(self):
        for status, expected in (
            ("pending", ["selling_categories"]),
            ("rejected", ["selling_categories"]),
            ("verified", []),
            ("suspended", []),
        ):
            client, _ = self.seller_client(f"mf-{status}@cat.test", status)
            self.assertEqual(client.get(ME).json()["missing_fields"], expected, status)

    def test_suspended_is_read_only(self):
        client, profile = self.seller_client("susp@cat.test", "suspended")
        res = client.patch(ME, {"selling_categories": [str(self.phones.id)]}, format="json")
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.json()["code"], "seller_suspended")
        self.assertEqual(profile.selling_categories.count(), 0)

    def test_resubmit_needs_categories_too(self):
        client, profile = self.seller_client("resub@cat.test", "rejected")
        add_required_docs(profile)
        res = client.post(RESUBMIT)
        self.assertEqual(res.status_code, 400)
        body = res.json()
        self.assertEqual(body["code"], "missing_categories")
        self.assertEqual(body["missing_fields"], ["selling_categories"])
        profile.refresh_from_db()
        self.assertEqual(profile.verification_status, "rejected")

        client.patch(ME, {"other_category": "Handmade soap"}, format="json")
        res = client.post(RESUBMIT)
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()["verification_status"], "pending")

    def test_resubmit_reports_documents_first_and_categories_alongside(self):
        client, _ = self.seller_client("both@cat.test", "rejected")
        res = client.post(RESUBMIT)
        self.assertEqual(res.status_code, 400)
        body = res.json()
        self.assertEqual(body["code"], "missing_documents")
        self.assertEqual(body["missing"], ["id_card", "id_card_back", "proof_of_address"])
        self.assertEqual(body["missing_fields"], ["selling_categories"])


class SellingCategoriesVisibilityTests(PrivateDocsMixin, TestCase):
    def setUp(self):
        super().setUp()
        self.phones = Category.objects.create(name="Phones")
        self.fashion = Category.objects.create(name="Fashion")
        self.staff_client = APIClient()
        self.staff_client.force_authenticate(make_user("cat-staff@test.dev", is_staff=True))

    def seller(self, email, status="verified", other="Wigs"):
        _, profile = make_seller(email, status=status, other_category=other)
        profile.selling_categories.set([self.phones, self.fashion])
        return profile

    def test_public_profile_and_list_show_names_never_other_category(self):
        profile = self.seller("pub@cat.test")
        anon = APIClient()
        expected = [{"id": str(self.fashion.id), "name": "Fashion"}, {"id": str(self.phones.id), "name": "Phones"}]
        detail = anon.get(f"/tradehut/api/v1/sellers/{profile.store_slug}/")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.json()["selling_categories"], expected)
        self.assertNotIn("other_category", detail.json())
        self.assertNotIn("Wigs", detail.content.decode())
        listing = anon.get("/tradehut/api/v1/sellers/")
        self.assertEqual(listing.json()["results"][0]["selling_categories"], expected)
        self.assertNotIn("other_category", listing.json()["results"][0])
        self.assertNotIn("Wigs", listing.content.decode())

    def test_staff_list_rows_have_names_and_other_detail_has_id_name(self):
        profile = self.seller("staff@cat.test", status="pending")
        row = self.staff_client.get(ADMIN_LIST).json()["results"][0]
        self.assertEqual(row["selling_categories"], ["Fashion", "Phones"])
        self.assertEqual(row["other_category"], "Wigs")
        detail = self.staff_client.get(f"/tradehut/api/v1/sellers/admin/{profile.pk}/").json()
        self.assertEqual(
            detail["selling_categories"],
            [{"id": str(self.fashion.id), "name": "Fashion"}, {"id": str(self.phones.id), "name": "Phones"}],
        )
        self.assertEqual(detail["other_category"], "Wigs")

    def test_staff_list_has_no_n_plus_one(self):
        self.seller("one@cat.test", status="pending")
        self.assertEqual(self.staff_client.get(ADMIN_LIST).status_code, 200)  # warm caches

        with CaptureQueriesContext(connection) as small:
            self.assertEqual(self.staff_client.get(ADMIN_LIST).json()["count"], 1)
        for i in range(6):
            self.seller(f"more{i}@cat.test", status="pending")
        with CaptureQueriesContext(connection) as large:
            self.assertEqual(self.staff_client.get(ADMIN_LIST).json()["count"], 7)
        self.assertEqual(len(small), len(large), [q["sql"] for q in large.captured_queries])

    def test_public_list_has_no_n_plus_one(self):
        for i in range(6):
            self.seller(f"pub{i}@cat.test")
        with CaptureQueriesContext(connection) as q:
            self.assertEqual(APIClient().get("/tradehut/api/v1/sellers/").json()["count"], 6)
        self.assertLessEqual(len(q), 4)


# --------------------------------------------------------------- owner (superuser)

ME = "/tradehut/api/v1/sellers/me/"


def set_sellers_flag(status):
    from apps.store.models import FeatureFlag

    FeatureFlag.objects.update_or_create(
        key="sellers", defaults={"name": "Sellers", "status": status}
    )


class OwnerAccessTests(TestCase):
    def client_for(self, user):
        client = APIClient()
        client.force_authenticate(user)
        return client

    def owner(self, email="owner@th.test", **extra):
        return User.objects.create_superuser(email=email, password="pass12345!", **extra)

    def test_superuser_without_profile_gets_one_idempotently(self):
        set_sellers_flag("on")
        owner = self.owner()
        client = self.client_for(owner)
        res = client.get(ME)
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(SellerProfile.objects.filter(user=owner).count(), 1)
        profile = SellerProfile.objects.get(user=owner)
        self.assertEqual(profile.verification_status, "verified")
        self.assertTrue(profile.is_verified)
        self.assertTrue(profile.is_active)
        self.assertTrue(profile.is_accepting_orders)
        self.assertEqual(profile.commission_rate, 0)
        self.assertEqual(profile.business_email, owner.email)
        self.assertTrue(profile.store_slug)
        self.assertEqual(client.get(ME).status_code, 200)
        self.assertEqual(SellerProfile.objects.filter(user=owner).count(), 1)

    def test_superuser_provisioned_even_with_flag_off(self):
        set_sellers_flag("off")
        owner = self.owner()
        self.assertEqual(self.client_for(owner).get(ME).status_code, 200)
        self.assertTrue(SellerProfile.objects.filter(user=owner).exists())

    def test_superuser_provisioned_when_flag_row_missing(self):
        owner = self.owner()
        self.assertEqual(self.client_for(owner).get(ME).status_code, 200)

    def test_two_owners_get_distinct_slugs(self):
        a = self.owner("kofi1@th.test", first_name="Kofi")
        b = self.owner("kofi2@th.test", first_name="Kofi")
        for user in (a, b):
            self.assertEqual(self.client_for(user).get(ME).status_code, 200)
        slugs = SellerProfile.objects.filter(user__in=[a, b]).values_list("store_slug", flat=True)
        self.assertEqual(len(set(slugs)), 2)
        self.assertEqual(
            SellerProfile.objects.get(user=a).business_name, "Kofi (TradeHut)"
        )

    def test_ensure_owner_profile_is_idempotent(self):
        owner = self.owner()
        first = services.ensure_owner_profile(owner)
        second = services.ensure_owner_profile(owner)
        self.assertEqual(first.pk, second.pk)
        self.assertEqual(SellerProfile.objects.filter(user=owner).count(), 1)

    def test_existing_superuser_profile_is_not_overwritten(self):
        owner = self.owner()
        profile = SellerProfile.objects.create(
            user=owner, business_name="My Shop", verification_status="pending"
        )
        set_sellers_flag("off")
        self.assertEqual(self.client_for(owner).get(ME).status_code, 200)
        profile.refresh_from_db()
        self.assertEqual(profile.business_name, "My Shop")
        self.assertEqual(profile.verification_status, "pending")

    def test_flag_off_staff_non_superuser_still_blocked(self):
        set_sellers_flag("off")
        staff = make_user("staff@th.test", is_staff=True)
        res = self.client_for(staff).get(ME)
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.json()["code"], "feature_disabled")

    def test_flag_off_buyer_blocked(self):
        set_sellers_flag("off")
        res = self.client_for(make_user("buyer@th.test")).get(ME)
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.json()["code"], "feature_disabled")

    def test_buyer_without_profile_is_not_a_seller_and_gets_none(self):
        set_sellers_flag("on")
        buyer = make_user("buyer2@th.test")
        res = self.client_for(buyer).get(ME)
        self.assertEqual(res.status_code, 404)
        self.assertEqual(res.json()["code"], "not_a_seller")
        self.assertFalse(SellerProfile.objects.filter(user=buyer).exists())

    def test_staff_non_superuser_without_profile_gets_none(self):
        set_sellers_flag("on")
        staff = make_user("staff2@th.test", is_staff=True)
        self.assertEqual(self.client_for(staff).get(ME).status_code, 404)
        self.assertFalse(SellerProfile.objects.filter(user=staff).exists())

    def test_evaluate_unit(self):
        from apps.store.flags import evaluate
        from apps.store.models import FeatureFlag

        off = FeatureFlag(key="x", name="x", status="off")
        owner = self.owner()
        staff = make_user("s3@th.test", is_staff=True)
        self.assertTrue(evaluate(off, owner, "GH"))
        self.assertTrue(evaluate(None, owner, "GH"))
        self.assertFalse(evaluate(off, staff, "GH"))
        self.assertFalse(evaluate(None, staff, "GH"))
        from django.contrib.auth.models import AnonymousUser

        self.assertFalse(evaluate(off, AnonymousUser(), "GH"))
