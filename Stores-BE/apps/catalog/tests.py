from unittest import mock

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.sellers.models import SellerProfile

from . import services
from .models import Attribute, AttributeValue, AttributeValueRequest

User = get_user_model()

BASE = "/tradehut/api/v1/catalog/"
SELLER_URL = BASE + "attribute-value-requests/"
MINE_URL = SELLER_URL + "mine/"
ADMIN_URL = BASE + "admin/attribute-value-requests/"


def make_seller(email, status="verified", **extra):
    user = User.objects.create_user(email=email, password="pass12345!")
    profile = SellerProfile.objects.create(
        user=user,
        business_name=extra.pop("business_name", f"Shop {email}"),
        verification_status=status,
        **extra,
    )
    return user, profile


def client_for(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


class Fixture:
    def setUp(self):
        super().setUp()
        self.colour = Attribute.objects.create(name="Color", display_type="swatch")
        self.size = Attribute.objects.create(name="Size")
        self.user, self.profile = make_seller("seller@test.dev")
        self.client = client_for(self.user)
        self.staff = User.objects.create_user(
            email="staff@test.dev", password="pass12345!", is_staff=True
        )
        self.staff_client = client_for(self.staff)

    def ask(self, name="Mustard", **extra):
        return self.client.post(
            SELLER_URL,
            {"attribute": str(self.colour.pk), "value_name": name, **extra},
            format="json",
        )

    def make_request(self, user=None, profile=None, name="Mustard", **extra):
        return AttributeValueRequest.objects.create(
            attribute=self.colour,
            value_name=name,
            requested_by=user or self.user,
            seller=profile or self.profile,
            **extra,
        )


class SellerCreateTests(Fixture, TestCase):
    def test_happy_path(self):
        res = self.ask("  Mustard   Yellow ", color_code="#E1AD01", note="Popular shade")
        self.assertEqual(res.status_code, 201, res.content)
        body = res.json()
        self.assertEqual(body["value_name"], "Mustard Yellow")
        self.assertEqual(body["color_code"], "#E1AD01")
        self.assertEqual(body["note"], "Popular shade")
        self.assertEqual(body["status"], "pending")
        self.assertEqual(body["attribute"], {"id": str(self.colour.pk), "name": "Color"})
        self.assertIsNone(body["created_value"])
        self.assertEqual(body["review_note"], "")
        obj = AttributeValueRequest.objects.get(pk=body["id"])
        self.assertEqual(obj.requested_by, self.user)
        self.assertEqual(obj.seller, self.profile)

    def test_pending_seller_may_request(self):
        user, _ = make_seller("pending@test.dev", status="pending")
        res = client_for(user).post(
            SELLER_URL, {"attribute": str(self.colour.pk), "value_name": "Teal"}, format="json"
        )
        self.assertEqual(res.status_code, 201, res.content)

    def test_keeps_original_casing(self):
        self.assertEqual(self.ask("MUSTARD").json()["value_name"], "MUSTARD")

    def test_value_exists_is_case_insensitive(self):
        value = AttributeValue.objects.create(
            attribute=self.colour, value_name="Mustard", color_code="#E1AD01"
        )
        res = self.ask("mUsTaRd")
        self.assertEqual(res.status_code, 409)
        body = res.json()
        self.assertEqual(body["code"], "value_exists")
        self.assertIn("detail", body)
        self.assertEqual(
            body["value"],
            {"id": str(value.pk), "value_name": "Mustard", "color_code": "#E1AD01"},
        )
        self.assertEqual(AttributeValueRequest.objects.count(), 0)

    def test_same_name_on_another_attribute_is_not_a_clash(self):
        AttributeValue.objects.create(attribute=self.size, value_name="Mustard")
        self.assertEqual(self.ask("Mustard").status_code, 201)

    def test_already_requested_is_case_insensitive(self):
        first = self.ask("Mustard").json()
        res = self.ask("  mustard ")
        self.assertEqual(res.status_code, 409)
        body = res.json()
        self.assertEqual(body["code"], "already_requested")
        self.assertEqual(body["request"]["id"], first["id"])
        self.assertEqual(body["request"]["status"], "pending")
        self.assertEqual(AttributeValueRequest.objects.count(), 1)

    def test_another_seller_may_request_the_same_value(self):
        self.ask("Mustard")
        other, _ = make_seller("other@test.dev")
        res = client_for(other).post(
            SELLER_URL, {"attribute": str(self.colour.pk), "value_name": "Mustard"}, format="json"
        )
        self.assertEqual(res.status_code, 201)

    def test_resubmitting_after_review_is_allowed(self):
        self.make_request(status="rejected")
        self.assertEqual(self.ask("Mustard").status_code, 201)

    def test_too_many_pending_requests(self):
        for i in range(services.MAX_PENDING_PER_SELLER):
            self.make_request(name=f"Shade {i}")
        res = self.ask("One more")
        self.assertEqual(res.status_code, 429)
        self.assertEqual(res.json()["code"], "too_many_requests")
        # Reviewed requests do not count towards the cap.
        AttributeValueRequest.objects.filter(value_name="Shade 0").update(status="rejected")
        self.assertEqual(self.ask("One more").status_code, 201)

    def test_cap_is_per_seller(self):
        other, other_profile = make_seller("other@test.dev")
        for i in range(services.MAX_PENDING_PER_SELLER):
            self.make_request(user=other, profile=other_profile, name=f"Shade {i}")
        self.assertEqual(self.ask("Mine").status_code, 201)

    def test_non_seller_forbidden(self):
        buyer = User.objects.create_user(email="buyer@test.dev", password="pass12345!")
        res = client_for(buyer).post(
            SELLER_URL, {"attribute": str(self.colour.pk), "value_name": "Teal"}, format="json"
        )
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.json()["code"], "not_a_seller")
        self.assertEqual(client_for(buyer).get(MINE_URL).status_code, 403)

    def test_anonymous_rejected(self):
        res = APIClient().post(SELLER_URL, {}, format="json")
        self.assertIn(res.status_code, (401, 403))

    def test_rejected_or_suspended_seller_forbidden(self):
        for status in ("rejected", "suspended"):
            user, _ = make_seller(f"{status}@test.dev", status=status)
            res = client_for(user).post(
                SELLER_URL, {"attribute": str(self.colour.pk), "value_name": "Teal"}, format="json"
            )
            self.assertEqual(res.status_code, 403, status)

    def test_inactive_seller_forbidden(self):
        user, _ = make_seller("inactive@test.dev", is_active=False)
        self.assertEqual(client_for(user).get(MINE_URL).status_code, 403)

    def test_validation(self):
        bad_colour = self.ask("Teal", color_code="red")
        self.assertEqual(bad_colour.status_code, 400)
        self.assertIn("color_code", bad_colour.json())
        self.assertEqual(self.ask("   ").status_code, 400)
        self.assertEqual(self.ask("x" * 101).status_code, 400)
        self.assertEqual(self.ask("Teal", note="n" * 501).status_code, 400)
        missing = self.client.post(SELLER_URL, {"value_name": "Teal"}, format="json")
        self.assertEqual(missing.status_code, 400)
        self.assertIn("attribute", missing.json())

    def test_blank_colour_is_accepted(self):
        self.assertEqual(self.ask("Teal", color_code="").status_code, 201)

    def test_staff_notified_on_create(self):
        with mock.patch.object(services, "_notify") as notify:
            with self.captureOnCommitCallbacks(execute=True):
                self.assertEqual(self.ask("Teal").status_code, 201)
        notify.assert_called_once()
        self.assertEqual(notify.call_args.args[0], self.staff.pk)
        self.assertEqual(notify.call_args.args[1], "attribute_value_request")

    def test_notify_failure_never_breaks_create(self):
        fake = mock.MagicMock(side_effect=RuntimeError("boom"))
        with mock.patch.dict(
            "sys.modules", {"apps.notifications.services": mock.MagicMock(notify=fake)}
        ):
            with self.captureOnCommitCallbacks(execute=True):
                self.assertEqual(self.ask("Teal").status_code, 201)
        fake.assert_called_once()


