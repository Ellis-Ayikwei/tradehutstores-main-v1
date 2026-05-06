"""
Resolve homepage section products from manual picks and/or PopulationRules.
"""

import logging
from django.core.cache import cache
from django.db.models import Q, Sum, Count, Min
from django.db.models.functions import Coalesce
from django.utils import timezone

from apps.products.models import Product

from .models import HomepageSection, PopulationRule

logger = logging.getLogger(__name__)


def _cache_key(section: HomepageSection) -> str:
    return f"merch:section:{section.slug}"


def get_homepage_sections() -> list[HomepageSection]:
    qs = (
        HomepageSection.objects.filter(is_active=True)
        .prefetch_related("items", "rule")
        .order_by("position", "created_at")
    )
    return [s for s in qs if s.is_live]


def _optimize(qs):
    return qs.select_related("category", "sub_category", "brand", "default_variant").prefetch_related(
        "variants"
    )


def _materialize(qs, limit: int) -> list:
    return list(_optimize(qs.distinct())[:limit])


def resolve_section_products(
    section: HomepageSection,
    limit: int | None = None,
    bypass_cache: bool = False,
) -> list:
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
    products = [item.product for item in items]
    if not products:
        return []
    ids = [p.pk for p in products]
    by_id = {p.pk: p for p in _optimize(Product.objects.filter(pk__in=ids))}
    return [by_id[i] for i in ids if i in by_id]


def _resolve_auto(section: HomepageSection, limit: int, bypass_cache: bool) -> list:
    key = _cache_key(section)
    cached = None if bypass_cache else cache.get(key)
    if cached is not None:
        return cached[:limit]

    try:
        rule = section.rule
    except PopulationRule.DoesNotExist:
        logger.warning("Section %r has AUTO/Mixed strategy but no rule.", section.slug)
        return []

    products = _apply_rule(rule, limit)
    cache.set(key, products, timeout=rule.cache_minutes * 60)
    return products


def _resolve_mixed(section: HomepageSection, limit: int, _bypass_cache: bool) -> list:
    pinned = _resolve_manual(section, limit)
    pinned_ids = {p.id for p in pinned}
    remaining = limit - len(pinned)
    if remaining <= 0:
        return pinned

    try:
        rule = section.rule
    except PopulationRule.DoesNotExist:
        return pinned

    # Do not reuse the AUTO cache: after removing pinned SKUs we need a larger candidate pool.
    fetch_n = max(limit * 3, section.max_products, 24)
    auto_full = _apply_rule(rule, fetch_n)
    auto_filtered = [p for p in auto_full if p.id not in pinned_ids][:remaining]
    return pinned + auto_filtered


def _apply_common_filters(qs, rule: PopulationRule):
    if rule.only_available:
        qs = qs.filter(available=True)
    if rule.only_in_stock:
        qs = qs.filter(Q(inventory_level__gt=0) | Q(variants__quantity__gt=0)).distinct()

    qs = qs.annotate(_min_variant_price=Min("variants__price"))
    if rule.min_price is not None:
        qs = qs.filter(_min_variant_price__gte=rule.min_price)
    if rule.max_price is not None:
        qs = qs.filter(_min_variant_price__lte=rule.max_price)
    return qs


def _sold_since_cutoff(qs, cutoff):
    return qs.annotate(
        units_sold_count=Coalesce(
            Sum(
                "orderitem__quantity",
                filter=Q(
                    orderitem__order__created_at__gte=cutoff,
                ),
            ),
            0,
        )
    )


def _apply_rule(rule: PopulationRule, limit: int) -> list:
    qs = Product.objects.all()
    qs = _apply_common_filters(qs, rule)
    RT = PopulationRule.RuleType

    if rule.rule_type == RT.TOP_SELLERS:
        cutoff = timezone.now() - timezone.timedelta(days=rule.lookback_days)
        qs = _sold_since_cutoff(qs, cutoff)
        qs = qs.order_by("-units_sold_count", "-created_at")

    elif rule.rule_type == RT.NEW_ARRIVALS:
        qs = qs.order_by("-created_at")

    elif rule.rule_type == RT.HIGH_RATED:
        qs = qs.filter(average_rating__gte=rule.min_rating).order_by(
            "-average_rating", "-total_reviews", "-created_at"
        )

    elif rule.rule_type == RT.FLASH_SALE:
        qs = qs.filter(discount_percentage__gt=0).order_by("-discount_percentage", "-created_at")

    elif rule.rule_type == RT.TAG_FILTER:
        term = (rule.tag or "").strip()
        if not term:
            return []
        qs = qs.filter(keywords__icontains=term).order_by("-created_at")

    elif rule.rule_type == RT.CATEGORY_BEST:
        if not rule.category_id:
            return []
        cutoff = timezone.now() - timezone.timedelta(days=rule.lookback_days)
        qs = qs.filter(category=rule.category)
        qs = _sold_since_cutoff(qs, cutoff)
        qs = qs.order_by("-units_sold_count", "-created_at")

    elif rule.rule_type == RT.LOW_STOCK:
        qs = qs.filter(
            inventory_level__lte=rule.low_stock_threshold,
            inventory_level__gt=0,
        ).order_by("inventory_level")

    elif rule.rule_type == RT.TRENDING:
        cutoff = timezone.now() - timezone.timedelta(hours=max(1, int(rule.lookback_days) * 24))
        qs = qs.annotate(
            recent_views=Count(
                "productview",
                filter=Q(productview__timestamp__gte=cutoff),
            )
        ).order_by("-recent_views", "-created_at")

    elif rule.rule_type == RT.MANUAL_OVERRIDE:
        return []

    else:
        qs = qs.order_by("-created_at")

    return _materialize(qs, limit)


def bust_section_cache(section: HomepageSection) -> None:
    cache.delete(_cache_key(section))


def bust_all_section_caches() -> None:
    keys = [_cache_key(s) for s in HomepageSection.objects.all()]
    if not keys:
        return
    try:
        cache.delete_many(keys)
    except NotImplementedError:
        for k in keys:
            cache.delete(k)
