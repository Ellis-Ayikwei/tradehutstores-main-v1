from apps.core.models import BaseModel
from django.db import models


class StoreSettings(BaseModel):
    setting_name = models.CharField(max_length=255)
    setting_value = models.CharField(max_length=255)

    class Meta:
        managed = True
        db_table = "store_settings"


class Store(BaseModel):
    """
    Individual store/shop managed by a seller.
    A seller can have multiple stores (optional feature).
    """

    seller = models.ForeignKey(
        "sellers.SellerProfile", on_delete=models.CASCADE, related_name="stores"
    )

    # Store Information
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    description = models.TextField(blank=True, null=True)

    # Store Images
    logo = models.ImageField(upload_to="store_logos/", blank=True, null=True)
    banner = models.ImageField(upload_to="store_banners/", blank=True, null=True)

    # Contact Information
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)

    # Settings
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)

    # Metrics
    total_products = models.IntegerField(default=0)
    total_sales = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    class Meta:
        managed = True
        db_table = "stores"
        indexes = [
            models.Index(fields=["seller", "is_active"]),
            models.Index(fields=["slug"]),
        ]

    def __str__(self):
        return f"{self.name} - {self.seller.business_name}"

    def update_product_count(self):
        """Update total products count"""
        from apps.products.models import Product

        self.total_products = Product.objects.filter(store=self).count()
        self.save()
