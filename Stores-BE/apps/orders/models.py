from datetime import datetime, time
from http import client
from math import prod
from operator import add
import random
from django.db import models
from django.utils import timezone
from django.forms import model_to_dict
from django.contrib.auth.models import AbstractUser, BaseUserManager
import uuid

from apps.core.models import BaseModel
from apps.products.models import Product
from apps.users.models import User





ORDER_STATUS = (
    ('Pending', 'Pending'),
    ('Processing', 'Processing'),
    ('Shipped', 'Shipped'),
    ('Delivered', 'Delivered'),
    ('Cancelled', 'Cancelled'),
    ('Refunded', 'Refunded'),
)

PAYMENT_STATUS = (
    ('unpaid', 'Unpaid'),
    ('paid', 'Paid'),
    ('refunded', 'Refunded'),
    ('partially_refunded', 'Partially refunded'),
)

PAY_MODE = (
    ('COD', 'Cash on Delivery'),
    ('Online', 'Online'),
    ('Bank Transfer', 'Bank Transfer'),
    ('Card', 'Card'),
    ('Paypal', 'Paypal'),    
)


class Order(BaseModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user', blank=True, null=True)
    total_amount = models.DecimalField(db_column='TotalAmount', max_digits=10, decimal_places=2)
    order_status = models.CharField(db_column='Order_status',  choices=ORDER_STATUS, max_length=20, blank=True, null=True)
    address = models.ForeignKey(
        'users.Address',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='orders',
        db_column='AddressID',
    )
    pay_mode = models.CharField(db_column='Pay_Mode', choices=PAY_MODE, max_length=100)
    phone = models.BigIntegerField(blank=True, null=True)
    estimated_delivery_date = models.DateField(db_column='EstimatedDeliveryDate', blank=True, null=True)

    # Checkout pricing snapshot (base currency)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    shipping_cost = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    delivery_method = models.CharField(max_length=50, blank=True, null=True)
    promo_code = models.CharField(max_length=64, blank=True, null=True)
    promo_discount = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)

    # Lifecycle (plan 20 section 1). `created_at` is auto_now, so never use it as "placed".
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default='unpaid', db_index=True)
    placed_at = models.DateTimeField(default=timezone.now, db_index=True)
    paid_at = models.DateTimeField(blank=True, null=True)
    shipped_at = models.DateTimeField(blank=True, null=True)
    delivered_at = models.DateTimeField(blank=True, null=True)

    # Seller-entered shipment details (O7). Kept on the order because apps.shipments has no
    # migrations yet; move to a Shipment row when that app is built.
    tracking_carrier = models.CharField(max_length=100, blank=True, default='')
    tracking_number = models.CharField(max_length=100, blank=True, default='')
    tracking_url = models.URLField(max_length=500, blank=True, default='')

    # Buyer checkout idempotency (plan 20, P1): every order created by one POST /checkout/ carries the
    # request's Idempotency-Key, so a retried request returns the same orders instead of creating more.
    checkout_key = models.CharField(max_length=64, blank=True, null=True, db_index=True)

    # Cancellation (seller or admin). Stock is returned and, if it was paid through the gateway, refunded.
    cancelled_at = models.DateTimeField(blank=True, null=True)
    cancel_reason = models.CharField(max_length=500, blank=True, default='')

    products = models.ManyToManyField(Product, through='OrderItem', blank=True)
    class Meta:
        managed = True
        db_table = 'orders'





class OrderItem(BaseModel):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, blank=True, null=True, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, blank=True, null=True)
    variant = models.ForeignKey(
        'products.ProductVariant', on_delete=models.SET_NULL, blank=True, null=True
    )
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        managed = True
        db_table = 'order_items'





SESSION_STATUS = (
    ('pending', 'Pending'),            # online payment started, waiting for the gateway
    ('paid', 'Paid'),
    ('cod', 'Cash on delivery'),       # nothing to collect online
    ('expired', 'Expired'),            # not paid in time: orders cancelled, stock restored
    ('failed', 'Failed'),
    ('needs_review', 'Needs review'),  # money arrived but could not be matched safely: an admin decides
)

