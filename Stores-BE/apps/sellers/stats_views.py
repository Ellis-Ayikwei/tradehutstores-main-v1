from rest_framework.response import Response
from rest_framework.views import APIView

from .models import SellerProfile
from .stats_services import seller_stats
from .views import _MyProfileMixin


class SellerStatsView(_MyProfileMixin, APIView):
    """SE4 - overview numbers for the requesting seller only."""

    def get(self, request):
        seller = SellerProfile.objects.get(user=request.user)
        return Response(seller_stats(seller))
