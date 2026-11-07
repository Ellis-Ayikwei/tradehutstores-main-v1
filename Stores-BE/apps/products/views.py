from rest_framework import serializers, viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Prefetch, Q

from apps.catalog.models import AttributeValue
from .models import (
    Product,
    ProductVariant,
    ProductImage,
    Inventory,
    ProductDiscount,
    ProductKeyFeature,
)
from .serializers import (
    ProductSerializer,
    ProductCatalogSerializer,
    ProductVariantSerializer,
    ProductVariantWriteSerializer,
    ProductImageSerializer,
    InventorySerializer,
    ProductDiscountSerializer,
    ProductKeyFeatureSerializer,
    list_row_prefetches,
)
from apps.wishlist.models import Wishlist, WishlistItem, Favorite
from .permissions import (
    ParentProductOwnerOrStaff,
    ProductOwnerOrStaff,
    assert_can_attach,
    writing_seller_profile,
)
from .visibility import visibility_q, visible_products


class PublicVisibilityMixin:
    """Child rows (variants, images, ...) follow their product's visibility."""

    def get_queryset(self):
        qs = super().get_queryset()
        condition = visibility_q(self.request.user, "product__")
        return qs if condition is None else qs.filter(condition)


class OwnedChildWriteMixin:
    """Create/update of rows under a product: the target product must be the caller's."""

    permission_classes = [ParentProductOwnerOrStaff]

    def _check_target(self, serializer):
        user = self.request.user
        data = serializer.validated_data
        product = data.get("product", getattr(serializer.instance, "product", None))
        if not user.is_staff:
            assert_can_attach(user, product)
            variant = data.get("product_variant")
            if variant is not None and variant.product_id != product.pk:
                raise serializers.ValidationError(
                    {"product_variant": ["This variant belongs to a different product."]}
                )

    def perform_create(self, serializer):
        self._check_target(serializer)
        serializer.save()

    def perform_update(self, serializer):
        self._check_target(serializer)
        serializer.save()


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    # Reads are public; writes need staff or the owning seller (object level).
    permission_classes = [ProductOwnerOrStaff]

    def perform_create(self, serializer):
        user = self.request.user
        if user.is_staff:
            # Staff may assign a seller explicitly; otherwise default to their own profile.
            extra = {}
            if "seller_profile" not in serializer.validated_data:
                extra["seller_profile"] = getattr(user, "seller_profile", None)
            serializer.save(**extra)
            return
        if serializer.validated_data.get("default_variant") is not None:
            raise serializers.ValidationError(
                {"default_variant": ["Create the product first, then add variants."]}
            )
        serializer.save(seller_profile=writing_seller_profile(user), seller=user)

    def perform_update(self, serializer):
        user = self.request.user
        if user.is_staff:
            serializer.save()
            return
        variant = serializer.validated_data.get("default_variant")
        if variant is not None and variant.product_id != serializer.instance.pk:
            raise serializers.ValidationError(
                {"default_variant": ["This variant belongs to a different product."]}
            )
        # Ownership cannot be reassigned by sellers: the client value is ignored.
        serializer.save(
            seller_profile=serializer.instance.seller_profile,
            seller=serializer.instance.seller,
        )

    # Actions that render product cards: compact `variants` + `default_variant` per row.
    LIST_ROW_ACTIONS = frozenset(
        {
            "list",
            "search",
            "featured",
            "new_arrivals",
            "discounted",
            "popular",
            "related",
            "catalog",
        }
    )

    def get_queryset(self):
        qs = Product.objects.select_related(
            "category", "sub_category", "brand", "default_variant"
        )
        if getattr(self, "action", None) in self.LIST_ROW_ACTIONS:
            qs = qs.prefetch_related(*list_row_prefetches())
        else:
            qs = qs.prefetch_related("variants")
        return visible_products(qs, self.request.user)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if getattr(self, "action", None) in self.LIST_ROW_ACTIONS:
            context["list_variants"] = True
        return context

    @action(detail=False, methods=["get"])
    def search(self, request):
        query = request.query_params.get("q", "")
        qs = self.get_queryset()
        if query:
            qs = qs.filter(
                Q(name__icontains=query)
                | Q(description__icontains=query)
                | Q(keywords__icontains=query)
            )
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def featured(self, request):
        qs = self.get_queryset().filter(is_product_of_the_month=True)
        return Response(self.get_serializer(qs, many=True).data)

    @action(detail=False, methods=["get"])
    def new_arrivals(self, request):
        qs = self.get_queryset().order_by("-created_at")[:10]
        return Response(self.get_serializer(qs, many=True).data)

    @action(detail=False, methods=["get"])
    def discounted(self, request):
        qs = self.get_queryset().filter(discount_percentage__gt=0)
        return Response(self.get_serializer(qs, many=True).data)

    @action(detail=False, methods=["get"])
    def popular(self, request):
        qs = self.get_queryset().order_by("-average_rating", "-total_reviews")[:10]
        return Response(self.get_serializer(qs, many=True).data)

    @action(detail=False, methods=["get"])
    def catalog(self, request):
        qs = self.get_queryset()
        serializer = ProductCatalogSerializer(
            qs, many=True, context={"request": request}
        )
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def variants(self, request, pk=None):
        product = self.get_object()
        qs = product.variants.prefetch_related(
            Prefetch(
                "attribute_values",
                queryset=AttributeValue.objects.select_related("attribute"),
            ),
            Prefetch(
                "product_variant_images",
                queryset=ProductImage.objects.exclude(image="")
                .exclude(image__isnull=True)
                .order_by("-is_main", "created_at"),
            ),
        )
        serializer = ProductVariantSerializer(
            qs, many=True, context={"request": request}
        )
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def images(self, request, pk=None):
        product = self.get_object()
        serializer = ProductImageSerializer(
            product.product_images.all(),
            many=True,
            context={"request": request},
        )
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def discounts(self, request, pk=None):
        product = self.get_object()
        serializer = ProductDiscountSerializer(
            product.productdiscount_set.all(), many=True
        )
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def related(self, request, pk=None):
        product = self.get_object()
        qs = (
            self.get_queryset().filter(category=product.category)
            .exclude(pk=product.pk)
            .order_by("-average_rating")[:10]
        )
        return Response(self.get_serializer(qs, many=True).data)

    @action(
        detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated]
    )
    def add_to_wishlist(self, request, pk=None):
        product = self.get_object()
        wishlist, _ = Wishlist.objects.get_or_create(user=request.user)
        WishlistItem.objects.get_or_create(wishlist=wishlist, product=product)
        return Response({"detail": "Added to wishlist"})

    @action(
        detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated]
    )
    def add_to_favorites(self, request, pk=None):
        product = self.get_object()
        Favorite.objects.get_or_create(user=request.user, product=product)
        return Response({"detail": "Added to favorites"})


