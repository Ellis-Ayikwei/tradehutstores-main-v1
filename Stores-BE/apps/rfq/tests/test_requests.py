"""Buyer-side request endpoints R1-R7 (plan 11 tests 1, 11, 12, 13)."""

import shutil
import tempfile
from datetime import timedelta

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone

from apps.rfq.models import RFQ, Quote, RFQAttachment

from .helpers import (
    BASE,
    client_for,
    create_payload,
    make_category,
    make_quote,
    make_rfq,
    make_supplier,
    make_user,
)

PDF = b"%PDF-1.4 test"
PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 8


class CreateTests(TestCase):
    def setUp(self):
        self.buyer = make_user("buyer")
        self.category = make_category()

    def post(self, body, key="key-1", user=None):
        return client_for(user or self.buyer).post(
            BASE + "requests/", body, format="json", HTTP_IDEMPOTENCY_KEY=key
        )

    def test_publish_true_creates_open_request(self):
        res = self.post(create_payload(self.category))
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["status"], "open")
        self.assertTrue(res.data["reference"].startswith("RFQ-"))
        self.assertEqual(len(res.data["reference"]), 12)
        self.assertEqual(res.data["currency"], "GHS")
        self.assertEqual(res.data["quotes"], [])
        rfq = RFQ.objects.get()
        self.assertEqual((rfq.buyer, rfq.delivery_country, rfq.quote_count), (self.buyer, "GH", 0))
        self.assertIsNotNone(rfq.published_at)

    def test_publish_false_creates_draft(self):
        res = self.post(create_payload(self.category, publish=False))
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["status"], "draft")
        self.assertIsNone(RFQ.objects.get().published_at)

    def test_replay_returns_same_request_with_200(self):
        first = self.post(create_payload(self.category))
        again = self.post(create_payload(self.category, title="Different"))
        self.assertEqual((first.status_code, again.status_code), (201, 200))
        self.assertEqual(first.data["id"], again.data["id"])
        self.assertEqual(RFQ.objects.count(), 1)

    def test_same_key_from_another_buyer_is_a_new_request(self):
        self.post(create_payload(self.category))
        other = self.post(create_payload(self.category), user=make_user("other"))
        self.assertEqual(other.status_code, 201)
        self.assertEqual(RFQ.objects.count(), 2)

    def test_missing_idempotency_key_is_400(self):
        res = client_for(self.buyer).post(BASE + "requests/", create_payload(self.category), format="json")
        self.assertEqual((res.status_code, res.data["code"]), (400, "idempotency_key_required"))

    def test_requires_authentication(self):
        res = client_for().post(
            BASE + "requests/", create_payload(self.category), format="json", HTTP_IDEMPOTENCY_KEY="k"
        )
        self.assertEqual(res.status_code, 401)
        self.assertEqual(client_for().get(BASE + "requests/").status_code, 401)

    def test_unknown_category_is_404(self):
        res = self.post(create_payload(self.category, category_id="00000000-0000-0000-0000-000000000000"))
        self.assertEqual((res.status_code, res.data["code"]), (404, "category_not_found"))

    def test_sub_category_must_belong_to_category(self):
        from apps.catalog.models import SubCategory

        foreign = SubCategory.objects.create(sub_category_name="x", category=make_category())
        res = self.post(create_payload(self.category, sub_category_id=str(foreign.id)))
        self.assertEqual(res.status_code, 400)
        self.assertIn("sub_category_id", res.data)

    def test_publish_deadline_bounds(self):
        now = timezone.now()
        for n, delta in enumerate((timedelta(hours=2), timedelta(days=61))):
            res = self.post(create_payload(self.category, closes_at=(now + delta).isoformat()), key=f"k{n}")
            self.assertEqual(res.status_code, 400, delta)
            self.assertIn("closes_at", res.data)
        self.assertEqual(RFQ.objects.count(), 0)

    def test_draft_with_short_deadline_is_allowed_but_cannot_be_published(self):
        soon = (timezone.now() + timedelta(hours=2)).isoformat()
        res = self.post(create_payload(self.category, publish=False, closes_at=soon))
        self.assertEqual(res.status_code, 201)
        pub = client_for(self.buyer).post(BASE + f"requests/{res.data['id']}/publish/")
        self.assertEqual(pub.status_code, 400)
        self.assertEqual(RFQ.objects.get().status, "draft")

    def test_past_deadline_is_rejected(self):
        past = (timezone.now() - timedelta(hours=1)).isoformat()
        res = self.post(create_payload(self.category, publish=False, closes_at=past))
        self.assertEqual(res.status_code, 400)

    def test_field_rules(self):
        cases = {
            "quantity": 0,
            "budget_min": "-1",
            "delivery_country": "GHA",
            "title": "",
            "description": "x" * 5001,
            "specs": [{"label": "a", "value": "b"}] * 21,
            "needed_by": (timezone.localdate() - timedelta(days=1)).isoformat(),
        }
        for field, value in cases.items():
            res = self.post(create_payload(self.category, **{field: value}), key=f"k-{field}")
            self.assertEqual(res.status_code, 400, field)
            self.assertIn(field, res.data, field)

    def test_budget_min_above_max_is_rejected(self):
        res = self.post(create_payload(self.category, budget_min="500.00", budget_max="100.00"))
        self.assertEqual(res.status_code, 400)
        self.assertIn("budget_max", res.data)

    def test_budget_and_specs_round_trip(self):
        res = self.post(
            create_payload(
                self.category,
                budget_min="100.5",
                budget_max="900",
                specs=[{"label": "Colour", "value": "Black"}],
            )
        )
        self.assertEqual((res.data["budget_min"], res.data["budget_max"]), ("100.50", "900.00"))
        self.assertEqual(res.data["specs"], [{"label": "Colour", "value": "Black"}])


