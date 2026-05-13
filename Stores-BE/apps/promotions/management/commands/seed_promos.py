"""Seed a handful of demo promo codes so the cart/checkout has something to test against.

Idempotent: re-running tops up missing codes; --reset wipes them first.

Usage:
    python manage.py seed_promos
    python manage.py seed_promos --reset
"""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.promotions.models import PromoCode


PROMOS = [
    {
        "code": "WELCOME10",
        "name": "Welcome 10% off",
        "description": "10% off your first order",
        "discount_type": PromoCode.DiscountType.PERCENTAGE,
        "discount_value": Decimal("10"),
        "max_discount_amount": Decimal("100"),
        "first_order_only": True,
        "max_redemptions_per_user": 1,
    },
    {
        "code": "SAVE50",
        "name": "GHS 50 off any order over 500",
        "description": "Flat GHS 50 off when you spend GHS 500 or more",
        "discount_type": PromoCode.DiscountType.FIXED_AMOUNT,
        "discount_value": Decimal("50"),
        "min_order_value": Decimal("500"),
        "max_redemptions_per_user": 1,
    },
    {
        "code": "FREESHIP",
        "name": "Free shipping",
        "description": "Free shipping on any order",
        "discount_type": PromoCode.DiscountType.FREE_SHIPPING,
        "discount_value": Decimal("0"),
        "min_order_value": Decimal("100"),
        "max_redemptions_per_user": 0,  # unlimited per user
    },
    {
        "code": "FLASH20",
        "name": "Flash 20%",
        "description": "20% off — capped at GHS 200 — limited 100 uses",
        "discount_type": PromoCode.DiscountType.PERCENTAGE,
        "discount_value": Decimal("20"),
        "max_discount_amount": Decimal("200"),
        "max_redemptions": 100,
        "ends_in_days": 7,
    },
    {
        "code": "AUTOSHIP",
        "name": "Auto-applied free shipping over 1000",
        "description": "Free shipping when you spend GHS 1000+",
        "discount_type": PromoCode.DiscountType.FREE_SHIPPING,
        "discount_value": Decimal("0"),
        "min_order_value": Decimal("1000"),
        "auto_apply": True,
        "auto_apply_priority": 10,
    },
    {
        "code": "BUNDLE3",
        "name": "Bundle: Buy 2 Get 1 Free",
        "description": "Add any 3 items — pay for 2",
        "discount_type": PromoCode.DiscountType.BUY_X_GET_Y,
        "discount_value": Decimal("0"),
        "buy_quantity": 2,
        "get_quantity": 1,
        "min_items_count": 3,
    },
]


class Command(BaseCommand):
    help = "Seed a handful of demo promo codes (platform-wide)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete the demo codes (matched by code value) before re-creating.",
        )

    def handle(self, *args, **options):
        if options["reset"]:
            removed, _ = PromoCode.objects.filter(code__in=[p["code"] for p in PROMOS]).delete()
            self.stdout.write(self.style.WARNING(f"--reset: removed {removed} demo objects"))

        now = timezone.now()
        for spec in PROMOS:
            code = spec["code"]
            ends_in_days = spec.pop("ends_in_days", None)
            ends_at = now + timedelta(days=ends_in_days) if ends_in_days else None

            defaults = {
                "is_active": True,
                "starts_at": now,
                "ends_at": ends_at,
                **spec,
            }
            obj, created = PromoCode.objects.get_or_create(code=code, defaults=defaults)
            if not created:
                # Refresh non-immutable fields so re-runs pick up edits to this script.
                for k, v in spec.items():
                    if k != "code":
                        setattr(obj, k, v)
                obj.save()

            tag = "created" if created else "updated"
            scope = "seller" if obj.seller_id else "platform"
            self.stdout.write(f"  [{tag}] {obj.code} ({scope}) - {obj.name}")

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("[ok] Promo codes seeded. Try them in the cart:"))
        self.stdout.write("  WELCOME10  - 10% off, first order only")
        self.stdout.write("  SAVE50     - GHS 50 off orders over 500")
        self.stdout.write("  FREESHIP   - Free shipping over GHS 100")
        self.stdout.write("  FLASH20    - 20% off (limited)")
        self.stdout.write("  AUTOSHIP   - Auto-applied free shipping over 1000")
        self.stdout.write("  BUNDLE3    - Buy 2 get 1 free (3+ items)")