class ProductVariantViewSet(OwnedChildWriteMixin, PublicVisibilityMixin, viewsets.ModelViewSet):
    queryset = ProductVariant.objects.select_related("product")
    serializer_class = ProductVariantSerializer

    def get_serializer_class(self):
        if self.request.method in ("POST", "PUT", "PATCH"):
            return ProductVariantWriteSerializer
        return ProductVariantSerializer


class ProductImageViewSet(OwnedChildWriteMixin, PublicVisibilityMixin, viewsets.ModelViewSet):
    queryset = ProductImage.objects.select_related("product", "product_variant")
    serializer_class = ProductImageSerializer


class InventoryViewSet(OwnedChildWriteMixin, PublicVisibilityMixin, viewsets.ModelViewSet):
    queryset = Inventory.objects.select_related("product")
    serializer_class = InventorySerializer

    def get_queryset(self):
        qs = super().get_queryset()
        product_id = self.request.query_params.get("product")
        if product_id:
            qs = qs.filter(product_id=product_id)
        return qs.order_by("-created_at")


class ProductDiscountViewSet(OwnedChildWriteMixin, PublicVisibilityMixin, viewsets.ModelViewSet):
    queryset = ProductDiscount.objects.select_related("product")
    serializer_class = ProductDiscountSerializer


class ProductKeyFeatureViewSet(OwnedChildWriteMixin, PublicVisibilityMixin, viewsets.ModelViewSet):
    queryset = ProductKeyFeature.objects.select_related("product")
    serializer_class = ProductKeyFeatureSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        product_id = self.request.query_params.get("product")
        if product_id:
            qs = qs.filter(product_id=product_id)
        return qs.order_by("id")
