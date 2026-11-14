"""Paystack client (hosted checkout): start a payment, confirm it, verify webhook signatures.

Keys come from the environment only (``PAYSTACK_SECRET_KEY`` / ``PAYSTACK_PUBLIC_KEY``), never from the
StoreConfig JSON. Nothing here logs the secret key, request headers, or a full gateway payload.

Flow (Paystack's hosted page):
  1. ``initialize`` returns an ``authorization_url``; the buyer is redirected there to pay by card or mobile money.
  2. Paystack redirects back to our ``callback_url`` and also POSTs a signed ``charge.success`` webhook.
  3. The webhook (signature checked with ``valid_signature``) or the buyer's polling (``verify``, a server-to-server
     call to Paystack) marks the session paid. Both paths go through the same idempotent function.
"""

import hashlib
import hmac
import logging
from decimal import ROUND_HALF_UP, Decimal

import requests
from django.conf import settings

logger = logging.getLogger("tradehut.paystack")

TIMEOUT_SECONDS = 10

# Whitelist of gateway fields we keep. Anything else (authorization, customer, card, IP...) is dropped.
SAFE_FIELDS = ("id", "status", "reference", "amount", "currency", "channel", "gateway_response", "paid_at", "created_at")


class PaystackError(Exception):
    """The gateway could not be reached or refused the request. The message is safe to log.

    ``refused`` is True only when Paystack answered with a clear 4xx "no" (so nothing was created there).
    A timeout / network failure / 5xx is *unknown*: the request may still have been accepted.
    """

    def __init__(self, message: str, *, refused: bool = False, status_code: int | None = None):
        super().__init__(message)
        self.refused = refused
        self.status_code = status_code

    @property
    def not_found(self) -> bool:
        """Paystack has no such transaction (never started / reference unknown). Paystack answers 404, or a 400
        whose message says the reference was not found."""
        return self.status_code == 404 or (self.status_code == 400 and "not found" in str(self).lower())

    @property
    def duplicate_reference(self) -> bool:
        return "duplicate" in str(self).lower() and "reference" in str(self).lower()


def to_minor(amount) -> int:
    """Major units (GHS, 2dp) to the gateway's integer minor units (pesewas), rounded half up.

    The one place the x100 conversion lives; every caller of ``initialize`` / ``create_refund`` goes through it."""
    return int((Decimal(amount or 0).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP) * 100).to_integral_value())


def secret_key() -> str:
    return (getattr(settings, "PAYSTACK_SECRET_KEY", "") or "").strip()


def is_configured() -> bool:
    return bool(secret_key())


def _base_url() -> str:
    return (getattr(settings, "PAYSTACK_BASE_URL", "") or "https://api.paystack.co").rstrip("/")


def _headers() -> dict:
    return {"Authorization": f"Bearer {secret_key()}", "Content-Type": "application/json"}


def _request(method: str, path: str, **kwargs) -> dict:
    if not is_configured():
        raise PaystackError("Paystack is not configured.")
    try:
        response = requests.request(
            method, f"{_base_url()}{path}", headers=_headers(), timeout=TIMEOUT_SECONDS, **kwargs
        )
    except requests.RequestException as exc:
        raise PaystackError(f"Could not reach Paystack ({type(exc).__name__}).") from exc
    try:
        body = response.json()
    except ValueError:
        body = {}
    if response.status_code >= 400 or not body.get("status"):
        message = str(body.get("message") or f"HTTP {response.status_code}")[:200]
        refused = 400 <= response.status_code < 500 and body.get("status") is False
        raise PaystackError(f"Paystack refused the request: {message}", refused=refused, status_code=response.status_code)
    data = body.get("data")
    if not isinstance(data, dict):
        raise PaystackError("Paystack returned an unexpected response.")
    return data


def initialize(*, email: str, amount_minor: int, currency: str, reference: str, callback_url: str, metadata: dict) -> dict:
    """Start a hosted-checkout transaction. ``amount_minor`` is in pesewas/kobo (amount x 100)."""
    return _request(
        "POST",
        "/transaction/initialize",
        json={
            "email": email,
            "amount": int(amount_minor),
            "currency": currency,
            "reference": reference,
            "callback_url": callback_url,
            "metadata": metadata,
        },
    )


def verify(reference: str) -> dict:
    """Ask Paystack for the transaction's real state (never trust the browser's word for it)."""
    return _request("GET", f"/transaction/verify/{reference}")


def create_refund(*, reference: str, amount_minor: int, currency: str, merchant_note: str = "", customer_note: str = "") -> dict:
    """Ask Paystack to send ``amount_minor`` of the transaction ``reference`` back to the customer.

    This only QUEUES the refund (status "pending"); the money has moved when the ``refund.processed`` webhook
    arrives. Paystack has no idempotency key for refunds, so callers must guard against repeats themselves.
    """
    payload = {"transaction": reference, "amount": int(amount_minor), "currency": currency}
    if merchant_note:
        payload["merchant_note"] = merchant_note[:250]
    if customer_note:
        payload["customer_note"] = customer_note[:250]
    return _request("POST", "/refund", json=payload)


def valid_signature(raw_body: bytes, signature: str | None) -> bool:
    """Webhook authenticity: HMAC-SHA512 of the *raw* body with the secret key, constant-time compared."""
    if not signature or not is_configured():
        return False
    expected = hmac.new(secret_key().encode(), raw_body, hashlib.sha512).hexdigest()
    # Compare as bytes: a non-ASCII header value must be a clean "no", not a TypeError (500).
    return hmac.compare_digest(expected.encode(), signature.strip().lower().encode("utf-8", "ignore"))


def safe_payload(data: dict) -> dict:
    return {key: data[key] for key in SAFE_FIELDS if key in data}


REFUND_SAFE_FIELDS = ("id", "status", "amount", "currency", "deducted_amount", "fully_deducted", "refunded_at", "expected_at")


def safe_refund_payload(data: dict) -> dict:
    return {key: data[key] for key in REFUND_SAFE_FIELDS if key in data}
