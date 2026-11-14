"""Privacy and scoping (plan 11 test 3): foreign ids are 404, quotes never cross sellers."""

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase

from apps.rfq.models import Quote

from .helpers import BASE, client_for, make_category, make_quote, make_rfq, make_supplier, make_user


class PrivacyTests(TestCase):
    def setUp(self):
        self.buyer = make_user("buyer")
        self.stranger = make_user("stranger")
        self.category = make_category()
        self.rfq = make_rfq(self.buyer, self.category)
        self.seller_a = make_supplier(self.category, "a")
        self.seller_b = make_supplier(self.category, "b")
        self.quote_a = make_quote(self.rfq, self.seller_a, unit_price="11.11", notes="secret-a-notes")
        self.quote_b = make_quote(self.rfq, self.seller_b, unit_price="22.22", notes="secret-b-notes")

    def test_supplier_b_never_sees_supplier_as_quote(self):
        client = client_for(self.seller_b.user)
        payloads = [
            client.get(BASE + f"seller/matches/{self.rfq.pk}/"),
            client.get(BASE + "seller/matches/"),
            client.get(BASE + "seller/quotes/"),
        ]
        for res in payloads:
            self.assertEqual(res.status_code, 200)
            text = str(res.data)
            self.assertNotIn(str(self.quote_a.id), text)
            self.assertNotIn("secret-a-notes", text)
            self.assertNotIn("11.11", text)
        self.assertIn(str(self.quote_b.id), str(payloads[2].data))

    def test_supplier_cannot_touch_another_suppliers_quote(self):
        client = client_for(self.seller_b.user)
        url = BASE + f"seller/quotes/{self.quote_a.pk}/"
        self.assertEqual(client.patch(url, {"notes": "hijack"}, format="json").status_code, 404)
        self.assertEqual(client.post(url + "withdraw/").status_code, 404)
        self.quote_a.refresh_from_db()
        self.assertEqual((self.quote_a.status, self.quote_a.notes), ("submitted", "secret-a-notes"))

    def test_buyer_endpoints_are_404_for_a_non_owner(self):
        client = client_for(self.stranger)
        base = BASE + f"requests/{self.rfq.pk}/"
        att = SimpleUploadedFile("a.pdf", b"%PDF-1", content_type="application/pdf")
        responses = [
            client.get(base),
            client.patch(base, {"description": "x"}, format="json"),
            client.post(base + "publish/"),
            client.post(base + "cancel/"),
            client.post(base + "award/", {"quote_id": str(self.quote_a.id)}, format="json", HTTP_IDEMPOTENCY_KEY="k"),
            client.post(base + "attachments/", {"file": att}, format="multipart"),
            client.delete(base + "attachments/00000000-0000-0000-0000-000000000000/"),
        ]
        self.assertEqual([r.status_code for r in responses], [404] * 7)
        self.assertEqual(client.get(BASE + "requests/").data["count"], 0)
        self.rfq.refresh_from_db()
        self.assertEqual(self.rfq.status, "quoting")

    def test_the_buyer_sees_only_their_own_requests(self):
        make_rfq(self.stranger, self.category)
        res = client_for(self.buyer).get(BASE + "requests/")
        self.assertEqual(res.data["count"], 1)

    def test_a_seller_account_is_a_buyer_for_requests_they_post(self):
        mine = make_rfq(self.seller_a.user, self.category)
        client = client_for(self.seller_a.user)
        self.assertEqual(client.get(BASE + "requests/").data["count"], 1)
        self.assertEqual(client.get(BASE + f"requests/{mine.pk}/").status_code, 200)
        self.assertEqual(client.get(BASE + f"requests/{self.rfq.pk}/").status_code, 404)

    def test_buyer_cannot_use_supplier_endpoints_without_a_seller_profile(self):
        client = client_for(self.buyer)
        self.assertEqual(client.get(BASE + "seller/matches/").status_code, 404)
        self.assertEqual(client.get(BASE + "seller/quotes/").status_code, 404)

    def test_anonymous_is_rejected_everywhere(self):
        client = client_for()
        urls = [
            "requests/",
            f"requests/{self.rfq.pk}/",
            "seller/matches/",
            f"seller/matches/{self.rfq.pk}/",
            "seller/quotes/",
        ]
        for url in urls:
            self.assertEqual(client.get(BASE + url).status_code, 401, url)

    def test_buyer_payload_never_exposes_supplier_contact_details(self):
        res = client_for(self.buyer).get(BASE + f"requests/{self.rfq.pk}/")
        supplier = res.data["quotes"][0]["supplier"]
        self.assertEqual(set(supplier), {"id", "business_name", "store_slug", "is_verified", "rating"})
        self.assertEqual(Quote.objects.filter(rfq=self.rfq).count(), 2)
