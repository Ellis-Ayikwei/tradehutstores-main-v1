from decimal import Decimal

from django.test import TestCase, override_settings

from apps.catalog.models import Brand, Category, SubCategory
from apps.products.models import Product, ProductVariant
from apps.store.models import FeatureFlag, StoreConfig
from apps.users.models import Address

from .models import Order
from .tests import client_for, make_seller, make_user

QUOTE = "/tradehut/api/v1/checkout/quote/"
PLACE = "/tradehut/api/v1/checkout/"
SELLER_ORDERS = "/tradehut/api/v1/orders/seller/"


class CheckoutBase(TestCase):
    @classmethod
    def setUpTestData(cls):
        FeatureFlag.objects.update_or_create(key="sellers", defaults={"name": "Sellers", "status": "on"})
        cls.category = Category.objects.create(name="Phones")
        cls.sub = SubCategory.objects.create(sub_category_name="Smart", category=cls.category)
        cls.brand = Brand.objects.create(name="Acme", category=cls.category)
        cls.user_a, cls.seller_a = make_seller("a@test.dev", "Seller A")
        cls.user_b, cls.seller_b = make_seller("b@test.dev", "Seller B")
        cls.buyer = make_user("buyer@test.dev")
        cls.other_buyer = make_user("other@test.dev")
        cls.address = Address.objects.create(
            user=cls.buyer, full_name="Kofi", phone="0241234567", address="12 Ring Road",
            city="Accra", postal_code="00233", country="Ghana",
        )
        cls.foreign_address = Address.objects.create(
            user=cls.other_buyer, full_name="Ama", phone="0200000000", address="1 Other St",
            city="Kumasi", postal_code="00000", country="Ghana",
        )
        cls.n = 0

    def variant(self, seller, price="100.00", qty=10, **product_extra):
        type(self).n += 1
        product = Product.objects.create(
            name=f"Item {self.n}", keywords="k", category=self.category, sub_category=self.sub,
            brand=self.brand, seller_profile=seller, status="Active", **product_extra,
        )
        return ProductVariant.objects.create(product=product, sku=f"CK-{self.n}", price=Decimal(price), quantity=qty)

    def body(self, *pairs, **extra):
        return {
            "items": [{"variant_id": str(v.pk), "quantity": q} for v, q in pairs],
            "address_id": str(self.address.pk),
            "delivery_method": "standard",
            "payment_method": "cod",
            **extra,
        }

    def place(self, body, key="key-1", user=None):
        return client_for(user or self.buyer).post(PLACE, body, format="json", HTTP_IDEMPOTENCY_KEY=key)


class QuoteTests(CheckoutBase):
    def test_requires_authentication(self):
        self.assertEqual(client_for().post(QUOTE, {}, format="json").status_code, 401)
        self.assertEqual(client_for().post(PLACE, {}, format="json").status_code, 401)

    def test_prices_come_from_the_database_and_split_per_seller(self):
        a = self.variant(self.seller_a, "100.00")
        b = self.variant(self.seller_b, "40.00")
        res = client_for(self.buyer).post(QUOTE, self.body((a, 2), (b, 1)), format="json")
        self.assertEqual(res.status_code, 200, res.content)
        data = res.json()
        self.assertEqual(data["currency"], "GHS")
        self.assertEqual(data["subtotal"], "240.00")
        self.assertEqual(len(data["orders"]), 2)
        # standard delivery is 25.00 per seller order (below the free-shipping threshold); tax is inclusive.
        self.assertEqual(data["shipping_cost"], "50.00")
        self.assertEqual(data["tax_amount"], "0.00")
        self.assertEqual(data["total_amount"], "290.00")
        self.assertEqual(Order.objects.count(), 0, "a quote must not write orders")

    def test_product_discount_is_applied(self):
        v = self.variant(self.seller_a, "200.00", discount_percentage=10)
        data = client_for(self.buyer).post(QUOTE, self.body((v, 1)), format="json").json()
        self.assertEqual(data["subtotal"], "180.00")

    def test_free_shipping_over_threshold(self):
        v = self.variant(self.seller_a, "600.00")
        data = client_for(self.buyer).post(QUOTE, self.body((v, 1)), format="json").json()
        self.assertEqual(data["shipping_cost"], "0.00")
        self.assertEqual(data["total_amount"], "600.00")

    def test_exclusive_tax_is_charged_on_goods_and_shipping(self):
        cfg = StoreConfig.singleton()
        cfg.tax_mode = "exclusive"
        cfg.save()
        v = self.variant(self.seller_a, "100.00")
        data = client_for(self.buyer).post(QUOTE, self.body((v, 1)), format="json").json()
        # (100 + 25 shipping) x 12.5% = 15.625 -> 15.63
        self.assertEqual(data["tax_amount"], "15.63")
        self.assertEqual(data["total_amount"], "140.63")

    def test_someone_elses_address_is_404(self):
        v = self.variant(self.seller_a)
        body = self.body((v, 1), address_id=str(self.foreign_address.pk))
        res = client_for(self.buyer).post(QUOTE, body, format="json")
        self.assertEqual(res.status_code, 404)
        self.assertEqual(res.json()["code"], "address_not_found")

    def test_out_of_stock_is_reported_per_line_not_as_an_error(self):
        v = self.variant(self.seller_a, qty=1)
        res = client_for(self.buyer).post(QUOTE, self.body((v, 3)), format="json")
        self.assertEqual(res.status_code, 200)
        line = res.json()["lines"][0]
        self.assertEqual(line["error"], "out_of_stock")
        self.assertEqual(line["available_quantity"], 1)

    def test_unknown_delivery_method_and_unknown_promo(self):
        v = self.variant(self.seller_a)
        res = client_for(self.buyer).post(QUOTE, self.body((v, 1), delivery_method="teleport"), format="json")
        self.assertEqual((res.status_code, res.json()["code"]), (422, "delivery_method_unavailable"))
        res = client_for(self.buyer).post(QUOTE, self.body((v, 1), promo_code="NOPE"), format="json")
        self.assertEqual((res.status_code, res.json()["code"]), (422, "invalid_promo"))

    def test_unverified_seller_listing_is_unavailable(self):
        v = self.variant(self.seller_a)
        self.seller_a.verification_status = "pending"
        self.seller_a.save(update_fields=["verification_status"])
        res = client_for(self.buyer).post(QUOTE, self.body((v, 1)), format="json")
        self.assertEqual((res.status_code, res.json()["code"]), (409, "listing_unavailable"))

    def test_seller_not_accepting_orders(self):
        v = self.variant(self.seller_a)
        self.seller_a.is_accepting_orders = False
        self.seller_a.save(update_fields=["is_accepting_orders"])
        res = client_for(self.buyer).post(QUOTE, self.body((v, 1)), format="json")
        self.assertEqual((res.status_code, res.json()["code"]), (409, "seller_not_accepting_orders"))

    def test_platform_listing_without_a_seller_can_be_bought(self):
        v = self.variant(None, "10.00")
        res = client_for(self.buyer).post(QUOTE, self.body((v, 1)), format="json")
        self.assertEqual(res.status_code, 200, res.content)
        self.assertIsNone(res.json()["orders"][0]["seller"])


