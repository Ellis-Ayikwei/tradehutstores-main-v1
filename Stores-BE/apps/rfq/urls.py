from django.urls import path

from . import views

app_name = "rfq"

urlpatterns = [
    # Buyer
    path("requests/", views.RFQListCreateView.as_view(), name="request-list"),
    path("requests/<uuid:pk>/", views.RFQDetailView.as_view(), name="request-detail"),
    path("requests/<uuid:pk>/publish/", views.RFQPublishView.as_view(), name="request-publish"),
    path("requests/<uuid:pk>/cancel/", views.RFQCancelView.as_view(), name="request-cancel"),
    path("requests/<uuid:pk>/award/", views.RFQAwardView.as_view(), name="request-award"),
    path("requests/<uuid:pk>/attachments/", views.RFQAttachmentCreateView.as_view(), name="attachment-create"),
    path(
        "requests/<uuid:pk>/attachments/<uuid:attachment_id>/",
        views.RFQAttachmentDeleteView.as_view(),
        name="attachment-delete",
    ),
    # Supplier
    path("seller/matches/", views.SellerMatchListView.as_view(), name="match-list"),
    path("seller/matches/<uuid:pk>/", views.SellerMatchDetailView.as_view(), name="match-detail"),
    path("seller/matches/<uuid:pk>/quote/", views.SellerQuoteCreateView.as_view(), name="quote-create"),
    path("seller/quotes/", views.SellerQuoteListView.as_view(), name="quote-list"),
    path("seller/quotes/<uuid:quote_id>/", views.SellerQuoteDetailView.as_view(), name="quote-detail"),
    path(
        "seller/quotes/<uuid:quote_id>/withdraw/",
        views.SellerQuoteWithdrawView.as_view(),
        name="quote-withdraw",
    ),
]
