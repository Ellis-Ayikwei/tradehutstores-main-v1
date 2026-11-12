"""Shared pieces for outgoing email: the context every template needs and a sender for simple messages."""

from datetime import datetime

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

# Official business contact details (AGENTS.md section 1b). Only these appear in email signatures.
SUPPORT_PHONE_DISPLAY = "024 813 8722"
SUPPORT_PHONE_LINK = "tel:+233248138722"
SUPPORT_WHATSAPP_LINK = "https://wa.me/233248138722"
BUSINESS_LOCATION = "La Trade Fair, Accra, Ghana"


def base_email_context() -> dict:
    """Context consumed by `emails/base.html` and `emails/base.txt` (logo, signature, no-reply notice)."""
    return {
        "app_name": "TradeHut",
        "current_year": datetime.now().year,
        # The storefront header wordmark, referenced by URL (never fetched while sending).
        "logo_url": getattr(
            settings,
            "EMAIL_LOGO_URL",
            f"{settings.FRONTEND_URL.rstrip('/')}/assets/images/logos/ths-light.png",
        ),
        "support_phone": SUPPORT_PHONE_DISPLAY,
        "support_phone_link": SUPPORT_PHONE_LINK,
        "support_whatsapp_link": SUPPORT_WHATSAPP_LINK,
        "business_location": BUSINESS_LOCATION,
    }


def send_branded_email(
    to_email: str,
    subject: str,
    *,
    paragraphs: list[str],
    title: str = "",
    user_name: str = "",
    code: str = "",
    action_label: str = "",
    action_url: str = "",
    fail_silently: bool = False,
) -> int:
    """
    Send a simple message wrapped in the standard TradeHut layout (`emails/message.*`):
    optional greeting, heading, paragraphs, a highlighted one-time `code` and a call-to-action button.
    Returns the number of messages sent (0 or 1). Raises on failure unless `fail_silently`.
    """
    context = {
        **base_email_context(),
        "subject": subject,
        "title": title,
        "user_name": user_name,
        "paragraphs": paragraphs,
        "code": code,
        "action_label": action_label,
        "action_url": action_url,
    }
    message = EmailMultiAlternatives(
        subject=subject,
        body=render_to_string("emails/message.txt", context),
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[to_email],
    )
    message.attach_alternative(render_to_string("emails/message.html", context), "text/html")
    return message.send(fail_silently=fail_silently)
