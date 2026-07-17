# Security

## Authentication

- **First-run setup**: no default/hardcoded password. `POST /api/auth/admin/setup` creates the sole
  administrator only while none exists, then locks permanently.
- **Password hashing**: PBKDF2-HMAC-SHA256 via Web Crypto (`functions/lib/crypto.ts`), per-user
  random salt, constant-time comparison. Iteration count is tuned to the Workers CPU budget and can
  be raised on the Workers Paid plan.
- **Sessions**: opaque random id stored in an **HttpOnly, SameSite=Lax** cookie (Secure in
  production). Session state lives in D1 (`admin_sessions`) with expiry and a per-user
  `session_epoch`. Bumping the epoch (password reset, "log out everywhere") invalidates all
  sessions instantly. Admin auth is **never** kept in `localStorage`.
- **Rate limiting & lockout**: per-IP coarse limit (KV) plus per-account failed-attempt tracking
  (D1 `login_attempts`) with progressive delay and temporary lockout.
- **Password reset**: single-use, expiring tokens; only the SHA-256 hash is stored; using a token
  bumps the session epoch and deletes existing sessions.

## Authorization

- Every `/api/admin/*` request passes `functions/api/admin/_middleware.ts`, which resolves the
  session server-side and rejects unauthenticated/expired/revoked sessions with `401`.
- The client route guard is **defense-in-depth only** — the API is authoritative.

## CSRF

- Double-submit token bound to the session. State-changing admin requests must send
  `x-csrf-token`; the middleware compares it to the session's token in constant time. Cookies are
  `SameSite=Lax` as a second layer.

## Input validation

- All request bodies/queries validated with **Zod** (`functions/lib/validation.ts`); failures
  return a `400 VALIDATION_ERROR` with per-field messages and never reach business logic.

## Server-authoritative commerce

- Prices, discounts, tax, shipping, and inventory are always recomputed server-side. Discount
  amounts and totals sent by the browser are ignored. Inventory reductions are idempotent
  (unique adjustment keys) to prevent overselling and double-application.

## Transport & headers

- Baseline security headers on every response (`X-Content-Type-Options`, `X-Frame-Options: DENY`,
  `Referrer-Policy`, `Cross-Origin-Opener-Policy`); API responses add `Cache-Control: no-store`.
- `public/_headers` sets a Content-Security-Policy, `Permissions-Policy`, and caching for static
  assets in production. Admin routes are `noindex`.

## Secrets

- No secrets in the client bundle. Server secrets live in `.dev.vars` (local) or Pages secrets
  (production). Provider config in `integrations` stores only non-secret values; secrets are
  referenced by name.

## Auditing

- Important admin actions are recorded in `audit_logs` (actor, action, entity, ip/ua, safe
  metadata). Passwords, full payment credentials, and secret tokens are never logged.

## Webhooks (provider integrations)

- Inbound webhooks verify provider signatures and dedupe by external event id
  (`payment_events`, `webhook_deliveries`), making processing idempotent.

## Reporting

For a real deployment, add a `SECURITY.txt`/contact and a private disclosure channel. Rotate
`SESSION_SECRET`/`CSRF_SECRET` if you suspect exposure (rotating invalidates sessions).
