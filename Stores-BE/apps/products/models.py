from datetime import datetime, time, timezone
from http import client
from math import prod
from operator import add
import random
from django.db import models
from django.forms import ValidationError, model_to_dict
from django.contrib.auth.models import AbstractUser, BaseUserManager
import uuid

from django.test import tag

from apps.core.models import BaseModel
from apps.catalog.models import Category, SubCategory, Brand, AttributeValue
from apps.promotions.models import Discount
from django.utils.text import slugify


CONDITION = (
    ("New", "New"),
    ("Used - Like New", "Used - Like New"),
    ("Used - Good", "Used - Good"),
    ("Used - Fair", "Used - Fair"),
    ("Refurbished", "Refurbished"),
)

PRODUCT_STATUS = (
    ("Active", "Active"),
    ("Deactivated", "Deactivated"),
    ("Archived", "Archived"),
    ("Deleted", "Deleted"),
    ("Pending", "Pending"),
    ("Draft", "Draft"),
    ("Published", "Published"),
    ("Suspended", "Suspended"),
)

VARIATION_THEMES = [
    ("single", "Single Product"),  # Standard product with no variations.
    ("size", "Size"),  # Variations based solely on size (e.g., Small, Medium, Large).
    ("color", "Color"),  # Variations based solely on color (e.g., Red, Blue, Green).
    (
        "material",
        "Material",
    ),  # Variations by fabric or material type (e.g., Cotton, Polyester).
    (
        "pattern",
        "Pattern",
    ),  # Variations based on design or pattern (e.g., Striped, Checked).
    ("style", "Style"),  # Variations by style or cut (e.g., Regular, Slim Fit).
    (
        "capacity",
        "Capacity",
    ),  # Common for electronics—differentiates by storage capacity (e.g., 64GB, 128GB).
    (
        "memory",
        "Memory",
    ),  # Variations for electronic devices based on RAM (e.g., 4GB, 8GB).
    (
        "size-color",
        "Size & Color",
    ),  # Combination: Variants differ by both size and color.
    (
        "size-material",
        "Size & Material",
    ),  # Combination: Variants differ by size and the type of material.
    (
        "color-style",
        "Color & Style",
    ),  # Combination: Variants differ by color and overall style.
    (
        "size-pattern",
        "Size & Pattern",
    ),  # Combination: Variants differ by size and pattern.
    ("size-style", "Size & Style"),  # Combination: Variants differ by size and style.
    (
        "size-color-style",
        "Size, Color & Style",
    ),  # Triple combination: Used for detailed differentiation in apparel.
    (
        "RAM Capacity-memory",
        "RAM Capacity & Memory",
    ),  # Combination for electronics merging storage capacity and memory options.
    (
        "custom",
        "Custom",
    ),  # Fallback for any unique or future combination not covered above.
]


def generate_unique_numbers():
    """Generates 11 unique numbers for a product."""
    numbers = []
    while len(numbers) < 11:
        num = random.randint(0, 9)
        if num not in numbers:
            numbers.append(num)
    return "".join(map(str, numbers))


def get_thin():
    return "TH-" + uuid.uuid4().hex[:9]


