from django.core.management.base import BaseCommand

from apps.orders.payment_flow import expire_stale_sessions


class Command(BaseCommand):
    help = (
        "Handle unpaid Paystack checkouts past their payment window: if Paystack says one was actually paid "
        "(a missed webhook) it is settled; otherwise its orders are cancelled and the reserved stock is released. "
        "Run every few minutes (Railway cron / Celery beat). Safe to run repeatedly."
    )

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=200, help="Maximum sessions to process per run.")

    def handle(self, *args, **options):
        counts = expire_stale_sessions(limit=options["limit"])
        self.stdout.write(
            "expired={expired} settled_as_paid={paid} needs_review={needs_review} "
            "skipped_paystack_unreachable={skipped} unchanged={unchanged}".format(**counts)
        )