PAYMENT_PROVIDER = (
    ('paystack', 'Card or mobile money'),
    ('cod', 'Cash on delivery'),
    ('manual', 'Recorded by an admin'),
)

PAYMENT_METHOD = (
    ('card', 'Card'),
    ('mobile_money', 'Mobile money'),
    ('cash', 'Cash'),
    ('bank_transfer', 'Bank transfer'),
    ('other', 'Other'),
)

PAYMENT_STATE = (
    ('pending', 'Pending'),
    ('succeeded', 'Succeeded'),
    ('failed', 'Failed'),
    ('refunded', 'Refunded'),
    # The gateway took money we could not safely match to the orders (arrived late, or the wrong amount).
    # An admin refunds it, or cancels / accepts the orders.
    ('needs_review', 'Needs review'),
)


class CheckoutSession(BaseModel):
    """One buyer checkout: the orders it created, how they are paid, and the gateway reference.

    ``reference`` is the Paystack transaction reference (== ``id.hex``); it is NULL for cash on delivery.
    ``(user, idempotency_key)`` is unique, so a retried request returns this row instead of a second order.
    """

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='checkout_sessions')
    idempotency_key = models.CharField(max_length=64)
    status = models.CharField(max_length=16, choices=SESSION_STATUS, default='pending', db_index=True)
    provider = models.CharField(max_length=16, choices=PAYMENT_PROVIDER)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3)
    reference = models.CharField(max_length=100, unique=True, blank=True, null=True)
    authorization_url = models.URLField(max_length=500, blank=True, default='')
    access_code = models.CharField(max_length=100, blank=True, default='')
    orders = models.ManyToManyField(Order, related_name='checkout_sessions', blank=True)
    expires_at = models.DateTimeField(blank=True, null=True, db_index=True)
    paid_at = models.DateTimeField(blank=True, null=True)
    last_verified_at = models.DateTimeField(blank=True, null=True)
    # Whitelisted gateway fields only (never card / customer data).
    provider_payload = models.JSONField(default=dict, blank=True)

    class Meta:
        managed = True
        db_table = 'checkout_sessions'
        constraints = [
            models.UniqueConstraint(fields=['user', 'idempotency_key'], name='uniq_checkout_session_per_key'),
        ]


class OrderPayment(BaseModel):
    """Ledger row: one payment against one order. What admins see, and what they add to by hand.

    A Paystack checkout covering several seller orders produces one row per order, all sharing the
    session's reference. ``created_at`` on BaseModel is auto_now, so ``recorded_at`` is the real date.
    """

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='payments')
    session = models.ForeignKey(
        CheckoutSession, on_delete=models.SET_NULL, null=True, blank=True, related_name='payments'
    )
    provider = models.CharField(max_length=16, choices=PAYMENT_PROVIDER)
    method = models.CharField(max_length=16, choices=PAYMENT_METHOD, blank=True, default='')
    status = models.CharField(max_length=16, choices=PAYMENT_STATE, default='pending', db_index=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3)
    reference = models.CharField(max_length=100, blank=True, default='', db_index=True)
    recorded_at = models.DateTimeField(default=timezone.now, db_index=True)
    paid_at = models.DateTimeField(blank=True, null=True)
    recorded_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='recorded_payments'
    )
    note = models.CharField(max_length=500, blank=True, default='')
    idempotency_key = models.CharField(max_length=64, blank=True, null=True)
    provider_payload = models.JSONField(default=dict, blank=True)

    class Meta:
        managed = True
        db_table = 'order_payments'
        constraints = [
            models.UniqueConstraint(
                fields=['provider', 'reference', 'order'],
                condition=~models.Q(reference=''),
                name='uniq_payment_ref_per_order',
            ),
            models.UniqueConstraint(
                fields=['recorded_by', 'idempotency_key'],
                condition=models.Q(idempotency_key__isnull=False),
                name='uniq_manual_payment_per_key',
            ),
        ]


