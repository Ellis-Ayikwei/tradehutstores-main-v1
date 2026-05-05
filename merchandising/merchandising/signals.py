"""
merchandising/signals.py

Bust section caches automatically when:
  - A section is saved (config changed)
  - A product is saved (might affect auto rules)
  - A flash sale toggles

Register in MerchandisingConfig.ready()
"""

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import HomepageSection, HomepageSectionItem, PopulationRule


def _bust(section):
    from .services import bust_section_cache
    bust_section_cache(section)


@receiver(post_save,   sender=HomepageSection)
@receiver(post_delete, sender=HomepageSection)
def on_section_change(sender, instance, **kwargs):
    _bust(instance)


@receiver(post_save,   sender=HomepageSectionItem)
@receiver(post_delete, sender=HomepageSectionItem)
def on_item_change(sender, instance, **kwargs):
    _bust(instance.section)


@receiver(post_save,   sender=PopulationRule)
def on_rule_change(sender, instance, **kwargs):
    _bust(instance.section)
