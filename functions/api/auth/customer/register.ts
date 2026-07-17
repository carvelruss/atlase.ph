import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Fn } from '../../../lib/env';
import { getDb, schema } from '../../../lib/db';
import { hashPassword } from '../../../lib/crypto';
import { createCustomerSession } from '../../../lib/customerSession';
import { parseJsonBody } from '../../../lib/validation';
import { ok, fail } from '../../../lib/response';
import { getClientIp, getUserAgent } from '../../../lib/http';
import { rateLimit } from '../../../lib/rateLimit';
import { ERROR_CODES } from '../../../lib/shared';

const bodySchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8, 'Use at least 8 characters.').max(200),
  firstName: z.string().max(80).optional(),
  lastName: z.string().max(80).optional(),
  phone: z.string().max(40).optional(),
  marketingConsent: z.boolean().optional(),
});

export const onRequestPost: Fn = async ({ request, env, data }) => {
  const ip = getClientIp(request);
  const limit = await rateLimit(env, `register:${ip ?? 'unknown'}`, 10, 3600);
  if (!limit.allowed) return fail(429, { code: ERROR_CODES.RATE_LIMITED, message: 'Too many attempts.' }, { requestId: data.requestId });

  const input = await parseJsonBody(request, bodySchema);
  const email = input.email.toLowerCase();
  const db = getDb(env);
  const { hash, salt } = await hashPassword(input.password);

  const existing = await db.select().from(schema.customers).where(eq(schema.customers.email, email)).limit(1);
  let customerId: number;

  if (existing[0]) {
    if (existing[0].passwordHash) {
      return fail(409, { code: ERROR_CODES.CONFLICT, message: 'An account with that email already exists. Please sign in.' }, { requestId: data.requestId });
    }
    // Upgrade an existing guest into a full account.
    await db.update(schema.customers).set({
      passwordHash: hash,
      passwordSalt: salt,
      isGuest: false,
      firstName: input.firstName ?? existing[0].firstName,
      lastName: input.lastName ?? existing[0].lastName,
      phone: input.phone ?? existing[0].phone,
      marketingConsent: input.marketingConsent ?? existing[0].marketingConsent,
      updatedAt: new Date(),
    }).where(eq(schema.customers.id, existing[0].id));
    customerId = existing[0].id;
  } else {
    const [c] = await db.insert(schema.customers).values({
      email,
      passwordHash: hash,
      passwordSalt: salt,
      isGuest: false,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      phone: input.phone ?? null,
      marketingConsent: input.marketingConsent ?? false,
    }).returning({ id: schema.customers.id });
    customerId = c!.id;
  }

  const session = await createCustomerSession(env, customerId, ip, getUserAgent(request));
  return ok(
    { customer: { id: customerId, email, firstName: input.firstName ?? null, lastName: input.lastName ?? null }, csrfToken: session.csrfToken },
    { requestId: data.requestId },
    201,
    { 'Set-Cookie': session.cookie },
  );
};
