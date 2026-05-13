"""
Idempotent seeder for the Ads system.

Creates:
  - 6 storefront placements (homepage-top-bar, nav-banner, homepage-modal,
    product-page, checkout-banner, footer-banner)
  - 1 Campaign ("TradeHut House — Demo")
  - 6 Creatives (one per placement, image-less, styled with background + accent colors)
  - 6 AdSlots (one per placement, weighted, dismissible, capped)

Re-running the command is safe: it uses get_or_create on every entity.

Usage:
    python manage.py seed_ads
    python manage.py seed_ads --reset      # delete and recreate the demo campaign
"""

from __future__ import annotations

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.ads.models import (
    AdPlacement,
    AdSlot,
    Campaign,
    Creative,
)

DEMO_CAMPAIGN_NAME = "TradeHut House - Demo"

PLACEMENTS = [
    {
        "slug": "homepage-top-bar",
        "name": "Homepage Top Bar",
        "description": "Sticky promo strip above the navbar. Site-wide.",
        "format": AdPlacement.Format.TOPBAR,
        "aspect_ratio": "",
        "max_active_slots": 1,
        "rotation_seconds": 0,
    },
    {
        "slug": "nav-banner",
        "name": "Homepage Hero Banner",
        "description": "Below the hero search on the homepage.",
        "format": AdPlacement.Format.CAROUSEL,
        "aspect_ratio": "21/4",
        "max_active_slots": 3,
        "rotation_seconds": 6,
    },
    {
        "slug": "homepage-modal",
        "name": "Site-wide Modal",
        "description": "Entry-intent modal popup, frequency-capped per visitor.",
        "format": AdPlacement.Format.MODAL,
        "aspect_ratio": "16/10",
        "max_active_slots": 1,
        "rotation_seconds": 0,
    },
    {
        "slug": "product-page",
        "name": "Product Detail Banner",
        "description": "Above the breadcrumb on PDP.",
        "format": AdPlacement.Format.BANNER,
        "aspect_ratio": "21/3",
        "max_active_slots": 1,
        "rotation_seconds": 0,
    },
    {
        "slug": "checkout-banner",
        "name": "Checkout Banner",
        "description": "Above the checkout stepper. Reassurance / payment partner spots.",
        "format": AdPlacement.Format.BANNER,
        "aspect_ratio": "21/3",
        "max_active_slots": 1,
        "rotation_seconds": 0,
    },
    {
        "slug": "footer-banner",
        "name": "Footer Banner",
        "description": "Above the global footer.",
        "format": AdPlacement.Format.BANNER,
        "aspect_ratio": "21/3",
        "max_active_slots": 1,
        "rotation_seconds": 0,
    },
]

