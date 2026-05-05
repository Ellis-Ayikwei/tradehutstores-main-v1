# TradeHut — Deployment Guide

Three-host topology, optimised for cost and minimal vendor lock-in.

```text
Cloudflare (free–$5/mo)
  ├── Pages   → Stores-FE (Next.js, edge functions)
  ├── R2      → product imagery (zero egress)
  └── DNS+CDN → automatic
Railway (~$20–35/mo)
  ├── Stores-BE web (Gunicorn)
  ├── Celery worker
  ├── Postgres + pgvector
  └── Redis
Hetzner CX22 (~€4/mo)
  └── Elasticsearch + Kibana (Docker compose)
```

This guide is a sequenced runbook. Do the phases in order — the search
subsystem is opt-in, so the first three phases will give you a working
storefront even before ES is online.

---

## Phase 0 — Domain & DNS

1. Buy / point your apex domain at Cloudflare (NS records).
2. Plan three hostnames up front:
   - `tradehut.com` — Stores-FE on Cloudflare Pages.
   - `api.tradehut.com` → Railway web service.
   - `images.tradehut.com` → R2 public bucket (Custom Domain).

---

## Phase 1 — Cloudflare R2 (image storage)

1. **R2 → Create bucket** `tradehut-media`.
2. **R2 → Manage API Tokens → Create token** with object read/write on the
   bucket. Save the access key and secret.
3. **Custom Domain** on the bucket → `images.tradehut.com`. Add a CNAME in
   Cloudflare DNS (R2 will auto-issue a cert).
4. Note the S3 endpoint URL — `https://<account-id>.r2.cloudflarestorage.com`.

You'll plug these into Railway env vars in Phase 2.

---

## Phase 2 — Railway (Postgres + Redis + Django + Celery)

### 2.1 Provision plugins

In a new Railway project, add:
- **PostgreSQL** plugin → records `DATABASE_URL` automatically.
- **Redis** plugin → records `REDIS_URL` automatically.

Then enable `pgvector` on the Postgres instance:

```sql
-- one-shot, via Railway's psql shell
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2.2 Create the **web** service

- **Source** → connect this repo, set root dir to `Stores-BE/`.
- Railway autodetects `nixpacks.toml` + `Procfile`.
- **Variables** (paste from `Stores-BE/.env.example` and override):

  ```env
  DEBUG=False
  SECRET_KEY=<50-char random>
  ALLOWED_HOSTS=api.tradehut.com
  CSRF_TRUSTED_ORIGINS=https://api.tradehut.com,https://*.pages.dev
  CORS_ALLOWED_ORIGINS=https://tradehut.com,https://admin.tradehut.com
  CORS_ALLOWED_ORIGIN_REGEXES=^https://.*\.pages\.dev$

  USE_R2=True
  R2_ACCESS_KEY_ID=<from Phase 1>
  R2_SECRET_ACCESS_KEY=<from Phase 1>
  R2_BUCKET_NAME=tradehut-media
  R2_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com
  R2_PUBLIC_DOMAIN=images.tradehut.com

  SEARCH_ENABLE_ES=False           # flip True after Phase 4
  SEARCH_ENABLE_EMBEDDINGS=False
  SEARCH_ENABLE_SIGNALS=False
  ```

- **Deploy**. The release phase runs `migrate` + `collectstatic`.
- Bind a custom domain `api.tradehut.com` in the service settings.

### 2.3 Create the **worker** service (same repo)

Duplicate the web service, then override:
- **Start Command** → `celery -A backend worker -l INFO --concurrency=2 --queues=default,embeddings`
- **Disable Healthcheck**.
- **Inherit** all environment variables from web (Railway → Shared Variables).

### 2.4 Verify

```bash
curl https://api.tradehut.com/tradehut/api/v1/search/health/
# -> {"elasticsearch":{"enabled":false,...},"embeddings":{"enabled":false,...}}
```

ORM-fallback search now works. R2 is wired (uploaded images land there).

---

## Phase 3 — Cloudflare Pages (Stores-FE)

### 3.1 First deploy

```bash
cd Stores-FE
npm install                # picks up @cloudflare/next-on-pages + wrangler
npm run pages:build        # outputs to .vercel/output/static
npx wrangler pages deploy .vercel/output/static --project-name=tradehut-stores-fe
```

(Or connect the repo via the Cloudflare dashboard with build command
`npm run pages:build` and output directory `.vercel/output/static`.)

### 3.2 Pages → Settings → Environment Variables

| Variable | Production | Preview |
|----------|------------|---------|
| `NEXT_PUBLIC_API_URL` | `https://api.tradehut.com/tradehut/api/v1/` | `https://api-staging.tradehut.com/tradehut/api/v1/` |
| `NEXT_PUBLIC_IMAGE_HOST` | `https://images.tradehut.com` | same |
| `NODE_VERSION` | `20` | `20` |

