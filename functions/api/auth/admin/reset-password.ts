import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Fn } from '../../../lib/env';
import { getDb, schema } from '../../../lib/db';
import { hashPassword, sha256Hex } from '../../../lib/crypto';
import { parseJsonBody } from '../../../lib/validation';
import { ok, fail } from '../../../lib/response';
import { getClientIp } from '../../../lib/http';
import { rateLimit } from '../../../lib/rateLimit';
import { writeAudit } from '../../../lib/audit';
import { ERROR_CODES } from '../../../lib/shared';

const bodySchema = z.object({
  token: z.string().min(10).max(200),
  password: z.string().min(10, 'Password must be at least 10 characters.').max(200),
});

export const onRequestPost: Fn = async ({ request, env, data }) => {
  const ip = getClientIp(request);
  const limit = await rateLimit(env, `reset:${ip ?? 'unknown'}`, 10, 3600);
  if (!limit.allowed) {
    return fail(429, { code: ERROR_CODES.RATE_LIMITED, message: 'Too many requests.' }, { requestId: data.requestId });
  }

  const input = await parseJsonBody(request, bodySchema);
  const tokenHash = await sha256Hex(input.token);
  const db = getDb(env);

  const rows = await db
    .select()
    .from(schema.passwordResetTokens)
    .where(
      and(
        eq(schema.passwordResetTokens.tokenHash, tokenHash),
        isNull(schema.passwordResetTokens.usedAt),
        gt(schema.passwordResetTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);
  const resetRow = rows[0];

  if (!resetRow) {
    return fail(
      400,
      { code: ERROR_CODES.VALIDATION_ERROR, message: 'This reset link is invalid or has expired.' },
      { requestId: data.requestId },
    );
  }

  const { hash, salt } = await hashPassword(input.password);

  // Update password, bump session epoch (kills all sessions), consume the token.
  await db
    .update(schema.adminUsers)
    .set({
      passwordHash: hash,
      passwordSalt: salt,
      passwordChangedAt: new Date(),
      sessionEpoch: sql`session_epoch + 1`,
      updatedAt: new Date(),
    })
    .where(eq(schema.adminUsers.id, resetRow.adminUserId));

  await db
    .update(schema.passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(schema.passwordResetTokens.id, resetRow.id));

  await db
    .delete(schema.adminSessions)
    .where(eq(schema.adminSessions.adminUserId, resetRow.adminUserId));

  await writeAudit(env, {
    actorType: 'admin',
    actorId: resetRow.adminUserId,
    action: 'admin.password_reset',
    entityType: 'admin_user',
    entityId: resetRow.adminUserId,
    ip,
  });

  return ok(
    { message: 'Your password has been reset. Please sign in.' },
    { requestId: data.requestId },
  );
};
