"""P6 GET payments/seller/balance/."""

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.sellers.models import SellerProfile
from apps.sellers.seller_test_helpers import client_for, make_seller, make_user, set_sellers_flag
from apps.store.models import StoreConfig

from . import services

URL = "/tradehut/api/v1/payments/seller/balance/"
User = get_user_model()


class SellerBalanceTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        set_sellers_flag("on")
        cls.user, cls.seller = make_seller("a@th.test")

    def test_shape_and_zero_ledger(self):
        res = client_for(self.user).get(URL)
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(
            res.json(),
            {
                "currency": "GHS",
                "pending": "0.00",
                "available": "0.00",
                "paid_out": "0.00",
                "min_payout": "100.00",
            },
        )

    def test_min_payout_comes_from_store_config_and_service_does_not_create_it(self):
        StoreConfig.objects.all().delete()
        # The service itself never creates the singleton (the feature-flag layer may, on its own).
        self.assertEqual(services.seller_balance(self.seller)["min_payout"], "100.00")
        self.assertFalse(StoreConfig.objects.exists())
        config = StoreConfig.objects.create()
        StoreConfig.objects.filter(pk=config.pk).update(payments_min_payout=Decimal("250"))
        self.assertEqual(client_for(self.user).get(URL).json()["min_payout"], "250.00")

    def test_unauthenticated_is_401(self):
        self.assertEqual(client_for().get(URL).status_code, 401)

    def test_buyer_is_denied(self):
        res = client_for(make_user("buyer@th.test")).get(URL)
        self.assertEqual(res.status_code, 404)
        self.assertEqual(res.json()["code"], "not_a_seller")

    def test_read_only(self):
        self.assertEqual(client_for(self.user).post(URL, {}, format="json").status_code, 405)

    def test_flag_beta_blocks_regular_seller(self):
        set_sellers_flag("beta")
        res = client_for(self.user).get(URL)
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.json()["code"], "feature_disabled")

    def test_owner_superuser_without_profile_gets_200(self):
        set_sellers_flag("off")
        owner = User.objects.create_superuser(email="owner@th.test", password="pass12345!")
        res = client_for(owner).get(URL)
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()["available"], "0.00")
        self.assertTrue(SellerProfile.objects.filter(user=owner).exists())