class Product(BaseModel):
    """
    Product Model
    """

    status = models.CharField(
        db_column="status",
        choices=PRODUCT_STATUS,
        max_length=255,
        blank=True,
        null=True,
    )
    name = models.CharField(max_length=255)
    keywords = models.CharField(db_column="Keywords", max_length=255)
    description = models.TextField(blank=True, null=True)
    slug = models.CharField(max_length=255, blank=True, null=True)
    # price = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    sub_category = models.ForeignKey(
        SubCategory, on_delete=models.CASCADE, db_column="Sub_category_id"
    )
    brand = models.ForeignKey(Brand, on_delete=models.CASCADE)
    main_product_image = models.ImageField(
        upload_to="main_product_images/", blank=True, null=True
    )
    min_amount = models.IntegerField(default=1, null=True)
    thin = models.CharField(
        db_column="THIN",
        max_length=100,
        blank=True,
        null=True,
        unique=True,
        default=get_thin,
    )
    inventory_level = models.IntegerField(blank=True, null=True)
    available = models.BooleanField(default=True)
    seller = models.ForeignKey(
        "users.User", on_delete=models.SET_NULL, null=True, blank=True
    )  # Legacy field
    seller_profile = models.ForeignKey(
        "sellers.SellerProfile",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products",
    )
    store = models.ForeignKey(
        "store.Store",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products",
    )
    condition = models.CharField(
        db_column="condition", choices=CONDITION, max_length=255, blank=True, null=True
    )
    variation_theme = models.CharField(
        max_length=20, choices=VARIATION_THEMES, default="single"
    )

    is_spare_part = models.BooleanField(default=False)
    requires_installation = models.BooleanField(default=False)

    # last_viewed = models.DateTimeField(auto_now=True)
    # view_counts = models.IntegerField(default=0)
    is_product_of_the_month = models.BooleanField(default=False)

    # Optional SEO fields
    meta_title = models.CharField(max_length=255, blank=True, null=True)
    meta_description = models.TextField(blank=True, null=True)

    # Ratings and reviews
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    total_reviews = models.IntegerField(default=0)

    # Discounts and offers
    # discount_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    discount_percentage = models.IntegerField(default=0, blank=True, null=True)

    default_variant = models.ForeignKey(
        "ProductVariant",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="default_for_product",
    )

    @property
    def reviews(self):
        from apps.reviews.models import Review

        return Review.objects.filter(product=self)

    def get_rating(self):
        """Calculates and returns the average rating of the product."""
        reviews = self.reviews
        if reviews.exists():
            return round(sum(review.rating for review in reviews) / reviews.count(), 2)
        return self.average_rating

    class Meta:
        managed = True
        db_table = "products"
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["brand", "category"]),
        ]

    def __str__(self):
        return f"{self.brand} {self.name}"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(f"{self.brand} {self.name}")
        super().save(*args, **kwargs)

    # def clean(self):
    #     # Validate variation theme consistency
    #     if self.variation_theme != 'single' and not self.variants.exists():
    #         raise ValidationError("Variation products must have at least one variant")

    @property
    def available_variants(self):
        return self.variants.filter(quantity__gt=0)

    @property
    def price_range(self):
        from django.db.models import Min, Max

        result = self.variants.aggregate(min_price=Min("price"), max_price=Max("price"))
        return (result["min_price"], result["max_price"])


class ProductVariant(BaseModel):
    product = models.ForeignKey(
        Product, related_name="variants", on_delete=models.CASCADE
    )
    sku = models.CharField(max_length=100, unique=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.IntegerField(default=0, null=True)
    min_buy_amount = models.IntegerField(default=1, null=True)
    attribute_values = models.ManyToManyField(
        AttributeValue, related_name="product_variants", blank=True
    )
    name = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        managed = True
        db_table = "product_variants"

    def get_final_price(self):
        """Calculate final price after discount."""
        return self.price - (self.price * self.product.discount_percentage / 100)

    @property
    def variant_name(self):
        # Get the product's variation theme.
        theme = self.product.variation_theme
        # For "single" or "custom" themes, you might prefer the standard display.
        if theme in ["single", "custom"]:
            return ", ".join(
                [
                    f"{av.attribute.name}: {av.value_name}"
                    for av in self.attribute_values.all().order_by("attribute__name")
                ]
            )
        # For other themes, split the variation theme (e.g., "size-color" becomes ["size", "color"])
        expected_attrs = theme.split("-")
        values = []
        for attr in expected_attrs:
            # Try to find the matching AttributeValue for this attribute name (case-insensitive)
            av = self.attribute_values.filter(attribute__name__iexact=attr).first()
            if av:
                values.append(av.value_name)
            values = ", ".join(values)
            return values

    @property
    def is_available(self):
        return self.quantity > 0

    @property
    def main_image(self):
        return self.product_variant_images.filter(is_main=True).first()

    def __str__(self):
        theme = self.product.variation_theme
        name = self.variant_name

        return f"{self.product.name} - {name}"


class ProductImage(BaseModel):
    IMAGE_TYPES = [
        ("main", "Main Image"),
        ("supplementary", "Supplementary Image"),
        ("infographic", "Infographic Image"),
    ]
    product = models.ForeignKey(
        Product,
        null=False,
        default=None,
        on_delete=models.CASCADE,
        related_name="product_images",
    )
    product_variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.CASCADE,
        related_name="product_variant_images",
        default=None,
    )
    image = models.ImageField(upload_to="product_images/", null=True, blank=True)
    is_main = models.BooleanField(default=False)
    image_type = models.CharField(
        max_length=20, choices=IMAGE_TYPES, default="supplementary"
    )

    def __str__(self):
        return f"{self.product_variant.sku} - {'Main' if self.is_main else 'Secondary'} Image"

    class Meta:
        ordering = ["-is_main", "created_at"]
        managed = True
        db_table = "product_images"


