# TradeHut Search — End-to-End Flow

This document is the canonical map of the search subsystem. It covers every
moving part from a keystroke in the navbar to a CLIP embedding landing in
Postgres, including every fallback path that keeps the platform alive when
optional infra is missing.

> If you are looking for **how to enable / install** the search stack, read
> `README.md` in this same folder. This file is about **how the pieces talk**.

---

## 1. System map

```mermaid
flowchart LR
    subgraph FE["Stores-FE (Next.js)"]
        SB[SearchBar.tsx]
        ISM[ImageSearchModal.tsx]
        SC[lib/searchClient.ts]
    end

    subgraph ADM["Stores-Admin (Vite + RR)"]
        AS[Search Ops Page]
        ASS[services/searchService.ts]
    end

    subgraph BE["Stores-BE (Django + DRF)"]
        VW[apps.search.views]
        SR[apps.search.serializers]
        SIG[apps.search.signals]
        TASK[apps.search.tasks]
        EMB[apps.search.embedding]
        DOC[apps.search.documents]
        MOD[(ProductEmbedding)]
    end

    subgraph INFRA["Optional infra"]
        ES[(Elasticsearch)]
        PG[(Postgres + pgvector)]
        REDIS[(Redis<br/>broker + cache)]
        EMBSVC[FastAPI<br/>embedding_service]
        CW[Celery worker]
    end

    SB -- typed wrapper --> SC
    ISM -- typed wrapper --> SC
    SC -- "/tradehut/api/v1/search/*" --> VW
    AS --> ASS --> VW

    VW -. text query .-> ES
    VW -. vector query .-> PG
    VW -- ORM fallback --> PG
    VW --> SR

    SIG -- post_save --> TASK
    TASK -- index --> ES
    TASK -- embed --> EMB
    EMB -- HTTP optional --> EMBSVC
    EMB -- write vector --> MOD
    DOC -. mapping .-> ES

    TASK -- broker --> REDIS
    CW -- consumes --> REDIS
    CW -- runs --> TASK
```

Legend
- Solid arrow `→` : runtime data flow.
- Dashed arrow `⇢` : fast path; falls back if the target is offline.
- Anything inside **Optional infra** can be absent without breaking the API.

---

## 2. The three primary flows

### 2.1 Text search & autocomplete

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant SB as SearchBar.tsx
    participant SC as searchClient.ts
    participant V as views.search / .autocomplete
    participant ES as Elasticsearch
    participant DB as Postgres (ORM)

    U->>SB: types "wireless head"
    SB->>SB: 220 ms debounce
    SB->>SC: autocomplete("wireless head")
    SC->>V: GET /search/autocomplete/?q=...
    alt SEARCH_ENABLE_ES = True
        V->>ES: completion suggester + bool prefix
        ES-->>V: suggestions[] + product hits[]
    else fallback
        V->>DB: Product.filter(name__icontains)
        DB-->>V: rows
    end
    V-->>SC: { suggestions, products }
    SC-->>SB: typed payload
    SB->>U: dropdown (merged w/ local POOL)

    U->>SB: presses Enter
    SB->>SC: saveRecentSearch + router.push
    Note over SB: → /products?search=...
```

Key properties
- The dropdown **never goes empty**: even if `autocomplete()` returns `null`,
  the SearchBar merges local mock suggestions to keep the UX alive.
- Submitting hits `/products?search=…` (existing route) — search delegation
  reuses the catalogue page rather than introducing a new one.

### 2.2 Image / visual search

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant ISM as ImageSearchModal.tsx
    participant SC as searchClient.ts
    participant V as views.image_search
    participant E as embedding.embed_image_bytes
    participant SVC as embedding_service<br/>(FastAPI, optional)
    participant PG as Postgres (pgvector)

    U->>ISM: drops a photo
    ISM->>SC: imageSearch(file)
    SC->>V: POST /search/image/ (multipart)
    alt SEARCH_ENABLE_EMBEDDINGS = True
        V->>E: embed_image_bytes(file)
        alt EMBEDDING_SERVICE_URL set
            E->>SVC: POST /embed (binary)
            SVC-->>E: vector[512]
        else local CLIP
            E-->>E: torch + transformers
        end
        V->>PG: order_by(CosineDistance(image_embedding, vec))
        PG-->>V: top-K product rows
    else degraded
        V-->>SC: 503 + empty results
    end
    V-->>SC: { total, results[] }
    SC-->>ISM: payload (or null)
    ISM->>ISM: sessionStorage[imageSearchResults] = ...
    ISM->>U: navigate /products?mode=image-search&count=…
```

### 2.3 Auto-indexing on product mutation