class MineListTests(Fixture, TestCase):
    def test_scoped_to_requester_and_paginated(self):
        other, other_profile = make_seller("other@test.dev")
        mine = self.make_request(name="Mustard")
        self.make_request(user=other, profile=other_profile, name="Teal")
        res = self.client.get(MINE_URL)
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["count"], 1)
        row = body["results"][0]
        self.assertEqual(row["id"], str(mine.pk))
        self.assertEqual(
            set(row),
            {
                "id", "attribute", "value_name", "color_code", "note", "status",
                "review_note", "created_on", "created_value",
            },
        )

    def test_status_filter_and_created_value(self):
        value = AttributeValue.objects.create(
            attribute=self.colour, value_name="Mustard", color_code="#E1AD01"
        )
        self.make_request(name="Mustard", status="approved", created_value=value)
        self.make_request(name="Teal", status="rejected", review_note="Not a colour")
        self.make_request(name="Olive")
        res = self.client.get(MINE_URL, {"status": "approved"}).json()
        self.assertEqual(res["count"], 1)
        self.assertEqual(
            res["results"][0]["created_value"],
            {"id": str(value.pk), "value_name": "Mustard", "color_code": "#E1AD01"},
        )
        rejected = self.client.get(MINE_URL, {"status": "rejected"}).json()["results"][0]
        self.assertEqual(rejected["review_note"], "Not a colour")
        self.assertIsNone(rejected["created_value"])
        self.assertEqual(self.client.get(MINE_URL).json()["count"], 3)

    def test_query_count_does_not_grow_with_rows(self):
        self.make_request(name="Shade 0")
        self.client.get(MINE_URL)  # warm any one-off caches
        from django.db import connection
        from django.test.utils import CaptureQueriesContext

        with CaptureQueriesContext(connection) as few:
            self.client.get(MINE_URL)
        for i in range(1, 6):
            self.make_request(name=f"Shade {i}")
        with CaptureQueriesContext(connection) as many:
            self.client.get(MINE_URL)
        self.assertEqual(len(few), len(many))


