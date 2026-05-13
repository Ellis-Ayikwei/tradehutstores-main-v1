from django.apps import AppConfig


class AdsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.ads"
    label = "ads"
    verbose_name = "Ad System"

    def ready(self):
        from . import signals  # noqa: F401
