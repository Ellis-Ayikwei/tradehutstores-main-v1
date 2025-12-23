from django.db import models
from django.conf import settings
from apps.core.models import BaseModel


class Wishlist(BaseModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, blank=True, null=True
    )

    class Meta:
        managed = True
        db_table = "wishlists"


class WishlistItem(BaseModel):
    wishlist = models.ForeignKey(
        Wishlist, on_delete=models.CASCADE, blank=True, null=True
    )
    product = models.ForeignKey(
        "products.Product", on_delete=models.CASCADE, blank=True, null=True
    )
    last_viewed = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = True
        db_table = "wishlist_items"


class Favorite(BaseModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        db_column="user",
        blank=True,
        null=True,
    )
    product = models.ForeignKey(
        "products.Product", on_delete=models.CASCADE, blank=True, null=True
    )

    class Meta:
        managed = True
        db_table = "favorites"
