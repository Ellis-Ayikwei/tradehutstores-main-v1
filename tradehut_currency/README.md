# TradeHut Currency System

Admin-free, live-rate currency conversion for TradeHut.

---

## How it works

```
Django DB  →  prices stored in GHS (BASE_CURRENCY)
                    ↓
GET /api/fx/rates/  →  Django fetches from Frankfurter, caches 4h in Redis
                    ↓
CurrencyProvider    →  fetches rates on mount, polls every 4h
                    ↓
formatCurrency(product.price)  →  converts GHS → selected currency → formats
```

The key principle: **prices in the DB are always in one currency. Everything
else is a display concern.** Never store converted prices.

---

## Files

```
frontend/
  contexts/
    CurrencyContext.tsx     ← Provider, useCurrency hook, convert(), formatCurrency()
  components/common/
    CurrencySwitcher.tsx    ← Drop-in <select> for the navbar

backend/
  fx/
    views.py                ← GET /api/fx/rates/ with caching + fallback
    urls.py                 ← URL pattern
    apps.py
  tradehut/
    settings_currency.py   ← Settings snippet (copy into settings.py)
    urls_snippet.py         ← URL snippet (copy into urls.py)
```

---

## Setup

### Backend

1. Add `'fx'` to `INSTALLED_APPS` in `settings.py`
2. Add Redis cache backend (see `settings_currency.py`)
3. Add URL pattern (see `urls_snippet.py`)
4. No migrations needed — fx app has no models

### Frontend

1. Wrap your app in `<CurrencyProvider>` in `app/layout.tsx`:

```tsx
import { CurrencyProvider } from '@/contexts/CurrencyContext'

export default function RootLayout({ children }) {
    return (
        <html>
            <body>
                <CurrencyProvider>
                    {children}
                </CurrencyProvider>
            </body>
        </html>
    )
}
```

2. Add `<CurrencySwitcher />` to your navbar
3. Use `formatCurrency()` everywhere a price is displayed — nothing else needed

---

## Usage

```tsx
import { useCurrency } from '@/contexts/CurrencyContext'

function ProductCard({ product }) {
    const { formatCurrency } = useCurrency()

    return (
        <div>
            <h3>{product.name}</h3>
            {/* Pass raw DB amount — conversion is automatic */}
            <span>{formatCurrency(product.final_price)}</span>
        </div>
    )
}
```

---

## FX Provider

Default: **Frankfurter** (https://api.frankfurter.app) — free, no API key.

To swap providers, edit `_fetch_from_provider()` in `fx/views.py`.
Popular alternatives:
- Open Exchange Rates (openexchangerates.org) — more currencies, free tier
- Fixer.io — EU-based, reliable
- Central bank feeds — official rates, slower updates

---

## Caching strategy

| Scenario | Behaviour |
|---|---|
| Normal | Rates cached in Redis for 4 hours |
| Provider down | Serves last known rates (up to 7 days old), `stale: true` |
| Cache empty + provider down | Hardcoded fallback rates, `stale: true` |
| Frontend: stale=true | Shows `~` indicator next to currency switcher |

---

## Adding a new currency

1. Add to `SUPPORTED_CURRENCIES` in `CurrencyContext.tsx`
2. Add to `HARDCODED_RATES` in `fx/views.py` (last-resort fallback only)
3. Frankfurter supports most major currencies automatically — no other changes

---

## Environment variables

```bash
REDIS_URL=redis://localhost:6379/1
```
