from django.conf import settings
from django.db import migrations


def create_group_and_backfill(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    SellerProfile = apps.get_model("sellers", "SellerProfile")
    app_label, model_name = settings.AUTH_USER_MODEL.split(".")
    User = apps.get_model(app_label, model_name)
    group, _ = Group.objects.get_or_create(name="Sellers")
    Through = User.groups.through
    user_ids = SellerProfile.objects.values_list("user_id", flat=True)
    existing = set(
        Through.objects.filter(group_id=group.pk, user_id__in=user_ids).values_list("user_id", flat=True)
    )
    Through.objects.bulk_create(
        [Through(user_id=uid, group_id=group.pk) for uid in set(user_ids) if uid not in existing]
    )


class Migration(migrations.Migration):

    dependencies = [
        ("sellers", "0003_seller_kyc"),
        ("auth", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Reverse is a no-op: the group may hold users added after this migration.
        migrations.RunPython(create_group_and_backfill, migrations.RunPython.noop),
    ]
