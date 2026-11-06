from datetime import timedelta
from decimal import Decimal
from unittest import mock

from django.test import TestCase
from django.utils import timezone

from apps.auctions import services
from apps.auctions.errors import ApiError
from apps.auctions.models import Auction, Bid, compute_my_status

from .helpers import make_auction, make_seller, make_user


def code_of(exc):
    return exc.exception.detail["code"]


class PlaceBidTests(TestCase):
    def setUp(self):
        self.seller = make_seller()
        self.auction = make_auction(self.seller)
        self.alice = make_user("alice")
        self.bob = make_user("bob")

    def bid(self, user, amount, key="k1", auction=None):
        return services.place_bid(
            auction_id=(auction or self.auction).pk,
            user=user,
            amount=Decimal(amount),
            idempotency_key=key,
        )

    def test_01_first_bid_must_reach_starting_price(self):
        with self.assertRaises(ApiError) as ctx:
            self.bid(self.alice, "99.99")
        self.assertEqual(code_of(ctx), "bid_too_low")
        self.assertEqual(ctx.exception.detail["min_next_bid"], "100.00")
        bid, created = self.bid(self.alice, "100.00")
        self.assertTrue(created)
        self.auction.refresh_from_db()
        self.assertEqual(self.auction.current_price, Decimal("100.00"))
        self.assertEqual(self.auction.bid_count, 1)
        self.assertEqual(self.auction.leading_bid_id, bid.id)

    def test_02_bid_below_current_plus_increment(self):
        self.bid(self.alice, "100.00")
        with self.assertRaises(ApiError) as ctx:
            self.bid(self.bob, "104.99", key="k2")
        self.assertEqual(code_of(ctx), "bid_too_low")
        self.assertEqual(ctx.exception.status_code, 409)
        self.assertEqual(ctx.exception.detail["min_next_bid"], "105.00")
        self.bid(self.bob, "105.00", key="k2")

    def test_03_seller_cannot_bid(self):
        with self.assertRaises(ApiError) as ctx:
            self.bid(self.seller.user, "100.00")
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertEqual(code_of(ctx), "seller_cannot_bid")

    def test_04_unverified_bidder_rejected(self):
        stranger = make_user("stranger", verified=False)
        with self.assertRaises(ApiError) as ctx:
            self.bid(stranger, "100.00")
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertEqual(code_of(ctx), "bidder_not_verified")

    def test_04b_phone_verified_is_enough(self):
        from apps.authentication.models import UserVerification

        phone_user = make_user("phoney", verified=False)
        UserVerification.objects.create(user=phone_user, phone_verified=True)
        bid, created = self.bid(phone_user, "100.00")
        self.assertTrue(created)

    def test_05_not_live_before_start_and_after_end(self):
        future = make_auction(
            self.seller,
            status=Auction.STATUS_SCHEDULED,
            starts_at=timezone.now() + timedelta(hours=1),
            ends_at=timezone.now() + timedelta(hours=5),
        )
        with self.assertRaises(ApiError) as ctx:
            self.bid(self.alice, "100.00", auction=future)
        self.assertEqual(ctx.exception.status_code, 409)
        self.assertEqual(code_of(ctx), "auction_not_live")

        after_end = self.auction.ends_at + timedelta(seconds=1)
        with mock.patch("django.utils.timezone.now", return_value=after_end):
            with self.assertRaises(ApiError) as ctx:
                self.bid(self.alice, "100.00")
        self.assertEqual(code_of(ctx), "auction_not_live")
        self.assertEqual(Bid.objects.count(), 0)

    def test_05b_cancelled_and_unverified_seller_auctions_reject(self):
        self.auction.status = Auction.STATUS_CANCELLED
        self.auction.save()
        with self.assertRaises(ApiError) as ctx:
            self.bid(self.alice, "100.00")
        self.assertEqual(code_of(ctx), "auction_not_live")

        other = make_seller("other", status="suspended")
        auction = make_auction(other)
        with self.assertRaises(ApiError) as ctx:
            self.bid(self.alice, "100.00", auction=auction)
        self.assertEqual(code_of(ctx), "auction_not_live")

    def test_06_leader_cannot_rebid(self):
        self.bid(self.alice, "100.00")
        with self.assertRaises(ApiError) as ctx:
            self.bid(self.alice, "200.00", key="k2")
        self.assertEqual(ctx.exception.status_code, 409)
        self.assertEqual(code_of(ctx), "already_winning")

    def test_07_replay_is_idempotent_and_mismatch_is_422(self):
        first, created = self.bid(self.alice, "100.00", key="same")
        self.assertTrue(created)
        again, created = self.bid(self.alice, "100.00", key="same")
        self.assertFalse(created)
        self.assertEqual(first.id, again.id)
        self.auction.refresh_from_db()
        self.assertEqual(self.auction.bid_count, 1)
        self.assertEqual(Bid.objects.count(), 1)
        with self.assertRaises(ApiError) as ctx:
            self.bid(self.alice, "150.00", key="same")
        self.assertEqual(ctx.exception.status_code, 422)
        self.assertEqual(code_of(ctx), "idempotency_key_mismatch")

    def test_08_anti_snipe_extends_only_inside_window(self):
        original_end = self.auction.ends_at
        self.bid(self.alice, "100.00")
        self.auction.refresh_from_db()
        self.assertEqual(self.auction.ends_at, original_end)  # 3h left: no extension

        near = timezone.now() + timedelta(seconds=30)
        Auction.objects.filter(pk=self.auction.pk).update(ends_at=near)
        before = timezone.now()
        with self.captureOnCommitCallbacks(execute=True):
            self.bid(self.bob, "105.00", key="k2")
        self.auction.refresh_from_db()
        self.assertGreater(self.auction.ends_at, near)
        self.assertGreaterEqual(self.auction.ends_at, before + timedelta(seconds=119))
        self.assertEqual(self.auction.original_ends_at, original_end)  # audit field untouched

    def test_08b_soft_close_zero_never_extends(self):
        a = make_auction(self.seller, soft_close_seconds=0, ends_at=timezone.now() + timedelta(seconds=10))
        end = a.ends_at
        self.bid(self.alice, "100.00", auction=a)
        a.refresh_from_db()
        self.assertEqual(a.ends_at, end)

    def test_09_lazy_activation(self):
        a = make_auction(
            self.seller,
            status=Auction.STATUS_SCHEDULED,
            starts_at=timezone.now() - timedelta(minutes=1),
        )
        self.bid(self.alice, "100.00", auction=a)
        a.refresh_from_db()
        self.assertEqual(a.status, Auction.STATUS_LIVE)

    def test_price_uniqueness_backstop(self):
        # A stray row already holds this price; the DB constraint turns the clash into bid_too_low.
        Bid.objects.create(
            auction=self.auction, bidder=self.bob, amount=Decimal("100.00"), idempotency_key="x"
        )
        with self.assertRaises(ApiError) as ctx:
            self.bid(self.alice, "100.00")
        self.assertEqual(code_of(ctx), "bid_too_low")

    def test_amount_is_quantized_to_cents(self):
        bid, _ = self.bid(self.alice, "100.004")
        self.assertEqual(bid.amount, Decimal("100.00"))


