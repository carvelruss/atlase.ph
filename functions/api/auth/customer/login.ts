import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Fn } from '../../../lib/env';
import { getDb, schema } from '../../../lib/db';
import { verifyPassword } from '../../../lib/crypto';
import { createCustomerSession } from '../../../lib/customerSession';
import { parseJsonBody } from '../../../lib/validation';
import { ok, fail } from '../../../lib/response';
import { getClientIp, getUserAgent } from '../../../lib/http';
import { rateLimit } from '../../../lib/rateLimit';
import { ERROR_CODES } from '../../../lib/shared';

const bodySchema = z.object({ email: z.string().email().max(200), password: z.string().min(1).max(200) });

export const onRequestPost: Fn = async ({ request, env, data }) => {
  const ip = getClientIp(request);
  const limit = await rateLimit(env, `customer-login:${ip ?? 'unknown'}`, 20, 900);
  if (!limit.allowed) return fail(429, { code: ERROR_CODES.RATE_LIMITED, message: 'Too many attempts. Try again later.' }, { requestId: data.requestId });

  const input = await parseJsonBody(request, bodySchema);
  const email = input.email.toLowerCase();
  const db = getDb(env);
  const rows = await db.select().from(schema.customers).where(eq(schema.customers.email, email)).limit(1);
  const customer = rows[0];

  const valid = customer != null && customer.passwordHash != null && customer.passwordSalt != null && customer.status === 'active' && (await verifyPassword(input.password, customer.passwordSalt, customer.passwordHash));
  if (!valid || !customer) {
    return fail(401, { code: ERROR_CODES.UNAUTHORIZED, message: 'Incorrect email or password.' }, { requestId: data.requestId });
  }

  await db.update(schema.customers).set({ lastLoginAt: new Date() }).where(eq(schema.customers.id, customer.id));
  const session = await createCustomerSession(env, customer.id, ip, getUserAgent(request));
  return ok(
    { customer: { id: customer.id, email: customer.email, firstName: customer.firstName, lastName: customer.lastName }, csrfToken: session.csrfToken },
    { requestId: data.requestId },
    200,
    { 'Set-Cookie': session.cookie },
  );
};