class PlaceOrderTests(CheckoutBase):
    def test_idempotency_key_is_required(self):
        v = self.variant(self.seller_a)
        res = client_for(self.buyer).post(PLACE, self.body((v, 1)), format="json")
        self.assertEqual((res.status_code, res.json()["code"]), (400, "idempotency_key_required"))

    def test_cod_order_is_created_and_stock_decremented(self):
        a = self.variant(self.seller_a, "100.00", qty=5)
        b = self.variant(self.seller_b, "40.00", qty=5)
        res = self.place(self.body((a, 2), (b, 1)))
        self.assertEqual(res.status_code, 201, res.content)
        data = res.json()
        self.assertEqual(data["status"], "cod")
        self.assertEqual(data["payment"]["provider"], "cod")
        self.assertEqual(data["amount"], "290.00")
        self.assertEqual(len(data["orders"]), 2)

        orders = Order.objects.filter(user=self.buyer)
        self.assertEqual(orders.count(), 2)
        for order in orders:
            self.assertEqual((order.order_status, order.payment_status, order.pay_mode), ("Processing", "unpaid", "COD"))
            self.assertEqual(order.address_id, self.address.pk)
        a.refresh_from_db(); b.refresh_from_db()
        self.assertEqual((a.quantity, b.quantity), (3, 4))

    def test_replay_with_same_key_returns_same_orders_and_decrements_once(self):
        v = self.variant(self.seller_a, qty=5)
        first = self.place(self.body((v, 2)), key="k-replay")
        second = self.place(self.body((v, 2)), key="k-replay")
        self.assertEqual((first.status_code, second.status_code), (201, 200))
        self.assertEqual(first.json()["checkout_id"], second.json()["checkout_id"])
        self.assertEqual([o["id"] for o in first.json()["orders"]], [o["id"] for o in second.json()["orders"]])
        self.assertEqual(Order.objects.filter(user=self.buyer).count(), 1)
        v.refresh_from_db()
        self.assertEqual(v.quantity, 3)

    def test_same_key_from_a_different_buyer_is_not_a_replay(self):
        v = self.variant(self.seller_a, qty=5)
        self.assertEqual(self.place(self.body((v, 1)), key="shared").status_code, 201)
        body = self.body((v, 1), address_id=str(self.foreign_address.pk))
        res = self.place(body, key="shared", user=self.other_buyer)
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(Order.objects.count(), 2)

    def test_out_of_stock_creates_nothing_and_leaves_stock_alone(self):
        ok = self.variant(self.seller_a, qty=5)
        short = self.variant(self.seller_b, qty=1)
        res = self.place(self.body((ok, 2), (short, 3)))
        self.assertEqual((res.status_code, res.json()["code"]), (409, "out_of_stock"))
        self.assertEqual(res.json()["available"], 1)
        self.assertEqual(Order.objects.count(), 0)
        ok.refresh_from_db(); short.refresh_from_db()
        self.assertEqual((ok.quantity, short.quantity), (5, 1))

    def test_price_changed_returns_the_new_quote_and_creates_nothing(self):
        v = self.variant(self.seller_a, "100.00", qty=5)
        res = self.place(self.body((v, 1), expected_total="1.00"))
        self.assertEqual((res.status_code, res.json()["code"]), (409, "price_changed"))
        self.assertEqual(res.json()["quote"]["total_amount"], "125.00")
        self.assertEqual(Order.objects.count(), 0)
        v.refresh_from_db()
        self.assertEqual(v.quantity, 5)

    def test_matching_expected_total_is_accepted(self):
        v = self.variant(self.seller_a, "100.00", qty=5)
        self.assertEqual(self.place(self.body((v, 1), expected_total="125.00")).status_code, 201)

    @override_settings(PAYSTACK_SECRET_KEY="")
    def test_card_payment_is_refused_until_paystack_is_configured(self):
        v = self.variant(self.seller_a)
        with self.assertLogs("tradehut.api", level="WARNING") as logs:
            res = self.place(self.body((v, 1), payment_method="paystack"))
        self.assertEqual((res.status_code, res.json()["code"]), (422, "payment_method_unavailable"))
        self.assertEqual(Order.objects.count(), 0)
        # The reason is printed to the server log, not just "422 109".
        line = "\n".join(logs.output)
        self.assertIn("API 422 POST /tradehut/api/v1/checkout/", line)
        self.assertIn("code=payment_method_unavailable", line)
        self.assertIn("Card and mobile money payments aren't available right now", line)

    def test_cod_can_be_switched_off_by_an_admin(self):
        cfg = StoreConfig.singleton()
        cfg.payments_gateways = [g for g in cfg.payments_gateways if g["id"] != "cod"]
        cfg.save()
        v = self.variant(self.seller_a)
        res = self.place(self.body((v, 1)))
        self.assertEqual((res.status_code, res.json()["code"]), (422, "payment_method_unavailable"))

    def test_validation_errors_are_400(self):
        v = self.variant(self.seller_a)
        res = self.place({**self.body((v, 1)), "items": []})
        self.assertEqual(res.status_code, 400)
        res = self.place({**self.body((v, 1)), "items": [{"variant_id": "not-a-uuid", "quantity": 1}]})
        self.assertEqual(res.status_code, 400)
        res = self.place({**self.body((v, 1)), "items": [{"variant_id": str(v.pk), "quantity": 0}]})
        self.assertEqual(res.status_code, 400)

    def test_same_variant_twice_is_merged(self):
        v = self.variant(self.seller_a, qty=5)
        res = self.place(self.body((v, 2), (v, 1)))
        self.assertEqual(res.status_code, 201, res.content)
        v.refresh_from_db()
        self.assertEqual(v.quantity, 2)

    def test_buyer_can_view_their_orders_afterwards(self):
        """Regression: users/<id>/my_orders/ crashed with 500 ('orderitem_set' is not a relation)."""
        v = self.variant(self.seller_a, "100.00", qty=5)
        order_id = self.place(self.body((v, 2))).json()["orders"][0]["id"]
        url = f"/tradehut/api/v1/users/{self.buyer.pk}/my_orders/"
        res = client_for(self.buyer).get(url)
        self.assertEqual(res.status_code, 200, res.content)
        rows = res.json()
        self.assertEqual([r["id"] for r in rows], [order_id])
        self.assertEqual(rows[0]["order_status"], "Processing")
        self.assertEqual(rows[0]["pay_mode"], "COD")
        self.assertEqual(len(rows[0]["items"]), 1)
        self.assertEqual(rows[0]["items"][0]["quantity"], 2)
        self.assertTrue(rows[0]["items"][0]["product_name"].startswith("Item "))
        # Another buyer cannot read them (the users endpoint hides other accounts: 404, not 200).
        self.assertEqual(client_for(self.other_buyer).get(url).status_code, 404)

    def test_new_cod_order_reaches_the_seller_and_can_be_shipped(self):
        """The seller-side flow that was stuck: a placed COD order is Processing, so the seller can ship it."""
        v = self.variant(self.seller_a, qty=5)
        order_id = self.place(self.body((v, 1))).json()["orders"][0]["id"]
        listed = client_for(self.user_a).get(SELLER_ORDERS).json()
        self.assertEqual([r["id"] for r in listed["results"]], [order_id])
        ship = client_for(self.user_a).post(
            f"{SELLER_ORDERS}{order_id}/ship/", {"carrier": "DHL", "tracking_number": "T-1"}, format="json"
        )
        self.assertEqual(ship.status_code, 200, ship.content)
        # ...and another seller never sees it.
        self.assertEqual(client_for(self.user_b).get(SELLER_ORDERS).json()["count"], 0)
