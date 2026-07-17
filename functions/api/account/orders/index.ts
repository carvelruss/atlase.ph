import { desc, eq } from 'drizzle-orm';
import type { Fn } from '../../../lib/env';
import { getDb, schema } from '../../../lib/db';
import { ok } from '../../../lib/response';

export const onRequestGet: Fn = async ({ env, data }) => {
  const customerId = data.customer!.id;
  const db = getDb(env);
  const items = await db
    .select({
      id: schema.orders.id,
      orderNumber: schema.orders.orderNumber,
      grandTotal: schema.orders.grandTotal,
      status: schema.orders.status,
      paymentStatus: schema.orders.paymentStatus,
      fulfillmentStatus: schema.orders.fulfillmentStatus,
      createdAt: schema.orders.createdAt,
    })
    .from(schema.orders)
    .where(eq(schema.orders.customerId, customerId))
    .orderBy(desc(schema.orders.createdAt))
    .limit(100);
  return ok({ items }, { requestId: data.requestId });
};
