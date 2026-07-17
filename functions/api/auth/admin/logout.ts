import { eq, sql } from 'drizzle-orm';
import type { Fn } from '../../../lib/env';
import { getDb, schema } from '../../../lib/db';
import { getAdminSession, destroyAdminSession, clearAdminSessionCookie } from '../../../lib/session';
import { getCookie, ADMIN_SESSION_COOKIE } from '../../../lib/cookies';
import { ok } from '../../../lib/response';
import { writeAudit } from '../../../lib/audit';
import { getClientIp } from '../../../lib/http';

/**
 * Log out. `{ allDevices: true }` bumps the admin's session epoch, invalidating
 * every existing session everywhere. CSRF is not required here since logging out
 * an attacker-forged request only ends a session (fail-safe).
 */
export const onRequestPost: Fn = async ({ request, env, data }) => {
  const sessionId = getCookie(request, ADMIN_SESSION_COOKIE);
  const ctx = await getAdminSession(env, sessionId);

  let allDevices = false;
  try {
    const body = (await request.json()) as { allDevices?: boolean };
    allDevices = body?.allDevices === true;
  } catch {
    // no body — single-session logout
  }

  if (ctx) {
    const db = getDb(env);
    if (allDevices) {
      await db
        .update(schema.adminUsers)
        .set({ sessionEpoch: sql`session_epoch + 1`, updatedAt: new Date() })
        .where(eq(schema.adminUsers.id, ctx.admin.id));
      await db.delete(schema.adminSessions).where(eq(schema.adminSessions.adminUserId, ctx.admin.id));
    } else if (sessionId) {
      await destroyAdminSession(env, sessionId);
    }
    await writeAudit(env, {
      actorType: 'admin',
      actorId: ctx.admin.id,
      action: allDevices ? 'admin.logout_all' : 'admin.logout',
      ip: getClientIp(request),
    });
  }

  return ok({ success: true }, { requestId: data.requestId }, 200, {
    'Set-Cookie': clearAdminSessionCookie(env),
  });
};
