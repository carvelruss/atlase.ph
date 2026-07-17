import { sql } from 'drizzle-orm';
import type { Fn } from '../../../lib/env';
import { getDb, schema } from '../../../lib/db';
import { getAdminSession } from '../../../lib/session';
import { getCookie, ADMIN_SESSION_COOKIE } from '../../../lib/cookies';
import { ok } from '../../../lib/response';

/** Bootstrap endpoint: reports auth state (and whether first-run setup is needed). */
export const onRequestGet: Fn = async ({ request, env, data }) => {
  const sessionId = getCookie(request, ADMIN_SESSION_COOKIE);
  const ctx = await getAdminSession(env, sessionId);

  if (ctx) {
    return ok(
      { authenticated: true, admin: ctx.admin, csrfToken: ctx.session.csrfToken },
      { requestId: data.requestId },
    );
  }

  const db = getDb(env);
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(schema.adminUsers);
  return ok(
    { authenticated: false, setupRequired: count === 0 },
    { requestId: data.requestId },
  );
};