class OrderShipment(BaseModel):
    """How an order was dispatched. The tracking number is generated by the platform (never typed by hand);
    ``courier_reference`` is the carrier's own waybill number, when there is one. The same carrier / tracking /
    link are mirrored onto ``Order.tracking_*`` so every existing screen keeps working."""

    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='order_shipment')
    tracking_number = models.CharField(max_length=32, unique=True)
    carrier = models.CharField(max_length=100)
    service_level = models.CharField(max_length=50, blank=True, default='')
    courier_reference = models.CharField(max_length=100, blank=True, default='')
    tracking_url = models.URLField(max_length=500, blank=True, default='')
    parcels = models.PositiveSmallIntegerField(default=1)
    weight_kg = models.DecimalField(max_digits=8, decimal_places=2, blank=True, null=True)
    length_cm = models.DecimalField(max_digits=7, decimal_places=1, blank=True, null=True)
    width_cm = models.DecimalField(max_digits=7, decimal_places=1, blank=True, null=True)
    height_cm = models.DecimalField(max_digits=7, decimal_places=1, blank=True, null=True)
    dispatch_date = models.DateField(blank=True, null=True)
    estimated_delivery_date = models.DateField(blank=True, null=True)
    contact_name = models.CharField(max_length=100, blank=True, default='')
    contact_phone = models.CharField(max_length=32, blank=True, default='')
    buyer_note = models.CharField(max_length=300, blank=True, default='')      # shown to the buyer
    internal_note = models.CharField(max_length=500, blank=True, default='')   # seller / staff only
    shipped_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')

    class Meta:
        managed = True
        db_table = 'order_shipments'


REFUND_STATE = (
    ('pending', 'Pending'),      # asked of the gateway (or awaiting its confirmation); the amount is reserved
    ('succeeded', 'Succeeded'),  # money has gone back to the customer
    ('failed', 'Failed'),        # refused / reversed: the amount is available to refund again
)

REFUND_PROVIDER = (
    ('paystack', 'Through the payment gateway'),
    ('manual', 'Paid back outside the gateway'),
)


class OrderRefund(BaseModel):
    """Money returned to a customer for one payment. Pending and succeeded refunds both reserve their amount,
    so the total refunded for a payment can never exceed what was paid, even with concurrent requests."""

    payment = models.ForeignKey(OrderPayment, on_delete=models.PROTECT, related_name='refunds')
    order = models.ForeignKey(Order, on_delete=models.PROTECT, related_name='refunds')
    provider = models.CharField(max_length=16, choices=REFUND_PROVIDER)
    status = models.CharField(max_length=16, choices=REFUND_STATE, default='pending', db_index=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3)
    reason = models.CharField(max_length=500, blank=True, default='')
    # The gateway's own refund id (Paystack returns an integer); used to match its webhook.
    provider_refund_id = models.CharField(max_length=64, blank=True, default='', db_index=True)
    requested_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='requested_refunds'
    )
    requested_at = models.DateTimeField(default=timezone.now, db_index=True)
    processed_at = models.DateTimeField(blank=True, null=True)
    failure_note = models.CharField(max_length=500, blank=True, default='')
    idempotency_key = models.CharField(max_length=64, blank=True, null=True)
    provider_payload = models.JSONField(default=dict, blank=True)

    class Meta:
        managed = True
        db_table = 'order_refunds'
        constraints = [
            models.UniqueConstraint(
                fields=['requested_by', 'idempotency_key'],
                condition=models.Q(idempotency_key__isnull=False),
                name='uniq_refund_per_key',
            ),
        ]


class ReturnRequest(BaseModel):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, blank=True, null=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, blank=True, null=True)
    reason = models.TextField()
    status = models.CharField(max_length=50)
    request_date = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = True
        db_table = 'return_requests'
