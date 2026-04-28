"""
apps.search

Hybrid search layer for TradeHut: Elasticsearch full-text + autocomplete +
CLIP / pgvector visual search.

This app is OPT-IN. It is intentionally not added to INSTALLED_APPS by default
so that the rest of the platform keeps running without Elasticsearch / Redis /
pgvector / CLIP being available.

To enable, see ``apps/search/README.md``.
"""

default_app_config = "apps.search.apps.SearchConfig"
