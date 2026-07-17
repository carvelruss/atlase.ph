import { sql } from 'drizzle-orm';
import type { Fn } from '../lib/env';
import { getDb } from '../lib/db';
import { ok, fail } from '../lib/response';
import { ERROR_CODES } from '../lib/shared';

/** Liveness + D1 connectivity probe. */
export const onRequestGet: Fn = async ({ env, data }) => {
  try {
    const db = getDb(env);
    await db.run(sql`SELECT 1`);
    return ok(
      { status: 'ok', environment: env.ENVIRONMENT ?? 'production' },
      { requestId: data.requestId },
    );
  } catch (err) {
    console.error('Health check failed:', err);
    return fail(503, { code: ERROR_CODES.INTERNAL, message: 'Database unavailable.' }, { requestId: data.requestId });
  }
};