# Each entry produces one Creative + one AdSlot bound to a placement.
# All image-less — they render via background/text/accent colors.
CREATIVES = [
    {
        "placement_slug": "homepage-top-bar",
        "name": "Top bar — Free shipping",
        "eyebrow": "🎉 LIMITED",
        "headline": "Free shipping on orders over GHS 500",
        "subheadline": "Offer ends Sunday midnight",
        "cta_label": "Shop now",
        "cta_url": "/deals",
        "background_color": "linear-gradient(90deg,#4f46e5,#7c3aed,#db2777)",
        "text_color": "#ffffff",
        "accent_color": "#fbbf24",
        "weight": 10,
        "cap_per_session": 0,
        "delay_seconds": 0,
    },
    {
        "placement_slug": "nav-banner",
        "name": "Hero banner — Black Friday teaser",
        "eyebrow": "BLACK FRIDAY · 48 HOURS",
        "headline": "Up to 70% off premium electronics",
        "subheadline": "Phones, laptops, wearables — all categories included",
        "cta_label": "Browse the sale",
        "cta_url": "/deals",
        "background_color": "#0f172a",
        "text_color": "#ffffff",
        "accent_color": "#f97316",
        "weight": 20,
        "cap_per_session": 0,
    },
    {
        "placement_slug": "nav-banner",
        "name": "Hero banner — Daily deals",
        "eyebrow": "DAILY DEALS",
        "headline": "New offers every 24 hours",
        "subheadline": "Check back tomorrow — same time, fresh discounts",
        "cta_label": "See today's deals",
        "cta_url": "/deals",
        "background_color": "#a43d00",
        "text_color": "#ffffff",
        "accent_color": "#fef08a",
        "weight": 10,
        "cap_per_session": 0,
    },
    {
        "placement_slug": "nav-banner",
        "name": "Hero banner — Trade-in",
        "eyebrow": "TRADE-IN BONUS",
        "headline": "Get GHS 250 extra on your old phone",
        "subheadline": "Trade in any device and stack the bonus on top",
        "cta_label": "Get a quote",
        "cta_url": "/sell",
        "background_color": "#006c4b",
        "text_color": "#ffffff",
        "accent_color": "#a7f3d0",
        "weight": 8,
        "cap_per_session": 0,
    },
    {
        "placement_slug": "homepage-modal",
        "name": "Modal — 10% welcome",
        "eyebrow": "WELCOME OFFER",
        "headline": "Take 10% off your first order",
        "subheadline": "We'll email a code right after you sign up. Valid for 7 days.",
        "cta_label": "Claim my code",
        "cta_url": "/auth/register",
        "background_color": "#ffffff",
        "text_color": "#0f172a",
        "accent_color": "#a43d00",
        "weight": 10,
        "delay_seconds": 8,
        "show_close_after_seconds": 2,
        "cap_per_session": 1,
        "cap_per_week": 1,
    },
    {
        "placement_slug": "product-page",
        "name": "PDP banner — Buyer protection",
        "eyebrow": "BUYER PROTECTION",
        "headline": "Every order is covered by 30-day returns",
        "subheadline": "Free pickup if it isn't right.",
        "cta_label": "Read the policy",
        "cta_url": "/buyer-protection",
        "background_color": "#eff6ff",
        "text_color": "#0f172a",
        "accent_color": "#0058ca",
        "weight": 10,
        "cap_per_session": 0,
    },
    {
        "placement_slug": "checkout-banner",
        "name": "Checkout — Pay later",
        "eyebrow": "FLEXIBLE",
        "headline": "Split your purchase into 3 interest-free payments",
        "subheadline": "Available on all orders over GHS 200 at checkout.",
        "cta_label": "Learn how it works",
        "cta_url": "/help",
        "background_color": "#fff7ed",
        "text_color": "#7c2d12",
        "accent_color": "#f97316",
        "weight": 10,
        "cap_per_session": 0,
    },
    {
        "placement_slug": "footer-banner",
        "name": "Footer — Become a seller",
        "eyebrow": "SELL ON TRADEHUT",
        "headline": "List your products in 5 minutes — 0% commission for 90 days",
        "subheadline": "Reach buyers across Ghana and West Africa.",
        "cta_label": "Open a store",
        "cta_url": "/sell",
        "background_color": "#1f2937",
        "text_color": "#ffffff",
        "accent_color": "#fbbf24",
        "weight": 10,
        "cap_per_session": 0,
    },
]


