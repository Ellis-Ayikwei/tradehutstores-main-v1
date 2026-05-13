"""
Ad System — enterprise-grade campaign/creative/placement model.

Hierarchy:
    AdPlacement (the slot — e.g. "homepage-top-bar")
        └── AdSlot (binds a Creative to a Placement, with weight + targeting + schedule)
                └── Creative (the visual asset — image, headline, cta, destination)
                        └── Campaign (the umbrella — budget, advertiser, overall schedule)

A single Creative can be served in many Placements via separate AdSlot rows.
The selection algorithm picks one AdSlot per request (weighted by `weight`) after
filtering on schedule, frequency caps, and TargetingRule.
"""

from __future__ import annotations

import uuid

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


# ── Placements ────────────────────────────────────────────────────────────────


class AdPlacement(TimeStampedModel):
    """A named slot on the storefront. Created once by ops, then ads target it."""

    class Format(models.TextChoices):
        BANNER = "banner", "Banner (image strip)"
        CAROUSEL = "carousel", "Carousel (multi-image)"
        MODAL = "modal", "Modal / popup"
        TOPBAR = "topbar", "Top bar (sticky strip)"
        SIDEBAR = "sidebar", "Sidebar"
        INLINE_CARD = "inline_card", "Inline card"
        FULLSCREEN = "fullscreen", "Fullscreen overlay"

    slug = models.SlugField(max_length=80, unique=True, db_index=True)
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    format = models.CharField(max_length=20, choices=Format.choices, default=Format.BANNER)
    aspect_ratio = models.CharField(
        max_length=20,
        blank=True,
        help_text="e.g. '16/9', '1/1', '21/9'. Hint to creative producers.",
    )
    max_active_slots = models.PositiveSmallIntegerField(
        default=1,
        help_text="Hard cap on how many ad slots will return for this placement at once. Use >1 for carousels.",
    )
    rotation_seconds = models.PositiveSmallIntegerField(
        default=0,
        help_text="If >0 and max_active_slots>1, FE rotates creatives every N seconds.",
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["slug"]
        verbose_name = "Ad Placement"
        verbose_name_plural = "Ad Placements"

    def __str__(self) -> str:
        return f"{self.name} ({self.slug})"


# ── Campaigns + Creatives ─────────────────────────────────────────────────────


class Campaign(TimeStampedModel):
    """Umbrella for a marketing push. Holds budget, advertiser, dates."""

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        SCHEDULED = "scheduled", "Scheduled"
        RUNNING = "running", "Running"
        PAUSED = "paused", "Paused"
        ENDED = "ended", "Ended"
        ARCHIVED = "archived", "Archived"

    class Priority(models.IntegerChoices):
        LOW = 1, "Low"
        NORMAL = 5, "Normal"
        HIGH = 10, "High"
        URGENT = 20, "Urgent (always wins)"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=160)
    advertiser = models.CharField(
        max_length=160,
        blank=True,
        help_text="Internal label, brand, or seller running the campaign.",
    )
    seller = models.ForeignKey(
        "sellers.SellerProfile",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="ad_campaigns",
        help_text="Optional — if this campaign was paid for by a seller.",
    )
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.DRAFT)
    priority = models.PositiveSmallIntegerField(
        choices=Priority.choices,
        default=Priority.NORMAL,
        help_text="Higher priority campaigns get a multiplier in the auction.",
    )
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)
    daily_impression_cap = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Pause this campaign for the day after N impressions across all creatives.",
    )
    total_impression_cap = models.PositiveIntegerField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-priority", "-created_at"]
        indexes = [
            models.Index(fields=["status", "starts_at", "ends_at"]),
        ]

    def __str__(self) -> str:
        return f"[{self.get_status_display()}] {self.name}"

    @property
    def is_live(self) -> bool:
        if self.status not in (self.Status.RUNNING, self.Status.SCHEDULED):
            return False
        now = timezone.now()
        if self.starts_at and now < self.starts_at:
            return False
        if self.ends_at and now > self.ends_at:
            return False
        return True

    def clean(self):
        if self.starts_at and self.ends_at and self.ends_at <= self.starts_at:
            raise ValidationError({"ends_at": "End must be after start."})


