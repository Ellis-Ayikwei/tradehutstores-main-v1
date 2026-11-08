from django.urls import path

from . import views

app_name = "orders"

# Keep every `seller/...` route above any future buyer `<uuid:pk>/` route.
urlpatterns = [
    path("seller/", views.SellerOrderListView.as_view(), name="seller-order-list"),
    path("seller/<uuid:pk>/", views.SellerOrderDetailView.as_view(), name="seller-order-detail"),
    path("seller/<uuid:pk>/ship/", views.SellerOrderShipView.as_view(), name="seller-order-ship"),
    path(
        "seller/<uuid:pk>/confirm-delivery/",
        views.SellerOrderConfirmDeliveryView.as_view(),
        name="seller-order-confirm-delivery",
    ),
]
