from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from apps.orders.models import Order

from .models import SellerPayout
from .seller_test_helpers import client_for, make_order, make_product, make_seller, make_user

BASE = "/tradehut/api/v1/sellers/admin"


class AdminSellerFinanceTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.staff = make_user("fin-staff@test.dev")
        cls.staff.is_staff = True
        cls.staff.save(update_fields=["is_staff"])
        cls.buyer = make_user("fin-buyer@test.dev")
        cls.seller_user, cls.seller = make_seller("fin-seller@test.dev", commission_rate=Decimal("10.00"))
        cls.product, cls.variants = make_product(cls.seller, variants=(("100.00", 50),))
        cls.v = cls.variants[0]
        old = timezone.now() - timedelta(days=30)  # past the payout hold
        recent = timezone.now() - timedelta(days=1)  # inside the hold
        # Online, paid, delivered long ago: 2 x 100 = 200 -> owed 180 after 10% commission.
        cls.online = make_order(cls.buyer, [(cls.v, 2)], status="Delivered")
        Order.objects.filter(pk=cls.online.pk).update(payment_status="paid", delivered_at=old)
        # Cash on delivery, delivered long ago: 1 x 100 -> seller holds the cash, owes 10 commission.
        cls.cod = make_order(cls.buyer, [(cls.v, 1)], status="Delivered")
        Order.objects.filter(pk=cls.cod.pk).update(pay_mode="COD", payment_status="paid", delivered_at=old)
        # Online, paid, delivered yesterday: still on hold -> 1 x 100 -> 90 pending.
        cls.held = make_order(cls.buyer, [(cls.v, 1)], status="Delivered")
        Order.objects.filter(pk=cls.held.pk).update(payment_status="paid", delivered_at=recent)
        # Cancelled orders never count as sold.
        cls.cancelled = make_order(cls.buyer, [(cls.v, 5)], status="Cancelled")

    def summary(self):
        res = client_for(self.staff).get(f"{BASE}/{self.seller.pk}/summary/")
        self.assertEqual(res.status_code, 200, res.content)
        return res.json()

    def test_money_endpoints_are_staff_only(self):
        for url in ("summary/", "orders/", "sold/", "payouts/"):
            full = f"{BASE}/{self.seller.pk}/{url}"
            self.assertEqual(client_for().get(full).status_code, 401, url)
            self.assertEqual(client_for(self.buyer).get(full).status_code, 403, url)
            self.assertEqual(client_for(self.seller_user).get(full).status_code, 403, url)

    def test_summary_math(self):
        s = self.summary()
        self.assertEqual(s["commission_rate"], "10.00")
        self.assertEqual(s["units_sold"], 4)  # 2 + 1 + 1, the cancelled 5 is excluded
        self.assertEqual(s["sold_gross"], "400.00")
        self.assertEqual(s["delivered_gross"], "400.00")
        self.assertEqual(s["commission"], "40.00")
        self.assertEqual(s["available_earnings"], "170.00")  # 180 online - 10 cash commission
        self.assertEqual(s["pending_earnings"], "90.00")
        self.assertEqual(s["paid_out"], "0.00")
        self.assertEqual(s["balance"], "170.00")
        self.assertEqual(s["orders"]["total"], 4)
        self.assertEqual(s["orders"]["by_status"]["Cancelled"], 1)

    def test_sold_items_exclude_cancelled(self):
        rows = client_for(self.staff).get(f"{BASE}/{self.seller.pk}/sold/").json()
        self.assertEqual(len(rows), 1)
        self.assertEqual((rows[0]["units"], rows[0]["revenue"], rows[0]["orders"]), (4, "400.00", 3))

    def test_orders_list_is_paginated_and_filterable(self):
        client = client_for(self.staff)
        body = client.get(f"{BASE}/{self.seller.pk}/orders/").json()
        self.assertEqual(body["count"], 4)
        delivered = client.get(f"{BASE}/{self.seller.pk}/orders/", {"status": "Cancelled"}).json()
        self.assertEqual([r["id"] for r in delivered["results"]], [str(self.cancelled.pk)])

    def record(self, amount, key="k-1", **extra):
        body = {"amount": amount, "method": "bank_transfer", "reference": "TRX-1", **extra}
        return client_for(self.staff).post(f"{BASE}/{self.seller.pk}/payouts/", body, format="json", HTTP_IDEMPOTENCY_KEY=key)

    def test_payout_reduces_balance_and_replays(self):
        res = self.record("100.00")
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(res.json()["amount"], "100.00")
        self.assertEqual(self.record("100.00").status_code, 200)  # same key: the first row, no second payout
        self.assertEqual(SellerPayout.objects.filter(seller=self.seller).count(), 1)
        self.assertEqual(self.summary()["balance"], "70.00")
        self.assertEqual(len(client_for(self.staff).get(f"{BASE}/{self.seller.pk}/payouts/").json()), 1)

    def test_payout_cannot_exceed_the_balance(self):
        res = self.record("170.01")
        self.assertEqual((res.status_code, res.json()["code"]), (409, "exceeds_balance"))
        self.assertEqual(res.json()["available"], "170.00")
        self.assertEqual(SellerPayout.objects.count(), 0)

    def test_payout_validation(self):
        client = client_for(self.staff)
        url = f"{BASE}/{self.seller.pk}/payouts/"
        no_key = client.post(url, {"amount": "10", "method": "cash"}, format="json")
        self.assertEqual((no_key.status_code, no_key.json()["code"]), (400, "idempotency_key_required"))
        self.assertEqual(self.record("0", key="k-2").status_code, 400)
        no_ref = client.post(url, {"amount": "10", "method": "bank_transfer"}, format="json", HTTP_IDEMPOTENCY_KEY="k-3")
        self.assertEqual((no_ref.status_code, no_ref.json()["code"]), (400, "reference_required"))
        bad = client.post(url, {"amount": "10", "method": "bitcoin"}, format="json", HTTP_IDEMPOTENCY_KEY="k-4")
        self.assertEqual(bad.status_code, 400)

    def test_unknown_seller_is_404(self):
        import uuid

        self.assertEqual(client_for(self.staff).get(f"{BASE}/{uuid.uuid4()}/summary/").status_code, 404)
