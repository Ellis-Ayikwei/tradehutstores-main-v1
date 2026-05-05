from django.db import models

from apps.core.models import BaseModel

class Review(BaseModel):
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE, blank=True, null=True)
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, blank=True, null=True)
    rating = models.DecimalField(max_digits=10, decimal_places=2)
    comment = models.TextField(blank=True, null=True)
    verified = models.BooleanField(default=False)
    
    class Meta:
        managed = True
        db_table = 'reviews'


class ProductReviewImage(BaseModel):
    review = models.ForeignKey(Review, on_delete=models.CASCADE, blank=True, null=True)
    image_url = models.CharField(max_length=500)

    class Meta:
        managed = True
        db_table = 'product_review_images'
