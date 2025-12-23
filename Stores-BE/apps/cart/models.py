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
from apps.products.models import Product, ProductVariant


class Cart(BaseModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = True
        db_table = 'carts'
        
    def add_item(self, product, quantity=1):
        cart_item, created = CartItem.objects.get_or_create(cart=self, product=product)
        cart_item.quantity += quantity
        cart_item.save()
    
    def __str__(self):
        return f"{self.user.username}'s Cart"

class CartItem(BaseModel):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, blank=True, null=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, blank=True, null=True)
    product_variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE, blank=True, null=True)
    selected_variant_configuartion = models.JSONField(blank=True, null=True)
    quantity = models.IntegerField()

    class Meta:
        managed = True
        db_table = 'cart_items'
