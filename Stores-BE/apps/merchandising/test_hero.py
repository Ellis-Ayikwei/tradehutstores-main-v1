import io
import tempfile
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import IntegrityError, transaction
from django.test import TestCase, override_settings
from PIL import Image
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


def png_file(name="poster.png"):
    buffer = io.BytesIO()
    Image.new("RGB", (4, 4), "#336699").save(buffer, format="PNG")
    return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/png")


def mp4_file(name="clip.mp4", size=64):
    return SimpleUploadedFile(name, b"\x00\x00\x00\x18ftypmp42" + b"\x00" * size, content_type="video/mp4")


def webm_file(name="clip.webm"):
    return SimpleUploadedFile(name, b"\x1a\x45\xdf\xa3" + b"\x00" * 64, content_type="video/webm")


class HeroStyleTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(User.objects.create_user(email="staff@example.com", password="x", is_staff=True))
        self.hero = HeroConfig.objects.create(name="A", is_active=True)

    def test_every_layout_is_accepted_and_unknown_ones_refused(self):
        for layout in ("carousel", "carousel_side", "bento", "tiles_below", "flanked", "full_bleed"):
            ok = self.client.patch(f"{CONFIGS}{self.hero.id}/", {"layout": layout}, format="json")
            self.assertEqual(ok.status_code, 200, layout)
            self.assertEqual(ok.json()["layout"], layout)
        bad = self.client.patch(f"{CONFIGS}{self.hero.id}/", {"layout": "spiral"}, format="json")
        self.assertEqual(bad.status_code, 400)

    def test_button_colours_default_to_the_original_white_button(self):
        slide = self.client.post(SLIDES, {"name": "S", "hero": self.hero.id, "title": "T"}, format="json").json()
        self.assertEqual((slide["cta_bg_color"], slide["cta_text_color"]), ("#ffffff", "#18181b"))

    def test_button_colours_are_validated_and_served_publicly(self):
        bad = self.client.post(SLIDES, {"name": "S", "hero": self.hero.id, "cta_bg_color": "red"}, format="json")
        self.assertEqual(bad.status_code, 400)
        self.assertIn("cta_bg_color", bad.json())
        self.client.post(
            SLIDES,
            {"name": "S", "hero": self.hero.id, "title": "T", "cta_bg_color": "#ff6600", "cta_text_color": "#000000"},
            format="json",
        )
        public = self.client.get(PUBLIC).json()["slides"][0]
        self.assertEqual((public["cta_bg_color"], public["cta_text_color"]), ("#ff6600", "#000000"))


class HeroVideoTests(TestCase):
    def setUp(self):
        media = tempfile.TemporaryDirectory()
        self.addCleanup(media.cleanup)
        override = override_settings(MEDIA_ROOT=media.name)
        override.enable()
        self.addCleanup(override.disable)
        self.client = APIClient()
        self.client.force_authenticate(User.objects.create_user(email="staff@example.com", password="x", is_staff=True))
        self.hero = HeroConfig.objects.create(name="A", is_active=True)

    def create(self, **files):
        # Multipart forms read a missing checkbox as false, so the admin always sends is_active.
        data = {"name": "Clip", "hero": self.hero.id, "title": "T", "is_active": "true", **files}
        return self.client.post(SLIDES, data, format="multipart")

    def test_mp4_and_webm_with_a_poster_are_saved_and_served(self):
        for video in (mp4_file(), webm_file()):
            response = self.create(image_desktop=png_file(), video=video)
            self.assertEqual(response.status_code, 201, response.content)
            self.assertTrue(response.json()["video_url"].startswith("http"))
        public = self.client.get(PUBLIC).json()["slides"]
        self.assertEqual(len(public), 2)
        self.assertTrue(all(s["video"] and s["image_desktop"] for s in public))

    def test_video_without_a_poster_image_is_refused(self):
        response = self.create(video=mp4_file())
        self.assertEqual(response.status_code, 400)
        self.assertIn("image_desktop", response.json())

    def test_extension_and_file_contents_must_agree(self):
        wrong_ext = self.create(image_desktop=png_file(), video=SimpleUploadedFile("clip.mov", b"\x00\x00\x00\x18ftypqt  ", content_type="video/quicktime"))
        fake_mp4 = self.create(image_desktop=png_file(), video=SimpleUploadedFile("clip.mp4", b"not a video at all", content_type="video/mp4"))
        webm_named_mp4 = self.create(image_desktop=png_file(), video=SimpleUploadedFile("clip.mp4", b"\x1a\x45\xdf\xa3" + b"\x00" * 16, content_type="video/mp4"))
        for response in (wrong_ext, fake_mp4, webm_named_mp4):
            self.assertEqual(response.status_code, 400)
            self.assertIn("video", response.json())
        self.assertEqual(HeroSlide.objects.count(), 0)

    def test_oversized_video_is_refused(self):
        with patch("apps.merchandising.hero_serializers.MAX_HERO_VIDEO_BYTES", 32):
            response = self.create(image_desktop=png_file(), video=mp4_file(size=100))
        self.assertEqual(response.status_code, 400)
        self.assertIn("15 MB", response.json()["video"][0])

    def test_removing_the_video_keeps_the_slide(self):
        created = self.create(image_desktop=png_file(), video=mp4_file()).json()
        removed = self.client.patch(f"{SLIDES}{created['id']}/", {"video": ""}, format="multipart")
        self.assertEqual(removed.status_code, 200, removed.content)
        self.assertIsNone(removed.json()["video_url"])

    def test_removing_the_poster_of_a_video_slide_is_refused(self):
        created = self.create(image_desktop=png_file(), video=mp4_file()).json()
        response = self.client.patch(f"{SLIDES}{created['id']}/", {"image_desktop": ""}, format="multipart")
        self.assertEqual(response.status_code, 400)
        self.assertIn("image_desktop", response.json())
