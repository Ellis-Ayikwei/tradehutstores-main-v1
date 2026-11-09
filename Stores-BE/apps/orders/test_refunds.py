import uuid
from datetime import timedelta
from unittest import mock

from django.utils import timezone

from apps.payments import paystack
from apps.products.models import ProductVariant

from . import payment_flow
from .models import CheckoutSession, Order, OrderPayment, OrderRefund
from .test_paystack import OnlineBase, charge_event, paystack_on
from .tests import client_for, make_user

PAYMENTS = "/tradehut/api/v1/payments/"
SELLER_ORDERS = "/tradehut/api/v1/orders/seller/"
GATEWAY_OK = {"id": 555, "status": "pending", "amount": 22500, "currency": "GHS"}


def refund_event(session, *, refund_id=555, status="processed", name="refund.processed", with_id=True, deducted=None):
    data = {"status": status, "currency": "GHS", "transaction": {"reference": session.reference}}
    if with_id:
        data["id"] = refund_id
    if deducted is not None:
        data["deducted_amount"] = deducted
    return {"event": name, "data": data}


@paystack_on
class RefundBase(OnlineBase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.staff = make_user("staff@test.dev")
        cls.staff.is_staff = True
        cls.staff.save(update_fields=["is_staff"])

    def paid_order(self, price="100.00", qty=2, stock=9):
        """A gateway-paid order: 2 x 100.00 + 25.00 delivery = 225.00."""
        variant = self.variant(self.seller_a, price, qty=stock)
        res = self.place_online((variant, qty), key=f"k-{uuid.uuid4().hex[:8]}")
        session = self.session_of(res)
        payment_flow.mark_session_paid(session.pk, charge_event(session)["data"])
        order = Order.objects.get(pk=res.json()["orders"][0]["id"])
        return variant, order, OrderPayment.objects.get(order=order), session

    def refund(self, payment, amount, *, mode="gateway", key="r-1", reason="Customer changed their mind", gateway=GATEWAY_OK, user=None):
        side = {"side_effect": gateway} if isinstance(gateway, Exception) else {"return_value": gateway}
        with mock.patch("apps.payments.paystack.create_refund", **side) as mocked:
            res = client_for(user or self.staff).post(
                f"{PAYMENTS}{payment.pk}/refund/",
                {"amount": str(amount), "reason": reason, "mode": mode},
                format="json",
                HTTP_IDEMPOTENCY_KEY=key,
            )
        self.gateway_mock = mocked
        return res


class RefundRequestTests(RefundBase):
    def test_only_staff_can_refund(self):
        _, _, payment, _ = self.paid_order()
        for user in (None, self.buyer, self.user_a):
            res = self.refund(payment, "10.00", user=user) if user else client_for().post(
                f"{PAYMENTS}{payment.pk}/refund/", {"amount": "10", "reason": "x y z"}, format="json", HTTP_IDEMPOTENCY_KEY="k"
            )
            self.assertIn(res.status_code, (401, 403))
        self.assertEqual(OrderRefund.objects.count(), 0)

    def test_full_gateway_refund_end_to_end(self):
        variant, order, payment, session = self.paid_order()
        res = self.refund(payment, "225.00")
        self.assertEqual(res.status_code, 201, res.content)
        body = res.json()
        self.assertEqual((body["status"], body["provider"], body["amount"], body["reference"]), ("pending", "paystack", "225.00", "555"))
        kwargs = self.gateway_mock.call_args.kwargs
        self.assertEqual((kwargs["reference"], kwargs["amount_minor"], kwargs["currency"]), (session.reference, 22500, "GHS"))
        # Queued only: no money has moved, so nothing about the order changes yet.
        order.refresh_from_db(); payment.refresh_from_db()
        self.assertEqual((order.payment_status, order.order_status, payment.status), ("paid", "Processing", "succeeded"))

        # Paystack confirms: the refund succeeds, the payment and order follow, and unshipped stock goes back.
        self.assertEqual(self.webhook(refund_event(session)).status_code, 200)
        refund = OrderRefund.objects.get()
        order.refresh_from_db(); payment.refresh_from_db(); variant.refresh_from_db()
        self.assertEqual((refund.status, payment.status), ("succeeded", "refunded"))
        self.assertEqual((order.payment_status, order.order_status), ("refunded", "Refunded"))
        self.assertEqual(variant.quantity, 9)  # 9 - 2 reserved at checkout + 2 returned

    def test_partial_refunds_add_up_and_only_the_last_closes_the_order(self):
        variant, order, payment, session = self.paid_order()
        self.assertEqual(self.refund(payment, "100.00", key="a").status_code, 201)
        self.webhook(refund_event(session, refund_id=555))
        order.refresh_from_db(); payment.refresh_from_db()
        self.assertEqual((order.payment_status, order.order_status, payment.status), ("partially_refunded", "Processing", "succeeded"))
        variant.refresh_from_db()
        self.assertEqual(variant.quantity, 7)  # not a full refund: the goods are still going out

        self.assertEqual(self.refund(payment, "125.00", key="b", gateway={"id": 556, "status": "pending"}).status_code, 201)
        self.webhook(refund_event(session, refund_id=556))
        order.refresh_from_db(); payment.refresh_from_db()
        self.assertEqual((order.payment_status, order.order_status, payment.status), ("refunded", "Refunded", "refunded"))

    def test_cannot_refund_more_than_was_paid_even_with_refunds_still_pending(self):
        _, _, payment, _ = self.paid_order()
        too_much = self.refund(payment, "225.01", key="x")
        self.assertEqual((too_much.status_code, too_much.json()["code"], too_much.json()["refundable"]), (409, "over_refund", "225.00"))
        self.assertEqual(self.refund(payment, "200.00", key="y").status_code, 201)  # pending, but it reserves the amount
        res = self.refund(payment, "50.00", key="z")
        self.assertEqual((res.status_code, res.json()["code"], res.json()["refundable"]), (409, "over_refund", "25.00"))
        self.gateway_mock.assert_not_called()  # the gateway is never even asked about the excess

    def test_the_same_key_never_refunds_twice(self):
        _, _, payment, _ = self.paid_order()
        first = self.refund(payment, "50.00", key="same")
        second = self.refund(payment, "50.00", key="same")
        self.assertEqual((first.status_code, second.status_code), (201, 200))
        self.assertEqual(first.json()["id"], second.json()["id"])
        self.gateway_mock.assert_not_called()  # the replay did not call Paystack again
        self.assertEqual(OrderRefund.objects.count(), 1)

    def test_a_gateway_that_says_no_frees_the_amount(self):
        _, order, payment, _ = self.paid_order()
        res = self.refund(payment, "225.00", gateway=paystack.PaystackError("Insufficient balance", refused=True))
        self.assertEqual((res.status_code, res.json()["code"]), (502, "gateway_refused"))
        refund = OrderRefund.objects.get()
        self.assertEqual(refund.status, "failed")
        self.assertIn("Insufficient balance", refund.failure_note)
        # Released: the same money can be refunded again.
        self.assertEqual(self.refund(payment, "225.00", key="retry").status_code, 201)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, "paid")

    def test_a_silent_gateway_keeps_the_amount_reserved_until_an_admin_decides(self):
        _, _, payment, _ = self.paid_order()
        res = self.refund(payment, "225.00", gateway=paystack.PaystackError("timeout"))
        self.assertEqual((res.status_code, res.json()["code"]), (502, "gateway_unconfirmed"))
        refund = OrderRefund.objects.get()
        self.assertEqual(refund.status, "pending")  # may exist at the gateway: do not free the money
        self.assertEqual(self.refund(payment, "10.00", key="more").json()["code"], "over_refund")

        res = client_for(self.staff).post(f"{PAYMENTS}refunds/{refund.pk}/mark-failed/", {"note": "Not in the dashboard"}, format="json")
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()["status"], "failed")
        self.assertIn("Not in the dashboard", res.json()["failure_note"])
        again = client_for(self.staff).post(f"{PAYMENTS}refunds/{refund.pk}/mark-failed/", {}, format="json")
        self.assertEqual((again.status_code, again.json()["code"]), (409, "not_pending"))
        self.assertEqual(client_for(self.buyer).post(f"{PAYMENTS}refunds/{refund.pk}/mark-failed/", {}, format="json").status_code, 403)

    def test_a_refund_the_gateway_later_reports_failed_is_released(self):
        _, order, payment, session = self.paid_order()
        self.refund(payment, "225.00")
        self.assertEqual(self.webhook(refund_event(session, status="failed", name="refund.failed")).status_code, 200)
        refund = OrderRefund.objects.get()
        order.refresh_from_db()
        self.assertEqual(refund.status, "failed")
        self.assertEqual(order.payment_status, "paid")  # nothing was returned
        self.assertEqual(self.refund(payment, "225.00", key="again").status_code, 201)

    def test_refund_webhooks_are_idempotent_and_ignore_what_they_do_not_know(self):
        variant, order, payment, session = self.paid_order()
        self.refund(payment, "225.00")
        self.webhook(refund_event(session))
        self.webhook(refund_event(session))  # Paystack retries
        variant.refresh_from_db()
        self.assertEqual(variant.quantity, 9)  # stock returned exactly once
        self.assertEqual(OrderRefund.objects.filter(status="succeeded").count(), 1)
        self.assertEqual(self.webhook(refund_event(session, refund_id=999)).status_code, 200)  # unknown id
        self.assertEqual(self.webhook(refund_event(session, status="pending", name="refund.pending")).status_code, 200)
        self.assertEqual(OrderRefund.objects.count(), 1)

    def test_a_forged_refund_event_changes_nothing(self):
        _, order, payment, session = self.paid_order()
        self.refund(payment, "225.00")
        res = self.webhook(refund_event(session), signature="deadbeef")
        self.assertEqual(res.status_code, 401)
        self.assertEqual(OrderRefund.objects.get().status, "pending")

    def test_the_webhook_can_match_by_the_original_payment_when_it_has_no_refund_id(self):
        _, order, payment, session = self.paid_order()
        self.refund(payment, "225.00")
        self.webhook(refund_event(session, with_id=False))
        self.assertEqual(OrderRefund.objects.get().status, "succeeded")

    def test_an_ambiguous_event_is_not_guessed(self):
        _, _, payment, session = self.paid_order()
        self.refund(payment, "100.00", key="a")
        self.refund(payment, "50.00", key="b", gateway={"id": 556, "status": "pending"})
        self.webhook(refund_event(session, with_id=False))  # two pending refunds, no id, no amount: cannot tell
        self.assertEqual(OrderRefund.objects.filter(status="succeeded").count(), 0)
        self.webhook(refund_event(session, with_id=False, deducted=5000))  # the amount singles one out
        self.assertEqual(list(OrderRefund.objects.filter(status="succeeded").values_list("amount", flat=True)), [50])

    def test_manual_refund_for_money_paid_back_outside_the_gateway(self):
        variant, order, payment, _ = self.paid_order()
        res = self.refund(payment, "225.00", mode="manual", reason="Refunded to MoMo directly")
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual((res.json()["status"], res.json()["provider"]), ("succeeded", "manual"))
        self.gateway_mock.assert_not_called()
        order.refresh_from_db(); payment.refresh_from_db()
        self.assertEqual((payment.status, order.payment_status, order.order_status), ("refunded", "refunded", "Refunded"))

    def test_gateway_refund_of_a_cash_payment_is_refused(self):
        order = self.cod_paid_by_hand()
        payment = OrderPayment.objects.get(order=order, provider="manual")
        res = self.refund(payment, "10.00", mode="gateway")
        self.assertEqual((res.status_code, res.json()["code"]), (409, "gateway_refund_unavailable"))
        self.assertEqual(self.refund(payment, "10.00", mode="manual", key="m").status_code, 201)

    def test_payments_older_than_180_days_cannot_go_through_the_gateway(self):
        _, _, payment, _ = self.paid_order()
        OrderPayment.objects.filter(pk=payment.pk).update(paid_at=timezone.now() - timedelta(days=181))
        res = self.refund(payment, "10.00")
        self.assertEqual((res.status_code, res.json()["code"]), (409, "refund_window_closed"))
        self.assertEqual(self.refund(payment, "10.00", mode="manual", key="m").status_code, 201)

    def test_input_is_validated(self):
        _, _, payment, _ = self.paid_order()
        self.assertEqual(self.refund(payment, "10.00", reason="x").json()["code"], "reason_required")
        self.assertEqual(self.refund(payment, "0", key="b").json()["code"], "invalid_amount")
        self.assertEqual(self.refund(payment, "10.00", mode="teleport", key="c").status_code, 400)
        no_key = client_for(self.staff).post(f"{PAYMENTS}{payment.pk}/refund/", {"amount": "5", "reason": "because"}, format="json")
        self.assertEqual((no_key.status_code, no_key.json()["code"]), (400, "idempotency_key_required"))
        missing = client_for(self.staff).post(
            f"{PAYMENTS}{uuid.uuid4()}/refund/", {"amount": "5", "reason": "because"}, format="json", HTTP_IDEMPOTENCY_KEY="m"
        )
        self.assertEqual((missing.status_code, missing.json()["code"]), (404, "payment_not_found"))
        self.assertEqual(OrderRefund.objects.count(), 0)

    def test_an_unpaid_payment_cannot_be_refunded(self):
        order = self.place_pending_online_order()
        payment = OrderPayment.objects.get(order=order)  # still pending: no money received
        res = self.refund(payment, "10.00")
        self.assertEqual((res.status_code, res.json()["code"]), (409, "payment_not_refundable"))

    def test_goods_cannot_be_shipped_while_a_refund_is_in_progress(self):
        _, order, payment, _ = self.paid_order()
        self.refund(payment, "225.00")
        res = client_for(self.user_a).post(f"{SELLER_ORDERS}{order.pk}/ship/", {"carrier": "DHL"}, format="json")
        self.assertEqual((res.status_code, res.json()["code"]), (409, "refund_in_progress"))

    # helpers -------------------------------------------------------------------------------------------
    def cod_paid_by_hand(self):
        variant = self.variant(self.seller_a, "100.00", qty=9)
        res = self.place(self.body((variant, 1)), key=f"cod-{uuid.uuid4().hex[:6]}")
        order = Order.objects.get(pk=res.json()["orders"][0]["id"])
        payment_flow.record_manual_payment(
            self.staff, order_id=order.pk, amount=order.total_amount, method="cash", reference="", note="", key=f"m-{uuid.uuid4().hex[:6]}"
        )
        return order

    def place_pending_online_order(self):
        variant = self.variant(self.seller_a, "100.00", qty=9)
        res = self.place_online((variant, 1), key=f"p-{uuid.uuid4().hex[:6]}")
        return Order.objects.get(pk=res.json()["orders"][0]["id"])


