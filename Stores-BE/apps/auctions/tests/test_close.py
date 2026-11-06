from datetime import timedelta
from decimal import Decimal
from unittest import mock

from django.test import TestCase
from django.utils import timezone

from apps.auctions import closing, services, tasks
from apps.auctions.constants import PAYMENT_WINDOW
from apps.auctions.errors import ApiError
from apps.auctions.models import Auction, Bid

from .helpers import make_order, make_seller, make_user, make_variant, orders_table_ready

class CloseBase(TestCase):
    def require_orders_table(self):
        if not orders_table_ready():
            self.skipTest("orders table lags the Order model (BE-ORD-1 migration pending)")

    def setUp(self):
        self.seller = make_seller()
        self.variant = make_variant(self.seller, quantity=5)
        self.alice = make_user("alice")
        self.bob = make_user("bob")

    def new_auction(self, *, quantity=2, **data):
        body = {
            "variant_id": self.variant.id,
            "title": "Lot",
            "quantity": quantity,
            "starting_price": Decimal("100.00"),
            "min_increment": Decimal("5.00"),
            "ends_at": timezone.now() + timedelta(days=2),
        }
        body.update(data)
        auction, _ = services.create_auction(
            seller=self.seller, data=body, idempotency_key=f"c{Auction.objects.count()}"
        )
        return auction

    def bid(self, auction, user, amount, key=None):
        return services.place_bid(
            auction_id=auction.pk, user=user, amount=Decimal(amount), idempotency_key=key or f"{user.pk}-{amount}"
        )

    def expire(self, auction):
        now = timezone.now()
        Auction.objects.filter(pk=auction.pk).update(
            starts_at=now - timedelta(days=3), ends_at=now - timedelta(seconds=1)
        )

    def stock(self):
        self.variant.refresh_from_db()
        return self.variant.quantity


