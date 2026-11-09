"""Buyer checkout (plan 20, P1/P2/P3): price a cart and place cash-on-delivery or Paystack orders.

Two payment methods, both behind one ``CheckoutSession``:
  * ``cod``      - orders start Processing; cash is collected on delivery.
  * ``paystack`` - "Card or mobile money" through Paystack's hosted checkout page. Orders start Pending with stock
                   reserved; the signed webhook / server-side verification (``payment_flow.mark_session_paid``)
                   moves them to Processing/paid. Unpaid sessions expire and release their stock.
A method that is switched off in the admin, or Paystack without its secret key, is refused with 422
``payment_method_unavailable`` instead of creating an order that can never be paid.

Rules (all enforced here, never trusted from the client):
  * Prices come from the database (``ProductVariant.price`` less the product discount). The client only
    sends ``variant_id`` + ``quantity``; ``expected_total`` is compared and a mismatch is 409 ``price_changed``.
  * One order per seller (platform listings with no seller profile form their own order).
  * Stock is checked and decremented inside one transaction with the variant rows locked, in sorted id
    order, so concurrent buyers cannot oversell and cannot deadlock each other.
  * The buyer's own row is locked while an order is placed, and every order carries the request's
    ``Idempotency-Key``: a retry returns the orders already created instead of creating more.
"""

import logging
import secrets
import uuid
from dataclasses import dataclass, field
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.db.models import F
from django.utils import timezone

from apps.core.currency import get_store_base_currency
from apps.payments import paystack
from apps.products.models import ProductVariant
from apps.promotions import services as promo_services
from apps.store.models import StoreConfig
from apps.users.models import User

from . import payment_flow
from .models import CheckoutSession, Order, OrderItem, OrderPayment
from .services import OrderApiError, money

logger = logging.getLogger("tradehut.checkout")

NOT_SELLABLE_STATUSES = ("Archived", "Deleted", "Deactivated", "Suspended", "Draft", "Pending")
ZERO = Decimal("0.00")


# ----------------------------------------------------------------------------- data


@dataclass
class Line:
    variant: ProductVariant
    quantity: int
    unit_price: Decimal
    line_total: Decimal
    available: int
    error: str = ""


@dataclass
class Group:
    """Everything one seller (or the platform, ``seller=None``) will receive as a single order."""

    seller: object
    lines: list = field(default_factory=list)
    subtotal: Decimal = ZERO
    shipping: Decimal = ZERO
    tax: Decimal = ZERO
    discount: Decimal = ZERO
    total: Decimal = ZERO


@dataclass
class CartQuote:
    currency: str
    delivery_method: str
    promo_code: str
    promo: object
    groups: list
    subtotal: Decimal
    shipping: Decimal
    tax: Decimal
    discount: Decimal
    total: Decimal


# ---------------------------------------------------------------------------- pricing


def _unit_price(variant: ProductVariant) -> Decimal:
    pct = min(max(int(variant.product.discount_percentage or 0), 0), 100)
    return money(Decimal(variant.price) * (Decimal(100) - Decimal(pct)) / Decimal(100))


def _tax_rate(config: StoreConfig, address) -> Decimal:
    """``tax_country_rates`` entries match by ISO code or by label prefix ("Ghana" -> "Ghana — VAT")."""
    if config.tax_mode != "exclusive":
        return Decimal(0)
    country = (address.country or "").strip().lower()
    if country:
        for entry in config.tax_country_rates or []:
            code = str(entry.get("country", "")).strip().lower()
            label = str(entry.get("label", "")).strip().lower()
            if code == country or (len(country) > 2 and label.startswith(country)):
                return Decimal(str(entry.get("rate", 0)))
    return Decimal(str(config.tax_default_rate))


