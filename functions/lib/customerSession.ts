import { eq } from 'drizzle-orm';
import { customerSessions, customers } from '../../shared/db/schema/index';
import { getDb } from './db';
import { randomToken } from './crypto';
import { CUSTOMER_SESSION_COOKIE, serializeCookie } from './cookies';
import { isProduction, type Env } from './env';

const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface CustomerSessionContext {
  customer: { id: number; email: string; firstName: string | null; lastName: string | null };
  session: { id: string; csrfToken: string };
}

export async function createCustomerSession(env: Env, customerId: number, ip: string | null, userAgent: string | null) {
  const db = getDb(env);
  const id = randomToken(32);
  const csrfToken = randomToken(24);
  await db.insert(customerSessions).values({
    id,
    customerId,
    csrfToken,
    ip,
    userAgent,
    expiresAt: new Date(Date.now() + TTL_SECONDS * 1000),
  });
  const cookie = serializeCookie(CUSTOMER_SESSION_COOKIE, id, {
    maxAge: TTL_SECONDS,
    httpOnly: true,
    secure: isProduction(env),
    sameSite: 'Lax',
  });
  return { sessionId: id, csrfToken, cookie };
}

export async function getCustomerSession(env: Env, sessionId: string | undefined): Promise<CustomerSessionContext | null> {
  if (!sessionId) return null;
  const db = getDb(env);
  const rows = await db
    .select({
      sessionId: customerSessions.id,
      csrfToken: customerSessions.csrfToken,
      expiresAt: customerSessions.expiresAt,
      id: customers.id,
      email: customers.email,
      firstName: customers.firstName,
      lastName: customers.lastName,
      status: customers.status,
    })
    .from(customerSessions)
    .innerJoin(customers, eq(customers.id, customerSessions.customerId))
    .where(eq(customerSessions.id, sessionId))
    .limit(1);
  const s = rows[0];
  if (!s) return null;
  if (s.expiresAt.getTime() < Date.now() || s.status !== 'active') {
    await db.delete(customerSessions).where(eq(customerSessions.id, sessionId));
    return null;
  }
  return {
    customer: { id: s.id, email: s.email, firstName: s.firstName, lastName: s.lastName },
    session: { id: s.sessionId, csrfToken: s.csrfToken },
  };
}

export async function destroyCustomerSession(env: Env, sessionId: string) {
  const db = getDb(env);
  await db.delete(customerSessions).where(eq(customerSessions.id, sessionId));
}

export function clearCustomerSessionCookie(env: Env): string {
  return serializeCookie(CUSTOMER_SESSION_COOKIE, '', { maxAge: 0, httpOnly: true, secure: isProduction(env), sameSite: 'Lax' });
}
