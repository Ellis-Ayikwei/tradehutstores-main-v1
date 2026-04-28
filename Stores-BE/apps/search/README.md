# `apps.search` — TradeHut hybrid search

Full-text product search (Elasticsearch + autocomplete) and visual search
(CLIP embeddings stored with pgvector). Designed to drop in alongside the
existing `apps.products` app without changing any of its models.

The app **always boots** — even when ES, pgvector, Celery and CLIP are not
installed. Endpoints fall back to plain ORM `icontains` so your frontend keeps
working in dev. Real search engines are switched on per-environment with
`SEARCH_ENABLE_*` flags.

> Looking for the original drop-in package? It still lives at
> `tradehut_search/` in the repo root. This app is the integrated form,
> wired into `Stores-BE`.

---

## Architecture

```
   ┌──────────────────┐
   │  Frontend (Next)│
   │  SearchBar.tsx   │
   └────────┬─────────┘
            │ /tradehut/api/v1/search/...
            ▼
   ┌──────────────────────────────────────────────────────────┐
   │             apps.search.views (DRF)                      │
   │                                                          │
   │   ┌──── ES path ────┐        ┌──── ORM fallback ────┐    │
   │   │ Elasticsearch   │        │ Product.objects      │    │
   │   │  ProductDocument│        │  .filter(icontains)  │    │
   │   └─────────────────┘        └──────────────────────┘    │
   │                                                          │
   │   ┌──── Visual path (pgvector) ────┐                     │
   │   │ ProductEmbedding.image_embedding│                    │
   │   └─────────────────────────────────┘                    │
   └──────────────────────────────────────────────────────────┘
```

* `Product` is **untouched**. The vector lives on a sidecar
  `ProductEmbedding` table joined 1:1 — that lets us drop search infra
  without touching the products app.
* Each endpoint has both a fast path (ES / pgvector) and a fallback (ORM)
  so the FE never sees a 5xx from a missing search backend.
* All optional imports (`pgvector`, `django_elasticsearch_dsl`, `celery`,
  `torch`, `transformers`) are guarded in `apps.search.compat`.

---

## Endpoints

All mounted under `/tradehut/api/v1/search/`.

| Method | URL                                  | Description                                   |
| ------ | ------------------------------------ | --------------------------------------------- |
| GET    | `/`                                  | Full-text search with filters + facets        |
| GET    | `/autocomplete/?q=...`               | Dropdown autocomplete (suggestions + hits)    |
| POST   | `/image/`                            | Upload image → visually similar products      |
| GET    | `/visual/?q=...`                     | Text → visually similar products              |
| GET    | `/products/<uuid>/similar/`          | "You may also like" widget for the PDP        |
| GET    | `/health/`                           | Subsystem availability probe                  |
| GET    | `/admin/stats/` (admin only)         | Embedding coverage + engine flags             |

### Common query params (`/`)

| Param          | Type    | Example                |
| -------------- | ------- | ---------------------- |
| `q`            | string  | `wireless headphones`  |
| `category`     | string  | `Electronics`          |
| `sub_category` | string  | `Smartphones`          |
| `brand`        | string  | `Sony`                 |
| `condition`    | string  | `New`                  |
| `min_price`    | float   | `100`                  |
| `max_price`    | float   | `500`                  |
| `in_stock`     | boolean | `true`                 |
| `page`         | int     | `1`                    |

### Response schema

```jsonc
{
  "total": 142,
  "page": 1,
  "page_size": 24,
  "results": [/* ProductCatalogSerializer-shaped items */],
  "facets": {
    "categories": [{ "label": "Electronics", "count": 12 }],
    "brands":     [{ "label": "Sony",        "count": 7  }]
  },
  "engine": "elasticsearch" | "orm"
}
```

The `engine` field tells the FE / Admin dashboard which path served the
request, which is handy for ops dashboards and tests.

---

## Configuration

Add to `.env` (all optional):