class Command(BaseCommand):
    help = "Seed the Ads system with placements, a demo Campaign, Creatives, and Slots."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete the demo campaign and all its creatives/slots before re-creating.",
        )

    def handle(self, *args, **options):
        if options["reset"]:
            removed, _ = Campaign.objects.filter(name=DEMO_CAMPAIGN_NAME).delete()
            self.stdout.write(self.style.WARNING(f"--reset: removed {removed} demo objects."))

        # 1. Placements
        placements_by_slug = {}
        for spec in PLACEMENTS:
            placement, created = AdPlacement.objects.get_or_create(
                slug=spec["slug"],
                defaults={
                    "name": spec["name"],
                    "description": spec["description"],
                    "format": spec["format"],
                    "aspect_ratio": spec["aspect_ratio"],
                    "max_active_slots": spec["max_active_slots"],
                    "rotation_seconds": spec["rotation_seconds"],
                    "is_active": True,
                },
            )
            placements_by_slug[spec["slug"]] = placement
            tag = "created" if created else "exists"
            self.stdout.write(f"  placement [{tag}] {placement.slug}")

        # 2. Campaign (demo umbrella)
        campaign, created = Campaign.objects.get_or_create(
            name=DEMO_CAMPAIGN_NAME,
            defaults={
                "advertiser": "TradeHut House",
                "status": Campaign.Status.RUNNING,
                "priority": Campaign.Priority.NORMAL,
                "starts_at": timezone.now(),
                "ends_at": None,
                "notes": (
                    "Auto-seeded demo campaign. Created by `python manage.py seed_ads`. "
                    "Safe to delete; rerun the command to recreate."
                ),
            },
        )
        if not created and campaign.status != Campaign.Status.RUNNING:
            campaign.status = Campaign.Status.RUNNING
            campaign.save(update_fields=["status", "updated_at"])
        self.stdout.write(
            self.style.SUCCESS(
                f"  campaign [{'created' if created else 'updated'}] {campaign.name} ({campaign.status})"
            )
        )

        # 3. Creatives + Slots
        for spec in CREATIVES:
            placement = placements_by_slug.get(spec["placement_slug"])
            if not placement:
                self.stdout.write(self.style.WARNING(f"  skip — placement {spec['placement_slug']} missing"))
                continue

            creative, c_created = Creative.objects.get_or_create(
                campaign=campaign,
                name=spec["name"],
                defaults={
                    "format": Creative.Format.TEXT,
                    "eyebrow": spec.get("eyebrow", ""),
                    "headline": spec.get("headline", ""),
                    "subheadline": spec.get("subheadline", ""),
                    "cta_label": spec.get("cta_label", ""),
                    "cta_url": spec.get("cta_url", ""),
                    "background_color": spec.get("background_color", ""),
                    "text_color": spec.get("text_color", ""),
                    "accent_color": spec.get("accent_color", ""),
                    "alt_text": spec.get("headline", ""),
                },
            )
            if not c_created:
                # Refresh copy/styling so re-running picks up edits to this seeder.
                for field in (
                    "eyebrow",
                    "headline",
                    "subheadline",
                    "cta_label",
                    "cta_url",
                    "background_color",
                    "text_color",
                    "accent_color",
                ):
                    setattr(creative, field, spec.get(field, ""))
                creative.alt_text = spec.get("headline", "")
                creative.save()

            slot_defaults = {
                "is_active": True,
                "weight": spec.get("weight", 10),
                "position_hint": 0,
                "dismissible": True,
                "show_close_after_seconds": spec.get("show_close_after_seconds", 0),
                "delay_seconds": spec.get("delay_seconds", 0),
                "cap_per_session": spec.get("cap_per_session", 0),
                "cap_per_day": spec.get("cap_per_day", 0),
                "cap_per_week": spec.get("cap_per_week", 0),
            }
            slot, s_created = AdSlot.objects.get_or_create(
                placement=placement,
                creative=creative,
                defaults=slot_defaults,
            )
            if not s_created:
                for k, v in slot_defaults.items():
                    setattr(slot, k, v)
                slot.save()

            self.stdout.write(
                f"    slot   [{'created' if s_created else 'updated'}] "
                f"{creative.name} -> {placement.slug} (weight {slot.weight})"
            )

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("[ok] Ads seeded. Hit the storefront to see them live."))
        self.stdout.write("  Top bar:        any page (PromoBar)")
        self.stdout.write("  Hero banner:    /")
        self.stdout.write("  Modal:          / (after 8s — capped to 1 per session)")
        self.stdout.write("  PDP banner:     /products/<id>")
        self.stdout.write("  Checkout:       /checkout")
        self.stdout.write("  Footer:         any page (above footer)")
