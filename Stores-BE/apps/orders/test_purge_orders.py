import uuid
from datetime import timedelta
from io import StringIO

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import override_settings
from django.utils import timezone

from apps.products.models import ProductVariant

from . import payment_flow
from .models import CheckoutSession, Order, OrderItem, OrderPayment, OrderRefund, OrderShipment
from .test_refunds import RefundBase, refund_event


def run(*args):
    out = StringIO()
    call_command("purge_orders", *args, stdout=out)
    return out.getvalue()


@override_settings(DEBUG=True)
class PurgeOrdersTests(RefundBase):
    def cod(self, qty=1, key=None):
        variant = self.variant(self.seller_a, "100.00", qty=9)
        res = self.place(self.body((variant, qty)), key=key or f"cod-{uuid.uuid4().hex[:6]}")
        return variant, Order.objects.get(pk=res.json()["orders"][0]["id"])

    def test_it_only_previews_until_told_to_delete(self):
        self.cod(); self.cod()
        text = run("--all")
        self.assertIn("Would delete 2 orders", text)
        self.assertIn("This was a preview", text)
        self.assertEqual(Order.objects.count(), 2)  # nothing was touched

    def test_you_must_say_how_much(self):
        with self.assertRaises(CommandError):
            run("--yes")

    def test_all_orders_and_everything_attached_are_deleted(self):
        _, a = self.cod(); _, b = self.cod()
        OrderShipment.objects.create(order=a, tracking_number="THTEST00001", carrier="DHL")
        text = run("--all", "--yes")
        self.assertIn("Deleted 2 orders", text)
        self.assertEqual(Order.objects.count(), 0)
        self.assertEqual(OrderItem.objects.count(), 0)
        self.assertEqual(OrderPayment.objects.count(), 0)
        self.assertEqual(OrderShipment.objects.count(), 0)
        self.assertEqual(CheckoutSession.objects.count(), 0)  # sessions left with no orders go too
        self.assertTrue(ProductVariant.objects.exists())  # products themselves are never deleted

    def test_only_old_orders_when_a_cutoff_is_given(self):
        _, old = self.cod(); _, new = self.cod()
        Order.objects.filter(pk=old.pk).update(placed_at=timezone.now() - timedelta(days=100))
        run("--older-than-days", "30", "--yes")
        self.assertEqual(list(Order.objects.values_list("pk", flat=True)), [new.pk])

    def test_orders_with_a_payment_in_flight_are_never_deleted(self):
        variant = self.variant(self.seller_a, "100.00", qty=5)
        from unittest import mock

        from .test_paystack import INIT_OK

        with mock.patch("apps.payments.paystack.initialize", return_value=INIT_OK):
            res = self.place(self.body((variant, 1), payment_method="paystack"), key="in-flight")
        self.assertEqual(res.status_code, 201)
        text = run("--all", "--yes", "--include-paid")
        self.assertIn("still in flight", text)
        self.assertEqual(Order.objects.count(), 1)

    def test_orders_with_real_money_are_skipped_unless_asked(self):
        _, paid, _, _ = self.paid_order()
        _, free = self.cod()
        text = run("--all", "--yes")
        self.assertIn("real payments on record", text)
        self.assertEqual(list(Order.objects.values_list("pk", flat=True)), [paid.pk])
        # ...and removed, with their payments, only when you say so.
        run("--all", "--yes", "--include-paid")
        self.assertEqual(Order.objects.count(), 0)
        self.assertEqual(OrderPayment.objects.count(), 0)

    def test_refunds_are_deleted_before_the_payments_they_protect(self):
        _, order, payment, session = self.paid_order()
        self.refund(payment, "100.00")
        self.webhook(refund_event(session))  # the refund settles, so it is not "in flight"
        self.assertEqual(OrderRefund.objects.filter(status="succeeded").count(), 1)
        run("--all", "--yes", "--include-paid")
        self.assertEqual((Order.objects.count(), OrderPayment.objects.count(), OrderRefund.objects.count()), (0, 0, 0))

    def test_an_auction_that_pointed_at_the_order_is_left_intact(self):
        """The auction's winning-order link is declared with a hidden reverse name; it must still be cleared."""
        from apps.auctions.tests.helpers import make_auction

        variant, order = self.cod()
        auction = make_auction(self.seller_a, variant=variant, order=order)
        run("--all", "--yes")
        auction.refresh_from_db()
        self.assertIsNone(auction.order_id)
        self.assertEqual(Order.objects.count(), 0)

    def test_stock_is_returned_only_when_asked_and_only_for_unshipped_orders(self):
        variant, order = self.cod(qty=2)  # reserved 2 of 9
        variant.refresh_from_db()
        self.assertEqual(variant.quantity, 7)
        run("--all", "--yes")
        variant.refresh_from_db()
        self.assertEqual(variant.quantity, 7)  # default: stock untouched

        variant2, _ = self.cod(qty=3)
        variant3, shipped = self.cod(qty=1)
        Order.objects.filter(pk=shipped.pk).update(order_status="Shipped")
        run("--all", "--yes", "--restore-stock")
        variant2.refresh_from_db(); variant3.refresh_from_db()
        self.assertEqual(variant2.quantity, 9)  # never shipped: stock back
        self.assertEqual(variant3.quantity, 8)  # shipped: the goods left, so no stock comes back

    def test_seller_totals_are_recomputed(self):
        self.cod(); self.cod()
        self.seller_a.update_metrics()
        self.seller_a.refresh_from_db()
        self.assertEqual(self.seller_a.total_orders, 2)
        run("--all", "--yes")
        self.seller_a.refresh_from_db()
        self.assertEqual(self.seller_a.total_orders, 0)

    def test_it_names_the_database_it_is_pointed_at_but_never_a_password(self):
        text = run("--all")
        self.assertIn("Database:", text)
        self.assertNotIn("password", text.lower())

    def test_nothing_happens_when_there_is_nothing_to_delete(self):
        self.assertIn("Nothing to delete", run("--all", "--yes"))

    @override_settings(DEBUG=False)
    def test_it_refuses_to_delete_in_production_without_an_explicit_flag(self):
        self.cod()
        with self.assertRaises(CommandError) as ctx:
            run("--all", "--yes")
        self.assertIn("--allow-production", str(ctx.exception))
        self.assertEqual(Order.objects.count(), 1)
        self.assertIn("Would delete 1 orders", run("--all"))  # previewing is always fine
        run("--all", "--yes", "--allow-production")
        self.assertEqual(Order.objects.count(), 0)

    def test_a_failure_part_way_deletes_nothing(self):
        """The last step (recomputing seller totals) fails: the whole deletion must roll back, children included."""
        from unittest import mock

        self.cod(); self.cod()
        with mock.patch("apps.sellers.models.SellerProfile.update_metrics", side_effect=RuntimeError("disk full")):
            with self.assertRaises(RuntimeError):
                run("--all", "--yes")
        self.assertEqual(Order.objects.count(), 2)
        self.assertEqual(OrderItem.objects.count(), 2)
        self.assertEqual(OrderPayment.objects.count(), 2)
