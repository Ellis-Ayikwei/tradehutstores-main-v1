from django.http import Http404
from rest_framework import generics, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .models import Notification
from .serializers import NotificationSerializer


class NotificationPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class NotificationListView(generics.ListAPIView):
    """GET: my notifications. Filters: ``unread=true``, ``kind=<prefix>``."""

    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer
    pagination_class = NotificationPagination

    def get_queryset(self):
        qs = Notification.objects.filter(user=self.request.user)
        params = self.request.query_params
        if params.get("unread", "").lower() in ("1", "true", "yes"):
            qs = qs.filter(read_at__isnull=True)
        kind = params.get("kind", "").strip()
        if kind:
            qs = qs.filter(kind__startswith=kind)
        return qs


class UnreadCountView(APIView):
    """GET: ``{"count": n}`` of my unread notifications."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"count": services.unread_count(request.user)}, status=status.HTTP_200_OK)


class ReadAllView(APIView):
    """POST: mark all my notifications read; ``{"updated": n}``."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        return Response({"updated": services.mark_all_read(request.user)}, status=status.HTTP_200_OK)


class NotificationDetailView(generics.RetrieveDestroyAPIView):
    """GET / DELETE one of my notifications."""

    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)


class NotificationReadView(APIView):
    """POST: idempotently mark one of my notifications read; returns it."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        notification = services.mark_read(request.user, pk)
        if notification is None:
            raise Http404
        return Response(NotificationSerializer(notification).data, status=status.HTTP_200_OK)
