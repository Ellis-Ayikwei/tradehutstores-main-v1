from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone

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
    ProductVariantSerializer,
    ProductImageSerializer,
    InventorySerializer,
    ProductDiscountSerializer,
    ProductKeyFeatureSerializer,
)
from apps.wishlist.models import Wishlist, WishlistItem, Favorite


class StaffWritePermission(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_staff


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [StaffWritePermission]

    @action(detail=False, methods=["get"])
    def search(self, request):
        query = request.query_params.get("q", "")
        qs = self.queryset
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
        qs = self.queryset.filter(is_product_of_the_month=True)
        return Response(self.get_serializer(qs, many=True).data)

    @action(detail=False, methods=["get"])
    def new_arrivals(self, request):
        qs = self.queryset.order_by("-created_at")[:10]
        return Response(self.get_serializer(qs, many=True).data)

    @action(detail=False, methods=["get"])
    def discounted(self, request):
        qs = self.queryset.filter(discount_percentage__gt=0)
        return Response(self.get_serializer(qs, many=True).data)

    @action(detail=False, methods=["get"])
    def popular(self, request):
        qs = self.queryset.order_by("-average_rating", "-total_reviews")[:10]
        return Response(self.get_serializer(qs, many=True).data)

    @action(detail=True, methods=["get"])
    def variants(self, request, pk=None):
        product = self.get_object()
        serializer = ProductVariantSerializer(product.variants.all(), many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def images(self, request, pk=None):
        product = self.get_object()
        serializer = ProductImageSerializer(product.product_images.all(), many=True)
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
            self.queryset.filter(category=product.category)
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


class ProductVariantViewSet(viewsets.ModelViewSet):
    queryset = ProductVariant.objects.select_related("product")
    serializer_class = ProductVariantSerializer
    permission_classes = [StaffWritePermission]


class ProductImageViewSet(viewsets.ModelViewSet):
    queryset = ProductImage.objects.select_related("product", "product_variant")
    serializer_class = ProductImageSerializer
    permission_classes = [StaffWritePermission]


class InventoryViewSet(viewsets.ModelViewSet):
    queryset = Inventory.objects.select_related("product")
    serializer_class = InventorySerializer
    permission_classes = [StaffWritePermission]


class ProductDiscountViewSet(viewsets.ModelViewSet):
    queryset = ProductDiscount.objects.select_related("product")
    serializer_class = ProductDiscountSerializer
    permission_classes = [StaffWritePermission]


class ProductKeyFeatureViewSet(viewsets.ModelViewSet):
    queryset = ProductKeyFeature.objects.select_related("product")
    serializer_class = ProductKeyFeatureSerializer
    permission_classes = [StaffWritePermission]
