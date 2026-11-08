from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from apps.catalog.models import Brand, Category, SubCategory
from apps.products.models import Product, ProductVariant
from apps.sellers.models import SellerProfile
from apps.store.models import FeatureFlag
from apps.users.models import Address

from .models import Order, OrderItem

User = get_user_model()
BASE = "/tradehut/api/v1/orders/seller/"


def make_user(email):
    return User.objects.create_user(email=email, password="pass12345!")


def make_seller(email, name, rate="10.00"):
    user = make_user(email)
    profile = SellerProfile.objects.create(
        user=user,
        business_name=name,
        verification_status="verified",
        is_verified=True,
        id_type="ghana_card",
        id_number="GHA-123456789-0",
        commission_rate=Decimal(rate),
    )
    return user, profile


def client_for(user=None):
    client = APIClient()
    if user is not None:
        client.force_authenticate(user)
    return client


class SellerOrderBase(TestCase):
    @classmethod
    def setUpTestData(cls):
        FeatureFlag.objects.update_or_create(key="sellers", defaults={"name": "Sellers", "status": "on"})
        cls.category = Category.objects.create(name="Phones")
        cls.sub = SubCategory.objects.create(sub_category_name="Smart", category=cls.category)
        cls.brand = Brand.objects.create(name="Acme", category=cls.category)
        cls.user_a, cls.seller_a = make_seller("a@test.dev", "Seller A", "10.00")
        cls.user_b, cls.seller_b = make_seller("b@test.dev", "Seller B", "5.00")
        cls.buyer = User.objects.create_user(
            email="buyer@test.dev", password="pass12345!", first_name="Kofi", last_name="Mensah"
        )
        cls.address = Address.objects.create(
            user=cls.buyer, full_name="Kofi Mensah", phone="0241234567", address="12 Ring Road",
            city="Accra", state="Greater Accra", postal_code="00233", country="Ghana",
        )
        cls.n = 0

    def product(self, seller, name):
        type(self).n += 1
        return Product.objects.create(
            name=name, keywords=name, category=self.category, sub_category=self.sub,
            brand=self.brand, seller_profile=seller, status="Active",
        )

    def line(self, order, product, qty=1, price="100.00"):
        type(self).n += 1
        variant = ProductVariant.objects.create(
            product=product, sku=f"SKU-{self.n}", price=Decimal(price), quantity=10
        )
        return OrderItem.objects.create(
            order=order, product=product, variant=variant, quantity=qty,
            unit_price=Decimal(price), total_price=Decimal(price) * qty,
        )

    def order(self, *lines, status="Processing", pay_mode="Online", total=None, **extra):
        """lines: (seller, product name, qty, unit price)."""
        subtotal = sum(Decimal(p) * q for _, _, q, p in lines)
        order = Order.objects.create(
            user=self.buyer, address=self.address, order_status=status, pay_mode=pay_mode,
            total_amount=total if total is not None else subtotal,
            subtotal=subtotal, shipping_cost=Decimal("0.00"), tax_amount=Decimal("0.00"),
            **extra,
        )
        for seller, name, qty, price in lines:
            self.line(order, self.product(seller, name), qty, price)
        return order

    @property
    def a(self):
        return client_for(self.user_a)


