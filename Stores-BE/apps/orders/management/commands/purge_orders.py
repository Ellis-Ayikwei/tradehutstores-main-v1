"""Delete old orders and everything that hangs off them (items, payments, refunds, checkout sessions, shipments,
returns, promo redemptions...). Meant for clearing test data or retiring old orders.

    python manage.py purge_orders --all                     # PREVIEW only: shows what would go
    python manage.py purge_orders --all --yes               # actually delete (local / dev database)
    python manage.py purge_orders --older-than-days 90 --yes
    python manage.py purge_orders --all --yes --include-paid --restore-stock

SAFE BY DEFAULT
  * Nothing is deleted without ``--yes``. Without it you only get the preview.
  * You must say how much: ``--all`` or ``--older-than-days N``.
  * Against a production-like setting (DEBUG off) it also needs ``--allow-production``.
  * Orders with a payment still in flight (a Paystack checkout waiting, a refund pending) are never touched.
  * Orders that have real money on record (a succeeded / needs-review / refunded payment) are skipped unless you pass
    ``--include-paid``: deleting them erases the financial trail.
  * It prints which database it is pointed at (never the password) before doing anything.
  * Everything runs in ONE transaction: if anything fails, nothing is deleted.

``--restore-stock`` puts the reserved stock back for orders that were never shipped (Pending / Processing), so a test
clean-up does not leave your products looking sold out. Leave it off when retiring genuinely old orders.
"""

from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import connection, models, transaction
from django.db.models import F, Q
from django.utils import timezone

from apps.orders.models import CheckoutSession, Order, OrderItem, OrderPayment, OrderRefund

CHUNK = 500  # ids per statement (stays under SQLite's variable limit)


def _chunks(ids):
    for start in range(0, len(ids), CHUNK):
        yield ids[start : start + CHUNK]


def database_label() -> str:
    """Which database this command is pointed at, without the password."""
    cfg = connection.settings_dict
    engine = str(cfg.get("ENGINE", "")).rsplit(".", 1)[-1]
    host = cfg.get("HOST") or "local file"
    return f"{engine} / {host} / {cfg.get('NAME')}"


def select_orders(*, older_than_days, include_paid, now=None):
    """``(ids_to_delete, skipped_in_flight, skipped_with_money)`` as lists of order ids."""
    now = now or timezone.now()
    base = Order.objects.all()
    if older_than_days is not None:
        base = base.filter(placed_at__lt=now - timedelta(days=older_than_days))
    all_ids = set(base.values_list("pk", flat=True))

    in_flight = set(
        Order.objects.filter(
            Q(checkout_sessions__provider="paystack", checkout_sessions__status="pending") | Q(refunds__status="pending")
        ).values_list("pk", flat=True)
    )
    with_money = set(
        Order.objects.filter(payments__status__in=("succeeded", "needs_review", "refunded")).values_list("pk", flat=True)
    )
    skipped_in_flight = all_ids & in_flight
    skipped_money = (all_ids & with_money) - skipped_in_flight if not include_paid else set()
    doomed = all_ids - skipped_in_flight - skipped_money
    return sorted(doomed), sorted(skipped_in_flight), sorted(skipped_money)


def _reverse_relations():
    """Every table with a foreign key to an order, except the many-to-many link (handled on its own)."""
    existing = set(connection.introspection.table_names())
    # include_hidden: a foreign key declared with related_name="+" (the auction's winning order) is hidden from the
    # default listing but still has to be cleared before the order can go.
    for rel in Order._meta.get_fields(include_hidden=True):
        if not (rel.auto_created and not rel.concrete and (rel.one_to_many or rel.one_to_one)):
            continue
        if rel.related_model._meta.db_table in existing:  # the legacy payments / shipments apps have no migrations
            yield rel.related_model, rel.field