class RefundListAndDetailTests(RefundBase):
    def test_refunds_list_and_filters(self):
        _, order, payment, _ = self.paid_order()
        self.refund(payment, "100.00", key="a")
        self.refund(payment, "50.00", key="b", mode="manual")
        client = client_for(self.staff)
        body = client.get(f"{PAYMENTS}refunds/").json()
        self.assertEqual(body["count"], 2)
        row = body["results"][0]
        for key in ("id", "payment_id", "order_number", "customer_email", "amount", "currency", "status", "provider", "note", "created_at"):
            self.assertIn(key, row)
        self.assertEqual(row["order_number"], f"#{str(order.pk)[:8].upper()}")
        self.assertEqual(client.get(f"{PAYMENTS}refunds/", {"status": "succeeded"}).json()["count"], 1)
        self.assertEqual(client.get(f"{PAYMENTS}refunds/", {"status": "pending"}).json()["count"], 1)
        self.assertEqual(client.get(f"{PAYMENTS}refunds/", {"search": "buyer@test"}).json()["count"], 2)
        self.assertEqual(client.get(f"{PAYMENTS}refunds/", {"ordering": "-amount"}).json()["results"][0]["amount"], "100.00")
        self.assertEqual(client.get(f"{PAYMENTS}refunds/", {"ordering": "nope"}).status_code, 400)
        for who in (None, self.buyer, self.user_a):
            self.assertIn(client_for(who).get(f"{PAYMENTS}refunds/").status_code, (401, 403))

    def test_payment_rows_show_refunded_and_refundable_amounts(self):
        _, _, payment, session = self.paid_order()
        self.refund(payment, "100.00")
        self.webhook(refund_event(session))
        self.refund(payment, "25.00", key="b", gateway={"id": 556, "status": "pending"})
        row = client_for(self.staff).get(PAYMENTS, {"status": "succeeded"}).json()["results"][0]
        self.assertEqual((row["amount"], row["refunded_amount"], row["refundable_amount"]), ("225.00", "100.00", "100.00"))

    def test_the_payment_detail_page_has_everything(self):
        variant, order, payment, session = self.paid_order()
        self.refund(payment, "100.00")
        self.webhook(refund_event(session))
        body = client_for(self.staff).get(f"{PAYMENTS}{payment.pk}/").json()
        self.assertEqual((body["provider"], body["method"], body["status"]), ("paystack", "card", "succeeded"))
        self.assertEqual(body["customer_email"], "buyer@test.dev")
        self.assertEqual(body["gateway"]["transaction_id"], "987654")
        self.assertEqual(body["gateway"]["channel"], "card")
        self.assertEqual(body["checkout"]["status"], "paid")
        self.assertEqual(body["checkout"]["reference"], session.reference)
        self.assertEqual(body["order"]["order_number"], f"#{str(order.pk)[:8].upper()}")
        self.assertEqual(body["order"]["items"][0]["quantity"], 2)
        self.assertEqual(body["order"]["shipping_address"]["city"], "Accra")
        self.assertEqual((body["refunded_amount"], body["refundable_amount"]), ("100.00", "125.00"))
        self.assertEqual(len(body["refunds"]), 1)
        self.assertEqual(body["refunds"][0]["status"], "succeeded")
        self.assertEqual(body["amount_paid_on_order"], "225.00")
        labels = [e["label"] for e in body["timeline"]]
        self.assertEqual(labels[0], "Payment started")
        self.assertIn("Payment received", labels)
        self.assertTrue(any(label.startswith("Refund of 100.00") for label in labels))
        # No card or customer data leaks into the page.
        self.assertNotIn("SECRET-CARD-DATA", str(body))
        for who in (None, self.buyer, self.user_a):
            self.assertIn(client_for(who).get(f"{PAYMENTS}{payment.pk}/").status_code, (401, 403))


