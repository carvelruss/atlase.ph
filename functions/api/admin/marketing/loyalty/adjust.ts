import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Fn } from '../../../../lib/env';
import { getDb, schema } from '../../../../lib/db';
import { parseJsonBody } from '../../../../lib/validation';
import { ok } from '../../../../lib/response';
import { badRequest, notFound } from '../../../../lib/errors';
import { writeAudit } from '../../../../lib/audit';

const bodySchema = z.object({
  customerId: z.number().int().positive(),
  delta: z.number().int(),
  note: z.string().max(300).nullable().optional(),
});

/** Manually adjust a customer's loyalty balance (creating an account if needed). */
export const onRequestPost: Fn = async ({ request, env, data }) => {
  const input = await parseJsonBody(request, bodySchema);
  if (input.delta === 0) throw badRequest('Enter a non-zero amount.');
  const db = getDb(env);

  const customer = await db.select({ id: schema.customers.id }).from(schema.customers).where(eq(schema.customers.id, input.customerId)).limit(1);
  if (!customer[0]) throw notFound('Customer not found.');

  const existing = await db.select().from(schema.loyaltyAccounts).where(eq(schema.loyaltyAccounts.customerId, input.customerId)).limit(1);
  let accountId: number;
  if (existing[0]) {
    accountId = existing[0].id;
    if (existing[0].balance + input.delta < 0) throw badRequest('Adjustment would make the balance negative.');
    await db
      .update(schema.loyaltyAccounts)
      .set({
        balance: sql`${schema.loyaltyAccounts.balance} + ${input.delta}`,
        lifetimeEarned: input.delta > 0 ? sql`${schema.loyaltyAccounts.lifetimeEarned} + ${input.delta}` : schema.loyaltyAccounts.lifetimeEarned,
        lifetimeRedeemed: input.delta < 0 ? sql`${schema.loyaltyAccounts.lifetimeRedeemed} + ${-input.delta}` : schema.loyaltyAccounts.lifetimeRedeemed,
        updatedAt: new Date(),
      })
      .where(eq(schema.loyaltyAccounts.id, accountId));
  } else {
    if (input.delta < 0) throw badRequest('Cannot deduct from an empty balance.');
    const [a] = await db.insert(schema.loyaltyAccounts).values({ customerId: input.customerId, balance: input.delta, lifetimeEarned: input.delta }).returning({ id: schema.loyaltyAccounts.id });
    accountId = a!.id;
  }

  await db.insert(schema.loyaltyTransactions).values({ accountId, delta: input.delta, reason: 'manual', note: input.note ?? null });
  await writeAudit(env, { actorId: data.admin?.id ?? null, action: 'loyalty.adjust', entityType: 'loyalty_account', entityId: accountId, metadata: { delta: input.delta } });
  return ok({ accountId }, { requestId: data.requestId });
};
