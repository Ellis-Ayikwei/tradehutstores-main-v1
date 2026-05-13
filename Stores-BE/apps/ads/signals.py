from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import AdPlacement, AdSlot, Campaign, Creative, TargetingRule
from .services import bust_all_caches, bust_placement_cache


@receiver(post_save, sender=AdPlacement)
@receiver(post_delete, sender=AdPlacement)
def on_placement_change(sender, instance, **kwargs):
    bust_placement_cache(instance.slug)


@receiver(post_save, sender=AdSlot)
@receiver(post_delete, sender=AdSlot)
def on_slot_change(sender, instance, **kwargs):
    bust_placement_cache(instance.placement.slug)


@receiver(post_save, sender=Creative)
@receiver(post_delete, sender=Creative)
def on_creative_change(sender, instance, **kwargs):
    for slug in instance.slots.values_list("placement__slug", flat=True).distinct():
        bust_placement_cache(slug)


@receiver(post_save, sender=Campaign)
@receiver(post_delete, sender=Campaign)
def on_campaign_change(sender, instance, **kwargs):
    bust_all_caches()


@receiver(post_save, sender=TargetingRule)
@receiver(post_delete, sender=TargetingRule)
def on_targeting_change(sender, instance, **kwargs):
    bust_placement_cache(instance.slot.placement.slug)
