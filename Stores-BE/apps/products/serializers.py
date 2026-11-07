from decimal import Decimal

from django.conf import settings
from django.db.models import Prefetch
from rest_framework import serializers
from apps.catalog.models import AttributeValue as CatalogAttributeValue
from .models import (
    Product,
    ProductVariant,
    ProductImage,
    Inventory,
    ProductDiscount,
    ProductKeyFeature,
)
from .variant_names import GENERIC_VARIANT_NAME_MESSAGE, is_generic_variant_name


# --- Compact variant rows for product LIST payloads (storefront card swatches) ---------------

LIST_VARIANT_CAP = 6
_COLOUR_ATTRIBUTE_NAMES = frozenset({"color", "colour", "colors", "colours"})


def list_row_prefetches(prefix=""):
    """Prefetch lookups so list rows never query per product/variant.

    ``prefix`` reaches the product from another model, e.g. ``"product__"``.
    Use these *instead of* a bare ``prefetch_related("variants")`` (Django rejects the same
    lookup twice with different querysets).
    """
    return [
        Prefetch(
            f"{prefix}variants",
            queryset=ProductVariant.objects.prefetch_related(
                Prefetch(
                    "attribute_values",
                    queryset=CatalogAttributeValue.objects.select_related("attribute"),
                ),
                Prefetch(
                    "product_variant_images",
                    queryset=ProductImage.objects.exclude(image="")
                    .exclude(image__isnull=True)
                    .order_by("-is_main", "created_at"),
                ),
            ),
        ),
        Prefetch(
            f"{prefix}product_images",
            queryset=ProductImage.objects.exclude(image="")
            .exclude(image__isnull=True)
            .order_by("-is_main", "created_at"),
        ),
    ]


def _prefetched(obj, name):
    cache = getattr(obj, "_prefetched_objects_cache", None) or {}
    return list(cache[name]) if name in cache else None


def product_variant_rows(product):
    """The product's variants, from the prefetch cache when present."""
    rows = _prefetched(product, "variants")
    return rows if rows is not None else list(product.variants.all())


def product_display_image(product):
    """``Product.display_main_image`` computed from prefetched ``product_images`` when available."""
    rows = _prefetched(product, "product_images")
    if rows is None:
        return product.display_main_image
    if product.main_product_image and getattr(product.main_product_image, "name", None):
        return product.main_product_image
    rows = [r for r in rows if r.image and getattr(r.image, "name", None)]
    rows.sort(key=lambda r: (not r.is_main, r.created_at))
    for kind in ("main", "supplementary"):
        row = next((r for r in rows if r.image_type == kind), None)
        if row:
            return row.image
    return rows[0].image if rows else None


def _file_url(f, request):
    if not f or not getattr(f, "name", None):
        return None
    try:
        url = f.url
    except ValueError:
        return None
    if not url:
        return None
    return request.build_absolute_uri(url) if request else url


def _colour_value(variant):
    """The variant's Colour/Color attribute value row, if it has one."""
    for av in variant.attribute_values.all():
        name = (getattr(av.attribute, "name", "") or "").strip().lower()
        if name in _COLOUR_ATTRIBUTE_NAMES and (av.value_name or "").strip():
            return av
    return None


def _colour_key(av):
    return (av.value_name or "").strip().lower()


def _in_stock(variant):
    return (variant.quantity or 0) > 0


def select_list_variants(product):
    """Cap a product's variants for a list row.

    Products with a Colour attribute: one lead variant per distinct colour (cheapest in-stock,
    else cheapest), up to ``LIST_VARIANT_CAP`` colours (in-stock colours win when trimming).
    Everything else: at most ``LIST_VARIANT_CAP`` variants, cheapest first.
    Returns ``(variants, default_variant_id)``; the default is always one of the returned rows.
    """
    rows = sorted(
        product_variant_rows(product), key=lambda v: (v.price, v.created_at, str(v.pk))
    )
    if not rows:
        return [], None
    default_id = product.default_variant_id

    colours = {v.pk: _colour_value(v) for v in rows}
    if any(av is not None for av in colours.values()):
        groups = {}
        for v in rows:
            av = colours[v.pk]
            if av is not None:
                groups.setdefault(_colour_key(av), []).append(v)
        leads = [
            next((m for m in members if _in_stock(m)), members[0])
            for members in groups.values()  # rows are price-sorted, so members are too
        ]
        leads.sort(key=lambda v: not _in_stock(v))  # stable: in-stock colours first
        chosen = leads[:LIST_VARIANT_CAP]
        if default_id is not None and all(v.pk != default_id for v in chosen):
            # Fall back to the lead of the default variant's colour, if that colour is shown.
            dv_colour = colours.get(default_id)
            lead = None
            if dv_colour is not None:
                lead = next(
                    (v for v in chosen if _colour_key(colours[v.pk]) == _colour_key(dv_colour)),
                    None,
                )
            default_id = lead.pk if lead else None
    else:
        chosen = rows[:LIST_VARIANT_CAP]
        if default_id is not None and all(v.pk != default_id for v in chosen):
            dv = next((v for v in rows if v.pk == default_id), None)
            if dv is not None:
                chosen = chosen[:-1] + [dv]
            else:
                default_id = None
    if default_id is None:
        default_id = chosen[0].pk
    return chosen, default_id