def _shipping_method(config: StoreConfig, wanted: str) -> dict:
    methods = [m for m in (config.shipping_methods or []) if m.get("enabled", True)]
    if wanted:
        method = next((m for m in methods if m.get("id") == wanted), None)
    else:
        method = next((m for m in methods if m.get("id") == "standard"), None) or (methods[0] if methods else None)
    if method is None:
        raise OrderApiError(422, "delivery_method_unavailable", "That delivery method isn't available.")
    return method


def _allocate(total: Decimal, weights: list) -> list:
    """Split ``total`` pro-rata over ``weights``; the last share takes the rounding remainder."""
    weight_sum = sum(weights, ZERO)
    if total <= 0 or weight_sum <= 0:
        return [ZERO for _ in weights]
    shares, used = [], ZERO
    for index, weight in enumerate(weights):
        share = total - used if index == len(weights) - 1 else money(total * weight / weight_sum)
        share = max(ZERO, min(share, weight))
        shares.append(share)
        used += share
    return shares


def _merge_items(items) -> dict:
    merged = {}
    for item in items:
        key = str(item["variant_id"])
        merged[key] = merged.get(key, 0) + int(item["quantity"])
    return merged


def price_cart(user, items, address, delivery_method, promo_code, *, strict) -> CartQuote:
    """Price ``items`` for ``user``. No order rows are written.

    ``strict=True`` (placing an order) turns a stock shortfall into 409 ``out_of_stock``;
    ``strict=False`` (the quote) reports it per line so the UI can show it.
    """
    wanted = _merge_items(items)
    variants = {
        str(v.pk): v
        for v in ProductVariant.objects.select_related("product", "product__seller_profile").filter(pk__in=list(wanted))
    }

    groups, order_of_groups = {}, []
    for variant_id, quantity in wanted.items():
        variant = variants.get(variant_id)
        product = variant.product if variant else None
        seller = product.seller_profile if product else None
        if (
            variant is None
            or product.available is False
            or (product.status or "") in NOT_SELLABLE_STATUSES
            or (seller is not None and (seller.verification_status != "verified" or not seller.is_active))
        ):
            raise OrderApiError(409, "listing_unavailable", "An item in your order is no longer available.", variant_id=variant_id)
        if seller is not None and not seller.is_accepting_orders:
            raise OrderApiError(409, "seller_not_accepting_orders", "A seller in your order isn't accepting orders.")
        minimum = max(int(variant.min_buy_amount or 1), 1)
        if quantity < minimum:
            raise OrderApiError(400, "below_minimum_quantity", f"The minimum quantity is {minimum}.", variant_id=variant_id, minimum=minimum)

        available = max(int(variant.quantity or 0), 0)
        error = ""
        if quantity > available:
            if strict:
                raise OrderApiError(409, "out_of_stock", "An item in your order is out of stock.", variant_id=variant_id, available=available)
            error = "out_of_stock"

        unit = _unit_price(variant)
        gkey = seller.pk if seller is not None else None
        if gkey not in groups:
            groups[gkey] = Group(seller=seller)
            order_of_groups.append(gkey)
        groups[gkey].lines.append(Line(variant, quantity, unit, money(unit * quantity), available, error))

    ordered = [groups[k] for k in order_of_groups]
    for group in ordered:
        group.subtotal = money(sum((line.line_total for line in group.lines), ZERO))

    config = StoreConfig.singleton()
    method = _shipping_method(config, (delivery_method or "").strip())
    rate = money(method.get("rate") or 0)
    threshold = Decimal(config.shipping_free_threshold or 0)

    # Promo: validated against the real cart, discount split across the orders it applies to.
    promo_result, promo_text = None, (promo_code or "").strip()
    if promo_text:
        ctx = promo_services.CartContext(
            subtotal=money(sum((g.subtotal for g in ordered), ZERO)),
            item_count=sum(line.quantity for g in ordered for line in g.lines),
            item_ids=[str(line.variant.product_id) for g in ordered for line in g.lines],
            category_ids=[str(line.variant.product.category_id) for g in ordered for line in g.lines],
            seller_ids=[str(g.seller.pk) for g in ordered if g.seller is not None],
            seller_subtotals={str(g.seller.pk): g.subtotal for g in ordered if g.seller is not None},
            user_id=str(user.pk),
        )
        promo_result = promo_services.validate_promo(promo_text, ctx, user)
        if not promo_result.valid:
            raise OrderApiError(422, "invalid_promo", promo_result.error_message, reason=promo_result.error_message)
        promo_seller = getattr(promo_result.promo, "seller_id", None)
        weights = [
            g.subtotal if (promo_seller is None or (g.seller is not None and str(g.seller.pk) == str(promo_seller))) else ZERO
            for g in ordered
        ]
        for group, share in zip(ordered, _allocate(money(promo_result.discount_amount), weights)):
            group.discount = share

    tax_rate = _tax_rate(config, address)
    for group in ordered:
        free = (
            rate == 0
            or (threshold > 0 and group.subtotal >= threshold)
            or all(getattr(line.variant.product, "free_shipping", False) for line in group.lines)
            or bool(promo_result and promo_result.free_shipping)
        )
        group.shipping = ZERO if free else rate
        taxable = group.subtotal - group.discount + (group.shipping if config.tax_charge_on_shipping else ZERO)
        group.tax = money(max(taxable, ZERO) * tax_rate / Decimal(100))
        group.total = money(group.subtotal - group.discount + group.shipping + group.tax)

    return CartQuote(
        currency=get_store_base_currency(),
        delivery_method=str(method.get("id")),
        promo_code=promo_text.upper() if promo_result else "",
        promo=promo_result.promo if promo_result else None,
        groups=ordered,
        subtotal=money(sum((g.subtotal for g in ordered), ZERO)),
        shipping=money(sum((g.shipping for g in ordered), ZERO)),
        tax=money(sum((g.tax for g in ordered), ZERO)),
        discount=money(sum((g.discount for g in ordered), ZERO)),
        total=money(sum((g.total for g in ordered), ZERO)),
    )


