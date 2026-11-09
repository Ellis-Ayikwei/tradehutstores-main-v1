from django.db import migrations, models


class Migration(migrations.Migration):
    """Additive and nullable: stores the checkout Idempotency-Key on each order it creates."""

    dependencies = [
        ("orders", "0003_order_lifecycle_and_tracking"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="checkout_key",
            field=models.CharField(blank=True, db_index=True, max_length=64, null=True),
        ),
    ]
