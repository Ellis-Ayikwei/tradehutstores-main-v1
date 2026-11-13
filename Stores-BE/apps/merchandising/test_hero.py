from django.db import IntegrityError, transaction
from django.test import TestCase
from rest_framework.test import APIClient

from apps.users.models import User

from .models import HeroConfig, HeroSlide

PUBLIC = "/tradehut/api/v1/homepage/hero/"
CONFIGS = "/tradehut/api/v1/homepage/admin/hero/configs/"
SLIDES = "/tradehut/api/v1/homepage/admin/hero/slides/"


def make_slide(hero, name="Slide", **extra):
    return HeroSlide.objects.create(hero=hero, name=name, **extra)


class HeroPublicTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_no_hero_returns_default_config_and_no_slides(self):
        body = self.client.get(PUBLIC).json()
        self.assertEqual(body["slides"], [])
        self.assertEqual(body["config"]["layout"], "carousel_side")
        self.assertEqual(HeroConfig.objects.count(), 0)

    def test_serves_only_the_active_heros_live_slides(self):
        old = HeroConfig.objects.create(name="Everyday", layout="carousel")
        live = HeroConfig.objects.create(name="Sale", layout="bento", is_active=True)
        make_slide(old, "old")
        shown = make_slide(live, "shown")
        make_slide(live, "draft", is_active=False)

        body = self.client.get(PUBLIC).json()

        self.assertEqual(body["config"]["layout"], "bento")
        self.assertEqual([s["id"] for s in body["slides"]], [shown.id])

    def test_falls_back_to_oldest_hero_when_none_is_active(self):
        first = HeroConfig.objects.create(name="First", layout="carousel")
        HeroConfig.objects.create(name="Second", layout="bento")
        slide = make_slide(first)

        body = self.client.get(PUBLIC).json()

        self.assertEqual(body["config"]["layout"], "carousel")
        self.assertEqual([s["id"] for s in body["slides"]], [slide.id])

    def test_public_config_does_not_expose_admin_fields(self):
        HeroConfig.objects.create(name="Internal name", is_active=True)
        config = self.client.get(PUBLIC).json()["config"]
        self.assertNotIn("name", config)
        self.assertNotIn("is_active", config)


