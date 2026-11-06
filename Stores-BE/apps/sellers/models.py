import uuid
from pathlib import PurePath

from django.db import models
from django.utils import timezone
from django.utils.text import slugify
from apps.core.models import BaseModel
from .storage import private_document_storage
from django.conf import settings
from django.db.models import Sum


# Path segments under /sellers/ that a store slug must never shadow.
RESERVED_STORE_SLUGS = frozenset(
    {"me", "list", "onboarding", "admin", "documents", "resubmit"}
)


class SellerProfile(BaseModel):
    """
    Seller/Vendor profile - moved from users app.
    """

    VERIFICATION_STATUS_CHOICES = [
        ("pending", "Pending Verification"),
        ("verified", "Verified"),
        ("rejected", "Rejected"),
        ("suspended", "Suspended"),
    ]

    BUSINESS_TYPE_CHOICES = [
        ("individual", "Individual"),
        ("registered_business", "Registered business"),
    ]

    ID_TYPE_CHOICES = [
        ("ghana_card", "Ghana Card"),
        ("passport", "Passport"),
        ("drivers_licence", "Driver's licence"),
        ("voters_id", "Voter's ID"),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="seller_profile",
    )

    business_type = models.CharField(
        max_length=24, choices=BUSINESS_TYPE_CHOICES, default="individual"
    )
    # KYC identity. Never exposed by public serializers; masked (last 4) for the seller.
    id_type = models.CharField(max_length=20, choices=ID_TYPE_CHOICES, blank=True)
    id_number = models.CharField(max_length=64, blank=True)

    business_name = models.CharField(max_length=255)
    business_description = models.TextField(blank=True, null=True)
    # What the seller sells: picked from the catalog; ``other_category`` is a short
    # free-text fallback for a category that is not listed (staff-only, never public).
    selling_categories = models.ManyToManyField(
        "catalog.Category", blank=True, related_name="seller_profiles"
    )
    other_category = models.CharField(max_length=80, blank=True, default="")
    business_email = models.EmailField(blank=True, null=True)
    business_phone = models.CharField(max_length=20, blank=True, null=True)
    business_address = models.TextField(blank=True, null=True)

    business_registration_number = models.CharField(
        max_length=100, blank=True, null=True
    )
    tax_id = models.CharField(max_length=100, blank=True, null=True)

    bank_name = models.CharField(max_length=255, blank=True, null=True)
    bank_account_number = models.CharField(max_length=100, blank=True, null=True)
    bank_account_name = models.CharField(max_length=255, blank=True, null=True)
    bank_routing_number = models.CharField(max_length=100, blank=True, null=True)

    is_verified = models.BooleanField(default=False)
    verification_status = models.CharField(
        max_length=20, choices=VERIFICATION_STATUS_CHOICES, default="pending"
    )
    verification_date = models.DateTimeField(blank=True, null=True)
    verification_notes = models.TextField(blank=True, null=True)

    store_logo = models.ImageField(upload_to="seller_logos/", blank=True, null=True)
    store_banner = models.ImageField(upload_to="seller_banners/", blank=True, null=True)
    store_slug = models.SlugField(max_length=255, unique=True, blank=True, null=True)

    total_sales = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_orders = models.IntegerField(default=0)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    total_reviews = models.IntegerField(default=0)

    commission_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=10.00,
        help_text="Platform commission percentage",
    )

    is_active = models.BooleanField(default=True)
    is_accepting_orders = models.BooleanField(default=True)

    website_url = models.URLField(blank=True, null=True)
    facebook_url = models.URLField(blank=True, null=True)
    instagram_url = models.URLField(blank=True, null=True)
    twitter_url = models.URLField(blank=True, null=True)

    return_policy = models.TextField(blank=True, null=True)
    shipping_policy = models.TextField(blank=True, null=True)
    terms_and_conditions = models.TextField(blank=True, null=True)

    class Meta:
        managed = True
        db_table = "seller_profiles"
        indexes = [
            models.Index(fields=["user", "is_verified"]),
            models.Index(fields=["store_slug"]),
            models.Index(fields=["verification_status"]),
        ]

    def __str__(self):
        return (
            f"{self.business_name} ({self.user})" if self.user else self.business_name
        )

    def save(self, *args, **kwargs):
        if not self.store_slug and self.business_name:
            base_slug = slugify(self.business_name)
            slug = base_slug
            counter = 1
            while (
                slug in RESERVED_STORE_SLUGS
                or SellerProfile.objects.filter(store_slug=slug)
                .exclude(pk=self.pk)
                .exists()
            ):
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.store_slug = slug
        super().save(*args, **kwargs)

    def get_rating_percentage(self):
        return (self.rating / 5) * 100 if self.rating else 0

    def update_metrics(self):
        from apps.orders.models import Order
        from apps.reviews.models import Review

        seller_orders = Order.objects.filter(
            items__product__seller_profile=self
        ).distinct()
        self.total_orders = seller_orders.count()

        total = seller_orders.aggregate(total=Sum("total_amount"))["total"] or 0
        self.total_sales = total

        reviews = Review.objects.filter(product__seller_profile=self)
        self.total_reviews = reviews.count()
        if self.total_reviews > 0:
            avg_rating = reviews.aggregate(avg=models.Avg("rating"))["avg"] or 0
            self.rating = round(avg_rating, 2)

        self.save()


def seller_document_path(instance, filename):
    """Unguessable storage key; the original file name is never part of the path."""
    ext = PurePath(filename).suffix.lower()
    return f"seller_documents/{instance.seller_id}/{uuid.uuid4().hex}{ext}"


class SellerDocument(BaseModel):
    """A KYC / business document uploaded by a seller and reviewed by staff."""

    KIND_CHOICES = [
        ("id_card", "ID card (front)"),
        ("id_card_back", "ID card (back)"),
        ("selfie_with_id", "Selfie holding ID"),
        ("proof_of_address", "Proof of address"),
        ("business_registration", "Business registration"),
        ("other", "Other"),
    ]
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
        ("superseded", "Superseded by a newer upload"),
    ]

    seller = models.ForeignKey(
        SellerProfile, on_delete=models.CASCADE, related_name="documents"
    )
    kind = models.CharField(max_length=24, choices=KIND_CHOICES)
    file = models.FileField(
        upload_to=seller_document_path,
        storage=private_document_storage,
        max_length=255,
    )
    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default="pending", db_index=True
    )
    note = models.CharField(max_length=500, blank=True)
    created_on = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        db_table = "seller_documents"
        ordering = ["-created_on"]
        indexes = [models.Index(fields=["seller", "kind"])]

    def __str__(self):
        return f"{self.seller_id} {self.kind} ({self.status})"
