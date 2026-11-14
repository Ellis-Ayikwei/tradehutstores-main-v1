"""Seller purchase flow (P1 to P6 reads and P3): price, idempotency, overlap, capacity, isolation."""

import threading
from datetime import timedelta
from decimal import Decimal
from unittest import mock

from django.db import close_old_connections, connection
from django.test import TransactionTestCase, skipUnlessDBFeature
from django.utils import timezone

from apps.ads.sponsored_models import SponsoredPromotion
from apps.auctions.tests.helpers import make_seller, make_user
from apps.payments import paystack

from .test_sponsored_base import BASE, INIT_OK, SponsoredBase, client_for, make_package, make_product, paystack_on


class PurchaseTests(SponsoredBase):
    def test_creates_awaiting_payment_row_with_price_copied_from_the_package(self):
        res = self.buy()
        self.assertEqual(res.status_code, 201, res.content)
        body = res.json()
        promotion = self.promotion_from(res)
        self.assertEqual(promotion.status, "awaiting_payment")
        self.assertEqual(promotion.price_paid, Decimal("50.00"))
        self.assertEqual(promotion.currency, "GHS")
        self.assertEqual(promotion.surfaces, ["search", "category"])
        self.assertEqual(promotion.duration_days, 7)
        self.assertTrue(promotion.reference.startswith("spn_"))
        self.assertEqual(body["reference"], promotion.reference)
        self.assertEqual(body["authorization_url"], INIT_OK["authorization_url"])
        self.assertEqual(body["promotion"]["display_status"], "awaiting_payment")
        kwargs = self.initialize.call_args.kwargs
        self.assertEqual(kwargs["amount_minor"], 5000)
        self.assertEqual(kwargs["currency"], "GHS")
        self.assertEqual(kwargs["reference"], promotion.reference)
        self.assertEqual(kwargs["callback_url"], f"http://localhost:3001/seller-central/promotions/{promotion.pk}?paid=1")

    def test_client_price_is_ignored_and_later_package_edits_do_not_change_it(self):
        res = self.buy(price="0.01", price_paid="0.01")
        promotion = self.promotion_from(res)
        self.assertEqual(promotion.price_paid, Decimal("50.00"))
        self.package.price = Decimal("99.00")
        self.package.save()
        promotion.refresh_from_db()
        self.assertEqual(promotion.price_paid, Decimal("50.00"))

    def test_replay_with_the_same_key_returns_200_and_the_same_body(self):
        first = self.buy(key="same-key")
        replay = self.buy(key="same-key")
        self.assertEqual((first.status_code, replay.status_code), (201, 200))
        self.assertEqual(first.json(), replay.json())
        self.assertEqual(SponsoredPromotion.objects.count(), 1)
        self.initialize.assert_not_called()  # the replay never touches Paystack

    def test_key_is_required_and_capped_at_64_characters(self):
        body = {"product_id": str(self.product.pk), "package_id": str(self.package.pk)}
        res = client_for(self.seller.user).post(BASE + "seller/", body, format="json")
        self.assertEqual((res.status_code, res.json()["code"]), (400, "idempotency_key_required"))
        res = client_for(self.seller.user).post(BASE + "seller/", body, format="json", HTTP_IDEMPOTENCY_KEY="k" * 65)
        self.assertEqual((res.status_code, res.json()["code"]), (400, "idempotency_key_invalid"))

    def test_unverified_seller_is_refused(self):
        pending = make_seller("pending", status="pending")
        res = self.buy(user=pending.user, product=make_product(pending))
        self.assertEqual((res.status_code, res.json()["code"]), (403, "seller_not_verified"))

    def test_foreign_or_inactive_listing_and_unknown_package_are_404(self):
        theirs = make_product(self.other_seller)
        res = self.buy(product=theirs)
        self.assertEqual((res.status_code, res.json()["code"]), (404, "product_not_found"))
        res = self.buy(product=make_product(self.seller, status="Draft"))
        self.assertEqual((res.status_code, res.json()["code"]), (404, "product_not_found"))
        self.package.is_active = False
        self.package.save()
        res = self.buy()
        self.assertEqual((res.status_code, res.json()["code"]), (404, "package_not_found"))
        self.assertEqual(SponsoredPromotion.objects.count(), 0)

    def test_malformed_ids_and_dates_are_field_errors(self):
        res = client_for(self.seller.user).post(
            BASE + "seller/", {"product_id": "nope", "package_id": "x"}, format="json", HTTP_IDEMPOTENCY_KEY="k1"
        )
        self.assertEqual(res.status_code, 400)
        self.assertEqual(set(res.json()), {"product_id", "package_id"})
        past = (timezone.now() - timedelta(days=1)).date().isoformat()
        res = self.buy(starts_on=past)
        self.assertEqual(res.status_code, 400)
        self.assertIn("starts_on", res.json())
        future = (timezone.now() + timedelta(days=61)).date().isoformat()
        self.assertEqual(self.buy(starts_on=future).status_code, 400)
        ok = (timezone.now() + timedelta(days=10)).date()
        res = self.buy(starts_on=ok.isoformat())
        self.assertEqual(res.status_code, 201)
        self.assertEqual(self.promotion_from(res).starts_on, ok)

    def test_overlapping_surface_on_the_same_product_is_409(self):
        self.assertEqual(self.buy().status_code, 201)
        res = self.buy(package=make_package(surfaces=("category", "home")))
        self.assertEqual((res.status_code, res.json()["code"]), (409, "already_promoted"))
        self.assertIn("Category pages", res.json()["detail"])
        self.assertEqual(SponsoredPromotion.objects.count(), 1)

    def test_disjoint_surface_and_other_products_are_allowed(self):
        self.assertEqual(self.buy().status_code, 201)
        self.assertEqual(self.buy(package=make_package(surfaces=("home", "product"))).status_code, 201)
        self.assertEqual(self.buy(product=make_product(self.seller)).status_code, 201)

    def test_capacity_is_enforced_before_paystack_is_called(self):
        capped = make_package(max_concurrent=1, surfaces=("home",))
        self.assertEqual(self.buy(package=capped).status_code, 201)
        res = self.buy(package=capped, user=self.other_seller.user, product=make_product(self.other_seller))
        self.assertEqual((res.status_code, res.json()["code"]), (409, "sold_out"))
        self.initialize.assert_not_called()
        self.assertEqual(SponsoredPromotion.objects.filter(seller=self.other_seller).count(), 0)

    def test_a_cancelled_promotion_frees_its_slot(self):
        capped = make_package(max_concurrent=1, surfaces=("home",))
        first = self.promotion_from(self.buy(package=capped))
        res = client_for(self.seller.user).post(BASE + f"seller/{first.pk}/cancel/")
        self.assertEqual(res.status_code, 200, res.content)
        res = self.buy(package=capped, user=self.other_seller.user, product=make_product(self.other_seller))
        self.assertEqual(res.status_code, 201)

    def test_paystack_down_is_503_and_does_not_block_a_retry(self):
        res = self.buy(init=paystack.PaystackError("Could not reach Paystack (Timeout)."))
        self.assertEqual((res.status_code, res.json()["code"]), (503, "payments_unavailable"))
        row = SponsoredPromotion.objects.get()
        self.assertEqual((row.status, row.authorization_url), ("abandoned", ""))
        self.assertEqual(self.buy().status_code, 201)

    def test_replaying_a_failed_attempt_is_a_clear_409(self):
        self.buy(key="dead", init=paystack.PaystackError("down"))
        res = self.buy(key="dead")
        self.assertEqual((res.status_code, res.json()["code"]), (409, "promotion_abandoned"))

    def test_replay_while_the_first_request_is_still_starting_is_a_409(self):
        res = self.buy(key="slow")
        SponsoredPromotion.objects.filter(pk=res.json()["promotion"]["id"]).update(authorization_url="")
        res = self.buy(key="slow")
        self.assertEqual((res.status_code, res.json()["code"]), (409, "request_in_progress"))

    def test_no_row_is_created_when_paystack_is_not_configured(self):
        with self.settings(PAYSTACK_SECRET_KEY=""):
            res = self.buy()
        self.assertEqual((res.status_code, res.json()["code"]), (503, "payments_unavailable"))
        self.assertEqual(SponsoredPromotion.objects.count(), 0)