class HeroAdminTests(TestCase):
    def setUp(self):
        self.staff = User.objects.create_user(email="staff@example.com", password="x", is_staff=True)
        self.client = APIClient()
        self.client.force_authenticate(self.staff)

    def test_admin_endpoints_refuse_anonymous_and_non_staff(self):
        hero = HeroConfig.objects.create(name="A", is_active=True)
        buyer = User.objects.create_user(email="buyer@example.com", password="x")
        for client_user in (None, buyer):
            client = APIClient()
            if client_user:
                client.force_authenticate(client_user)
            self.assertIn(client.get(CONFIGS).status_code, (401, 403))
            self.assertIn(client.post(CONFIGS, {"name": "X"}, format="json").status_code, (401, 403))
            self.assertIn(client.post(f"{CONFIGS}{hero.id}/activate/").status_code, (401, 403))
            self.assertIn(client.get(SLIDES).status_code, (401, 403))

    def test_first_hero_is_active_and_later_ones_are_not(self):
        first = self.client.post(CONFIGS, {"name": "Everyday"}, format="json")
        second = self.client.post(CONFIGS, {"name": "Sale"}, format="json")
        self.assertEqual(first.status_code, 201)
        self.assertTrue(first.json()["is_active"])
        self.assertFalse(second.json()["is_active"])

    def test_name_is_required_and_trimmed(self):
        self.assertEqual(self.client.post(CONFIGS, {"name": "   "}, format="json").status_code, 400)
        created = self.client.post(CONFIGS, {"name": "  Sale  "}, format="json").json()
        self.assertEqual(created["name"], "Sale")

    def test_is_active_cannot_be_set_through_create_or_patch(self):
        live = HeroConfig.objects.create(name="Live", is_active=True)
        other = self.client.post(CONFIGS, {"name": "Other", "is_active": True}, format="json").json()
        self.assertFalse(other["is_active"])
        patched = self.client.patch(f"{CONFIGS}{other['id']}/", {"is_active": True}, format="json").json()
        self.assertFalse(patched["is_active"])
        live.refresh_from_db()
        self.assertTrue(live.is_active)

    def test_activate_switches_the_single_active_hero_and_can_repeat(self):
        a = HeroConfig.objects.create(name="A", is_active=True)
        b = HeroConfig.objects.create(name="B")

        for _ in range(2):
            response = self.client.post(f"{CONFIGS}{b.id}/activate/")
            self.assertEqual(response.status_code, 200)
            self.assertTrue(response.json()["is_active"])

        self.assertEqual(list(HeroConfig.objects.filter(is_active=True).values_list("id", flat=True)), [b.id])
        a.refresh_from_db()
        self.assertFalse(a.is_active)

    def test_database_refuses_two_active_heroes(self):
        HeroConfig.objects.create(name="A", is_active=True)
        with self.assertRaises(IntegrityError), transaction.atomic():
            HeroConfig.objects.create(name="B", is_active=True)

    def test_active_hero_cannot_be_deleted(self):
        live = HeroConfig.objects.create(name="Live", is_active=True)
        response = self.client.delete(f"{CONFIGS}{live.id}/")
        self.assertEqual(response.status_code, 409)
        self.assertTrue(HeroConfig.objects.filter(pk=live.pk).exists())

    def test_deleting_an_inactive_hero_removes_only_its_slides(self):
        live = HeroConfig.objects.create(name="Live", is_active=True)
        spare = HeroConfig.objects.create(name="Spare")
        kept = make_slide(live)
        make_slide(spare)

        self.assertEqual(self.client.delete(f"{CONFIGS}{spare.id}/").status_code, 204)

        self.assertEqual(list(HeroSlide.objects.values_list("id", flat=True)), [kept.id])

    def test_layout_patch_is_validated(self):
        hero = HeroConfig.objects.create(name="A", is_active=True)
        bad = self.client.patch(f"{CONFIGS}{hero.id}/", {"interval_seconds": 99}, format="json")
        self.assertEqual(bad.status_code, 400)
        self.assertIn("interval_seconds", bad.json())
        ok = self.client.patch(f"{CONFIGS}{hero.id}/", {"interval_seconds": 8, "name": "Renamed"}, format="json")
        self.assertEqual(ok.status_code, 200)
        self.assertEqual(ok.json()["name"], "Renamed")

    def test_slides_are_listed_per_hero(self):
        a = HeroConfig.objects.create(name="A", is_active=True)
        b = HeroConfig.objects.create(name="B")
        mine = make_slide(a)
        make_slide(b)

        rows = self.client.get(SLIDES, {"hero": a.id}).json()
        self.assertEqual([r["id"] for r in rows], [mine.id])
        self.assertEqual(self.client.get(SLIDES, {"hero": "abc"}).json(), [])

    def test_new_slide_requires_a_hero(self):
        hero = HeroConfig.objects.create(name="A", is_active=True)
        missing = self.client.post(SLIDES, {"name": "No hero"}, format="json")
        self.assertEqual(missing.status_code, 400)
        self.assertIn("hero", missing.json())
        created = self.client.post(SLIDES, {"name": "With hero", "hero": hero.id}, format="json")
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.json()["hero"], hero.id)

    def test_reorder_only_accepts_exactly_that_heros_slides(self):
        a = HeroConfig.objects.create(name="A", is_active=True)
        b = HeroConfig.objects.create(name="B")
        s1, s2 = make_slide(a, "one", position=0), make_slide(a, "two", position=1)
        foreign = make_slide(b, "other", position=5)

        mixed = self.client.post(f"{SLIDES}reorder/", {"hero": a.id, "ids": [s1.id, s2.id, foreign.id]}, format="json")
        self.assertEqual(mixed.status_code, 400)
        partial = self.client.post(f"{SLIDES}reorder/", {"hero": a.id, "ids": [s2.id]}, format="json")
        self.assertEqual(partial.status_code, 400)

        ok = self.client.post(f"{SLIDES}reorder/", {"hero": a.id, "ids": [s2.id, s1.id]}, format="json")
        self.assertEqual(ok.status_code, 200)
        self.assertEqual([r["id"] for r in ok.json()], [s2.id, s1.id])
        foreign.refresh_from_db()
        self.assertEqual(foreign.position, 5)
