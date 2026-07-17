import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Fn } from '../../../lib/env';
import { getDb, schema } from '../../../lib/db';
import { randomToken, sha256Hex } from '../../../lib/crypto';
import { parseJsonBody } from '../../../lib/validation';
import { ok, fail } from '../../../lib/response';
import { getClientIp } from '../../../lib/http';
import { rateLimit } from '../../../lib/rateLimit';
import { sendEmail } from '../../../lib/email';
import { ERROR_CODES } from '../../../lib/shared';

const schemaBody = z.object({ email: z.string().trim().email().max(200) });
const RESET_TTL_SECONDS = 60 * 60; // 1 hour

/**
 * Issue a password-reset token. Always returns success to avoid leaking whether
 * an account exists. The raw token is emailed; only its hash is stored.
 */
export const onRequestPost: Fn = async ({ request, env, data }) => {
  const ip = getClientIp(request);
  const limit = await rateLimit(env, `forgot:${ip ?? 'unknown'}`, 5, 3600);
  if (!limit.allowed) {
    return fail(429, { code: ERROR_CODES.RATE_LIMITED, message: 'Too many requests.' }, { requestId: data.requestId });
  }

  const { email } = await parseJsonBody(request, schemaBody);
  const db = getDb(env);
  const rows = await db
    .select({ id: schema.adminUsers.id, name: schema.adminUsers.name })
    .from(schema.adminUsers)
    .where(eq(schema.adminUsers.email, email.toLowerCase()))
    .limit(1);
  const user = rows[0];

  if (user) {
    const token = randomToken(32);
    const tokenHash = await sha256Hex(token);
    await db.insert(schema.passwordResetTokens).values({
      adminUserId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + RESET_TTL_SECONDS * 1000),
    });

    const baseUrl = env.PUBLIC_BASE_URL ?? new URL(request.url).origin;
    const link = `${baseUrl}/admin/reset-password?token=${token}`;
    await sendEmail(env, {
      to: email,
      subject: 'Reset your Atlase admin password',
      templateKey: 'admin_password_reset',
      html: `<p>Hi ${user.name},</p><p>Use the link below to reset your password. It expires in 1 hour.</p><p><a href="${link}">Reset password</a></p><p>If you didn't request this, you can ignore this email.</p>`,
      text: `Reset your password: ${link}`,
    });
  }

  return ok(
    { message: 'If an account exists for that email, a reset link has been sent.' },
    { requestId: data.requestId },
  );
};
