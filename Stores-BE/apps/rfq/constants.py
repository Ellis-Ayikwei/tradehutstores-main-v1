"""RFQ constants (plan 11 section 3)."""

from datetime import timedelta

MIN_OPEN = timedelta(hours=24)  # shortest allowed quote window
MAX_OPEN = timedelta(days=60)  # longest allowed quote window
AWARD_GRACE = timedelta(days=7)  # the buyer may still award this long after closes_at
PAYMENT_WINDOW = timedelta(hours=72)  # the award order is due this long after the award

MAX_SPECS = 20
MAX_ATTACHMENTS = 5
MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
ATTACHMENT_TYPES = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
}

MAX_QUANTITY = 1_000_000
MAX_DESCRIPTION = 5000
MAX_NOTES = 2000
SWEEP_BATCH = 200
