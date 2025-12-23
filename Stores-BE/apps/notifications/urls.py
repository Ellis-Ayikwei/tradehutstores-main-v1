from django.urls import path
from .views import UnreadCountView

urlpatterns = [
    path("unread_count/", UnreadCountView.as_view(), name="unread-count"),
]
