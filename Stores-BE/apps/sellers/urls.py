from django.urls import path

from . import stats_views, views

app_name = "sellers"

# Fixed paths first; the catch-all <slug_or_uuid>/ must stay last.
urlpatterns = [
    path("", views.PublicSellerListView.as_view(), name="sellers_list"),
    path("list/", views.PublicSellerListView.as_view(), name="sellers_list_alias"),
    path("onboarding/", views.SellerOnboardingView.as_view(), name="onboarding"),
    path("me/", views.SellerMeView.as_view(), name="me"),
    path("me/resubmit/", views.SellerResubmitView.as_view(), name="me_resubmit"),
    path("me/documents/", views.SellerMyDocumentsView.as_view(), name="me_documents"),
    path("me/stats/", stats_views.SellerStatsView.as_view(), name="me_stats"),
    path(
        "documents/file/<str:token>/",
        views.SellerDocumentFileView.as_view(),
        name="document_file",
    ),
    path("admin/list/", views.AdminSellerListView.as_view(), name="admin_list"),
    path(
        "admin/documents/<uuid:doc_id>/",
        views.AdminDocumentUpdateView.as_view(),
        name="admin_document",
    ),
    path("admin/<uuid:pk>/", views.AdminSellerDetailView.as_view(), name="admin_detail"),
    path(
        "admin/<uuid:pk>/documents/",
        views.AdminSellerDocumentsView.as_view(),
        name="admin_documents",
    ),
    path("<str:slug_or_uuid>/", views.PublicSellerDetailView.as_view(), name="public_detail"),
]
