from decimal import Decimal
from unittest import mock

from django.test import override_settings

from .models import CheckoutSession, Order, OrderPayment
from .test_checkout import CheckoutBase
from .test_paystack import INIT_OK, paystack_on
from .tests import client_for, make_user

PAYMENTS = "/tradehut/api/v1/payments/"
SELLER_ORDERS = "/tradehut/api/v1/orders/seller/"


class AdminPaymentsBase(CheckoutBase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.staff = make_user("staff@test.dev")
        cls.staff.is_staff = True
        cls.staff.save(update_fields=["is_staff"])

    def cod_order(self, price="100.00", key="cod-1"):
        """A real COD checkout: order total = price + 25.00 standard delivery."""
        v = self.variant(self.seller_a, price, qty=9)
        res = self.place(self.body((v, 1)), key=key)
        self.assertEqual(res.status_code, 201, res.content)
        return Order.objects.get(pk=res.json()["orders"][0]["id"])

    def record(self, order, amount, method="cash", key="rec-1", user=None, **extra):
        body = {"order_id": str(order.pk), "amount": str(amount), "method": method, **extra}
        return client_for(user or self.staff).post(PAYMENTS, body, format="json", HTTP_IDEMPOTENCY_KEY=key)


class PermissionTests(AdminPaymentsBase):
    def test_only_staff_can_read_or_add_payments(self):
        order = self.cod_order()
        payment = OrderPayment.objects.get()
        for user in (None, self.buyer, self.user_a):
            c = client_for(user)
            want = 401 if user is None else 403
            self.assertEqual(c.get(PAYMENTS).status_code, want)
            self.assertEqual(c.get(f"{PAYMENTS}{payment.pk}/").status_code, want)
            body = {"order_id": str(order.pk), "amount": "10.00", "method": "cash"}
            self.assertEqual(c.post(PAYMENTS, body, format="json", HTTP_IDEMPOTENCY_KEY="k").status_code, want)
        self.assertEqual(OrderPayment.objects.count(), 1)


class LedgerTests(AdminPaymentsBase):
    def test_cod_checkout_appears_as_a_pending_cash_payment(self):
        order = self.cod_order("100.00")
        res = client_for(self.staff).get(PAYMENTS)
        self.assertEqual(res.status_code, 200, res.content)
        body = res.json()
        self.assertEqual(body["count"], 1)
        row = body["results"][0]
        self.assertEqual(row["order_id"], str(order.pk))
        self.assertEqual(row["order_number"], f"#{str(order.pk)[:8].upper()}")
        self.assertEqual(row["customer_email"], "buyer@test.dev")
        self.assertEqual((row["amount"], row["currency"], row["status"]), ("125.00", "GHS", "pending"))
        self.assertEqual((row["provider"], row["method"], row["payment_type"]), ("cod", "cash", "cash"))
        self.assertIsNone(row["recorded_by"])

    @paystack_on
    def test_online_payments_show_the_gateway_reference_and_transaction_id(self):
        v = self.variant(self.seller_a, "100.00", qty=5)
        with mock.patch("apps.payments.paystack.initialize", return_value=INIT_OK):
            res = self.place(self.body((v, 1), payment_method="paystack"), key="on-1")
        session = CheckoutSession.objects.get()
        from .test_paystack import charge_event
        from .payment_flow import mark_session_paid

        mark_session_paid(session.pk, charge_event(session, channel="card")["data"])
        row = client_for(self.staff).get(PAYMENTS, {"status": "succeeded"}).json()["results"][0]
        self.assertEqual((row["provider"], row["method"], row["status"]), ("paystack", "card", "succeeded"))
        self.assertEqual(row["reference"], session.reference)
        self.assertEqual(row["transaction_id"], "987654")
        self.assertIsNotNone(row["paid_at"])

    def test_filters_search_ordering_and_pagination(self):
        small = self.cod_order("10.00", key="a")
        big = self.cod_order("500.00", key="b")
        client = client_for(self.staff)
        self.assertEqual(client.get(PAYMENTS, {"status": "succeeded"}).json()["count"], 0)
        self.assertEqual(client.get(PAYMENTS, {"status": "pending"}).json()["count"], 2)
        # The Admin refunds tab sends a status list with a value payments don't have: no results, not an error.
        self.assertEqual(client.get(PAYMENTS, {"status": "refunded,partially_refunded"}).json()["count"], 0)
        self.assertEqual(client.get(PAYMENTS, {"provider": "cod"}).json()["count"], 2)
        self.assertEqual(client.get(PAYMENTS, {"provider": "paystack"}).json()["count"], 0)
        self.assertEqual(client.get(PAYMENTS, {"search": "buyer@test"}).json()["count"], 2)
        self.assertEqual(client.get(PAYMENTS, {"search": "nobody@x.dev"}).json()["count"], 0)
        by_number = client.get(PAYMENTS, {"search": f"#{str(small.pk)[:8]}"}).json()
        self.assertEqual([r["order_id"] for r in by_number["results"]], [str(small.pk)])
        amounts = [r["amount"] for r in client.get(PAYMENTS, {"ordering": "-amount"}).json()["results"]]
        # 500.00 reaches the free-shipping threshold (no delivery fee); 10.00 + 25.00 delivery = 35.00.
        self.assertEqual(amounts, ["500.00", "35.00"])
        page = client.get(PAYMENTS, {"page_size": 1}).json()
        self.assertEqual((page["count"], len(page["results"])), (2, 1))
        self.assertEqual(client.get(PAYMENTS, {"ordering": "bogus"}).status_code, 400)

    def test_detail_shows_the_order_position(self):
        order = self.cod_order("100.00")
        self.record(order, "50.00")
        payment = OrderPayment.objects.get(provider="manual")
        body = client_for(self.staff).get(f"{PAYMENTS}{payment.pk}/").json()
        self.assertEqual(body["order"]["total_amount"], "125.00")
        self.assertEqual(body["order"]["amount_paid"], "50.00")
        self.assertEqual(body["order"]["amount_outstanding"], "75.00")
        self.assertEqual(client_for(self.staff).get(f"{PAYMENTS}{order.pk}/").status_code, 404)  # not a payment id


class RecordPaymentTests(AdminPaymentsBase):
    def test_full_payment_settles_the_order_and_is_attributed_to_the_admin(self):
        order = self.cod_order("100.00")
        res = self.record(order, "125.00", note="Cash handed over at the depot")
        self.assertEqual(res.status_code, 201, res.content)
        row = res.json()
        self.assertEqual((row["status"], row["provider"], row["method"]), ("succeeded", "manual", "cash"))
        self.assertEqual(row["recorded_by"], "staff@test.dev")
        self.assertEqual(row["note"], "Cash handed over at the depot")
        order.refresh_from_db()
        self.assertEqual(order.payment_status, "paid")
        self.assertIsNotNone(order.paid_at)

    def test_partial_payments_add_up_before_the_order_is_marked_paid(self):
        order = self.cod_order("100.00")
        self.record(order, "50.00", key="p1")
        order.refresh_from_db()
        self.assertEqual(order.payment_status, "unpaid")
        self.assertEqual(self.record(order, "75.00", key="p2").status_code, 201)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, "paid")

    def test_replaying_the_same_key_never_records_twice(self):
        order = self.cod_order("100.00")
        first = self.record(order, "125.00", key="same")
        second = self.record(order, "125.00", key="same")
        self.assertEqual((first.status_code, second.status_code), (201, 200))
        self.assertEqual(first.json()["id"], second.json()["id"])
        self.assertEqual(OrderPayment.objects.filter(provider="manual").count(), 1)

    def test_cannot_record_more_than_is_owed(self):
        order = self.cod_order("100.00")
        res = self.record(order, "125.01")
        self.assertEqual((res.status_code, res.json()["code"], res.json()["outstanding"]), (409, "overpayment", "125.00"))
        self.record(order, "125.00", key="full")
        res = self.record(order, "1.00", key="extra")
        self.assertEqual((res.status_code, res.json()["code"]), (409, "overpayment"))

    def test_input_is_validated(self):
        order = self.cod_order("100.00")
        self.assertEqual(self.record(order, "0").json()["code"], "invalid_amount")
        self.assertEqual(self.record(order, "-5").json()["code"], "invalid_amount")
        self.assertEqual(self.record(order, "10", method="bitcoin").status_code, 400)
        res = self.record(order, "10", method="bank_transfer")
        self.assertEqual((res.status_code, res.json()["code"]), (400, "reference_required"))
        ok = self.record(order, "10", method="bank_transfer", key="bt", reference="TRX-998")
        self.assertEqual(ok.status_code, 201)
        self.assertEqual(ok.json()["reference"], "TRX-998")
        no_key = client_for(self.staff).post(PAYMENTS, {"order_id": str(order.pk), "amount": "1", "method": "cash"}, format="json")
        self.assertEqual((no_key.status_code, no_key.json()["code"]), (400, "idempotency_key_required"))

    def test_an_order_can_be_picked_by_its_number(self):
        order = self.cod_order("100.00")
        number = f"#{str(order.pk)[:8].upper()}"
        res = client_for(self.staff).post(
            PAYMENTS, {"order_number": number, "amount": "125.00", "method": "cash"}, format="json", HTTP_IDEMPOTENCY_KEY="num"
        )
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(res.json()["order_id"], str(order.pk))
        c = client_for(self.staff)
        post = lambda n, k: c.post(PAYMENTS, {"order_number": n, "amount": "1", "method": "cash"}, format="json", HTTP_IDEMPOTENCY_KEY=k)
        self.assertEqual(post("#ffffffff", "n1").json()["code"], "order_not_found")
        self.assertEqual(post("zzz", "n2").json()["code"], "invalid_order_number")
        self.assertEqual(post("#ab", "n3").json()["code"], "invalid_order_number")
        neither = c.post(PAYMENTS, {"amount": "1", "method": "cash"}, format="json", HTTP_IDEMPOTENCY_KEY="n4")
        self.assertEqual(neither.status_code, 400)

    def test_unknown_and_closed_orders_are_refused(self):
        order = self.cod_order("100.00")
        missing = client_for(self.staff).post(
            PAYMENTS,
            {"order_id": "00000000-0000-0000-0000-000000000000", "amount": "1", "method": "cash"},
            format="json", HTTP_IDEMPOTENCY_KEY="m",
        )
        self.assertEqual((missing.status_code, missing.json()["code"]), (404, "order_not_found"))
        Order.objects.filter(pk=order.pk).update(order_status="Cancelled")
        res = self.record(order, "10", key="closed")
        self.assertEqual((res.status_code, res.json()["code"]), (409, "order_closed"))

    @paystack_on
    def test_an_order_waiting_for_the_gateway_cannot_be_paid_by_hand(self):
        v = self.variant(self.seller_a, "100.00", qty=5)
        with mock.patch("apps.payments.paystack.initialize", return_value=INIT_OK):
            res = self.place(self.body((v, 1), payment_method="paystack"), key="gw")
        order = Order.objects.get(pk=res.json()["orders"][0]["id"])
        out = self.record(order, "125.00", key="dup")
        self.assertEqual((out.status_code, out.json()["code"]), (409, "awaiting_online_payment"))
        order.refresh_from_db()
        self.assertEqual(order.payment_status, "unpaid")

    def test_recorded_payments_show_up_in_the_ledger_immediately(self):
        order = self.cod_order("100.00")
        self.record(order, "125.00", method="mobile_money", reference="MOMO-1")
        rows = client_for(self.staff).get(PAYMENTS, {"status": "succeeded"}).json()["results"]
        self.assertEqual([(r["method"], r["reference"], r["recorded_by"]) for r in rows], [("mobile_money", "MOMO-1", "staff@test.dev")])


