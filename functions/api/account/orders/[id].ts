import { and, eq } from 'drizzle-orm';
import type { Fn } from '../../../lib/env';
import { getDb, schema } from '../../../lib/db';
import { ok } from '../../../lib/response';
import { badRequest, notFound } from '../../../lib/errors';
import { getPublicOrder } from '../../../lib/services/orders';

export const onRequestGet: Fn = async ({ params, env, data }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) throw badRequest('Invalid order id.');
  const db = getDb(env);
  // Ownership check: the order must belong to the signed-in customer.
  const rows = await db.select().from(schema.orders).where(and(eq(schema.orders.id, id), eq(schema.orders.customerId, data.customer!.id))).limit(1);
  if (!rows[0]) throw notFound('Order not found.');
  const view = await getPublicOrder(env, rows[0]);
  return ok(view, { requestId: data.requestId });
};
