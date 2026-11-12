# TradeHut Stores 2.0

Project facts first, then the working agreement. Read [/AGENTS.md](../AGENTS.md)
for scope, model routing (Opus plans and reviews, Sonnet builds), per-app design
rules, phases and the reviewer checklist.

**Precedence.** AGENTS.md wins on facts, scope, routing, design and phases. This
file wins on safety: git (§4), database and migrations (§5), money (§6), secrets
and personal data (§7). Where AGENTS.md says "commit per slice" or "generate the
migration", the sections below apply: propose the commit message, list the
expected migration operations, and let the user run them.

The Kinetic/Stitch redesign has been **cancelled and removed**. Do not reintroduce it.

## Apps

| Path | Stack | Role |
| --- | --- | --- |
| `Stores-FE/` | Next.js 15 App Router, React 18, Tailwind v3, Redux Toolkit, SWR, axios | Buyer marketplace on Cloudflare Pages (an `app/seller-central` remnant is still present) |
| `Stores-Seller/` | Next.js 15 App Router, React 18, Tailwind v3; split out of Stores-FE; dev port 3001 | Seller Central dashboard on Cloudflare Pages |
| `Stores-Admin/` | Vite + React 18 + TS, Tailwind v3, shadcn/ui (being adopted) | Staff-only admin on Cloudflare Pages |
| `Stores-BE/` | Django + DRF, Celery worker + beat, Postgres with pgvector, Redis | API on Railway behind Cloudflare |

`tradehut_ads/`, `tradehut_promos/`, `tradehut_currency/`, `tradehut_search/`,
`merchandising/` and `infra/` are design notes and draft bundles. The shipped code
lives in the four apps above. Read a bundle's README before touching it.

## Commands (bash, from the repo root)

| App | Typecheck | Lint | Build | Tests |
| --- | --- | --- | --- | --- |
| Stores-FE | `cd Stores-FE && npx tsc --noEmit` | `npm run lint` | `npm run build` | none yet |
| Stores-Seller | `cd Stores-Seller && npx tsc --noEmit` | `npm run lint` | `npm run build` | none yet |
| Stores-Admin | `cd Stores-Admin && npx tsc --noEmit` (baseline 858 errors; gate is no new errors in touched files) | none configured | `npm run build` | none yet |
| Stores-BE | `cd Stores-BE && .venv/Scripts/python.exe manage.py check` | none configured | n/a | below |

Backend tests and migration previews run only against a local throwaway database:

```bash
cd Stores-BE
export DATABASE_URL='sqlite:///:memory:' CELERY_TASK_ALWAYS_EAGER=true
.venv/Scripts/python.exe manage.py test <app>
.venv/Scripts/python.exe manage.py makemigrations <app> --check --dry-run   # lists expected ops, writes nothing
```

Use a local Postgres `DATABASE_URL` instead of SQLite when a test needs
`select_for_update` (bid concurrency), pgvector or other Postgres-only behaviour.
The venv is `Stores-BE/.venv` (Python 3.11). `Stores-BE/venv` is dead.
AGENTS.md §12 lists the PowerShell equivalents.

## Project facts the agreement refers to

- **Money:** `TRADEHUT_STORE_BASE_CURRENCY` is GHS. Amounts are `DecimalField`,
  major units, 2dp, in the DB and the API. Paystack takes integer minor units
  (pesewas); that conversion happens once, in `apps/payments/paystack.py`.
- **Time:** `TIME_ZONE = "UTC"`, `USE_TZ = True`. The server is the clock; clients
  show countdowns from server time plus an offset.
- **Permissions:** DRF `DEFAULT_PERMISSION_CLASSES` is still `AllowAny` (decision
  D10 flips it later). Every new view therefore sets `permission_classes`
  explicitly and scopes its queryset. Public read paths (catalog, search, product,
  store pages) and the auth flows are the only unauthenticated endpoints.
- **Soft deletes:** `apps.core.models.BaseModel` has no `deleted_at`. Where a
  model carries `is_active` or a status field, every query filters on it.
- **Proxy:** `SECURE_PROXY_SSL_HEADER` and `USE_X_FORWARDED_HOST` are set for
  Railway behind Cloudflare. Trust those headers, not the raw host or scheme.
- **Jobs:** Celery with Redis as broker. Periodic work lives in `CELERY_BEAT_SCHEDULE`
  and runs in the dedicated beat service, never inside a web worker.
- **Plans and acceptance checks:** `.claude/plans/` (board in its `README.md`).
  There is no separate UAT guide; a slice's acceptance checks live in its plan
  file. Backend Bid/RFQ starting spec: `.claude/design-system/bid-rfq-spec.md`.