```mermaid
sequenceDiagram
    autonumber
    participant API as Product CRUD<br/>(apps.products)
    participant S as apps.search.signals
    participant Q as Redis (Celery broker)
    participant W as Celery worker
    participant T as tasks.index_product_task
    participant T2 as tasks.generate_product_embedding
    participant ES as Elasticsearch
    participant E as embedding.embed_image_bytes
    participant PG as Postgres / ProductEmbedding

    API->>S: post_save(Product)
    S->>Q: index_product_task.delay(pk)
    S->>Q: generate_product_embedding.delay(pk)<br/>(only if image changed)
    W->>Q: pull
    par
        W->>T: index_product_task(pk)
        T->>ES: ProductDocument.update(...)
    and
        W->>T2: generate_product_embedding(pk)
        T2->>E: embed bytes (cache via Redis)
        E-->>T2: vector
        T2->>PG: ProductEmbedding.update_or_create(...)
    end
```

Notes
- `pre_save` snapshots the **previous image hash** onto `instance._old_image_hash`
  so `post_save` can decide whether to re-embed.
- `post_delete` enqueues `deindex_product_task(pk)`.
- All three tasks use `safe_shared_task` — if Celery isn't configured, they
  silently no-op rather than raising at import time.

---

## 3. Compatibility matrix

The app boots in any combination below. The behaviour column tells you what
the FE/Admin will observe.

| `SEARCH_ENABLE_ES` | `SEARCH_ENABLE_EMBEDDINGS` | `SEARCH_ENABLE_SIGNALS` | Behaviour                                                                 |
|--------------------|----------------------------|-------------------------|---------------------------------------------------------------------------|
| `False`            | `False`                    | `False`                 | ORM fallback only. Visual search returns 503. **Default for fresh checkouts.** |
| `True`             | `False`                    | `False`                 | ES-powered search & autocomplete. Visual search 503. Manual `rebuild_search_index`. |
| `True`             | `True`                     | `False`                 | Full search + visual. Embeddings only built via `manage.py build_embeddings`. |
| `True`             | `True`                     | `True`                  | Production: real-time signals re-index ES & re-embed on every mutation.   |

```mermaid
flowchart TD
    A[Request hits views.py] --> B{SEARCH_ENABLE_ES?}
    B -- no --> C[ORM .filter icontains]
    B -- yes --> D{ES reachable?}
    D -- no --> C
    D -- yes --> E[Elasticsearch query]
    C --> F[SearchProductSerializer]
    E --> F
    F --> G[(JSON)]
```

```mermaid
flowchart TD
    A[POST /search/image/] --> B{SEARCH_ENABLE_EMBEDDINGS?}
    B -- no --> Z[503 Service Unavailable]
    B -- yes --> C{has_clip or<br/>EMBEDDING_SERVICE_URL?}
    C -- no --> Z
    C -- yes --> D[embed_image_bytes]
    D --> E{pgvector installed?}
    E -- no --> Z
    E -- yes --> F[CosineDistance order_by]
    F --> G[(top-K hits)]
```

---

## 4. Data flow per endpoint

| Verb   | Path                                          | View                  | Fast path          | Fallback        |
|--------|-----------------------------------------------|-----------------------|--------------------|-----------------|
| GET    | `/search/`                                    | `views.search`        | Elasticsearch      | ORM `icontains` |
| GET    | `/search/autocomplete/`                       | `views.autocomplete`  | ES completion + prefix | ORM             |
| POST   | `/search/image/`                              | `views.image_search`  | CLIP + pgvector    | 503             |
| GET    | `/search/visual/`                             | `views.visual_search` | CLIP text → pgvector | 503           |
| GET    | `/search/products/<uuid>/similar/`            | `views.similar_products` | pgvector neighbour | Same-category ORM |
| GET    | `/search/health/`                             | `views.health`        | always live        | n/a             |
| GET    | `/search/admin/stats/`                        | `views.admin_stats`   | admin-only         | n/a             |

---

## 5. Frontend integration touchpoints

```mermaid
flowchart LR
    NB[Navbar] --> SBnav[SearchBar variant=navbar]
    HERO[HeroWithSearch] --> SBhero[SearchBar variant=hero]
    SBnav --> SC
    SBhero --> SC
    SBnav --> ISM
    SBhero --> ISM
    SC -- recents --> LS[(localStorage:<br/>ths_recent_searches)]
    ISM -- handoff --> SS[(sessionStorage:<br/>imageSearchResults)]
    SC --> AX[axiosInstance.tsx]
    AX --> API[(/tradehut/api/v1/search/)]
```

- One client (`searchClient.ts`) is shared by **both** navbar and hero search bars.
- Recents persist in `localStorage` under `ths_recent_searches` (8 entries).
- Image-search results are handed off to `/products` via `sessionStorage` so
  the catalogue page can render them without a second round-trip.

---