class ListVariantSerializer(serializers.Serializer):
    """Compact variant for card swatches. ``context["product"]`` supplies the discount."""

    id = serializers.UUIDField(read_only=True)
    name = serializers.SerializerMethodField()
    price = serializers.SerializerMethodField()
    final_price = serializers.SerializerMethodField()
    quantity = serializers.SerializerMethodField()
    primary_image = serializers.SerializerMethodField()
    attribute_values = serializers.SerializerMethodField()

    def get_name(self, obj):
        return (obj.name or "").strip() or None

    def get_price(self, obj):
        return str(obj.price)

    def get_final_price(self, obj):
        discount = self.context["product"].discount_percentage or 0
        final = obj.price - (obj.price * discount / 100)
        return str(final.quantize(Decimal("0.01")))

    def get_quantity(self, obj):
        return obj.quantity or 0

    def get_primary_image(self, obj):
        rows = [
            r
            for r in obj.product_variant_images.all()
            if r.image and getattr(r.image, "name", None)
        ]
        if not rows:
            return None
        row = next((r for r in rows if r.is_main), rows[0])
        return _file_url(row.image, self.context.get("request"))

    def get_attribute_values(self, obj):
        request = self.context.get("request")
        return [
            {
                "attribute_name": av.attribute.name if av.attribute else "",
                "value_name": av.value_name or "",
                "color_code": av.color_code or "",
                "image": _file_url(av.image, request),
            }
            for av in obj.attribute_values.all()
        ]


class ListVariantsMixin:
    """``get_variants`` / ``get_default_variant`` for serializers that render product list rows.

    Declare ``variants = SerializerMethodField()`` and ``default_variant = SerializerMethodField()``
    on the serializer (DRF only collects fields declared on Serializer subclasses).
    """

    def _list_variants(self, obj):
        cache = self.__dict__.setdefault("_list_variants_cache", {})
        if obj.pk not in cache:
            cache[obj.pk] = select_list_variants(obj)
        return cache[obj.pk]

    def get_variants(self, obj):
        chosen, _ = self._list_variants(obj)
        ctx = {"request": self.context.get("request"), "product": obj}
        return ListVariantSerializer(chosen, many=True, context=ctx).data

    def get_default_variant(self, obj):
        _, default_id = self._list_variants(obj)
        return str(default_id) if default_id else None


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class ProductVariantAttributeValueSerializer(serializers.ModelSerializer):
    """Exposes swatch metadata (`color_code`, `image`) for PDP variant pickers."""

    attribute_name = serializers.CharField(source="attribute.name", read_only=True)
    attribute_display_type = serializers.CharField(
        source="attribute.display_type", read_only=True
    )
    image = serializers.SerializerMethodField()

    class Meta:
        model = CatalogAttributeValue
        fields = [
            "id",
            "attribute",
            "attribute_name",
            "attribute_display_type",
            "value_name",
            "color_code",
            "image",
        ]

    def get_image(self, obj):
        if not obj.image:
            return None
        request = self.context.get("request")
        try:
            url = obj.image.url
        except ValueError:
            return None
        return request.build_absolute_uri(url) if request else url


class VariantNameValidationMixin:
    """Trim ``name`` and reject placeholder names. Runs only when ``name`` is sent."""

    def validate_name(self, value):
        if value is None:
            return value
        value = value.strip()
        if is_generic_variant_name(value):
            raise serializers.ValidationError(GENERIC_VARIANT_NAME_MESSAGE)
        return value


class ProductVariantSerializer(VariantNameValidationMixin, serializers.ModelSerializer):
    attribute_values = ProductVariantAttributeValueSerializer(
        many=True, read_only=True
    )
    primary_image = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_primary_image(self, obj):
        """Main variant gallery image (``is_main`` first), else first image row."""
        cache = getattr(obj, "_prefetched_objects_cache", None) or {}
        if "product_variant_images" in cache:
            rows = [
                r
                for r in cache["product_variant_images"]
                if r.image and getattr(r.image, "name", None)
            ]
        else:
            rows = list(
                obj.product_variant_images.exclude(image="")
                .exclude(image__isnull=True)
                .order_by("-is_main", "created_at")
            )
        if not rows:
            return None
        main = next((r for r in rows if r.is_main), None)
        row = main or rows[0]
        try:
            url = row.image.url
        except ValueError:
            return None
        if not url:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(url) if request else url


