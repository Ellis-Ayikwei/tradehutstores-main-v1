from rest_framework.response import Response
from rest_framework.views import APIView

from apps.sellers.models import SellerProfile
from apps.sellers.views import _MyProfileMixin

from . import services


class SellerBalanceView(_MyProfileMixin, APIView):
    """P6 - the requesting seller's balance. Read-only."""

    def get(self, request):
        seller = SellerProfile.objects.get(user=request.user)
        return Response(services.seller_balance(seller))
