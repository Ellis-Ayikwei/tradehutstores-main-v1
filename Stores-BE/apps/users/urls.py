from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserProfileDetailView,
    GroupManagementViewSet,
    PermissionManagementViewSet,
    UserViewSet,
)

router = DefaultRouter(trailing_slash=True)
router.register(r"", UserViewSet, basename="users")
router.register(r"groups", GroupManagementViewSet, basename="groups")
router.register(r"permissions", PermissionManagementViewSet, basename="permissions")

urlpatterns = [
    path(
        "<str:user_id>/profile/",
        UserProfileDetailView.as_view(),
        name="user-profile-detail",
    ),
    path("", include(router.urls)),
]
