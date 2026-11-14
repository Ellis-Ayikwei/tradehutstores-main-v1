"""Supplier endpoints Q1-Q6 (plan 11 tests 2, 4, 5, 6, 13)."""

from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from apps.notifications.models import Notification
from apps.rfq.models import RFQ, Quote

from .helpers import (
    BASE,
    client_for,
    make_category,
    make_listing,
    make_quote,
    make_rfq,
    make_seller,
    make_supplier,
    make_user,
    quote_payload,
)


class MatchingTests(TestCase):
    def setUp(self):
        self.buyer = make_user("buyer")
        self.category = make_category()
        self.rfq = make_rfq(self.buyer, self.category)

    def matches(self, seller, **params):
        return client_for(seller.user).get(BASE + "seller/matches/", params)

    def test_same_category_seller_sees_it(self):
        res = self.matches(make_supplier(self.category))
        self.assertEqual(res.status_code, 200)
        self.assertEqual([r["id"] for r in res.data["results"]], [str(self.rfq.id)])
        row = res.data["results"][0]
        self.assertIsNone(row["my_quote_status"])
        self.assertEqual(set(row), {
            "id", "reference", "title", "category", "quantity", "unit", "budget_min", "budget_max",
            "currency", "delivery_country", "delivery_city", "closes_at", "quote_count", "status",
            "my_quote_status",
        })

    def test_other_category_seller_does_not(self):
        other = make_supplier(make_category())
        self.assertEqual(self.matches(other).data["count"], 0)
        self.assertEqual(client_for(other.user).get(BASE + f"seller/matches/{self.rfq.pk}/").status_code, 404)
        res = client_for(other.user).post(
            BASE + f"seller/matches/{self.rfq.pk}/quote/", quote_payload(), format="json", HTTP_IDEMPOTENCY_KEY="k"
        )
        self.assertEqual(res.status_code, 404)

    def test_buyers_own_seller_profile_does_not_match(self):
        own = make_seller("own")
        own.user = self.buyer
        own.save()
        make_listing(own, self.category)
        self.assertEqual(self.matches(own).data["count"], 0)

    def test_declared_selling_category_matches_without_listings(self):
        seller = make_seller("declared")
        seller.selling_categories.add(self.category)
        self.assertEqual(self.matches(seller).data["count"], 1)

    def test_inactive_listing_does_not_match(self):
        seller = make_seller("idle")
        make_listing(seller, self.category, status="Draft")
        self.assertEqual(self.matches(seller).data["count"], 0)

    def test_only_live_unexpired_requests_are_listed(self):
        seller = make_supplier(self.category)
        make_rfq(self.buyer, self.category, status="draft")
        make_rfq(self.buyer, self.category, status="awarded")
        make_rfq(self.buyer, self.category, status="cancelled")
        make_rfq(self.buyer, self.category, closes_at=timezone.now() - timedelta(minutes=1))
        make_rfq(self.buyer, self.category, status="quoting")
        self.assertEqual({r["status"] for r in self.matches(seller).data["results"]}, {"open", "quoting"})
        self.assertEqual(self.matches(seller).data["count"], 2)

    def test_filters_and_my_quote_status(self):
        seller = make_supplier(self.category)
        seller.selling_categories.add(make_category())
        other_cat_rfq = make_rfq(self.buyer, seller.selling_categories.first(), title="Laptops")
        make_quote(self.rfq, seller)
        by_cat = self.matches(seller, category=str(other_cat_rfq.category_id))
        self.assertEqual([r["id"] for r in by_cat.data["results"]], [str(other_cat_rfq.id)])
        by_q = self.matches(seller, q="laptop")
        self.assertEqual(by_q.data["count"], 1)
        mine = {r["id"]: r["my_quote_status"] for r in self.matches(seller).data["results"]}
        self.assertEqual(mine[str(self.rfq.id)], "submitted")
        self.assertEqual(self.matches(seller, category="nope").status_code, 400)

    def test_list_query_count_does_not_grow(self):
        seller = make_supplier(self.category)
        client = client_for(seller.user)
        client.get(BASE + "seller/matches/")  # warm up
        from .test_requests import CaptureCount

        with CaptureCount() as few:
            client.get(BASE + "seller/matches/")
        for _ in range(8):
            make_rfq(self.buyer, self.category)
        with CaptureCount() as many:
            res = client.get(BASE + "seller/matches/")
        self.assertEqual(res.data["count"], 9)
        self.assertEqual(few.count, many.count)

    def test_detail_hides_buyer_contact_and_shows_my_quote(self):
        seller = make_supplier(self.category)
        quote = make_quote(self.rfq, seller)
        res = client_for(seller.user).get(BASE + f"seller/matches/{self.rfq.pk}/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["my_quote"]["id"], str(quote.id))
        self.assertEqual(res.data["buyer"]["display_name"], "Buyer T.")
        self.assertEqual(set(res.data["buyer"]), {"display_name", "city", "country", "member_since"})
        self.assertNotIn(self.buyer.email, str(res.data))

    def test_detail_stays_visible_to_a_quoter_after_the_request_ends(self):
        seller = make_supplier(self.category)
        make_quote(self.rfq, seller)
        RFQ.objects.filter(pk=self.rfq.pk).update(status="expired")
        self.assertEqual(client_for(seller.user).get(BASE + f"seller/matches/{self.rfq.pk}/").status_code, 200)

    def test_draft_is_never_visible_to_suppliers(self):
        draft = make_rfq(self.buyer, self.category, status="draft")
        seller = make_supplier(self.category)
        self.assertEqual(client_for(seller.user).get(BASE + f"seller/matches/{draft.pk}/").status_code, 404)


class SubmitTests(TestCase):
    def setUp(self):
        self.buyer = make_user("buyer")
        self.category = make_category()
        self.rfq = make_rfq(self.buyer, self.category, quantity=10)
        self.seller = make_supplier(self.category)
        self.client = client_for(self.seller.user)
        self.url = BASE + f"seller/matches/{self.rfq.pk}/quote/"

    def submit(self, key="q-1", client=None, **overrides):
        return (client or self.client).post(
            self.url, quote_payload(**overrides), format="json", HTTP_IDEMPOTENCY_KEY=key
        )

    def test_first_quote_moves_open_to_quoting_and_totals_are_server_computed(self):
        with self.captureOnCommitCallbacks(execute=True):
            res = self.submit(unit_price="19.99", shipping_cost="12.50", total_price="1.00")
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(
            (res.data["unit_price"], res.data["quantity"], res.data["total_price"], res.data["shipping_cost"], res.data["grand_total"]),
            ("19.99", 10, "199.90", "12.50", "212.40"),
        )
        self.assertEqual((res.data["status"], res.data["currency"]), ("submitted", "GHS"))
        self.rfq.refresh_from_db()
        self.assertEqual((self.rfq.status, self.rfq.quote_count), ("quoting", 1))
        note = Notification.objects.get(kind="rfq.quote_received")
        self.assertEqual(note.user_id, self.buyer.id)

    def test_total_is_rounded_once_from_the_unit_price(self):
        rfq = make_rfq(self.buyer, self.category, quantity=3)
        res = client_for(self.seller.user).post(
            BASE + f"seller/matches/{rfq.pk}/quote/", quote_payload(unit_price="0.335"), format="json", HTTP_IDEMPOTENCY_KEY="r"
        )
        self.assertEqual(res.status_code, 400)  # unit_price has more than 2 decimals
        res = client_for(self.seller.user).post(
            BASE + f"seller/matches/{rfq.pk}/quote/", quote_payload(unit_price="0.33"), format="json", HTTP_IDEMPOTENCY_KEY="r"
        )
        self.assertEqual(res.data["total_price"], "0.99")
        self.assertEqual(Quote.objects.get(pk=res.data["id"]).total_price, Decimal("0.99"))

    def test_replay_returns_200_without_a_second_row_or_notification(self):
        first = self.submit()
        with self.captureOnCommitCallbacks(execute=True):
            again = self.submit()
        self.assertEqual((first.status_code, again.status_code), (201, 200))
        self.assertEqual(first.data["id"], again.data["id"])
        self.assertEqual(Quote.objects.count(), 1)
        self.assertEqual(Notification.objects.filter(kind="rfq.quote_received").count(), 0)

    def test_different_key_on_a_live_quote_is_409_quote_exists(self):
        first = self.submit()
        res = self.submit(key="q-2", unit_price="1.00")
        self.assertEqual((res.status_code, res.data["code"]), (409, "quote_exists"))
        self.assertEqual(res.data["quote_id"], first.data["id"])
        self.assertEqual(Quote.objects.get().unit_price, Decimal("20.00"))

    def test_withdrawn_quote_can_be_resubmitted_on_the_same_row(self):
        first = self.submit()
        client_for(self.seller.user).post(BASE + f"seller/quotes/{first.data['id']}/withdraw/")
        again = self.submit(key="q-2", unit_price="18.00")
        self.assertEqual(again.status_code, 200, again.data)
        self.assertEqual((again.data["id"], again.data["status"], again.data["unit_price"]), (first.data["id"], "submitted", "18.00"))
        self.assertEqual(Quote.objects.count(), 1)
        self.rfq.refresh_from_db()
        self.assertEqual((self.rfq.status, self.rfq.quote_count), ("quoting", 1))

    def test_stale_retry_of_the_original_key_does_not_undo_a_withdrawal(self):
        first = self.submit()
        client_for(self.seller.user).post(BASE + f"seller/quotes/{first.data['id']}/withdraw/")
        stale = self.submit()
        self.assertEqual(stale.status_code, 200)
        self.assertEqual(stale.data["status"], "withdrawn")

    def test_after_the_deadline_is_409(self):
        RFQ.objects.filter(pk=self.rfq.pk).update(closes_at=timezone.now() - timedelta(seconds=1))
        res = self.submit()
        self.assertEqual((res.status_code, res.data["code"]), (409, "rfq_not_accepting_quotes"))

    def test_on_cancelled_awarded_or_draft_request_is_409_or_404(self):
        for status, expected in (("cancelled", 409), ("awarded", 409), ("expired", 409), ("closed", 409), ("draft", 409)):
            rfq = make_rfq(self.buyer, self.category, status=status)
            res = client_for(self.seller.user).post(
                BASE + f"seller/matches/{rfq.pk}/quote/", quote_payload(), format="json", HTTP_IDEMPOTENCY_KEY="x"
            )
            self.assertEqual(res.status_code, expected, status)
        self.assertEqual(Quote.objects.count(), 0)

    def test_unverified_seller_is_403(self):
        pending = make_seller("pending", status="pending")
        make_listing(pending, self.category)
        res = self.submit(client=client_for(pending.user))
        self.assertEqual((res.status_code, res.data["code"]), (403, "seller_not_verified"))
        self.assertEqual(Quote.objects.count(), 0)

    def test_non_seller_and_anonymous(self):
        self.assertEqual(self.submit(client=client_for(make_user("nobody"))).status_code, 404)
        self.assertEqual(self.submit(client=client_for()).status_code, 401)

    def test_missing_key_and_field_rules(self):
        res = self.client.post(self.url, quote_payload(), format="json")
        self.assertEqual((res.status_code, res.data["code"]), (400, "idempotency_key_required"))
        bad = {
            "unit_price": "0",
            "shipping_cost": "-1",
            "lead_time_days": 0,
            "valid_until": (timezone.now() - timedelta(days=1)).isoformat(),
            "notes": "x" * 2001,
        }
        for field, value in bad.items():
            res = self.submit(key=f"k-{field}", **{field: value})
            self.assertEqual(res.status_code, 400, field)
            self.assertIn(field, res.data, field)
        self.assertEqual(self.submit(key="k-lt", lead_time_days=366).status_code, 400)
        self.assertEqual(Quote.objects.count(), 0)

    def test_product_must_be_the_suppliers_own(self):
        mine = make_listing(self.seller, self.category)
        theirs = make_listing(make_seller("rival"), self.category)
        res = self.submit(product_id=str(theirs.id))
        self.assertEqual((res.status_code, res.data["code"]), (400, "product_not_found"))
        ok = self.submit(key="q-2", product_id=str(mine.id))
        self.assertEqual(ok.status_code, 201)
        self.assertEqual(ok.data["product"]["id"], str(mine.id))

    def test_absurd_total_is_rejected(self):
        res = self.submit(unit_price="99999999999.99")
        self.assertEqual(res.status_code, 400)
        self.assertIn("unit_price", res.data)


class EditWithdrawTests(TestCase):
    def setUp(self):
        self.buyer = make_user("buyer")
        self.category = make_category()
        self.rfq = make_rfq(self.buyer, self.category, quantity=4)
        self.seller = make_supplier(self.category)
        self.quote = make_quote(self.rfq, self.seller, unit_price="10.00", shipping="1.00")
        self.client = client_for(self.seller.user)
        self.url = BASE + f"seller/quotes/{self.quote.pk}/"

    def test_edit_recomputes_the_total(self):
        res = self.client.patch(self.url, {"unit_price": "12.50", "notes": "updated"}, format="json")
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual((res.data["total_price"], res.data["shipping_cost"], res.data["notes"]), ("50.00", "1.00", "updated"))

    def test_edit_after_deadline_or_award_is_409(self):
        RFQ.objects.filter(pk=self.rfq.pk).update(closes_at=timezone.now() - timedelta(seconds=1))
        res = self.client.patch(self.url, {"notes": "late"}, format="json")
        self.assertEqual((res.status_code, res.data["code"]), (409, "not_editable"))
        Quote.objects.filter(pk=self.quote.pk).update(status="accepted")
        RFQ.objects.filter(pk=self.rfq.pk).update(closes_at=timezone.now() + timedelta(days=1))
        self.assertEqual(self.client.patch(self.url, {"notes": "x"}, format="json").status_code, 409)

    def test_withdraw_last_quote_returns_the_request_to_open(self):
        res = self.client.post(self.url + "withdraw/")
        self.assertEqual((res.status_code, res.data["status"]), (200, "withdrawn"))
        self.rfq.refresh_from_db()
        self.assertEqual((self.rfq.status, self.rfq.quote_count), ("open", 0))

    def test_withdraw_keeps_quoting_while_other_quotes_remain(self):
        make_quote(self.rfq, make_supplier(self.category, "other"))
        self.client.post(self.url + "withdraw/")
        self.rfq.refresh_from_db()
        self.assertEqual((self.rfq.status, self.rfq.quote_count), ("quoting", 1))

    def test_withdraw_twice_is_200(self):
        self.assertEqual(self.client.post(self.url + "withdraw/").status_code, 200)
        self.assertEqual(self.client.post(self.url + "withdraw/").status_code, 200)

    def test_withdraw_after_accept_or_not_selected_is_409(self):
        for status in ("accepted", "not_selected"):
            Quote.objects.filter(pk=self.quote.pk).update(status=status)
            res = self.client.post(self.url + "withdraw/")
            self.assertEqual((res.status_code, res.data["code"]), (409, "not_withdrawable"), status)

    def test_unverified_seller_cannot_edit_or_withdraw(self):
        Quote.objects.filter(pk=self.quote.pk).delete()
        pending = make_seller("pending", status="pending")
        quote = make_quote(self.rfq, pending)
        client = client_for(pending.user)
        self.assertEqual(client.patch(BASE + f"seller/quotes/{quote.pk}/", {"notes": "x"}, format="json").status_code, 403)
        self.assertEqual(client.post(BASE + f"seller/quotes/{quote.pk}/withdraw/").status_code, 403)

    def test_my_quotes_list_filters_by_status_and_shows_order_id_when_accepted(self):
        other_rfq = make_rfq(self.buyer, self.category)
        make_quote(other_rfq, self.seller, status="withdrawn")
        res = self.client.get(BASE + "seller/quotes/")
        self.assertEqual(res.data["count"], 2)
        self.assertEqual(self.client.get(BASE + "seller/quotes/", {"status": "withdrawn"}).data["count"], 1)
        self.assertEqual(self.client.get(BASE + "seller/quotes/", {"status": "bogus"}).status_code, 400)
        row = next(r for r in res.data["results"] if r["id"] == str(self.quote.id))
        self.assertEqual(set(row["rfq"]), {"id", "reference", "title", "status", "closes_at"})
        self.assertIsNone(row["order_id"])