## 6. Admin ops flow

```mermaid
flowchart LR
    OP[Operator] --> UI[Search Ops page]
    UI --> SS[searchService.ts]
    SS --> H[GET /search/health/]
    SS --> ST[GET /search/admin/stats/]
    SS --> Q[GET /search/?q=...]
    SS --> IM[POST /search/image/]
    H --> Card[Subsystem cards]
    ST --> Cov[Coverage card]
    Q --> Tbl[Live preview table]
    IM --> Tbl
```

The Admin page is the operator's single pane:

- **Subsystem health cards** — one each for Elasticsearch and visual search,
  showing connection URL and library presence.
- **Coverage card** — `embeddings_total / products_total`.
- **Live text preview** — typed query, real engine label (`elasticsearch` /
  `orm`), and the actual hits table.
- **Live image preview** — file picker → CLIP → pgvector → table.

---

## 7. Failure modes (what the user sees)

| Failure                         | FE behaviour                                | Admin behaviour              |
|---------------------------------|---------------------------------------------|------------------------------|
| Backend unreachable             | Local mock dropdown; "Searching…" clears.   | "Stats unavailable" cards.   |
| ES disabled                     | Autocomplete via ORM; identical UI.         | ES card shows **Disabled**.  |
| pgvector / CLIP missing         | Image modal: "Visual search is unavailable" toast. | Visual card shows **Disabled**, with the exact env flag to flip. |
| Celery off but signals on       | App keeps booting; tasks silently no-op.    | Coverage stays flat — flagged in card. |
| Product image deleted           | Embedding row remains until next `post_save`/`post_delete`. | n/a                          |

---

## 8. Operational lifecycle

```mermaid
stateDiagram-v2
    [*] --> Disabled
    Disabled --> ESEnabled: SEARCH_ENABLE_ES=True<br/>+ rebuild_search_index
    ESEnabled --> EmbedEnabled: SEARCH_ENABLE_EMBEDDINGS=True<br/>+ build_embeddings
    EmbedEnabled --> Realtime: SEARCH_ENABLE_SIGNALS=True<br/>+ celery worker
    Realtime --> EmbedEnabled: stop celery
    EmbedEnabled --> ESEnabled: stop embedding service
    ESEnabled --> Disabled: stop ES
```

Recommended progression for a new environment:

1. Bring up Postgres + Django (no flags) → confirm ORM fallback works.
2. Bring up Elasticsearch → flip `SEARCH_ENABLE_ES`, run `rebuild_search_index`.
3. Bring up Redis + a worker, optionally the embedding service → flip
   `SEARCH_ENABLE_EMBEDDINGS`, run `build_embeddings`.
4. Flip `SEARCH_ENABLE_SIGNALS` last, once you trust the indexing.

Diagnostic command for any state:

```bash
python manage.py search_health
```

---

## 9. File map

```text
Stores-BE/apps/search/
├── __init__.py
├── apps.py                       # SearchConfig — conditional signal hookup
├── compat.py                     # HAS_PGVECTOR / HAS_ELASTICSEARCH / has_clip()
├── documents.py                  # ProductDocument (ES mapping)
├── embedding.py                  # CLIP local + remote service
├── models.py                     # ProductEmbedding sidecar
├── serializers.py                # SearchProductSerializer / SearchHitSerializer
├── signals.py                    # post_save / pre_save / post_delete
├── tasks.py                      # Celery tasks (safe_shared_task)
├── urls.py                       # /search/* routing
├── views.py                      # Endpoints w/ fast path + fallback
├── migrations/0001_initial.py    # pgvector-aware
├── management/commands/
│   ├── build_embeddings.py
│   ├── rebuild_search_index.py
│   └── search_health.py
├── README.md                     # Setup & enabling
└── FLOW.md                       # ← this file

Stores-FE/
├── lib/searchClient.ts           # Typed API client (FE)
└── components/common/
    ├── SearchBar.tsx             # Navbar + hero variants
    └── ImageSearchModal.tsx      # Visual search uploader

Stores-Admin/
├── src/services/searchService.ts # Typed API client (Admin)
└── src/pages/admin/Search/       # Search Ops dashboard
```

---

## 10. Glossary

- **Sidecar model** — `ProductEmbedding` is 1:1 with `Product` but lives in a
  separate table so the core catalogue model is never touched.
- **Fast path / fallback path** — every read endpoint has both. The fast path
  uses ES/pgvector; the fallback uses the Django ORM and is always available.
- **safe_shared_task** — wrapper around Celery's `shared_task` that turns
  missing-broker errors into a no-op log instead of crashing the request.
- **Engine label** — every `/search/` response carries `engine: "elasticsearch"`
  or `engine: "orm"` so clients (and the Admin preview) can show what served
  them.
