from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    GroupManagementViewSet,
    PermissionManagementViewSet,
    UserGroupManagementViewSet,
)

router = DefaultRouter(trailing_slash=True)
router.register(r"groups", GroupManagementViewSet, basename="groups-root")
router.register(
    r"permissions", PermissionManagementViewSet, basename="permissions-root"
)
router.register(r"user-groups", UserGroupManagementViewSet, basename="user-groups-root")

urlpatterns = [
    path("", include(router.urls)),
]