# -------------------------------------------------------------------------- payloads


def _seller_ref(seller):
    return {"id": str(seller.pk), "business_name": seller.business_name} if seller is not None else None


def _money_fields(subtotal, shipping, tax, discount, total) -> dict:
    return {
        "subtotal": str(money(subtotal)),
        "shipping_cost": str(money(shipping)),
        "tax_amount": str(money(tax)),
        "promo_discount": str(money(discount)),
        "total_amount": str(money(total)),
    }


def quote_payload(quote: CartQuote) -> dict:
    return {
        "currency": quote.currency,
        "delivery_method": quote.delivery_method,
        **_money_fields(quote.subtotal, quote.shipping, quote.tax, quote.discount, quote.total),
        "orders": [
            {"seller": _seller_ref(g.seller), **_money_fields(g.subtotal, g.shipping, g.tax, g.discount, g.total)}
            for g in quote.groups
        ],
        "lines": [
            {
                "variant_id": str(line.variant.pk),
                "quantity": line.quantity,
                "unit_price": str(line.unit_price),
                "line_total": str(line.line_total),
                "available_quantity": line.available,
                **({"error": line.error} if line.error else {}),
            }
            for g in quote.groups
            for line in g.lines
        ],
    }


def session_orders(session) -> list:
    """``[(order, seller_or_None)]`` for a session, oldest first."""
    orders = session.orders.prefetch_related("items__product__seller_profile").order_by("placed_at", "id")
    out = []
    for order in orders:
        first = next(iter(order.items.all()), None)
        out.append((order, first.product.seller_profile if first and first.product else None))
    return out


