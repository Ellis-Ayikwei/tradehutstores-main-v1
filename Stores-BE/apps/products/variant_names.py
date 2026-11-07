"""Single source of truth for placeholder ("generic") variant names.

A simple product has one variant whose ``name`` is blank. Names such as
"Default" leak into the storefront as a fake option, so writes reject them and
the ``clear_generic_variant_names`` command cleans stored data.
"""

import re
import string

GENERIC_VARIANT_NAMES = frozenset(
    {
        "default",
        "default variant",
        "default title",
        "standard",
        "single",
        "n/a",
        "na",
        "none",
        "untitled",
        "regular",
        "base",
        "-",
    }
)

GENERIC_VARIANT_NAME_MESSAGE = (
    "Choose a descriptive option name (for example 'Red / Large') "
    "or leave it blank for a simple product."
)

# Names written by the old populate_products seed ("<product> — Variant 1").
LEGACY_SEED_NAME_RE = re.compile(r"^.+ — Variant \d+$")

_EDGE_CHARS = string.whitespace + string.punctuation


def normalize_variant_name(name):
    """Trim, collapse inner whitespace, strip edge punctuation, lower-case."""
    if name is None:
        return ""
    collapsed = re.sub(r"\s+", " ", str(name)).strip()
    return collapsed.strip(_EDGE_CHARS).strip().lower()


def is_generic_variant_name(name):
    """True when ``name`` is a non-blank placeholder such as "Default" or "-".

    Blank / None is not generic (it is the valid "no name" value).
    """
    if name is None:
        return False
    raw = re.sub(r"\s+", " ", str(name)).strip()
    if not raw:
        return False
    normalized = normalize_variant_name(raw)
    if not normalized:
        # Punctuation only, e.g. "-", "--", "...".
        return True
    return normalized in GENERIC_VARIANT_NAMES or raw.lower() in GENERIC_VARIANT_NAMES
