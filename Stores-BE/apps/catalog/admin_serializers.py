from rest_framework import serializers

from .models import Attribute, AttributeValue, Brand, Category, SubCategory


class CategoryAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "description", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class SubCategoryAdminSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = SubCategory
        fields = [
            "id",
            "sub_category_name",
            "category",
            "category_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "category_name", "created_at", "updated_at"]


class AttributeAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attribute
        fields = ["id", "name", "display_type", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class AttributeValueAdminSerializer(serializers.ModelSerializer):
    attribute_name = serializers.CharField(source="attribute.name", read_only=True)

    class Meta:
        model = AttributeValue
        fields = [
            "id",
            "attribute",
            "attribute_name",
            "value_name",
            "color_code",
            "image",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "attribute_name", "created_at", "updated_at"]


class BrandAdminSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = Brand
        fields = ["id", "name", "category", "category_name", "created_at", "updated_at"]
        read_only_fields = ["id", "category_name", "created_at", "updated_at"]
