from django.db import models
from apps.Basemodel.models import Basemodel


class ItemCategory(Basemodel):
    """Categories of items that can be transported"""

    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    requires_special_handling = models.BooleanField(default=False, null=True)
    restricted = models.BooleanField(default=False, null=True)
    insurance_required = models.BooleanField(default=False, null=True)
    price_multiplier = models.DecimalField(max_digits=4, decimal_places=2, default=1.0)
    special_instructions = models.TextField(blank=True)
    # Visual properties for frontend
    icon = models.CharField(
        max_length=100, blank=True, help_text="FontAwesome icon name"
    )
    image = models.URLField(blank=True, help_text="URL to category image")
    color = models.CharField(max_length=255, blank=True, help_text="Hex color code")
    tab_color = models.CharField(max_length=255, blank=True, help_text="Hex color code")

    def __str__(self):
        return self.name

    class Meta:
        db_table = "item_category"
        managed = True
        verbose_name = "Item Category"
        verbose_name_plural = "Item Categories"
        ordering = ["name"]


class ItemBrand(Basemodel):
    """Brands of items that can be transported"""

    name = models.CharField(max_length=100)
    category = models.ForeignKey(
        ItemCategory,
        on_delete=models.CASCADE,
        related_name="brands",
        help_text="Category this brand belongs to",
    )
    description = models.TextField(blank=True)
    # Visual properties for frontend
    icon = models.CharField(
        max_length=100, blank=True, help_text="FontAwesome icon name"
    )
    image = models.URLField(blank=True, help_text="URL to brand image")
    color = models.CharField(max_length=255, blank=True, help_text="Hex color code")
    tab_color = models.CharField(max_length=255, blank=True, help_text="Hex color code")

    def __str__(self):
        return f"{self.name} ({self.category.name})"

    class Meta:
        db_table = "item_brand"
        managed = True
        verbose_name = "Item Brand"
        verbose_name_plural = "Item Brands"
        ordering = ["category__name", "name"]
        unique_together = ["name", "category"]


class ItemModel(Basemodel):
    """Models of items that can be transported"""

    name = models.CharField(max_length=100)
    brand = models.ForeignKey(
        ItemBrand,
        on_delete=models.CASCADE,
        related_name="models",
        help_text="Brand this model belongs to",
    )
    description = models.TextField(blank=True)
    # Visual properties for frontend
    icon = models.CharField(
        max_length=100, blank=True, help_text="FontAwesome icon name"
    )
    image = models.URLField(blank=True, help_text="URL to model image")
    color = models.CharField(max_length=255, blank=True, help_text="Hex color code")
    tab_color = models.CharField(max_length=255, blank=True, help_text="Hex color code")

    def __str__(self):
        return f"{self.name} ({self.brand.name})"

    class Meta:
        db_table = "item_model"
        managed = True
        verbose_name = "Item Model"
        verbose_name_plural = "Item Models"
        ordering = ["brand__category__name", "brand__name", "name"]
        unique_together = ["name", "brand"]


class CommonItem(Basemodel):
    """Common items that can be selected for pickup points"""

    name = models.CharField(max_length=100)
    category = models.ForeignKey(
        ItemCategory,
        on_delete=models.CASCADE,
        related_name="items",
        help_text="Category this item belongs to",
    )
    brand = models.ForeignKey(
        ItemBrand,
        on_delete=models.CASCADE,
        related_name="items",
        help_text="Brand this item belongs to",
    )
    model = models.ForeignKey(
        ItemModel,
        on_delete=models.CASCADE,
        related_name="items",
        help_text="Model this item belongs to",
    )

    # Basic information
    description = models.TextField(blank=True)

    # Physical properties
    weight = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True, help_text="Weight in kg"
    )
    dimensions = models.JSONField(
        null=True, blank=True, help_text="Dimensions as JSON object"
    )

    # Special handling flags
    fragile = models.BooleanField(
        default=False, help_text="Item is fragile and needs special handling"
    )
    needs_disassembly = models.BooleanField(
        default=False, help_text="Item needs to be disassembled for transport"
    )

    # Additional identification fields
    model_number = models.CharField(
        max_length=100, blank=True, help_text="Model number"
    )
    serial_number = models.CharField(
        max_length=100, blank=True, help_text="Serial number"
    )
    year = models.IntegerField(null=True, blank=True, help_text="Year of manufacture")
    model_year = models.IntegerField(null=True, blank=True, help_text="Model year")

    # Visual properties for frontend
    icon = models.CharField(
        max_length=100, blank=True, help_text="FontAwesome icon name"
    )
    image = models.URLField(blank=True, help_text="URL to item image")
    color = models.CharField(max_length=255, blank=True, help_text="Hex color code")
    tab_color = models.CharField(max_length=255, blank=True, help_text="Hex color code")

    # Service relationship
    service_category = models.ForeignKey(
        "Services.ServiceCategory",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Service category for this category of items",
    )

    def __str__(self):
        return f"{self.name} ({self.brand.name} {self.model.name})"

    class Meta:
        db_table = "common_item"
        managed = True
        verbose_name = "Common Item"
        verbose_name_plural = "Common Items"
        ordering = ["category__name", "brand__name", "model__name", "name"]
        unique_together = ["name", "category", "brand", "model"]

    @property
    def full_name(self):
        """Returns the full name including brand and model"""
        return f"{self.name} ({self.brand.name} {self.model.name})"

    @property
    def category_name(self):
        """Returns the category name"""
        return self.category.name if self.category else ""

    @property
    def brand_name(self):
        """Returns the brand name"""
        return self.brand.name if self.brand else ""

    @property
    def model_name(self):
        """Returns the model name"""
        return self.model.name if self.model else ""

    def get_dimensions_display(self):
        """Returns formatted dimensions string"""
        if not self.dimensions:
            return ""
        try:
            dims = self.dimensions
            if isinstance(dims, dict):
                parts = []
                if "length" in dims:
                    parts.append(f"L: {dims['length']}")
                if "width" in dims:
                    parts.append(f"W: {dims['width']}")
                if "height" in dims:
                    parts.append(f"H: {dims['height']}")
                return " × ".join(parts) if parts else ""
            return str(dims)
        except:
            return str(self.dimensions)

    def get_weight_display(self):
        """Returns formatted weight string"""
        if self.weight:
            return f"{self.weight} kg"
        return ""

    def get_fragile_display(self):
        """Returns formatted fragile status"""
        return "Yes" if self.fragile else "No"

    def get_disassembly_display(self):
        """Returns formatted disassembly status"""
        return "Yes" if self.needs_disassembly else "No"
