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


class Category(BaseModel):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)

    class Meta:
        managed = True
        db_table = "categories"

    def __str__(self):
        return self.name


class SubCategory(BaseModel):
    sub_category_name = models.CharField(db_column="Sub_category_name", max_length=255)
    category = models.ForeignKey(
        Category, on_delete=models.CASCADE, blank=True, null=True
    )

    class Meta:
        managed = True
        db_table = "sub_category"

    def __str__(self):
        return self.sub_category_name


class Brand(BaseModel):
    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        db_column="CategoryID",
        blank=True,
        null=True,
    )
    name = models.CharField(max_length=255)

    class Meta:
        managed = True
        db_table = "brands"

    def __str__(self):
        return self.name


class Attribute(BaseModel):
    name = models.CharField(max_length=255)

    display_type = models.CharField(
        max_length=20,
        choices=[
            ("dropdown", "Dropdown"),
            ("swatch", "Color Swatch"),
            ("image", "Image"),
            ("text", "Text"),
        ],
        default="dropdown",
    )

    class Meta:
        ordering = ["name"]
        managed = True
        db_table = "attributes"

    def __str__(self):
        return self.name


class AttributeValue(BaseModel):
    attribute = models.ForeignKey(
        Attribute,
        db_column="attribute_id",
        on_delete=models.CASCADE,
        blank=True,
        null=True,
    )
    value_name = models.CharField(max_length=255, blank=True, null=True)

    color_code = models.CharField(max_length=7, blank=True)  # For color swatches
    image = models.ImageField(upload_to="attribute_images/", blank=True)

    class Meta:
        managed = True
        db_table = "attribute_values"

    def __str__(self):
        return self.value_name


class Tag(BaseModel):
    product = models.ForeignKey(
        "products.Product",
        db_column="product_id",
        on_delete=models.CASCADE,
        related_name="product_tags",
        null=False,
        default=None,
    )
    name = models.CharField(max_length=255)

    class Meta:
        managed = True
        db_table = "tags"

    def __str__(self):
        return self.name
