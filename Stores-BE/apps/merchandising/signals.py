from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import HomepageSection, HomepageSectionItem, PopulationRule
from .services import bust_section_cache


def _bust(section):
    bust_section_cache(section)


@receiver(post_save, sender=HomepageSection)
@receiver(post_delete, sender=HomepageSection)
def on_section_change(sender, instance, **kwargs):
    _bust(instance)


@receiver(post_save, sender=HomepageSectionItem)
@receiver(post_delete, sender=HomepageSectionItem)
def on_item_change(sender, instance, **kwargs):
    _bust(instance.section)


@receiver(post_save, sender=PopulationRule)
def on_rule_change(sender, instance, **kwargs):
    _bust(instance.section)
