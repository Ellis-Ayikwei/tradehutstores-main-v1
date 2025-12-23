from datetime import datetime, time
from http import client
from math import prod
from operator import add
import random
from django.db import models
from django.forms import model_to_dict
from django.contrib.auth.models import AbstractUser, BaseUserManager
import uuid

from apps.core.models import BaseModel
from apps.products.models import Product
from apps.users.models import User





ORDER_STATUS = (
    ('Pending', 'Pending'),
    ('Processing', 'Processing'),
    ('Shipped', 'Shipped')
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
    order_status = models.CharField(db_column='Order_status',  choices=ORDER_STATUS, max_length=10, blank=True, null=True)
    address_id = models.IntegerField(db_column='AddressID', blank=True, null=True)
    pay_mode = models.CharField(db_column='Pay_Mode', choices=PAY_MODE, max_length=100)
    phone = models.BigIntegerField()
    estimated_delivery_date = models.DateField(db_column='EstimatedDeliveryDate', blank=True, null=True)
    
    
    products = models.ManyToManyField(Product, through='OrderItem', blank=True)
    class Meta:
        managed = True
        db_table = 'orders'





class OrderItem(BaseModel):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, blank=True, null=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, blank=True, null=True)
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
