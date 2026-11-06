from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.auctions import services
from apps.auctions.errors import ApiError
from apps.auctions.models import Auction, Bid
from apps.products.models import ProductVariant

from .helpers import create_payload, make_auction, make_seller, make_user, make_variant

BASE = "/tradehut/api/v1/auctions/"


def code_of(exc):
    return exc.exception.detail["code"]


class CreateAuctionServiceTests(TestCase):
    def setUp(self):
        self.seller = make_seller()
        self.variant = make_variant(self.seller, quantity=5)

    def create(self, key="c1", seller=None, **data):
        body = {
            "variant_id": self.variant.id,
            "title": "Lot",
            "quantity": 2,
            "starting_price": Decimal("100.00"),
            "min_increment": Decimal("5.00"),
            "ends_at": timezone.now() + timedelta(days=2),
        }
        body.update(data)
        return services.create_auction(seller=seller or self.seller, data=body, idempotency_key=key)

    def test_10_create_reserves_stock_and_is_idempotent(self):
        a, created = self.create()
        self.assertTrue(created)
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.quantity, 3)
        self.assertEqual(a.status, Auction.STATUS_LIVE)  # starts now
        self.assertEqual(a.currency, "GHS")
        self.assertEqual(a.original_ends_at, a.ends_at)
        again, created = self.create()
        self.assertFalse(created)
        self.assertEqual(again.pk, a.pk)
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.quantity, 3)  # not decremented twice

    def test_10_future_start_is_scheduled(self):
        a, _ = self.create(starts_at=timezone.now() + timedelta(days=1), ends_at=timezone.now() + timedelta(days=3))
        self.assertEqual(a.status, Auction.STATUS_SCHEDULED)

    def test_10_other_sellers_variant_is_404(self):
        intruder = make_seller("intruder")
        with self.assertRaises(ApiError) as ctx:
            self.create(seller=intruder)
        self.assertEqual(ctx.exception.status_code, 404)
        self.assertEqual(code_of(ctx), "variant_not_found")

    def test_10_insufficient_stock(self):
        with self.assertRaises(ApiError) as ctx:
            self.create(quantity=6)
        self.assertEqual(ctx.exception.status_code, 409)
        self.assertEqual(code_of(ctx), "insufficient_stock")
        self.assertEqual(ctx.exception.detail["available"], 5)
        self.assertEqual(Auction.objects.count(), 0)

    def test_unverified_seller_cannot_create(self):
        pending = make_seller("pending", status="pending")
        variant = make_variant(pending)
        with self.assertRaises(ApiError) as ctx:
            services.create_auction(
                seller=pending,
                data={
                    "variant_id": variant.id,
                    "title": "x",
                    "starting_price": Decimal("10"),
                    "min_increment": Decimal("1"),
                    "ends_at": timezone.now() + timedelta(days=1),
                },
                idempotency_key="u1",
            )
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertEqual(code_of(ctx), "seller_not_verified")


class CancelAndEditTests(TestCase):
    def setUp(self):
        self.seller = make_seller()
        self.variant = make_variant(self.seller, quantity=5)
        self.auction, _ = services.create_auction(
            seller=self.seller,
            data={
                "variant_id": self.variant.id,
                "title": "Lot",
                "quantity": 2,
                "starting_price": Decimal("100.00"),
                "min_increment": Decimal("5.00"),
                "starts_at": timezone.now() + timedelta(days=1),
                "ends_at": timezone.now() + timedelta(days=3),
            },
            idempotency_key="c",
        )

    def test_11_cancel_releases_stock_and_is_idempotent(self):
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.quantity, 3)
        a = services.cancel_auction(auction_id=self.auction.pk, seller=self.seller, reason="changed mind")
        self.assertEqual(a.status, Auction.STATUS_CANCELLED)
        self.assertEqual(a.cancel_reason, "changed mind")
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.quantity, 5)
        services.cancel_auction(auction_id=self.auction.pk, seller=self.seller)
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.quantity, 5)  # no double release

    def test_11_cancel_blocked_with_bids_or_when_ended(self):
        Auction.objects.filter(pk=self.auction.pk).update(
            status=Auction.STATUS_LIVE, starts_at=timezone.now() - timedelta(minutes=1)
        )
        services.place_bid(
            auction_id=self.auction.pk, user=make_user("b"), amount=Decimal("100"), idempotency_key="k"
        )
        with self.assertRaises(ApiError) as ctx:
            services.cancel_auction(auction_id=self.auction.pk, seller=self.seller)
        self.assertEqual(ctx.exception.status_code, 409)
        self.assertEqual(code_of(ctx), "not_cancellable")
        ended = make_auction(self.seller, status=Auction.STATUS_ENDED)
        with self.assertRaises(ApiError):
            services.cancel_auction(auction_id=ended.pk, seller=self.seller)

    def test_cancel_by_another_seller_is_404(self):
        other = make_seller("other")
        with self.assertRaises(ApiError) as ctx:
            services.cancel_auction(auction_id=self.auction.pk, seller=other)
        self.assertEqual(ctx.exception.status_code, 404)

    def test_edit_only_while_scheduled_and_unbid(self):
        a = services.update_auction(
            seller=self.seller, auction_id=self.auction.pk, data={"title": "New", "starting_price": Decimal("120.00")}
        )
        self.assertEqual((a.title, a.starting_price), ("New", Decimal("120.00")))
        Auction.objects.filter(pk=self.auction.pk).update(starts_at=timezone.now() - timedelta(minutes=1))
        with self.assertRaises(ApiError) as ctx:
            services.update_auction(seller=self.seller, auction_id=self.auction.pk, data={"title": "Late"})
        self.assertEqual(ctx.exception.status_code, 409)
        self.assertEqual(code_of(ctx), "not_editable")


