"""
merchandising/models.py

Controls all homepage sections — "Trending Now", "Today's Sales",
"Best in Electronics", flash sales, featured collections etc.

Two population strategies per section:
  MANUAL   — admin hand-picks products via HomepageSectionItem
  AUTO     — system resolves products at request time using PopulationRule

Sections can mix both: e.g. pin 2 manual products at the top,
fill the rest automatically.
"""

from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.utils.html import mark_safe


# ─── Shared base ──────────────────────────────────────────────────────────────

class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


# ─── Homepage Section ─────────────────────────────────────────────────────────

class HomepageSection(TimeStampedModel):
    """
    One section on the homepage — e.g. "Trending Now", "Today's Sales".

    Sections are rendered in ascending `position` order.
    Each section has a `section_type` that controls its visual layout
    on the frontend (horizontal scroll, grid, hero banner etc).
    """

    class SectionType(models.TextChoices):
        HORIZONTAL_SCROLL = "horizontal_scroll", "Horizontal Scroll"
        GRID              = "grid",              "Product Grid"
        FLASH_SALE        = "flash_sale",        "Flash Sale (with countdown)"
        BANNER            = "banner",            "Promotional Banner"
        CATEGORY_SPOTLIGHT= "category_spotlight","Category Spotlight"

    class PopulationStrategy(models.TextChoices):
        MANUAL    = "manual",    "Manual (hand-picked)"
        AUTO      = "auto",      "Automatic (rule-based)"
        MIXED     = "mixed",     "Mixed (pinned + auto fill)"

    # Identity
    title       = models.CharField(max_length=120, help_text="Shown on the frontend e.g. 'Trending Now'")
    subtitle    = models.CharField(max_length=255, blank=True, help_text="Optional subtitle e.g. 'Top picks this week'")
    slug        = models.SlugField(unique=True,   help_text="Used by the frontend to fetch this section e.g. 'trending-now'")
    section_type = models.CharField(max_length=30, choices=SectionType.choices, default=SectionType.HORIZONTAL_SCROLL)

    # Display
    max_products = models.PositiveSmallIntegerField(default=12, help_text="Max products shown in this section")
    position     = models.PositiveSmallIntegerField(default=0,  help_text="Render order — lower = higher on page")
    is_active    = models.BooleanField(default=True)

    # Scheduling — section only shows between these dates if set
    starts_at = models.DateTimeField(null=True, blank=True, help_text="Leave blank to show immediately")
    ends_at   = models.DateTimeField(null=True, blank=True, help_text="Leave blank to show indefinitely")

    # Population
    strategy = models.CharField(
        max_length=10,
        choices=PopulationStrategy.choices,
        default=PopulationStrategy.AUTO,
        help_text=(
            "Manual: you pick every product. "
            "Auto: a rule fills the section automatically. "
            "Mixed: pinned products first, rule fills the rest."
        ),
    )

    # Styling hints for the frontend
    background_color = models.CharField(max_length=20, blank=True, help_text="CSS colour e.g. #fef2f2")
    accent_color     = models.CharField(max_length=20, blank=True, help_text="Used for badges, countdown etc.")
    show_countdown   = models.BooleanField(default=False, help_text="Show countdown timer (for flash sales — requires ends_at)")

    class Meta:
        ordering       = ["position", "created_at"]
        verbose_name   = "Homepage Section"
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
            raise ValidationError({
                "ends_at": "Countdown timer requires an end date/time."
            })
        if self.ends_at and self.starts_at and self.ends_at <= self.starts_at:
            raise ValidationError({
                "ends_at": "End date must be after start date."
            })


# ─── Manual product picks ─────────────────────────────────────────────────────

class HomepageSectionItem(TimeStampedModel):
    """
    A manually curated product in a section.
    Used when strategy is MANUAL or MIXED.

    `position` controls order — lower = shown first.
    `is_pinned` (MIXED strategy) — pinned items always appear,
    even if the auto rule would exclude them.
    """
    section  = models.ForeignKey(HomepageSection, on_delete=models.CASCADE, related_name="items")
    product  = models.ForeignKey("products.Product", on_delete=models.CASCADE, related_name="section_appearances")
    position = models.PositiveSmallIntegerField(default=0)
    is_pinned = models.BooleanField(
        default=False,
        help_text="Pin this product — it always appears regardless of auto-rule results (MIXED strategy only)"
    )
    # Optional override label — shown instead of product name in this section context
    label_override = models.CharField(max_length=100, blank=True, help_text="Optional badge text e.g. 'Staff Pick'")

    class Meta:
        ordering             = ["position"]
        unique_together      = [("section", "product")]
        verbose_name         = "Section Product"
        verbose_name_plural  = "Section Products"

    def __str__(self):
        return f"{self.product.name} → {self.section.title} (pos {self.position})"


