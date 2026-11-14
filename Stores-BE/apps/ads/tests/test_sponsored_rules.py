"""Pure money and window rules for sponsored products."""

from datetime import timedelta
from decimal import Decimal

from django.db import IntegrityError, transaction
from django.test import SimpleTestCase
from django.utils import timezone

from apps.ads import sponsored_services as services
from apps.ads.sponsored_models import SponsoredPromotion
from apps.payments import paystack

from .test_sponsored_base import SponsoredBase

T0 = timezone.now().replace(microsecond=0)


class ProratedRefundTests(SimpleTestCase):
    def refund(self, price, total, at):
        """``at`` is how far into a ``total``-long window the stop happens."""
        return services.prorated_refund(Decimal(price), T0, T0 + total, T0 + at)

    def test_table(self):
        week, three_days = timedelta(days=7), timedelta(days=3)
        rows = [
            ("50.00", week, timedelta(days=-1), "50.00"),  # before the start: everything back
            ("50.00", week, timedelta(0), "50.00"),  # exactly at the start
            ("50.00", week, timedelta(days=3, hours=12), "25.00"),  # half way
            ("50.00", week, week - timedelta(seconds=1), "0.00"),  # last second: under a pesewa
            ("50.00", week, week, "0.00"),  # exactly at the end
            ("50.00", week, week + timedelta(days=2), "0.00"),  # after the end
            ("10.00", three_days, timedelta(days=1), "6.66"),  # 6.666... rounds DOWN, never up
            ("33.33", three_days, timedelta(days=1), "22.22"),  # 33.33 * 2/3 = 22.22 exactly
            ("0.00", week, timedelta(days=1), "0.00"),  # a free promotion refunds nothing
            ("50.00", week, timedelta(days=6, hours=23, minutes=59), "0.00"),  # 1 minute of 10080 left: 0.0049
            ("50.00", week, timedelta(days=6, hours=22), "0.59"),  # 2 hours of 168 left: 0.5952 rounds down
        ]
        for price, total, at, expected in rows:
            with self.subTest(price=price, at=at):
                self.assertEqual(self.refund(price, total, at), Decimal(expected))

    def test_never_exceeds_price_and_never_negative(self):
        for seconds in range(-5, 7 * 86400 + 5, 40_000):
            got = self.refund("19.99", timedelta(days=7), timedelta(seconds=seconds))
            self.assertGreaterEqual(got, 0)
            self.assertLessEqual(got, Decimal("19.99"))
            self.assertEqual(got, got.quantize(Decimal("0.01")))


class ToMinorTests(SimpleTestCase):
    def test_conversion(self):
        self.assertEqual(paystack.to_minor(Decimal("12.34")), 1234)
        self.assertEqual(paystack.to_minor("50"), 5000)
        self.assertEqual(paystack.to_minor(None), 0)
        self.assertEqual(paystack.to_minor(Decimal("0.005")), 1)  # rounded half up to 0.01 first


class StartsOnTests(SimpleTestCase):
    def test_window(self):
        today = timezone.now().date()
        self.assertIsNone(services.check_starts_on(None))
        self.assertEqual(services.check_starts_on(today), today)
        self.assertEqual(services.check_starts_on(today + timedelta(days=60)), today + timedelta(days=60))
        for bad in (today - timedelta(days=1), today + timedelta(days=61)):
            with self.assertRaises(Exception):
                services.check_starts_on(bad)

    def test_window_start_is_later_of_now_and_chosen_day(self):
        now = timezone.now()
        self.assertEqual(services.window_start(None, now), now)
        self.assertEqual(services.window_start(now.date() - timedelta(days=1), now), now)
        later = services.window_start(now.date() + timedelta(days=3), now)
        self.assertEqual((later.date(), later.hour, later.minute), (now.date() + timedelta(days=3), 0, 0))


class RefundCeilingTests(SponsoredBase):
    def test_database_refuses_a_refund_above_the_price(self):
        promotion = self.paid_promotion()
        with self.assertRaises(IntegrityError), transaction.atomic():
            SponsoredPromotion.objects.filter(pk=promotion.pk).update(refunded_amount=promotion.price_paid + Decimal("0.01"))

    def test_database_refuses_an_inverted_window(self):
        promotion = self.paid_promotion()
        with self.assertRaises(IntegrityError), transaction.atomic():
            SponsoredPromotion.objects.filter(pk=promotion.pk).update(starts_at=T0, ends_at=T0 - timedelta(days=1))

    def test_a_refund_is_reserved_once(self):
        promotion = self.paid_promotion()
        with transaction.atomic():
            locked = SponsoredPromotion.objects.select_for_update().get(pk=promotion.pk)
            self.assertTrue(services._reserve_refund(locked, locked.price_paid, T0))
            self.assertFalse(services._reserve_refund(locked, locked.price_paid, T0))
        self.assertEqual(locked.refunded_amount, locked.price_paid)
