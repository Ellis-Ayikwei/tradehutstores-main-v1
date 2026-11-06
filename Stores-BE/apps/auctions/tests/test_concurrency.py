"""Concurrency tests (plan 10 section 8, tests 21-24).

These need real row locks, so they run on PostgreSQL only; SQLite ignores
``select_for_update`` and would give a false pass. Run locally with:

    $env:DATABASE_URL='postgresql://USER:PASS@localhost:5432/tradehut_dev'
    python manage.py test apps.auctions.tests.test_concurrency

(The test runner creates and destroys a separate ``test_<name>`` database; never point
DATABASE_URL at the Railway database.)
"""

import threading
from datetime import timedelta
from decimal import Decimal
from unittest import mock, skipUnless

from django.db import connection
from django.test import TransactionTestCase
from django.utils import timezone

from apps.auctions import closing, services
from apps.auctions.errors import ApiError
from apps.auctions.models import Auction, Bid

from .helpers import make_auction, make_seller, make_user


def run_concurrently(callables):
    """Run each callable in its own thread, released together by a barrier.

    Returns a list of ``("ok", value)`` / ``("err", exception)`` in input order.
    """
    barrier = threading.Barrier(len(callables))
    results = [None] * len(callables)

    def worker(i, fn):
        try:
            barrier.wait(timeout=10)
            results[i] = ("ok", fn())
        except Exception as exc:  # noqa: BLE001 - the test inspects every outcome
            results[i] = ("err", exc)
        finally:
            connection.close()

    threads = [threading.Thread(target=worker, args=(i, fn)) for i, fn in enumerate(callables)]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=30)
    return results


def api_code(result):
    kind, value = result
    return value.detail["code"] if kind == "err" and isinstance(value, ApiError) else None


@skipUnless(connection.vendor == "postgresql", "needs PostgreSQL row locks (SQLite ignores select_for_update)")
class ConcurrentBidTests(TransactionTestCase):
    def setUp(self):
        self.seller = make_seller()
        self.auction = make_auction(self.seller, soft_close_seconds=0)

    def bid_fn(self, user, amount):
        return lambda: services.place_bid(
            auction_id=self.auction.pk, user=user, amount=Decimal(amount), idempotency_key=f"k-{user.pk}"
        )

    def test_21_same_amount_exactly_one_wins(self):
        users = [make_user("racer"), make_user("racer")]
        results = run_concurrently([self.bid_fn(u, "100.00") for u in users])
        self.assertEqual(sorted(r[0] for r in results), ["err", "ok"])
        self.assertEqual([api_code(r) for r in results if r[0] == "err"], ["bid_too_low"])
        self.assertEqual(Bid.objects.filter(auction=self.auction).count(), 1)
        self.auction.refresh_from_db()
        self.assertEqual(self.auction.bid_count, 1)
        self.assertEqual(self.auction.current_price, Decimal("100.00"))

    def test_22_mixed_amounts_stay_monotonic(self):
        amounts = ["100.00", "105.00", "110.00", "115.00", "120.00", "125.00", "130.00", "135.00", "140.00", "145.00"]
        users = [make_user("racer") for _ in amounts]
        results = run_concurrently([self.bid_fn(u, a) for u, a in zip(users, amounts)])
        unexpected = [r for r in results if r[0] == "err" and api_code(r) not in ("bid_too_low",)]
        self.assertEqual(unexpected, [])
        accepted = list(Bid.objects.filter(auction=self.auction).order_by("placed_at", "amount"))
        self.assertTrue(accepted)
        amounts_in_time = [b.amount for b in accepted]
        self.assertEqual(amounts_in_time, sorted(set(amounts_in_time)))  # strictly increasing
        self.auction.refresh_from_db()
        self.assertEqual(self.auction.bid_count, len(accepted))
        self.assertEqual(self.auction.current_price, max(amounts_in_time))
        self.assertEqual(self.auction.leading_bid.amount, self.auction.current_price)


@skipUnless(connection.vendor == "postgresql", "needs PostgreSQL row locks (SQLite ignores select_for_update)")
class ConcurrentCloseTests(TransactionTestCase):
    def setUp(self):
        self.seller = make_seller()
        self.alice = make_user("alice")

    def expired_auction_with_bid(self, **kw):
        a = make_auction(self.seller, **kw)
        services.place_bid(auction_id=a.pk, user=self.alice, amount=Decimal("100"), idempotency_key="seed")
        now = timezone.now()
        Auction.objects.filter(pk=a.pk).update(starts_at=now - timedelta(days=1), ends_at=now - timedelta(seconds=1))
        return a

    def test_23_two_concurrent_closes_run_the_order_hook_once(self):
        a = self.expired_auction_with_bid()
        with mock.patch.object(services, "create_winner_order", side_effect=NotImplementedError) as hook:
            results = run_concurrently([lambda: closing.close_auction_now(a.pk)] * 2)
        self.assertEqual(sorted(r[1] for r in results if r[0] == "ok"), ["closed", "noop"])
        self.assertEqual(hook.call_count, 1)
        a.refresh_from_db()
        self.assertEqual((a.status, a.result), (Auction.STATUS_ENDED, "sold"))

    def test_24_buy_now_vs_bid_race_has_one_outcome(self):
        a = make_auction(self.seller, buy_now_price=Decimal("300.00"), soft_close_seconds=0)
        buyer, bidder = make_user("buyer"), make_user("bidder")
        results = run_concurrently(
            [
                lambda: services.buy_now(auction_id=a.pk, user=buyer, idempotency_key="bn"),
                lambda: services.place_bid(
                    auction_id=a.pk, user=bidder, amount=Decimal("100"), idempotency_key="b1"
                ),
            ]
        )
        self.assertEqual(sum(1 for r in results if r[0] == "ok"), 1)
        a.refresh_from_db()
        self.assertEqual(a.bid_count, 1)
        if a.status == Auction.STATUS_ENDED:
            self.assertEqual(a.result, "bought_now")
            self.assertEqual(api_code(results[1]), "auction_not_live")
        else:
            self.assertEqual(a.status, Auction.STATUS_LIVE)
            self.assertEqual(api_code(results[0]), "buy_now_unavailable")
