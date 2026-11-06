"""Auction constants (not settings, per plan 10 section 3)."""

from datetime import timedelta

ENDING_SOON = timedelta(hours=1)
MIN_DURATION = timedelta(hours=1)
MAX_DURATION = timedelta(days=14)
MAX_START_AHEAD = timedelta(days=30)
START_GRACE = timedelta(minutes=5)  # starts_at may be this far in the past
PAYMENT_WINDOW = timedelta(hours=48)  # winner order is due this long after close
ETA_ARM_WINDOW = timedelta(seconds=90)  # never schedule an ETA further ahead than this
RECENT_BIDS = 10
SELLER_BID_LIST = 50
SWEEP_BATCH = 200
SETTLE_BATCH = 50

MAX_SOFT_CLOSE_SECONDS = 600
IDEMPOTENCY_KEY_MAX = 64
