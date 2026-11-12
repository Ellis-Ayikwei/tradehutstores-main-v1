"""
Homepage merchandising — admin-curated sections with manual, rule-based, or mixed product lists.
"""

from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator


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


# ── Home hero ────────────────────────────────────────────────────────────────

_HEX_COLOR = RegexValidator(
    regex=r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$",
    message="Use a hex colour such as #18181b.",
)


def validate_link(value: str) -> None:
    """Storefront-relative path ("/deals") or absolute http(s) URL."""
    if not value:
        return
    # Browsers read "/\host" and "/%2F" style prefixes as protocol-relative, so only plain paths pass.
    if "\\" in value or any(ord(ch) < 32 for ch in value):
        raise ValidationError("Use a path starting with / or a full http(s) URL.")
    if value.startswith("/") and not value.startswith("//") and not value.lower().startswith("/%2f"):
        return
    if value.startswith(("http://", "https://")):
        return
    raise ValidationError("Use a path starting with / or a full http(s) URL.")


class HeroConfig(TimeStampedModel):
    """Singleton: how the storefront home hero is arranged and styled."""

    class Layout(models.TextChoices):
        CAROUSEL = "carousel", "Carousel (full width)"
        CAROUSEL_SIDE = "carousel_side", "Carousel + side tiles"
        BENTO = "bento", "Bento grid (large + tiles, static)"

    class Transition(models.TextChoices):
        SLIDE = "slide", "Slide"
        FADE = "fade", "Fade"

    class BackgroundStyle(models.TextChoices):
        NONE = "none", "None (page background)"
        SOLID = "solid", "Solid colour"
        GRADIENT = "gradient", "Gradient"

    layout = models.CharField(max_length=20, choices=Layout.choices, default=Layout.CAROUSEL_SIDE)
    autoplay = models.BooleanField(default=True)
    interval_seconds = models.PositiveSmallIntegerField(default=6)
    transition = models.CharField(max_length=10, choices=Transition.choices, default=Transition.SLIDE)
    show_arrows = models.BooleanField(default=True)
    show_dots = models.BooleanField(default=True)
    height_desktop = models.PositiveSmallIntegerField(default=360, help_text="Pixels, >= lg screens.")
    rounded = models.BooleanField(default=True)

    # Band behind the hero (page-width strip).
    background_style = models.CharField(
        max_length=10, choices=BackgroundStyle.choices, default=BackgroundStyle.NONE
    )
    background_color = models.CharField(max_length=7, blank=True, validators=[_HEX_COLOR])
    gradient_from = models.CharField(max_length=7, blank=True, validators=[_HEX_COLOR])
    gradient_to = models.CharField(max_length=7, blank=True, validators=[_HEX_COLOR])
    gradient_angle = models.PositiveSmallIntegerField(default=135)

    class Meta:
        verbose_name = "Hero configuration"
        verbose_name_plural = "Hero configuration"

    def __str__(self):
        return "Home hero configuration"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls) -> "HeroConfig":
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def clean(self):
        errors = {}
        if not 2 <= self.interval_seconds <= 30:
            errors["interval_seconds"] = "Choose between 2 and 30 seconds."
        if not 200 <= self.height_desktop <= 640:
            errors["height_desktop"] = "Choose between 200 and 640 px."
        if self.gradient_angle > 360:
            errors["gradient_angle"] = "Angle must be 0-360."
        if self.background_style == self.BackgroundStyle.SOLID and not self.background_color:
            errors["background_color"] = "Pick a colour."
        if self.background_style == self.BackgroundStyle.GRADIENT and not (
            self.gradient_from and self.gradient_to
        ):
            errors["gradient_from"] = "Pick both gradient colours."
        if errors:
            raise ValidationError(errors)


class HeroSlide(TimeStampedModel):
    class Placement(models.TextChoices):
        MAIN = "main", "Main (carousel / large)"
        TILE = "tile", "Tile (side / small)"

    class BackgroundStyle(models.TextChoices):
        SOLID = "solid", "Solid colour"
        GRADIENT = "gradient", "Gradient"

    class TextAlign(models.TextChoices):
        LEFT = "left", "Left"
        CENTER = "center", "Centre"
        RIGHT = "right", "Right"

    name = models.CharField(max_length=120, help_text="Internal label, not shown to buyers.")
    placement = models.CharField(max_length=10, choices=Placement.choices, default=Placement.MAIN)
    position = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)

    image_desktop = models.ImageField(upload_to="hero/desktop/", blank=True, null=True)
    image_mobile = models.ImageField(
        upload_to="hero/mobile/", blank=True, null=True, help_text="Optional. Falls back to desktop."
    )
    alt_text = models.CharField(max_length=240, blank=True)

    eyebrow = models.CharField(max_length=60, blank=True)
    title = models.CharField(max_length=120, blank=True)
    subtitle = models.CharField(max_length=240, blank=True)
    cta_label = models.CharField(max_length=40, blank=True)
    link_url = models.CharField(max_length=500, blank=True, validators=[validate_link])
    open_in_new_tab = models.BooleanField(default=False)

    text_color = models.CharField(max_length=7, default="#ffffff", validators=[_HEX_COLOR])
    text_align = models.CharField(max_length=10, choices=TextAlign.choices, default=TextAlign.LEFT)
    overlay_strength = models.PositiveSmallIntegerField(
        default=50, help_text="0-80. Dark scrim on top of the photo for text legibility."
    )

    background_style = models.CharField(
        max_length=10, choices=BackgroundStyle.choices, default=BackgroundStyle.SOLID
    )
    background_color = models.CharField(max_length=7, default="#18181b", validators=[_HEX_COLOR])
    gradient_from = models.CharField(max_length=7, blank=True, validators=[_HEX_COLOR])
    gradient_to = models.CharField(max_length=7, blank=True, validators=[_HEX_COLOR])
    gradient_angle = models.PositiveSmallIntegerField(default=135)

    class Meta:
        ordering = ["placement", "position", "id"]
        verbose_name = "Hero slide"
        verbose_name_plural = "Hero slides"

    def __str__(self):
        return f"{self.name} ({self.placement}, pos {self.position})"

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
        errors = {}
        if self.overlay_strength > 80:
            errors["overlay_strength"] = "Maximum is 80."
        if self.gradient_angle > 360:
            errors["gradient_angle"] = "Angle must be 0-360."
        if self.background_style == self.BackgroundStyle.GRADIENT and not (
            self.gradient_from and self.gradient_to
        ):
            errors["gradient_from"] = "Pick both gradient colours."
        if self.starts_at and self.ends_at and self.ends_at <= self.starts_at:
            errors["ends_at"] = "End must be after start."
        if errors:
            raise ValidationError(errors)
