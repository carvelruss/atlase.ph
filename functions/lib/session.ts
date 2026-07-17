import { eq } from 'drizzle-orm';
import { adminSessions, adminUsers } from '../../shared/db/schema/index';
import { getDb } from './db';
import { randomToken } from './crypto';
import { ADMIN_SESSION_COOKIE, serializeCookie } from './cookies';
import { isProduction, type Env } from './env';

const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours
const REMEMBER_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface AdminSessionContext {
  admin: { id: number; email: string; name: string };
  session: { id: string; csrfToken: string };
}

export async function createAdminSession(
  env: Env,
  adminUserId: number,
  opts: { rememberMe?: boolean; ip?: string | null; userAgent?: string | null; sessionEpoch: number },
): Promise<{ sessionId: string; csrfToken: string; cookie: string }> {
  const db = getDb(env);
  const sessionId = randomToken(32);
  const csrfToken = randomToken(24);
  const ttl = opts.rememberMe ? REMEMBER_TTL_SECONDS : SESSION_TTL_SECONDS;
  const expiresAt = new Date(Date.now() + ttl * 1000);

  await db.insert(adminSessions).values({
    id: sessionId,
    adminUserId,
    sessionEpoch: opts.sessionEpoch,
    csrfToken,
    userAgent: opts.userAgent ?? null,
    ip: opts.ip ?? null,
    rememberMe: opts.rememberMe ?? false,
    expiresAt,
    lastSeenAt: new Date(),
  });

  const cookie = serializeCookie(ADMIN_SESSION_COOKIE, sessionId, {
    maxAge: ttl,
    httpOnly: true,
    secure: isProduction(env),
    sameSite: 'Lax',
  });

  return { sessionId, csrfToken, cookie };
}

/** Resolve and validate the admin session from the request cookie. */
export async function getAdminSession(
  env: Env,
  sessionId: string | undefined,
): Promise<AdminSessionContext | null> {
  if (!sessionId) return null;
  const db = getDb(env);

  const row = await db
    .select({
      sessionId: adminSessions.id,
      csrfToken: adminSessions.csrfToken,
      expiresAt: adminSessions.expiresAt,
      sessionEpoch: adminSessions.sessionEpoch,
      adminId: adminUsers.id,
      email: adminUsers.email,
      name: adminUsers.name,
      isActive: adminUsers.isActive,
      currentEpoch: adminUsers.sessionEpoch,
    })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminSessions.adminUserId, adminUsers.id))
    .where(eq(adminSessions.id, sessionId))
    .limit(1);

  const session = row[0];
  if (!session) return null;

  const expired = session.expiresAt.getTime() < Date.now();
  const revoked = session.sessionEpoch !== session.currentEpoch;
  if (expired || revoked || !session.isActive) {
    await db.delete(adminSessions).where(eq(adminSessions.id, sessionId));
    return null;
  }

  return {
    admin: { id: session.adminId, email: session.email, name: session.name },
    session: { id: session.sessionId, csrfToken: session.csrfToken },
  };
}

export async function destroyAdminSession(env: Env, sessionId: string): Promise<void> {
  const db = getDb(env);
  await db.delete(adminSessions).where(eq(adminSessions.id, sessionId));
}

export function clearAdminSessionCookie(env: Env): string {
  return serializeCookie(ADMIN_SESSION_COOKIE, '', {
    maxAge: 0,
    httpOnly: true,
    secure: isProduction(env),
    sameSite: 'Lax',
  });
}
