from decimal import Decimal

from django.test import TestCase

from apps.catalog.models import Brand, Category, SubCategory
from apps.products.models import Product, ProductVariant
from apps.users.models import Address

from .models import Order, OrderItem
from .tests import client_for, make_seller, make_user

URL = "/tradehut/api/v1/orders/"


class AdminOrderListTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.staff = make_user("staff@test.dev")
        cls.staff.is_staff = True
        cls.staff.save(update_fields=["is_staff"])
        cls.buyer = make_user("buyer@test.dev")
        cls.buyer.first_name, cls.buyer.last_name = "Kofi", "Mensah"
        cls.buyer.save(update_fields=["first_name", "last_name"])
        cls.seller_user, cls.seller = make_seller("seller@test.dev", "Seller A")
        category = Category.objects.create(name="Phones")
        sub = SubCategory.objects.create(sub_category_name="Smart", category=category)
        brand = Brand.objects.create(name="Acme", category=category)
        product = Product.objects.create(
            name="Phone", keywords="k", category=category, sub_category=sub, brand=brand,
            seller_profile=cls.seller, status="Active",
        )
        variant = ProductVariant.objects.create(product=product, sku="ADM-1", price=Decimal("100.00"), quantity=9)
        address = Address.objects.create(
            user=cls.buyer, full_name="Kofi", phone="0241234567", address="12 Ring Road",
            city="Accra", state="Greater Accra", postal_code="00233", country="Ghana",
        )
        cls.order = Order.objects.create(
            user=cls.buyer, address=address, order_status="Processing", pay_mode="COD",
            total_amount=Decimal("250.00"), payment_status="unpaid",
        )
        OrderItem.objects.create(order=cls.order, product=product, variant=variant, quantity=2,
                                 unit_price=Decimal("100.00"), total_price=Decimal("200.00"))
        OrderItem.objects.create(order=cls.order, product=product, variant=variant, quantity=1,
                                 unit_price=Decimal("50.00"), total_price=Decimal("50.00"))
        cls.refunded = Order.objects.create(
            user=cls.buyer, order_status="Refunded", pay_mode="Online",
            total_amount=Decimal("10.00"), payment_status="partially_refunded",
        )

    def test_unauthenticated_is_401(self):
        self.assertEqual(client_for().get(URL).status_code, 401)

    def test_buyers_and_sellers_cannot_list_everyone_s_orders(self):
        self.assertEqual(client_for(self.buyer).get(URL).status_code, 403)
        self.assertEqual(client_for(self.seller_user).get(URL).status_code, 403)

    def test_staff_gets_the_flat_array_admin_renders(self):
        res = client_for(self.staff).get(URL)
        self.assertEqual(res.status_code, 200, res.content)
        rows = {r["id"]: r for r in res.json()}
        self.assertEqual(len(rows), 2)
        row = rows[str(self.order.pk)]
        self.assertEqual(row["order_number"], f"#{str(self.order.pk)[:8].upper()}")
        self.assertEqual(row["customer_name"], "Kofi Mensah")
        self.assertEqual(row["customer_email"], "buyer@test.dev")
        self.assertEqual(row["total_amount"], 250.0)  # a number, not a string
        self.assertIsInstance(row["total_amount"], float)
        self.assertEqual(row["status"], "processing")
        self.assertEqual(row["payment_status"], "pending")
        self.assertEqual(row["items_count"], 3)
        self.assertEqual(row["shipping_address"], "12 Ring Road, Accra, Greater Accra, Ghana")
        # Statuses Admin has no pill for are mapped to ones it does.
        other = rows[str(self.refunded.pk)]
        self.assertEqual((other["status"], other["payment_status"], other["items_count"]), ("cancelled", "refunded", 0))

    def test_detail_is_staff_only(self):
        url = f"{URL}{self.order.pk}/"
        self.assertEqual(client_for().get(url).status_code, 401)
        self.assertEqual(client_for(self.buyer).get(url).status_code, 403)
        self.assertEqual(client_for(self.seller_user).get(url).status_code, 403)

    def test_detail_returns_the_whole_order(self):
        res = client_for(self.staff).get(f"{URL}{self.order.pk}/")
        self.assertEqual(res.status_code, 200, res.content)
        body = res.json()
        self.assertEqual(body["order_number"], f"#{str(self.order.pk)[:8].upper()}")
        self.assertEqual(body["order_status"], "Processing")
        self.assertEqual(body["pay_mode"], "COD")
        self.assertEqual(body["customer"], {"name": "Kofi", "email": "buyer@test.dev"})
        self.assertEqual(len(body["items"]), 2)
        self.assertEqual(body["items"][0]["seller"], "Seller A")
        self.assertEqual(body["total_amount"], "250.00")
        self.assertEqual(body["shipping_address"]["city"], "Accra")

    def test_detail_unknown_order_is_404(self):
        import uuid

        self.assertEqual(client_for(self.staff).get(f"{URL}{uuid.uuid4()}/").status_code, 404)

    def test_status_filter_and_limit(self):
        client = client_for(self.staff)
        self.assertEqual([r["id"] for r in client.get(URL, {"status": "processing"}).json()], [str(self.order.pk)])
        self.assertEqual(len(client.get(URL, {"limit": 1}).json()), 1)
        self.assertEqual(client.get(URL, {"status": "bogus"}).status_code, 400)
        self.assertEqual(client.get(URL, {"limit": "abc"}).status_code, 400)


