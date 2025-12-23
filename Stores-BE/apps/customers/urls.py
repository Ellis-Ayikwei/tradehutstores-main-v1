from django.urls import path
from .views import CustomersListView

app_name = "customers"

urlpatterns = [
    path("", CustomersListView.as_view(), name="customers_list"),
]