class SellerOrderReadTests(SellerOrderBase):
    def test_unauthenticated_is_401(self):
        self.assertEqual(client_for().get(BASE).status_code, 401)
        self.assertEqual(client_for().post(f"{BASE}{self.order((self.seller_a, 'X', 1, '1.00')).id}/ship/", {}).status_code, 401)

    def test_buyer_without_seller_profile_gets_not_a_seller(self):
        res = client_for(self.buyer).get(BASE)
        self.assertEqual(res.status_code, 404)
        self.assertEqual(res.json()["code"], "not_a_seller")

    def test_lists_only_own_orders(self):
        mine = self.order((self.seller_a, "Phone", 1, "100.00"))
        self.order((self.seller_b, "Other", 1, "50.00"))
        res = self.a.get(BASE)
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["count"], 1)
        row = body["results"][0]
        self.assertEqual(row["id"], str(mine.id))
        self.assertEqual(row["buyer_name"], "Kofi Mensah")
        self.assertEqual(row["pay_mode"], "ONLINE")
        self.assertEqual(row["item_count"], 1)
        self.assertEqual(row["first_item"]["title"], "Phone")
        self.assertEqual(row["currency"], "GHS")
        self.assertEqual(row["total_amount"], "100.00")
        self.assertIsNone(row["payment_due_at"])

    def test_foreign_order_detail_is_404_not_403(self):
        theirs = self.order((self.seller_b, "Other", 1, "50.00"))
        res = self.a.get(f"{BASE}{theirs.id}/")
        self.assertEqual(res.status_code, 404)
        self.assertEqual(res.json()["code"], "order_not_found")

    def test_foreign_order_actions_are_404(self):
        theirs = self.order((self.seller_b, "Other", 1, "50.00"))
        for action in ("ship", "confirm-delivery"):
            res = self.a.post(f"{BASE}{theirs.id}/{action}/", {"carrier": "DHL", "tracking_number": "T1"}, format="json")
            self.assertEqual(res.status_code, 404, action)
        theirs.refresh_from_db()
        self.assertEqual(theirs.order_status, "Processing")

    def test_multi_seller_order_shows_only_own_lines_and_totals(self):
        shared = self.order(
            (self.seller_a, "A item", 2, "100.00"),
            (self.seller_b, "B item", 1, "300.00"),
            total=Decimal("520.00"),
        )
        row = self.a.get(BASE).json()["results"][0]
        self.assertEqual(row["item_count"], 1)
        self.assertEqual(row["total_amount"], "200.00")
        detail = self.a.get(f"{BASE}{shared.id}/").json()
        self.assertEqual([i["title"] for i in detail["items"]], ["A item"])
        self.assertEqual(detail["total_amount"], "200.00")
        self.assertEqual(detail["subtotal"], "200.00")
        self.assertIsNone(detail["shipping_cost"])
        self.assertEqual(detail["commission_amount"], "20.00")
        self.assertEqual(detail["net_amount"], "180.00")
        self.assertNotIn("B item", str(detail))
        self.assertNotIn("300.00", str(detail))
        self.assertNotIn("520.00", str(detail))
        # the other seller sees their own side only
        other = client_for(self.user_b).get(f"{BASE}{shared.id}/").json()
        self.assertEqual([i["title"] for i in other["items"]], ["B item"])
        self.assertEqual(other["total_amount"], "300.00")

    def test_multi_seller_order_cannot_be_changed(self):
        shared = self.order((self.seller_a, "A", 1, "10.00"), (self.seller_b, "B", 1, "10.00"))
        res = self.a.post(f"{BASE}{shared.id}/ship/", {"carrier": "DHL", "tracking_number": "T1"}, format="json")
        self.assertEqual(res.status_code, 409)
        self.assertEqual(res.json()["code"], "shared_order")
        shared.refresh_from_db()
        self.assertEqual(shared.order_status, "Processing")

    def test_line_without_seller_counts_as_foreign(self):
        order = self.order((self.seller_a, "Mine", 1, "10.00"))
        self.line(order, self.product(None, "Orphan"))
        res = self.a.post(f"{BASE}{order.id}/ship/", {"carrier": "DHL", "tracking_number": "T1"}, format="json")
        self.assertEqual(res.status_code, 409)
        self.assertEqual(res.json()["code"], "shared_order")

    def test_detail_shape_for_single_seller_order(self):
        order = self.order((self.seller_a, "Phone", 2, "100.00"), total=Decimal("215.00"), pay_mode="COD")
        order.subtotal, order.shipping_cost, order.tax_amount = Decimal("200.00"), Decimal("10.00"), Decimal("5.00")
        order.save()
        d = self.a.get(f"{BASE}{order.id}/").json()
        self.assertEqual(d["pay_mode"], "COD")
        self.assertEqual(d["total_amount"], "215.00")
        self.assertEqual(d["shipping_cost"], "10.00")
        self.assertEqual(d["tax_amount"], "5.00")
        self.assertEqual(d["commission_amount"], "20.00")
        self.assertEqual(d["net_amount"], "195.00")
        self.assertEqual(d["seller"], {"id": str(self.seller_a.id), "business_name": "Seller A"})
        self.assertEqual(d["shipping_address"]["full_name"], "Kofi Mensah")
        self.assertEqual(d["shipping_address"]["city"], "Accra")
        self.assertEqual(d["shipments"], [])
        self.assertEqual([t["status"] for t in d["timeline"]], ["Placed"])
        self.assertEqual(d["items"][0]["quantity"], 2)
        self.assertEqual(d["items"][0]["unit_price"], "100.00")

    def test_status_filter_search_and_validation(self):
        shipped = self.order((self.seller_a, "Blue Kettle", 1, "10.00"), status="Shipped")
        self.order((self.seller_a, "Red Lamp", 1, "10.00"), status="Processing")
        res = self.a.get(BASE, {"status": "shipped"}).json()
        self.assertEqual([r["id"] for r in res["results"]], [str(shipped.id)])
        self.assertEqual(self.a.get(BASE, {"q": "kettle"}).json()["count"], 1)
        self.assertEqual(self.a.get(BASE, {"q": "kofi"}).json()["count"], 2)
        self.assertEqual(self.a.get(BASE, {"q": str(shipped.id)[:8]}).json()["count"], 1)
        self.assertEqual(self.a.get(BASE, {"q": "nomatch"}).json()["count"], 0)
        self.assertEqual(self.a.get(BASE, {"status": "bogus"}).status_code, 400)
        self.assertEqual(self.a.get(BASE, {"ordering": "bogus"}).status_code, 400)

    def test_pagination_and_default_newest_first(self):
        from datetime import timedelta
        from django.utils import timezone

        now = timezone.now()
        ids = []
        for i in range(3):
            o = self.order((self.seller_a, f"P{i}", 1, "10.00"), placed_at=now - timedelta(days=3 - i))
            ids.append(str(o.id))
        page1 = self.a.get(BASE, {"page": 1, "page_size": 2}).json()
        self.assertEqual(page1["count"], 3)
        self.assertEqual([r["id"] for r in page1["results"]], [ids[2], ids[1]])
        self.assertIsNotNone(page1["next"])
        page2 = self.a.get(BASE, {"page": 2, "page_size": 2}).json()
        self.assertEqual([r["id"] for r in page2["results"]], [ids[0]])

    def test_list_query_count_is_constant(self):
        for i in range(2):
            self.order((self.seller_a, f"P{i}", 1, "10.00"))
        client = self.a
        client.get(BASE)  # warm one-off lookups
        with CaptureQueriesContext(connection) as small:
            client.get(BASE)
        for i in range(6):
            self.order((self.seller_a, f"Q{i}", 2, "10.00"))
        with CaptureQueriesContext(connection) as big:
            client.get(BASE)
        self.assertEqual(len(small), len(big))


