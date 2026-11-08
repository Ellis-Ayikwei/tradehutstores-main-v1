# TradeHut Stores 2.0

Read [/AGENTS.md](../AGENTS.md) — it is the single source of truth for scope, model routing
(Opus plans/reviews, Sonnet builds), rules per app, and the definition of done.

The Kinetic/Stitch redesign has been **cancelled and removed**. Do not reintroduce it.

## Apps
| Path | Stack |
| --- | --- |
| `Stores-FE/` | Next.js 15, React 18, Tailwind v3, Redux Toolkit, SWR |
| `Stores-Admin/` | Vite + React 18 + TS, Tailwind v3, shadcn/ui (being adopted) |
| `Stores-BE/` | Django + DRF, Celery |

## Standing rules
1. Tailwind utilities only; mobile-first (375 / 768 / 1024 / 1440).
2. Keep fonts: Syne / DM Sans / JetBrains Mono (FE), Charlie (Admin).
3. Do not touch nav/route components without the user lifting the lock.
4. No new dependencies without flagging them.
5. **Never read `.env` files** (any app, any method, even names only). Use `.env.example`; ask the user for values and tell them which variables to add.
6. **Never run DB-touching `manage.py` commands / `pytest` against the remote `DATABASE_URL`** (Railway = live). Use a local `DATABASE_URL` in the same command, or write without running and say so. See AGENTS.md §13.
7. Plans live in `.claude/plans/`; backend Bid/RFQ starting spec: `.claude/design-system/bid-rfq-spec.md`.
