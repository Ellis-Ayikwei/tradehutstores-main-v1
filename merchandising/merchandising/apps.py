from django.apps import AppConfig

class MerchandisingConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name               = "merchandising"
    verbose_name       = "Homepage Merchandising"

    def ready(self):
        import merchandising.signals  # noqa