def session_payload(session, orders_with_sellers, *, payment_error=None) -> dict:
    """The P1 response. ``payment`` is what the browser needs next: a Paystack URL to open, or the COD marker."""
    if session.provider == "cod":
        payment = {"provider": "cod", "authorization_url": "", "reference": ""}
    elif session.status == "pending" and session.authorization_url:
        payment = {"provider": "paystack", "authorization_url": session.authorization_url, "reference": session.reference}
    else:
        payment = None
    payload = {
        "checkout_id": session.id.hex,
        "status": session.status,
        "currency": session.currency,
        "amount": str(money(session.amount)),
        "orders": [
            {
                "id": str(o.pk),
                "order_number": f"#{str(o.pk)[:8].upper()}",
                "seller": _seller_ref(seller),
                **_money_fields(o.subtotal or 0, o.shipping_cost or 0, o.tax_amount or 0, o.promo_discount or 0, o.total_amount),
            }
            for o, seller in orders_with_sellers
        ],
        "payment": payment,
    }
    if payment_error:
        payload["payment_error"] = payment_error
    return payload


# ------------------------------------------------------------------------ placement


def _gateway_enabled(gateway_id: str) -> bool:
    gateways = StoreConfig.singleton().payments_gateways or []
    return any(g.get("id") == gateway_id and g.get("enabled", False) for g in gateways)


def require_method_enabled(payment_method: str) -> None:
    """Refuse a payment method the store has switched off, or that is not set up (no Paystack key)."""
    if payment_method == "cod":
        if not _gateway_enabled("cod"):
            raise OrderApiError(422, "payment_method_unavailable", "Cash on delivery isn't available right now.")
    elif payment_method == "paystack":
        if not _gateway_enabled("paystack") or not paystack.is_configured():
            raise OrderApiError(
                422,
                "payment_method_unavailable",
                "Card and mobile money payments aren't available right now. Choose cash on delivery.",
            )
    else:
        raise OrderApiError(422, "payment_method_unavailable", "That payment method isn't available.")


def callback_url(session) -> str:
    """Where Paystack sends the buyer back after paying. The storefront's complete page then confirms it."""
    base = str(getattr(settings, "FRONTEND_URL", "") or "http://localhost:3000").rstrip("/")
    return f"{base}/checkout/complete?session={session.id.hex}"


def start_online_payment(session, user):
    """Open the Paystack hosted checkout for ``session``. Returns an error message, or None on success.

    Safe to call again: if a URL is already stored it is kept (Paystack rejects a reused reference).
    """
    if session.authorization_url:
        return None

    def initialize():
        return paystack.initialize(
            email=user.email,
            amount_minor=int((money(session.amount) * 100).to_integral_value()),
            currency=session.currency,
            reference=session.reference,
            callback_url=callback_url(session),
            metadata={"checkout_id": session.id.hex, "user_id": str(user.pk)},
        )

    try:
        try:
            data = initialize()
        except paystack.PaystackError as exc:
            if not exc.duplicate_reference:
                raise
            # An earlier attempt may have been accepted by Paystack although we never received its answer (a
            # timeout). That page was never shown to anyone, so a fresh reference for this attempt is safe.
            old = session.reference
            session.reference = f"{session.id.hex}-{secrets.token_hex(3)}"
            CheckoutSession.objects.filter(pk=session.pk).update(reference=session.reference)
            OrderPayment.objects.filter(session=session, reference=old).update(reference=session.reference)
            data = initialize()
    except paystack.PaystackError as exc:
        logger.warning("Paystack initialize failed for %s: %s", session.reference, exc)
        return "We couldn't open the payment page. Please try again in a moment."
    url = str(data.get("authorization_url") or "")
    if not url.startswith("https://"):
        logger.warning("Paystack returned no https authorization_url for %s", session.reference)
        return "We couldn't open the payment page. Please try again in a moment."
    session.authorization_url = url
    session.access_code = str(data.get("access_code") or "")[:100]
    CheckoutSession.objects.filter(pk=session.pk).update(
        authorization_url=session.authorization_url, access_code=session.access_code
    )
    return None


