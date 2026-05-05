from django.apps import AppConfig


class MerchandisingConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.merchandising"
    verbose_name = "Homepage Merchandising"

    def ready(self):
        import apps.merchandising.signals  # noqa: F401
