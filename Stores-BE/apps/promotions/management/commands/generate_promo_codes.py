"""Bulk-mint unique promo codes.

Examples:
    python manage.py generate_promo_codes \
        --prefix SUMMER --count 100 --discount-type percentage \
        --discount-value 15 --max-redemptions 1 --expires 2026-09-01 \
        --output summer_codes.csv --activate

    # Seller-scoped batch
    python manage.py generate_promo_codes \
        --prefix VENDOR1 --count 25 --discount-type fixed_amount \
        --discount-value 10 --seller-id <SellerProfile UUID>
"""

from __future__ import annotations

import csv
from datetime import datetime

from django.core.management.base import BaseCommand, CommandError

from apps.promotions.models import PromoCode


class Command(BaseCommand):
    help = "Bulk generate unique promo codes (platform-wide or seller-scoped)."

    def add_arguments(self, parser):
        parser.add_argument("--prefix", default="", help="Code prefix, e.g. SUMMER")
        parser.add_argument("--count", type=int, default=10)
        parser.add_argument(
            "--discount-type",
            default="percentage",
            choices=[c[0] for c in PromoCode.DiscountType.choices],
        )
        parser.add_argument("--discount-value", type=float, default=10)
        parser.add_argument("--max-redemptions", type=int, default=1)
        parser.add_argument("--max-redemptions-per-user", type=int, default=1)
        parser.add_argument("--min-order-value", type=float, default=0)
        parser.add_argument("--expires", default=None, help="YYYY-MM-DD")
        parser.add_argument("--seller-id", default=None, help="UUID of SellerProfile to scope to")
        parser.add_argument("--output", default="", help="CSV file path to write codes")
        parser.add_argument(
            "--activate",
            action="store_true",
            help="Activate immediately (default: created as drafts).",
        )

    def handle(self, *args, **options):
        ends_at = None
        if options["expires"]:
            try:
                ends_at = datetime.strptime(options["expires"], "%Y-%m-%d")
            except ValueError as e:
                raise CommandError(f"--expires must be YYYY-MM-DD: {e}")

        seller = None
        seller_id = options.get("seller_id")
        if seller_id:
            from apps.sellers.models import SellerProfile
            try:
                seller = SellerProfile.objects.get(pk=seller_id)
            except SellerProfile.DoesNotExist:
                raise CommandError(f"SellerProfile {seller_id} not found.")

        codes = PromoCode.generate_bulk(options["count"], prefix=options["prefix"])
        created: list[PromoCode] = []

        for code in codes:
            obj = PromoCode.objects.create(
                code=code,
                name=f"Bulk - {options['prefix'] or 'Generated'} - {code}",
                discount_type=options["discount_type"],
                discount_value=options["discount_value"],
                max_redemptions=options["max_redemptions"],
                max_redemptions_per_user=options["max_redemptions_per_user"],
                min_order_value=options["min_order_value"],
                ends_at=ends_at,
                seller=seller,
                is_active=bool(options["activate"]),
            )
            created.append(obj)
            self.stdout.write(f"  {code}")

        if options["output"]:
            with open(options["output"], "w", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                writer.writerow(["code", "discount_type", "discount_value", "expires", "active", "seller"])
                for obj in created:
                    writer.writerow(
                        [
                            obj.code,
                            obj.discount_type,
                            obj.discount_value,
                            ends_at.strftime("%Y-%m-%d") if ends_at else "",
                            obj.is_active,
                            str(seller.pk) if seller else "",
                        ]
                    )
            self.stdout.write(self.style.SUCCESS(f"\nWrote {options['output']}"))

        scope = f" for seller {seller.pk}" if seller else " (platform-wide)"
        self.stdout.write(self.style.SUCCESS(f"\n{len(created)} codes created{scope}."))
