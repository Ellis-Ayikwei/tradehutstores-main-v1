from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ItemCategoryViewSet,
    ItemBrandViewSet,
    ItemModelViewSet,
    CommonItemViewSet,
)

router = DefaultRouter()
router.register(r"categories", ItemCategoryViewSet)
router.register(r"brands", ItemBrandViewSet)
router.register(r"models", ItemModelViewSet)
router.register(r"common-items", CommonItemViewSet)

urlpatterns = [
    path("api/", include(router.urls)),
]
