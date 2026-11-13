import os
import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.core.models import BaseModel


def attachment_upload_to(instance, filename):
    """Non-guessable storage name: the original name is kept in ``RFQAttachment.filename``."""
    extension = os.path.splitext(filename)[1].lower()
    return f"rfq_attachments/{timezone.now():%Y/%m}/{uuid.uuid4().hex}{extension}"


class RFQ(BaseModel):
    STATUS_DRAFT = "draft"
    STATUS_OPEN = "open"
    STATUS_QUOTING = "quoting"
    STATUS_AWARDED = "awarded"
    STATUS_CLOSED = "closed"
    STATUS_CANCELLED = "cancelled"
    STATUS_EXPIRED = "expired"
    STATUS_CHOICES = [
        (STATUS_DRAFT, "Draft"),
        (STATUS_OPEN, "Open"),
        (STATUS_QUOTING, "Quoting"),
        (STATUS_AWARDED, "Awarded"),
        (STATUS_CLOSED, "Closed"),
        (STATUS_CANCELLED, "Cancelled"),
        (STATUS_EXPIRED, "Expired"),
    ]

    reference = models.CharField(max_length=16, unique=True)
    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="rfqs"
    )
    title = models.CharField(max_length=200)
    description = models.TextField()
    category = models.ForeignKey(
        "catalog.Category", on_delete=models.PROTECT, related_name="rfqs"
    )
    sub_category = models.ForeignKey(
        "catalog.SubCategory",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="rfqs",
    )
    quantity = models.PositiveIntegerField()
    unit = models.CharField(max_length=32, default="units")
    budget_min = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    budget_max = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=3)
    delivery_country = models.CharField(max_length=2)
    delivery_city = models.CharField(max_length=120, blank=True)
    needed_by = models.DateField(null=True, blank=True)
    closes_at = models.DateTimeField()
    specs = models.JSONField(default=list, blank=True)

    status = models.CharField(
        max_length=12, choices=STATUS_CHOICES, default=STATUS_DRAFT, db_index=True
    )
    # Quotes received and not withdrawn (submitted, accepted or not_selected).
    quote_count = models.PositiveIntegerField(default=0)
    awarded_quote = models.ForeignKey(
        "rfq.Quote", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    order = models.ForeignKey(
        "orders.Order", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )

    published_at = models.DateTimeField(null=True, blank=True)
    awarded_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)

    create_idempotency_key = models.CharField(max_length=64)
    award_idempotency_key = models.CharField(max_length=64, null=True, blank=True)
    created_on = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        db_table = "rfqs"
        constraints = [
            models.UniqueConstraint(
                fields=["buyer", "create_idempotency_key"], name="uniq_rfq_buyer_create_key"
            ),
            models.CheckConstraint(
                condition=Q(budget_min__isnull=True)
                | Q(budget_max__isnull=True)
                | Q(budget_min__lte=models.F("budget_max")),
                name="rfq_budget_min_lte_max",
            ),
            models.CheckConstraint(condition=Q(quantity__gte=1), name="rfq_quantity_gte_1"),
            # One order per RFQ: an order can be the award of at most one request.
            models.UniqueConstraint(
                fields=["order"], condition=Q(order__isnull=False), name="uniq_rfq_order"
            ),
        ]
        indexes = [
            models.Index(fields=["status", "closes_at"], name="rfq_status_closes_idx"),
            models.Index(fields=["category", "status"], name="rfq_category_status_idx"),
            models.Index(fields=["buyer", "status"], name="rfq_buyer_status_idx"),
        ]

    def __str__(self):
        return f"{self.reference} ({self.status})"


class RFQAttachment(BaseModel):
    rfq = models.ForeignKey(RFQ, on_delete=models.CASCADE, related_name="attachments")
    file = models.FileField(upload_to=attachment_upload_to)
    filename = models.CharField(max_length=255)
    content_type = models.CharField(max_length=100)
    size = models.PositiveIntegerField()
    created_on = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "rfq_attachments"


class Quote(BaseModel):
    STATUS_SUBMITTED = "submitted"
    STATUS_WITHDRAWN = "withdrawn"
    STATUS_ACCEPTED = "accepted"
    STATUS_NOT_SELECTED = "not_selected"
    STATUS_CHOICES = [
        (STATUS_SUBMITTED, "Submitted"),
        (STATUS_WITHDRAWN, "Withdrawn"),
        (STATUS_ACCEPTED, "Accepted"),
        (STATUS_NOT_SELECTED, "Not selected"),
    ]

    rfq = models.ForeignKey(RFQ, on_delete=models.PROTECT, related_name="quotes")
    supplier = models.ForeignKey(
        "sellers.SellerProfile", on_delete=models.PROTECT, related_name="rfq_quotes"
    )
    product = models.ForeignKey(
        "products.Product",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="rfq_quotes",
    )
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    quantity = models.PositiveIntegerField()
    total_price = models.DecimalField(max_digits=14, decimal_places=2)
    shipping_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    currency = models.CharField(max_length=3)
    lead_time_days = models.PositiveSmallIntegerField()
    valid_until = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    status = models.CharField(
        max_length=14, choices=STATUS_CHOICES, default=STATUS_SUBMITTED, db_index=True
    )
    submitted_at = models.DateTimeField(null=True, blank=True)
    withdrawn_at = models.DateTimeField(null=True, blank=True)
    idempotency_key = models.CharField(max_length=64, null=True, blank=True)
    created_on = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "rfq_quotes"
        constraints = [
            models.UniqueConstraint(fields=["rfq", "supplier"], name="uniq_quote_per_supplier"),
            models.CheckConstraint(condition=Q(unit_price__gt=0), name="rfq_quote_unit_price_gt_0"),
            models.CheckConstraint(
                condition=Q(shipping_cost__gte=0), name="rfq_quote_shipping_gte_0"
            ),
            # DB backstop for "award at most once": one accepted quote per RFQ.
            models.UniqueConstraint(
                fields=["rfq"],
                condition=Q(status="accepted"),
                name="uniq_rfq_one_accepted_quote",
            ),
        ]
        indexes = [
            models.Index(fields=["rfq", "status"], name="rfq_quote_rfq_status_idx"),
            models.Index(fields=["supplier", "status"], name="rfq_quote_sup_status_idx"),
        ]

    def __str__(self):
        return f"{self.total_price} on {self.rfq_id}"

    @property
    def grand_total(self):
        return self.total_price + self.shipping_cost
