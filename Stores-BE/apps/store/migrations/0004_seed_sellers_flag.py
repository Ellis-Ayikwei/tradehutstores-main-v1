from django.db import migrations

SELLERS_FLAG = {
    "name": "Seller Center",
    "description": (
        "Seller onboarding and Seller Central. Beta: staff and named beta users only. "
        "Set to On to release (optionally limit by country or audience)."
    ),
    "status": "beta",
}


def seed_sellers_flag(apps, schema_editor):
    """Create the `sellers` flag in beta. An existing row (any status) is never changed."""
    FeatureFlag = apps.get_model("store", "FeatureFlag")
    FeatureFlag.objects.get_or_create(key="sellers", defaults=SELLERS_FLAG)


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0003_feature_flag"),
    ]

    operations = [
        migrations.RunPython(seed_sellers_flag, migrations.RunPython.noop),
    ]
