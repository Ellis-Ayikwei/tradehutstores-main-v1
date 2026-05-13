"""
Selection + tracking services for the ad system.

`select_for_placement` is the hot path: filter live slots → apply targeting →
apply frequency caps → weighted-random pick (up to placement.max_active_slots).
Cached per (placement, targeting-hash) for `CACHE_SECONDS` to amortise the SQL,
busted by signals when slots/creatives/placements change.
"""

from __future__ import annotations

import hashlib
import json
import logging
import random
from dataclasses import dataclass, field
from datetime import timedelta
from typing import Iterable, Optional

from django.core.cache import cache
from django.db.models import F, Prefetch, Q
from django.utils import timezone

from .models import (
    AdClick,
    AdImpression,
    AdPlacement,
    AdSlot,
    Campaign,
    TargetingRule,
)

logger = logging.getLogger(__name__)

CACHE_SECONDS = 60  # Pool of candidate slots for a placement.
PLACEMENT_INDEX_CACHE_SECONDS = 300  # The placement object itself.


@dataclass
class TargetingContext:
    country: str = ""
    device: str = ""  # mobile|tablet|desktop
    user_state: str = "anon"
    user_id: Optional[str] = None
    session_id: str = ""
    cart_value: Optional[float] = None
    path: str = ""
    language: str = ""
    ab_bucket: str = ""
    category_ids: list = field(default_factory=list)

    def cache_key(self) -> str:
        # Hash only fields that change targeting outcome.
        h = hashlib.sha1(
            json.dumps(
                {
                    "c": self.country,
                    "d": self.device,
                    "u": self.user_state,
                    "p": self.path[:120],
                    "l": self.language,
                    "ab": self.ab_bucket,
                    "cat": sorted(map(str, self.category_ids)),
                },
                sort_keys=True,
            ).encode()
        )
        return h.hexdigest()[:16]


# ── Cache helpers ─────────────────────────────────────────────────────────────


def _placement_cache_key(slug: str) -> str:
    return f"ads:placement:{slug}"


def _candidates_cache_key(slug: str, ctx: TargetingContext) -> str:
    return f"ads:candidates:{slug}:{ctx.cache_key()}"


def bust_placement_cache(slug: str) -> None:
    cache.delete(_placement_cache_key(slug))
    # Candidate cache: we don't know all targeting hashes — rely on short TTL.


def bust_all_caches() -> None:
    for placement in AdPlacement.objects.all().only("slug"):
        bust_placement_cache(placement.slug)


# ── Public selection ──────────────────────────────────────────────────────────


def get_placement(slug: str) -> Optional[AdPlacement]:
    key = _placement_cache_key(slug)
    cached = cache.get(key)
    if cached is not None:
        return cached
    try:
        placement = AdPlacement.objects.get(slug=slug, is_active=True)
    except AdPlacement.DoesNotExist:
        return None
    cache.set(key, placement, timeout=PLACEMENT_INDEX_CACHE_SECONDS)
    return placement


def select_for_placement(
    slug: str, ctx: TargetingContext
) -> tuple[Optional[AdPlacement], list[AdSlot]]:
    """Return (placement, [winning slots]). Returns ([], []) when nothing eligible."""

    placement = get_placement(slug)
    if not placement:
        return None, []

    candidates = _eligible_slots(placement, ctx)
    if not candidates:
        return placement, []

    candidates = _apply_frequency_caps(candidates, ctx)
    if not candidates:
        return placement, []

    n = max(1, placement.max_active_slots)
    winners = _weighted_pick(candidates, n)
    return placement, winners


def _eligible_slots(placement: AdPlacement, ctx: TargetingContext) -> list[AdSlot]:
    key = _candidates_cache_key(placement.slug, ctx)
    cached = cache.get(key)
    if cached is not None:
        return cached

    now = timezone.now()
    qs = (
        AdSlot.objects.select_related("creative", "creative__campaign", "targeting")
        .prefetch_related(Prefetch("targeting__categories"))
        .filter(
            placement=placement,
            is_active=True,
            weight__gt=0,
        )
        .filter(
            Q(starts_at__isnull=True) | Q(starts_at__lte=now),
            Q(ends_at__isnull=True) | Q(ends_at__gte=now),
        )
        .filter(
            creative__campaign__status__in=[
                Campaign.Status.RUNNING,
                Campaign.Status.SCHEDULED,
            ],
        )
        .filter(
            Q(creative__campaign__starts_at__isnull=True)
            | Q(creative__campaign__starts_at__lte=now),
            Q(creative__campaign__ends_at__isnull=True)
            | Q(creative__campaign__ends_at__gte=now),
        )
    )
    survivors = [slot for slot in qs if _matches_targeting(slot, ctx)]
    survivors = _filter_capped_campaigns(survivors)
    cache.set(key, survivors, timeout=CACHE_SECONDS)
    return survivors