class AdminOrderActionTests(TestCase):
    """Staff fulfilment: ship, confirm delivery, cancel. Works on any seller's order."""

    @classmethod
    def setUpTestData(cls):
        cls.staff = make_user("staff2@test.dev")
        cls.staff.is_staff = True
        cls.staff.save(update_fields=["is_staff"])
        cls.buyer = make_user("buyer2@test.dev")
        cls.seller_user, cls.seller = make_seller("seller2@test.dev", "Seller B")
        category = Category.objects.create(name="Audio")
        sub = SubCategory.objects.create(sub_category_name="Speakers", category=category)
        brand = Brand.objects.create(name="Acme2", category=category)
        product = Product.objects.create(
            name="Speaker", keywords="k", category=category, sub_category=sub, brand=brand,
            seller_profile=cls.seller, status="Active",
        )
        cls.variant = ProductVariant.objects.create(product=product, sku="ACT-1", price=Decimal("100.00"), quantity=5)
        cls.product = product

    def make_order(self, **kw):
        defaults = dict(user=self.buyer, order_status="Processing", pay_mode="COD", total_amount=Decimal("200.00"), payment_status="unpaid")
        defaults.update(kw)
        order = Order.objects.create(**defaults)
        OrderItem.objects.create(order=order, product=self.product, variant=self.variant, quantity=2,
                                 unit_price=Decimal("100.00"), total_price=Decimal("200.00"))
        return order

    def url(self, order, action):
        return f"{URL}{order.pk}/{action}/"

    def test_actions_are_staff_only(self):
        order = self.make_order()
        for who in (None, self.buyer, self.seller_user):
            client = client_for(who) if who else client_for()
            for action in ("ship", "confirm-delivery", "cancel"):
                res = client.post(self.url(order, action), {"carrier": "DHL", "tracking_number": "1", "reason": "x"}, format="json")
                self.assertIn(res.status_code, (401, 403), (who, action))
        order.refresh_from_db()
        self.assertEqual(order.order_status, "Processing")

    def test_detail_reports_allowed_actions(self):
        order = self.make_order()
        body = client_for(self.staff).get(f"{URL}{order.pk}/").json()
        actions = body["actions"]
        self.assertEqual((actions["ship"], actions["confirm_delivery"], actions["cancel"]), (True, False, True))
        self.assertIsNone(actions["cancel_blocker"])
        self.assertFalse(actions["cancel_refunds_buyer"])  # an unpaid order: nothing to hand back
        self.assertEqual(body["refunds"], [])
        self.assertEqual(body["payments"], [])
        self.assertEqual(body["amount_outstanding"], "200.00")

    def test_ship_generates_the_tracking_number_then_replay_then_other_carrier(self):
        order = self.make_order()
        client = client_for(self.staff)
        payload = {"carrier": "DHL", "parcels": 2, "weight_kg": "4.00", "contact_name": "Rider"}
        res = client.post(self.url(order, "ship"), payload, format="json")
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()["order_status"], "Shipped")
        shipment = res.json()["shipments"][0]
        self.assertRegex(shipment["tracking_number"], r"^TH[A-HJKMNP-Z2-9]{10}$")  # issued by the platform
        self.assertEqual((shipment["parcels"], shipment["weight_kg"], shipment["contact_name"]), (2, "4.00", "Rider"))
        again = client.post(self.url(order, "ship"), payload, format="json")  # double click
        self.assertEqual(again.status_code, 200)
        self.assertEqual(again.json()["shipments"][0]["tracking_number"], shipment["tracking_number"])
        other = client.post(self.url(order, "ship"), {"carrier": "FedEx"}, format="json")
        self.assertEqual((other.status_code, other.json()["code"]), (409, "not_shippable"))

    def test_ship_needs_a_carrier_but_no_tracking_number(self):
        order = self.make_order()
        self.assertEqual(client_for(self.staff).post(self.url(order, "ship"), {}, format="json").status_code, 400)
        self.assertEqual(client_for(self.staff).post(self.url(order, "ship"), {"carrier": "DHL"}, format="json").status_code, 200)

    def test_confirm_delivery_records_cod_cash(self):
        order = self.make_order(order_status="Shipped")
        res = client_for(self.staff).post(self.url(order, "confirm-delivery"))
        self.assertEqual(res.status_code, 200, res.content)
        body = res.json()
        self.assertEqual((body["order_status"], body["payment_status"]), ("Delivered", "paid"))
        self.assertEqual(body["amount_outstanding"], "0.00")
        self.assertEqual(body["payments"][0]["provider"], "cod")
        self.assertEqual(client_for(self.staff).post(self.url(order, "confirm-delivery")).status_code, 200)  # replay

    def test_confirm_delivery_before_shipping_is_409(self):
        order = self.make_order()
        res = client_for(self.staff).post(self.url(order, "confirm-delivery"))
        self.assertEqual((res.status_code, res.json()["code"]), (409, "not_shipped"))

    def test_cancel_returns_stock_for_checkout_orders_only(self):
        checkout_order = self.make_order(checkout_key="k-1")
        manual_order = self.make_order()  # no checkout_key: stock was never reserved for it
        client = client_for(self.staff)
        self.assertEqual(client.post(self.url(checkout_order, "cancel"), {"reason": "Out of stock"}, format="json").status_code, 200)
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.quantity, 7)  # 5 + 2
        self.assertEqual(client.post(self.url(manual_order, "cancel"), {"reason": "Duplicate"}, format="json").status_code, 200)
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.quantity, 7)  # unchanged
        # Replay is a no-op success and must not return stock twice.
        self.assertEqual(client.post(self.url(checkout_order, "cancel"), {"reason": "Out of stock"}, format="json").status_code, 200)
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.quantity, 7)

    def test_cancel_needs_a_reason(self):
        order = self.make_order()
        self.assertEqual(client_for(self.staff).post(self.url(order, "cancel"), {}, format="json").status_code, 400)

    def test_shipped_orders_and_paid_orders_with_no_payment_on_record_cannot_be_cancelled(self):
        paid = self.make_order(payment_status="paid")  # marked paid, but no payment row: nothing to refund automatically
        shipped = self.make_order(order_status="Shipped")
        client = client_for(self.staff)
        res = client.post(self.url(paid, "cancel"), {"reason": "x"}, format="json")
        self.assertEqual((res.status_code, res.json()["code"]), (409, "needs_manual_refund"))
        res = client.post(self.url(shipped, "cancel"), {"reason": "x"}, format="json")
        self.assertEqual((res.status_code, res.json()["code"]), (409, "not_cancellable"))

    def test_unknown_order_is_404(self):
        import uuid

        self.assertEqual(client_for(self.staff).post(f"{URL}{uuid.uuid4()}/cancel/", {"reason": "x"}, format="json").status_code, 404)


