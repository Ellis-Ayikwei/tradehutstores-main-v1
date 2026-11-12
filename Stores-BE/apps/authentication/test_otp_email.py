from datetime import timedelta
from io import StringIO
from types import SimpleNamespace
from unittest import mock

from django.core import mail
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import SimpleTestCase, override_settings
from django.utils import timezone

from apps.authentication.utils import OTPEmailService


def _user_and_otp(first_name="Ama"):
    user = SimpleNamespace(id=1, email="ama@example.test", first_name=first_name)
    otp = SimpleNamespace(
        id=7, otp_code="482913", expires_at=timezone.now() + timedelta(minutes=10, seconds=30)
    )
    return user, otp


class OTPEmailTests(SimpleTestCase):
    def test_signup_otp_email_renders_and_sends(self):
        user, otp = _user_and_otp()
        self.assertTrue(OTPEmailService.send_otp_email(user, otp, "signup"))

        self.assertEqual(len(mail.outbox), 1)
        message = mail.outbox[0]
        self.assertEqual(message.to, ["ama@example.test"])
        self.assertEqual(message.subject, "Verify Your Email Address")
        self.assertIn("482913", message.body)
        html = message.alternatives[0][0]
        self.assertIn("482913", html)
        self.assertIn("Hi Ama,", html)
        self.assertIn("10 minutes", html)

    def test_each_otp_type_has_its_own_subject(self):
        subjects = set()
        for otp_type in ("signup", "login", "password_reset", "email_change", "other"):
            mail.outbox.clear()
            user, otp = _user_and_otp()
            OTPEmailService.send_otp_email(user, otp, otp_type)
            subjects.add(mail.outbox[0].subject)
        self.assertEqual(len(subjects), 5)

    def test_email_carries_tradehut_branding_only(self):
        user, otp = _user_and_otp(first_name="")
        OTPEmailService.send_otp_email(user, otp, "login")
        message = mail.outbox[0]
        everything = (message.body + message.alternatives[0][0]).lower()
        self.assertIn("tradehut", everything)
        self.assertNotIn("morevans", everything)
        self.assertIn("hi ama,", everything)  # no first name: falls back to the part before the @

    @override_settings(FRONTEND_URL="https://shop.example.test/")
    def test_logo_is_referenced_by_url_without_fetching_it(self):
        user, otp = _user_and_otp()
        with mock.patch("urllib.request.urlopen") as urlopen:
            OTPEmailService.send_otp_email(user, otp, "signup")
        urlopen.assert_not_called()
        self.assertIn(
            "https://shop.example.test/assets/images/logos/ths-light.png", mail.outbox[0].alternatives[0][0]
        )

    def test_returns_false_when_the_backend_fails(self):
        user, otp = _user_and_otp()
        with mock.patch("apps.authentication.utils.EmailMultiAlternatives.send", side_effect=OSError("down")):
            self.assertFalse(OTPEmailService.send_otp_email(user, otp, "signup"))


class SendTestEmailCommandTests(SimpleTestCase):
    def test_sends_one_message(self):
        out = StringIO()
        call_command("send_test_email", "ops@example.test", stdout=out)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["ops@example.test"])
        self.assertIn("Sent.", out.getvalue())

    def test_reports_a_send_failure(self):
        with mock.patch("utils.management.commands.send_test_email.send_mail", side_effect=OSError("rejected")):
            with self.assertRaisesMessage(CommandError, "Send failed: rejected"):
                call_command("send_test_email", "ops@example.test", stdout=StringIO())
