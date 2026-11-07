"""Clear placeholder variant names on simple (single-variant) products.

Safe usage (dry-run is the default and writes nothing):

    python manage.py clear_generic_variant_names            # report only
    python manage.py clear_generic_variant_names --apply    # write

Cleared names ('' is stored) are those that are generic ("Default", "-", ...),
equal to the variant SKU, or match the legacy seed pattern "<product> — Variant N".
Only products with exactly ONE variant are changed. Multi-variant products are
never modified; variants with generic names on them are only reported so the
seller can rename them.
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction
from django.db.models import Count

from apps.products.models import ProductVariant
from apps.products.variant_names import LEGACY_SEED_NAME_RE, is_generic_variant_name

LOCAL_HOSTS = {"", "localhost", "127.0.0.1", "::1"}
BATCH_SIZE = 500


def database_host():
    """Host of the connection Django will actually use ('' for SQLite/sockets)."""
    cfg = connection.settings_dict
    if "sqlite" in str(cfg.get("ENGINE", "")):
        return ""
    host = str(cfg.get("HOST") or "")
    if host.startswith("/"):  # unix socket directory
        return ""
    return host


def reason_to_clear(variant_name, sku):
    """Return why ``variant_name`` is a placeholder, or None if it is a real name."""
    name = (variant_name or "").strip()
    if not name:
        return None
    if is_generic_variant_name(name):
        return "generic"
    if sku and name.lower() == str(sku).strip().lower():
        return "equals-sku"
    if LEGACY_SEED_NAME_RE.match(name):
        return "legacy-seed"
    return None


class Command(BaseCommand):
    help = (
        "Clear generic/placeholder variant names on single-variant products. "
        "Dry-run by default; pass --apply to write."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Actually write changes (default is a dry-run that changes nothing).",
        )
        parser.add_argument(
            "--only-single",
            action="store_true",
            default=True,
            help="Only change products with exactly one variant (always true; "
            "multi-variant products are reported, never modified).",
        )
        parser.add_argument(
            "--i-know-this-is-remote",
            action="store_true",
            dest="i_know_this_is_remote",
            help="Required to run against a non-local database host.",
        )

    def handle(self, *args, **options):
        apply_changes = options["apply"]
        host = database_host()
        if host and host not in LOCAL_HOSTS:
            self.stderr.write(
                self.style.ERROR(
                    "WARNING: the configured database host is REMOTE "
                    f"({host}). This is probably PRODUCTION data."
                )
            )
            if not options["i_know_this_is_remote"]:
                raise CommandError(
                    "Refusing to run against a remote database. Re-run with "
                    "--i-know-this-is-remote only if you really intend to "
                    "(dry-run first, take a backup before --apply)."
                )
            self.stderr.write(
                self.style.WARNING(
                    "--i-know-this-is-remote given; continuing against the remote database."
                )
            )

        mode = "APPLY" if apply_changes else "DRY-RUN (no changes will be written)"
        self.stdout.write(f"clear_generic_variant_names: {mode}")

        rows = (
            ProductVariant.objects.annotate(variant_total=Count("product__variants"))
            .exclude(name__isnull=True)
            .exclude(name="")
            .values_list("id", "product_id", "name", "sku", "variant_total")
            .order_by("product_id", "id")
        )

        to_clear = []  # (variant_id, product_id, old_name, reason)
        multi_report = []  # (variant_id, product_id, old_name)
        for variant_id, product_id, name, sku, total in rows.iterator():
            reason = reason_to_clear(name, sku)
            if reason is None:
                continue
            if total == 1:
                to_clear.append((variant_id, product_id, name, reason))
            else:
                multi_report.append((variant_id, product_id, name))

        verb = "clearing" if apply_changes else "would clear"
        for variant_id, product_id, name, reason in to_clear:
            self.stdout.write(
                f"  {verb}: product={product_id} variant={variant_id} "
                f"old_name={name!r} ({reason})"
            )

        cleared = 0
        if apply_changes and to_clear:
            ids = [t[0] for t in to_clear]
            with transaction.atomic():
                for start in range(0, len(ids), BATCH_SIZE):
                    chunk = ids[start : start + BATCH_SIZE]
                    cleared += ProductVariant.objects.filter(id__in=chunk).update(
                        name=""
                    )

        if multi_report:
            self.stdout.write(
                "Multi-variant products with placeholder names (NOT changed; "
                "the seller should rename these):"
            )
            for variant_id, product_id, name in multi_report:
                self.stdout.write(
                    f"  product={product_id} variant={variant_id} name={name!r}"
                )

        self.stdout.write(
            f"Summary: single-variant matches={len(to_clear)}, "
            f"cleared={cleared if apply_changes else 0}"
            f"{'' if apply_changes else ' (dry-run)'}, "
            f"multi-variant reported={len(multi_report)}"
        )
        if not apply_changes and to_clear:
            self.stdout.write("Re-run with --apply to write these changes.")