class SellerIsolationTests(SponsoredBase):
    def test_packages_list_shows_only_active_ones_sorted(self):
        make_package(price="20.00", sort_order=2, name="Later")
        make_package(price="10.00", sort_order=1, name="First")
        make_package(price="5.00", sort_order=0, name="Hidden", is_active=False)
        res = client_for(self.seller.user).get(BASE + "packages/")
        self.assertEqual(res.status_code, 200)
        names = [p["name"] for p in res.json()["results"]]
        self.assertNotIn("Hidden", names)
        self.assertEqual(names[-2:], ["First", "Later"])
        self.assertEqual(
            set(res.json()["results"][0]), {"id", "name", "description", "surfaces", "duration_days", "price", "currency"}
        )

    def test_seller_b_cannot_read_verify_or_cancel_seller_a(self):
        promotion = self.promotion_from(self.buy())
        rival = client_for(self.other_seller.user)
        self.assertEqual(rival.get(BASE + f"seller/{promotion.pk}/").status_code, 404)
        self.assertEqual(rival.post(BASE + f"seller/{promotion.pk}/verify/").status_code, 404)
        res = rival.post(BASE + f"seller/{promotion.pk}/cancel/")
        self.assertEqual((res.status_code, res.json()["code"]), (404, "promotion_not_found"))
        self.assertEqual(rival.get(BASE + "seller/").json()["count"], 0)
        promotion.refresh_from_db()
        self.assertEqual(promotion.status, "awaiting_payment")

    def test_list_is_paginated_and_filters_by_status(self):
        first = self.promotion_from(self.buy())
        self.pay(first)
        self.promotion_from(self.buy(product=make_product(self.seller)))
        mine = client_for(self.seller.user)
        everything = mine.get(BASE + "seller/").json()
        self.assertEqual(everything["count"], 2)
        self.assertIn("server_time", everything)
        review = mine.get(BASE + "seller/?status=pending_review").json()
        self.assertEqual([r["id"] for r in review["results"]], [str(first.pk)])
        self.assertEqual(mine.get(BASE + "seller/?status=nonsense").json()["count"], 0)

    def test_detail_hides_the_payment_link_once_paid(self):
        promotion = self.promotion_from(self.buy())
        mine = client_for(self.seller.user)
        self.assertEqual(mine.get(BASE + f"seller/{promotion.pk}/").json()["authorization_url"], INIT_OK["authorization_url"])
        self.pay(promotion)
        detail = mine.get(BASE + f"seller/{promotion.pk}/").json()
        self.assertEqual((detail["authorization_url"], detail["display_status"]), ("", "pending_review"))
        self.assertNotIn("payment_problem", detail)
        self.assertNotIn("provider_payload", detail)

    def test_anonymous_is_401_and_a_buyer_without_a_store_is_404(self):
        self.assertEqual(client_for().get(BASE + "seller/").status_code, 401)
        self.assertEqual(client_for().post(BASE + "seller/", {}, format="json").status_code, 401)
        res = client_for(make_user("buyer")).get(BASE + "seller/")
        self.assertEqual((res.status_code, res.json()["code"]), (404, "not_a_seller"))


