# Deployment

Atlase deploys as a single **Cloudflare Pages** project (SPA + Functions).

## 1. Provision resources

```bash
wrangler d1 create atlase-db
wrangler r2 bucket create atlase-media
wrangler r2 bucket create atlase-media-preview
wrangler kv namespace create CACHE
wrangler kv namespace create CACHE --preview
```

Copy the returned ids into `wrangler.toml` (D1 `database_id`, KV `id`/`preview_id`). Binding names
must remain `DB`, `MEDIA_BUCKET`, `CACHE`.

## 2. Create the Pages project (Git integration — recommended)

1. Push the repo to GitHub/GitLab.
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
3. Settings:
   - **Production branch**: `main`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - Functions are deployed automatically from `functions/`.
4. **Bindings** (Settings → Functions → Bindings) — add for **both Production and Preview**:
   - D1: `DB` → `atlase-db`
   - R2: `MEDIA_BUCKET` → `atlase-media` (preview → `atlase-media-preview`)
   - KV: `CACHE` → your namespace
5. **Environment variables / secrets** (Settings → Environment variables):
   - Secrets: `SESSION_SECRET`, `CSRF_SECRET`, `CART_TOKEN_SECRET` (32+ random chars each), plus
     any provider keys you use (`EMAIL_*`, `PAYMONGO_*`, `STRIPE_*`, courier keys).
   - Vars: `ENVIRONMENT=production`, `PUBLIC_BASE_URL=https://your-domain`.

Generate secrets with `openssl rand -hex 32`.

## 3. Apply remote migrations

```bash
npm run db:migrate:remote
```

Do **not** run the dev seed against production. Create the admin via the setup screen on first
visit to `/admin`.

## 4. Deploy

- **Git integration**: every push to `main` builds and deploys production; PRs get preview
  deployments.
- **Direct**: `npm run deploy` (runs `vite build` then `wrangler pages deploy ./dist`).

## 5. First run

Visit `https://your-domain/admin` → complete the one-time administrator setup.

## CLI-only alternative

```bash
npm run build
wrangler pages deploy ./dist --project-name atlase
```

## Pre-deploy checklist

```bash
npm run typecheck && npm run lint && npm run test && npm run build
```

## Notes

- `public/_redirects` provides SPA fallback; `/api/*` and static assets are matched before it.
- `public/_headers` applies production security headers + caching to static assets (immutable for
  `/assets/*`, no-cache for `index.html`). API responses set their own headers in middleware.
- Preview deployments should use the preview D1/R2/KV so tests never touch production data.