class SellerShipTests(SellerOrderBase):
    def ship(self, order, **body):
        payload = {"carrier": "DHL", "tracking_number": "TRK-1", **body}
        return self.a.post(f"{BASE}{order.id}/ship/", payload, format="json")

    def test_ship_happy_path(self):
        order = self.order((self.seller_a, "Phone", 1, "100.00"))
        res = self.ship(order, tracking_url="https://track.example.com/TRK-1")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["order_status"], "Shipped")
        self.assertEqual(body["shipments"][0]["carrier"], "DHL")
        self.assertEqual(body["shipments"][0]["tracking_number"], "TRK-1")
        self.assertEqual(body["shipments"][0]["tracking_url"], "https://track.example.com/TRK-1")
        self.assertIsNotNone(body["shipped_at"])
        self.assertIn("Shipped", [t["status"] for t in body["timeline"]])
        order.refresh_from_db()
        self.assertEqual(order.order_status, "Shipped")

    def test_replay_same_tracking_is_200_and_keeps_shipped_at(self):
        order = self.order((self.seller_a, "Phone", 1, "100.00"))
        first = self.ship(order).json()
        res = self.ship(order)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["shipped_at"], first["shipped_at"])

    def test_different_tracking_after_shipped_is_409(self):
        order = self.order((self.seller_a, "Phone", 1, "100.00"))
        self.ship(order)
        res = self.ship(order, tracking_number="TRK-2")
        self.assertEqual(res.status_code, 409)
        self.assertEqual(res.json()["code"], "not_shippable")
        order.refresh_from_db()
        self.assertEqual(order.tracking_number, "TRK-1")

    def test_wrong_states_are_409_not_shippable(self):
        for status in ("Pending", "Delivered", "Cancelled", "Refunded"):
            order = self.order((self.seller_a, f"P-{status}", 1, "10.00"), status=status)
            res = self.ship(order)
            self.assertEqual(res.status_code, 409, status)
            self.assertEqual(res.json()["code"], "not_shippable")
            order.refresh_from_db()
            self.assertEqual(order.order_status, status)

    def test_validation_errors_are_400(self):
        order = self.order((self.seller_a, "Phone", 1, "100.00"))
        self.assertEqual(self.a.post(f"{BASE}{order.id}/ship/", {"carrier": "DHL"}, format="json").status_code, 400)
        self.assertEqual(self.ship(order, tracking_url="not a url").status_code, 400)
        self.assertEqual(self.ship(order, carrier="").status_code, 400)

    def test_suspended_seller_cannot_write(self):
        order = self.order((self.seller_a, "Phone", 1, "100.00"))
        SellerProfile.objects.filter(pk=self.seller_a.pk).update(verification_status="suspended")
        fresh = User.objects.get(pk=self.user_a.pk)  # avoid the cached seller_profile
        res = client_for(fresh).post(
            f"{BASE}{order.id}/ship/", {"carrier": "DHL", "tracking_number": "T1"}, format="json"
        )
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.json()["code"], "seller_suspended")


