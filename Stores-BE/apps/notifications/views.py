from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated


class UnreadCountView(APIView):
    """
    Get unread notifications count.
    GET: Get count
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Mock response for now
        return Response({"count": 0}, status=status.HTTP_200_OK)
