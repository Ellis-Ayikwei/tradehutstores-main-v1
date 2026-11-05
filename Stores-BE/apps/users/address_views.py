from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Address
from .serializers import AddressSerializer


class AddressViewSet(viewsets.ModelViewSet):
    """
    Saved delivery addresses for the authenticated user.

    list/create/retrieve/update/destroy at /addresses/,
    plus POST /addresses/{id}/set_default/.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = AddressSerializer

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user).order_by(
            "-is_default", "-created_at"
        )

    def _clear_other_defaults(self, keep_id=None):
        qs = Address.objects.filter(user=self.request.user, is_default=True)
        if keep_id is not None:
            qs = qs.exclude(id=keep_id)
        qs.update(is_default=False)

    def perform_create(self, serializer):
        # First address becomes the default automatically.
        is_first = not Address.objects.filter(user=self.request.user).exists()
        instance = serializer.save(
            user=self.request.user,
            is_default=serializer.validated_data.get("is_default", False) or is_first,
        )
        if instance.is_default:
            self._clear_other_defaults(keep_id=instance.id)

    def perform_update(self, serializer):
        instance = serializer.save(user=self.request.user)
        if instance.is_default:
            self._clear_other_defaults(keep_id=instance.id)

    @action(detail=True, methods=["post"])
    def set_default(self, request, pk=None):
        address = self.get_object()
        address.is_default = True
        address.save()
        self._clear_other_defaults(keep_id=address.id)
        return Response(AddressSerializer(address).data)
