import importlib

from django.apps import apps as global_apps
from django.db import migrations
from django.test import TestCase, override_settings

from apps.store.models import FeatureFlag, StoreConfig
from apps.store.serializers import StoreConfigSerializer
from apps.store.views import _public_payment_gateways

seed = importlib.import_module("apps.store.migrations.0004_seed_sellers_flag")


class SeedSellersFlagMigrationTests(TestCase):
    def run_seed(self):
        seed.seed_sellers_flag(global_apps, None)

    def test_migration_left_a_beta_sellers_flag(self):
        flag = FeatureFlag.objects.get(key="sellers")
        self.assertEqual(flag.status, "beta")
        self.assertEqual(flag.audiences, [])
        self.assertEqual(flag.countries, [])

    def test_creates_beta_row_when_missing(self):
        FeatureFlag.objects.filter(key="sellers").delete()
        self.run_seed()
        flag = FeatureFlag.objects.get(key="sellers")
        self.assertEqual(flag.status, "beta")
        self.assertTrue(flag.name)

    def test_never_overwrites_an_existing_row(self):
        FeatureFlag.objects.filter(key="sellers").update(
            status="on", name="Custom", countries=["GH"], description="kept"
        )
        self.run_seed()
        self.run_seed()
        self.assertEqual(FeatureFlag.objects.filter(key="sellers").count(), 1)
        flag = FeatureFlag.objects.get(key="sellers")
        self.assertEqual(
            (flag.status, flag.name, flag.countries, flag.description), ("on", "Custom", ["GH"], "kept")
        )

    def test_reverse_is_a_no_op(self):
        self.assertIs(seed.Migration.operations[0].reverse_code, migrations.RunPython.noop)


OLD_GATEWAYS = [
    {"id": "paystack", "name": "Paystack", "enabled": True, "testMode": False, "publicKey": "pk_live_x", "secretKey": "sk_live_x"},
    {"id": "momo", "name": "Mobile Money", "enabled": True, "testMode": False, "publicKey": "", "secretKey": ""},
    {"id": "flutterwave", "name": "Flutterwave", "enabled": True, "testMode": True, "publicKey": "", "secretKey": ""},
    {"id": "stripe", "name": "Stripe", "enabled": True, "testMode": True, "publicKey": "", "secretKey": ""},
    {"id": "paypal", "name": "PayPal", "enabled": False, "testMode": True, "publicKey": "", "secretKey": ""},
    {"id": "cod", "name": "Cash on delivery", "enabled": False, "testMode": False, "publicKey": "", "secretKey": ""},
]

normalise = importlib.import_module("apps.store.migrations.0005_normalise_payment_gateways")


class PaymentGatewayCleanupTests(TestCase):
    def test_new_installs_only_get_card_or_momo_and_cod(self):
        gateways = StoreConfig.singleton().payments_gateways
        self.assertEqual([g["id"] for g in gateways], ["paystack", "cod"])
        self.assertEqual(gateways[0]["name"], "Card or mobile money")
        self.assertNotIn("paystack", gateways[0]["name"].lower())

    def test_migration_drops_unused_gateways_but_keeps_the_admins_choices(self):
        config = StoreConfig.singleton()
        StoreConfig.objects.filter(pk=config.pk).update(payments_gateways=OLD_GATEWAYS)
        normalise.normalise_gateways(global_apps, None)
        gateways = StoreConfig.objects.get(pk=config.pk).payments_gateways
        self.assertEqual([g["id"] for g in gateways], ["paystack", "cod"])
        paystack, cod = gateways
        self.assertEqual(paystack["name"], "Card or mobile money")
        # The admin's own settings for the kept gateways survive.
        self.assertEqual((paystack["enabled"], paystack["testMode"]), (True, False))
        self.assertEqual((paystack["publicKey"], paystack["secretKey"]), ("pk_live_x", "sk_live_x"))
        self.assertEqual(cod["enabled"], False)

    def test_migration_is_repeatable_and_fills_a_missing_gateway(self):
        config = StoreConfig.singleton()
        StoreConfig.objects.filter(pk=config.pk).update(payments_gateways=[])
        normalise.normalise_gateways(global_apps, None)
        first = StoreConfig.objects.get(pk=config.pk).payments_gateways
        normalise.normalise_gateways(global_apps, None)
        self.assertEqual(StoreConfig.objects.get(pk=config.pk).payments_gateways, first)
        self.assertEqual([g["id"] for g in first], ["paystack", "cod"])

    def test_saving_from_a_stale_admin_tab_cannot_bring_old_gateways_back(self):
        config = StoreConfig.singleton()
        serializer = StoreConfigSerializer(config, data={"payments_gateways": OLD_GATEWAYS}, partial=True)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual([g["id"] for g in serializer.validated_data["payments_gateways"]], ["paystack", "cod"])

    GATEWAYS = [
        {"id": "paystack", "name": "Card or mobile money", "enabled": True, "testMode": True, "secretKey": "sk"},
        {"id": "cod", "name": "Cash on delivery", "enabled": True, "testMode": False},
    ]

    @override_settings(PAYSTACK_SECRET_KEY="sk_test_x")
    def test_public_config_exposes_enabled_gateways_without_keys(self):
        public = _public_payment_gateways(self.GATEWAYS)
        self.assertEqual(
            public,
            [
                {"id": "paystack", "name": "Card or mobile money", "testMode": True},
                {"id": "cod", "name": "Cash on delivery", "testMode": False},
            ],
        )

    @override_settings(PAYSTACK_SECRET_KEY="")
    def test_card_or_mobile_money_is_hidden_until_paystack_is_configured(self):
        public = _public_payment_gateways(self.GATEWAYS)
        self.assertEqual([g["id"] for g in public], ["cod"])
