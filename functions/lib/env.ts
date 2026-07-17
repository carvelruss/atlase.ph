/// <reference types="@cloudflare/workers-types" />

/** Cloudflare bindings + environment variables available to Pages Functions. */
export interface Env {
  // Bindings (wrangler.toml)
  DB: D1Database;
  MEDIA_BUCKET: R2Bucket;
  CACHE: KVNamespace;

  // Public (non-secret) vars
  ENVIRONMENT?: string;
  PUBLIC_STORE_NAME?: string;
  PUBLIC_CURRENCY?: string;
  PUBLIC_LOCALE?: string;
  PUBLIC_BASE_URL?: string;

  // Secrets (.dev.vars locally, `wrangler pages secret put` in prod)
  SESSION_SECRET?: string;
  CSRF_SECRET?: string;
  CART_TOKEN_SECRET?: string;

  EMAIL_PROVIDER?: string;
  EMAIL_API_KEY?: string;
  EMAIL_FROM?: string;

  PAYMENT_PROVIDER?: string;
  PAYMONGO_SECRET_KEY?: string;
  PAYMONGO_WEBHOOK_SECRET?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;

  SHIPPO_API_KEY?: string;
  JT_API_KEY?: string;
  NINJAVAN_CLIENT_ID?: string;
  NINJAVAN_CLIENT_SECRET?: string;
}

/** Data attached to the request context by middleware and consumed by handlers. */
export interface RequestData extends Record<string, unknown> {
  requestId: string;
  admin?: { id: number; email: string; name: string; sessionId: string };
}

/** Convenience alias for typed Pages Functions in this project. */
export type Fn = PagesFunction<Env, string, RequestData>;

export function isProduction(env: Env): boolean {
  return (env.ENVIRONMENT ?? 'production') === 'production';
}

/** Read a required secret, throwing a clear error if it is missing. */
export function requireSecret(env: Env, name: keyof Env): string {
  const value = env[name];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(
      `Missing required secret "${String(name)}". Set it in .dev.vars (local) or via ` +
        `\`wrangler pages secret put ${String(name)}\` (production).`,
    );
  }
  return value;
}
