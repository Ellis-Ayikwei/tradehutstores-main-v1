"""Public product visibility.

Only products whose seller is verified AND active are public. Products with no
seller profile are platform listings and stay public. The owning seller sees
their own products; staff see everything.
"""

from django.db.models import Q


def visibility_q(user=None, prefix=""):
    """Q for "this product may be shown to ``user``". ``prefix`` reaches the
    product from another model, e.g. ``"product__"``. Returns ``None`` for staff
    (no restriction)."""
    if user is not None and getattr(user, "is_authenticated", False) and user.is_staff:
        return None
    sp = f"{prefix}seller_profile"
    condition = Q(**{f"{sp}__isnull": True}) | Q(
        **{f"{sp}__verification_status": "verified", f"{sp}__is_active": True}
    )
    if user is not None and getattr(user, "is_authenticated", False):
        condition |= Q(**{f"{sp}__user": user})
    return condition


def visible_products(qs, user=None):
    condition = visibility_q(user)
    return qs if condition is None else qs.filter(condition)


def public_products(qs):
    """What an anonymous visitor may see (homepage sections, search index)."""
    return visible_products(qs, None)
