# TradeHut Promo Codes

> **NOTE:** The placeholder scaffolding under `backend/` and `frontend/` in this folder
> was the original draft. The real implementation has been built into the monorepo apps,
> with platform-wide AND seller-scoped support added. See locations below.

## Where the live code lives

| Concern | Path |
|---|---|
| Django app (models / serializers / services / admin / signals / views) | [`Stores-BE/apps/promotions/`](../Stores-BE/apps/promotions/) |
| **Detailed how-it-runs README** | [`Stores-BE/apps/promotions/README.md`](../Stores-BE/apps/promotions/README.md) |
| Storefront client (validate / auto-apply / dismiss memory) | [`Stores-FE/lib/promos.ts`](../Stores-FE/lib/promos.ts) |
| Storefront React hook | [`Stores-FE/hooks/usePromo.ts`](../Stores-FE/hooks/usePromo.ts) |
| Storefront component (drop-in `<PromoCodeInput>`) | [`Stores-FE/components/Promo/`](../Stores-FE/components/Promo/) |
| Wired into cart | [`Stores-FE/app/cart/page.tsx`](../Stores-FE/app/cart/page.tsx) |
| Wired into checkout | [`Stores-FE/app/checkout/page.tsx`](../Stores-FE/app/checkout/page.tsx) |
| Admin API client | [`Stores-Admin/src/services/promosAdminService.ts`](../Stores-Admin/src/services/promosAdminService.ts) |
| Admin UI | [`Stores-Admin/src/pages/admin/PromosManagement/`](../Stores-Admin/src/pages/admin/PromosManagement/) |

## What it does (60-second pitch)

A discount-code system that supports both **platform-wide promos** (run by ops
in `/admin/promos`) and **seller-scoped promos** (each seller manages their
own via `/promos/seller/codes/` API).

Five discount types: percentage, fixed amount, free shipping, buy-X-get-Y,
fixed-cart-price. Per-user + global redemption caps, scheduled windows,
auto-apply, abuse rate-limiting, atomic redemption with race-safe `F()`
updates.

## Quick setup

```bash
cd Stores-BE
venv/Scripts/python.exe manage.py migrate promotions
venv/Scripts/python.exe manage.py seed_promos
```

Try `SAVE50`, `WELCOME10`, `FREESHIP`, `FLASH20`, `BUNDLE3`, or `AUTOSHIP`
in the cart at http://localhost:3000/cart.

For everything else — data model, lifecycle, validation rules, atomic
redemption, abuse protection, API reference, troubleshooting — see the
[full README in the Django app](../Stores-BE/apps/promotions/README.md).