class SellerApiTests(TestCase):
    def setUp(self):
        self.seller = make_seller()
        self.variant = make_variant(self.seller, quantity=5)
        self.client = APIClient()
        self.client.force_authenticate(self.seller.user)

    def post(self, body, key="idem-1"):
        return self.client.post(BASE + "seller/", body, format="json", HTTP_IDEMPOTENCY_KEY=key)

    def test_create_requires_idempotency_key(self):
        r = self.client.post(BASE + "seller/", create_payload(self.variant), format="json")
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()["code"], "idempotency_key_required")

    def test_create_201_then_200_replay(self):
        r = self.post(create_payload(self.variant))
        self.assertEqual(r.status_code, 201, r.content)
        body = r.json()
        self.assertEqual(body["display_status"], "live")
        self.assertEqual(body["reserve_price"], None)
        self.assertIn("server_time", body)
        r2 = self.post(create_payload(self.variant))
        self.assertEqual(r2.status_code, 200)
        self.assertEqual(r2.json()["id"], body["id"])
        self.assertEqual(Auction.objects.count(), 1)

    def test_create_field_rules(self):
        now = timezone.now()
        cases = {
            "reserve_price": dict(reserve_price="50.00"),
            "buy_now_price": dict(buy_now_price="100.00"),
            "ends_at": dict(ends_at=(now + timedelta(minutes=30)).isoformat()),
            "ends_at_long": dict(ends_at=(now + timedelta(days=15)).isoformat()),
            "starts_at": dict(starts_at=(now + timedelta(days=31)).isoformat()),
            "soft_close": dict(soft_close_seconds=601),
            "min_increment": dict(min_increment="0"),
            "amount_dp": dict(starting_price="10.001"),
        }
        for name, extra in cases.items():
            with self.subTest(name):
                r = self.post(create_payload(self.variant, **extra), key=f"k-{name}")
                self.assertEqual(r.status_code, 400, r.content)
        self.assertEqual(Auction.objects.count(), 0)

    def test_buy_now_must_exceed_reserve(self):
        r = self.post(create_payload(self.variant, reserve_price="150.00", buy_now_price="150.00"), key="a")
        self.assertEqual(r.status_code, 400)
        r = self.post(create_payload(self.variant, reserve_price="150.00", buy_now_price="151.00"), key="b")
        self.assertEqual(r.status_code, 201, r.content)

    def test_unverified_seller_gets_403_on_writes_but_can_read(self):
        pending = make_seller("pending", status="pending")
        client = APIClient()
        client.force_authenticate(pending.user)
        variant = make_variant(pending)
        r = client.post(BASE + "seller/", create_payload(variant), format="json", HTTP_IDEMPOTENCY_KEY="x")
        self.assertEqual(r.status_code, 403)
        self.assertEqual(r.json()["code"], "seller_not_verified")
        self.assertEqual(client.get(BASE + "seller/").status_code, 200)

    def test_non_seller_user_is_rejected(self):
        client = APIClient()
        client.force_authenticate(make_user("plain"))
        self.assertEqual(client.get(BASE + "seller/").status_code, 404)
        self.assertEqual(APIClient().get(BASE + "seller/").status_code, 401)

    def test_patch_cancel_and_detail_flow(self):
        r = self.post(create_payload(self.variant, starts_at=(timezone.now() + timedelta(days=1)).isoformat(),
                                     ends_at=(timezone.now() + timedelta(days=3)).isoformat()))
        auction_id = r.json()["id"]
        r = self.client.patch(BASE + f"seller/{auction_id}/", {"title": "Renamed"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()["title"], "Renamed")
        r = self.client.patch(BASE + f"seller/{auction_id}/", {"quantity": 3}, format="json")
        self.assertEqual(r.status_code, 400)
        r = self.client.post(BASE + f"seller/{auction_id}/cancel/", {"reason": "oops"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["status"], "cancelled")
        r = self.client.post(BASE + f"seller/{auction_id}/cancel/", {}, format="json")
        self.assertEqual(r.status_code, 200)
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.quantity, 5)