class CashOnDeliveryCollectionTests(AdminPaymentsBase):
    def ship_and_confirm(self, order):
        c = client_for(self.user_a)
        c.post(f"{SELLER_ORDERS}{order.pk}/ship/", {"carrier": "DHL", "tracking_number": "T-1"}, format="json")
        return c.post(f"{SELLER_ORDERS}{order.pk}/confirm-delivery/", {}, format="json")

    def test_seller_confirming_cash_collected_completes_the_ledger_row(self):
        order = self.cod_order("100.00")
        self.assertEqual(self.ship_and_confirm(order).status_code, 200)
        payment = OrderPayment.objects.get(order=order)
        self.assertEqual((payment.provider, payment.status, payment.amount), ("cod", "succeeded", Decimal("125.00")))
        self.assertIsNotNone(payment.paid_at)
        self.assertEqual(OrderPayment.objects.filter(order=order).count(), 1)

    def test_cash_already_recorded_by_an_admin_is_not_counted_twice(self):
        order = self.cod_order("100.00")
        self.record(order, "125.00")
        self.assertEqual(self.ship_and_confirm(order).status_code, 200)
        total = sum(p.amount for p in OrderPayment.objects.filter(order=order, status="succeeded"))
        self.assertEqual(total, Decimal("125.00"))
