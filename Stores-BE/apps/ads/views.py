"""
Public ad endpoints — placement serve, impression beacon, click beacon.
Anonymous-friendly; no auth required (the storefront calls these from the browser).
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import AdSlot
from .serializers import (
    PlacementPublicSerializer,
)
from .services import (
    build_context_from_request,
    record_click,
    record_impression,
    select_for_placement,
)


@api_view(["GET"])
@permission_classes([AllowAny])
def serve_placement(request, slug: str):
    """Return the resolved ad(s) for a placement.

    Query params (used as targeting hints):
      ?path=/products/foo  — current page path (overrides request.path)
      ?ab=A                — A/B bucket
      ?cat=<id>&cat=<id>   — category context
    """
    ctx = build_context_from_request(request)
    cat_ids = request.GET.getlist("cat")
    if cat_ids:
        ctx.category_ids = cat_ids

    placement, slots = select_for_placement(slug, ctx)
    if placement is None:
        return Response(status=status.HTTP_404_NOT_FOUND)

    payload = PlacementPublicSerializer(
        placement,
        context={"request": request, "slots": slots},
    ).data
    return Response(payload)


@api_view(["POST"])
@permission_classes([AllowAny])
def beacon_impression(request):
    slot_id = request.data.get("slot")
    if not slot_id:
        return Response({"detail": "slot is required"}, status=status.HTTP_400_BAD_REQUEST)
    try:
        slot = AdSlot.objects.select_related("creative__campaign").get(pk=slot_id)
    except AdSlot.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    ctx = build_context_from_request(request)
    record_impression(
        slot,
        ctx,
        page_url=request.data.get("page_url", "") or "",
        referrer=request.data.get("referrer", "") or "",
    )
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
@permission_classes([AllowAny])
def beacon_click(request):
    slot_id = request.data.get("slot")
    if not slot_id:
        return Response({"detail": "slot is required"}, status=status.HTTP_400_BAD_REQUEST)
    try:
        slot = AdSlot.objects.select_related("creative__campaign").get(pk=slot_id)
    except AdSlot.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    ctx = build_context_from_request(request)
    record_click(
        slot,
        ctx,
        destination_url=request.data.get("destination_url", "") or slot.creative.cta_url,
        page_url=request.data.get("page_url", "") or "",
    )
    return Response(status=status.HTTP_204_NO_CONTENT)
