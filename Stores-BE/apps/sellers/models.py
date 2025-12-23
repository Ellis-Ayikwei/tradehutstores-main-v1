from django.db import models
from django.utils.text import slugify
from apps.core.models import BaseModel
from django.conf import settings
from django.db.models import Sum


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

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="seller_profile",
    )

    business_name = models.CharField(max_length=255)
    business_description = models.TextField(blank=True, null=True)
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
                SellerProfile.objects.filter(store_slug=slug)
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
