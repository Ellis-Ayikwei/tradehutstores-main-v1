"""Award flow R8 (plan 11 test 7)."""

from datetime import timedelta
from decimal import Decimal
from unittest import mock

from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone

from apps.notifications.models import Notification
from apps.orders.models import Order
from apps.rfq import services
from apps.rfq.models import RFQ, Quote

from .helpers import (
    BASE,
    client_for,
    create_payload,
    fake_order_hook,
    make_category,
    make_quote,
    make_rfq,
    make_supplier,
    make_user,
    quote_payload,
)

HOOK = "apps.rfq.services.create_award_order"


class AwardBase(TestCase):
    def setUp(self):
        self.buyer = make_user("buyer")
        self.category = make_category()
        self.rfq = make_rfq(self.buyer, self.category, quantity=10)
        self.sup_a = make_supplier(self.category, "a")
        self.sup_b = make_supplier(self.category, "b")
        self.sup_c = make_supplier(self.category, "c")
        self.qa = make_quote(self.rfq, self.sup_a, unit_price="20.00", shipping="5.00")
        self.qb = make_quote(self.rfq, self.sup_b, unit_price="18.00", shipping="30.00")
        self.qc = make_quote(self.rfq, self.sup_c, status="withdrawn")
        self.client = client_for(self.buyer)
        self.url = BASE + f"requests/{self.rfq.pk}/award/"

    def award(self, quote, key="award-1", client=None):
        return (client or self.client).post(
            self.url, {"quote_id": str(quote.id)}, format="json", HTTP_IDEMPOTENCY_KEY=key
        )


