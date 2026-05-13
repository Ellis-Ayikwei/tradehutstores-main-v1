from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework import routers

# JWT views can be imported here when needed for custom endpoints
# from rest_framework_simplejwt.views import (
#     TokenObtainPairView,
#     TokenRefreshView,
#     TokenVerifyView,
# )

# Initialize router for ViewSets (if any are added later)
router = routers.DefaultRouter(trailing_slash=True)

# Register ViewSets here when they are created
# Example:
# from apps.products.views import ProductViewSet
# router.register(r"products", ProductViewSet)

urlpatterns = [
    # API routes with versioned prefix
    path(
        "tradehut/api/v1/",
        include(
            [
                path("admin/", admin.site.urls),
                # Include router URLs for ViewSets
                path("", include(router.urls)),
                # Authentication endpoints
                path("auth/", include("apps.authentication.urls")),
                # Seller endpoints
                path("sellers/", include("apps.sellers.urls")),
                # Customer endpoints
                path("customers/", include("apps.customers.urls")),
                # User endpoints
                path("users/", include("apps.users.urls")),
                # Notifications endpoints
                path("notifications/", include("apps.notifications.urls")),
                # Wishlist/Favorites
                path("wishlist/", include("apps.wishlist.urls")),
                path("reviews/", include("apps.reviews.urls")),
                # Auth groups/permissions/user-groups
                path("", include("apps.users.group_routes")),
                # Catalog endpoints
                path("catalog/", include("apps.catalog.urls")),
                # Products endpoints
                path("products/", include("apps.products.urls")),
                path("", include("apps.merchandising.urls")),
                # Ad system (placements, campaigns, creatives, slots, beacons)
                path("", include("apps.ads.urls")),
                # Promo codes (validate / auto-apply / admin + seller CRUD)
                path("", include("apps.promotions.urls")),
                # Hybrid search (full-text + visual). Always mounted — the app
                # gracefully degrades when ES/pgvector are unavailable, so
                # clients can keep calling it across all environments.
                path("search/", include("apps.search.urls")),
                # Store FX snapshot (base + rates; mirrors apps.core.currency)
                path("core/", include("apps.core.urls")),
                # Marketplace-wide configuration (StoreConfig singleton).
                path("store/", include("apps.store.urls")),
                # Orders endpoints (when created)
                # path("orders/", include("apps.orders.urls")),
                # Cart endpoints (when created)
                # path("cart/", include("apps.cart.urls")),
                # Reviews endpoints (when created)
                # path("reviews/", include("apps.reviews.urls")),
                # Payments endpoints (when created)
                # path("payments/", include("apps.payments.urls")),
                # Shipments endpoints (when created)
                # path("shipments/", include("apps.shipments.urls")),
                # Store endpoints (when created)
                # path("stores/", include("apps.store.urls")),
                # Promotions endpoints (when created)
                # path("promotions/", include("apps.promotions.urls")),
                # Public images (e.g., email assets) served from templates directory
                # path(
                #     "images/<path:path>",
                #     static_serve,
                #     {
                #         "document_root": str(
                #             settings.BASE_DIR / "templates" / "emails" / "notifications"
                #         )
                #     },
                #     name="public_images",
                # ),
                # Media files under API prefix
                *static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT),
            ]
        ),
    ),
    # Media files also served outside API prefix for direct access
    *static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT),
]

# Custom error handlers (uncomment when error handlers are created)
# handler400 = "backend.error_handlers.custom_400_view"
# handler403 = "backend.error_handlers.custom_403_view"
# handler404 = "backend.error_handlers.custom_404_view"
# handler500 = "backend.error_handlers.custom_500_view"
