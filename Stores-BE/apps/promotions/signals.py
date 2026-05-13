"""Tiny signal hook — increments referral counter on each redemption."""

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db.models import F

from .models import PromoRedemption, ReferralCode


@receiver(post_save, sender=PromoRedemption)
def bump_referral_counter(sender, instance: PromoRedemption, created: bool, **kwargs):
    """If the redeemed promo is the target of a ReferralCode, bump the referrer's counter."""
    if not created:
        return
    ReferralCode.objects.filter(referral_promo=instance.promo).update(
        total_referrals=F("total_referrals") + 1
    )
