import importlib

from django.apps import apps as global_apps
from django.db import migrations
from django.test import TestCase

from apps.store.models import FeatureFlag

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