class SellerConfirmDeliveryTests(SellerOrderBase):
    def confirm(self, order):
        return self.a.post(f"{BASE}{order.id}/confirm-delivery/", {}, format="json")

    def test_cod_shipped_becomes_delivered_and_paid(self):
        order = self.order((self.seller_a, "Phone", 1, "100.00"), status="Shipped", pay_mode="COD")
        res = self.confirm(order)
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["order_status"], "Delivered")
        self.assertEqual(body["payment_status"], "paid")
        self.assertIsNotNone(body["delivered_at"])
        self.assertIsNotNone(body["paid_at"])
        order.refresh_from_db()
        self.assertEqual((order.order_status, order.payment_status), ("Delivered", "paid"))

    def test_replay_is_200(self):
        order = self.order((self.seller_a, "Phone", 1, "100.00"), status="Shipped", pay_mode="COD")
        first = self.confirm(order).json()
        res = self.confirm(order)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["delivered_at"], first["delivered_at"])

    def test_non_cod_is_409_not_cod(self):
        order = self.order((self.seller_a, "Phone", 1, "100.00"), status="Shipped", pay_mode="Online")
        res = self.confirm(order)
        self.assertEqual(res.status_code, 409)
        self.assertEqual(res.json()["code"], "not_cod")
        order.refresh_from_db()
        self.assertEqual((order.order_status, order.payment_status), ("Shipped", "unpaid"))

    def test_cod_not_yet_shipped_is_409_not_shipped(self):
        order = self.order((self.seller_a, "Phone", 1, "100.00"), status="Processing", pay_mode="COD")
        res = self.confirm(order)
        self.assertEqual(res.status_code, 409)
        self.assertEqual(res.json()["code"], "not_shipped")
        order.refresh_from_db()
        self.assertEqual(order.payment_status, "unpaid")

    def test_cancelled_cod_is_409(self):
        order = self.order((self.seller_a, "Phone", 1, "100.00"), status="Cancelled", pay_mode="COD")
        self.assertEqual(self.confirm(order).status_code, 409)


class SellerCancelNotBuiltTests(SellerOrderBase):
    def test_cancel_route_is_not_exposed(self):
        order = self.order((self.seller_a, "Phone", 1, "100.00"))
        res = self.a.post(f"{BASE}{order.id}/cancel/", {"reason": "out of stock"}, format="json")
        self.assertEqual(res.status_code, 404)
        order.refresh_from_db()
        self.assertEqual(order.order_status, "Processing")
