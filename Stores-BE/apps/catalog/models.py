from datetime import datetime, time
from http import client
from math import prod
from operator import add
import random
from django.conf import settings
from django.core.validators import RegexValidator
from django.db import models
from django.utils import timezone
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


class AttributeValueRequest(BaseModel):
    """A seller's request for a new catalog attribute value (e.g. a colour).

    Attribute values stay staff-managed; staff approve (creating or linking the
    AttributeValue) or reject with a note.
    """

    STATUS_PENDING = "pending"
    STATUS_APPROVED = "approved"
    STATUS_REJECTED = "rejected"
    STATUS_DUPLICATE = "duplicate"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_APPROVED, "Approved"),
        (STATUS_REJECTED, "Rejected"),
        (STATUS_DUPLICATE, "Duplicate"),
    ]

    attribute = models.ForeignKey(
        Attribute, on_delete=models.PROTECT, related_name="value_requests"
    )
    value_name = models.CharField(max_length=100)
    color_code = models.CharField(
        max_length=7,
        blank=True,
        validators=[
            RegexValidator(r"^#[0-9A-Fa-f]{6}$", "Enter a colour like #AABBCC.")
        ],
    )
    note = models.TextField(blank=True)
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="attribute_value_requests",
    )
    seller = models.ForeignKey(
        "sellers.SellerProfile",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="attribute_value_requests",
    )
    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default=STATUS_PENDING
    )
    review_note = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_value = models.ForeignKey(
        AttributeValue,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    created_on = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        managed = True
        db_table = "attribute_value_requests"
        ordering = ["-created_on"]
        indexes = [
            models.Index(fields=["status", "created_on"], name="avr_status_created_idx"),
            models.Index(fields=["attribute", "value_name"], name="avr_attr_value_idx"),
        ]

    def __str__(self):
        return f"{self.attribute.name}: {self.value_name} ({self.status})"
