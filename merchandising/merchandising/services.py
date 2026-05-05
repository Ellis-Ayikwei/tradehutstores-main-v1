"""
merchandising/services.py

Resolves homepage section products.

This is the core logic layer — called by views and the Celery warm-up task.
Keeps resolution logic out of models and views.

Usage:
    from merchandising.services import resolve_section_products, get_homepage_sections

    # In a view:
    sections = get_homepage_sections()
    for section in sections:
        section._resolved = resolve_section_products(section)
"""

import logging
from django.core.cache import cache
from django.utils import timezone
from django.db.models import QuerySet

from .models import HomepageSection, PopulationRule

logger = logging.getLogger(__name__)


def _cache_key(section: HomepageSection) -> str:
    return f"merch:section:{section.slug}"


def get_homepage_sections() -> list[HomepageSection]:
    """Return all live sections ordered by position."""
    return [s for s in HomepageSection.objects.filter(is_active=True).prefetch_related("items", "rule") if s.is_live]


def resolve_section_products(
    section: HomepageSection,
    limit: int | None = None,
    bypass_cache: bool = False,
) -> list:
    """
    Return the product list for a section.

    Strategy:
      MANUAL  → return items ordered by position
      AUTO    → run the rule, cache the result
      MIXED   → pinned items first, then auto-fill up to max_products
    """
    limit = limit or section.max_products

    if section.strategy == HomepageSection.PopulationStrategy.MANUAL:
        return _resolve_manual(section, limit)

    if section.strategy == HomepageSection.PopulationStrategy.AUTO:
        return _resolve_auto(section, limit, bypass_cache)

    if section.strategy == HomepageSection.PopulationStrategy.MIXED:
        return _resolve_mixed(section, limit, bypass_cache)

    return []


def _resolve_manual(section: HomepageSection, limit: int) -> list:
    items = section.items.select_related("product").order_by("position")[:limit]
    return [item.product for item in items]


def _resolve_auto(section: HomepageSection, limit: int, bypass_cache: bool) -> list:
    key    = _cache_key(section)
    cached = None if bypass_cache else cache.get(key)
    if cached is not None:
        return cached[:limit]

    try:
        rule     = section.rule
        products = _apply_rule(rule, limit)
        cache.set(key, products, timeout=rule.cache_minutes * 60)
        return products
    except PopulationRule.DoesNotExist:
        logger.warning("Section %r has AUTO strategy but no rule.", section.slug)
        return []


def _resolve_mixed(section: HomepageSection, limit: int, bypass_cache: bool) -> list:
    pinned     = list(_resolve_manual(section, limit))
    pinned_ids = {p.id for p in pinned}
    remaining  = limit - len(pinned)

    if remaining <= 0:
        return pinned

    auto = _resolve_auto(section, limit, bypass_cache)
    # Exclude products already in pinned so there are no duplicates
    auto_filtered = [p for p in auto if p.id not in pinned_ids][:remaining]
    return pinned + auto_filtered


def _apply_rule(rule: PopulationRule, limit: int) -> list:
    """
    Execute the population rule against the products table.
    Returns a plain list (not a lazy QS) so it can be cached.
    """
    from apps.products.models import Product   # adjust import to your app structure

    qs = Product.objects.all()

    # ── Common filters ────────────────────────────────────────────────────────
    if rule.only_available:
        qs = qs.filter(available=True)
    if rule.only_in_stock:
        qs = qs.filter(inventory_level__gt=0)
    if rule.min_price is not None:
        qs = qs.filter(final_price__gte=rule.min_price)
    if rule.max_price is not None:
        qs = qs.filter(final_price__lte=rule.max_price)

    # ── Rule-specific logic ───────────────────────────────────────────────────
    RT = PopulationRule.RuleType

    if rule.rule_type == RT.TOP_SELLERS:
        cutoff = timezone.now() - timezone.timedelta(days=rule.lookback_days)
        # Requires `units_sold` annotation or field — adjust to your order model
        qs = (
            qs.filter(orderitem__order__created_at__gte=cutoff)
            .annotate_units_sold()      # add this method to your Product manager
            .order_by("-units_sold_count")
        )

    elif rule.rule_type == RT.NEW_ARRIVALS:
        qs = qs.order_by("-created_at")

    elif rule.rule_type == RT.HIGH_RATED:
        qs = qs.filter(average_rating__gte=rule.min_rating).order_by("-average_rating")

    elif rule.rule_type == RT.FLASH_SALE:
        qs = qs.filter(on_sale=True).order_by("-discount_percentage")

    elif rule.rule_type == RT.TAG_FILTER:
        qs = qs.filter(tags__name=rule.tag).order_by("-created_at")

    elif rule.rule_type == RT.CATEGORY_BEST:
        qs = qs.filter(category=rule.category).order_by("-units_sold_count")

    elif rule.rule_type == RT.LOW_STOCK:
        qs = qs.filter(inventory_level__lte=rule.low_stock_threshold).order_by("inventory_level")

    elif rule.rule_type == RT.TRENDING:
        cutoff = timezone.now() - timezone.timedelta(hours=rule.lookback_days * 24)
        # Requires view tracking — adjust to your analytics model
        qs = qs.filter(views__created_at__gte=cutoff).order_by("-view_count")

    elif rule.rule_type == RT.MANUAL_OVERRIDE:
        return []

    return list(qs.select_related("category", "brand").distinct()[:limit])


def bust_section_cache(section: HomepageSection) -> None:
    cache.delete(_cache_key(section))


def bust_all_section_caches() -> None:
    """Called after bulk product updates or a flash sale toggle."""
    keys = [_cache_key(s) for s in HomepageSection.objects.all()]
    cache.delete_many(keys)
