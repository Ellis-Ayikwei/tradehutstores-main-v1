# 22 — Backend content cleanup (from the BE string sweep; AGENTS.md §1b)

## BE-CONTENT-1 (be-builder, after ENV-0 — needs `makemigrations`)
- `apps/store/models.py:160-161`: `storefront_support_phone` default → `"024 813 8722"`, `storefront_address` default → `"La Trade Fair, Accra, Ghana"`. Add a **data migration** that updates the existing live `StoreConfig` row only if it still holds the old fake default (`"+233 30 000 0000"` / `"Accra, Ghana"`), never overwriting values an admin set. Public whitelist is `apps/store/views.py:53-54`. `storefront_support_email` / `storefront_website_url` defaults need the user's real values (D19).
- Remove the MoreVans brand leakage in `apps/authentication/utils.py` (`app_name`, logo URL on api.morevans.com, `morevans-logo` CID, "MV" initials/colour) and the eight `"support_email": "support@morevans.com"` responses in `apps/authentication/views.py:1440-1537`. Replace with TradeHut name/logo and the support email from D19. Verify the `emails/*.html|txt` templates `send_email_template` renders actually exist (the sweep found no `templates/` dir in Stores-BE — a possible broken-email launch blocker; check and add minimal real templates if missing).
- `apps/authentication/serializer.py:95,128,143,187`: phone validation messages are UK-centric ("07812345678"). Change validation + messages to Ghana mobile formats (e.g. 024/054/055/020/050 + 7 digits, +233…), with tests.
- Seed commands (`apps/ads/.../seed_ads.py`, `apps/promotions/.../seed_promos.py`, `utils/.../populate_products.py`): gate behind an explicit `--demo` flag and a `DEBUG`/`ALLOW_DEMO_SEED` guard so they can't run against production by accident. Do not delete. Never run them against prod.

## Repo hygiene (orchestrator → user)
- `Stores-BE/venv` is **tracked in git** (huge diffs; it also points at a missing Python). Plan: add `venv/` to `.gitignore` and `git rm -r --cached Stores-BE/venv` in one commit after ENV-0, once the user approves.

## Needs user decision
- **D19** Real support email + website URL for `StoreConfig`, `DEFAULT_FROM_EMAIL` (`noreply@tradehut.com` — confirm the domain) and email footers.
