from django.urls import path

from .views import fx_quote, fx_snapshot

urlpatterns = [
    path("fx/snapshot/", fx_snapshot, name="core-fx-snapshot"),
    path("fx/quote/", fx_quote, name="core-fx-quote"),
]
