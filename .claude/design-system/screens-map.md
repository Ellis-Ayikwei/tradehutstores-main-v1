# Stitch → React screen map

Every folder in [`stitch_full_website_redesign_expansion/`](../../stitch_full_website_redesign_expansion/)
maps to a route in **Stores-FE** or **Stores-Admin**. Use this table when
porting; pick the right target app + route.

## Stores-FE (Next.js App Router → `Stores-FE/app/`)

| Stitch folder | Route | Notes |
| --- | --- | --- |
| `tradehut_homepage_1` / `_2` / `_3` | `/` | Three hero variants — pick one or A/B |
| `tradehut_browse_products` | `/products` | Existing |
| `tradehut_search_results_1` / `_2` | `/search` | New route |
| `tradehut_product_detail_1` / `_2` | `/products/[slug]` | Existing |
| `tradehut_shopping_cart` | `/cart` | Existing |
| `tradehut_checkout` | `/checkout` | New |
| `tradehut_wishlist` | `/wishlist` | Existing |
| `tradehut_deals_flash_sales` | `/deals` | New |
| `tradehut_auction_hub` | `/auctions` | NEW — see add-bid-feature |
| `tradehut_bids_auctions` | `/account/bids` | NEW — buyer's active bids |
| `tradehut_rfq_board` | `/rfq` | NEW — see add-rfq-feature |
| `tradehut_my_requests` | `/account/requests` | NEW — buyer's RFQs |
| `tradehut_account_overview` / `tradehut_account_central` | `/account` | New |
| `tradehut_my_orders` | `/account/orders` | New |
| `tradehut_order_detail` | `/account/orders/[id]` | New |
| `tradehut_profile_settings` | `/account/profile` | New |
| `tradehut_security_settings` | `/account/security` | New |
| `tradehut_notification_settings` | `/account/notifications` | New |
| `tradehut_payment_methods` | `/account/payment-methods` | New |
| `tradehut_saved_addresses` | `/account/addresses` | New |
| `tradehut_messaging_center` | `/account/messages` | New |
| `tradehut_feedback_reviews` | `/account/reviews` | New |
| `tradehut_verification_status` | `/account/verification` | New |
| `tradehut_invite_friends` | `/account/invite` | New |
| `tradehut_sign_in` | `/auth/sign-in` | Existing |
| `tradehut_register_step_1` / `_2` / `_3` | `/auth/register` | Existing — multi-step |
| `tradehut_forgot_password_step_1..3` | `/auth/forgot-password` | New |
| `tradehut_about_us` | `/about` | New |
| `tradehut_blog_index` | `/blog` | New |
| `tradehut_blog_article` | `/blog/[slug]` | New |
| `tradehut_help_center` | `/help` | New |
| `tradehut_buyer_protection` | `/buyer-protection` | New |
| `tradehut_trust_security` | `/trust` | New |
| `tradehut_safety_compliance` | `/compliance` | New |
| `tradehut_market_reports` | `/market-reports` | New |
| `tradehut_terms_of_service` | `/legal/terms` | New |
| `tradehut_privacy_policy` | `/legal/privacy` | New |
| `tradehut_cookie_policy` | `/legal/cookies` | New |
| `tradehut_returns_refunds` | `/returns` | New |
| `tradehut_reports_suggestions` | `/account/reports` | New |
| `tradehut_kinetic` | landing — TBD | Brand showcase page |
| `tradehut_dispute_resolution_center_1..3` | `/account/disputes` | Multi-step |
| `resolution_center_upload_modal` | modal in disputes flow |
| `tradehut_ds_center` | `/seller/disputes` | Lives under seller area |

## Stores-Admin (Vite React → `Stores-Admin/src/pages/`)

| Stitch folder | Route | Notes |
| --- | --- | --- |
| `tradehut_seller_dashboard` | `/dashboard` | Sidebar + KPIs + charts |
| `tradehut_seller_profile` | `/seller/profile` | Public-facing seller page |
| `tradehut_create_listing_step_1..7` | `/listings/new/[step]` | 7-step wizard |
| `tradehut_order_management` | `/orders` | Seller order desk |
| `tradehut_sell_on_tradehut_landing_page` | external `/sell` (FE) | Marketing — port to FE not Admin |

## Shared modal patterns

| Stitch folder | Where |
| --- | --- |
| `resolution_center_upload_modal` | Reusable `<UploadModal>` in FE `components/Modal/` |

## Don't port

- Files like `screenshot_2026_04_19_141354.png_1` — these are screenshots
  of unmapped flows; ignore unless the user asks.

## Order to tackle

1. **Tokens & globals** — tailwind configs, fonts, CSS recipes (one-time foundation).
2. **Mode discovery (homepage)** — fastest visible wins; sets brand tone.
3. **Bid + RFQ vertical slice** — backend models → FE listing pages →
   account dashboards (`tradehut_bids_auctions`, `tradehut_my_requests`).
4. **Account central** — high traffic surface.
5. **Seller dashboard** — Admin app priority.
6. Remainder — informational pages last.
