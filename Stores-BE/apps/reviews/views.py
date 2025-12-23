from rest_framework import viewsets, permissions
from .models import Review, ProductReviewImage
from .serializers import ReviewSerializer, ProductReviewImageSerializer


class ReviewPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        # allow owner or staff
        return (obj.user == request.user) or request.user.is_staff


class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.select_related("product", "user")
    serializer_class = ReviewSerializer
    permission_classes = [ReviewPermission]

    def perform_create(self, serializer):
        if serializer.validated_data.get("user") is None:
            serializer.save(user=self.request.user)
        else:
            serializer.save()


class ProductReviewImageViewSet(viewsets.ModelViewSet):
    queryset = ProductReviewImage.objects.select_related("review")
    serializer_class = ProductReviewImageSerializer
    permission_classes = [ReviewPermission]

    def perform_create(self, serializer):
        serializer.save()

