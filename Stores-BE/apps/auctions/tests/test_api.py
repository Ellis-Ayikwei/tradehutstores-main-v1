import uuid
from datetime import timedelta
from decimal import Decimal

from django.core.cache import cache
from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework.test import APIClient

from apps.auctions import services
from apps.auctions.models import Auction

from .helpers import make_auction, make_seller, make_user, make_variant

BASE = "/tradehut/api/v1/auctions/"


class ApiBase(TestCase):
    def setUp(self):
        cache.clear()
        self.seller = make_seller()
        self.alice = make_user("alice")
        self.bob = make_user("bob")
        self.auction = make_auction(self.seller, title="Vintage lamp", reserve_price=Decimal("150.00"))

    def client_for(self, user=None):
        client = APIClient()
        if user is not None:
            client.force_authenticate(user)
        return client

    def bid(self, user, amount, key, auction=None):
        return self.client_for(user).post(
            BASE + f"{(auction or self.auction).pk}/bids/",
            {"amount": amount},
            format="json",
            HTTP_IDEMPOTENCY_KEY=key,
        )


class PublicReadTests(ApiBase):
    def test_25_anonymous_reads_a1_to_a4(self):
        anon = self.client_for()
        r = anon.get(BASE)
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertEqual(body["count"], 1)
        self.assertIn("server_time", body)
        card = body["results"][0]
        self.assertEqual(card["display_status"], "live")
        self.assertFalse(card["is_watching"])
        self.assertIs(card["reserve_met"], False)
        self.assertNotIn("reserve_price", card)
        self.assertEqual(card["next_min_bid"], "100.00")

        r = anon.get(BASE + f"{self.auction.pk}/")
        self.assertEqual(r.status_code, 200)
        detail = r.json()
        self.assertNotIn("reserve_price", detail)
        self.assertEqual(detail["seller"]["is_verified"], True)
        self.assertEqual(detail["product"]["name"], self.auction.variant.product.name)
        self.assertIn("server_time", detail)

        r = anon.get(BASE + f"{self.auction.pk}/state/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r["Cache-Control"], "no-store")
        self.assertIn("server_time", r.json())

        r = anon.get(BASE + f"{self.auction.pk}/bids/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["count"], 0)

    def test_25_anonymous_writes_are_401(self):
        anon = self.client_for()
        pk = self.auction.pk
        self.assertEqual(anon.post(BASE + f"{pk}/bids/", {"amount": "100"}, format="json").status_code, 401)
        self.assertEqual(anon.post(BASE + f"{pk}/buy-now/", {}, format="json").status_code, 401)
        self.assertEqual(anon.post(BASE + f"{pk}/watch/").status_code, 401)
        self.assertEqual(anon.delete(BASE + f"{pk}/watch/").status_code, 401)
        self.assertEqual(anon.get(BASE + "me/bidding/").status_code, 401)
        self.assertEqual(anon.get(BASE + "me/watching/").status_code, 401)

    def test_unknown_auction_is_404_with_code(self):
        r = self.client_for().get(BASE + f"{uuid.uuid4()}/")
        self.assertEqual(r.status_code, 404)
        self.assertEqual(r.json()["code"], "auction_not_found")

    def test_cancelled_and_unverified_seller_visibility(self):
        cancelled = make_auction(self.seller, status=Auction.STATUS_CANCELLED)
        ghost_seller = make_seller("ghost", status="pending")
        ghost = make_auction(ghost_seller)
        anon = self.client_for()
        self.assertEqual(anon.get(BASE + f"{cancelled.pk}/").status_code, 404)
        self.assertEqual(anon.get(BASE + f"{ghost.pk}/").status_code, 404)
        self.assertEqual(self.client_for(self.alice).get(BASE + f"{cancelled.pk}/").status_code, 404)
        self.assertEqual(self.client_for(self.seller.user).get(BASE + f"{cancelled.pk}/").status_code, 200)
        self.assertEqual(self.client_for(ghost_seller.user).get(BASE + f"{ghost.pk}/").status_code, 200)
        ids = {row["id"] for row in anon.get(BASE).json()["results"]}
        self.assertEqual(ids, {str(self.auction.pk)})

    def test_list_filters_and_sort(self):
        now = timezone.now()
        soon = make_auction(self.seller, title="Soon", ends_at=now + timedelta(minutes=30))
        upcoming = make_auction(
            self.seller, title="Upcoming", status=Auction.STATUS_SCHEDULED,
            starts_at=now + timedelta(hours=1), ends_at=now + timedelta(hours=9),
        )
        ended = make_auction(self.seller, title="Done", status=Auction.STATUS_ENDED)
        anon = self.client_for()

        def ids(**params):
            r = anon.get(BASE, params)
            self.assertEqual(r.status_code, 200, r.content)
            return [row["id"] for row in r.json()["results"]]

        self.assertEqual(ids(status="ending_soon"), [str(soon.pk)])
        self.assertEqual(ids(status="live"), [str(self.auction.pk)])
        self.assertEqual(ids(status="scheduled"), [str(upcoming.pk)])
        self.assertEqual(ids(status="ended"), [str(ended.pk)])
        self.assertEqual(ids(q="lamp"), [str(self.auction.pk)])
        self.assertEqual(ids(seller=str(self.seller.pk), sort="ending_soonest")[0], str(soon.pk))
        self.assertEqual(anon.get(BASE, {"status": "nope"}).status_code, 400)
        self.assertEqual(anon.get(BASE, {"sort": "nope"}).json()["code"], "bad_filter")
        self.assertEqual(anon.get(BASE, {"seller": "not-a-uuid"}).status_code, 400)


class BidApiTests(ApiBase):
    def test_a5_201_then_200_replay(self):
        r = self.bid(self.alice, "100.00", "key-1")
        self.assertEqual(r.status_code, 201, r.content)
        body = r.json()
        self.assertEqual(body["bid"]["amount"], "100.00")
        self.assertEqual(body["state"]["current_price"], "100.00")
        self.assertEqual(body["state"]["my_status"], "winning")
        self.assertEqual(body["state"]["next_min_bid"], "105.00")
        self.assertIs(body["state"]["reserve_met"], False)
        r2 = self.bid(self.alice, "100.00", "key-1")
        self.assertEqual(r2.status_code, 200)
        self.assertEqual(r2.json()["bid"]["id"], body["bid"]["id"])

    def test_a5_error_codes(self):
        pk = self.auction.pk
        client = self.client_for(self.alice)
        r = client.post(BASE + f"{pk}/bids/", {"amount": "100"}, format="json")
        self.assertEqual((r.status_code, r.json()["code"]), (400, "idempotency_key_required"))
        r = self.bid(self.alice, "abc", "k")
        self.assertEqual((r.status_code, r.json()["code"]), (400, "invalid_amount"))
        r = self.bid(self.alice, "100.005", "k")
        self.assertEqual((r.status_code, r.json()["code"]), (400, "invalid_amount"))
        r = self.bid(self.alice, "-5", "k")
        self.assertEqual(r.json()["code"], "invalid_amount")
        r = self.bid(self.alice, "50", "k")
        self.assertEqual((r.status_code, r.json()["code"]), (409, "bid_too_low"))
        self.assertEqual(r.json()["min_next_bid"], "100.00")
        self.assertIn("detail", r.json())
        r = self.bid(self.seller.user, "100", "k")
        self.assertEqual((r.status_code, r.json()["code"]), (403, "seller_cannot_bid"))
        r = self.bid(make_user("unv", verified=False), "100", "k")
        self.assertEqual((r.status_code, r.json()["code"]), (403, "bidder_not_verified"))
        self.assertEqual(self.bid(self.alice, "100", "k1").status_code, 201)
        r = self.bid(self.alice, "200", "k2")
        self.assertEqual((r.status_code, r.json()["code"]), (409, "already_winning"))
        r = self.bid(self.alice, "999", "k1")
        self.assertEqual((r.status_code, r.json()["code"]), (422, "idempotency_key_mismatch"))
        r = self.bid(self.bob, "105", "kb", auction=make_auction(self.seller, status=Auction.STATUS_ENDED))
        self.assertEqual((r.status_code, r.json()["code"]), (409, "auction_not_live"))

    def test_a4_masks_bidders_and_marks_me(self):
        self.bid(self.alice, "100", "a")
        self.bid(self.bob, "110", "b")
        r = self.client_for(self.alice).get(BASE + f"{self.auction.pk}/bids/")
        rows = r.json()["results"]
        self.assertEqual([row["amount"] for row in rows], ["110.00", "100.00"])
        self.assertEqual([row["is_me"] for row in rows], [False, True])
        self.assertEqual(rows[0]["bidder"], "B***b")
        self.assertNotIn("@", r.content.decode())

    def test_a3_state_has_masked_leader_and_viewer_status(self):
        self.bid(self.alice, "100", "a")
        self.bid(self.bob, "110", "b")
        state = self.client_for(self.alice).get(BASE + f"{self.auction.pk}/state/").json()
        self.assertEqual(state["my_status"], "outbid")
        self.assertEqual(state["my_highest_bid"], "100.00")
        self.assertEqual(state["leading_bidder"], "B***b")
        anon = self.client_for().get(BASE + f"{self.auction.pk}/state/").json()
        self.assertIsNone(anon["my_status"])

    def test_a6_buy_now(self):
        a = make_auction(self.seller, buy_now_price=Decimal("300.00"))
        card = self.client_for(self.alice).get(BASE + f"{a.pk}/state/").json()
        self.assertTrue(card["buy_now_available"])
        self.assertEqual(card["buy_now_price"], "300.00")
        r = self.client_for(self.alice).post(BASE + f"{a.pk}/buy-now/", {}, format="json", HTTP_IDEMPOTENCY_KEY="bn")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()["state"]["display_status"], "ended")
        self.assertEqual(r.json()["state"]["my_status"], "won")
        r = self.client_for(self.alice).post(BASE + f"{a.pk}/buy-now/", {}, format="json", HTTP_IDEMPOTENCY_KEY="bn")
        self.assertEqual(r.status_code, 200)
        r = self.client_for(self.bob).post(BASE + f"{a.pk}/buy-now/", {}, format="json", HTTP_IDEMPOTENCY_KEY="bn2")
        self.assertEqual(r.status_code, 409)

    def test_a7_watch_toggle(self):
        pk = self.auction.pk
        client = self.client_for(self.alice)
        self.assertEqual(client.post(BASE + f"{pk}/watch/").json(), {"is_watching": True})
        self.assertEqual(client.post(BASE + f"{pk}/watch/").json(), {"is_watching": True})
        self.assertTrue(client.get(BASE + f"{pk}/state/").json()["is_watching"])
        self.assertEqual(client.get(BASE + "me/watching/").json()["count"], 1)
        self.assertEqual(client.delete(BASE + f"{pk}/watch/").json(), {"is_watching": False})
        self.assertEqual(client.get(BASE + "me/watching/").json()["count"], 0)
        self.assertEqual(client.post(BASE + f"{uuid.uuid4()}/watch/").status_code, 404)

    def test_a8_my_bidding_filters(self):
        other = make_auction(self.seller, title="Second")
        self.bid(self.alice, "100", "a1")
        self.bid(self.bob, "105", "b1")  # alice outbid on self.auction
        self.bid(self.alice, "100", "a2", auction=other)  # alice winning on other
        client = self.client_for(self.alice)

        def rows(**params):
            r = client.get(BASE + "me/bidding/", params)
            self.assertEqual(r.status_code, 200, r.content)
            return {row["id"]: row for row in r.json()["results"]}

        everything = rows()
        self.assertEqual(everything[str(self.auction.pk)]["my_status"], "outbid")
        self.assertEqual(everything[str(other.pk)]["my_status"], "winning")
        self.assertEqual(everything[str(other.pk)]["my_highest_bid"], "100.00")
        self.assertEqual(set(rows(my_status="winning")), {str(other.pk)})
        self.assertEqual(set(rows(my_status="outbid")), {str(self.auction.pk)})
        self.assertEqual(rows(my_status="won"), {})
        Auction.objects.filter(pk=other.pk).update(status=Auction.STATUS_ENDED, winner=self.alice)
        won = rows(my_status="won")
        self.assertEqual(set(won), {str(other.pk)})
        self.assertEqual(won[str(other.pk)]["my_status"], "won")
        self.assertEqual(client.get(BASE + "me/bidding/", {"my_status": "x"}).status_code, 400)

    def test_bid_rate_limit(self):
        from unittest import mock

        with mock.patch("apps.auctions.views.BidThrottle.get_rate", return_value="2/min"):
            statuses = [self.bid(self.alice, "100", f"k{i}").status_code for i in range(3)]
        self.assertEqual(statuses[-1], 429)


class SellerIsolationTests(ApiBase):
    def test_26_seller_b_gets_404_on_seller_a_resources(self):
        a_auction = make_auction(self.seller)
        other = make_seller("otherseller")
        client = self.client_for(other.user)
        self.assertEqual(client.get(BASE + f"seller/{a_auction.pk}/").status_code, 404)
        self.assertEqual(client.patch(BASE + f"seller/{a_auction.pk}/", {"title": "x"}, format="json").status_code, 404)
        self.assertEqual(client.post(BASE + f"seller/{a_auction.pk}/cancel/", {}, format="json").status_code, 404)
        self.assertEqual(client.get(BASE + "seller/").json()["count"], 0)
        mine = self.client_for(self.seller.user).get(BASE + "seller/").json()
        self.assertEqual(mine["count"], 2)
        self.assertIn("reserve_price", mine["results"][0])

    def test_buyers_cannot_reach_seller_endpoints(self):
        r = self.client_for(self.alice).get(BASE + f"seller/{self.auction.pk}/")
        self.assertIn(r.status_code, (403, 404))
        self.assertEqual(r.json()["code"], "not_a_seller")

    def test_seller_detail_shows_bids_with_display_names(self):
        self.bid(self.alice, "100", "a")
        r = self.client_for(self.seller.user).get(BASE + f"seller/{self.auction.pk}/")
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertEqual(body["reserve_price"], "150.00")
        self.assertEqual(body["bids"][0]["bidder_display"], "Alice T.")
        self.assertNotIn("@", r.content.decode())


class QueryBudgetTests(ApiBase):
    """Test 27: the query count is flat in the number of rows (no N+1)."""

    def populate(self, n):
        for i in range(n):
            a = make_auction(self.seller, title=f"Lot {i}")
            services.place_bid(
                auction_id=a.pk, user=self.alice, amount=Decimal("100"), idempotency_key=f"seed{a.pk}"
            )
            services.set_watch(auction=a, user=self.alice, watching=True)

    def count_queries(self, url, user):
        client = self.client_for(user)
        client.get(url)  # warm caches (content types, etc.)
        with CaptureQueriesContext(connection) as ctx:
            r = client.get(url, {"page_size": 20})
        self.assertEqual(r.status_code, 200)
        return len(ctx), r.json()["count"]

    def test_27_list_and_my_bidding_are_flat(self):
        self.populate(3)
        small_list, n_small = self.count_queries(BASE, self.alice)
        small_bids, _ = self.count_queries(BASE + "me/bidding/", self.alice)
        small_watch, _ = self.count_queries(BASE + "me/watching/", self.alice)
        self.populate(15)
        big_list, n_big = self.count_queries(BASE, self.alice)
        big_bids, _ = self.count_queries(BASE + "me/bidding/", self.alice)
        big_watch, _ = self.count_queries(BASE + "me/watching/", self.alice)
        self.assertGreater(n_big, n_small)
        self.assertEqual(small_list, big_list)
        self.assertEqual(small_bids, big_bids)
        self.assertEqual(small_watch, big_watch)
        self.assertLessEqual(big_list, 8)
        self.assertLessEqual(big_bids, 8)
