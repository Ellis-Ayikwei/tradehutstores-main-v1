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
from apps.orders.models import Order, ReturnRequest



class Payment(BaseModel):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, db_column='OrderID', blank=True, null=True)
    payment_date = models.DateTimeField(db_column='PaymentDate')
    amount = models.DecimalField(db_column='Amount', max_digits=10, decimal_places=2)
    status = models.CharField(db_column='PaymentStatus', max_length=9)
    payment_method = models.CharField(db_column='PaymentMethod', max_length=50)
    transaction_id = models.CharField(db_column='TransactionID', max_length=255, blank=True, null=True)

    class Meta:
        managed = True
        db_table = 'payments'
        
        
        
        
        
class Refund(BaseModel):
    return_request = models.ForeignKey(ReturnRequest, on_delete=models.CASCADE, blank=True, null=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    refund_date = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = True
        db_table = 'refunds'


class Transaction(BaseModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, blank=True, null=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    transaction_type = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = True
        db_table = 'transactions'



class PaymentMethod(BaseModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, blank=True, null=True)
    card_type = models.CharField(max_length=50)
    card_number = models.CharField(max_length=255)
    expiration_date = models.DateField()
    billing_address = models.TextField(blank=True, null=True)

    class Meta:
        managed = True
        db_table = 'payment_methods'