def purge(order_ids, *, restore_stock=False, dry_run=True) -> dict:
    """Delete ``order_ids`` and their dependants. Returns a count per kind of record (what WAS or WOULD BE deleted)."""
    using = connection.alias
    counts = {"orders": len(order_ids)}
    through = CheckoutSession.orders.through
    sellers, promo_ids, session_ids = set(), set(), set()

    def bump(key, n):
        counts[key] = counts.get(key, 0) + n

    for chunk in _chunks(order_ids):
        bump("order items", OrderItem.objects.filter(order_id__in=chunk).count())
        bump("payments", OrderPayment.objects.filter(order_id__in=chunk).count())
        bump("refunds", OrderRefund.objects.filter(order_id__in=chunk).count())
        bump("checkout links", through.objects.filter(order_id__in=chunk).count())
        sellers |= set(
            OrderItem.objects.filter(order_id__in=chunk, product__seller_profile__isnull=False)
            .values_list("product__seller_profile_id", flat=True)
            .distinct()
        )
        session_ids |= set(through.objects.filter(order_id__in=chunk).values_list("checkoutsession_id", flat=True))
        try:
            from apps.promotions.models import PromoRedemption

            redemptions = PromoRedemption.objects.filter(order_id__in=[str(i) for i in chunk])
            bump("promo redemptions", redemptions.count())
            promo_ids |= set(redemptions.values_list("promo_id", flat=True))
        except ImportError:
            PromoRedemption = None
        for model, field in _reverse_relations():
            if model in (OrderItem, OrderPayment, OrderRefund):
                continue
            n = model._default_manager.filter(**{f"{field.name}__in": chunk}).count()
            if n:
                bump(str(model._meta.verbose_name_plural), n)

        if dry_run:
            continue

        # 1. Stock back for orders that never shipped (their stock was reserved at checkout).
        if restore_stock:
            lines = (
                OrderItem.objects.filter(
                    order_id__in=Order.objects.filter(
                        pk__in=chunk, order_status__in=("Pending", "Processing")
                    ).exclude(checkout_key__isnull=True).values("pk"),
                    variant__isnull=False,
                )
                .values("variant_id")
                .annotate(total=models.Sum("quantity"))
                .order_by("variant_id")
            )
            from apps.products.models import ProductVariant

            for row in lines:
                ProductVariant.objects.filter(pk=row["variant_id"]).update(quantity=F("quantity") + row["total"])

        # 2. Children, in an order that respects the protected links (a refund points at its payment AND its order).
        OrderRefund.objects.filter(order_id__in=chunk)._raw_delete(using)
        OrderPayment.objects.filter(order_id__in=chunk)._raw_delete(using)
        through.objects.filter(order_id__in=chunk)._raw_delete(using)
        if PromoRedemption is not None:
            PromoRedemption.objects.filter(order_id__in=[str(i) for i in chunk])._raw_delete(using)
        for model, field in _reverse_relations():
            if model in (OrderItem, OrderPayment, OrderRefund):
                continue
            rows = model._default_manager.filter(**{f"{field.name}__in": chunk})
            if field.remote_field.on_delete is models.SET_NULL:
                rows.update(**{field.name: None})  # e.g. an auction that points at its winning order
            else:
                rows._raw_delete(using)
        OrderItem.objects.filter(order_id__in=chunk)._raw_delete(using)
        Order.objects.filter(pk__in=chunk)._raw_delete(using)

    if dry_run:
        return counts

    # 3. Checkout sessions left with no orders, promo counters, seller totals.
    counts["checkout sessions"] = 0
    for batch in _chunks(sorted(session_ids)):
        orphaned = CheckoutSession.objects.filter(pk__in=batch, orders__isnull=True)
        counts["checkout sessions"] += orphaned.count()
        orphaned._raw_delete(using)
    if promo_ids:
        from apps.promotions.models import PromoCode, PromoRedemption

        for promo in PromoCode.objects.filter(pk__in=list(promo_ids)):
            PromoCode.objects.filter(pk=promo.pk).update(current_redemptions=PromoRedemption.objects.filter(promo=promo).count())
    from apps.sellers.models import SellerProfile

    for seller in SellerProfile.objects.filter(pk__in=list(sellers)):
        seller.update_metrics()  # total orders / sales are derived from the orders that are left
    return counts


class Command(BaseCommand):
    help = "Delete old orders and everything attached to them. Previews only unless --yes is given. See the module docstring."

    def add_arguments(self, parser):
        scope = parser.add_mutually_exclusive_group()
        scope.add_argument("--all", action="store_true", help="Every order (still skipping in-flight ones, and paid ones unless --include-paid).")
        scope.add_argument("--older-than-days", type=int, metavar="N", help="Only orders placed more than N days ago.")
        parser.add_argument("--include-paid", action="store_true", help="Also delete orders that have real payments on record (erases the money trail).")
        parser.add_argument("--restore-stock", action="store_true", help="Return reserved stock for orders that never shipped.")
        parser.add_argument("--yes", action="store_true", help="Actually delete. Without it you only get a preview.")
        parser.add_argument("--allow-production", action="store_true", help="Required when DEBUG is off (a production-like setup).")

    def handle(self, *args, **options):
        if not options["all"] and options["older_than_days"] is None:
            raise CommandError("Say how much to delete: --all, or --older-than-days N.")
        if options["older_than_days"] is not None and options["older_than_days"] < 0:
            raise CommandError("--older-than-days must be 0 or more.")
        execute = options["yes"]
        if execute and not settings.DEBUG and not options["allow_production"]:
            raise CommandError(
                "DEBUG is off, so this looks like production. Refusing to delete. If you really mean it, add --allow-production "
                "(and take a database backup first)."
            )

        self.stdout.write(f"Database: {database_label()}")
        ids, in_flight, with_money = select_orders(older_than_days=options["older_than_days"], include_paid=options["include_paid"])
        self.stdout.write(f"Orders in scope: {len(ids) + len(in_flight) + len(with_money)}")
        if in_flight:
            self.stdout.write(self.style.WARNING(f"  Skipping {len(in_flight)} with a payment or refund still in flight (never deleted by this command)."))
        if with_money:
            self.stdout.write(self.style.WARNING(f"  Skipping {len(with_money)} with real payments on record. Add --include-paid to delete them too."))
        if not ids:
            self.stdout.write("Nothing to delete.")
            return

        with transaction.atomic():
            counts = purge(ids, restore_stock=options["restore_stock"], dry_run=not execute)
        verb = "Deleted" if execute else "Would delete"
        for kind, n in sorted(counts.items(), key=lambda kv: (kv[0] != "orders", kv[0])):
            self.stdout.write(f"  {verb} {n} {kind}")
        if not execute:
            self.stdout.write(self.style.NOTICE("\nThis was a preview. Nothing was deleted. Add --yes to delete for real."))
        else:
            self.stdout.write(self.style.SUCCESS("\nDone."))
