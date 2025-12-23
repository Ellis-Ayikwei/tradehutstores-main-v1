from django.urls import path
from .views import SellersListView

app_name = "sellers"

urlpatterns = [
    path("", SellersListView.as_view(), name="sellers_list"),
]

