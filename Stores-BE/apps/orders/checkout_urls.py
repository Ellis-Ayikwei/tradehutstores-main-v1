from django.urls import path

from . import checkout_views

app_name = "checkout"

urlpatterns = [
    path("quote/", checkout_views.CheckoutQuoteView.as_view(), name="quote"),
    path("<str:checkout_id>/payment/", checkout_views.CheckoutPaymentView.as_view(), name="payment"),
    path("", checkout_views.CheckoutView.as_view(), name="place"),
]