class StaffReviewTests(Fixture, TestCase):
    def test_non_staff_cannot_use_admin_endpoints(self):
        req = self.make_request()
        for method, url, data in [
            ("get", ADMIN_URL, None),
            ("post", f"{ADMIN_URL}{req.pk}/approve/", {}),
            ("post", f"{ADMIN_URL}{req.pk}/reject/", {"review_note": "Not needed"}),
        ]:
            res = getattr(self.client, method)(url, data, format="json")
            self.assertEqual(res.status_code, 403, url)
            anon = getattr(APIClient(), method)(url, data, format="json")
            self.assertIn(anon.status_code, (401, 403), url)
        req.refresh_from_db()
        self.assertEqual(req.status, "pending")

    def test_list_with_requester_and_filters(self):
        other, other_profile = make_seller("other@test.dev", business_name="Other Store")
        a = self.make_request(name="Mustard")
        b = self.make_request(user=other, profile=other_profile, name="Teal", status="rejected")
        res = self.staff_client.get(ADMIN_URL)
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["count"], 2)
        row = next(r for r in body["results"] if r["id"] == str(a.pk))
        self.assertEqual(
            row["requester"],
            {
                "id": str(self.user.pk),
                "email": "seller@test.dev",
                "store_name": "Shop seller@test.dev",
            },
        )

        def ids(**params):
            return {r["id"] for r in self.staff_client.get(ADMIN_URL, params).json()["results"]}

        self.assertEqual(ids(status="pending"), {str(a.pk)})
        self.assertEqual(ids(status="rejected"), {str(b.pk)})
        self.assertEqual(ids(attribute=str(self.colour.pk)), {str(a.pk), str(b.pk)})
        self.assertEqual(ids(attribute=str(self.size.pk)), set())
        self.assertEqual(ids(attribute="not-a-uuid"), set())
        self.assertEqual(ids(q="mustard"), {str(a.pk)})
        self.assertEqual(ids(q="other store"), {str(b.pk)})
        self.assertEqual(ids(q="other@test"), {str(b.pk)})
        self.assertEqual(ids(q="color"), {str(a.pk), str(b.pk)})

    def test_approve_creates_value(self):
        req = self.make_request(name="Mustard", color_code="#E1AD01")
        res = self.staff_client.post(f"{ADMIN_URL}{req.pk}/approve/", {}, format="json")
        self.assertEqual(res.status_code, 200, res.content)
        body = res.json()
        self.assertEqual(body["status"], "approved")
        value = AttributeValue.objects.get(attribute=self.colour, value_name="Mustard")
        self.assertEqual(value.color_code, "#E1AD01")
        self.assertEqual(
            body["created_value"],
            {"id": str(value.pk), "value_name": "Mustard", "color_code": "#E1AD01"},
        )
        req.refresh_from_db()
        self.assertEqual(req.created_value, value)
        self.assertEqual(req.reviewed_by, self.staff)
        self.assertIsNotNone(req.reviewed_at)
        self.assertEqual(body["requester"]["email"], "seller@test.dev")

    def test_approve_with_corrected_spelling_and_colour(self):
        req = self.make_request(name="mustrad", color_code="#000000")
        res = self.staff_client.post(
            f"{ADMIN_URL}{req.pk}/approve/",
            {"value_name": "  Mustard ", "color_code": "#E1AD01"},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()["status"], "approved")
        value = AttributeValue.objects.get(attribute=self.colour)
        self.assertEqual((value.value_name, value.color_code), ("Mustard", "#E1AD01"))
        req.refresh_from_db()
        self.assertEqual(req.value_name, "mustrad")  # the original ask is kept

    def test_approve_rejects_bad_colour(self):
        req = self.make_request()
        res = self.staff_client.post(
            f"{ADMIN_URL}{req.pk}/approve/", {"color_code": "nope"}, format="json"
        )
        self.assertEqual(res.status_code, 400)
        self.assertEqual(AttributeValue.objects.count(), 0)

    def test_approve_links_value_that_appeared_meanwhile(self):
        req = self.make_request(name="Mustard")
        existing = AttributeValue.objects.create(
            attribute=self.colour, value_name="MUSTARD", color_code="#AAAAAA"
        )
        res = self.staff_client.post(f"{ADMIN_URL}{req.pk}/approve/", {}, format="json")
        self.assertEqual(res.status_code, 200, res.content)
        body = res.json()
        self.assertEqual(body["status"], "duplicate")
        self.assertEqual(body["created_value"]["id"], str(existing.pk))
        self.assertEqual(AttributeValue.objects.filter(attribute=self.colour).count(), 1)
        req.refresh_from_db()
        self.assertEqual(req.created_value, existing)
        self.assertEqual(req.reviewed_by, self.staff)

    def test_correction_that_matches_existing_value_is_duplicate(self):
        existing = AttributeValue.objects.create(attribute=self.colour, value_name="Mustard")
        req = self.make_request(name="mustrad")
        res = self.staff_client.post(
            f"{ADMIN_URL}{req.pk}/approve/", {"value_name": "mustard"}, format="json"
        )
        self.assertEqual(res.json()["status"], "duplicate")
        self.assertEqual(res.json()["created_value"]["id"], str(existing.pk))

    def test_reject_requires_note(self):
        req = self.make_request()
        url = f"{ADMIN_URL}{req.pk}/reject/"
        for payload in ({}, {"review_note": ""}, {"review_note": "   "}, {"review_note": "nope"}):
            res = self.staff_client.post(url, payload, format="json")
            self.assertEqual(res.status_code, 400, payload)
            self.assertIn("review_note", res.json())
        req.refresh_from_db()
        self.assertEqual(req.status, "pending")

    def test_reject(self):
        req = self.make_request()
        res = self.staff_client.post(
            f"{ADMIN_URL}{req.pk}/reject/", {"review_note": "  Not a real colour  "}, format="json"
        )
        self.assertEqual(res.status_code, 200, res.content)
        body = res.json()
        self.assertEqual(body["status"], "rejected")
        self.assertEqual(body["review_note"], "Not a real colour")
        self.assertIsNone(body["created_value"])
        req.refresh_from_db()
        self.assertEqual(req.reviewed_by, self.staff)
        self.assertIsNotNone(req.reviewed_at)
        self.assertEqual(AttributeValue.objects.count(), 0)

    def test_already_reviewed_409(self):
        for first in ("approve", "reject"):
            for second in ("approve", "reject"):
                req = self.make_request(name=f"{first}-{second}")
                payload = {"review_note": "Not needed"}
                step_one = self.staff_client.post(
                    f"{ADMIN_URL}{req.pk}/{first}/", payload, format="json"
                )
                self.assertEqual(step_one.status_code, 200)
                res = self.staff_client.post(
                    f"{ADMIN_URL}{req.pk}/{second}/", payload, format="json"
                )
                self.assertEqual(res.status_code, 409, (first, second))
                self.assertEqual(res.json()["code"], "already_reviewed")

    def test_double_approve_creates_one_value(self):
        req = self.make_request()
        self.staff_client.post(f"{ADMIN_URL}{req.pk}/approve/", {}, format="json")
        self.staff_client.post(f"{ADMIN_URL}{req.pk}/approve/", {}, format="json")
        self.assertEqual(AttributeValue.objects.filter(attribute=self.colour).count(), 1)

    def test_unknown_request_404(self):
        res = self.staff_client.post(
            f"{ADMIN_URL}00000000-0000-0000-0000-000000000000/approve/", {}, format="json"
        )
        self.assertEqual(res.status_code, 404)
        self.assertEqual(res.json()["code"], "not_found")

    def test_requester_notified_on_review(self):
        approve = self.make_request(name="Mustard")
        reject = self.make_request(name="Teal")
        with mock.patch.object(services, "_notify") as notify:
            with self.captureOnCommitCallbacks(execute=True):
                self.staff_client.post(f"{ADMIN_URL}{approve.pk}/approve/", {}, format="json")
                self.staff_client.post(
                    f"{ADMIN_URL}{reject.pk}/reject/", {"review_note": "Not needed"}, format="json"
                )
        kinds = [c.args[1] for c in notify.call_args_list]
        self.assertEqual(
            kinds, ["attribute_value_request_approved", "attribute_value_request_rejected"]
        )
        for call in notify.call_args_list:
            self.assertEqual(call.args[0], self.user.pk)

    def test_approved_value_then_blocks_new_requests(self):
        req = self.make_request(name="Mustard")
        self.staff_client.post(f"{ADMIN_URL}{req.pk}/approve/", {}, format="json")
        res = self.ask("mustard")
        self.assertEqual(res.status_code, 409)
        self.assertEqual(res.json()["code"], "value_exists")


class ModelTests(Fixture, TestCase):
    def test_attribute_is_protected_from_delete(self):
        from django.db.models import ProtectedError

        self.make_request()
        with self.assertRaises(ProtectedError):
            self.colour.delete()

    def test_model_colour_validator(self):
        from django.core.exceptions import ValidationError

        req = self.make_request(color_code="red")
        with self.assertRaises(ValidationError) as ctx:
            req.full_clean()
        self.assertIn("color_code", ctx.exception.message_dict)
        req.color_code = "#aBc123"
        req.full_clean()