def place_checkout(user, *, items, address, delivery_method, promo_code, expected_total, key, payment_method):
    """Create the orders for a checkout. Returns ``(payload, created)``; ``created`` is False for a replay.

    ``cod``      -> orders start Processing (unpaid); cash is collected on delivery.
    ``paystack`` -> orders start Pending (unpaid) with stock reserved for ``CHECKOUT_PAYMENT_WINDOW_MINUTES``;
                    the Paystack hosted-checkout URL is opened after the database commit.
    """
    require_method_enabled(payment_method)
    online = payment_method == "paystack"

    with transaction.atomic():
        # Serialise this buyer's checkouts so a double-click / retry cannot create duplicates.
        User.objects.select_for_update().filter(pk=user.pk).first()

        existing = CheckoutSession.objects.filter(user=user, idempotency_key=key).first()
        if existing:
            return session_payload(existing, session_orders(existing)), False

        quote = price_cart(user, items, address, delivery_method, promo_code, strict=True)
        if expected_total is not None and money(expected_total) != quote.total:
            raise OrderApiError(409, "price_changed", "The price changed since you started checkout.", quote=quote_payload(quote))

        # Lock the variant rows (sorted ids => no deadlocks) and decrement stock under the lock.
        ids = sorted(line.variant.pk for g in quote.groups for line in g.lines)
        locked = dict(ProductVariant.objects.select_for_update().filter(pk__in=ids).order_by("pk").values_list("pk", "quantity"))
        for g in quote.groups:
            for line in g.lines:
                have = max(int(locked.get(line.variant.pk) or 0), 0)
                if line.quantity > have:
                    raise OrderApiError(409, "out_of_stock", "An item in your order is out of stock.", variant_id=str(line.variant.pk), available=have)
        for g in quote.groups:
            for line in g.lines:
                updated = ProductVariant.objects.filter(pk=line.variant.pk, quantity__gte=line.quantity).update(
                    quantity=F("quantity") - line.quantity
                )
                if not updated:
                    raise OrderApiError(409, "out_of_stock", "An item in your order is out of stock.", variant_id=str(line.variant.pk), available=0)

        now = timezone.now()
        session_id = uuid.uuid4()
        session = CheckoutSession.objects.create(
            id=session_id,
            user=user,
            idempotency_key=key,
            status="pending" if online else "cod",
            provider=payment_method,
            amount=quote.total,
            currency=quote.currency,
            reference=session_id.hex if online else None,
            expires_at=now + payment_flow.window() if online else None,
        )

        created = []
        for g in quote.groups:
            order = Order.objects.create(
                user=user,
                total_amount=g.total,
                # COD goes straight to fulfilment; an online order waits for the gateway to confirm payment.
                order_status="Pending" if online else "Processing",
                payment_status="unpaid",
                pay_mode="Online" if online else "COD",
                address=address,
                subtotal=g.subtotal,
                shipping_cost=g.shipping,
                tax_amount=g.tax,
                delivery_method=quote.delivery_method,
                promo_code=quote.promo_code or None,
                promo_discount=g.discount,
                placed_at=now,
                checkout_key=key,
            )
            OrderItem.objects.bulk_create(
                [
                    OrderItem(
                        order=order,
                        product=line.variant.product,
                        variant=line.variant,
                        quantity=line.quantity,
                        unit_price=line.unit_price,
                        total_price=line.line_total,
                    )
                    for line in g.lines
                ]
            )
            if quote.promo is not None and g.discount > 0:
                try:
                    promo_services.redeem_promo(quote.promo, order, user, g.discount)
                except promo_services.PromoExhaustedException:
                    raise OrderApiError(422, "invalid_promo", "That promo code has just run out.", reason="exhausted")
            created.append((order, g.seller))

        session.orders.set([order for order, _ in created])
        payment_flow.create_pending_payments(
            session, [order for order, _ in created], provider=payment_method, method="" if online else "cash"
        )

    # After the commit: talk to Paystack. A failure here leaves a valid pending session the browser can retry.
    payment_error = start_online_payment(session, user) if online else None
    return session_payload(session, created, payment_error=payment_error), True
