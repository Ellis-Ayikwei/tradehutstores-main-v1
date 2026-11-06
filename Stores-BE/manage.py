#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""

import os
import sys
from urllib.parse import urlparse

# Commands that never write to the database, so they may run against any DATABASE_URL.
_SAFE_COMMANDS = {
    "check",
    "help",
    "version",
    "--version",
    "makemigrations",
    "showmigrations",
    "collectstatic",
    "startapp",
    "startproject",
    "sqlmigrate",
    "diffsettings",
}
_LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1", ""}


def _database_host():
    url = os.environ.get("DATABASE_URL")
    if url is None:
        try:
            from decouple import config

            url = config("DATABASE_URL", default="")
        except Exception:
            url = ""
    return (urlparse(url).hostname or "") if url else ""


def _guard_remote_database(argv):
    """Refuse to run write-capable commands against a non-local database.

    A remote DATABASE_URL (e.g. the Railway database in .env) is treated as live data.
    Point DATABASE_URL at a local database for development and tests, or set
    ALLOW_REMOTE_DB=1 to deliberately run a command against the remote one.
    """
    command = argv[1] if len(argv) > 1 else "help"
    if command in _SAFE_COMMANDS or os.environ.get("ALLOW_REMOTE_DB") == "1":
        return
    host = _database_host()
    if host and host not in _LOCAL_HOSTS:
        sys.stderr.write(
            f"Refusing to run '{command}': DATABASE_URL points to a remote database ({host}).\n"
            "Use a local database, e.g.:  DATABASE_URL=postgresql://user:pass@localhost:5432/tradehut_dev\n"
            "or set ALLOW_REMOTE_DB=1 if you really intend to run this against the remote database.\n"
        )
        sys.exit(2)


def main():
    """Run administrative tasks."""
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
    # _guard_remote_database(sys.argv)
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
