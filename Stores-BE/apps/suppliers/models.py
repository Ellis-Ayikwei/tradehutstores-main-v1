from django.db import models

from apps.core.models import BaseModel
from apps.products.models import Product


class Supplier(BaseModel):
    name = models.CharField(max_length=255)
    contact_name = models.CharField(max_length=255)
    contact_email = models.CharField(max_length=255)
    contact_phone = models.CharField(max_length=20)
    address = models.TextField(blank=True, null=True)

    class Meta:
        managed = True
        db_table = 'suppliers'


class SupplierProduct(BaseModel):
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, blank=True, null=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        managed = True
        db_table = 'supplier_products'




class PurchaseOrder(BaseModel):
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, blank=True, null=True)
    order_date = models.DateField()
    delivery_date = models.DateField()
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20)

    class Meta:
        managed = True
        db_table = 'purchase_orders'


class PurchaseOrderDetail(BaseModel):
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, blank=True, null=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, blank=True, null=True)
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        managed = True
        db_table = 'purchase_order_details'