```bash
# Toggle real search engines per-environment. All default to false.
SEARCH_ENABLE_ES=true
SEARCH_ENABLE_EMBEDDINGS=true
SEARCH_ENABLE_SIGNALS=true       # auto-sync ES + embeddings on Product save

# Connection strings
ELASTICSEARCH_URL=http://localhost:9200
REDIS_URL=redis://localhost:6379/0
EMBEDDING_SERVICE_URL=           # leave empty to run CLIP in-process

# Index name (multiple deployments can share an ES cluster safely)
SEARCH_ES_INDEX=tradehut_products
```

---

## Local development setup

> **You don't need any of this** to run the FE; ORM fallback covers it.

1. Start infrastructure:
   ```bash
   cd tradehut_search
   docker-compose up -d            # ES + Redis
   ```
2. Install search dependencies:
   ```bash
   pip install -r tradehut_search/requirements.txt
   ```
3. Enable the pgvector extension in Postgres:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
4. Run migrations (creates `product_embeddings`):
   ```bash
   python manage.py migrate search
   ```
5. Set the env flags:
   ```bash
   export SEARCH_ENABLE_ES=true
   export SEARCH_ENABLE_EMBEDDINGS=true
   export SEARCH_ENABLE_SIGNALS=true
   ```
6. Build the ES index:
   ```bash
   python manage.py rebuild_search_index --action rebuild
   ```
7. Backfill embeddings (one-shot, then signals keep them fresh):
   ```bash
   python manage.py build_embeddings
   ```
8. Optional — create the pgvector ANN index for catalogues > 100k:
   ```sql
   CREATE INDEX IF NOT EXISTS product_embedding_idx
     ON product_embeddings
     USING ivfflat (image_embedding vector_cosine_ops)
     WITH (lists = 100);
   ```
9. Start Celery if you want async signal sync:
   ```bash
   celery -A backend worker -l info -Q embeddings,default
   ```

---

## Management commands

| Command                       | Purpose                                              |
| ----------------------------- | ---------------------------------------------------- |
| `manage.py search_health`     | One-page diagnostic (libraries, settings, coverage)  |
| `manage.py rebuild_search_index` | Wraps `search_index --rebuild`                    |
| `manage.py build_embeddings`  | Backfill / refresh CLIP image embeddings             |

`build_embeddings` flags:

```
--batch-size N       # default 32
--overwrite          # re-embed rows that already have a vector
--product-ids "uuid1,uuid2"
--limit N
```

---

## Operational notes

* **Search never blocks a product save.** Signals call `.delay()` on Celery
  tasks; the safe-shared-task shim makes this a no-op when Celery isn't
  configured (great for dev / unit tests).
* **Embedding cache.** Identical images skip CLIP via a 24-hour Redis cache
  keyed by `sha256(image_bytes)`. The FE’s reverse-image search hits the
  same cache transparently.
* **No model lock-in.** Bumping CLIP variants (e.g. to `clip-vit-large-patch14`)
  only requires updating `EMBEDDING_DIM` in `apps.search.models` and
  re-running `build_embeddings --overwrite`. Old vectors stay readable since
  pgvector accepts any dimension at the column level (you'd recreate the
  column for a different dim).
* **Multi-engine debugging.** The `engine` field on every response makes it
  easy to confirm whether ES served the request. The Admin dashboard
  surfaces this so ops can tell the FE is hitting the fast path.

---

## Production split (>500k products)

For larger catalogues run CLIP in a dedicated FastAPI service so Django
workers stay light:

```bash
cd tradehut_search/embedding_service
docker build -t tradehut-embedding-service .
docker run -p 8001:8001 tradehut-embedding-service
```

Then point Django at it:

```bash
EMBEDDING_SERVICE_URL=http://embedding-service:8001
```

`apps.search.embedding` automatically routes through HTTP when this env var
is set.

---

## Tests

End-to-end smoke test using the ORM fallback (no ES / pgvector required):

```bash
python manage.py test apps.search
```

The app intentionally avoids hard dependencies in test code so CI can run
without infrastructure.
