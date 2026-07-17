import { sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Fn } from '../../../lib/env';
import { getDb, schema } from '../../../lib/db';
import { hashPassword } from '../../../lib/crypto';
import { createAdminSession } from '../../../lib/session';
import { parseJsonBody } from '../../../lib/validation';
import { ok, fail } from '../../../lib/response';
import { getClientIp, getUserAgent } from '../../../lib/http';
import { rateLimit } from '../../../lib/rateLimit';
import { writeAudit } from '../../../lib/audit';
import { ERROR_CODES } from '../../../lib/shared';

const setupSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  password: z.string().min(10, 'Password must be at least 10 characters.').max(200),
});

/** Returns whether initial setup is still required (no admin exists yet). */
export const onRequestGet: Fn = async ({ env, data }) => {
  const db = getDb(env);
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(schema.adminUsers);
  return ok({ setupRequired: count === 0 }, { requestId: data.requestId });
};

/** One-time creation of the single store administrator. Blocked once one exists. */
export const onRequestPost: Fn = async ({ request, env, data }) => {
  const ip = getClientIp(request);
  const limit = await rateLimit(env, `setup:${ip ?? 'unknown'}`, 5, 3600);
  if (!limit.allowed) {
    return fail(429, { code: ERROR_CODES.RATE_LIMITED, message: 'Too many attempts.' }, { requestId: data.requestId });
  }

  const db = getDb(env);
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(schema.adminUsers);
  if (count > 0) {
    return fail(
      409,
      { code: ERROR_CODES.SETUP_COMPLETE, message: 'Setup has already been completed.' },
      { requestId: data.requestId },
    );
  }

  const input = await parseJsonBody(request, setupSchema);
  const { hash, salt } = await hashPassword(input.password);

  const inserted = await db
    .insert(schema.adminUsers)
    .values({
      email: input.email.toLowerCase(),
      name: input.name,
      passwordHash: hash,
      passwordSalt: salt,
      role: 'owner',
      passwordChangedAt: new Date(),
    })
    .returning({ id: schema.adminUsers.id, email: schema.adminUsers.email, name: schema.adminUsers.name });

  const admin = inserted[0];
  if (!admin) {
    return fail(500, { code: ERROR_CODES.INTERNAL, message: 'Could not create administrator.' }, { requestId: data.requestId });
  }

  const session = await createAdminSession(env, admin.id, {
    ip,
    userAgent: getUserAgent(request),
    sessionEpoch: 0,
  });

  await writeAudit(env, {
    actorType: 'admin',
    actorId: admin.id,
    action: 'admin.setup',
    entityType: 'admin_user',
    entityId: admin.id,
    ip,
  });

  return ok(
    { admin, csrfToken: session.csrfToken },
    { requestId: data.requestId },
    201,
    { 'Set-Cookie': session.cookie },
  );
};
