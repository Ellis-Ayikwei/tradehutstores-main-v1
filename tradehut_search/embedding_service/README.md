# TradeHut embedding service (CLIP)

Standalone **FastAPI** process that runs **OpenAI CLIP** (`openai/clip-vit-base-patch32`) for image and text embeddings. Django (`Stores-BE/apps/search/embedding.py`) calls this over HTTP when `EMBEDDING_SERVICE_URL` is set; otherwise it loads the same model **inside** the web/worker process (heavy — avoid in production on small dynos).

This service is **not** Elasticsearch and **not** pgvector — it only **produces 512-dimensional vectors**. Storage and similarity search live in **Postgres + pgvector** (and optional ES for full-text).

---

## Model contract

| Property | Value |
|----------|--------|
| Hugging Face id | `openai/clip-vit-base-patch32` |
| Output dimension | **512** |
| Normalisation | **L2** (unit vectors) — matches `embedding.py` local path |
| Image max size | **10 MB** per upload (`/embed/image`) |
| Batch | Up to **32** images per `/embed/batch` |

**Invariant:** Whatever deploys this service must use the **same** `MODEL_NAME` as `Stores-BE/apps/search/embedding.py` (`MODEL_NAME` constant). If you swap to another CLIP variant, update **both** places and **rebuild all stored vectors** in `ProductEmbedding` (dimensions / space change).

---

## HTTP API (what Django expects)

Base URL = `EMBEDDING_SERVICE_URL` with **no trailing slash**.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Liveness — returns `status`, `device`, `model` |
| POST | `/embed/image` | Multipart field `file` — JSON `{ "embedding": [...], "dimensions": 512, "model": "..." }` |
| GET | `/embed/text` | Query param `q` — same JSON shape |
| POST | `/embed/batch` | Multiple files — array of `EmbeddingResponse` (batch backfills) |

Django `embedding.py` only uses **`/embed/image`** and **`/embed/text`**. The batch route is for **Celery / management commands** that need throughput.

---

## Run locally

```bash
cd tradehut_search/embedding_service
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8001 --workers 1
```

Point Django at:

```env
EMBEDDING_SERVICE_URL=http://127.0.0.1:8001
SEARCH_ENABLE_EMBEDDINGS=True
```

---

## Docker

```bash
docker build -t tradehut-embedding .
docker run --rm -p 8001:8001 tradehut-embedding
```

The image **pre-downloads** the model at build time (see `Dockerfile`). First cold start is faster; image size grows (~2 GB+ with PyTorch).

---

## Scaling: how to think about it

### 1. What actually burns resources?

- **PyTorch + CLIP** in RAM (one full copy per **process** that loaded the model).
- **CPU** inference is fine for low QPS; **GPU** helps when many concurrent `/embed/*` calls or large batches.
- **Elasticsearch** and **this service** scale independently — do not co-locate both on a **4 GB** box if ES already uses ~1 GB heap.

### 2. Single machine: one worker vs many

The bundled Docker `CMD` uses **two Uvicorn workers** (`--workers 2`). Each worker is a **separate process**, so **each loads its own CLIP model** → ~2× RAM for the same host. For a **small VM**, prefer:

```bash
uvicorn main:app --host 0.0.0.0 --port 8001 --workers 1
```

and scale **horizontally** (more containers/VMs) instead of piling workers on one box.

### 3. Horizontal scaling (recommended for production)

- Run **N identical** containers/VMs behind a **load balancer** (Hetzner LB, nginx, Traefik, Fly, etc.).
- Django and Celery use **one** base URL: `EMBEDDING_SERVICE_URL=https://embed.internal.example.com` → LB fans out.
- Keep the service on a **private network** (Railway ↔ Hetzner VPN, Tailscale, or allowlist Railway egress IPs). Do not expose raw CLIP to the public internet without **auth** or **mTLS**.

### 4. When to add GPU

- Sustained **high QPS** on `/embed/image` (e.g. user uploads + visual search).
- Large **batch** backfills (`/embed/batch`) — GPU reduces wall-clock time.

CPU-only is acceptable for **staging** and **low traffic** if you accept latency.

### 5. Django / Celery side (backpressure)

- `embedding.py` uses **httpx** with a **30 s** timeout — slow or overloaded embedding nodes will stall **web requests** if you call them from **Gunicorn workers**. Prefer:
  - **Offload** heavy work to **Celery** (`build_embeddings`, `generate_product_embedding` tasks) so users hit fast paths.
  - **Rate-limit** concurrent embed jobs per worker.
- For big catalog backfills, call **`/embed/batch`** from a **dedicated worker** or script, not from the request path.

### 6. Caching

- Django already uses **content-hash cache keys** for query vectors where implemented (`clip_embed:*` in search code). **Do not** cache across **different** CLIP model versions without versioning the key.

### 7. Failure modes

| Symptom | Mitigation |
|---------|------------|
| OOM on one host | Reduce Uvicorn `--workers`, or move to a larger instance / GPU with more VRAM |
| Timeouts from Django | Scale replicas; increase timeout only as a last resort; queue work in Celery |
| Model drift | Pin `MODEL_NAME`; document upgrades; re-run `manage.py build_embeddings` after model change |

---

## Where to deploy (relative to your stack)

| Component | Typical placement |
|-----------|-------------------|
| **Elasticsearch** | Dedicated host (e.g. Hetzner CX22) — RAM-heavy |
| **This embedding service** | Separate small VM, second container on a bigger box, or GPU host — **not** the same constrained 4 GB box as ES if both are under load |
| **Postgres + pgvector** | Railway (or managed Postgres) — vectors stored here |
| **Django / Celery** | Railway — set `EMBEDDING_SERVICE_URL` to the internal URL of this service |

---

## Related code

- Django client: `Stores-BE/apps/search/embedding.py`
- Vector storage: `Stores-BE/apps/search/models.py` (`ProductEmbedding`)
- Reference deployment notes: repo root `DEPLOYMENT.md` (Phase 5 — visual search)
