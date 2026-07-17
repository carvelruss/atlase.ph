import { desc, eq } from 'drizzle-orm';
import type { Fn } from '../../../../lib/env';
import { getDb, schema } from '../../../../lib/db';
import { ok } from '../../../../lib/response';

/** Loyalty accounts overview (feature foundation). */
export const onRequestGet: Fn = async ({ env, data }) => {
  const db = getDb(env);
  const items = await db
    .select({
      id: schema.loyaltyAccounts.id,
      customerId: schema.loyaltyAccounts.customerId,
      balance: schema.loyaltyAccounts.balance,
      lifetimeEarned: schema.loyaltyAccounts.lifetimeEarned,
      lifetimeRedeemed: schema.loyaltyAccounts.lifetimeRedeemed,
      email: schema.customers.email,
      firstName: schema.customers.firstName,
      lastName: schema.customers.lastName,
    })
    .from(schema.loyaltyAccounts)
    .innerJoin(schema.customers, eq(schema.customers.id, schema.loyaltyAccounts.customerId))
    .orderBy(desc(schema.loyaltyAccounts.balance))
    .limit(200);
  return ok({ items }, { requestId: data.requestId });
};
