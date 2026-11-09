from django.db import migrations

PAYSTACK = {
    "id": "paystack",
    "name": "Card or mobile money",
    "enabled": True,
    "testMode": True,
    "publicKey": "",
    "secretKey": "",
}
COD = {
    "id": "cod",
    "name": "Cash on delivery",
    "enabled": True,
    "testMode": False,
    "publicKey": "",
    "secretKey": "",
}


def normalise_gateways(apps, schema_editor):
    """Keep only card/mobile money ("paystack") and cash on delivery ("cod").

    Momo, Flutterwave, Stripe and PayPal were never wired to the checkout, so they only confused admins.
    The settings the admin already chose for the two kept gateways (enabled, test mode, keys) are preserved;
    only the display name changes. Idempotent: running it again changes nothing.
    """
    StoreConfig = apps.get_model("store", "StoreConfig")
    for config in StoreConfig.objects.all():
        current = config.payments_gateways if isinstance(config.payments_gateways, list) else []
        by_id = {g.get("id"): g for g in current if isinstance(g, dict)}
        cleaned = []
        for default in (PAYSTACK, COD):
            merged = {**default, **by_id.get(default["id"], {}), "name": default["name"]}
            cleaned.append(merged)
        if cleaned != current:
            StoreConfig.objects.filter(pk=config.pk).update(payments_gateways=cleaned)


class Migration(migrations.Migration):
    dependencies = [
        ("store", "0004_seed_sellers_flag"),
    ]

    operations = [
        migrations.RunPython(normalise_gateways, migrations.RunPython.noop),
    ]