class CloseTests(CloseBase):
    def test_14_no_bids_releases_stock(self):
        a = self.new_auction()
        self.assertEqual(self.stock(), 3)
        self.expire(a)
        self.assertEqual(closing.close_auction_now(a.pk), "closed")
        a.refresh_from_db()
        self.assertEqual((a.status, a.result), (Auction.STATUS_ENDED, "no_bids"))
        self.assertEqual(self.stock(), 5)
        self.assertIsNone(a.winner_id)
        self.assertEqual(a.settlement_status, Auction.SETTLEMENT_NONE)

    def test_15_reserve_not_met_releases_stock(self):
        a = self.new_auction(reserve_price=Decimal("200.00"))
        self.bid(a, self.alice, "150")
        self.expire(a)
        closing.close_auction_now(a.pk)
        a.refresh_from_db()
        self.assertEqual(a.result, "reserve_not_met")
        self.assertIsNone(a.winner_id)
        self.assertIsNone(a.winning_amount)
        self.assertEqual(self.stock(), 5)

    def test_16_sold_records_winner_and_keeps_stock_reserved(self):
        a = self.new_auction()
        self.bid(a, self.alice, "100")
        self.bid(a, self.bob, "110")
        self.expire(a)
        self.assertEqual(closing.close_auction_now(a.pk), "closed")
        a.refresh_from_db()
        self.assertEqual((a.status, a.result), (Auction.STATUS_ENDED, "sold"))
        self.assertEqual(a.winner_id, self.bob.id)
        self.assertEqual(a.winning_amount, Decimal("110.00"))
        self.assertEqual(a.payment_due_at, a.closed_at + PAYMENT_WINDOW)
        self.assertEqual(self.stock(), 3)  # lot stays reserved: no second decrement, no release
        # BE-ORD-1 hook is not implemented yet: closing records pending_order, no order.
        self.assertEqual(a.settlement_status, Auction.SETTLEMENT_PENDING_ORDER)
        self.assertIsNone(a.order_id)

    def test_hook_not_implemented_is_documented_behaviour(self):
        with self.assertRaises(NotImplementedError):
            services.create_winner_order(mock.Mock())

    def test_hook_failure_does_not_poison_close(self):
        a = self.new_auction()
        self.bid(a, self.alice, "100")
        self.expire(a)
        with mock.patch.object(services, "create_winner_order", side_effect=RuntimeError("boom")):
            self.assertEqual(closing.close_auction_now(a.pk), "closed")
        a.refresh_from_db()
        self.assertEqual(a.status, Auction.STATUS_ENDED)
        self.assertEqual(a.settlement_status, Auction.SETTLEMENT_PENDING_ORDER)

    def test_17_close_twice_calls_hook_once(self):
        a = self.new_auction()
        self.bid(a, self.alice, "100")
        self.expire(a)
        with mock.patch.object(services, "create_winner_order", side_effect=NotImplementedError) as hook:
            self.assertEqual(closing.close_auction_now(a.pk), "closed")
            self.assertEqual(closing.close_auction_now(a.pk), "noop")
        self.assertEqual(hook.call_count, 1)
        self.assertEqual(self.stock(), 3)

    def test_18_extended_auction_is_not_due(self):
        a = self.new_auction()
        Auction.objects.filter(pk=a.pk).update(ends_at=timezone.now() + timedelta(seconds=60))
        with mock.patch.object(services, "arm_close") as arm:
            with self.captureOnCommitCallbacks(execute=True):
                self.assertEqual(closing.close_auction_now(a.pk), "not_due")
        arm.assert_called_once()
        a.refresh_from_db()
        self.assertEqual(a.status, Auction.STATUS_LIVE)

    def test_18_far_future_is_not_rearmed(self):
        a = self.new_auction()
        with mock.patch.object(services, "arm_close") as arm:
            with self.captureOnCommitCallbacks(execute=True):
                self.assertEqual(closing.close_auction_now(a.pk), "not_due")
        arm.assert_not_called()

    def test_missing_and_cancelled_are_noops(self):
        import uuid

        self.assertEqual(closing.close_auction_now(uuid.uuid4()), "missing")
        a = self.new_auction()
        services.cancel_auction(auction_id=a.pk, seller=self.seller)
        self.expire(a)
        self.assertEqual(closing.close_auction_now(a.pk), "noop")
        self.assertEqual(self.stock(), 5)  # released once by cancel, not again by close

    def test_close_task_wrapper(self):
        a = self.new_auction()
        self.expire(a)
        self.assertEqual(tasks.close_auction.apply(args=(str(a.pk),)).get(), "closed")

    def test_notifications_on_close(self):
        a = self.new_auction()
        self.bid(a, self.alice, "100")
        self.bid(a, self.bob, "110")
        self.expire(a)
        with mock.patch.object(services, "notify_safe") as notify:
            with self.captureOnCommitCallbacks(execute=True):
                closing.close_auction_now(a.pk)
        sent = {(c.args[0], c.args[1]) for c in notify.call_args_list}
        self.assertIn((self.bob.id, "auction.won"), sent)
        self.assertIn((self.alice.id, "auction.lost"), sent)
        self.assertIn((self.seller.user_id, "auction.sold"), sent)

    def test_settle_retry_stays_pending_while_hook_missing(self):
        a = self.new_auction()
        self.bid(a, self.alice, "100")
        self.expire(a)
        closing.close_auction_now(a.pk)
        self.assertEqual(closing.settle_pending_order(a.pk), "pending")
        self.assertEqual(closing.settle_pending_orders(), 0)
        a.refresh_from_db()
        self.assertEqual(a.settlement_status, Auction.SETTLEMENT_PENDING_ORDER)

    def test_16_hook_success_links_order_once(self):
        self.require_orders_table()
        a = self.new_auction()
        self.bid(a, self.alice, "100")
        self.expire(a)
        order = make_order(self.alice)
        with mock.patch.object(services, "create_winner_order", return_value=order) as hook:
            closing.close_auction_now(a.pk)
            closing.close_auction_now(a.pk)
        a.refresh_from_db()
        self.assertEqual(a.order_id, order.pk)
        self.assertEqual(a.settlement_status, Auction.SETTLEMENT_ORDER_CREATED)
        self.assertEqual(hook.call_count, 1)

    def test_settle_retry_links_order_after_hook_lands(self):
        self.require_orders_table()
        a = self.new_auction()
        self.bid(a, self.alice, "100")
        self.expire(a)
        closing.close_auction_now(a.pk)  # hook missing -> pending
        order = make_order(self.alice)
        with mock.patch.object(services, "create_winner_order", return_value=order):
            self.assertEqual(closing.settle_pending_orders(), 1)
            self.assertEqual(closing.settle_pending_order(a.pk), "noop")
        a.refresh_from_db()
        self.assertEqual(a.order_id, order.pk)