class EditPublishCancelTests(TestCase):
    def setUp(self):
        self.buyer = make_user("buyer")
        self.category = make_category()
        self.client = client_for(self.buyer)

    def url(self, rfq, suffix=""):
        return BASE + f"requests/{rfq.pk}/{suffix}"

    def test_draft_accepts_any_field(self):
        rfq = make_rfq(self.buyer, self.category, status="draft", published_at=None)
        other = make_category()
        res = self.client.patch(
            self.url(rfq), {"title": "New", "quantity": 5, "category_id": str(other.id)}, format="json"
        )
        self.assertEqual(res.status_code, 200, res.data)
        rfq.refresh_from_db()
        self.assertEqual((rfq.title, rfq.quantity, rfq.category_id), ("New", 5, other.id))

    def test_patch_budget_is_checked_against_stored_value(self):
        rfq = make_rfq(self.buyer, self.category, status="draft", budget_min=100, budget_max=200)
        res = self.client.patch(self.url(rfq), {"budget_max": "50.00"}, format="json")
        self.assertEqual(res.status_code, 400)
        rfq.refresh_from_db()
        self.assertEqual(str(rfq.budget_max), "200.00")

    def test_open_without_quotes_edits_description_specs_deadline_only(self):
        rfq = make_rfq(self.buyer, self.category)
        ok = self.client.patch(
            self.url(rfq),
            {"description": "Updated", "closes_at": (timezone.now() + timedelta(days=4)).isoformat()},
            format="json",
        )
        self.assertEqual(ok.status_code, 200, ok.data)
        blocked = self.client.patch(self.url(rfq), {"title": "Nope", "quantity": 3}, format="json")
        self.assertEqual((blocked.status_code, blocked.data["code"]), (409, "not_editable"))
        self.assertEqual(blocked.data["fields"], ["quantity", "title"])

    def test_quoting_allows_only_extending_the_deadline(self):
        rfq = make_rfq(self.buyer, self.category)
        make_quote(rfq, make_supplier(self.category))
        rfq.refresh_from_db()
        later = (rfq.closes_at + timedelta(days=2)).isoformat()
        self.assertEqual(self.client.patch(self.url(rfq), {"closes_at": later}, format="json").status_code, 200)
        earlier = (timezone.now() + timedelta(days=2)).isoformat()
        res = self.client.patch(self.url(rfq), {"closes_at": earlier}, format="json")
        self.assertEqual(res.status_code, 400)
        res = self.client.patch(self.url(rfq), {"description": "x"}, format="json")
        self.assertEqual((res.status_code, res.data["code"]), (409, "not_editable"))

    def test_open_state_with_quotes_is_not_editable(self):
        rfq = make_rfq(self.buyer, self.category, quote_count=1)
        res = self.client.patch(self.url(rfq), {"description": "x"}, format="json")
        self.assertEqual((res.status_code, res.data["code"]), (409, "not_editable"))

    def test_terminal_states_are_not_editable(self):
        for status in ("awarded", "closed", "cancelled", "expired"):
            rfq = make_rfq(self.buyer, self.category, status=status)
            res = self.client.patch(self.url(rfq), {"description": "x"}, format="json")
            self.assertEqual(res.status_code, 409, status)

    def test_publish_moves_draft_to_open_and_is_idempotent(self):
        rfq = make_rfq(self.buyer, self.category, status="draft", published_at=None)
        first = self.client.post(self.url(rfq, "publish/"))
        again = self.client.post(self.url(rfq, "publish/"))
        self.assertEqual((first.status_code, again.status_code), (200, 200))
        rfq.refresh_from_db()
        self.assertEqual(rfq.status, "open")
        self.assertIsNotNone(rfq.published_at)

    def test_publish_cancelled_is_409(self):
        rfq = make_rfq(self.buyer, self.category, status="cancelled")
        res = self.client.post(self.url(rfq, "publish/"))
        self.assertEqual((res.status_code, res.data["code"]), (409, "invalid_state"))

    def test_cancel_marks_quotes_not_selected_and_notifies_quoters(self):
        from apps.notifications.models import Notification

        rfq = make_rfq(self.buyer, self.category)
        a, b = make_supplier(self.category, "a"), make_supplier(self.category, "b")
        qa = make_quote(rfq, a)
        qb = make_quote(rfq, b, status=Quote.STATUS_WITHDRAWN)
        with self.captureOnCommitCallbacks(execute=True):
            res = self.client.post(self.url(rfq, "cancel/"), {"reason": "changed my mind"}, format="json")
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data["status"], "cancelled")
        qa.refresh_from_db()
        qb.refresh_from_db()
        rfq.refresh_from_db()
        self.assertEqual((qa.status, qb.status), ("not_selected", "withdrawn"))
        self.assertIsNotNone(rfq.cancelled_at)
        notified = Notification.objects.filter(kind="rfq.cancelled").values_list("user_id", flat=True)
        self.assertEqual(list(notified), [a.user_id])

    def test_cancel_twice_is_a_noop_success(self):
        rfq = make_rfq(self.buyer, self.category)
        self.assertEqual(self.client.post(self.url(rfq, "cancel/")).status_code, 200)
        stamp = RFQ.objects.get(pk=rfq.pk).cancelled_at
        self.assertEqual(self.client.post(self.url(rfq, "cancel/")).status_code, 200)
        self.assertEqual(RFQ.objects.get(pk=rfq.pk).cancelled_at, stamp)

    def test_cancel_draft_and_cannot_cancel_after_award(self):
        draft = make_rfq(self.buyer, self.category, status="draft")
        self.assertEqual(self.client.post(self.url(draft, "cancel/")).status_code, 200)
        for status in ("awarded", "closed", "expired"):
            rfq = make_rfq(self.buyer, self.category, status=status)
            res = self.client.post(self.url(rfq, "cancel/"))
            self.assertEqual((res.status_code, res.data["code"]), (409, "not_cancellable"), status)


