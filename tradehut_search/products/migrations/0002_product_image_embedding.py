"""
Migration: adds image_embedding VectorField to products_product.

Requires pgvector extension in Postgres:
    CREATE EXTENSION IF NOT EXISTS vector;

Run: python manage.py migrate products
"""

from django.db import migrations
from pgvector.django import VectorField


class Migration(migrations.Migration):

    dependencies = [
        # Replace with your actual last migration
        ("products", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="image_embedding",
            field=VectorField(dimensions=512, null=True, blank=True),
        ),
    ]