class ProductVariantWriteSerializer(
    VariantNameValidationMixin, serializers.ModelSerializer
):
    """
    Create/update payloads: ``attribute_values`` is a list of AttributeValue UUIDs.
    (Read serializers keep nested AttributeValue rendering for PDP/admin views.)
    """

    attribute_values = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=CatalogAttributeValue.objects.all(),
        required=False,
    )

    class Meta:
        model = ProductVariant
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class InventorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Inventory
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class ProductDiscountSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductDiscount
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class ProductKeyFeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductKeyFeature
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["pricing_currency"] = str(
            getattr(settings, "TRADEHUT_STORE_BASE_CURRENCY", "GHS")
        ).upper()
        disp = product_display_image(instance)
        if disp:
            request = self.context.get("request")
            try:
                url = disp.url
            except ValueError:
                url = None
            if url:
                data["main_product_image"] = (
                    request.build_absolute_uri(url) if request else url
                )
        # Convenience fields for storefront / admin grids (nested FK ids only in ``__all__``).
        data["category_name"] = getattr(instance.category, "name", None)
        data["sub_category_name"] = getattr(
            instance.sub_category, "sub_category_name", None
        )
        data["brand_name"] = getattr(instance.brand, "name", None)

        prefetch = getattr(instance, "_prefetched_objects_cache", None) or {}
        if "variants" in prefetch:
            variant_list = list(prefetch["variants"])
        else:
            variant_list = list(instance.variants.all())

        primary = instance.default_variant
        if primary is None and variant_list:
            primary = variant_list[0]
        data["primary_sku"] = primary.sku if primary else None
        if primary is not None and getattr(primary, "price", None) is not None:
            data["primary_variant_price"] = str(primary.price)
        else:
            data["primary_variant_price"] = None
        data["variant_stock_total"] = sum((v.quantity or 0) for v in variant_list)

        if self.context.get("list_variants"):
            chosen, default_id = select_list_variants(instance)
            data["variants"] = ListVariantSerializer(
                chosen,
                many=True,
                context={"request": self.context.get("request"), "product": instance},
            ).data
            if data.get("default_variant") is None and default_id:
                data["default_variant"] = str(default_id)

        return data


class ProductCatalogSerializer(ListVariantsMixin, serializers.ModelSerializer):
    """
    Catalog money fields (`price`, `final_price`) are in **pricing_currency**
    (settings.TRADEHUT_STORE_BASE_CURRENCY). API clients should convert client-side or call
    GET …/core/fx/snapshot/ for rates (Frankfurter-backed when enabled).
    """

    category = serializers.CharField(source="category.name", read_only=True)
    sub_category = serializers.CharField(source="sub_category.sub_category_name", read_only=True)
    brand = serializers.CharField(source="brand.name", read_only=True)
    price = serializers.SerializerMethodField()
    final_price = serializers.SerializerMethodField()
    pricing_currency = serializers.SerializerMethodField()
    rating = serializers.DecimalField(
        source="average_rating", max_digits=3, decimal_places=2, read_only=True
    )
    main_product_image = serializers.SerializerMethodField()
    variants = serializers.SerializerMethodField()
    default_variant = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "main_product_image",
            "variants",
            "default_variant",
            "price",
            "final_price",
            "pricing_currency",
            "discount_percentage",
            "rating",
            "total_reviews",
            "category",
            "sub_category",
            "brand",
            "condition",
            "available",
            "created_at",
        ]

    def get_pricing_currency(self, _obj) -> str:
        return str(getattr(settings, "TRADEHUT_STORE_BASE_CURRENCY", "GHS")).upper()

    def get_main_product_image(self, obj):
        f = product_display_image(obj)
        if not f:
            return None
        request = self.context.get("request")
        try:
            url = f.url
        except ValueError:
            return None
        return request.build_absolute_uri(url) if request else url

    def _resolve_variant_price(self, obj):
        if obj.default_variant and obj.default_variant.price is not None:
            return obj.default_variant.price
        rows = [v for v in product_variant_rows(obj) if v.price is not None]
        if rows:
            return min(rows, key=lambda v: (v.created_at, str(v.pk))).price
        return None

    def get_price(self, obj):
        return self._resolve_variant_price(obj)

    def get_final_price(self, obj):
        price = self._resolve_variant_price(obj)
        if price is None:
            return None

        discount = obj.discount_percentage or 0
        return price - (price * discount / 100)