- **Secrets:** `.env.example` exists in all four apps. Never read any `.env`
  (enforced by deny rules in `.claude/settings.json`).

## Standing rules

1. Tailwind utilities only; mobile-first (375 / 768 / 1024 / 1440).
2. Keep fonts: Syne / DM Sans / JetBrains Mono (FE, Seller), Charlie (Admin).
3. Do not touch nav/route components without the user lifting the lock
   (AGENTS.md §9, decision D17).
4. No new dependencies without asking. The shadcn set in AGENTS.md §6 is
   pre-approved for Stores-Admin.
5. **Never read `.env` files** (any app, any method, even names only). Use
   `.env.example`; ask the user for values and tell them which variables to add.
6. **Never run DB-touching `manage.py` commands or `pytest` against the remote
   `DATABASE_URL`** (Railway = live). Set a local `DATABASE_URL` in the same
   command, or write without running and say so. See AGENTS.md §7 and §13.

---

# Working agreement

## 1. Working with me

- Be direct, like a senior code review. If my request has a flaw (security
  hole, race condition, wrong layer, a simpler approach exists), say so
  before building, not after.
- Read the code before asking me anything it can answer. If the request is
  still ambiguous in a way that changes the work, ask ONE question, then
  proceed.
- Stay in scope. No drive-by refactors, reformatting, renames or dependency
  upgrades. List anything you noticed but didn't touch under FOLLOW-UPS.
- Never add a dependency without asking. Check what is already installed
  first.
- Never claim something works unless you ran it. Report exactly what was
  verified and what wasn't.
- Never use em dashes (the long dash, U+2014) anywhere: code, comments, docs,
  commit messages, replies. Use a hyphen where a separator is genuinely
  needed; otherwise rewrite the sentence.
- Dev machine: Windows 11, bash syntax for commands. Never change line
  endings or file encodings.

---

## 2. Think before coding: the Seven Questions

Answer these in the response, before the first edit. Scale the depth:

- **Trivial** (copy text, a class name, an obvious null guard): skip, just do it.
- **Normal**: one or two lines per question.
- **Money, permissions, auth, data migrations, multi-file or cross-stack**:
  full answers, with Q3 and Q4 the longest. These cost real money when wrong.

**1. INPUTS.** Every input: type, source, trusted or untrusted, and whether it
can be null, empty, zero, negative or duplicated. State units explicitly:
currency and minor vs major units, monthly vs annual, percent vs per-mille,
UTC vs local time. The units this repo uses are under "Project facts" above.

**2. OUTPUT.** The exact success and failure shapes and status codes. Match
the envelope the client already parses; never invent a second one for the
same kind of data. Side effects are output too: rows written, emails sent,
jobs queued, caches invalidated, files stored, external calls made.

**3. INVARIANTS.** What must hold before and after, on every path, written as
assertions:
- Domain: totals equal the sum of their lines; a paid record never silently
  becomes unpaid; nothing is counted twice.
- Authorization: which permission gates this? Can one seller reach another
  seller's data through this path? Can a buyer reach seller or staff endpoints?
- State: inactive rows stay excluded; statuses move only along legal edges
  (auction and RFQ state machines are in AGENTS.md §4).
If the change breaks an invariant on purpose, say so and say why.

**4. FAILURE MODES.**
- Empty input, null, zero rows, one row, thousands of rows.
- Duplicate submission: is it idempotent? A double-click must not create two
  records. Bid, checkout and award endpoints take an idempotency key.
- External call slow or down (Paystack, Elasticsearch, Redis): roll back or
  degrade? Decide and say which.
- Concurrency: two users acting on the same record at once.
- Partial failure: 8 of 10 succeed. Commit 8 or none? Decide deliberately.
- Rounding: where does the fraction go? Currency is never invented or lost.

**5. SIMPLEST AND CLEVEREST.** These are the same answer, not a trade-off.
- Shrink the problem first. Look for the reframing that makes work disappear:
  aggregate in one query instead of looping, derive a value instead of
  storing and syncing it, let a DB constraint enforce what an `if` guards,
  handle the general case so the special cases vanish.
- Write the steps in plain numbered English before code. If they're full of
  "and then, unless...", the reframing isn't done yet.
- Reuse before writing: extend an existing helper rather than building a
  parallel one.
- Clever is in the approach, never in the syntax. No abstraction, config
  flag or generic "engine" without two real call sites today.
- If the plain approach is honestly the answer, take it and name its
  limitation.

