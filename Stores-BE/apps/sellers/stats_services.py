"""SE4 - Seller Central overview numbers.

Aggregates only (a fixed handful of queries, no per-row work), always scoped to one
seller. Ownership of orders follows the rest of the codebase: through the order lines
(``OrderItem.product.seller_profile``), and only the seller's own lines are summed, so a
shared legacy order never leaks another seller's money.
"""

from datetime import datetime, time, timedelta
from decimal import ROUND_HALF_UP, Decimal

from django.db.models import Count, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone

CENT = Decimal("0.01")
LOW_STOCK_THRESHOLD = 5
WINDOW_DAYS = 30
# Orders that count as a sale: accepted and not cancelled/refunded. `Pending` is awaiting
# payment (or seller acceptance), so it is neither a sale nor "to ship".
SALE_STATUSES = ("Processing", "Shipped", "Delivered")
TO_SHIP_STATUS = "Processing"
NOT_FOR_SALE_STATUSES = ("Archived", "Deleted")


def money(value) -> str:
    return str((Decimal(value or 0)).quantize(CENT, rounding=ROUND_HALF_UP))


def seller_stats(seller) -> dict:
    # Imported here: orders/products/auctions import from sellers at module load.
    from apps.auctions.models import Auction
    from apps.core.currency import get_store_base_currency
    from apps.orders.models import OrderItem
    from apps.products.models import Product, ProductVariant

    now = timezone.now()
    today = timezone.localdate(now)
    first_day = today - timedelta(days=WINDOW_DAYS - 1)
    window_start = timezone.make_aware(datetime.combine(first_day, time.min))

    lines = OrderItem.objects.filter(product__seller_profile=seller)
    recent_sales = lines.filter(
        order__placed_at__gte=window_start, order__order_status__in=SALE_STATUSES
    )

    per_day = {
        row["day"]: row["total"]
        for row in recent_sales.annotate(day=TruncDate("order__placed_at"))
        .values("day")
        .annotate(total=Sum("total_price"))
        .order_by("day")
    }
    sales_by_day = []
    total = Decimal("0")
    for offset in range(WINDOW_DAYS):
        day = first_day + timedelta(days=offset)
        amount = Decimal(per_day.get(day) or 0)
        total += amount
        sales_by_day.append({"date": day.isoformat(), "total": money(amount)})

    orders_30d = recent_sales.aggregate(n=Count("order_id", distinct=True))["n"]
    orders_to_ship = lines.filter(order__order_status=TO_SHIP_STATUS).aggregate(
        n=Count("order_id", distinct=True)
    )["n"]

    sellable = Product.objects.filter(seller_profile=seller).exclude(
        status__in=NOT_FOR_SALE_STATUSES
    )
    low_stock = ProductVariant.objects.filter(
        product__seller_profile=seller, quantity__lte=LOW_STOCK_THRESHOLD
    ).exclude(product__status__in=NOT_FOR_SALE_STATUSES)

    return {
        "sales_30d": money(total),
        "orders_30d": orders_30d,
        "orders_to_ship": orders_to_ship,
        "low_stock_variants": low_stock.count(),
        "active_listings": sellable.filter(status="Active").count(),
        "live_auctions": Auction.objects.filter(
            seller=seller, status=Auction.STATUS_LIVE, ends_at__gt=now
        ).count(),
        # The RFQ app does not exist yet; 0 rather than an error until it lands.
        "open_rfq_matches": 0,
        "currency": get_store_base_currency(),
        "sales_by_day": sales_by_day,
    }