@paystack_on
@skipUnlessDBFeature("has_select_for_update")
class CapacityConcurrencyTests(TransactionTestCase):
    """Two sellers buy the last slot at once. Runs only on a database with row locks (PostgreSQL)."""

    def test_exactly_one_buyer_gets_the_last_slot(self):
        a, b = make_seller("seller"), make_seller("rival")
        package = make_package(max_concurrent=1, surfaces=("home",))
        products = {a.pk: make_product(a), b.pk: make_product(b)}
        results = {}
        barrier = threading.Barrier(2)

        def attempt(seller):
            close_old_connections()
            barrier.wait()
            with mock.patch("apps.payments.paystack.initialize", return_value=INIT_OK):
                res = client_for(seller.user).post(
                    BASE + "seller/",
                    {"product_id": str(products[seller.pk].pk), "package_id": str(package.pk)},
                    format="json",
                    HTTP_IDEMPOTENCY_KEY=f"k-{seller.pk}",
                )
            results[seller.pk] = res.status_code
            connection.close()

        threads = [threading.Thread(target=attempt, args=(s,)) for s in (a, b)]
        [t.start() for t in threads]
        [t.join() for t in threads]
        self.assertEqual(sorted(results.values()), [201, 409])
        self.assertEqual(SponsoredPromotion.objects.count(), 1)
