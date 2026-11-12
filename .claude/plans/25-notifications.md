# 25 - Notification center (frozen contract)

Refines `20-seller-and-checkout-gaps.md` §8 "Notifications" (BE-NTF-1). If this file and §8 differ, this file wins.

## Why
`apps/notifications` is a stub (`unread_count/` returns 0). `apps.auctions.services.notify_safe` and `apps.catalog.services._notify` already import `apps.notifications.services.notify`, hit ImportError and silently skip every notification. Storefront `/account/notifications` and the Admin bell/pages call endpoints that do not exist.

## Scope
Per-user in-app inbox. **Out of scope:** staff "compose/broadcast", per-channel preferences matrix, email/SMS/push delivery, websockets. Realtime = SWR/interval polling of `unread_count/`.

## Data model (`apps/notifications/models.py`)
`Notification(BaseModel)` (inherit `apps.core.models.BaseModel`; check its fields first and do not duplicate `created_at`/`updated_at`/id).
- `user` FK `settings.AUTH_USER_MODEL`, `related_name="notifications"`, CASCADE
- `kind` CharField(60) - free-form slug, e.g. `auction.outbid`, `auction.won`, `order.shipped`, `catalog.request_approved`
- `title` CharField(160), `body` TextField(blank), `link` CharField(300, blank) - **storefront/admin-relative path only**
- `data` JSONField(default=dict, blank=True)
- `read_at` DateTimeField(null, blank, db_index)
- Index `(user, read_at, -created_at)`; default ordering `-created_at`.

## Service (`apps/notifications/services.py`)
`notify(user_id, kind, title, body="", link="", data=None) -> None`
- Signature must match the existing callers: `notify(user_id, kind, title, body, link, data=data)` and `notify(user_id, kind, title, body, link)`.
- Never raises (log with `logger.exception`). Callers use it inside `transaction.on_commit`.
- `link` is stored only if it starts with `/` and not `//` and has no scheme; otherwise stored as `""`. Truncate title/body/kind to field limits.
- `unread_count(user) -> int`, `mark_read(user, pk)`, `mark_all_read(user) -> int` helpers live here; views stay thin.

## Endpoints (mounted at `notifications/`, all `IsAuthenticated`, every queryset scoped to `request.user` - staff see only their own)
Register `unread_count/` and `read-all/` BEFORE `<pk>/` routes.
| Method | Path | Behaviour |
| --- | --- | --- |
| GET | `notifications/` | Paginated (`PageNumberPagination`, `page_size` default 20, max 100). Query: `unread=true`, `kind=<prefix>`. Response `{count, next, previous, results:[Notification]}` |
| GET | `notifications/unread_count/` | `{"count": n}` (keep this exact path; Storefront already calls it) |
| GET | `notifications/<id>/` | One of mine, else 404 |
| POST | `notifications/<id>/read/` | Idempotent; sets `read_at` once; returns the Notification |
| POST | `notifications/read-all/` | `{"updated": n}` |
| DELETE | `notifications/<id>/` | 204; mine only |

Notification JSON: `{id, kind, title, body, link, data, is_read, read_at, created_at}` (`created_at` ISO 8601).
Errors: DRF default (401 unauthenticated, 404 not found).

## Tests (`apps/notifications/tests.py`)
notify creates a row; link sanitising (`javascript:`, `//evil.com`, `https://x`, `/orders/1`); notify swallows errors; list is scoped (user A never sees B); read is idempotent; read-all counts only unread; unread_count; delete other user's -> 404; unauthenticated -> 401.
**DB rule:** local Postgres is not running. Do NOT run tests against the Railway `DATABASE_URL`. Write them, run `python manage.py check` and `makemigrations notifications` with a dummy local `DATABASE_URL` in the same command, and say tests were not run.

## Frontend - Stores-FE (`fe-builder`)
Files owned: `Stores-FE/app/account/notifications/page.tsx`, and the notification functions in `Stores-FE/lib/accountApi.ts` (add; keep `getNotificationUnreadCount`). Do not touch `components/Navigation/*`.
Page: list (SWR, paginated "Load more"), unread styling by solid colours, "Mark all as read", per-row mark read on open + navigate to `link` via `next/link`, delete, filter tabs All / Unread, skeleton / empty / error + retry. Tailwind only, theme-aware, flat solid, Amazon density, mobile-first, no fake items.

## Frontend - Stores-Admin (`admin-builder`)
Files owned: `src/pages/Notifications/*` (NotificationBell, NotificationsPage, NotificationDetail), `src/pages/admin/notifications/*`, new `src/services/notificationService.ts`. Keep default-export paths used by `router/routes.tsx` and the Header bell. Do not touch the router, Sidebar or Header.
shadcn style. The bell (popover/dropdown list of latest 5 + unread badge, polls `unread_count/` every 60s while the tab is visible) , `/notifications` inbox page, `/notifications/:id` detail (marks read), and `/admin/notifications` = the same inbox for staff (remove compose, preferences, summary, bulk "clear read" screens). All against the endpoints above only.
