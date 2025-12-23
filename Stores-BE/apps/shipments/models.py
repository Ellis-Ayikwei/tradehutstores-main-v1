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
from apps.users.models import User
from apps.orders.models import Order




class ShippingAddress(BaseModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, blank=True, null=True)
    address = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100, blank=True, null=True)
    postal_code = models.CharField(max_length=20)
    country = models.CharField(max_length=100)
    phone = models.CharField(max_length=20)

    latitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)

    
    class Meta:
        managed = True
        db_table = 'shipping_addresses'
        
    def __str__(self):
        return self.address
    
    
    
class Shipment(BaseModel):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, blank=True, null=True)
    shipping_address = models.ForeignKey(ShippingAddress, on_delete=models.CASCADE, blank=True, null=True)
    tracking_number = models.CharField(max_length=255)
    shipping_date = models.DateTimeField()
    expected_delivery_date = models.DateTimeField()

    class Meta:
        managed = True
        db_table = 'shipments'
