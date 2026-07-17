# Atlase

A production-oriented, **single-owner e-commerce platform** built for Cloudflare Pages.
One store, one administrator — a public storefront and a private admin dashboard, connected
end-to-end through Cloudflare Pages Functions, D1 (SQL), R2 (media), and KV (sessions/cache).

> **Build status:** Phase 1 (Foundation) is complete and verified — project scaffold, design
> system, full D1 schema + migrations + seed, admin authentication, security middleware, and
> the admin + storefront application shells. Phases 2–6 (catalog, commerce, marketing/content,
> operations, hardening) build on this foundation. See [Roadmap](#roadmap).

---

## Table of contents

- [Features](#features)
- [Architecture](#architecture)
- [Technology stack](#technology-stack)
- [Folder structure](#folder-structure)
- [Requirements](#requirements)
- [Quick start (local)](#quick-start-local)
- [Environment variables](#environment-variables)
- [Cloudflare setup](#cloudflare-setup)
- [Database migrations & seed](#database-migrations--seed)
- [Available scripts](#available-scripts)
- [Creating the first administrator](#creating-the-first-administrator)
- [Payment & email configuration](#payment--email-configuration)
- [Deployment](#deployment)
- [Custom domains](#custom-domains)
- [Backup & restore](#backup--restore)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)

---

## Features

**Delivered (Phase 1)**

- Single Cloudflare Pages project serving a React SPA + Pages Functions API.
- Original **Atlase** design system ("Indigo & Amber") built on Bootstrap 5 utilities + CSS
  variables, light mode with dark-mode scaffolding, WCAG-minded focus/skip-link handling.
- Complete, normalized **D1 schema** (~60 tables) with generated migrations and a dev seed.
- **Secure admin authentication**: first-run setup flow (no hardcoded password), PBKDF2 password
  hashing (Web Crypto), HttpOnly + SameSite session cookies, CSRF double-submit, login rate
  limiting + progressive lockout, password reset, "log out everywhere".
- Server-side authorization on every `/api/admin/*` route (client guard is defense-in-depth only).
- Admin shell: responsive sidebar with the full navigation IA, sticky topbar, offcanvas mobile nav.
- **Dashboard wired to live D1 data** (gross sales, orders, AOV, new customers, sales-over-time
  chart, recent orders, low stock) with loading / error / empty / populated states.
- Storefront shell (header, footer, homepage) driven by store settings + menus from D1.
- Consistent API envelope, request IDs, JSON 404s, security headers, and SPA fallback routing.

**Planned (Phases 2–6):** products & variants, inventory, cart, server-authoritative checkout,
orders, shipping, COD/manual payments, discounts, loyalty, blog/pages/media, homepage editor,
analytics, notifications, payment/courier adapters, audit logs, and full test/hardening passes.

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detail. In brief:

- **Frontend** — React + TypeScript + Vite SPA. `/admin/*` is the private dashboard (noindex,
  server-authorized); everything else is the public storefront.
- **API** — Cloudflare Pages Functions under `functions/`, one file per route, with a root
  `_middleware.ts` (request id, error boundary, security headers) and a scoped
  `api/admin/_middleware.ts` (session + CSRF enforcement).
- **Data** — D1 via Drizzle ORM is the single source of truth. R2 stores all binary media
  (D1 holds only metadata). KV holds sessions, rate-limit counters, and short-lived tokens.
- **Money** — always integer minor units (centavos); all pricing/totals computed server-side.

## Technology stack

React 18 · TypeScript (strict) · Vite 6 · React Router 6 · Bootstrap 5 + Bootstrap Icons ·
React Hook Form + Zod · TanStack Query & Table · Recharts · dnd-kit · TipTap · date-fns · clsx ·
Cloudflare Pages / Functions / D1 / R2 / KV · Drizzle ORM · Wrangler · ESLint · Prettier ·
Vitest + Testing Library · Playwright.

## Folder structure

```
atlase/
├── functions/            # Cloudflare Pages Functions (API)
│   ├── api/              # /api/* route handlers (auth, admin, storefront, ...)
│   ├── lib/              # runtime lib: db, crypto, sessions, csrf, response, email, ...
│   └── _middleware.ts    # request id + error boundary + security headers
├── migrations/           # generated D1 SQL migrations
├── public/               # static assets, _headers, _redirects, favicon
├── scripts/              # seed.ts, reset-local-db.ts
├── shared/               # code shared by client + server
│   ├── api/             # response envelope types
│   ├── constants/       # status enums, error codes, locale defaults
│   ├── db/schema/       # Drizzle schema (source of truth for migrations)
│   └── utils/           # money, slug helpers
├── src/                  # React app
│   ├── app/             # App root, router, route guards
│   ├── components/      # admin, storefront, common, feedback components
│   ├── features/        # auth, storefront hooks/providers
│   ├── layouts/         # AdminLayout, StorefrontLayout, AuthLayout
│   ├── lib/             # api client, query client, formatting
│   ├── pages/           # admin + storefront pages
│   └── styles/          # design tokens + global SCSS
├── tests/                # unit / component / e2e
├── drizzle.config.ts · vite.config.ts · wrangler.toml · tsconfig*.json
```

## Requirements

- **Node.js 20+** and npm
- A **Cloudflare account** (for D1/R2/KV and Pages) — only needed for remote/deploy; local dev
  runs entirely on Miniflare.

## Quick start (local)

```bash
npm install                 # install dependencies
cp .dev.vars.example .dev.vars   # local secrets (dev placeholders are fine to start)
npm run db:generate         # generate migration SQL from the schema (already committed)
npm run db:migrate:local    # apply migrations to the local D1
npm run db:seed:local       # seed example catalog, settings, an example order
npm run dev                 # start Pages Functions + Vite (http://localhost:8788)
```

Then open `http://localhost:8788`. Visit `/admin` and you'll be routed to the one-time
**setup** screen to create your administrator account.

> `npm run dev` uses `wrangler pages dev` to serve the API + bindings and proxy Vite for HMR.
> For pure frontend work you can also run `npm run dev:client` (Vite only, no API).

## Environment variables

Two files, both git-ignored (examples are committed):

- **`.dev.vars`** — server-side secrets for local `wrangler pages dev` (copy from
  `.dev.vars.example`). In production set these with `wrangler pages secret put <NAME>` or in the
  dashboard. Includes `SESSION_SECRET`, `CSRF_SECRET`, `CART_TOKEN_SECRET`, and optional
  email/payment/courier provider keys.
- **`.env`** — build-time public vars (`VITE_*` only) exposed to the client bundle. Never put
  secrets here.

No secrets are ever bundled into the frontend.

## Cloudflare setup

Create the resources, then paste the returned ids into `wrangler.toml`:

```bash
# D1 database
wrangler d1 create atlase-db
#  -> copy "database_id" into wrangler.toml [[d1_databases]]

# R2 buckets (production + preview)
wrangler r2 bucket create atlase-media
wrangler r2 bucket create atlase-media-preview

# KV namespace (sessions / rate limits / short-lived tokens)
wrangler kv namespace create CACHE
#  -> copy the id (and a preview id) into wrangler.toml [[kv_namespaces]]
```

Binding names used by the app: **`DB`** (D1), **`MEDIA_BUCKET`** (R2), **`CACHE`** (KV).
Mirror these bindings in the Pages project dashboard (Settings → Functions → Bindings) for both
Production and Preview.

## Database migrations & seed

```bash
npm run db:generate         # regenerate SQL after editing shared/db/schema/*
npm run db:migrate:local    # apply to local D1
npm run db:migrate:remote   # apply to remote D1
npm run db:seed:local       # seed local dev data
npm run db:reset:local      # wipe local D1, re-migrate, re-seed
```

Migrations are generated by Drizzle Kit from `shared/db/schema` and **applied by Wrangler**.
Seed data is development-only and clearly separated from production (it never creates an admin).

## Available scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Pages Functions + Vite dev server (full stack) |
| `npm run dev:client` | Vite only (frontend, no API) |
| `npm run typecheck` | `tsc` for both the app and Functions |
| `npm run lint` / `lint:fix` | ESLint (zero-warning policy) |
| `npm run format` | Prettier write |
| `npm run test` / `test:watch` | Vitest unit/component tests |
| `npm run test:e2e` | Playwright end-to-end tests |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Build, then serve with Wrangler (API + static) |
| `npm run db:*` | Migrations / seed / reset (see above) |
| `npm run deploy` | Build + `wrangler pages deploy ./dist` |

## Creating the first administrator

There is **no default password**. On first run, the app detects that no admin exists and routes
`/admin` to a secure setup screen (`POST /api/auth/admin/setup`) where you set the owner's name,
email, and password (minimum 10 characters). Once created, setup is permanently locked. Use
`/admin/forgot-password` to reset via an emailed, single-use, expiring token.

## Payment & email configuration

- **Payments** — COD and manual bank transfer work with no configuration. Gateway providers
  (PayMongo, Stripe, PayPal, Maya) are wired through a provider abstraction in later phases; set
  the relevant keys in `.dev.vars` / Pages secrets and select the provider via `PAYMENT_PROVIDER`.
- **Email** — defaults to the `console` provider (logs to the worker console) so local dev needs
  no email account. Set `EMAIL_PROVIDER` + `EMAIL_API_KEY` (Resend/Postmark/SendGrid) for real
  delivery. Email never blocks order creation; failures are logged to `notification_logs`.

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md). Summary (Git integration):

1. Push the repo to GitHub/GitLab.
2. Create a Cloudflare Pages project from the repo. Production branch: `main`.
3. Build command: `npm run build` · Output directory: `dist`.
4. Add D1/R2/KV bindings and environment variables for Production and Preview.
5. Apply remote migrations: `npm run db:migrate:remote`.
6. Deploy (automatic on push, or `npm run deploy`).

## Custom domains

In the Pages project → Custom domains, add your domain (e.g. `atlase.ph`) and follow the DNS
instructions. Cloudflare provisions HTTPS automatically. Set the canonical domain in
`Settings → SEO` once that module lands.

## Backup & restore

- **D1**: `wrangler d1 export atlase-db --remote --output backup.sql` to export; restore into a
  fresh database with `wrangler d1 execute atlase-db --remote --file backup.sql`. Schedule regular
  exports.
- **R2**: media is durable in R2; use bucket lifecycle rules and/or periodic `rclone`/`wrangler
  r2` syncs for off-site copies. D1 stores only object keys, so keep D1 + R2 backups in step.

## Troubleshooting

- **`Missing required secret "SESSION_SECRET"`** — copy `.dev.vars.example` to `.dev.vars`.
- **Migrations "no such table"** — run `npm run db:migrate:local` before seeding/dev.
- **`/api/*` returns HTML** — ensure you're hitting the Pages Functions server (`npm run dev` /
  `npm run preview`), not `dev:client` (Vite only, no API).
- **Deep links 404 in production** — confirm `public/_redirects` is deployed (SPA fallback).
- **Wrangler out-of-date warning** — harmless; upgrade with `npm i -D wrangler@latest` when ready.

## Roadmap

| Phase | Scope | Status |
| --- | --- | --- |
| 1 | Foundation: scaffold, design system, schema, auth, shells | ✅ Complete & verified |
| 2 | Catalog: products, variants, categories, collections, inventory, media, public catalog | ⏳ Next |
| 3 | Commerce: cart, checkout, customers, orders, shipping, COD/manual payments | Planned |
| 4 | Marketing & content: discounts, loyalty, blog, pages, media library, homepage editor | Planned |
| 5 | Operations: analytics, notifications, integrations, provider adapters, audit logs | Planned |
| 6 | Hardening: security, a11y, performance, tests, deployment | Planned |

Additional docs: [ARCHITECTURE.md](./ARCHITECTURE.md) · [DATABASE.md](./DATABASE.md) ·
[DEPLOYMENT.md](./DEPLOYMENT.md) · [SECURITY.md](./SECURITY.md) · [API.md](./API.md).