class AdminEditShippingTests(TestCase):
    """Staff can add or correct shipping details on any order, at any status."""

    @classmethod
    def setUpTestData(cls):
        cls.staff = make_user("ship-staff@test.dev")
        cls.staff.is_staff = True
        cls.staff.save(update_fields=["is_staff"])
        cls.buyer = make_user("ship-buyer@test.dev")
        cls.seller_user, cls.seller = make_seller("ship-seller@test.dev", "Seller C")
        category = Category.objects.create(name="Cams")
        sub = SubCategory.objects.create(sub_category_name="Lenses", category=category)
        brand = Brand.objects.create(name="Acme3", category=category)
        product = Product.objects.create(
            name="Lens", keywords="k", category=category, sub_category=sub, brand=brand,
            seller_profile=cls.seller, status="Active",
        )
        cls.variant = ProductVariant.objects.create(product=product, sku="SHP-1", price=Decimal("50.00"), quantity=5)
        cls.product = product

    def order(self, status="Processing"):
        order = Order.objects.create(user=self.buyer, order_status=status, pay_mode="COD", total_amount=Decimal("50.00"), payment_status="unpaid")
        OrderItem.objects.create(order=order, product=self.product, variant=self.variant, quantity=1, unit_price=Decimal("50.00"), total_price=Decimal("50.00"))
        return order

    def patch(self, order, body):
        return client_for(self.staff).patch(f"{URL}{order.pk}/", body, format="json")

    def test_staff_only(self):
        order = self.order()
        self.assertEqual(client_for().patch(f"{URL}{order.pk}/", {"estimated_delivery_date": "2030-01-01"}, format="json").status_code, 401)
        self.assertEqual(client_for(self.buyer).patch(f"{URL}{order.pk}/", {"estimated_delivery_date": "2030-01-01"}, format="json").status_code, 403)
        self.assertEqual(client_for(self.seller_user).patch(f"{URL}{order.pk}/", {"estimated_delivery_date": "2030-01-01"}, format="json").status_code, 403)

    def test_before_shipping_only_the_estimate_can_be_set(self):
        order = self.order()
        res = self.patch(order, {"estimated_delivery_date": "2030-01-05"})
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()["estimated_delivery_date"], "2030-01-05")
        res = self.patch(order, {"carrier": "DHL"})
        self.assertEqual((res.status_code, res.json()["code"]), (409, "not_shipped_yet"))

    def test_edit_shipment_after_shipping_and_after_delivery(self):
        order = self.order()
        client = client_for(self.staff)
        self.assertEqual(client.post(f"{URL}{order.pk}/ship/", {"carrier": "DHL"}, format="json").status_code, 200)
        res = self.patch(order, {"carrier": "UPS", "parcels": 2, "tracking_url": "https://track.example.com/x", "internal_note": "fragile"})
        self.assertEqual(res.status_code, 200, res.content)
        shipment = res.json()["shipments"][0]
        self.assertEqual((shipment["carrier"], shipment["parcels"], shipment["internal_note"]), ("UPS", 2, "fragile"))
        order.refresh_from_db()
        self.assertEqual(order.tracking_carrier, "UPS")  # mirrored, like shipping does
        tracking = shipment["tracking_number"]
        # The platform's tracking number can't be edited, even if sent.
        res = self.patch(order, {"tracking_number": "HACKED"})
        self.assertEqual(res.status_code, 400)  # nothing it is allowed to change
        Order.objects.filter(pk=order.pk).update(order_status="Delivered")
        res = self.patch(order, {"contact_name": "Ama"})
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()["shipments"][0]["tracking_number"], tracking)

    def test_validation(self):
        order = self.order()
        client_for(self.staff).post(f"{URL}{order.pk}/ship/", {"carrier": "DHL"}, format="json")
        self.assertEqual(self.patch(order, {"carrier": ""}).status_code, 400)
        self.assertEqual(self.patch(order, {"length_cm": "10"}).status_code, 400)  # dimensions come together
        self.assertEqual(self.patch(order, {"dispatch_date": "2030-02-10", "estimated_delivery_date": "2030-02-01"}).status_code, 400)
        self.assertEqual(self.patch(order, {}).status_code, 400)
