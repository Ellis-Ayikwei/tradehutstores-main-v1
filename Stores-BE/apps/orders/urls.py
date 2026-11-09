from django.urls import path

from . import admin_views, views

app_name = "orders"

# Keep every `seller/...` route above any future buyer `<uuid:pk>/` route.
urlpatterns = [
    # Staff-only list for the Admin app (Order Management).
    path("", admin_views.AdminOrderListView.as_view(), name="admin-order-list"),
    path("seller/", views.SellerOrderListView.as_view(), name="seller-order-list"),
    path("seller/<uuid:pk>/", views.SellerOrderDetailView.as_view(), name="seller-order-detail"),
    path("seller/<uuid:pk>/ship/", views.SellerOrderShipView.as_view(), name="seller-order-ship"),
    path("seller/<uuid:pk>/cancel/", views.SellerOrderCancelView.as_view(), name="seller-order-cancel"),
    path(
        "seller/<uuid:pk>/confirm-delivery/",
        views.SellerOrderConfirmDeliveryView.as_view(),
        name="seller-order-confirm-delivery",
    ),
    # Staff-only single order for the Admin app. After every `seller/...` route.
    path("<uuid:pk>/", admin_views.AdminOrderDetailView.as_view(), name="admin-order-detail"),
    path("<uuid:pk>/ship/", admin_views.AdminOrderShipView.as_view(), name="admin-order-ship"),
    path("<uuid:pk>/confirm-delivery/", admin_views.AdminOrderConfirmDeliveryView.as_view(), name="admin-order-confirm-delivery"),
    path("<uuid:pk>/cancel/", admin_views.AdminOrderCancelView.as_view(), name="admin-order-cancel"),
]