def _matches_targeting(slot: AdSlot, ctx: TargetingContext) -> bool:
    rule: Optional[TargetingRule] = getattr(slot, "targeting", None)
    if rule is None:
        return True

    if rule.countries and ctx.country and ctx.country not in rule.countries:
        return False
    if rule.exclude_countries and ctx.country and ctx.country in rule.exclude_countries:
        return False

    if rule.devices and ctx.device and ctx.device not in rule.devices:
        return False

    if rule.user_states:
        if "any" not in rule.user_states and ctx.user_state not in rule.user_states:
            return False

    if rule.languages and ctx.language and ctx.language not in rule.languages:
        return False

    if rule.path_includes:
        if not any(token in ctx.path for token in rule.path_includes):
            return False
    if rule.path_excludes:
        if any(token in ctx.path for token in rule.path_excludes):
            return False

    if rule.ab_bucket and ctx.ab_bucket and rule.ab_bucket != ctx.ab_bucket:
        return False

    if rule.only_with_empty_cart and (ctx.cart_value or 0) > 0:
        return False
    if rule.min_cart_value is not None and (ctx.cart_value or 0) < float(rule.min_cart_value):
        return False
    if rule.max_cart_value is not None and (ctx.cart_value or 0) > float(rule.max_cart_value):
        return False

    if ctx.category_ids:
        # Only enforce if rule restricts categories.
        targeted = list(rule.categories.values_list("id", flat=True))
        if targeted and not any(str(c) in {str(t) for t in targeted} for c in ctx.category_ids):
            return False

    return True


def _filter_capped_campaigns(slots: Iterable[AdSlot]) -> list[AdSlot]:
    """Drop slots whose campaign hit its impression cap today/total."""
    out: list[AdSlot] = []
    today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
    cache_pop: dict[str, dict[str, int]] = {}

    for slot in slots:
        camp = slot.creative.campaign
        cap_d = camp.daily_impression_cap
        cap_t = camp.total_impression_cap
        if not cap_d and not cap_t:
            out.append(slot)
            continue
        cid = str(camp.id)
        counts = cache_pop.get(cid)
        if counts is None:
            day_count = AdImpression.objects.filter(
                campaign_id=camp.id, served_at__gte=today_start
            ).count() if cap_d else 0
            total_count = (
                AdImpression.objects.filter(campaign_id=camp.id).count() if cap_t else 0
            )
            counts = {"day": day_count, "total": total_count}
            cache_pop[cid] = counts
        if cap_d and counts["day"] >= cap_d:
            continue
        if cap_t and counts["total"] >= cap_t:
            continue
        out.append(slot)
    return out


def _apply_frequency_caps(slots: list[AdSlot], ctx: TargetingContext) -> list[AdSlot]:
    """Drop slots that this session/user has already seen too many times."""

    if not (ctx.session_id or ctx.user_id):
        return slots

    out: list[AdSlot] = []
    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = now - timedelta(days=7)

    for slot in slots:
        if slot.cap_per_session <= 0 and slot.cap_per_day <= 0 and slot.cap_per_week <= 0:
            out.append(slot)
            continue

        owner_q = Q()
        if ctx.user_id:
            owner_q |= Q(user_id=ctx.user_id)
        if ctx.session_id:
            owner_q |= Q(session_id=ctx.session_id)
        base = AdImpression.objects.filter(slot=slot).filter(owner_q)

        if slot.cap_per_session > 0 and ctx.session_id:
            session_count = base.filter(session_id=ctx.session_id).count()
            if session_count >= slot.cap_per_session:
                continue

        if slot.cap_per_day > 0:
            day_count = base.filter(served_at__gte=today_start).count()
            if day_count >= slot.cap_per_day:
                continue

        if slot.cap_per_week > 0:
            week_count = base.filter(served_at__gte=week_start).count()
            if week_count >= slot.cap_per_week:
                continue

        out.append(slot)
    return out


