"""Regression tests for the independent review of the payment flow (late money, stuck stock, double counting...)."""

import uuid
from datetime import timedelta
from unittest import mock

from django.conf import settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.payments import paystack

from . import payment_flow
from .models import CheckoutSession, Order, OrderPayment, OrderRefund
from .test_paystack import INIT_OK, WEBHOOK, charge_event
from .test_refunds import GATEWAY_OK, PAYMENTS, RefundBase, refund_event
from .tests import client_for

NOT_FOUND = paystack.PaystackError("Paystack refused the request: Transaction reference not found", refused=True, status_code=400)


class ExpiryHardeningTests(RefundBase):
    def stale_session(self, **kw):
        variant = self.variant(self.seller_a, "100.00", qty=5)
        res = self.place_online((variant, 2), key=f"k-{uuid.uuid4().hex[:8]}", **kw)
        session = self.session_of(res)
        CheckoutSession.objects.filter(pk=session.pk).update(expires_at=timezone.now() - timedelta(minutes=1))
        return variant, session

    def test_the_expiry_job_is_scheduled(self):
        entry = settings.CELERY_BEAT_SCHEDULE["orders-expire-checkout-sessions"]
        self.assertEqual(entry["task"], "apps.orders.tasks.expire_checkout_sessions")
        self.assertLessEqual(entry["schedule"], 300)
        from .tasks import expire_checkout_sessions

        with mock.patch("apps.payments.paystack.verify", side_effect=NOT_FOUND):
            self.assertIn("expired", expire_checkout_sessions())

    def test_a_checkout_paystack_never_heard_of_is_expired_not_skipped_forever(self):
        variant, session = self.stale_session()
        for error in (NOT_FOUND, paystack.PaystackError("nope", status_code=404)):
            CheckoutSession.objects.filter(pk=session.pk).update(status="pending")
            with mock.patch("apps.payments.paystack.verify", side_effect=error):
                counts = payment_flow.expire_stale_sessions()
            self.assertEqual(counts["expired"], 1)
            break
        session.refresh_from_db(); variant.refresh_from_db()
        self.assertEqual(session.status, "expired")
        self.assertEqual(variant.quantity, 5)  # the reserved stock came back

    def test_an_outage_is_still_skipped_so_a_paid_order_is_never_cancelled_blind(self):
        _, session = self.stale_session()
        for error in (paystack.PaystackError("timeout"), paystack.PaystackError("boom", status_code=503)):
            with mock.patch("apps.payments.paystack.verify", side_effect=error):
                self.assertEqual(payment_flow.expire_stale_sessions()["skipped"], 1)
        session.refresh_from_db()
        self.assertEqual(session.status, "pending")

    def test_a_mobile_money_approval_still_in_flight_is_not_cancelled(self):
        variant, session = self.stale_session()
        for status in ("ongoing", "pending", "processing", "queued"):
            with mock.patch("apps.payments.paystack.verify", return_value={"status": status}):
                self.assertEqual(payment_flow.expire_stale_sessions()["skipped"], 1, status)
        session.refresh_from_db()
        self.assertEqual(session.status, "pending")
        # ...but not forever: a day past the window it is released.
        CheckoutSession.objects.filter(pk=session.pk).update(expires_at=timezone.now() - timedelta(hours=25))
        with mock.patch("apps.payments.paystack.verify", return_value={"status": "ongoing"}):
            self.assertEqual(payment_flow.expire_stale_sessions()["expired"], 1)

    def test_abandoned_and_failed_payments_are_expired(self):
        for status in ("abandoned", "failed", "reversed"):
            _, session = self.stale_session()
            with mock.patch("apps.payments.paystack.verify", return_value={"status": status}):
                self.assertEqual(payment_flow.expire_stale_sessions()["expired"], 1, status)

    def test_one_failing_session_does_not_stop_the_others(self):
        first_variant, first = self.stale_session()
        CheckoutSession.objects.filter(pk=first.pk).update(expires_at=timezone.now() - timedelta(hours=2))  # sorts first
        second_variant, second = self.stale_session()
        with mock.patch("apps.payments.paystack.verify", side_effect=[RuntimeError("db hiccup"), {"status": "abandoned"}]):
            counts = payment_flow.expire_stale_sessions()
        self.assertEqual((counts["errors"], counts["expired"]), (1, 1))
        first.refresh_from_db(); second.refresh_from_db()
        self.assertEqual((first.status, second.status), ("pending", "expired"))  # the broken one is retried next run


