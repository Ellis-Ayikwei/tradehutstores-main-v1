"""
Homepage merchandising — admin-curated sections with manual, rule-based, or mixed product lists.
"""

from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class HomepageSection(TimeStampedModel):
    class SectionType(models.TextChoices):
        HORIZONTAL_SCROLL = "horizontal_scroll", "Horizontal Scroll"
        GRID = "grid", "Product Grid"
        FLASH_SALE = "flash_sale", "Flash Sale (with countdown)"
        BANNER = "banner", "Promotional Banner"
        CATEGORY_SPOTLIGHT = "category_spotlight", "Category Spotlight"

    class PopulationStrategy(models.TextChoices):
        MANUAL = "manual", "Manual (hand-picked)"
        AUTO = "auto", "Automatic (rule-based)"
        MIXED = "mixed", "Mixed (pinned + auto fill)"

    title = models.CharField(max_length=120)
    subtitle = models.CharField(max_length=255, blank=True)
    slug = models.SlugField(unique=True)
    section_type = models.CharField(
        max_length=30,
        choices=SectionType.choices,
        default=SectionType.HORIZONTAL_SCROLL,
    )

    max_products = models.PositiveSmallIntegerField(default=12)
    position = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)

    strategy = models.CharField(
        max_length=10,
        choices=PopulationStrategy.choices,
        default=PopulationStrategy.AUTO,
    )

    background_color = models.CharField(max_length=20, blank=True)
    accent_color = models.CharField(max_length=20, blank=True)
    show_countdown = models.BooleanField(default=False)

    class Meta:
        ordering = ["position", "created_at"]
        verbose_name = "Homepage Section"
        verbose_name_plural = "Homepage Sections"

    def __str__(self):
        status = "✓" if self.is_live else "✗"
        return f"[{status}] {self.title} ({self.get_section_type_display()}, pos {self.position})"

    @property
    def is_live(self) -> bool:
        if not self.is_active:
            return False
        now = timezone.now()
        if self.starts_at and now < self.starts_at:
            return False
        if self.ends_at and now > self.ends_at:
            return False
        return True

    def clean(self):
        if self.show_countdown and not self.ends_at:
            raise ValidationError({"ends_at": "Countdown timer requires an end date/time."})
        if self.ends_at and self.starts_at and self.ends_at <= self.starts_at:
            raise ValidationError({"ends_at": "End date must be after start date."})


class HomepageSectionItem(TimeStampedModel):
    section = models.ForeignKey(
        HomepageSection, on_delete=models.CASCADE, related_name="items"
    )
    product = models.ForeignKey(
        "products.Product", on_delete=models.CASCADE, related_name="section_appearances"
    )
    position = models.PositiveSmallIntegerField(default=0)
    is_pinned = models.BooleanField(default=False)
    label_override = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ["position"]
        constraints = [
            models.UniqueConstraint(fields=["section", "product"], name="merch_unique_section_product")
        ]
        verbose_name = "Section Product"
        verbose_name_plural = "Section Products"

    def __str__(self):
        return f"{self.product.name} → {self.section.title} (pos {self.position})"


class PopulationRule(TimeStampedModel):
    class RuleType(models.TextChoices):
        TOP_SELLERS = "top_sellers", "Top Sellers"
        NEW_ARRIVALS = "new_arrivals", "New Arrivals"
        HIGH_RATED = "high_rated", "Highest Rated"
        FLASH_SALE = "flash_sale", "Flash Sale Products"
        TAG_FILTER = "tag_filter", "Products with Tag (keywords)"
        CATEGORY_BEST = "category_best", "Best in Category"
        LOW_STOCK = "low_stock", "Low Stock (urgency)"
        TRENDING = "trending", "Trending (recent views)"
        MANUAL_OVERRIDE = "manual_override", "Disabled (manual only)"

    section = models.OneToOneField(
        HomepageSection, on_delete=models.CASCADE, related_name="rule"
    )
    rule_type = models.CharField(
        max_length=20,
        choices=RuleType.choices,
        default=RuleType.TOP_SELLERS,
    )

    lookback_days = models.PositiveSmallIntegerField(
        default=7,
        help_text="TOP_SELLERS / TRENDING / CATEGORY_BEST: window in days (trending converts to hours × 24).",
    )
    min_rating = models.DecimalField(max_digits=3, decimal_places=1, default=4.0)
    tag = models.CharField(
        max_length=100,
        blank=True,
        help_text="TAG_FILTER: matched against product keywords (contains).",
    )
    category = models.ForeignKey(
        "catalog.Category",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    low_stock_threshold = models.PositiveSmallIntegerField(default=10)

    only_in_stock = models.BooleanField(default=True)
    only_available = models.BooleanField(default=True)
    min_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    max_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    cache_minutes = models.PositiveSmallIntegerField(default=30)

    class Meta:
        verbose_name = "Population Rule"
        verbose_name_plural = "Population Rules"

    def __str__(self):
        return f"{self.get_rule_type_display()} → {self.section.title}"

    def clean(self):
        if self.rule_type == self.RuleType.TAG_FILTER and not (self.tag or "").strip():
            raise ValidationError({"tag": "Tag/keyword is required for TAG_FILTER rule."})
        if self.rule_type == self.RuleType.CATEGORY_BEST and not self.category_id:
            raise ValidationError({"category": "Category is required for CATEGORY_BEST rule."})


class SectionClickEvent(models.Model):
    section = models.ForeignKey(
        HomepageSection, on_delete=models.CASCADE, related_name="clicks"
    )
    product_id = models.UUIDField(db_index=True)
    session_id = models.CharField(max_length=64, blank=True)
    clicked_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = "Section Click"
        verbose_name_plural = "Section Clicks"
        indexes = [
            models.Index(fields=["section", "clicked_at"]),
        ]
