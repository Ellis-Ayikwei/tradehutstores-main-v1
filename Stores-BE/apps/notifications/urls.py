from django.urls import path

from .views import (
    NotificationDetailView,
    NotificationListView,
    NotificationReadView,
    ReadAllView,
    UnreadCountView,
)

# Fixed paths first so they are never parsed as an id.
urlpatterns = [
    path("", NotificationListView.as_view(), name="notification-list"),
    path("unread_count/", UnreadCountView.as_view(), name="unread-count"),
    path("read-all/", ReadAllView.as_view(), name="notification-read-all"),
    path("<uuid:pk>/read/", NotificationReadView.as_view(), name="notification-read"),
    path("<uuid:pk>/", NotificationDetailView.as_view(), name="notification-detail"),
]
