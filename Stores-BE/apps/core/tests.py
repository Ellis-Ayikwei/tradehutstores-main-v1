from unittest import mock

from django.test import SimpleTestCase, TestCase
from django.urls import reverse


class HealthEndpointTests(TestCase):
    def test_ok_when_database_answers(self):
        response = self.client.get(reverse("health"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})
        self.assertEqual(response["Cache-Control"], "no-store")

    def test_ignores_invalid_credentials(self):
        response = self.client.get(reverse("health"), HTTP_AUTHORIZATION="Bearer not-a-token")
        self.assertEqual(response.status_code, 200)

    def test_head_is_allowed(self):
        self.assertEqual(self.client.head(reverse("health")).status_code, 200)

    def test_post_is_rejected(self):
        self.assertEqual(self.client.post(reverse("health")).status_code, 405)


class HealthEndpointDatabaseDownTests(SimpleTestCase):
    def test_503_without_leaking_error_text(self):
        with mock.patch("apps.core.views.connection") as conn:
            conn.cursor.side_effect = RuntimeError("password authentication failed for user x")
            response = self.client.get(reverse("health"))
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json(), {"status": "unavailable"})
        self.assertNotIn("password", response.content.decode())
