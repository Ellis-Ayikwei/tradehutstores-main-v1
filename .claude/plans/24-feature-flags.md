# 24 — Feature flags (release gating by status, audience, region)

Status: built (BE + Admin settings tab + FE/Admin gates). Owner: lead (Opus).
Other agents: **gate new user-facing features on a flag key** using the helpers below. Do not invent your own toggles.

## Why
Seller features are still in development. They must stay off for the public in production while staff and named
testers can use them, and features must be switchable per region (country) and per audience. One switch, enforced
server-side, read by the storefront and the admin.

## Model — `apps/store/models.py: FeatureFlag` (table `store_feature_flag`)
| field | type | meaning |
| --- | --- | --- |
| `key` | slug, unique | stable id used in code, e.g. `sellers` |
| `name`, `description` | text | admin-facing |
| `status` | `off` \| `beta` \| `on` | `off` = nobody (kill switch, staff included). `beta` = staff + `beta_users` only. `on` = released, subject to the rules below |
| `audiences` | list of `guest` `buyer` `seller` `staff`; `[]` = everyone | who gets it when `on` |
| `countries` | ISO-3166 alpha-2 list; `[]` = all | allowlist when `on` |
| `excluded_countries` | ISO alpha-2 list | blocklist when `on` (wins over `countries`) |
| `beta_users` | M2M User | named testers; get the feature in `beta` and `on` regardless of audience/region |

Owner bypass: an authenticated **superuser** is always allowed, before any rule below, even when the flag is `off`
or has no row. The owner must never be locked out of Seller Central or of the settings that edit the flags.
`is_staff` without `is_superuser` gets no bypass (`off` still blocks them). The owner also gets a verified
`SellerProfile` auto-provisioned on first use of `sellers/me/*` (`apps/sellers/services.py: ensure_owner_profile`).

Evaluation (`apps/store/flags.py: evaluate`), first match wins (after the superuser bypass above):
1. no row for the key → **off** (unknown flags fail closed).
2. `off` → False.
3. user is staff or in `beta_users` → True.
4. `beta` → False.
5. `on` → audience matches (any of the user's roles in `audiences`, or `audiences` empty) **and** country allowed
   (in `countries` or `countries` empty, and not in `excluded_countries`).

Roles: anonymous → `guest`; signed in → `buyer`, plus `seller` if the user has a seller profile, plus `staff` if `is_staff`.

Country (`resolve_country`): `CF-IPCountry` header (set by Cloudflare) → client hint (`X-Client-Country` header or
`?country=`) → `StoreConfig.locale_country`. The client hint is spoofable, so region rules are a **rollout control,
not a compliance/legal block**. If a feature must be legally geo-blocked, that needs a trusted geo source first.

## API
- `GET  store/flags/` — AllowAny. Evaluated for the caller: `{"country": "GH", "flags": {"sellers": false, ...}}`.
  Every defined flag is listed. Send the JWT if you have it (results differ for staff/beta/sellers).
- `GET/POST store/feature-flags/`, `GET/PATCH/DELETE store/feature-flags/<id>/` — staff only (same permission as store config).
  Write `beta_user_emails: string[]` (unknown emails → 400); read `beta_users: [{id, email}]`.

## Server-side enforcement (required — hiding UI is not enough)
`from apps.store.flags import feature_enabled` → `permission_classes = [IsAuthenticated, feature_enabled("sellers")]`.
Denied → 403 `{"detail": "...", "code": "feature_disabled", "feature": "sellers"}`.
Applied now: `apps/sellers` seller-self endpoints (`onboarding/`, `me/`, `me/resubmit/`, `me/documents/`).
Staff review endpoints and public seller pages are **not** gated.
TODO for owning agents: seller product writes (`apps/products`), seller auction/RFQ writes (`apps/auctions`, rfq) once
those slices land — add `feature_enabled("sellers")` to the seller-side views.

## Clients
- Stores-FE: `hooks/useFeatureFlag.ts` → `useFeatureFlag('sellers')` returns `{ enabled, isLoading }`;
  `components/common/FeatureGate.tsx` → `<FeatureGate flag="sellers" fallback={...}>`.
  `/sell` is gated. **Seller Central agent: wrap `app/seller-central/layout.tsx` content in `<FeatureGate flag="sellers">`.**
  Nav links (`components/Navigation/*`, locked) are not hidden yet; the pages behind them show the "not available yet" state.
- Stores-Admin: `src/hooks/useFeatureFlag.ts` (same API). `/seller/*` is gated in `pages/seller/SellerRoute.tsx`.
  Settings → Platform → **Feature flags** tab manages flags.

## Seeded flags (data migration)
- `sellers` — status `beta`: Seller Center + onboarding off for the public; staff and beta users can use it.

## Releasing sellers
Settings → Feature flags → `sellers`: add tester emails while in `beta`; to launch set `on`, optionally limit
`countries: ["GH"]` and `audiences: []`.
