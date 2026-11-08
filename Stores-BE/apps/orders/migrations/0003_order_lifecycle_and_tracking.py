from django.db import migrations, models
import django.utils.timezone


def backfill_placed_at(apps, schema_editor):
    """Existing orders: best available "placed" time is the row's own timestamp."""
    Order = apps.get_model("orders", "Order")
    Order.objects.update(placed_at=models.F("created_at"))


class Migration(migrations.Migration):
    """Additive only: widens order_status and adds lifecycle + tracking columns (all defaulted/nullable)."""

    dependencies = [
        ("orders", "0002_remove_order_address_id_order_address_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="order",
            name="order_status",
            field=models.CharField(
                blank=True,
                choices=[
                    ("Pending", "Pending"),
                    ("Processing", "Processing"),
                    ("Shipped", "Shipped"),
                    ("Delivered", "Delivered"),
                    ("Cancelled", "Cancelled"),
                    ("Refunded", "Refunded"),
                ],
                db_column="Order_status",
                max_length=20,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="order",
            name="payment_status",
            field=models.CharField(
                choices=[
                    ("unpaid", "Unpaid"),
                    ("paid", "Paid"),
                    ("refunded", "Refunded"),
                    ("partially_refunded", "Partially refunded"),
                ],
                db_index=True,
                default="unpaid",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="order",
            name="placed_at",
            field=models.DateTimeField(db_index=True, default=django.utils.timezone.now),
        ),
        migrations.AddField(
            model_name="order",
            name="paid_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="order",
            name="shipped_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="order",
            name="delivered_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="order",
            name="tracking_carrier",
            field=models.CharField(blank=True, default="", max_length=100),
        ),
        migrations.AddField(
            model_name="order",
            name="tracking_number",
            field=models.CharField(blank=True, default="", max_length=100),
        ),
        migrations.AddField(
            model_name="order",
            name="tracking_url",
            field=models.URLField(blank=True, default="", max_length=500),
        ),
        migrations.RunPython(backfill_placed_at, migrations.RunPython.noop),
    ]
