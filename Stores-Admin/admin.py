from django.contrib import admin
from django.utils.html import format_html
from .models import ItemCategory, ItemBrand, ItemModel, CommonItem


@admin.register(ItemCategory)
class ItemCategoryAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "description",
        "requires_special_handling",
        "restricted",
        "insurance_required",
        "price_multiplier",
        "icon_display",
        "color_display",
    ]
    list_filter = ["requires_special_handling", "restricted", "insurance_required"]
    search_fields = ["name", "description"]
    readonly_fields = ["created_at", "updated_at"]

    fieldsets = (
        ("Basic Information", {"fields": ("name", "description")}),
        (
            "Special Handling",
            {
                "fields": (
                    "requires_special_handling",
                    "restricted",
                    "insurance_required",
                    "price_multiplier",
                    "special_instructions",
                )
            },
        ),
        (
            "Visual Properties",
            {
                "fields": ("icon", "image", "color", "tab_color"),
                "classes": ("collapse",),
            },
        ),
        (
            "Timestamps",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def icon_display(self, obj):
        if obj.icon:
            return format_html('<i class="fas fa-{}"></i> {}', obj.icon, obj.icon)
        return "-"

    icon_display.short_description = "Icon"

    def color_display(self, obj):
        if obj.color:
            return format_html(
                '<div style="background-color: {}; width: 20px; height: 20px; border-radius: 3px;"></div>',
                obj.color,
            )
        return "-"

    color_display.short_description = "Color"


@admin.register(ItemBrand)
class ItemBrandAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "description", "icon_display", "color_display"]
    list_filter = ["category"]
    search_fields = ["name", "description", "category__name"]
    readonly_fields = ["created_at", "updated_at"]

    fieldsets = (
        ("Basic Information", {"fields": ("name", "category", "description")}),
        (
            "Visual Properties",
            {
                "fields": ("icon", "image", "color", "tab_color"),
                "classes": ("collapse",),
            },
        ),
        (
            "Timestamps",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def icon_display(self, obj):
        if obj.icon:
            return format_html('<i class="fas fa-{}"></i> {}', obj.icon, obj.icon)
        return "-"

    icon_display.short_description = "Icon"

    def color_display(self, obj):
        if obj.color:
            return format_html(
                '<div style="background-color: {}; width: 20px; height: 20px; border-radius: 3px;"></div>',
                obj.color,
            )
        return "-"

    color_display.short_description = "Color"


@admin.register(ItemModel)
class ItemModelAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "brand",
        "category",
        "description",
        "icon_display",
        "color_display",
    ]
    list_filter = ["brand__category", "brand"]
    search_fields = ["name", "description", "brand__name", "brand__category__name"]
    readonly_fields = ["created_at", "updated_at"]

    fieldsets = (
        ("Basic Information", {"fields": ("name", "brand", "description")}),
        (
            "Visual Properties",
            {
                "fields": ("icon", "image", "color", "tab_color"),
                "classes": ("collapse",),
            },
        ),
        (
            "Timestamps",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def category(self, obj):
        return obj.brand.category.name

    category.short_description = "Category"

    def icon_display(self, obj):
        if obj.icon:
            return format_html('<i class="fas fa-{}"></i> {}', obj.icon, obj.icon)
        return "-"

    icon_display.short_description = "Icon"

    def color_display(self, obj):
        if obj.color:
            return format_html(
                '<div style="background-color: {}; width: 20px; height: 20px; border-radius: 3px;"></div>',
                obj.color,
            )
        return "-"

    color_display.short_description = "Color"


@admin.register(CommonItem)
class CommonItemAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "category",
        "brand",
        "model",
        "weight_display",
        "fragile",
        "needs_disassembly",
        "icon_display",
        "image_display",
    ]
    list_filter = ["category", "brand", "fragile", "needs_disassembly"]
    search_fields = [
        "name",
        "description",
        "category__name",
        "brand__name",
        "model__name",
    ]
    readonly_fields = ["created_at", "updated_at"]

    fieldsets = (
        (
            "Basic Information",
            {"fields": ("name", "category", "brand", "model", "description")},
        ),
        ("Physical Properties", {"fields": ("weight", "dimensions")}),
        ("Special Handling", {"fields": ("fragile", "needs_disassembly")}),
        (
            "Additional Information",
            {
                "fields": ("model_number", "serial_number", "year", "model_year"),
                "classes": ("collapse",),
            },
        ),
        (
            "Visual Properties",
            {
                "fields": ("icon", "image", "color", "tab_color"),
                "classes": ("collapse",),
            },
        ),
        (
            "Service Relationship",
            {"fields": ("service_category",), "classes": ("collapse",)},
        ),
        (
            "Timestamps",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def weight_display(self, obj):
        return obj.get_weight_display()

    weight_display.short_description = "Weight"

    def icon_display(self, obj):
        if obj.icon:
            return format_html('<i class="fas fa-{}"></i> {}', obj.icon, obj.icon)
        return "-"

    icon_display.short_description = "Icon"

    def image_display(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" style="width: 30px; height: 30px; object-fit: cover; border-radius: 3px;" />',
                obj.image,
            )
        return "-"

    image_display.short_description = "Image"

    def get_queryset(self, request):
        return (
            super().get_queryset(request).select_related("category", "brand", "model")
        )
