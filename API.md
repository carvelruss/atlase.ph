# API

REST-style Cloudflare Pages Functions under `/api`. Every response uses the same envelope.

## Envelope

Success:

```json
{ "success": true, "data": {}, "meta": { "requestId": "..." }, "error": null }
```

Error:

```json
{
  "success": false,
  "data": null,
  "meta": { "requestId": "..." },
  "error": { "code": "VALIDATION_ERROR", "message": "The submitted data is invalid.", "fields": {} }
}
```

Common error codes: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `FORBIDDEN`/`CSRF_INVALID`
(403), `NOT_FOUND` (404), `CONFLICT`/`SETUP_COMPLETE` (409), `RATE_LIMITED` (429),
`INTERNAL` (500).

## Conventions

- JSON in/out. Mutating admin requests (`POST/PUT/PATCH/DELETE` under `/api/admin/*`) require the
  `x-csrf-token` header (obtain the token from the session endpoint).
- Cookies are HttpOnly and sent automatically (`credentials: same-origin`).
- List endpoints return `meta` pagination: `{ page, pageSize, total, totalPages }`.

## Endpoints

### Live in Phase 1

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/health` | — | Liveness + D1 connectivity probe |
| GET | `/api/auth/admin/session` | — | Auth state; reports `setupRequired` when no admin exists |
| GET | `/api/auth/admin/setup` | — | Whether first-run setup is required |
| POST | `/api/auth/admin/setup` | — | Create the sole administrator (once) → sets session cookie |
| POST | `/api/auth/admin/login` | — | Email/password login (rate-limited) → sets session cookie |
| POST | `/api/auth/admin/logout` | cookie | End session; `{ "allDevices": true }` revokes all |
| POST | `/api/auth/admin/forgot-password` | — | Email a reset link (always 200; no enumeration) |
| POST | `/api/auth/admin/reset-password` | — | Consume token + set new password |
| GET | `/api/admin/overview` | admin | Dashboard metrics for a `range` (from D1) |
| GET | `/api/admin/overview/counts` | admin | Lightweight sidebar/badge counts |
| GET | `/api/storefront/settings` | — | Public store identity, theme, and menus |

### Planned (Phases 2–5)

```
# Admin — catalog
GET/POST           /api/admin/products
GET/PATCH/DELETE   /api/admin/products/:id
POST               /api/admin/products/bulk | /import        GET /api/admin/products/export
CRUD               /api/admin/categories | /collections | /inventory | /reviews

# Admin — commerce
GET/POST           /api/admin/orders          GET/PATCH /api/admin/orders/:id
POST               /api/admin/orders/:id/fulfill | /refund | /cancel
CRUD               /api/admin/customers | /discounts | /shipping/*
GET                /api/admin/payments/transactions | /refunds
CRUD               /api/admin/content/* | /appearance/* | /settings/* | /integrations

# Storefront
GET   /api/storefront/homepage | /products | /products/:slug
GET   /api/storefront/categories/:slug | /collections/:slug | /search
GET   /api/storefront/cart     POST /api/storefront/cart/items
PATCH/DELETE /api/storefront/cart/items/:id
POST  /api/storefront/checkout/validate | /shipping-rates | /apply-discount | /complete

# Uploads & webhooks
POST/DELETE /api/admin/uploads[/:id]
POST        /api/webhooks/:provider
```

## Examples

```bash
# Bootstrap auth state
curl -s 1http://localhost:8788/api/auth/admin/session

# First-run setup (also logs you in)
curl -s -c jar.txt -X POST http://localhost:8788/api/auth/admin/setup \
  -H 'Content-Type: application/json' \
  -d '{"name":"Store Owner","email":"owner@atlase.ph","password":"supersecret123"}'

# Authenticated dashboard metrics
curl -s -b jar.txt "http://localhost:8788/api/admin/overview?range=30d"
```
