from rest_framework import serializers

from .models import Attribute, AttributeValue, Brand, Category, SubCategory


MAX_TILE_IMAGE_BYTES = 2 * 1024 * 1024


class CategoryAdminSerializer(serializers.ModelSerializer):
    tile_image_url = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            "id",
            "name",
            "description",
            "show_on_home",
            "home_position",
            "home_label",
            "tile_icon",
            "tile_image",
            "tile_image_url",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "tile_image_url", "created_at", "updated_at"]
        extra_kwargs = {"tile_image": {"required": False, "allow_null": True, "write_only": True}}

    def get_tile_image_url(self, obj):
        if not obj.tile_image:
            return None
        request = self.context.get("request")
        url = obj.tile_image.url
        return request.build_absolute_uri(url) if request else url

    def validate_tile_image(self, file):
        if file is not None and file.size > MAX_TILE_IMAGE_BYTES:
            raise serializers.ValidationError("Tile image is larger than 2 MB. Export it at 512 x 512.")
        return file


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
