"""Seller balance (P6).

Read-only. The plan's ledger needs `Order.seller`, `commission_amount`, `refunded_amount`,
a Payout table and disputes, none of which exist yet, so pending / available / paid_out are
reported as zero rather than guessed from partial data. BE-PAY-2 replaces the body of
`seller_balance` with the one-aggregate version; the response shape stays the same.
"""

from decimal import ROUND_HALF_UP, Decimal

CENT = Decimal("0.01")


def _money(value) -> str:
    return str(Decimal(value or 0).quantize(CENT, rounding=ROUND_HALF_UP))


def seller_balance(seller) -> dict:
    from apps.core.currency import get_store_base_currency
    from apps.store.models import StoreConfig

    config = StoreConfig.objects.first()  # read-only: do not create the singleton on a GET
    min_payout = (
        config.payments_min_payout
        if config
        else StoreConfig._meta.get_field("payments_min_payout").get_default()
    )
    return {
        "currency": get_store_base_currency(),
        "pending": _money(0),
        "available": _money(0),
        "paid_out": _money(0),
        "min_payout": _money(min_payout),
    }