class Creative(TimeStampedModel):
    """The visual + copy + CTA. One creative can be reused across placements."""

    class Format(models.TextChoices):
        IMAGE = "image", "Single image"
        VIDEO = "video", "Video"
        HTML = "html", "Custom HTML"
        TEXT = "text", "Text-only"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    campaign = models.ForeignKey(
        Campaign, on_delete=models.CASCADE, related_name="creatives"
    )
    name = models.CharField(max_length=160)
    format = models.CharField(max_length=10, choices=Format.choices, default=Format.IMAGE)

    image_desktop = models.ImageField(
        upload_to="ads/creatives/desktop/", blank=True, null=True
    )
    image_mobile = models.ImageField(
        upload_to="ads/creatives/mobile/",
        blank=True,
        null=True,
        help_text="Optional. Falls back to desktop if missing.",
    )
    video_url = models.URLField(blank=True)
    html_body = models.TextField(blank=True, help_text="Sanitized HTML for HTML creatives.")

    headline = models.CharField(max_length=120, blank=True)
    subheadline = models.CharField(max_length=240, blank=True)
    eyebrow = models.CharField(max_length=60, blank=True, help_text="Small label above headline.")
    cta_label = models.CharField(max_length=40, blank=True)
    cta_url = models.URLField(max_length=500, blank=True)
    open_in_new_tab = models.BooleanField(default=False)

    background_color = models.CharField(
        max_length=200,
        blank=True,
        help_text="Hex (#a43d00) or full CSS background value (e.g. 'linear-gradient(...)').",
    )
    text_color = models.CharField(max_length=20, blank=True)
    accent_color = models.CharField(max_length=20, blank=True)
    alt_text = models.CharField(max_length=240, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.name


# ── Slot — binds a Creative into a Placement ──────────────────────────────────


class AdSlot(TimeStampedModel):
    """A scheduled, weighted booking of a Creative into a Placement.

    The selection algorithm picks one (or N up to placement.max_active_slots) of
    these per request, after filtering by:
      - placement.is_active and slot.is_active
      - schedule (slot then campaign window)
      - targeting rules
      - frequency caps
    Then weighted-randomly picks among survivors. `weight * priority_multiplier`
    determines selection probability.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    placement = models.ForeignKey(
        AdPlacement, on_delete=models.CASCADE, related_name="slots"
    )
    creative = models.ForeignKey(
        Creative, on_delete=models.CASCADE, related_name="slots"
    )
    is_active = models.BooleanField(default=True)
    weight = models.PositiveSmallIntegerField(
        default=10,
        help_text="Selection weight. Higher = more likely. 0 disables the slot.",
    )
    position_hint = models.PositiveSmallIntegerField(
        default=0,
        help_text="For carousels: ordering within the placement.",
    )
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)
    dismissible = models.BooleanField(
        default=True,
        help_text="If True, FE renders a close button. Stored per-session in localStorage.",
    )
    show_close_after_seconds = models.PositiveSmallIntegerField(
        default=0,
        help_text="Modals only — delay before close button appears.",
    )
    delay_seconds = models.PositiveSmallIntegerField(
        default=0,
        help_text="Modals only — show after N seconds on page.",
    )

    # Frequency caps (per session/day/week, per user/anonymous)
    cap_per_session = models.PositiveSmallIntegerField(
        default=0, help_text="0 = unlimited."
    )
    cap_per_day = models.PositiveSmallIntegerField(default=0, help_text="0 = unlimited.")
    cap_per_week = models.PositiveSmallIntegerField(default=0, help_text="0 = unlimited.")

    class Meta:
        ordering = ["placement_id", "position_hint", "-weight"]
        indexes = [
            models.Index(fields=["placement", "is_active"]),
            models.Index(fields=["starts_at", "ends_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.creative.name} → {self.placement.slug}"

    @property
    def is_live(self) -> bool:
        if not self.is_active or self.weight <= 0:
            return False
        if not self.creative.campaign.is_live:
            return False
        now = timezone.now()
        if self.starts_at and now < self.starts_at:
            return False
        if self.ends_at and now > self.ends_at:
            return False
        return True

    def clean(self):
        if self.starts_at and self.ends_at and self.ends_at <= self.starts_at:
            raise ValidationError({"ends_at": "Slot end must be after slot start."})


# ── Targeting ─────────────────────────────────────────────────────────────────


class TargetingRule(TimeStampedModel):
    """Optional per-slot targeting. A slot with no rule = "everyone"."""

    class UserState(models.TextChoices):
        ANY = "any", "Any visitor"
        ANON = "anon", "Anonymous only"
        AUTHENTICATED = "auth", "Logged in only"
        BUYER = "buyer", "Buyers only"
        SELLER = "seller", "Sellers only"
        NEW_USER = "new_user", "New users (<30d)"
        RETURNING = "returning", "Returning users"

    slot = models.OneToOneField(
        AdSlot, on_delete=models.CASCADE, related_name="targeting"
    )

    # Geo
    countries = models.JSONField(
        default=list,
        blank=True,
        help_text='ISO-3166 alpha-2 codes. Empty = all countries. e.g. ["GH","NG","KE"].',
    )
    exclude_countries = models.JSONField(default=list, blank=True)

    # Device
    devices = models.JSONField(
        default=list,
        blank=True,
        help_text='Subset of ["mobile","tablet","desktop"]. Empty = all.',
    )

    # User
    user_states = models.JSONField(
        default=list,
        blank=True,
        help_text="Subset of UserState values. Empty = any.",
    )

    # Catalog
    categories = models.ManyToManyField(
        "catalog.Category",
        blank=True,
        related_name="ad_targeting_rules",
        help_text="Show only on pages within these categories. Empty = all.",
    )

    # Locale
    languages = models.JSONField(
        default=list,
        blank=True,
        help_text='ISO 639-1 codes, e.g. ["en","fr"]. Empty = all.',
    )

    # Cart / behavioural
    min_cart_value = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    max_cart_value = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    only_with_empty_cart = models.BooleanField(default=False)

    # Path-based
    path_includes = models.JSONField(
        default=list,
        blank=True,
        help_text='Show only when current path contains any of these substrings.',
    )
    path_excludes = models.JSONField(default=list, blank=True)

    # A/B
    ab_bucket = models.CharField(
        max_length=20,
        blank=True,
        help_text="Optional — limit to one A/B bucket (e.g. 'A', 'B').",
    )

    class Meta:
        verbose_name = "Targeting Rule"
        verbose_name_plural = "Targeting Rules"

    def __str__(self) -> str:
        return f"Targeting for {self.slot}"


# ── Tracking ──────────────────────────────────────────────────────────────────


class AdImpression(models.Model):
    """One record per served ad. Heavy table — partition or archive periodically."""

    id = models.BigAutoField(primary_key=True)
    slot = models.ForeignKey(
        AdSlot, on_delete=models.CASCADE, related_name="impressions"
    )
    creative_id = models.UUIDField(db_index=True)
    placement_id = models.BigIntegerField(db_index=True)
    campaign_id = models.UUIDField(db_index=True)
    session_id = models.CharField(max_length=64, blank=True, db_index=True)
    user_id = models.UUIDField(null=True, blank=True, db_index=True)
    page_url = models.CharField(max_length=500, blank=True)
    referrer = models.CharField(max_length=500, blank=True)
    device = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=2, blank=True)
    served_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = "Ad Impression"
        verbose_name_plural = "Ad Impressions"
        indexes = [
            models.Index(fields=["campaign_id", "served_at"]),
            models.Index(fields=["placement_id", "served_at"]),
        ]


class AdClick(models.Model):
    id = models.BigAutoField(primary_key=True)
    slot = models.ForeignKey(AdSlot, on_delete=models.CASCADE, related_name="clicks")
    creative_id = models.UUIDField(db_index=True)
    placement_id = models.BigIntegerField(db_index=True)
    campaign_id = models.UUIDField(db_index=True)
    session_id = models.CharField(max_length=64, blank=True, db_index=True)
    user_id = models.UUIDField(null=True, blank=True, db_index=True)
    destination_url = models.CharField(max_length=500, blank=True)
    page_url = models.CharField(max_length=500, blank=True)
    device = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=2, blank=True)
    clicked_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = "Ad Click"
        verbose_name_plural = "Ad Clicks"
        indexes = [
            models.Index(fields=["campaign_id", "clicked_at"]),
        ]