class AwardTests(AwardBase):
    def test_award_creates_the_order_and_settles_every_quote(self):
        with mock.patch(HOOK, side_effect=fake_order_hook) as hook, self.captureOnCommitCallbacks(execute=True):
            res = self.award(self.qa)
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(hook.call_count, 1)
        order = Order.objects.get()
        self.assertEqual(res.data["order_id"], str(order.id))
        self.assertEqual(res.data["rfq"]["status"], "awarded")
        self.assertEqual(res.data["rfq"]["awarded_quote_id"], str(self.qa.id))
        self.assertEqual((order.user, order.order_status, order.payment_status), (self.buyer, "Pending", "unpaid"))
        self.assertEqual((order.subtotal, order.shipping_cost, order.total_amount), (Decimal("200.00"), Decimal("5.00"), Decimal("205.00")))

        for q in (self.qa, self.qb, self.qc):
            q.refresh_from_db()
        self.assertEqual((self.qa.status, self.qb.status, self.qc.status), ("accepted", "not_selected", "withdrawn"))
        rfq = RFQ.objects.get(pk=self.rfq.pk)
        self.assertEqual((rfq.status, rfq.order_id, rfq.award_idempotency_key), ("awarded", order.id, "award-1"))
        self.assertIsNotNone(rfq.awarded_at)
        self.assertEqual(rfq.quote_count, 2)

        kinds = {(n.user_id, n.kind) for n in Notification.objects.all()}
        self.assertIn((self.sup_a.user_id, "rfq.awarded"), kinds)
        self.assertIn((self.sup_b.user_id, "rfq.not_selected"), kinds)
        self.assertNotIn(self.sup_c.user_id, {u for u, _ in kinds})  # withdrawn quoter is not told

    def test_award_hook_sees_the_awarded_state(self):
        seen = {}

        def hook(rfq, quote):
            seen.update(status=rfq.status, awarded_at=rfq.awarded_at, quote=quote.pk)
            return fake_order_hook(rfq, quote)

        with mock.patch(HOOK, side_effect=hook):
            self.award(self.qb)
        self.assertEqual((seen["status"], seen["quote"]), ("awarded", self.qb.pk))
        self.assertIsNotNone(seen["awarded_at"])

    def test_replay_with_the_same_quote_returns_200_and_the_same_order(self):
        with mock.patch(HOOK, side_effect=fake_order_hook) as hook:
            first = self.award(self.qa)
            again = self.award(self.qa)
            retry_new_key = self.award(self.qa, key="award-2")
        self.assertEqual((first.status_code, again.status_code, retry_new_key.status_code), (200, 200, 200))
        self.assertEqual(first.data["order_id"], again.data["order_id"])
        self.assertEqual(hook.call_count, 1)
        self.assertEqual(Order.objects.count(), 1)

    def test_a_different_quote_after_award_is_409_already_awarded(self):
        with mock.patch(HOOK, side_effect=fake_order_hook):
            self.award(self.qa)
            res = self.award(self.qb, key="award-2")
        self.assertEqual((res.status_code, res.data["code"]), (409, "already_awarded"))
        self.assertEqual(Order.objects.count(), 1)
        self.qb.refresh_from_db()
        self.assertEqual(self.qb.status, "not_selected")

    def test_hook_failure_rolls_the_whole_award_back(self):
        with mock.patch(HOOK, side_effect=RuntimeError("orders down")):
            with self.assertRaises(RuntimeError):
                self.award(self.qa)
        rfq = RFQ.objects.get(pk=self.rfq.pk)
        self.assertEqual((rfq.status, rfq.awarded_quote_id, rfq.order_id), ("quoting", None, None))
        self.assertEqual(set(Quote.objects.values_list("status", flat=True)), {"submitted", "withdrawn"})

    def test_missing_orders_hook_awards_without_an_order(self):
        with mock.patch(HOOK, side_effect=NotImplementedError):  # what the real hook raises until BE-ORD-1
            res = self.award(self.qa)
        self.assertEqual(res.status_code, 200, res.data)
        self.assertIsNone(res.data["order_id"])
        self.assertEqual(res.data["rfq"]["status"], "awarded")
        self.assertEqual(Order.objects.count(), 0)

    def test_award_is_allowed_inside_the_grace_period(self):
        RFQ.objects.filter(pk=self.rfq.pk).update(closes_at=timezone.now() - timedelta(days=6))
        with mock.patch(HOOK, side_effect=fake_order_hook):
            self.assertEqual(self.award(self.qa).status_code, 200)

    def test_award_after_the_grace_period_is_409(self):
        RFQ.objects.filter(pk=self.rfq.pk).update(closes_at=timezone.now() - timedelta(days=8))
        res = self.award(self.qa)
        self.assertEqual((res.status_code, res.data["code"]), (409, "award_window_closed"))

    def test_states_that_are_not_awardable(self):
        for status in ("draft", "open", "cancelled", "expired"):
            RFQ.objects.filter(pk=self.rfq.pk).update(status=status)
            res = self.award(self.qa)
            self.assertEqual((res.status_code, res.data["code"]), (409, "rfq_not_awardable"), status)
        self.assertEqual(Order.objects.count(), 0)

    def test_withdrawn_or_foreign_quotes_cannot_be_awarded(self):
        res = self.award(self.qc)
        self.assertEqual((res.status_code, res.data["code"]), (409, "quote_not_available"))
        other = make_rfq(self.buyer, self.category)
        foreign = make_quote(other, self.sup_a)
        res = self.award(foreign)
        self.assertEqual((res.status_code, res.data["code"]), (404, "quote_not_found"))

    def test_expired_quote_is_409(self):
        Quote.objects.filter(pk=self.qa.pk).update(valid_until=timezone.now() - timedelta(minutes=1))
        res = self.award(self.qa)
        self.assertEqual((res.status_code, res.data["code"]), (409, "quote_expired"))
        self.assertEqual(RFQ.objects.get(pk=self.rfq.pk).status, "quoting")

    def test_key_and_body_are_required(self):
        res = self.client.post(self.url, {"quote_id": str(self.qa.id)}, format="json")
        self.assertEqual((res.status_code, res.data["code"]), (400, "idempotency_key_required"))
        res = self.client.post(self.url, {}, format="json", HTTP_IDEMPOTENCY_KEY="k")
        self.assertEqual(res.status_code, 400)

    def test_submit_after_award_is_409_and_never_leaves_a_submitted_quote(self):
        with mock.patch(HOOK, side_effect=fake_order_hook):
            self.award(self.qa)
        late = make_supplier(self.category, "late")
        res = client_for(late.user).post(
            BASE + f"seller/matches/{self.rfq.pk}/quote/", quote_payload(), format="json", HTTP_IDEMPOTENCY_KEY="late"
        )
        self.assertEqual((res.status_code, res.data["code"]), (409, "rfq_not_accepting_quotes"))
        self.assertFalse(Quote.objects.filter(rfq=self.rfq, status="submitted").exists())

    def test_supplier_sees_the_order_id_once_accepted(self):
        with mock.patch(HOOK, side_effect=fake_order_hook):
            self.award(self.qa)
        mine = client_for(self.sup_a.user).get(BASE + "seller/quotes/")
        self.assertEqual(mine.data["results"][0]["order_id"], str(Order.objects.get().id))
        theirs = client_for(self.sup_b.user).get(BASE + "seller/quotes/")
        self.assertIsNone(theirs.data["results"][0]["order_id"])

    def test_golden_path_through_the_api(self):
        buyer = make_user("golden")
        res = client_for(buyer).post(
            BASE + "requests/", create_payload(self.category, quantity=4), format="json", HTTP_IDEMPOTENCY_KEY="g"
        )
        rfq_id = res.data["id"]
        ids = []
        for seller, price in ((self.sup_a, "10.00"), (self.sup_b, "9.00")):
            q = client_for(seller.user).post(
                BASE + f"seller/matches/{rfq_id}/quote/", quote_payload(unit_price=price), format="json", HTTP_IDEMPOTENCY_KEY="s"
            )
            self.assertEqual(q.status_code, 201, q.data)
            ids.append(q.data["id"])
        detail = client_for(buyer).get(BASE + f"requests/{rfq_id}/")
        self.assertEqual([q["id"] for q in detail.data["quotes"]], [ids[1], ids[0]])  # cheapest first
        with mock.patch(HOOK, side_effect=fake_order_hook):
            done = client_for(buyer).post(
                BASE + f"requests/{rfq_id}/award/", {"quote_id": ids[1]}, format="json", HTTP_IDEMPOTENCY_KEY="a"
            )
        self.assertEqual(done.status_code, 200, done.data)
        order = Order.objects.get(pk=done.data["order_id"])
        self.assertEqual((order.user, order.total_amount), (buyer, Decimal("41.00")))


class AwardConstraintTests(AwardBase):
    def test_database_refuses_a_second_accepted_quote(self):
        Quote.objects.filter(pk=self.qa.pk).update(status="accepted")
        with self.assertRaises(IntegrityError), transaction.atomic():
            Quote.objects.filter(pk=self.qb.pk).update(status="accepted")

    def test_database_refuses_one_order_on_two_requests(self):
        order = fake_order_hook(self.rfq, self.qa)
        RFQ.objects.filter(pk=self.rfq.pk).update(order=order)
        other = make_rfq(self.buyer, self.category)
        with self.assertRaises(IntegrityError), transaction.atomic():
            RFQ.objects.filter(pk=other.pk).update(order=order)

    def test_service_award_rejects_a_foreign_buyer(self):
        with self.assertRaises(Exception) as ctx:
            services.award(
                rfq_id=self.rfq.pk, buyer=make_user("thief"), quote_id=self.qa.id, idempotency_key="k"
            )
        self.assertEqual(ctx.exception.status_code, 404)
