from datetime import datetime
from django.forms import ValidationError
from django.db import models
from apps.core.models import BaseModel

DISCOUNT_TYPE = (
    ('Percentage', 'Percentage'),
    ('Fixed', 'Fixed'),
)

class Discount(BaseModel):
    code = models.CharField(db_column='Code', unique=True, max_length=50)
    description = models.TextField(db_column='Description', blank=True, null=True)
    discounttype = models.CharField(db_column='DiscountType', choices=DISCOUNT_TYPE, max_length=11)
    value = models.DecimalField(db_column='Value', max_digits=10, decimal_places=2)
    validfrom = models.DateField(db_column='ValidFrom', blank=True, null=True)
    validto = models.DateField(db_column='ValidTo', blank=True, null=True)
    unique_user = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True)  # Discount is for a specific user
    unique_product = models.ForeignKey("products.Product", on_delete=models.SET_NULL, null=True, blank=True)  # Discount is for a specific product
    # unique_store = models.ForeignKey('Seller', on_delete=models.SET_NULL, null=True, blank=True)
    max_uses = models.IntegerField(default=1)  # Maximum number of times this discount can be used by anyone
    uses_count = models.IntegerField(default=0)  # Tracks how many times the discount has been used

    class Meta:
        managed = True
        db_table = 'discounts'

    def clean(self):
        """Custom validation to ensure the discount is still valid."""
        today = datetime.date.today()
        if self.validfrom and today < self.validfrom:
            raise ValidationError("Discount is not valid yet.")
        if self.validto and today > self.validto:
            raise ValidationError("Discount has expired.")
        if self.uses_count >= self.max_uses:
            raise ValidationError("Discount usage limit reached.")

class DiscountRedemption(models.Model):

    user = models.ForeignKey('users.User', on_delete=models.CASCADE)
    discount = models.ForeignKey(Discount, on_delete=models.CASCADE)
    redeemed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'discount')  # Ensure one user can redeem the discount only once


class GiftCard(BaseModel):
    code = models.CharField(max_length=255, unique=True)
    balance = models.DecimalField(max_digits=10, decimal_places=2)
    expiration_date = models.DateTimeField()

    class Meta:
        managed = True
        db_table = 'gift_cards'
