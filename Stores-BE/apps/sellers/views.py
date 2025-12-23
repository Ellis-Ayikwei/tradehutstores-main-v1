from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny


class SellersListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        # Placeholder response; replace with real data when available.
        return Response({"results": [], "count": 0})

