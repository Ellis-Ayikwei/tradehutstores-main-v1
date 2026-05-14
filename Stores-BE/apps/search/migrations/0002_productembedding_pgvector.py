# Generated manually — Django cannot emit CREATE EXTENSION + jsonb→vector cast.

"""
PostgreSQL: enable ``pgvector`` and convert ``image_embedding`` to ``vector(512)``.

**Install the extension on Windows (PostgreSQL 17 example)**

1. Prebuilt DLLs (adjust for your exact PG minor version), e.g. releases tagged
   for pg17 on GitHub ``andreiramani/pgvector_pgsql_windows`` or build from
   ``https://github.com/pgvector/pgvector`` with VS *x64 Native Tools*:
   ``nmake /F Makefile.win`` then ``nmake /F Makefile.win install`` with
   ``PGROOT`` pointing at ``C:\\Program Files\\PostgreSQL\\17``.

2. Restart PostgreSQL, then in your DB::

    CREATE EXTENSION vector;

3. Run ``python manage.py migrate``.

Non-PostgreSQL connections skip the ALTER. If the ``pgvector`` Python
package cannot be imported, this migration is a no-op (column stays JSON in
DB and in migration state) until the environment can import
``pgvector.django.VectorField``.
"""

from django.db import migrations
from django.db.utils import NotSupportedError, ProgrammingError

try:
    from pgvector.django import VectorField  # type: ignore[import-untyped]
except (ImportError, ModuleNotFoundError):
    VectorField = None  # type: ignore[misc,assignment]


def _upgrade(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    with schema_editor.connection.cursor() as cursor:
        try:
            cursor.execute("CREATE EXTENSION IF NOT EXISTS vector")
        except (NotSupportedError, ProgrammingError) as exc:
            raise RuntimeError(
                "PostgreSQL does not have the pgvector extension installed on disk.\n"
                "  • Windows: copy extension files into your PG install, or build "
                "pgvector with VS (x64 Native Tools): "
                "https://github.com/pgvector/pgvector#windows\n"
                "  • Prebuilt PG17 example: "
                "https://github.com/andreiramani/pgvector_pgsql_windows/releases\n"
                "Then restart PostgreSQL and run: migrate again.\n"
                f"Original error: {exc}"
            ) from exc
        cursor.execute(
            """
            ALTER TABLE product_embeddings
            ALTER COLUMN image_embedding TYPE vector(512)
            USING (
                CASE
                    WHEN image_embedding IS NULL THEN NULL
                    WHEN jsonb_typeof(image_embedding) IS DISTINCT FROM 'array'
                        THEN NULL
                    WHEN COALESCE(jsonb_array_length(image_embedding), 0) = 0
                        THEN NULL
                    ELSE (image_embedding::text)::vector(512)
                END
            );
            """
        )


def _downgrade(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    with schema_editor.connection.cursor() as cursor:
        cursor.execute(
            """
            ALTER TABLE product_embeddings
            ALTER COLUMN image_embedding TYPE jsonb
            USING (
                CASE
                    WHEN image_embedding IS NULL THEN NULL
                    ELSE (image_embedding::text)::jsonb
                END
            );
            """
        )


def _operations():
    """
    Only alter DB + migration state when ``pgvector`` is importable.

    If the Python package is missing, keep JSONField (0001) in state and skip
    raw SQL — otherwise we'd convert the column to ``vector`` while Django
    still thinks the field is JSON (``HAS_PGVECTOR`` false in ``compat.py``).
    """
    if VectorField is None:
        return []
    return [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(_upgrade, _downgrade),
            ],
            state_operations=[
                migrations.AlterField(
                    model_name="productembedding",
                    name="image_embedding",
                    field=VectorField(dimensions=512, null=True, blank=True),
                ),
            ],
        ),
    ]


class Migration(migrations.Migration):

    dependencies = [
        ("search", "0001_initial"),
    ]

    operations = _operations()
