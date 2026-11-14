"""Sweeper transitions (plan 11 test 10, every row of the section 4 table)."""

from datetime import timedelta
from unittest import mock

from django.test import TestCase
from django.utils import timezone

from apps.notifications.models import Notification
from apps.orders.models import Order
from apps.rfq import services, tasks
from apps.rfq.constants import AWARD_GRACE
from apps.rfq.models import RFQ, Quote

from .helpers import fake_order_hook, make_category, make_quote, make_rfq, make_supplier, make_user

HOOK = "apps.rfq.services.create_award_order"


class SweeperTests(TestCase):
    def setUp(self):
        self.buyer = make_user("buyer")
        self.category = make_category()
        self.now = timezone.now()

    def rfq(self, **kw):
        return make_rfq(self.buyer, self.category, **kw)

    def sweep(self, rfq):
        with self.captureOnCommitCallbacks(execute=True):
            return services.sweep_rfq(rfq.pk)

    def reload(self, obj):
        obj.refresh_from_db()
        return obj

    def kinds(self):
        return sorted((n.kind, n.user_id) for n in Notification.objects.all())

    # open -> expired

    def test_open_past_the_deadline_expires_and_tells_the_buyer(self):
        rfq = self.rfq(closes_at=self.now - timedelta(minutes=1))
        self.assertEqual(self.sweep(rfq), "expired")
        self.assertEqual(self.reload(rfq).status, "expired")
        self.assertEqual(self.kinds(), [("rfq.expired", self.buyer.id)])

    def test_open_before_the_deadline_is_untouched(self):
        rfq = self.rfq()
        self.assertEqual(self.sweep(rfq), "noop")
        self.assertEqual(self.reload(rfq).status, "open")

    # quoting -> expired

    def test_quoting_inside_the_award_grace_is_untouched(self):
        rfq = self.rfq(closes_at=self.now - timedelta(days=3))
        make_quote(rfq, make_supplier(self.category))
        self.assertEqual(self.sweep(rfq), "noop")
        self.assertEqual(self.reload(rfq).status, "quoting")

    def test_quoting_past_the_grace_expires_releases_quotes_and_notifies_everyone(self):
        rfq = self.rfq(closes_at=self.now - AWARD_GRACE - timedelta(minutes=1))
        a, b = make_supplier(self.category, "a"), make_supplier(self.category, "b")
        qa, qb = make_quote(rfq, a), make_quote(rfq, b, status="withdrawn")
        self.assertEqual(self.sweep(rfq), "expired")
        self.assertEqual(self.reload(rfq).status, "expired")
        self.assertEqual((self.reload(qa).status, self.reload(qb).status), ("not_selected", "withdrawn"))
        self.assertEqual(self.kinds(), sorted([("rfq.expired", self.buyer.id), ("rfq.expired", a.user_id)]))

    # awarded -> closed / expired

    def awarded(self, **order_fields):
        rfq = self.rfq(closes_at=self.now - timedelta(days=1))
        quote = make_quote(rfq, make_supplier(self.category), status="accepted")
        order = fake_order_hook(rfq, quote)
        Order.objects.filter(pk=order.pk).update(**order_fields)
        RFQ.objects.filter(pk=rfq.pk).update(
            status="awarded", awarded_quote=quote, order=order, awarded_at=self.now
        )
        return self.reload(rfq), quote

    def test_awarded_with_a_paid_order_closes(self):
        rfq, _ = self.awarded(payment_status="paid", order_status="Processing")
        self.assertEqual(self.sweep(rfq), "closed")
        rfq = self.reload(rfq)
        self.assertEqual(rfq.status, "closed")
        self.assertIsNotNone(rfq.closed_at)

    def test_awarded_with_a_lapsed_order_expires_and_tells_the_supplier(self):
        rfq, quote = self.awarded(order_status="Cancelled")
        self.assertEqual(self.sweep(rfq), "expired")
        self.assertEqual(self.reload(rfq).status, "expired")
        self.assertEqual(self.reload(quote).status, "accepted")
        self.assertEqual(self.kinds(), [("rfq.order_lapsed", quote.supplier.user_id)])

    def test_awarded_with_an_unpaid_pending_order_waits(self):
        rfq, _ = self.awarded()
        self.assertEqual(self.sweep(rfq), "noop")
        self.assertEqual(self.reload(rfq).status, "awarded")

    def test_awarded_without_an_order_retries_the_hook(self):
        rfq = self.rfq()
        quote = make_quote(rfq, make_supplier(self.category), status="accepted")
        RFQ.objects.filter(pk=rfq.pk).update(status="awarded", awarded_quote=quote, awarded_at=self.now)
        with mock.patch(HOOK, side_effect=NotImplementedError):
            self.assertEqual(self.sweep(rfq), "noop")  # hook still missing
        self.assertIsNone(self.reload(rfq).order_id)
        with mock.patch(HOOK, side_effect=fake_order_hook):
            self.assertEqual(self.sweep(rfq), "order_created")
        self.assertEqual(self.reload(rfq).order_id, Order.objects.get().id)
        self.assertEqual(self.sweep(rfq), "noop")  # the next run just watches the order

    # idempotence and batching

    def test_terminal_and_draft_states_are_noops(self):
        for status in ("draft", "closed", "cancelled", "expired"):
            rfq = self.rfq(status=status, closes_at=self.now - timedelta(days=30))
            self.assertEqual(self.sweep(rfq), "noop", status)
            self.assertEqual(self.reload(rfq).status, status)
        self.assertEqual(self.kinds(), [])

    def test_running_twice_notifies_once(self):
        rfq = self.rfq(closes_at=self.now - timedelta(minutes=1))
        self.assertEqual((self.sweep(rfq), self.sweep(rfq)), ("expired", "noop"))
        self.assertEqual(len(self.kinds()), 1)

    def test_missing_rfq(self):
        self.assertEqual(services.sweep_rfq("00000000-0000-0000-0000-000000000000"), "missing")

    def test_sweep_picks_only_due_rows_and_survives_one_failure(self):
        due1 = self.rfq(closes_at=self.now - timedelta(minutes=1))
        due2 = self.rfq(closes_at=self.now - timedelta(minutes=2))
        fresh = self.rfq()
        real = services.sweep_rfq

        def flaky(rfq_id):
            if rfq_id == due2.pk:
                raise RuntimeError("boom")
            return real(rfq_id)

        with mock.patch.object(services, "sweep_rfq", side_effect=flaky):
            outcome = services.sweep()
        self.assertEqual(outcome, {"expired": 1, "error": 1})
        self.assertEqual(self.reload(due1).status, "expired")
        self.assertEqual((self.reload(due2).status, self.reload(fresh).status), ("open", "open"))

    def test_beat_task_wrapper(self):
        rfq = self.rfq(closes_at=self.now - timedelta(minutes=1))
        self.assertEqual(tasks.sweep_rfqs(), {"expired": 1})
        self.assertEqual(self.reload(rfq).status, "expired")
        self.assertEqual(tasks.sweep_rfqs(), {})
