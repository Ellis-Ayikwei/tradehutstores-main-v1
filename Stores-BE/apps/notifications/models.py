from django.conf import settings
from django.db import models

from apps.core.models import BaseModel


class Notification(BaseModel):
    """Per-user in-app inbox entry. ``link`` is a storefront/admin-relative path only."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    kind = models.CharField(max_length=60)
    title = models.CharField(max_length=160)
    body = models.TextField(blank=True)
    link = models.CharField(max_length=300, blank=True)
    data = models.JSONField(default=dict, blank=True)
    read_at = models.DateTimeField(null=True, blank=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["user", "read_at", "-created_at"],
                name="notif_user_read_created_idx",
            ),
        ]

    def __str__(self):
        return f"{self.kind} -> {self.user_id}"