class ProductDiscount(BaseModel):
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, blank=True, null=True
    )
    discount = models.ForeignKey(
        Discount, on_delete=models.CASCADE, blank=True, null=True
    )
    new_price = models.DecimalField(max_digits=10, decimal_places=2)
    discount_start = models.DateTimeField()
    discount_end = models.DateTimeField()

    class Meta:
        managed = True
        db_table = "product_discounts"


class Manufacturer(BaseModel):
    manufacturername = models.CharField(db_column="ManufacturerName", max_length=255)
    address = models.TextField(db_column="Address", blank=True, null=True)
    phone = models.CharField(db_column="Phone", max_length=20, blank=True, null=True)
    email = models.CharField(db_column="Email", max_length=100, blank=True, null=True)
    website = models.CharField(
        db_column="Website", max_length=255, blank=True, null=True
    )
    contactperson = models.CharField(
        db_column="ContactPerson", max_length=100, blank=True, null=True
    )

    class Meta:
        managed = True
        db_table = "manufacturers"


class ProductKeyFeature(BaseModel):
    product = models.ForeignKey(
        Product,
        related_name="key_features",
        on_delete=models.CASCADE,
        blank=True,
        null=True,
    )
    name = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        managed = True
        db_table = "product_keyfeatures"


class ProductView(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    user = models.ForeignKey(
        "users.User", on_delete=models.SET_NULL, null=True, blank=True
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, null=True, blank=True)


class ProductAnalytics(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    date = models.DateField()
    views = models.IntegerField(default=0)
    unique_views = models.IntegerField(default=0)
    engagement_time = models.IntegerField(default=0)  # in seconds
    bounce_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)


class Promotion(models.Model):
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="promotions"
    )
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2)
    start_date = models.DateTimeField(default=datetime.now)
    end_date = models.DateTimeField()
    description = models.TextField(blank=True, null=True)
    priority = models.IntegerField(default=0)

    def is_active(self):
        now = datetime.now()
        return self.start_date <= now <= self.end_date

    def __str__(self):
        return f"Promotion for {self.product.name} ({self.discount_percentage}%)"


class PurchaseHistory(BaseModel):
    user = models.ForeignKey(
        "users.User", on_delete=models.CASCADE, related_name="purchase_histories"
    )
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="purchases"
    )
    quantity = models.PositiveIntegerField(default=1)

    def __str__(self):
        return (
            f"{self.user.username} purchased {self.product.name} on {self.created_at}"
        )

    class Meta:
        managed = True
        db_table = "purchase_histories"


class Inventory(BaseModel):
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, blank=True, null=True
    )
    quantity_in_stock = models.IntegerField()
    restock_date = models.DateTimeField()

    class Meta:
        managed = True
        db_table = "inventory"
