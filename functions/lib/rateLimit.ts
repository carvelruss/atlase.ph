import { and, eq, gt, sql } from 'drizzle-orm';
import { loginAttempts } from '../../shared/db/schema/index';
import { getDb } from './db';
import type { Env } from './env';

interface WindowState {
  count: number;
  resetAt: number; // epoch ms
}

/**
 * Coarse fixed-window rate limiter backed by KV. Not strictly atomic (KV is
 * eventually consistent) but sufficient for login throttling and abuse control.
 * Returns whether the request is allowed plus remaining budget.
 */
export async function rateLimit(
  env: Env,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number; retryAfter: number }> {
  const now = Date.now();
  const cacheKey = `rl:${key}`;
  const existing = await env.CACHE.get<WindowState>(cacheKey, 'json');

  let state: WindowState;
  if (!existing || existing.resetAt < now) {
    state = { count: 0, resetAt: now + windowSeconds * 1000 };
  } else {
    state = existing;
  }

  state.count += 1;
  const allowed = state.count <= limit;
  const ttl = Math.max(1, Math.ceil((state.resetAt - now) / 1000));
  await env.CACHE.put(cacheKey, JSON.stringify(state), { expirationTtl: ttl });

  return {
    allowed,
    remaining: Math.max(0, limit - state.count),
    retryAfter: allowed ? 0 : ttl,
  };
}

// --- Login-specific tracking (D1 loginAttempts) ------------------------------

export async function recordLoginAttempt(
  env: Env,
  email: string,
  ip: string | null,
  success: boolean,
  userAgent: string | null,
): Promise<void> {
  const db = getDb(env);
  await db.insert(loginAttempts).values({ email: email.toLowerCase(), ip, success, userAgent });
}

/** Count failed login attempts for an email within the given window (seconds). */
export async function countRecentFailures(
  env: Env,
  email: string,
  windowSeconds: number,
): Promise<number> {
  const db = getDb(env);
  const since = new Date(Date.now() - windowSeconds * 1000);
  const rows = await db
    .select({ n: sql<number>`count(*)` })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.email, email.toLowerCase()),
        eq(loginAttempts.success, false),
        gt(loginAttempts.createdAt, since),
      ),
    );
  return rows[0]?.n ?? 0;
}

/** Progressive delay (ms) applied after repeated failures to slow brute force. */
export function progressiveDelayMs(failureCount: number): number {
  if (failureCount <= 2) return 0;
  return Math.min(5000, (failureCount - 2) * 750);
}
