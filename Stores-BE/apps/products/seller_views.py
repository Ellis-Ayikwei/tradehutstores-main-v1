from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.sellers.models import SellerProfile
from apps.sellers.views import _MyProfileMixin

from .seller_listings import listing_row, seller_listings_queryset


class SellerListingsPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class SellerListingsView(_MyProfileMixin, APIView):
    """Own listings, paginated: ?status= &q= &low_stock=true &ordering= &page= &page_size=."""

    def get(self, request):
        seller = SellerProfile.objects.get(user=request.user)
        qs = seller_listings_queryset(seller, request.query_params)
        paginator = SellerListingsPagination()
        page = paginator.paginate_queryset(qs, request, view=self)
        return paginator.get_paginated_response([listing_row(p, request) for p in page])
