from rest_framework import status, viewsets, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.decorators import action
from django.contrib.auth.models import Group, Permission
from .models import User
from .serializers import (
    UserProfileSerializer,
    GroupSerializer,
    GroupDetailSerializer,
    PermissionSerializer,
    UserWithGroupsSerializer,
    CartSerializer,
    OrderSerializer,
    ReviewSerializer,
    AdminUserUpdateSerializer,
)
from apps.wishlist.serializers import WishlistSerializer
from apps.cart.models import Cart
from apps.wishlist.models import Wishlist
from apps.orders.models import Order
from apps.reviews.models import Review


class UserProfileDetailView(APIView):
    """
    Get user profile by ID with groups and extended information.
    GET: Get user details including groups, user_type, and profile data
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        # If user_id is 'undefined' or not valid UUID, return 404
        if user_id == "undefined":
            return Response(
                {"error": "Invalid user ID"}, status=status.HTTP_404_NOT_FOUND
            )

        # Allow users to view their own profile or admins to view any profile
        if str(request.user.id) != user_id and not (
            request.user.is_staff or request.user.is_superuser
        ):
            return Response(
                {"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN
            )

        # Get user with groups prefetched for better performance
        try:
            user = User.objects.prefetch_related("groups").get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = UserProfileSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class GroupManagementViewSet(viewsets.ModelViewSet):
    queryset = Group.objects.all().prefetch_related("permissions", "user_set")
    serializer_class = GroupSerializer
    permission_classes = [IsAdminUser]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return GroupDetailSerializer
        return GroupSerializer

    @action(detail=True, methods=["post"], url_path="add-users")
    def add_users(self, request, pk=None):
        group = self.get_object()
        user_ids = request.data.get("user_ids", [])
        if not isinstance(user_ids, list):
            return Response({"detail": "user_ids must be a list"}, status=400)
        users = User.objects.filter(id__in=user_ids)
        group.user_set.add(*users)
        return Response({"added": users.count()})

    @action(detail=True, methods=["post"], url_path="add_users")
    def add_users_underscore(self, request, pk=None):
        return self.add_users(request, pk)

    @action(detail=True, methods=["post"], url_path="remove-users")
    def remove_users(self, request, pk=None):
        group = self.get_object()
        user_ids = request.data.get("user_ids", [])
        if not isinstance(user_ids, list):
            return Response({"detail": "user_ids must be a list"}, status=400)
        users = User.objects.filter(id__in=user_ids)
        group.user_set.remove(*users)
        return Response({"removed": users.count()})

    @action(detail=True, methods=["post"], url_path="remove_users")
    def remove_users_underscore(self, request, pk=None):
        return self.remove_users(request, pk)


class PermissionManagementViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Permission.objects.all().select_related("content_type")
    serializer_class = PermissionSerializer
    permission_classes = [IsAdminUser]

    @action(detail=False, methods=["get"], url_path="by_content_type")
    def by_content_type(self, request):
        grouped = {}
        for perm in self.queryset:
            key = f"{perm.content_type.app_label}.{perm.content_type.model}"
            grouped.setdefault(key, []).append(PermissionSerializer(perm).data)
        return Response(grouped)


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Admin-only user list/detail with groups and permissions.
    """

    queryset = User.objects.all().prefetch_related("groups", "user_permissions")
    serializer_class = UserWithGroupsSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff or self.request.user.is_superuser:
            return self.queryset
        return self.queryset.filter(id=self.request.user.id)

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated])
    def my_cart(self, request, pk=None):
        user = self.get_object()
        if (
            not (request.user.is_staff or request.user.is_superuser)
            and user != request.user
        ):
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        cart, _ = Cart.objects.get_or_create(user=user)
        return Response(CartSerializer(cart, context={"request": request}).data)

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated])
    def my_wishlist(self, request, pk=None):
        user = self.get_object()
        if (
            not (request.user.is_staff or request.user.is_superuser)
            and user != request.user
        ):
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        wishlist, _ = Wishlist.objects.get_or_create(user=user)
        return Response(WishlistSerializer(wishlist, context={"request": request}).data)

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated])
    def my_orders(self, request, pk=None):
        user = self.get_object()
        if (
            not (request.user.is_staff or request.user.is_superuser)
            and user != request.user
        ):
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        orders = Order.objects.filter(user=user).prefetch_related(
            "orderitem_set", "orderitem_set__product"
        )
        return Response(
            OrderSerializer(orders, many=True, context={"request": request}).data
        )

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated])
    def my_reviews(self, request, pk=None):
        user = self.get_object()
        if (
            not (request.user.is_staff or request.user.is_superuser)
            and user != request.user
        ):
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        reviews = Review.objects.filter(user=user)
        return Response(
            ReviewSerializer(reviews, many=True, context={"request": request}).data
        )

    @action(
        detail=True,
        methods=["patch"],
        permission_classes=[IsAdminUser],
        url_path="admin_update",
    )
    def admin_update(self, request, pk=None):
        user = self.get_object()
        data = request.data.copy()
        # Normalize groups/user_permissions to lists of IDs
        groups_val = data.get("groups", None)
        if groups_val is not None:
            group_ids = []
            for g in groups_val:
                if isinstance(g, dict):
                    gid = g.get("id") or g.get("pk")
                    if gid:
                        group_ids.append(gid)
                else:
                    group_ids.append(g)
            data["groups"] = group_ids
        perms_val = data.get("user_permissions", None)
        if perms_val is not None:
            perm_ids = []
            for p in perms_val:
                if isinstance(p, dict):
                    pid = p.get("id") or p.get("pk")
                    if pid:
                        perm_ids.append(pid)
                else:
                    perm_ids.append(p)
            data["user_permissions"] = perm_ids

        # Keep only fields allowed by serializer
        allowed = {
            "email",
            "first_name",
            "last_name",
            "is_active",
            "is_staff",
            "is_superuser",
            "groups",
            "user_permissions",
        }
        filtered = {k: v for k, v in data.items() if k in allowed}

        serializer = AdminUserUpdateSerializer(
            user, data=filtered, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class UserGroupManagementViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminUser]

    @action(detail=False, methods=["get"], url_path="users_with_groups")
    def users_with_groups(self, request):
        users = User.objects.all().prefetch_related("groups", "user_permissions")
        return Response(UserWithGroupsSerializer(users, many=True).data)