**6. FEWER CLICKS.** Design for the actor who does this fifty times a day.
Pre-fill from context, default the obvious value, remember the last choice,
skip steps that have only one legal option, surface the action where the user
already is. Always confirm irreversible actions; never confirm reversible
ones. Errors name the field, what's wrong and what to do instead.

**7. SIMPLE BUT INTELLIGENT.** The system does the inference the user would
otherwise do in their head, and the intelligence is invisible: no new toggle,
mode, setting or internal term to learn. If it fails this, go back to Q5
and Q6.

Every Q3 invariant and Q4 failure mode must appear as a REGRESSION step in
section 3. If one can't be exercised, say so instead of dropping it.

**Worked example: "Add a Regenerate Invoice button to the billing page"**
```
INPUTS:   account_id (trusted, route); period (untrusted query param,
          missing means current period); acting user's permissions.
          Amounts in the project currency, 2dp.
OUTPUT:   201 + invoice object, same envelope as POST /invoices.
          Side effects: 1 invoice, N line items, balance recomputed.
          Conflict: 409 + existing invoice number, nothing written.
RULES:    Lines sum to total. A PAID invoice is never overwritten.
          Requires manage_invoice. Account belongs to caller's tenant.
WRONG:    Double-click (unique constraint on account+period+source).
          Zero billable items (refuse; no 0.00 invoice). Mid-period
          change (prorate, never double-charge).
SIMPLEST: "Regenerate" is "generate" with a known period, so there is
          no second code path. 1) resolve period 2) ONE joined query for
          billable items 3) reuse the existing line builder 4) one
          transaction 5) return invoice.
CLICKS:   One click, period defaulted. Confirmation dialog because
          invoice creation is not reversible.
SMART:    Detects an already-paid invoice and offers "add to existing"
          vs "create new" instead of failing with an error to decode.
```

---

## 3. Response format after any code change

In this order. Skip sections that are genuinely empty.

```
CHANGES
  path/to/file.py : function_name()
    WHAT:   the exact change (lines, functions, logic)
    WHY:    bug fix / design decision / my request
    IMPACT: other callers, endpoints and frontend consumers affected

HOW IT WORKS        (new or non-obvious logic only)
  Numbered steps, then: edge cases (failure, empty, null, timeout),
  gotchas, and what it depends on that could break it.

VERIFIED
  Commands you ran and their results. Anything not run: "not run".

TEST IT             (one block per affected flow)
  WHERE:      exact screen and route, or endpoint. Name the button/field.
  ACTION:     precise steps to trigger the changed path
  EXPECTED:   specific values and messages, not "it should work"
  REGRESSION: nearby behaviour that could have broken + how to confirm
  NOW DIFFERENT: existing behaviour that changed, so I can decide if wanted

FOLLOW-UPS
  Migration needed (list expected ops) / plan acceptance checks in
  .claude/plans updated (yes/no) / issues noticed but out of scope
```

If something can't be verified from the UI, give the SQL query, log line to
grep, or curl command instead.

---

## 4. Git: the working tree is mine

- Never `git add`, `git commit` or `git push` unless I explicitly say so
  ("stage it", "commit this"). A request to make a change is not a request
  to stage it. AGENTS.md's "commit per slice" means: propose one
  conventional commit message per slice; I commit.
- Never run anything that discards, hides or moves uncommitted work:
  `git checkout -- <path>`, `git checkout .`, `git restore`, `git reset`,
  `git stash`, `git clean`, `git rebase`, `git merge`, or switching/creating
  branches. I usually have unrelated work in progress; these destroy it
  silently.
- When done, leave files unstaged and show `git status` and `git diff --stat`.
- If I ask for a commit message: conventional style (`feat:`, `fix:`,
  `update:`, `refactor:`, `chore:`), unless the project file says otherwise.

**Why:** I compose commits by hand. An unrequested `git add` mixes your edits
into my commit, and a checkout or stash can wipe hours of work.
`.claude/settings.json` allows only read-only git commands without a prompt.

---

## 5. Database and migrations

- Never create, edit or delete migration files (Alembic, Django, Prisma,
  Knex, anything) unless I explicitly ask. Change the models, say a
  migration is needed, and list the operations you expect the generator to
  produce so I can diff them against the real output. In Django,
  `makemigrations <app> --check --dry-run` gives that list without writing
  a file.
- Never run migrations or write/destructive SQL (`DROP`, `TRUNCATE`,
  `ALTER`, `UPDATE`/`DELETE` without a tight `WHERE`) against any database.
  Read-only queries only, and only against local or dev. The one exception
  is the Django test runner's throwaway database (local SQLite or local
  Postgres, commands above), which the run creates and destroys itself.
