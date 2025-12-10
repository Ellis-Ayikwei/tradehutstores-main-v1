from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import ItemCategory, ItemBrand, ItemModel, CommonItem
from .serializers import (
    ItemCategorySerializer,
    ItemBrandSerializer,
    ItemModelSerializer,
    CommonItemSerializer,
    ItemCategoryWithBrandsSerializer,
    ItemBrandWithModelsSerializer,
    CommonItemListSerializer,
    CategoryForDropdownSerializer,
    BrandForDropdownSerializer,
    ModelForDropdownSerializer,
)


class ItemCategoryViewSet(viewsets.ModelViewSet):
    """ViewSet for ItemCategory model"""

    queryset = ItemCategory.objects.all()
    serializer_class = ItemCategorySerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["requires_special_handling", "restricted", "insurance_required"]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at", "updated_at"]
    ordering = ["name"]

    @action(detail=False, methods=["get"])
    def with_brands(self, request):
        """Get categories with nested brands"""
        categories = self.get_queryset()
        serializer = ItemCategoryWithBrandsSerializer(categories, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def dropdown(self, request):
        """Get categories for dropdown"""
        categories = self.get_queryset()
        serializer = CategoryForDropdownSerializer(categories, many=True)
        return Response(serializer.data)


class ItemBrandViewSet(viewsets.ModelViewSet):
    """ViewSet for ItemBrand model"""

    queryset = ItemBrand.objects.select_related("category").all()
    serializer_class = ItemBrandSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["category"]
    search_fields = ["name", "description", "category__name"]
    ordering_fields = ["name", "category__name", "created_at", "updated_at"]
    ordering = ["category__name", "name"]

    def get_queryset(self):
        """Filter by category if provided"""
        queryset = super().get_queryset()
        category_id = self.request.query_params.get("category_id", None)
        if category_id is not None:
            queryset = queryset.filter(category_id=category_id)
        return queryset

    @action(detail=False, methods=["get"])
    def with_models(self, request):
        """Get brands with nested models"""
        brands = self.get_queryset()
        serializer = ItemBrandWithModelsSerializer(brands, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def dropdown(self, request):
        """Get brands for dropdown"""
        brands = self.get_queryset()
        serializer = BrandForDropdownSerializer(brands, many=True)
        return Response(serializer.data)


class ItemModelViewSet(viewsets.ModelViewSet):
    """ViewSet for ItemModel model"""

    queryset = ItemModel.objects.select_related("brand", "brand__category").all()
    serializer_class = ItemModelSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["brand", "brand__category"]
    search_fields = ["name", "description", "brand__name", "brand__category__name"]
    ordering_fields = [
        "name",
        "brand__name",
        "brand__category__name",
        "created_at",
        "updated_at",
    ]
    ordering = ["brand__category__name", "brand__name", "name"]

    def get_queryset(self):
        """Filter by brand if provided"""
        queryset = super().get_queryset()
        brand_id = self.request.query_params.get("brand_id", None)
        if brand_id is not None:
            queryset = queryset.filter(brand_id=brand_id)
        return queryset

    @action(detail=False, methods=["get"])
    def dropdown(self, request):
        """Get models for dropdown"""
        models = self.get_queryset()
        serializer = ModelForDropdownSerializer(models, many=True)
        return Response(serializer.data)


class CommonItemViewSet(viewsets.ModelViewSet):
    """ViewSet for CommonItem model"""

    queryset = CommonItem.objects.select_related("category", "brand", "model").all()
    serializer_class = CommonItemSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["category", "brand", "model", "fragile", "needs_disassembly"]
    search_fields = [
        "name",
        "description",
        "category__name",
        "brand__name",
        "model__name",
    ]
    ordering_fields = [
        "name",
        "category__name",
        "brand__name",
        "model__name",
        "created_at",
        "updated_at",
    ]
    ordering = ["category__name", "brand__name", "model__name", "name"]

    def get_queryset(self):
        """Apply additional filters"""
        queryset = super().get_queryset()

        # Filter by category
        category_id = self.request.query_params.get("category_id", None)
        if category_id is not None:
            queryset = queryset.filter(category_id=category_id)

        # Filter by brand
        brand_id = self.request.query_params.get("brand_id", None)
        if brand_id is not None:
            queryset = queryset.filter(brand_id=brand_id)

        # Filter by model
        model_id = self.request.query_params.get("model_id", None)
        if model_id is not None:
            queryset = queryset.filter(model_id=model_id)

        return queryset

    def get_serializer_class(self):
        """Use different serializer for list view"""
        if self.action == "list":
            return CommonItemListSerializer
        return CommonItemSerializer

    @action(detail=False, methods=["get"])
    def search(self, request):
        """Search items with query parameter"""
        query = request.query_params.get("q", "")
        if not query:
            return Response(
                {"error": 'Query parameter "q" is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from django.db.models import Q

        items = self.get_queryset().filter(
            Q(name__icontains=query)
            | Q(description__icontains=query)
            | Q(category__name__icontains=query)
            | Q(brand__name__icontains=query)
            | Q(model__name__icontains=query)
        )
        serializer = CommonItemListSerializer(items, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def categories_with_items(self, request):
        """Get categories with their item counts"""
        from django.db.models import Count

        categories = ItemCategory.objects.annotate(item_count=Count("items")).filter(
            item_count__gt=0
        )

        data = []
        for category in categories:
            data.append(
                {
                    "id": category.id,
                    "name": category.name,
                    "item_count": category.item_count,
                    "icon": category.icon,
                    "color": category.color,
                }
            )

        return Response(data)

    @action(detail=True, methods=["post"])
    def duplicate(self, request, pk=None):
        """Duplicate an item"""
        item = self.get_object()
        new_item = CommonItem.objects.create(
            name=f"{item.name} (Copy)",
            category=item.category,
            brand=item.brand,
            model=item.model,
            description=item.description,
            weight=item.weight,
            dimensions=item.dimensions,
            fragile=item.fragile,
            needs_disassembly=item.needs_disassembly,
            model_number=item.model_number,
            serial_number=item.serial_number,
            year=item.year,
            model_year=item.model_year,
            icon=item.icon,
            image=item.image,
            color=item.color,
            tab_color=item.tab_color,
            service_category=item.service_category,
        )
        serializer = self.get_serializer(new_item)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
