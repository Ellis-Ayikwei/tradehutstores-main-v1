from django.urls import path

from . import views

app_name = "payments"

# Mounted at the API root (plan 20 section 3): the paths below carry the `payments/` prefix
# so checkout routes (`checkout/...`) can share this include later.
# Literal paths first: `payments/<uuid>/` must never swallow `payments/seller/...`, `payments/paystack/...`
# or `payments/refunds/...`.
urlpatterns = [
    path("payments/seller/balance/", views.SellerBalanceView.as_view(), name="seller_balance"),
    path("payments/paystack/webhook/", views.PaystackWebhookView.as_view(), name="paystack_webhook"),
    path("payments/paystack/verify/", views.PaystackVerifyView.as_view(), name="paystack_verify"),
    path("payments/refunds/", views.AdminRefundListView.as_view(), name="admin_refunds"),
    path("payments/refunds/<uuid:pk>/mark-failed/", views.AdminRefundMarkFailedView.as_view(), name="admin_refund_mark_failed"),
    path("payments/", views.AdminPaymentCollectionView.as_view(), name="admin_payments"),
    path("payments/<uuid:pk>/refund/", views.AdminPaymentRefundView.as_view(), name="admin_payment_refund"),
    path("payments/<uuid:pk>/", views.AdminPaymentDetailView.as_view(), name="admin_payment_detail"),
]
