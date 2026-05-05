from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    initial = True
    dependencies = []

    operations = [
        migrations.CreateModel(
            name="RateSnapshot",
            fields=[
                ("id",            models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("base_currency", models.CharField(default="GHS", max_length=3)),
                ("rates",         models.JSONField()),
                ("fetched_at",    models.DateTimeField(default=django.utils.timezone.now)),
                ("is_current",    models.BooleanField(default=False)),
                ("provider",      models.CharField(default="frankfurter", max_length=60)),
            ],
            options={
                "verbose_name":        "Rate Snapshot",
                "verbose_name_plural": "Rate Snapshots",
                "ordering":            ["-fetched_at"],
            },
        ),
    ]
