import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Fn } from '../../../lib/env';
import { getDb, schema } from '../../../lib/db';
import { verifyPassword } from '../../../lib/crypto';
import { createAdminSession } from '../../../lib/session';
import { parseJsonBody } from '../../../lib/validation';
import { ok, fail } from '../../../lib/response';
import { getClientIp, getUserAgent } from '../../../lib/http';
import {
  rateLimit,
  recordLoginAttempt,
  countRecentFailures,
  progressiveDelayMs,
} from '../../../lib/rateLimit';
import { writeAudit } from '../../../lib/audit';
import { ERROR_CODES } from '../../../lib/shared';

const loginSchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(1).max(200),
  rememberMe: z.boolean().optional(),
});

const LOCKOUT_WINDOW = 15 * 60; // 15 minutes
const LOCKOUT_THRESHOLD = 8;

export const onRequestPost: Fn = async ({ request, env, data }) => {
  const ip = getClientIp(request);
  const userAgent = getUserAgent(request);

  // IP-based coarse limit to blunt distributed guessing.
  const ipLimit = await rateLimit(env, `login-ip:${ip ?? 'unknown'}`, 30, 15 * 60);
  if (!ipLimit.allowed) {
    return fail(
      429,
      { code: ERROR_CODES.RATE_LIMITED, message: 'Too many attempts. Try again later.' },
      { requestId: data.requestId },
      { 'Retry-After': String(ipLimit.retryAfter) },
    );
  }

  const input = await parseJsonBody(request, loginSchema);
  const email = input.email.toLowerCase();

  // Per-account lockout + progressive delay.
  const failures = await countRecentFailures(env, email, LOCKOUT_WINDOW);
  if (failures >= LOCKOUT_THRESHOLD) {
    return fail(
      429,
      {
        code: ERROR_CODES.RATE_LIMITED,
        message: 'Account temporarily locked due to repeated failures. Try again in 15 minutes.',
      },
      { requestId: data.requestId },
    );
  }
  const delay = progressiveDelayMs(failures);
  if (delay > 0) await new Promise((r) => setTimeout(r, delay));

  const db = getDb(env);
  const rows = await db
    .select()
    .from(schema.adminUsers)
    .where(eq(schema.adminUsers.email, email))
    .limit(1);
  const user = rows[0];

  // Constant-ish response regardless of whether the email exists.
  const valid =
    user != null &&
    user.isActive &&
    (await verifyPassword(input.password, user.passwordSalt, user.passwordHash));

  if (!valid || !user) {
    await recordLoginAttempt(env, email, ip, false, userAgent);
    return fail(
      401,
      { code: ERROR_CODES.UNAUTHORIZED, message: 'Incorrect email or password.' },
      { requestId: data.requestId },
    );
  }

  await recordLoginAttempt(env, email, ip, true, userAgent);

  const session = await createAdminSession(env, user.id, {
    rememberMe: input.rememberMe ?? false,
    ip,
    userAgent,
    sessionEpoch: user.sessionEpoch,
  });

  await db
    .update(schema.adminUsers)
    .set({ lastLoginAt: new Date(), lastLoginIp: ip, updatedAt: new Date() })
    .where(eq(schema.adminUsers.id, user.id));

  await writeAudit(env, {
    actorType: 'admin',
    actorId: user.id,
    action: 'admin.login',
    entityType: 'admin_user',
    entityId: user.id,
    ip,
    userAgent,
  });

  return ok(
    {
      admin: { id: user.id, email: user.email, name: user.name },
      csrfToken: session.csrfToken,
    },
    { requestId: data.requestId },
    200,
    { 'Set-Cookie': session.cookie },
  );
};