class SweeperTests(CloseBase):
    def test_19_sweeper_activates_closes_and_arms(self):
        now = timezone.now()
        due_start = self.new_auction(
            starts_at=now + timedelta(hours=2), ends_at=now + timedelta(days=2), quantity=1
        )
        Auction.objects.filter(pk=due_start.pk).update(
            starts_at=now - timedelta(minutes=1), status=Auction.STATUS_SCHEDULED
        )
        overdue = self.new_auction(quantity=1)
        self.bid(overdue, self.alice, "100")
        self.expire(overdue)
        near = self.new_auction(quantity=1)
        Auction.objects.filter(pk=near.pk).update(ends_at=now + timedelta(seconds=45))
        far = self.new_auction(quantity=1)

        with mock.patch.object(services, "arm_close") as arm:
            summary = closing.sweep()
        self.assertEqual(summary, {"activated": 1, "closed": 1, "armed": 1})
        due_start.refresh_from_db(), overdue.refresh_from_db(), far.refresh_from_db()
        self.assertEqual(due_start.status, Auction.STATUS_LIVE)
        self.assertEqual(overdue.status, Auction.STATUS_ENDED)
        self.assertEqual(far.status, Auction.STATUS_LIVE)
        arm.assert_called_once()
        self.assertEqual(arm.call_args.args[0], near.pk)

    def test_sweeper_task_is_idempotent(self):
        a = self.new_auction()
        self.expire(a)
        self.assertEqual(tasks.sweep_auctions.apply().get()["closed"], 1)
        self.assertEqual(tasks.sweep_auctions.apply().get()["closed"], 0)
        self.assertEqual(self.stock(), 5)

    def test_sweeper_survives_one_failing_auction(self):
        a, b = self.new_auction(quantity=1), self.new_auction(quantity=1)
        self.expire(a)
        self.expire(b)
        real = closing.close_auction_now
        calls = []

        def flaky(auction_id):
            calls.append(auction_id)
            if len(calls) == 1:
                raise RuntimeError("boom")
            return real(auction_id)

        with mock.patch.object(closing, "close_auction_now", side_effect=flaky):
            summary = closing.sweep()
        self.assertEqual(summary["closed"], 1)


class BuyNowTests(CloseBase):
    def buy(self, auction, user, key="bn"):
        return services.buy_now(auction_id=auction.pk, user=user, idempotency_key=key)

    def test_20_buy_now_closes_immediately(self):
        a = self.new_auction(buy_now_price=Decimal("300.00"))
        auction, created = self.buy(a, self.alice)
        self.assertTrue(created)
        a.refresh_from_db()
        self.assertEqual((a.status, a.result), (Auction.STATUS_ENDED, "bought_now"))
        self.assertEqual(a.winner_id, self.alice.id)
        self.assertEqual(a.winning_amount, Decimal("300.00"))
        self.assertEqual(a.bid_count, 1)
        self.assertTrue(Bid.objects.get(auction=a).is_buy_now)
        self.assertEqual(self.stock(), 3)
        self.assertEqual(a.settlement_status, Auction.SETTLEMENT_PENDING_ORDER)

    def test_20_buy_now_replay_is_idempotent(self):
        a = self.new_auction(buy_now_price=Decimal("300.00"))
        self.buy(a, self.alice)
        _, created = self.buy(a, self.alice)
        self.assertFalse(created)
        self.assertEqual(Bid.objects.filter(auction=a).count(), 1)

    def test_20_unavailable_once_bids_exist(self):
        a = self.new_auction(buy_now_price=Decimal("300.00"))
        self.bid(a, self.alice, "100")
        with self.assertRaises(ApiError) as ctx:
            self.buy(a, self.bob)
        self.assertEqual(ctx.exception.status_code, 409)
        self.assertEqual(ctx.exception.detail["code"], "buy_now_unavailable")

    def test_20_unavailable_without_price_and_for_seller(self):
        a = self.new_auction()
        with self.assertRaises(ApiError) as ctx:
            self.buy(a, self.alice)
        self.assertEqual(ctx.exception.detail["code"], "buy_now_unavailable")
        b = self.new_auction(buy_now_price=Decimal("300.00"))
        with self.assertRaises(ApiError) as ctx:
            self.buy(b, self.seller.user)
        self.assertEqual(ctx.exception.detail["code"], "seller_cannot_bid")

    def test_20_unverified_cannot_buy_now(self):
        a = self.new_auction(buy_now_price=Decimal("300.00"))
        with self.assertRaises(ApiError) as ctx:
            self.buy(a, make_user("nope", verified=False))
        self.assertEqual(ctx.exception.detail["code"], "bidder_not_verified")

    def test_buy_now_key_reused_by_a_plain_bid_is_mismatch(self):
        a = self.new_auction(buy_now_price=Decimal("300.00"))
        self.bid(a, self.alice, "100", key="shared")
        with self.assertRaises(ApiError) as ctx:
            self.buy(a, self.alice, key="shared")
        self.assertEqual(ctx.exception.status_code, 422)
