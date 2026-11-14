"""Concurrency tests (plan 11 tests 8 and 9).

These need real row locks, so they run on PostgreSQL only; SQLite ignores
``select_for_update`` and would give a false pass. Run locally with:

    export DATABASE_URL='postgresql://USER:PASS@localhost:5432/tradehut_dev'
    python manage.py test apps.rfq.tests.test_concurrency

(The test runner creates and destroys a separate ``test_<name>`` database; never point
DATABASE_URL at the Railway database.)
"""

from unittest import mock, skipUnless

from django.db import connection
from django.test import TransactionTestCase

from apps.auctions.errors import ApiError
from apps.auctions.tests.test_concurrency import run_concurrently
from apps.orders.models import Order
from apps.rfq import services
from apps.rfq.models import RFQ, Quote

from .helpers import fake_order_hook, make_category, make_quote, make_rfq, make_supplier, make_user, quote_payload


def api_code(result):
    kind, value = result
    return value.detail["code"] if kind == "err" and isinstance(value, ApiError) else None


@skipUnless(connection.vendor == "postgresql", "needs PostgreSQL row locks (SQLite ignores select_for_update)")
class ConcurrentAwardTests(TransactionTestCase):
    def setUp(self):
        self.buyer = make_user("buyer")
        self.category = make_category()
        self.rfq = make_rfq(self.buyer, self.category)
        self.qa = make_quote(self.rfq, make_supplier(self.category, "a"))
        self.qb = make_quote(self.rfq, make_supplier(self.category, "b"))

    def award_fn(self, quote, key):
        return lambda: services.award(
            rfq_id=self.rfq.pk, buyer=self.buyer, quote_id=quote.id, idempotency_key=key
        )

    def test_8_two_different_quotes_awarded_at_once_make_one_order(self):
        with mock.patch.object(services, "create_award_order", side_effect=fake_order_hook):
            results = run_concurrently([self.award_fn(self.qa, "k1"), self.award_fn(self.qb, "k2")])
        self.assertEqual(sorted(r[0] for r in results), ["err", "ok"])
        self.assertEqual([api_code(r) for r in results if r[0] == "err"], ["already_awarded"])
        self.assertEqual(Order.objects.count(), 1)
        self.assertEqual(Quote.objects.filter(rfq=self.rfq, status="accepted").count(), 1)
        self.assertEqual(Quote.objects.filter(rfq=self.rfq, status="not_selected").count(), 1)
        rfq = RFQ.objects.get(pk=self.rfq.pk)
        self.assertEqual(rfq.status, "awarded")
        self.assertEqual(Quote.objects.get(pk=rfq.awarded_quote_id).status, "accepted")

    def test_8_the_same_quote_awarded_twice_at_once_is_one_order_and_two_successes(self):
        with mock.patch.object(services, "create_award_order", side_effect=fake_order_hook) as hook:
            results = run_concurrently([self.award_fn(self.qa, "k1"), self.award_fn(self.qa, "k1")])
        self.assertEqual([r[0] for r in results], ["ok", "ok"])
        self.assertEqual(hook.call_count, 1)
        self.assertEqual(Order.objects.count(), 1)

    def test_9_submit_racing_award_never_leaves_a_submitted_quote_on_an_awarded_request(self):
        late = make_supplier(self.category, "late")

        def submit():
            return services.submit_quote(
                rfq_id=self.rfq.pk, seller=late, data={"unit_price": "5.00", "lead_time_days": 3}, idempotency_key="late"
            )

        with mock.patch.object(services, "create_award_order", side_effect=fake_order_hook):
            results = run_concurrently([self.award_fn(self.qa, "k1"), submit])
        self.assertEqual(results[0][0], "ok")
        self.assertFalse(Quote.objects.filter(rfq=self.rfq, status="submitted").exists())
        late_quote = Quote.objects.filter(rfq=self.rfq, supplier=late).first()
        if results[1][0] == "ok":  # the quote committed first, so the award released it
            self.assertEqual(late_quote.status, "not_selected")
        else:  # the award committed first
            self.assertEqual(api_code(results[1]), "rfq_not_accepting_quotes")
            self.assertIsNone(late_quote)

    def test_withdraw_racing_award_of_the_same_quote_ends_consistent(self):
        quote_owner = self.qa.supplier

        def withdraw():
            return services.withdraw_quote(quote_id=self.qa.id, seller=quote_owner)

        with mock.patch.object(services, "create_award_order", side_effect=fake_order_hook):
            results = run_concurrently([self.award_fn(self.qa, "k1"), withdraw])
        self.qa.refresh_from_db()
        if results[0][0] == "ok":
            self.assertEqual(self.qa.status, "accepted")
            self.assertEqual(api_code(results[1]), "not_withdrawable")
        else:
            self.assertEqual(api_code(results[0]), "quote_not_available")
            self.assertEqual(self.qa.status, "withdrawn")
            self.assertEqual(Order.objects.count(), 0)