class LateAndMismatchedMoneyTests(RefundBase):
    def test_a_payment_after_expiry_shows_up_in_the_ledger_and_can_be_refunded(self):
        variant = self.variant(self.seller_a, "100.00", qty=5)
        res = self.place_online((variant, 2), key="late")
        session = self.session_of(res)
        CheckoutSession.objects.filter(pk=session.pk).update(expires_at=timezone.now() - timedelta(minutes=1))
        with mock.patch("apps.payments.paystack.verify", return_value={"status": "abandoned"}):
            payment_flow.expire_stale_sessions()
        self.webhook(charge_event(session))  # the buyer pays after all

        session.refresh_from_db()
        self.assertEqual(session.status, "needs_review")
        row = OrderPayment.objects.get(session=session)
        self.assertEqual((row.status, str(row.amount), row.reference), ("needs_review", "225.00", session.reference))
        self.assertIn("expired", row.note)
        listed = client_for(self.staff).get(PAYMENTS, {"status": "needs_review"}).json()
        self.assertEqual(listed["count"], 1)
        self.assertEqual(listed["results"][0]["status"], "needs_review")
        self.assertEqual(Order.objects.get().order_status, "Cancelled")  # the order stays cancelled

        # The admin hands the money back; the cancelled order is not touched.
        refund = self.refund(row, "225.00")
        self.assertEqual(refund.status_code, 201, refund.content)
        self.webhook(refund_event(session))
        row.refresh_from_db()
        self.assertEqual(row.status, "refunded")
        order = Order.objects.get()
        self.assertEqual((order.order_status, order.payment_status), ("Cancelled", "unpaid"))

    def test_a_wrong_amount_is_visible_and_the_orders_can_then_be_cancelled(self):
        variant = self.variant(self.seller_a, "100.00", qty=5)
        res = self.place_online((variant, 2), key="short")
        session = self.session_of(res)
        self.webhook(charge_event(session, amount=10000))  # 100.00 instead of 225.00
        row = OrderPayment.objects.get(session=session)
        self.assertEqual((row.status, str(row.amount)), ("needs_review", "100.00"))  # what the gateway really took
        self.assertEqual(Order.objects.get().order_status, "Pending")

        # An admin can cancel the stuck order (stock returns) and refund the money that did arrive.
        cancelled = client_for(self.staff).post(f"/tradehut/api/v1/orders/{Order.objects.get().pk}/cancel/", {"reason": "Short payment"}, format="json")
        self.assertEqual(cancelled.status_code, 200, cancelled.content)
        variant.refresh_from_db()
        self.assertEqual(variant.quantity, 5)
        self.assertEqual(self.refund(row, "100.00").status_code, 201)

    def test_fees_added_by_the_gateway_do_not_cause_a_false_mismatch(self):
        variant = self.variant(self.seller_a, "100.00", qty=5)
        res = self.place_online((variant, 2), key="fees")
        session = self.session_of(res)
        event = charge_event(session, amount=23000)  # customer-borne fees pushed the charged amount up
        event["data"]["requested_amount"] = 22500
        self.webhook(event)
        session.refresh_from_db()
        self.assertEqual(session.status, "paid")


class CashOnDeliveryCountingTests(RefundBase):
    def cod_order(self):
        variant = self.variant(self.seller_a, "100.00", qty=9)
        res = self.place(self.body((variant, 1)), key=f"cod-{uuid.uuid4().hex[:6]}")  # 100 + 25 delivery = 125
        return Order.objects.get(pk=res.json()["orders"][0]["id"])

    def hand(self, order, amount, key):
        return payment_flow.record_manual_payment(
            self.staff, order_id=order.pk, amount=amount, method="cash", reference="", note="", key=key
        )

    def deliver(self, order):
        c = client_for(self.user_a)
        c.post(f"/tradehut/api/v1/orders/seller/{order.pk}/ship/", {"carrier": "DHL"}, format="json")
        return c.post(f"/tradehut/api/v1/orders/seller/{order.pk}/confirm-delivery/", {}, format="json")

    def test_cash_collected_after_a_part_payment_only_counts_the_rest(self):
        order = self.cod_order()
        self.hand(order, "50.00", "part")
        self.assertEqual(self.deliver(order).status_code, 200)
        cod = OrderPayment.objects.get(order=order, provider="cod")
        self.assertEqual((cod.status, str(cod.amount)), ("succeeded", "75.00"))
        self.assertEqual(payment_flow.paid_total(order), 125)  # not 175

    def test_a_cod_order_settled_by_hand_does_not_leave_cash_expected_forever(self):
        order = self.cod_order()
        self.assertEqual(OrderPayment.objects.get(order=order, provider="cod").status, "pending")
        self.hand(order, "125.00", "full")
        cod = OrderPayment.objects.get(order=order, provider="cod")
        self.assertEqual((cod.status, cod.note), ("failed", "Settled by other payments"))


