# Architecture

Atlase is a **single-owner** e-commerce platform: exactly one store and one administrator. There
is no multi-tenancy, merchant onboarding, seller dashboards, or marketplace logic anywhere in the
codebase.

## High-level

```
                          Cloudflare Pages (one project)
┌───────────────────────────────────────────────────────────────────────┐
│  Static assets (dist/)              Pages Functions (functions/)        │
│  ┌───────────────────────┐         ┌──────────────────────────────┐    │
│  │ React SPA             │  fetch  │ /api/*  route handlers        │    │
│  │  /admin/*  (private)  │ ───────▶│  _middleware (reqid, headers) │    │
│  │  /* storefront (public)│        │  api/admin/_middleware (authz)│    │
│  └───────────────────────┘         └──────────────┬───────────────┘    │
└───────────────────────────────────────────────────┼────────────────────┘
                                                     │ bindings
                        ┌────────────────────────────┼──────────────────────┐
                        ▼                             ▼                      ▼
                  D1 (SQL, Drizzle)            R2 (media)             KV (sessions,
                  single source of truth       binary objects         rate limits, tokens)
```

## Frontend

- **Vite + React + TypeScript (strict)** SPA. One `createBrowserRouter` tree with two branches:
  the protected admin app (`/admin/*`) and the public storefront (`/`).
- **State**: TanStack Query owns all server state (sessions, dashboard, catalog, ...). Local UI
  state uses component state/context. No admin token is ever stored in `localStorage`.
- **Auth on the client** is defense-in-depth only: `RequireAdmin` guards routes, but the API is
  the real authority and re-checks every request server-side.
- **Code splitting**: route-based via `React.lazy` (e.g. the Recharts-heavy dashboard is its own
  chunk); vendor libraries are split via Rollup `manualChunks`.
- **Design system**: `src/styles/_tokens.scss` defines CSS variables; `main.scss` compiles
  Bootstrap with brand overrides. Components use CSS Modules (`*.module.scss`).

## API (Pages Functions)

- One file per route under `functions/api/**`. Handlers export `onRequestGet/Post/...` typed as
  `Fn` (`PagesFunction<Env, string, RequestData>`).
- **Middleware chain** (shallow → deep):
  1. `functions/_middleware.ts` — assigns a request id, wraps everything in an error boundary that
     never leaks stack traces, applies baseline security headers.
  2. `functions/api/admin/_middleware.ts` — resolves + validates the admin session, enforces CSRF
     for mutating methods, and attaches `data.admin`.
- **Response envelope** is uniform: `{ success, data, meta, error }`. Helpers in
  `functions/lib/response.ts`; typed errors in `functions/lib/errors.ts`.
- **Shared code** (`shared/`) is imported by both client and server. Functions use **relative
  imports** into `shared/` (never a path alias) so the Wrangler/esbuild bundler always resolves it.

## Data

- **D1** is the single source of truth, accessed through **Drizzle ORM**. The schema in
  `shared/db/schema/` is the authority; migrations are generated from it and applied by Wrangler.
- **Money** is stored and computed as integer minor units. Currency is stored alongside amounts.
  Prices, discounts, tax, shipping, and inventory are always recomputed server-side.
- **R2** stores all binary media; D1 holds only `media_assets` metadata (object key, url, dims,
  ref count). Uploads are validated (size, MIME, extension) with unique object keys.
- **KV** stores sessions-adjacent ephemera: rate-limit counters and short-lived signed tokens.
  Admin sessions themselves are rows in D1 (`admin_sessions`) referenced by an opaque cookie.

## Key invariants

- Server-authoritative pricing and inventory — the browser's numbers are never trusted.
- Inventory changes are an append-only ledger (`inventory_adjustments`) with idempotency keys.
- Order numbers, idempotency keys, and slugs are unique and generated/validated server-side.
- Important admin actions are recorded in `audit_logs` (never secrets or full payment data).
