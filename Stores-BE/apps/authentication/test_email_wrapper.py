from datetime import timedelta
from types import SimpleNamespace

from django.core import mail
from django.test import SimpleTestCase, override_settings
from django.utils import timezone

from apps.authentication.modal_views import _deliver_otp
from apps.authentication.utils import OTPEmailService
from apps.core.email import send_branded_email

SIGNATURE_PARTS = [
    "The TradeHut team",
    "024 813 8722",
    "tel:+233248138722",
    "https://wa.me/233248138722",
    "La Trade Fair, Accra, Ghana",
    "no-reply",
    "ths-light.png",
]


class WrapperAssertions:
    def assert_wrapped(self, message):
        html = message.alternatives[0][0]
        for part in SIGNATURE_PARTS:
            self.assertIn(part, html, f"html is missing {part!r}")
        for part in ("The TradeHut team", "024 813 8722", "La Trade Fair, Accra, Ghana", "no-reply"):
            self.assertIn(part, message.body, f"text is missing {part!r}")
        self.assertNotIn("morevans", (html + message.body).lower())


class OTPEmailWrapperTests(WrapperAssertions, SimpleTestCase):
    def test_otp_email_has_logo_signature_and_no_reply_notice(self):
        user = SimpleNamespace(id=1, email="ama@example.test", first_name="Ama")
        otp = SimpleNamespace(id=7, otp_code="482913", expires_at=timezone.now() + timedelta(minutes=10, seconds=30))
        OTPEmailService.send_otp_email(user, otp, "login")
        message = mail.outbox[0]
        self.assert_wrapped(message)
        self.assertIn("482913", message.body)


class BrandedEmailTests(WrapperAssertions, SimpleTestCase):
    def test_message_has_greeting_paragraphs_code_and_button(self):
        sent = send_branded_email(
            "ops@example.test",
            "Hello",
            title="A heading",
            user_name="Kofi",
            paragraphs=["First paragraph.", "Second one."],
            code="123456",
            action_label="Do it",
            action_url="https://shop.example.test/go?a=1&b=2",
        )
        self.assertEqual(sent, 1)
        message = mail.outbox[0]
        self.assertEqual(message.to, ["ops@example.test"])
        self.assertEqual(message.subject, "Hello")
        self.assert_wrapped(message)
        html = message.alternatives[0][0]
        for part in ("Hi Kofi,", "A heading", "First paragraph.", "123456", "Do it"):
            self.assertIn(part, html)
        self.assertIn('href="https://shop.example.test/go?a=1&amp;b=2"', html)
        self.assertIn("Do it: https://shop.example.test/go?a=1&b=2", message.body)  # text part is not HTML-escaped

    def test_optional_parts_are_left_out(self):
        send_branded_email("ops@example.test", "Plain", paragraphs=["Just text."])
        message = mail.outbox[0]
        html = message.alternatives[0][0]
        self.assertNotIn("Hi ", html)
        self.assertNotIn("<a href=\"https://shop", html)
        self.assertNotIn("Your code", message.body)
        self.assert_wrapped(message)

    def test_html_in_values_is_escaped(self):
        send_branded_email("ops@example.test", "x", paragraphs=["<script>alert(1)</script>"], user_name="<b>x</b>")
        html = mail.outbox[0].alternatives[0][0]
        self.assertNotIn("<script>", html)
        self.assertIn("&lt;script&gt;", html)

    def test_apostrophes_are_not_escaped_in_the_text_part(self):
        send_branded_email("ops@example.test", "x", paragraphs=["If you didn't ask, ignore this."])
        self.assertIn("didn't", mail.outbox[0].body)

    @override_settings(EMAIL_LOGO_URL="https://cdn.example.test/logo.png")
    def test_logo_url_can_be_overridden(self):
        send_branded_email("ops@example.test", "x", paragraphs=["hi"])
        self.assertIn("https://cdn.example.test/logo.png", mail.outbox[0].alternatives[0][0])


class LoginModalOTPTests(WrapperAssertions, SimpleTestCase):
    def test_modal_otp_email_is_wrapped(self):
        _deliver_otp(identifier="ama@example.test", kind="email", code="654321")
        message = mail.outbox[0]
        self.assertEqual(message.to, ["ama@example.test"])
        self.assertEqual(message.subject, "Your TradeHut verification code")
        self.assertIn("654321", message.body)
        self.assertIn("654321", message.alternatives[0][0])
        self.assert_wrapped(message)