def _weighted_pick(slots: list[AdSlot], n: int) -> list[AdSlot]:
    if n >= len(slots):
        return sorted(slots, key=lambda s: (s.position_hint, -s.weight))

    pool = list(slots)
    winners: list[AdSlot] = []
    while pool and len(winners) < n:
        weights = [
            max(1, s.weight) * _priority_multiplier(s.creative.campaign.priority)
            for s in pool
        ]
        choice = random.choices(pool, weights=weights, k=1)[0]
        winners.append(choice)
        pool.remove(choice)
    return sorted(winners, key=lambda s: (s.position_hint, -s.weight))


def _priority_multiplier(priority: int) -> int:
    if priority >= Campaign.Priority.URGENT:
        return 100
    if priority >= Campaign.Priority.HIGH:
        return 5
    if priority >= Campaign.Priority.NORMAL:
        return 2
    return 1


# ── Tracking ──────────────────────────────────────────────────────────────────


def record_impression(slot: AdSlot, ctx: TargetingContext, page_url: str = "", referrer: str = "") -> None:
    AdImpression.objects.create(
        slot=slot,
        creative_id=slot.creative_id,
        placement_id=slot.placement_id,
        campaign_id=slot.creative.campaign_id,
        session_id=ctx.session_id[:64],
        user_id=ctx.user_id,
        page_url=page_url[:500],
        referrer=referrer[:500],
        device=ctx.device[:20],
        country=ctx.country[:2],
    )


def record_click(slot: AdSlot, ctx: TargetingContext, destination_url: str, page_url: str = "") -> None:
    AdClick.objects.create(
        slot=slot,
        creative_id=slot.creative_id,
        placement_id=slot.placement_id,
        campaign_id=slot.creative.campaign_id,
        session_id=ctx.session_id[:64],
        user_id=ctx.user_id,
        destination_url=destination_url[:500],
        page_url=page_url[:500],
        device=ctx.device[:20],
        country=ctx.country[:2],
    )


# ── Targeting context helpers (for views) ─────────────────────────────────────


def build_context_from_request(request) -> TargetingContext:
    ua = (request.META.get("HTTP_USER_AGENT", "") or "").lower()
    if any(t in ua for t in ("ipad", "tablet")):
        device = "tablet"
    elif any(t in ua for t in ("mobi", "android", "iphone")):
        device = "mobile"
    else:
        device = "desktop"

    user = getattr(request, "user", None)
    if user and getattr(user, "is_authenticated", False):
        is_seller = bool(getattr(user, "is_seller", False) or getattr(user, "user_type", "") == "seller")
        user_state = "seller" if is_seller else "auth"
        user_id = str(getattr(user, "id", "") or "") or None
    else:
        user_state = "anon"
        user_id = None

    session_id = request.COOKIES.get("ad_session", "") or request.session.session_key or ""

    country = (
        request.META.get("HTTP_CF_IPCOUNTRY")
        or request.META.get("HTTP_X_COUNTRY")
        or ""
    ).upper()[:2]
    language = (request.META.get("HTTP_ACCEPT_LANGUAGE", "") or "")[:2].lower()

    return TargetingContext(
        country=country,
        device=device,
        user_state=user_state,
        user_id=user_id,
        session_id=session_id,
        path=(request.GET.get("path") or request.path)[:240],
        language=language,
        ab_bucket=request.GET.get("ab", "")[:20],
    )


# ── Stats (admin) ─────────────────────────────────────────────────────────────


def slot_stats(slot: AdSlot, days: int = 7) -> dict:
    cutoff = timezone.now() - timedelta(days=days)
    impressions = AdImpression.objects.filter(slot=slot, served_at__gte=cutoff).count()
    clicks = AdClick.objects.filter(slot=slot, clicked_at__gte=cutoff).count()
    ctr = (clicks / impressions * 100.0) if impressions else 0.0
    return {"impressions": impressions, "clicks": clicks, "ctr": round(ctr, 2)}


def campaign_stats(campaign: Campaign, days: int = 30) -> dict:
    cutoff = timezone.now() - timedelta(days=days)
    impressions = AdImpression.objects.filter(
        campaign_id=campaign.id, served_at__gte=cutoff
    ).count()
    clicks = AdClick.objects.filter(campaign_id=campaign.id, clicked_at__gte=cutoff).count()
    ctr = (clicks / impressions * 100.0) if impressions else 0.0
    return {
        "impressions": impressions,
        "clicks": clicks,
        "ctr": round(ctr, 2),
        "window_days": days,
    }