### 3.3 Custom domain

Pages → Custom Domains → add `tradehut.com`. Cloudflare auto-issues TLS.

### 3.4 Verify

Open the production URL → SearchBar autocomplete should hit
`api.tradehut.com/.../search/autocomplete/` with no CORS errors.
ORM fallback returns real product hits.

---

## Phase 4 — Hetzner CX22 (Elasticsearch)

### 4.1 Provision

- Hetzner Cloud → CX22 (4 GB / 2 vCPU, ~€4/mo) in the region closest to
  your Railway region.
- OS: Ubuntu 24.04.
- Firewall: allow 22 (your IP), 9200 (Railway egress IPs only).

### 4.2 Bootstrap

```bash
ssh root@<hetzner-ip>
apt update && apt install -y docker.io docker-compose-plugin
mkdir -p /opt/tradehut-search && cd /opt/tradehut-search

# Copy these two files from infra/elasticsearch/ in this repo:
#   docker-compose.yml
#   .env  (created from .env.example, with a real ELASTIC_PASSWORD)

docker compose up -d
docker compose logs -f elasticsearch
```

Smoke test:

```bash
curl -u elastic:$ELASTIC_PASSWORD http://<hetzner-ip>:9200/
```

### 4.3 Wire Railway → Hetzner

Update the **web** AND **worker** services on Railway:

```env
SEARCH_ENABLE_ES=True
ELASTICSEARCH_URL=http://elastic:<password>@<hetzner-ip>:9200
SEARCH_ENABLE_SIGNALS=True
```

Redeploy. Then run the index build once:

```bash
# Railway → web service → "Run Command"
python manage.py rebuild_search_index --action populate
python manage.py search_health
```

Open the Admin → **Search Ops** page — Elasticsearch card should turn green
and the live preview should report `engine: elasticsearch`.

---

## Phase 5 — Visual search (optional)

Two routes; pick one:

### 5.A Local CLIP inside the worker

- Uncomment `transformers` + `torch` in `Stores-BE/requirements.txt`.
- Bump the worker service to a Pro plan (≥4 GB RAM) on Railway.
- Set `SEARCH_ENABLE_EMBEDDINGS=True`.
- Run `python manage.py build_embeddings` once.

### 5.B External embedding service

Deploy `tradehut_search/embedding_service/` (FastAPI) on Modal / Hetzner /
Fly. Then on Railway:

```env
SEARCH_ENABLE_EMBEDDINGS=True
EMBEDDING_SERVICE_URL=https://embed.tradehut.com
```

The Django side stays light — it just POSTs bytes and stores the vector.

---

## Phase 6 — Stores-Admin

Stores-Admin is a Vite SPA. Two cheap host options:
- **Cloudflare Pages** (preferred — same provider, free): build with
  `npm run build`, deploy `Stores-Admin/dist`. Set `VITE_API_URL` and
  custom domain `admin.tradehut.com`.
- **Railway static site** if you want an internal-only deploy.

---

## File map (added by this kit)

```text
Stores-BE/
├── .env.example          ← all backend env vars
├── Procfile              ← release / web / worker
├── nixpacks.toml         ← Railway build plan
├── railway.toml          ← service defaults + healthcheck
├── backend/celery.py     ← worker entrypoint
├── backend/__init__.py   ← lazy celery import
└── requirements.txt      ← + dj-database-url, whitenoise, django-storages, celery, redis, pgvector …

Stores-FE/
├── .env.example          ← FE env vars
├── wrangler.toml         ← Cloudflare Pages config
├── next.config.js        ← Pages-friendly knobs
└── package.json          ← + pages:build / pages:deploy scripts

infra/elasticsearch/
├── docker-compose.yml    ← Hetzner CX22 ES + Kibana
└── .env.example          ← ELASTIC_PASSWORD

DEPLOYMENT.md             ← this file
Stores-BE/apps/search/FLOW.md   ← search subsystem deep-dive
Stores-BE/apps/search/README.md ← search setup
```

---

## Smoke-test checklist

After each phase:

- ✅ `GET /tradehut/api/v1/search/health/` returns 200.
- ✅ Frontend `SearchBar` autocomplete hits the API with no CORS errors.
- ✅ Admin → Search Ops shows expected Enabled/Disabled cards.
- ✅ Uploading a product image lands in R2 and the public URL renders on
  the catalogue page.
- ✅ Once ES is on: `python manage.py search_health` reports
  `Elasticsearch: connected`.