class DisplayAndMyStatusTests(TestCase):
    def setUp(self):
        self.seller = make_seller()
        self.now = timezone.now()

    def auction(self, **kw):
        return make_auction(self.seller, **kw)

    def test_12_my_status_matrix(self):
        me, other = make_user("me"), make_user("other")
        live = self.auction()
        ended = self.auction(status=Auction.STATUS_ENDED, winner=me)
        lost = self.auction(status=Auction.STATUS_ENDED, winner=other)
        no_winner = self.auction(status=Auction.STATUS_ENDED)

        def status(a, *, has_bid=True, leader=None):
            return compute_my_status(a, user_id=me.id, has_bid=has_bid, leader_id=leader)

        self.assertIsNone(status(live, has_bid=False))
        self.assertEqual(status(live, leader=me.id), "winning")
        self.assertEqual(status(live, leader=other.id), "outbid")
        self.assertEqual(status(ended, leader=me.id), "won")
        self.assertEqual(status(lost, leader=other.id), "lost")
        self.assertEqual(status(no_winner), "lost")  # incl. reserve_not_met
        self.assertIsNone(status(ended, has_bid=False))

    def test_13_display_status_matrix(self):
        now = self.now
        cancelled = self.auction(status=Auction.STATUS_CANCELLED)
        ended = self.auction(status=Auction.STATUS_ENDED)
        overdue = self.auction(ends_at=now - timedelta(seconds=1), starts_at=now - timedelta(hours=2))
        scheduled = self.auction(
            status=Auction.STATUS_SCHEDULED, starts_at=now + timedelta(hours=1), ends_at=now + timedelta(hours=9)
        )
        ending = self.auction(ends_at=now + timedelta(minutes=59))
        live = self.auction(ends_at=now + timedelta(hours=2))
        self.assertEqual(cancelled.display_status(now), "cancelled")
        self.assertEqual(ended.display_status(now), "ended")
        self.assertEqual(overdue.display_status(now), "ended")
        self.assertEqual(scheduled.display_status(now), "scheduled")
        self.assertEqual(ending.display_status(now), "ending_soon")
        self.assertEqual(live.display_status(now), "live")

    def test_reserve_met_never_exposes_value(self):
        a = self.auction(reserve_price=Decimal("150.00"))
        self.assertIs(a.reserve_met(), False)
        a.current_price = Decimal("150.00")
        self.assertIs(a.reserve_met(), True)
        self.assertIsNone(self.auction().reserve_met())
