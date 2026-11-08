from datetime import datetime, time
from http import client
from math import prod
from operator import add
import random
from django.db import models
from django.utils import timezone
from django.forms import model_to_dict
from django.contrib.auth.models import AbstractUser, BaseUserManager
import uuid

from apps.core.models import BaseModel
from apps.products.models import Product
from apps.users.models import User





ORDER_STATUS = (
    ('Pending', 'Pending'),
    ('Processing', 'Processing'),
    ('Shipped', 'Shipped'),
    ('Delivered', 'Delivered'),
    ('Cancelled', 'Cancelled'),
    ('Refunded', 'Refunded'),
)

PAYMENT_STATUS = (
    ('unpaid', 'Unpaid'),
    ('paid', 'Paid'),
    ('refunded', 'Refunded'),
    ('partially_refunded', 'Partially refunded'),
)

PAY_MODE = (
    ('COD', 'Cash on Delivery'),
    ('Online', 'Online'),
    ('Bank Transfer', 'Bank Transfer'),
    ('Card', 'Card'),
    ('Paypal', 'Paypal'),    
)


class Order(BaseModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user', blank=True, null=True)
    total_amount = models.DecimalField(db_column='TotalAmount', max_digits=10, decimal_places=2)
    order_status = models.CharField(db_column='Order_status',  choices=ORDER_STATUS, max_length=20, blank=True, null=True)
    address = models.ForeignKey(
        'users.Address',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='orders',
        db_column='AddressID',
    )
    pay_mode = models.CharField(db_column='Pay_Mode', choices=PAY_MODE, max_length=100)
    phone = models.BigIntegerField(blank=True, null=True)
    estimated_delivery_date = models.DateField(db_column='EstimatedDeliveryDate', blank=True, null=True)

    # Checkout pricing snapshot (base currency)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    shipping_cost = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    delivery_method = models.CharField(max_length=50, blank=True, null=True)
    promo_code = models.CharField(max_length=64, blank=True, null=True)
    promo_discount = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)

    # Lifecycle (plan 20 section 1). `created_at` is auto_now, so never use it as "placed".
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default='unpaid', db_index=True)
    placed_at = models.DateTimeField(default=timezone.now, db_index=True)
    paid_at = models.DateTimeField(blank=True, null=True)
    shipped_at = models.DateTimeField(blank=True, null=True)
    delivered_at = models.DateTimeField(blank=True, null=True)

    # Seller-entered shipment details (O7). Kept on the order because apps.shipments has no
    # migrations yet; move to a Shipment row when that app is built.
    tracking_carrier = models.CharField(max_length=100, blank=True, default='')
    tracking_number = models.CharField(max_length=100, blank=True, default='')
    tracking_url = models.URLField(max_length=500, blank=True, default='')

    products = models.ManyToManyField(Product, through='OrderItem', blank=True)
    class Meta:
        managed = True
        db_table = 'orders'





class OrderItem(BaseModel):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, blank=True, null=True, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, blank=True, null=True)
    variant = models.ForeignKey(
        'products.ProductVariant', on_delete=models.SET_NULL, blank=True, null=True
    )
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        managed = True
        db_table = 'order_items'





class ReturnRequest(BaseModel):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, blank=True, null=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, blank=True, null=True)
    reason = models.TextField()
    status = models.CharField(max_length=50)
    request_date = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = True
        db_table = 'return_requests'
