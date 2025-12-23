from rest_framework import serializers
from .models import Review, ProductReviewImage


class ProductReviewImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductReviewImage
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class ReviewSerializer(serializers.ModelSerializer):
    images = ProductReviewImageSerializer(source="productreviewimage_set", many=True, read_only=True)

    class Meta:
        model = Review
        fields = ["id", "product", "user", "rating", "comment", "verified", "images", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

