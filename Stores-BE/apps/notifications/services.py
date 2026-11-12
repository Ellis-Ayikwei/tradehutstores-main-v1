import logging

from django.db import transaction
from django.utils import timezone

from .models import Notification

logger = logging.getLogger(__name__)

KIND_MAX = Notification._meta.get_field("kind").max_length
TITLE_MAX = Notification._meta.get_field("title").max_length
LINK_MAX = Notification._meta.get_field("link").max_length


def safe_link(link) -> str:
    """Return ``link`` only if it is a site-relative path; otherwise ``""``.

    Rejects schemes, protocol-relative ``//host``, backslash variants that browsers
    normalise to ``//``, control characters and over-long values.
    """
    if not isinstance(link, str):
        return ""
    link = link.strip()
    if not link.startswith("/") or link.startswith("//") or len(link) > LINK_MAX:
        return ""
    if "\\" in link or any(ord(ch) < 32 or ord(ch) == 127 for ch in link):
        return ""
    return link


def notify(user_id, kind, title, body="", link="", data=None) -> None:
    """Create one inbox row for ``user_id``. Never raises.

    Callers invoke this inside ``transaction.on_commit``. The insert runs in its own
    savepoint so a failure cannot poison a surrounding transaction.
    """
    try:
        with transaction.atomic():
            Notification.objects.create(
                user_id=user_id,
                kind=str(kind or "")[:KIND_MAX],
                title=str(title or "")[:TITLE_MAX],
                body=str(body or ""),
                link=safe_link(link),
                data=data if isinstance(data, dict) else {},
            )
    except Exception:
        logger.exception("notify failed (kind=%s user=%s)", kind, user_id)


def unread_count(user) -> int:
    return Notification.objects.filter(user=user, read_at__isnull=True).count()


def mark_read(user, pk):
    """Set ``read_at`` once. Returns the notification, or ``None`` if it is not the user's.

    Uses ``update()`` so ``BaseModel``'s ``auto_now`` fields are not rewritten.
    """
    qs = Notification.objects.filter(user=user, pk=pk)
    qs.filter(read_at__isnull=True).update(read_at=timezone.now())
    return qs.first()


def mark_all_read(user) -> int:
    return Notification.objects.filter(user=user, read_at__isnull=True).update(
        read_at=timezone.now()
    )