- Data backfills are separate from schema migrations. Propose them; don't
  run them.
- Uniqueness and idempotency belong in DB constraints. Check-then-insert
  races under concurrency.
- Writes that must succeed together go in one transaction with explicit
  rollback on failure. Bid, close and award paths use `transaction.atomic()`
  plus `select_for_update()` on the auction or RFQ row.
- No N+1 queries. One query with joins or aggregation beats a query per row.
  Never load a whole table to filter it in application code.
- Respect soft deletes everywhere. A query that forgets `deleted_at` (or the
  project's equivalent, here `is_active` and status fields) is a bug.

---

## 6. Money

- Never floats. `Decimal` in Python, integer minor units or a decimal
  library in JS/TS, `NUMERIC`/`DECIMAL` in the database.
- Every amount carries its unit in its name or type: currency, minor vs
  major units, period (monthly/annual). Here: GHS, `DecimalField`, major
  units, 2dp; integer minor units exist only inside the Paystack module.
- Round once, at a documented point. A total always equals the sum of its
  rounded lines.
- Money-touching changes always get the full Seven Questions and at least
  one automated test of the calculation.

---

## 7. Security and personal data

- Secrets live only in env vars. Never commit `.env`. Never print secrets or
  tokens in code, logs, tests or replies.
- Treat request bodies, query params, uploads, webhooks and third-party API
  responses as untrusted. Validate at the boundary.
- Parameterized queries only. Never string-format user input into SQL, shell
  commands or HTML.
- Every new endpoint is authenticated and permission-checked by default.
  Public or self-access endpoints are the exceptions listed under "Project
  facts" above; the DRF default is still `AllowAny`, so set
  `permission_classes` on every new view.
- Every query that returns records belonging to a user, seller or store is
  scoped to the caller.
- Never log personal data (names, emails, phone numbers, national ID
  numbers, health or financial details). Log record IDs instead.
- Never use real customer data in fixtures, seeds, tests or examples.

---

## 8. Write code as if it's already deployed

- Assume multiple processes and replicas. Caches, locks, counters, rate
  limits and schedulers must live in shared storage (Redis/DB), or be
  explicitly per-process with the consequence stated. Invalidating an
  in-process cache only clears one worker.
- A scheduler started inside a web worker runs once per worker. Put jobs in
  a dedicated worker or guard them with a lock. Here that is Celery beat,
  its own Railway service.
- Every external call has a timeout and a stated failure behaviour: fail,
  degrade, or retry with backoff.
- No external calls in read paths (GET handlers, list pages) unless bounded
  and unavoidable. Move them to write time or a background job.
- Background jobs and webhooks must be idempotent. They will run twice
  eventually.
- The app sits behind a reverse proxy. Don't trust client IP, host or
  scheme without the project's proxy configuration.

---

## 9. Code style (unless the project file overrides)

- Match the existing patterns in the file and module before introducing
  a new one.
- When changing a function, endpoint, field or response shape, search for
  every caller and consumer across backend and frontend and update them in
  the same change.
- **No single-use functions.** If a line or short block does the job, write
  it inline at the call site. Add a helper only when it has two or more real
  call sites today, and search for an existing one first.
  - Exception: pure functions that encode a business rule (pricing,
    proration, rounding, eligibility) may have one call site. They are the
    unit-test seam and give the rule a name.
  - ✅ `ages = list(range(lo, hi + 1))` inline where the rows are built
  - ❌ `_expand_one_band(band)` wrapping a two-line loop with one caller
- **Comments describe what the code does now** and the non-obvious
  constraints behind it. History (what it used to do, which bug was fixed)
  belongs in the commit message.
  - Forbidden: "Bug fix: ...", "Previously ...", "Fixed a bug where ...",
    "This used to ...", "The old approach ...", "Changed from X to Y ..."
  - ✅ `# Must outer join: payments with NULL invoice_id are valid (on-account).`
  - ❌ `# Changed to outer join because the old inner join dropped on-account payments.`
  - Test: would a reader who never saw the old code find it useful?
- TypeScript: no `any` or `@ts-ignore` without a comment saying why.

---

## 10. Definition of done

- [ ] Typecheck, lint, build and tests run (Commands section above). Any
      failure is reported, including whether it predates the change.
- [ ] Every caller and consumer of changed code updated
- [ ] TEST IT block with a regression step per invariant and failure mode
- [ ] Migration need stated, expected ops listed
- [ ] Plan acceptance checks in `.claude/plans/` updated if user-visible
      behaviour changed
- [ ] Nothing staged, committed or stashed
- [ ] No em dashes anywhere
