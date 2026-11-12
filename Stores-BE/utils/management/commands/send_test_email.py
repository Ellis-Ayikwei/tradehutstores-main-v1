from django.conf import settings
from django.core.mail import send_mail
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = (
        "Send one test email through the configured email backend "
        "(Amazon SES when USE_SES=True, the console otherwise). Does not touch the database."
    )

    def add_arguments(self, parser):
        parser.add_argument("to", help="Recipient address. In the SES sandbox it must be a verified address.")

    def handle(self, *args, **options):
        self.stdout.write(f"Backend: {settings.EMAIL_BACKEND}")
        self.stdout.write(f"From:    {settings.DEFAULT_FROM_EMAIL}")
        try:
            sent = send_mail(
                subject="TradeHut email test",
                message="If you can read this, outgoing email is configured correctly.",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[options["to"]],
                fail_silently=False,
            )
        except Exception as exc:
            raise CommandError(f"Send failed: {exc}") from exc
        if sent != 1:
            raise CommandError("The backend accepted no messages.")
        self.stdout.write(self.style.SUCCESS("Sent."))
