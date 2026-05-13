"""
python manage.py generate_promo_codes \
    --prefix SUMMER \
    --count 100 \
    --discount-type percentage \
    --discount-value 15 \
    --max-redemptions 1 \
    --expires 2025-09-01 \
    --output summer_codes.csv
"""

import csv
from datetime import datetime
from django.core.management.base import BaseCommand
from promos.models import PromoCode


class Command(BaseCommand):
    help = "Bulk generate unique promo codes"

    def add_arguments(self, parser):
        parser.add_argument("--prefix",           default="",         help="Code prefix e.g. SUMMER")
        parser.add_argument("--count",            type=int, default=10)
        parser.add_argument("--discount-type",    default="percentage", choices=[c[0] for c in PromoCode.DiscountType.choices])
        parser.add_argument("--discount-value",   type=float, default=10)
        parser.add_argument("--max-redemptions",  type=int, default=1)
        parser.add_argument("--expires",          default=None,       help="YYYY-MM-DD")
        parser.add_argument("--min-order-value",  type=float, default=0)
        parser.add_argument("--output",           default="",         help="CSV file path to write codes")
        parser.add_argument("--activate",         action="store_true",help="Activate immediately (default: draft)")

    def handle(self, *args, **options):
        ends_at = None
        if options["expires"]:
            ends_at = datetime.strptime(options["expires"], "%Y-%m-%d")

        codes = PromoCode.generate_bulk(options["count"], prefix=options["prefix"])
        created = []

        for code in codes:
            obj = PromoCode.objects.create(
                code=code,
                name=f"Bulk — {options['prefix'] or 'Generated'} — {code}",
                discount_type=options["discount_type"],
                discount_value=options["discount_value"],
                max_redemptions=options["max_redemptions"],
                max_redemptions_per_user=1,
                min_order_value=options["min_order_value"],
                ends_at=ends_at,
                is_active=options["activate"],
            )
            created.append(obj)
            self.stdout.write(f"  {code}")

        if options["output"]:
            with open(options["output"], "w", newline="") as f:
                writer = csv.writer(f)
                writer.writerow(["code", "discount_type", "discount_value", "expires", "active"])
                for obj in created:
                    writer.writerow([
                        obj.code, obj.discount_type, obj.discount_value,
                        ends_at.strftime("%Y-%m-%d") if ends_at else "",
                        obj.is_active,
                    ])
            self.stdout.write(self.style.SUCCESS(f"\nCodes written to {options['output']}"))

        self.stdout.write(self.style.SUCCESS(f"\n{len(created)} codes created."))