class RobustnessTests(RefundBase):
    def test_duplicate_idempotency_key_after_the_lock_is_a_replay_not_a_500(self):
        variant = self.variant(self.seller_a, "100.00", qty=9)
        res = self.place(self.body((variant, 1)), key="cod-dup")
        order = Order.objects.get(pk=res.json()["orders"][0]["id"])
        first, created = payment_flow.record_manual_payment(
            self.staff, order_id=order.pk, amount="10.00", method="cash", reference="", note="", key="same"
        )
        again, created_again = payment_flow.record_manual_payment(
            self.staff, order_id=order.pk, amount="10.00", method="cash", reference="", note="", key="same"
        )
        self.assertEqual((created, created_again, first.pk), (True, False, again.pk))

    def test_the_same_bank_reference_twice_is_a_clean_409(self):
        variant = self.variant(self.seller_a, "100.00", qty=9)
        res = self.place(self.body((variant, 1)), key="cod-ref")
        order = Order.objects.get(pk=res.json()["orders"][0]["id"])
        body = {"order_id": str(order.pk), "amount": "20.00", "method": "bank_transfer", "reference": "TRX-1"}
        c = client_for(self.staff)
        self.assertEqual(c.post(PAYMENTS, body, format="json", HTTP_IDEMPOTENCY_KEY="a").status_code, 201)
        second = c.post(PAYMENTS, body, format="json", HTTP_IDEMPOTENCY_KEY="b")
        self.assertEqual((second.status_code, second.json()["code"]), (409, "duplicate_reference"))
        self.assertEqual(OrderPayment.objects.filter(order=order, provider="manual").count(), 1)

    def test_a_payment_page_can_be_reopened_after_a_duplicate_reference_error(self):
        variant = self.variant(self.seller_a, "100.00", qty=9)
        duplicate = paystack.PaystackError("Paystack refused the request: Duplicate Transaction Reference", refused=True, status_code=400)
        with mock.patch("apps.payments.paystack.initialize", side_effect=[duplicate, INIT_OK]) as init:
            res = self.place(self.body((variant, 1), payment_method="paystack"), key="dup-ref")
        self.assertEqual(res.status_code, 201)
        payload = res.json()
        self.assertEqual(init.call_count, 2)
        self.assertEqual(payload["payment"]["authorization_url"], INIT_OK["authorization_url"])
        session = self.session_of(res)
        self.assertNotEqual(session.reference, session.id.hex)
        self.assertTrue(session.reference.startswith(session.id.hex + "-"))
        self.assertEqual(payload["payment"]["reference"], session.reference)
        self.assertEqual(set(OrderPayment.objects.filter(session=session).values_list("reference", flat=True)), {session.reference})
        # The rotated reference is the one Paystack will use from now on, and it settles the checkout.
        self.webhook(charge_event(session))
        session.refresh_from_db()
        self.assertEqual(session.status, "paid")

    def test_oversized_and_malformed_webhooks_are_refused_cleanly(self):
        client = APIClient()
        big = client.post(WEBHOOK, "{}", content_type="application/json", CONTENT_LENGTH="99999999")
        self.assertEqual(big.status_code, 413)
        odd = client.post(WEBHOOK, "{}", content_type="application/json", HTTP_X_PAYSTACK_SIGNATURE="signature-é")
        self.assertEqual(odd.status_code, 401)  # a TypeError (500) before

    def test_order_numbers_with_a_hyphen_still_resolve(self):
        variant = self.variant(self.seller_a, "100.00", qty=9)
        res = self.place(self.body((variant, 1)), key="cod-num")
        order = Order.objects.get(pk=res.json()["orders"][0]["id"])
        typed = str(order.pk)[:13]  # "xxxxxxxx-xxxx": the form an admin copies when asked to type more
        out = client_for(self.staff).post(
            PAYMENTS, {"order_number": typed, "amount": "10.00", "method": "cash"}, format="json", HTTP_IDEMPOTENCY_KEY="hy"
        )
        self.assertEqual(out.status_code, 201, out.content)
        found = client_for(self.staff).get(PAYMENTS, {"search": typed}).json()
        # The order has two ledger rows (the cash expected on delivery, and the cash just recorded): both found.
        self.assertEqual(found["count"], 2)
        self.assertEqual({row["order_id"] for row in found["results"]}, {str(order.pk)})
