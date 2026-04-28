# TradeHut Search System

Full-text search (Elasticsearch) + visual/image search (CLIP + pgvector)
for the TradeHut Django backend.

---

## What's in this package

```
tradehut_search/
├── README.md
│
├── products/                        # Drop into your existing products app
│   ├── documents.py                 # Elasticsearch document definition
│   ├── embedding.py                 # CLIP embedding helpers
│   ├── signals.py                   # Auto-sync ES + auto-embed on product save
│   ├── tasks.py                     # Celery tasks (async embedding generation)
│   ├── search_views.py              # All search API views
│   ├── search_urls.py               # URL patterns to include
│   ├── serializers.py               # ProductSearchSerializer
│   ├── migrations/
│   │   └── 0002_product_image_embedding.py
│   └── management/commands/
│       └── build_embeddings.py      # Backfill embeddings for existing products
│
├── embedding_service/               # Standalone FastAPI inference service
│   ├── main.py                      # FastAPI app — run separately from Django
│   ├── requirements.txt
│   └── Dockerfile
│
└── docker-compose.yml               # Elasticsearch + Kibana + Qdrant + Redis
```

---

## Models to download

### CLIP (image + text embedding)

Used by both `products/embedding.py` and `embedding_service/main.py`.
Downloaded automatically on first run via HuggingFace Hub — no manual step needed.

```python
# This line triggers the download (~600MB, cached to ~/.cache/huggingface/)
CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
```

To pre-download before deployment (recommended for production):

```bash
pip install transformers torch
python - <<'EOF'
from transformers import CLIPModel, CLIPProcessor
print("Downloading CLIP ViT-B/32...")
CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
print("Done. Cached to ~/.cache/huggingface/")
EOF
```

**Model sizes:**
| Model | Size | Speed (CPU) | Speed (GPU) | Use case |
|---|---|---|---|---|
| `openai/clip-vit-base-patch32` | ~600MB | 200–800ms | 20–50ms | Default — good balance |
| `openai/clip-vit-large-patch14` | ~1.7GB | 800ms–2s | 50–100ms | Better accuracy, slower |
| `sentence-transformers/clip-ViT-B-32` | ~600MB | same | same | Same model, different wrapper |

Start with `clip-vit-base-patch32`. Upgrade to `clip-vit-large-patch14` only
if search quality is visibly poor on your catalogue.

To specify a custom cache directory (useful for Docker):

```bash
export HF_HOME=/app/models
export TRANSFORMERS_CACHE=/app/models
```

---

## Requirements

### Python packages

```bash
# Core search
pip install elasticsearch-dsl django-elasticsearch-dsl

# Image search
pip install pgvector torch torchvision transformers pillow requests

# Async tasks
pip install celery redis

# Embedding service (separate FastAPI app)
pip install fastapi uvicorn httpx python-multipart
```

Or install everything at once:

```bash
pip install -r requirements.txt
```

### System services

| Service | Version | Purpose |
|---|---|---|
| Elasticsearch | 8.x | Full-text search |
| Kibana | 8.x (optional) | Query debugging + monitoring |
| PostgreSQL | 14+ with pgvector | Vector similarity search |
| Redis | 6+ | Celery broker + embedding cache |
| Celery | 5+ | Async embedding generation |

---

## Quick start

### 1. Start infrastructure

```bash
docker-compose up -d
```

This starts Elasticsearch (9200), Kibana (5601), Redis (6379).
pgvector requires adding the extension to your existing Postgres instance.

### 2. Enable pgvector in Postgres

```sql
-- Connect to your database and run:
CREATE EXTENSION IF NOT EXISTS vector;
```

### 3. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 4. Update Django settings

```python
# settings.py

INSTALLED_APPS += [
    "django_elasticsearch_dsl",
    "pgvector.django",
]

ELASTICSEARCH_DSL = {
    "default": {
        "hosts": env("ELASTICSEARCH_URL", default="http://localhost:9200"),
    }
}

# Celery
CELERY_BROKER_URL    = env("REDIS_URL", default="redis://localhost:6379/0")
CELERY_RESULT_BACKEND = env("REDIS_URL", default="redis://localhost:6379/0")

# Embedding service URL (FastAPI app)
EMBEDDING_SERVICE_URL = env("EMBEDDING_SERVICE_URL", default="http://localhost:8001")
```

### 5. Run migrations

```bash
python manage.py migrate
```

This adds the `image_embedding` vector column to your products table.

### 6. Build the Elasticsearch index

```bash
python manage.py search_index --rebuild
```

### 7. Backfill image embeddings

```bash
# Embeds all products that have an image but no embedding yet
python manage.py build_embeddings

# Force re-embed everything
python manage.py build_embeddings --overwrite

# Adjust batch size based on your RAM
python manage.py build_embeddings --batch-size 64
```

### 8. Create the pgvector index (after backfill completes)

```sql
-- Run after build_embeddings finishes
-- IVFFlat for < 2M products
CREATE INDEX product_embedding_idx
  ON products_product
  USING ivfflat (image_embedding vector_cosine_ops)
  WITH (lists = 100);

-- HNSW for 2M–20M products (better recall, more RAM)
-- CREATE INDEX product_embedding_hnsw_idx
--   ON products_product
--   USING hnsw (image_embedding vector_cosine_ops)
--   WITH (m = 16, ef_construction = 64);
```

### 9. Add URLs to your root urls.py

```python
# urls.py
from django.urls import path, include

urlpatterns = [
    ...
    path("api/", include("products.search_urls")),
]
```

### 10. Start the embedding service (production)

```bash
cd embedding_service
uvicorn main:app --host 0.0.0.0 --port 8001 --workers 2
```

### 11. Start Celery

```bash
celery -A your_project worker -l info -Q embeddings,default
```

---

## API Endpoints

| Method | URL | Description |
|---|---|---|
| `GET` | `/api/search/?q=blender` | Full-text product search |
| `GET` | `/api/search/autocomplete/?q=wire` | Dropdown autocomplete (suggestions + products) |
| `POST` | `/api/search/image/` | Upload image → find visually similar products |
| `GET` | `/api/search/visual/?q=red+leather+sofa` | Text → visual search (CLIP multimodal) |
| `GET` | `/api/products/<id>/similar/` | Visually similar products (PDP widget) |

### Search query params

| Param | Type | Example |
|---|---|---|
| `q` | string | `wireless headphones` |
| `category` | string | `Electronics` |
| `brand` | string | `Sony` |
| `min_price` | float | `100` |
| `max_price` | float | `500` |
| `in_stock` | bool | `true` |
| `page` | int | `2` |

### Image search request

```bash
curl -X POST http://localhost:8000/api/search/image/ \
  -F "image=@/path/to/photo.jpg"
```

---

## Scaling notes

```
< 100k products:    pgvector IVFFlat  +  CLIP in Celery worker
~ 500k products:    Separate FastAPI embedding service  +  HNSW index
~ 5M products:      Migrate vectors to Qdrant
~ 50M products:     Custom fine-tuned CLIP  +  dedicated ML platform
```

See README section "Scaling" for migration guides.

---

## Environment variables

```bash
ELASTICSEARCH_URL=http://localhost:9200
REDIS_URL=redis://localhost:6379/0
EMBEDDING_SERVICE_URL=http://localhost:8001   # only needed in production split
DATABASE_URL=postgresql://user:pass@localhost/tradehut
HF_HOME=/app/models                            # HuggingFace model cache dir
```
