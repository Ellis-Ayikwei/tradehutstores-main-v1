"""
fx/models.py

Stores a snapshot of exchange rates so we have a persistent fallback
even if the FX provider is unreachable and Redis cache is cold
(e.g. after a server restart).

Only one RateSnapshot is marked `is_current=True` at any time.
The save() method enforces this invariant automatically.
"""

from django.db import models
from django.utils import timezone


class RateSnapshot(models.Model):
    """
    A point-in-time snapshot of exchange rates relative to a base currency.
    Written every time the backend successfully fetches from the FX provider.
    """
    base_currency = models.CharField(max_length=3, default="GHS")
    rates         = models.JSONField(help_text="Dict of currency_code → rate relative to base")
    fetched_at    = models.DateTimeField(default=timezone.now)
    is_current    = models.BooleanField(
        default=False,
        help_text="Only one snapshot is current at a time.",
    )
    provider      = models.CharField(
        max_length=60,
        default="frankfurter",
        help_text="Which FX data provider was used.",
    )

    class Meta:
        ordering = ["-fetched_at"]
        verbose_name        = "Rate Snapshot"
        verbose_name_plural = "Rate Snapshots"

    def __str__(self):
        mark = "✓ current" if self.is_current else "archived"
        return f"{self.base_currency} rates @ {self.fetched_at:%Y-%m-%d %H:%M} [{mark}]"

    def save(self, *args, **kwargs):
        # Enforce single-current invariant — same pattern as FlashSale
        if self.is_current:
            RateSnapshot.objects.exclude(pk=self.pk).filter(is_current=True).update(is_current=False)
        super().save(*args, **kwargs)
