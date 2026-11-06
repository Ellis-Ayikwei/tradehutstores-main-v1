# 21 — Auth wiring (addendum; found by KIN-FE-2)

**Gap:** `Stores-FE/app/auth/register` never calls the backend (step 3 "verification link sent" is fiction) and `forgot-password` is three `setTimeout` stubs. Backend endpoints already exist in `Stores-BE/apps/authentication/urls.py`: `register/`, `forget_password/`, `reset_password/<uidb64>/<token>/`, `otp/send|verify|resend/`, `login/otp/`.

## FE-AUTH-1 (fe-builder) — P0, no new backend endpoints
Owned: `Stores-FE/app/auth/**`, plus a thin `Stores-FE/lib/auth-api.ts` (new) using the existing axios instance.
- Read `RegisterAPIView`, `PasswordRecoveryAPIView`, password-reset-confirm view and the OTP views first; match their exact request/response/error shapes (cite file:line in the report). Do not change backend.
- Register: call `register/` on step-2 submit; show field errors from the API (email taken, weak password); only reach step 3 on success; copy on step 3 must reflect what the backend really does (email/OTP verification — verify which).
- Forgot-password: replace stubs with `forget_password/` → OTP/link flow as the backend actually implements it; if the backend is link-only, collapse the UI to "enter email → check inbox", and add a `/auth/reset-password/[uid]/[token]` page that calls the reset-confirm endpoint.
- Keep `react-auth-kit` login untouched. Loading, error and success states on every submit.
- Acceptance: with the BE running, a new user can register, receive verification, log in; a user can reset a forgotten password end to end. If BE can't run (venv blocked), mark as "implemented, not exercised" and say so.
- Blocked by: ENV-0 for end-to-end verification only (implementation can start now).

## BE-AUTH-0 (be-builder, after ENV-0) — verify, not build
Exercise the three flows against the dev DB; fix defects found (email delivery settings, token expiry, user-enumeration on `forget_password/`). Tests for each.

Related decisions: social sign-in is disabled in the UI ("coming soon") until the user decides on providers.

## FE-AUTH-1 — DONE (implemented, not exercised). BE-AUTH-0 is now a launch BLOCKER with this concrete defect list (be-builder, after ENV-0; reviewer approves)
1. **Reset link 404:** `apps/authentication/views.py:547-548` builds `${FRONTEND_URL}/reset-password/{uid}/{token}`; the page is `/auth/reset-password/[uid]/[token]`. Fix the BE link (preferred).
2. **Ghana phone rejected:** `serializer.py:72-199` parses as GB and requires a UK number. Accept GH (region `GH`, 024/054/055/059/020/050… and +233), Ghana error text; tests. (Merges with plan 22 phone-validation item.)
3. **OTP/email templates missing:** `utils.py:290-291` renders `emails/otp_verification.html|txt` which don't exist → `send_otp_email` returns False → register always answers `otp_sent:false`. Add real TradeHut templates (plain, no dummy copy); also password-reset email.
4. **Wrong brand in OTP email:** "MoreVans", "MV" logo, morevans.com URL (`utils.py:205-221`) → TradeHut (plan 22).
5. **Settings:** `EMAIL_BACKEND` is console (`settings.py:488`) → real SMTP/provider via env vars; confirm `DEFAULT_FROM_EMAIL` domain (D19).
6. **Password leak in logs:** `print("request.data", request.data)` at `views.py:98` (also prints at ~605, 994, 1162) writes passwords/OTPs to stdout → delete all `print` of request data. Treat as a security fix, do first.
7. **Linux import bug:** `views.py:101` `from apps.Authentication.serializer import …` (capital A, outside try) raises ModuleNotFoundError on case-sensitive hosts (Railway) → fix to `apps.authentication`.
8. **OTP expiry mismatch:** API says `validity_minutes: 10` (`utils.py:642`), `settings.OTP_EXPIRY_MINUTES` = 5 → single source of truth.
9. **Stuck unverified accounts:** no way to fix a mistyped email on an inactive account → either allow re-register to overwrite an unverified account with the same email, or add change-email-before-verify.
10. **Public endpoints reject stale tokens:** register/otp/forget/reset views should set `authentication_classes = []` (or FE should omit the stale `_auth` header).
11. `forget_password` returns 500 only when the account exists and mail sending fails (tiny enumeration side channel) → always 200.
12. Role choice: `user_type` is commented out in the register serializer (`serializer.py:47-50`); decide whether sellers onboard via `/sellers/onboarding/` only (plan SE1) — FE register dropped the buyer/seller step.

## Addendum (from the email-change security fix)
13. `UserBasicSerializer` email uniqueness is exact-match/case-sensitive → a user can switch to a case-variant of another user's address ('John@x.com' vs 'john@x.com'). Make email uniqueness case-insensitive (normalise to lowercase on write + `iexact` check; data-migration check for existing duplicates before adding any DB constraint).
14. Changing email now leaves the new address unverified, but nothing sends a verification OTP to it. Add: on email change send an OTP to the new address (reuse apps/authentication OTP flow, `otp_type='email_change'`), set `email_verified=True` only after it is verified.