class CancelWithRefundTests(RefundBase):
    def cancel_as_seller(self, order, gateway=GATEWAY_OK):
        side = {"side_effect": gateway} if isinstance(gateway, Exception) else {"return_value": gateway}
        with mock.patch("apps.payments.paystack.create_refund", **side) as mocked:
            res = client_for(self.user_a).post(f"{SELLER_ORDERS}{order.pk}/cancel/", {"reason": "Out of stock"}, format="json")
        self.gateway_mock = mocked
        return res

    def test_cancelling_a_paid_order_refunds_it_automatically(self):
        variant, order, payment, session = self.paid_order()
        res = self.cancel_as_seller(order)
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()["order_status"], "Cancelled")
        variant.refresh_from_db()
        self.assertEqual(variant.quantity, 9)  # stock returned
        kwargs = self.gateway_mock.call_args.kwargs
        self.assertEqual((kwargs["reference"], kwargs["amount_minor"]), (session.reference, 22500))
        refund = OrderRefund.objects.get()
        self.assertEqual((refund.status, refund.amount, refund.provider_refund_id), ("pending", 225, "555"))
        self.assertIn("Order cancelled: Out of stock", refund.reason)

        # When Paystack confirms, the payment is refunded and the order stays Cancelled (not "Refunded").
        self.webhook(refund_event(session))
        order.refresh_from_db(); payment.refresh_from_db(); variant.refresh_from_db()
        self.assertEqual((order.order_status, order.payment_status, payment.status), ("Cancelled", "refunded", "refunded"))
        self.assertEqual(variant.quantity, 9)  # and not returned a second time

    def test_a_cancel_stands_even_if_the_gateway_refuses_the_refund(self):
        _, order, payment, _ = self.paid_order()
        res = self.cancel_as_seller(order, gateway=paystack.PaystackError("Insufficient balance", refused=True))
        self.assertEqual(res.status_code, 200)
        order.refresh_from_db()
        self.assertEqual(order.order_status, "Cancelled")
        refund = OrderRefund.objects.get()
        self.assertEqual(refund.status, "failed")  # visible on the payment page; can be retried from there
        self.assertEqual(self.refund(payment, "225.00", key="retry").status_code, 201)

    def test_an_unpaid_cod_order_cancels_with_no_refund(self):
        variant = self.variant(self.seller_a, "100.00", qty=9)
        res = self.place(self.body((variant, 1)), key="cod-cancel")
        order = Order.objects.get(pk=res.json()["orders"][0]["id"])
        out = self.cancel_as_seller(order)
        self.assertEqual(out.status_code, 200, out.content)
        self.gateway_mock.assert_not_called()
        self.assertEqual(OrderRefund.objects.count(), 0)
        variant.refresh_from_db()
        self.assertEqual(variant.quantity, 9)

    def test_cash_paid_orders_must_be_refunded_by_hand_first(self):
        variant = self.variant(self.seller_a, "100.00", qty=9)
        res = self.place(self.body((variant, 1)), key="cod-cash")
        order = Order.objects.get(pk=res.json()["orders"][0]["id"])
        payment_flow.record_manual_payment(
            self.staff, order_id=order.pk, amount=order.total_amount, method="cash", reference="", note="", key="hand"
        )
        out = self.cancel_as_seller(order)
        self.assertEqual((out.status_code, out.json()["code"]), (409, "needs_manual_refund"))
        order.refresh_from_db()
        self.assertEqual(order.order_status, "Processing")  # untouched

    def test_admins_cancel_paid_orders_the_same_way(self):
        _, order, _, session = self.paid_order()
        with mock.patch("apps.payments.paystack.create_refund", return_value=GATEWAY_OK) as mocked:
            res = client_for(self.staff).post(f"/tradehut/api/v1/orders/{order.pk}/cancel/", {"reason": "Fraud check"}, format="json")
        self.assertEqual(res.status_code, 200, res.content)
        mocked.assert_called_once()
        self.assertEqual(OrderRefund.objects.get().requested_by_id, self.staff.pk)
        order.refresh_from_db()
        self.assertEqual(order.order_status, "Cancelled")

    def test_the_admin_page_offers_cancel_exactly_when_cancel_would_work(self):
        _, gateway_order, _, _ = self.paid_order()
        body = client_for(self.staff).get(f"/tradehut/api/v1/orders/{gateway_order.pk}/").json()
        self.assertTrue(body["actions"]["cancel"])
        self.assertTrue(body["actions"]["cancel_refunds_buyer"])  # the page tells the admin the buyer is refunded
        self.assertIsNone(body["actions"]["cancel_blocker"])

        cash_variant = self.variant(self.seller_a, "100.00", qty=9)
        cash = Order.objects.get(pk=self.place(self.body((cash_variant, 1)), key="cash-detail").json()["orders"][0]["id"])
        payment_flow.record_manual_payment(
            self.staff, order_id=cash.pk, amount=cash.total_amount, method="cash", reference="", note="", key="cash-hand"
        )
        blocked = client_for(self.staff).get(f"/tradehut/api/v1/orders/{cash.pk}/").json()
        self.assertFalse(blocked["actions"]["cancel"])
        self.assertEqual(blocked["actions"]["cancel_blocker"]["code"], "needs_manual_refund")
        self.assertIn("paid in cash", blocked["actions"]["cancel_blocker"]["message"])
        res = client_for(self.staff).post(f"/tradehut/api/v1/orders/{cash.pk}/cancel/", {"reason": "Mistake"}, format="json")
        self.assertEqual(res.status_code, 409)  # and the action agrees with the page

    def test_the_admin_order_page_lists_its_refunds_and_blocks_shipping_while_one_is_open(self):
        _, order, payment, _ = self.paid_order()
        self.assertTrue(client_for(self.staff).get(f"/tradehut/api/v1/orders/{order.pk}/").json()["actions"]["ship"])
        self.refund(payment, "100.00")
        body = client_for(self.staff).get(f"/tradehut/api/v1/orders/{order.pk}/").json()
        self.assertEqual([(r["status"], r["amount"]) for r in body["refunds"]], [("pending", "100.00")])
        self.assertFalse(body["actions"]["ship"])

    def test_cannot_cancel_while_the_buyer_is_still_paying(self):
        order = self.place_pending_online_order_for_seller()
        out = self.cancel_as_seller(order)
        self.assertEqual(out.status_code, 409)  # a Pending order is not cancellable by the seller at all
        res = client_for(self.staff).post(f"/tradehut/api/v1/orders/{order.pk}/cancel/", {"reason": "x y z"}, format="json")
        self.assertEqual((res.status_code, res.json()["code"]), (409, "awaiting_online_payment"))
        self.assertEqual(CheckoutSession.objects.get().status, "pending")

    def test_the_gateway_must_be_configured_to_refund(self):
        _, order, _, _ = self.paid_order()
        with self.settings(PAYSTACK_SECRET_KEY=""):
            out = self.cancel_as_seller(order)
        self.assertEqual((out.status_code, out.json()["code"]), (409, "gateway_refund_unavailable"))
        order.refresh_from_db()
        self.assertEqual(order.order_status, "Processing")

    def place_pending_online_order_for_seller(self):
        variant = self.variant(self.seller_a, "100.00", qty=9)
        res = self.place_online((variant, 1), key=f"pp-{uuid.uuid4().hex[:6]}")
        return Order.objects.get(pk=res.json()["orders"][0]["id"])