class ListTests(TestCase):
    def setUp(self):
        self.buyer = make_user("buyer")
        self.category = make_category()

    def test_list_is_scoped_filtered_and_shaped(self):
        other = make_user("other")
        for i in range(5):
            make_rfq(self.buyer, self.category, status="open" if i % 2 else "draft")
        make_rfq(other, self.category)
        client = client_for(self.buyer)
        res = client.get(BASE + "requests/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["count"], 5)
        self.assertEqual(
            set(res.data["results"][0]),
            {
                "id", "reference", "title", "category", "quantity", "unit", "status",
                "quote_count", "closes_at", "awarded_quote_id", "order_id", "created_on",
            },
        )
        self.assertEqual(client.get(BASE + "requests/", {"status": "draft"}).data["count"], 3)
        self.assertEqual(client.get(BASE + "requests/", {"status": "bogus"}).status_code, 400)

    def test_list_query_count_does_not_grow_with_rows(self):
        client = client_for(self.buyer)
        make_rfq(self.buyer, self.category)
        with self.assertNumQueries(2):  # count + page (category is joined)
            client.get(BASE + "requests/")
        for _ in range(10):
            make_rfq(self.buyer, self.category)
        with self.assertNumQueries(2):
            client.get(BASE + "requests/")

    def test_detail_sorts_quotes_by_grand_total_and_hides_withdrawn(self):
        rfq = make_rfq(self.buyer, self.category)
        pricey = make_quote(rfq, make_supplier(self.category, "p"), unit_price="30.00", shipping="0.00")
        cheap = make_quote(rfq, make_supplier(self.category, "c"), unit_price="20.00", shipping="5.00")
        make_quote(rfq, make_supplier(self.category, "w"), status="withdrawn")
        res = client_for(self.buyer).get(BASE + f"requests/{rfq.pk}/")
        ids = [q["id"] for q in res.data["quotes"]]
        self.assertEqual(ids, [str(cheap.id), str(pricey.id)])
        self.assertEqual(res.data["quotes"][0]["grand_total"], "205.00")
        self.assertEqual(res.data["quote_count"], 2)

    def test_detail_query_count_is_fixed(self):
        rfq = make_rfq(self.buyer, self.category)
        client = client_for(self.buyer)
        make_quote(rfq, make_supplier(self.category, "s0"))
        with CaptureCount() as few:
            client.get(BASE + f"requests/{rfq.pk}/")
        for i in range(1, 5):
            make_quote(rfq, make_supplier(self.category, f"s{i}"))
        with CaptureCount() as many:
            res = client.get(BASE + f"requests/{rfq.pk}/")
        self.assertEqual(len(res.data["quotes"]), 5)
        self.assertEqual(few.count, many.count)


class CaptureCount:
    """Counts queries issued inside the ``with`` block."""

    def __enter__(self):
        from django.db import connection
        from django.test.utils import CaptureQueriesContext

        self._ctx = CaptureQueriesContext(connection)
        self._ctx.__enter__()
        return self

    def __exit__(self, *exc):
        self._ctx.__exit__(*exc)
        self.count = len(self._ctx)


class AttachmentTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.media = tempfile.mkdtemp()
        cls.override = override_settings(MEDIA_ROOT=cls.media)
        cls.override.enable()

    @classmethod
    def tearDownClass(cls):
        cls.override.disable()
        shutil.rmtree(cls.media, ignore_errors=True)
        super().tearDownClass()

    def setUp(self):
        self.buyer = make_user("buyer")
        self.category = make_category()
        self.rfq = make_rfq(self.buyer, self.category, status="draft")
        self.client = client_for(self.buyer)
        self.url = BASE + f"requests/{self.rfq.pk}/attachments/"

    def upload(self, name="spec.pdf", content=PDF, content_type="application/pdf", client=None):
        return (client or self.client).post(
            self.url, {"file": SimpleUploadedFile(name, content, content_type=content_type)}, format="multipart"
        )

    def test_upload_and_delete(self):
        res = self.upload()
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual((res.data["filename"], res.data["size"]), ("spec.pdf", len(PDF)))
        self.assertNotIn("spec", RFQAttachment.objects.get().file.name)  # non-guessable storage name
        detail = self.client.get(BASE + f"requests/{self.rfq.pk}/")
        self.assertEqual(len(detail.data["attachments"]), 1)
        with self.captureOnCommitCallbacks(execute=True):
            gone = self.client.delete(self.url + f"{res.data['id']}/")
        self.assertEqual(gone.status_code, 204)
        self.assertEqual(RFQAttachment.objects.count(), 0)

    def test_type_checks(self):
        self.assertEqual(self.upload("a.exe", b"MZ", "application/octet-stream").data["code"], "file_type")
        self.assertEqual(self.upload("a.pdf", PDF, "image/png").data["code"], "file_type")
        self.assertEqual(self.upload("a.pdf", b"not a pdf", "application/pdf").data["code"], "file_type")
        self.assertEqual(self.upload("a.png", PNG, "image/png").status_code, 201)
        self.assertEqual(RFQAttachment.objects.count(), 1)

    def test_size_limit(self):
        res = self.upload("big.pdf", PDF + b"0" * (10 * 1024 * 1024))
        self.assertEqual((res.status_code, res.data["code"]), (400, "file_too_large"))

    def test_five_attachments_at_most(self):
        for _ in range(5):
            self.assertEqual(self.upload().status_code, 201)
        res = self.upload()
        self.assertEqual((res.status_code, res.data["code"]), (400, "too_many_attachments"))

    def test_missing_file_is_400(self):
        res = self.client.post(self.url, {}, format="multipart")
        self.assertEqual((res.status_code, res.data["code"]), (400, "file_required"))

    def test_only_the_owner_can_attach_or_delete(self):
        att = self.upload().data["id"]
        stranger = client_for(make_user("stranger"))
        self.assertEqual(self.upload(client=stranger).status_code, 404)
        self.assertEqual(stranger.delete(self.url + f"{att}/").status_code, 404)
        self.assertEqual(RFQAttachment.objects.count(), 1)

    def test_not_editable_after_award(self):
        att = self.upload().data["id"]
        RFQ.objects.filter(pk=self.rfq.pk).update(status="awarded")
        self.assertEqual(self.upload().data["code"], "not_editable")
        self.assertEqual(self.client.delete(self.url + f"{att}/").status_code, 409)
