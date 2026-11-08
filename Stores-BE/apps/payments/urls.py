from django.urls import path

from . import views

app_name = "payments"

# Mounted at the API root (plan 20 section 3): the paths below carry the `payments/` prefix
# so checkout routes (`checkout/...`) can share this include later.
urlpatterns = [
    path("payments/seller/balance/", views.SellerBalanceView.as_view(), name="seller_balance"),
]