# ─── Auto population rules ────────────────────────────────────────────────────

class PopulationRule(TimeStampedModel):
    """
    Defines HOW a section auto-fills with products.

    One rule per section. The rule is evaluated at request time (with caching)
    or on a schedule via Celery.

    Rule types:
      TOP_SELLERS      — ranked by units_sold in the last N days
      NEW_ARRIVALS     — sorted by created_at desc
      HIGH_RATED       — sorted by average_rating desc (min_rating filter)
      FLASH_SALE       — products with active_sale=True
      TAG_FILTER       — products with a specific tag
      CATEGORY_BEST    — top sellers within a specific category
      LOW_STOCK        — creates urgency — products with stock < threshold
      RECENTLY_VIEWED  — personalised (per-user, requires session data)
      TRENDING         — high velocity: products with most views in last N hours
      MANUAL_OVERRIDE  — rule exists but is disabled; section uses manual items only
    """

    class RuleType(models.TextChoices):
        TOP_SELLERS     = "top_sellers",     "Top Sellers"
        NEW_ARRIVALS    = "new_arrivals",     "New Arrivals"
        HIGH_RATED      = "high_rated",       "Highest Rated"
        FLASH_SALE      = "flash_sale",       "Flash Sale Products"
        TAG_FILTER      = "tag_filter",       "Products with Tag"
        CATEGORY_BEST   = "category_best",    "Best in Category"
        LOW_STOCK       = "low_stock",        "Low Stock (urgency)"
        TRENDING        = "trending",         "Trending (high views)"
        MANUAL_OVERRIDE = "manual_override",  "Disabled (manual only)"

    section   = models.OneToOneField(HomepageSection, on_delete=models.CASCADE, related_name="rule")
    rule_type = models.CharField(max_length=20, choices=RuleType.choices, default=RuleType.TOP_SELLERS)

    # Filters — only relevant fields are used per rule_type
    lookback_days  = models.PositiveSmallIntegerField(
        default=7,
        help_text="For TOP_SELLERS / TRENDING: count sales/views over last N days"
    )
    min_rating     = models.DecimalField(
        max_digits=3, decimal_places=1, default=4.0,
        help_text="For HIGH_RATED: minimum average rating (1.0 – 5.0)"
    )
    tag            = models.CharField(
        max_length=100, blank=True,
        help_text="For TAG_FILTER: exact tag name e.g. 'summer-sale'"
    )
    category       = models.ForeignKey(
        "catalog.Category", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="+",
        help_text="For CATEGORY_BEST: which category to pull from"
    )
    low_stock_threshold = models.PositiveSmallIntegerField(
        default=10,
        help_text="For LOW_STOCK: products with stock <= this value"
    )

    # Additional filters applied to any rule
    only_in_stock  = models.BooleanField(default=True,  help_text="Exclude out-of-stock products")
    only_available = models.BooleanField(default=True,  help_text="Exclude unavailable products")
    min_price      = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    max_price      = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    # Cache TTL for this rule's result
    cache_minutes  = models.PositiveSmallIntegerField(
        default=30,
        help_text="How long to cache rule results (minutes). Flash sales: use 1–5. Top sellers: 30–60."
    )

    class Meta:
        verbose_name       = "Population Rule"
        verbose_name_plural = "Population Rules"

    def __str__(self):
        return f"{self.get_rule_type_display()} → {self.section.title}"

    def clean(self):
        if self.rule_type == self.RuleType.TAG_FILTER and not self.tag:
            raise ValidationError({"tag": "Tag is required for TAG_FILTER rule."})
        if self.rule_type == self.RuleType.CATEGORY_BEST and not self.category_id:
            raise ValidationError({"category": "Category is required for CATEGORY_BEST rule."})


# ─── Section analytics snapshot (optional) ────────────────────────────────────

class SectionClickEvent(models.Model):
    """
    Lightweight click tracking per section + product.
    Used to measure which sections drive conversions.
    Kept separate from main analytics to avoid FK overhead on hot paths.

    Write via a fire-and-forget Celery task — never in the request path.
    """
    section    = models.ForeignKey(HomepageSection, on_delete=models.CASCADE, related_name="clicks")
    product_id = models.IntegerField(db_index=True)
    session_id = models.CharField(max_length=64, blank=True)
    clicked_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name       = "Section Click"
        verbose_name_plural = "Section Clicks"
        indexes = [
            models.Index(fields=["section", "clicked_at"]),
        ]
