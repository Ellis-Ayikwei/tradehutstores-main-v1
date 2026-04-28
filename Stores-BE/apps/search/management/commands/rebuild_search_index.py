"""
manage.py rebuild_search_index

Convenience wrapper around ``django-elasticsearch-dsl``'s ``search_index``
command. Adds:

  * Pre-flight checks for the ES connection.
  * A friendly message when ES is disabled.
  * A ``--products-only`` shortcut.

Usage:

    python manage.py rebuild_search_index
    python manage.py rebuild_search_index --action populate
    python manage.py rebuild_search_index --action delete
"""

from __future__ import annotations

from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand

from apps.search.compat import HAS_ELASTICSEARCH


class Command(BaseCommand):
    help = "Rebuild the Elasticsearch product index."

    def add_arguments(self, parser):
        parser.add_argument(
            "--action",
            choices=["rebuild", "populate", "delete", "create"],
            default="rebuild",
            help="search_index action to delegate to (default: rebuild).",
        )

    def handle(self, *args, **options):
        if not HAS_ELASTICSEARCH:
            self.stdout.write(
                self.style.ERROR(
                    "django-elasticsearch-dsl is not installed. "
                    "Run `pip install -r tradehut_search/requirements.txt` first."
                )
            )
            return

        if not getattr(settings, "SEARCH_ENABLE_ES", False):
            self.stdout.write(
                self.style.WARNING(
                    "SEARCH_ENABLE_ES is false in settings — index commands "
                    "will run but the document is unregistered, so this is a no-op."
                )
            )

        action = options["action"]
        self.stdout.write(f"Running search_index --{action} ...")
        call_command("search_index", f"--{action}", "-f")
        self.stdout.write(self.style.SUCCESS("Done."))
